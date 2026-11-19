# Voyager · Research Archive

> 文档版本 v1.0
>
> 初版及最后更新 2026-11-19 21:13:10（UTC+08:00，Asia/Shanghai）
>
> 版本记录 v1.0 — 发布增强版安装、更新与导出指南。

这是 [Voyager](https://github.com/voyager-crew/voyager) 的 Gemini Deep Research 归档增强版。当前发布版本为 **2.3.3.1 (Research Archive)**，基于上游稳定版 **2.3.3**。上游的通用功能和文档见[原项目说明](./README_UPSTREAM.md)。只需要导出、不想加载完整扩展的用户可以使用配套的 [Gemini to Markdown 脚本](https://github.com/youyouhdhd/gemini-to-markdown)。

## 安装 Chrome 扩展

1. 在 [GitHub Releases](https://github.com/youyouhdhd/voyager/releases/latest) 下载 `voyager-research-archive-2.3.3.1-chrome.zip` 并解压到固定目录。
2. 打开 `chrome://extensions`，开启右上角的**开发者模式**。
3. 点击**加载已解压的扩展程序**，选择包含 `manifest.json` 的文件夹。扩展详情应显示 `2.3.3.1 (Research Archive)`。
4. 刷新已打开的 Gemini 标签页。若菜单项未出现，在 Voyager 的插件列表启用 **Gemini · Deep Research 导出**后再刷新。

### 从现有安装更新

- **已加载测试版或旧增强版**：把新版解压到之前的加载目录并覆盖同名文件，回到扩展页点**重新加载**，然后刷新 Gemini。若准备换目录，先备份扩展设置。
- **Chrome 商店版**：两者使用相同扩展 ID。切换前请用 Voyager 的备份功能保存设置和数据，再卸载商店版、加载增强版，并按需恢复备份。
- 增强版通过本仓库的 Releases 手动更新。升级时按上面的流程重新加载。可在 Releases 中下载旧版，并在同一目录恢复旧版文件进行回退。

## 导出 Deep Research

1. 在 [Gemini](https://gemini.google.com/) 打开一份已完成的 Deep Research 报告，等待内嵌图表出现。
2. 打开**报告自己的菜单**（含分享、导出到 Google 文档），点击 **保存报告 / Save Report**。只保存研究过程可点击 **下载 Thinking 内容**。
3. 选择格式并导出。

| 格式             | 适合                                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markdown（推荐） | 离线归档。保留正文引用、来源清单、Gemini 已显示的 Thinking 内容。报告有可保存的网页预览时，ZIP 内包含 Markdown、交互版 `report.html` 和 `previews/`。 |
| JSON             | 程序处理。保留正文的 Markdown 和 HTML，以及捕获到的预览 HTML。                                                                                        |
| PDF／图片        | 打印和分享静态版本。浏览器可能为生成内容的快照请求截屏权限。                                                                                          |

完整解压 ZIP，保持 `previews/` 与主文件同级。Markdown 原位显示图表 PNG，图片及其下方的 **Interactive HTML** 链接指向本地网页。浏览器可直接打开 `report.html` 连续阅读和交互。Markdown Preview Enhanced 可能先在 VS Code 中打开 HTML 源文件，此时用浏览器打开对应文件即可。

报告文件名采用 `报告标题_YYYY-MM-DD_HH-mm-ss`，时间跟随导出设备的时区。只需要单个文本文件时，可在 Markdown 选项里勾选**仅文本**。

### 排查常见问题

- **只有链接**：重新打开报告，等待 Gemini 的预览加载完成再导出。静态转换失败时仍保留可保存的交互 HTML。
- **图片和链接失效**：先完整解压，确认 `previews/` 仍在 Markdown 文件旁边，再使用支持本地图片的阅读器。
- **重复出现导出入口**：若同时使用配套脚本，可停用其中一套工具后刷新页面。

## 从源码构建

安装 [Bun](https://bun.sh/)（建议使用 `package.json` 中的版本），然后运行：

```sh
git clone https://github.com/youyouhdhd/voyager.git
cd voyager
bun install --frozen-lockfile
bun run build:chrome
```

在 Chrome 里加载 `dist_chrome/`。报告导出测试可用 `bun run test src/features/export src/pages/content/deepResearch src/pages/content/export`。维护发布时从增强分支构建 Chrome ZIP，用 `research-v*` 标签在 GitHub Releases 发布，扩展四段版本递增，Voyager 内部插件引擎继续使用对应的上游版本。

## 反馈与许可

反馈时注明扩展版本、Chrome 版本、导出格式及能否复现。请使用去除私人内容的示例。[提交 Issue](https://github.com/youyouhdhd/voyager/issues)

基于 [Voyager 上游 v2.3.3](https://github.com/voyager-crew/voyager/tree/v2.3.3)，保留原作者和贡献者署名。按 [GPL-3.0](./LICENSE) 发布。
