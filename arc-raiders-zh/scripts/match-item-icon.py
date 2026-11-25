"""Rank catalog artwork for a single tightly cropped ARC Raiders item icon."""

import argparse
import hashlib
import json
from pathlib import Path
from statistics import median
import sys

from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat


DEFAULT_INDEX = Path(__file__).resolve().parents[1] / "data" / "item-icons.json"
FEATURE_SIZE = 40
NEUTRAL = (72, 72, 72)
ALPHA_CUTOFF = [0] * 32 + [255] * 224
BACKGROUND_MASK = [min(255, max(0, round((value - 9) * 255 / 20))) for value in range(256)]


def guess_opaque_background(rgb):
    width, height = rgb.size
    pixel = rgb.load()
    x_step = max(1, width // 16)
    y_step = max(1, height // 16)
    border = [
        pixel[x, y]
        for x in range(0, width, x_step)
        for y in (0, height - 1)
    ] + [
        pixel[x, y]
        for y in range(0, height, y_step)
        for x in (0, width - 1)
    ]
    background = tuple(round(median(channel)) for channel in zip(*border))
    if max(background) - min(background) > 40:
        return None
    close_pixels = sum(
        max(abs(value - base) for value, base in zip(colour, background)) <= 16
        for colour in border
    )
    if close_pixels < len(border) * 0.75:
        return None
    return background


def icon_features(image):
    icon = ImageOps.exif_transpose(image).convert("RGBA")
    icon.thumbnail((320, 320), Image.Resampling.BILINEAR)
    mask = icon.getchannel("A")
    if mask.getextrema() == (255, 255):
        rgb = icon.convert("RGB")
        background = guess_opaque_background(rgb)
        if background is not None:
            red, green, blue = ImageChops.difference(
                rgb, Image.new("RGB", rgb.size, background)
            ).split()
            mask = ImageChops.lighter(ImageChops.lighter(red, green), blue).point(
                BACKGROUND_MASK
            )
            icon.putalpha(mask)

    bounds = mask.point(ALPHA_CUTOFF).getbbox()
    if bounds is None:
        raise ValueError("No visible icon found.")
    icon = ImageOps.contain(
        icon.crop(bounds), (FEATURE_SIZE - 2, FEATURE_SIZE - 2), Image.Resampling.LANCZOS
    )
    canvas = Image.new("RGBA", (FEATURE_SIZE, FEATURE_SIZE))
    canvas.paste(icon, ((FEATURE_SIZE - icon.width) // 2, (FEATURE_SIZE - icon.height) // 2))
    composite = Image.alpha_composite(
        Image.new("RGBA", canvas.size, (*NEUTRAL, 255)), canvas
    ).convert("RGB")
    edges = ImageOps.grayscale(composite).filter(ImageFilter.FIND_EDGES)
    return composite, canvas.getchannel("A"), edges


def mean_difference(left, right):
    means = ImageStat.Stat(ImageChops.difference(left, right)).mean
    return sum(means) / (255 * len(means))


def visual_distance(query, reference):
    colours, mask, edges = (
        mean_difference(left, right) for left, right in zip(query, reference)
    )
    return 0.7 * colours + 0.2 * mask + 0.1 * edges


def load_references(index_path):
    index = json.loads(index_path.read_text(encoding="utf-8-sig"))
    image_root = Path(index["imageRoot"]).absolute()
    if not image_root.is_dir():
        raise ValueError(f"Image library is unavailable: {image_root}")

    groups = {}
    for item in index["items"]:
        filename = item.get("iconFile")
        if not filename or Path(filename).name != filename:
            continue
        image_path = str(image_root / filename)
        digest = item.get("iconSha256") or None
        key = ("sha256", digest.lower()) if digest else ("path", image_path)
        group = groups.setdefault(key, {"iconSha256": digest, "items": []})
        record = {
            field: item.get(field)
            for field in ("source", "id", "nameZh", "nameEn", "type", "rarity")
        }
        group["items"].append({**record, "iconPath": image_path})
    return groups


def match_icon(image_stream, index_path=DEFAULT_INDEX, limit=5):
    groups = load_references(index_path)
    digest = hashlib.file_digest(image_stream, "sha256").hexdigest()
    exact = groups.get(("sha256", digest))
    if exact is not None:
        return {
            "method": "exact-file-hash",
            "referenceGroupsCompared": 0,
            "candidates": [{"distance": 0, **exact}],
        }

    image_stream.seek(0)
    with Image.open(image_stream) as image:
        query = icon_features(image)

    ranked = []
    for group in groups.values():
        paths = dict.fromkeys(record["iconPath"] for record in group["items"])
        for path in paths:
            try:
                with Image.open(path) as image:
                    reference = icon_features(image)
            except (OSError, ValueError, Image.DecompressionBombError):
                continue

            ranked.append((visual_distance(query, reference), group))
            break

    if not ranked:
        raise ValueError("No readable reference icons were found.")
    ranked.sort(key=lambda match: match[0])
    return {
        "method": "visual-candidates",
        "referenceGroupsCompared": len(ranked),
        "unreadableReferenceGroups": len(groups) - len(ranked),
        "candidates": [
            {"distance": round(distance, 6), **group}
            for distance, group in ranked[:limit]
        ],
    }


def main():
    parser = argparse.ArgumentParser(
        description=(
            "Compare one tightly cropped icon against the local ARC Raiders library. "
            "Lower distances are closer. Visual matches are candidates, not identifications."
        )
    )
    parser.add_argument("image", type=Path, help="path to the cropped icon")
    parser.add_argument("--index", type=Path, default=DEFAULT_INDEX, help="catalog JSON path")
    parser.add_argument("--limit", type=int, default=5, help="number of groups to show")
    args = parser.parse_args()
    if args.limit < 1:
        parser.error("--limit must be at least 1")

    sys.stdout.reconfigure(encoding="utf-8")
    try:
        with args.image.open("rb") as image_stream:
            result = match_icon(image_stream, args.index, args.limit)
    except (OSError, ValueError, KeyError, Image.DecompressionBombError) as error:
        parser.exit(1, f"{parser.prog}: {error}\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
