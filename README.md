# DATXY

面向 Dataset、Model、GPU、CPU、Website、URL 的静态资源导航与技术笔记站。

## 已整合的功能

- 资源分类、文本/图像/视频/音频等类型筛选、置顶优先和名称排序。
- 站内资源搜索与文章全文搜索；无关键词时首页默认隐藏文章，点击「文章笔记」可查看。
- Google、百度、GitHub、Hugging Face、YouTube、Bilibili、Yandex、抖音搜索。
- 同一资源可包含 Hugging Face、国内镜像和官网多个入口。
- 分批加载、键盘 `/` 聚焦、方向键浏览卡片、返回顶部。
- Issues → Markdown / HTML 文章发布、搜索索引、历史备份、文章目录与代码复制。
- **1–10 行代码直接显示，11 行及以上默认折叠**，支持展开/收起。适用于文章、Markdown 编辑器和 AI 对话。
- AIGX 模型测试与 Markdown 编辑、表格浏览、GPU 测试、音频分析。
- 320px 至 1920px 的响应式布局，手机保留缩放，不再跳转到其他移动站。

## 本地预览

```bash
python -m http.server 8000
```

打开 `http://localhost:8000/`。无需构建或后端。请用 HTTP 服务预览，浏览器直接打开文件不支持 JSON 加载。

## 修改资源

- `curated.json`：DATXY 的主题入口。字段：`category`、`title`、`desc`、`url`，可加 `featured: true`。
- `list.json`：从原站保留、整合的资源。支持 `cat`、`isTop` 及 `links.hf` / `links.hfCn` / `links.http`。
- `data/posts.json`：发布脚本生成的文章索引。
- 首页脚本会合并相同 URL，并保留多个下载入口。桌面工具在手机上显示提示，不隐藏整个条目。

## 发布文章

在 **feeday/url** 的 Issues 新建文章：标题是文章标题、正文写 Markdown，添加 `documentation` 标签。只有仓库所有者发布的 Issue 会进入网站。

- 当前文章：`blog/编号.html`。
- Markdown：`blog/md/编号.md`。
- 兼容副本：`blog/posts/issue-编号.html` / `.md`。
- 历史版本：`blog/backups/issue-编号/内容哈希.html` / `.md`，不会打包到公开站点。
- 编辑标题、正文或标签时自动重建。关闭 Issue 保留文章；移除标签或删除 Issue 后从索引隐藏，历史文件保留。
- `cpuck.com` 已发布索引中的两篇文章作为快照迁入 `blog/imported/`，保留原 Issue 链接；不与本仓库 Issue 编号冲突，也不会被首次发布删除。原仓库后续编辑不会自动同步这些快照。

发布脚本使用 GitHub 提供的已清理 `body_html`；脚本使用精确 CSP 哈希，文章内容不作为脚本执行。

## GitHub Pages

保留 `CNAME` 中的 `datxy.com`。在仓库 Settings → Pages 将 Source 设为 **GitHub Actions**，并确认域名 DNS 已指向 GitHub Pages。

合并改动后，`Publish Issues` 工作流会生成文章、提交数据并部署。也可以在 Actions 中手动运行。工作流仅使用内置 `GITHUB_TOKEN`。分支或 Pages 环境保护可能需要仓库所有者处理。

## 检查

```bash
python -m unittest discover -s tests -v
node --check app.js
node --check assets/code-blocks.js
# 浏览器检查需要本地安装 Playwright 和 Chromium
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

可用 `CHROMIUM_EXECUTABLE` 指定现有 Chromium 路径。截图写入被忽略的 `test-results/`。

浏览器检查覆盖六种屏宽、代码 10/11 行边界、复制与复制失败回退、全文搜索、多个下载入口、分页、空结果、搜索引擎编码，以及工具页布局。外部 API、第三方链接、设备麦克风与实际 GPU 性能需在相应设备及账户中使用；不会在检查中发送 API 请求。

## 来源

文章发布、AIGX、表格、音频与 GPU 工具基于用户指定的 [feeday/cpuck.com](https://github.com/feeday/cpuck.com) 整合。GPU 着色器保留原项目基于 [cznull/vsbm](https://github.com/cznull/vsbm) 的实现；入口加入手动开始和停止控制。
