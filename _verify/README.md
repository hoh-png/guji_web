# _verify

开发期用来核对页面与数据的辅助脚本。**不参与应用构建**，删掉也不影响运行。

运行环境：Node 18+，需要本机装有 Edge 或 Chrome。

## scripts/

| 脚本 | 用途 | 用法 |
| --- | --- | --- |
| `serve-dist.cjs` | 把构建产物当静态站点跑起来（含 SPA 回退），用于验证 `dist` | 见下方「验证构建产物」 |
| `serve-compare.cjs` | 对照服务器：原版快照在 `/original/`，重构版在根路径 | `node _verify/scripts/serve-compare.cjs 4180` |
| `check-props.cjs` | 校验道具数据自洽：id、品质、图片路径是否对得上 | `node _verify/scripts/check-props.cjs` |
| `measure-shop-assets.cjs` | 量商店组件在画布上的内容边界，改商店布局时用来定位 | 先起静态服务器，再 `node _verify/scripts/measure-shop-assets.cjs <CDP端口>` |
| `check-preload.cjs` | 校验图片预热是否生效（按再次请求的耗时判断） | 同上 |
| `compare-pixels.cjs` | 逐像素比对两张截图，自带 PNG 解码，无需额外依赖 | 直接 `node` 运行，改脚本内的文件名 |

## 验证构建产物

```bash
npm run build
# 把 dist 内容放到 _verify 根下（应用用的是根路径绝对地址）
xcopy /E /Y dist _verify          # Windows
# cp -r dist/. _verify/           # macOS / Linux

node _verify/scripts/serve-dist.cjs 4182
# 打开 http://127.0.0.1:4182/index.html
```

## 说明

- `serve-dist.cjs` 给图片加了长缓存头（`max-age=31536000`），
  因为应用有图片预加载机制，缓存被禁掉的话预加载等于白做。
- 运行这些脚本会在 `_verify/` 下产生临时目录（浏览器 profile、截图、量测 JSON），
  已写入 `.gitignore`，不会进版本库。
