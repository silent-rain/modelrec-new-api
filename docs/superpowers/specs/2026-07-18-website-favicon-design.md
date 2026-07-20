# 网站 Favicon 替换设计

## 目标

基于当前 `web/default/public/logo.png` 对应的模荐科技品牌图形，为默认前端生成适合浏览器标签页显示的网站 icon，并保留现有 icon 作为备份。

## 已确认方案

- 新 icon 仅保留绿色 `M` 图形与橙色火焰，不包含中英文文字。
- 背景保持透明，避免在浅色或深色浏览器主题下出现白色方块。
- 新 `favicon.ico` 同时包含 16×16、32×32、48×48 三档图像。
- 现有 `web/default/public/favicon.ico` 原样重命名为 `favicon_bak.ico`。
- 新文件继续使用 `web/default/public/favicon.ico` 路径，避免改变默认静态资源约定。
- `web/default/index.html` 的图标引用从 `/logo.png` 改为 `/favicon.ico`，并使用 ICO MIME 类型。
- `web/default/public/logo.png` 与 `logo_bak.png` 均保持不变。

## 生成方式

从用户提供的高清 Logo 源图中提取绿色 `M` 与橙色火焰的联合图形，移除白色背景和文字区域，居中放入透明正方形画布。使用高质量缩放分别生成 48×48、32×32、16×16 图层，再封装为一个多尺寸 ICO 文件。该过程采用确定性的本地图像处理，不使用生成式模型，避免品牌图形发生漂移。

## 验证

- 校验 `favicon_bak.ico` 与改名前的原文件哈希一致。
- 校验新 `favicon.ico` 包含 16×16、32×32、48×48 三档 RGBA 图像及透明像素。
- 校验 `index.html` 只引用新的 `/favicon.ico`。
- 执行默认前端生产构建。
- 启动前端并通过浏览器确认页面可加载新 favicon，且标签页图标在小尺寸下可辨识。

## 范围边界

本次不修改页面内 Logo、品牌名称、标题、主题色或其他前后端功能。
