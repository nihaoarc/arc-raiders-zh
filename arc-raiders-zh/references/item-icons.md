# ARC Raiders 物品图片对照

查单件物品图标时，优先用 `get_item` 或[公开目录查询脚本](../scripts/read-tracker-public.cjs)，图标在 `icon` 或 `imageFilename` 字段。需要对照不同来源或识别裁切图标时，可生成本地对照表。

## 查找方式

- 从技能目录运行 `node scripts/item-icons.cjs refresh` 生成或更新 `data/item-icons.json`。对照表包含物品 ID、译名、类型、品质、图标地址、来源和更新时间。 [查图标脚本](../scripts/item-icons.cjs)
- 运行 `node scripts/item-icons.cjs find "气动执行器"` 查图标。支持按名称、物品 ID、类型、图片 URL 或文件名找候选，返回总数和最多 25 条。
- 需要按图识别时，运行 `node scripts/item-icons.cjs refresh --images`，将参考图缓存到技能目录下的 `data/item-images`。可设置 `ARC_RAIDERS_ICON_DIR` 使用其他目录。运行 `node scripts/item-icons.cjs image "<原图路径>"` 按文件哈希反查，或用支持 Pillow 的 Python 运行 [看图候选脚本](../scripts/match-item-icon.py) 比较裁切后的图标。尽量裁掉文字和边框。
- 图标相同或相似时，可用客户端的名称、类型、稀有度、武器等级、版本及物品 ID 缩小范围。同名物品也有可能用不同图标。只有明确匹配时才确认；若只是候选，标明不确定性。游戏画面里的格子、数量和原图分开看。

## 来源和覆盖

- 完整收录 ARC Tracker 公开物品目录的记录。对于 MetaForge 的外观、变体、道具和其他条目，对比标准化 ID 及英文名。确认无歧义的对应项保留第二来源 ID 和图标 URL，其余保留独立记录。目录记录数包含不同来源的数据口径及变体。 [ARC Tracker 接口](https://arctracker.io/api/items) · [MetaForge 接口文档](https://metaforge.app/arc-raiders/api)
- 简中名优先使用物品接口的 `zh-CN`。外观按相同 ID 对照简中和英文名称，缺少译名时保留英文。遇到名称冲突时核对游戏客户端和版本。 [ARC Tracker 简中外观页](https://arctracker.io/zh-CN/cosmetics)
- 图标下载时校验文件签名和 SHA-256，并复用可读取的缓存。来源暂不可用时，可直接查对应物品页及其图标。照片相似度结果用于候选复核。
