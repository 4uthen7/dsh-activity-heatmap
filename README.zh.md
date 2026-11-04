# dsh-activity-heatmap

[English](README.md) | [日本語](README.ja.md) | 中文

一个为 DeepSeek Harness 打造的 GitHub 风格活动热力图。

它直接读取你本地的会话日志，把消息、工具调用、轮次、Token、活跃时长和会话数按天画成一格一天的热力图。支持方形、圆角、圆形、六边形、菱形、星形，以及你自己写的 SVG 路径。五套配色和分级颜色。按年、按月、按滚动的最近几周三种日历布局。所有设置都能在应用里改。

不发起任何对外网络请求。会话内容不会离开你的机器，Host 端只返回计数。

[![66 秒介绍视频：英文旁白、日文字幕](docs/intro.gif)](docs/dsh-activity-heatmap-intro.mp4)

[观看 66 秒介绍视频](docs/dsh-activity-heatmap-intro.mp4)（MP4，1080p，英文 AI 旁白，日文字幕）· [日文字幕](docs/dsh-activity-heatmap-intro.ja.srt) · 演示为虚构数据

日语内容、英语字幕版：[无旁白](docs/dsh-activity-heatmap-intro-ja-silent.mp4) · [日语 AI 旁白](docs/dsh-activity-heatmap-intro-ja.mp4)（Keita，Edge Neural TTS）。

英文旁白使用 Kokoro（am_michael），日文旁白使用 Microsoft Edge Neural TTS（Keita）。

## 安装

交给智能体（推荐）：让 DeepSeek Harness 调用 `plugin_manager`，参数
`action: "install_bundle"`、`target: "https://github.com/4uthen7/dsh-activity-heatmap"`。
具体步骤见 [AGENTS.md](AGENTS.md)。

在会话里直接粘贴：

```text
把 https://github.com/4uthen7/dsh-activity-heatmap 安装到 DeepSeek Harness，
安装后确认能打开 设置 → 活动。
```

也可以打开侧边栏的 **Plugins**，选择 **Add plugin**，粘贴仓库地址并确认。
安装后如果处于关闭状态，手动打开这个 bundle。

要求：带 Web UI 的 DeepSeek Harness（Desktop 或 `web` profile），以及
`sessionPersistence`、`sessionQuery`、`webServer` 服务。没有持久化服务时，插件会退化为只统计会话创建日。

## 显示位置

在 **设置 → 活动 → 外观** 里任意组合。

- **侧边栏小组件**：位于 Settings 上方的一行横向热力图，点击打开完整页面，可显示 7–52 周
- **侧边栏面板**：Workspaces 上方的 **Activity** 行，点击在主页区域打开完整页面
- **输入框条**：输入框下方的紧凑条，默认关闭
- **设置 → 活动**：带全部设置的完整页面

Workspaces 标题属于内置的会话浏览器，DSH 没有在它正上方提供可追加的全宽插槽；替换那个插槽会删掉会话列表。因此横向热力图放在可追加的侧边栏底部，面板行放在 Workspaces 上方。[侧边栏放大图](docs/demo-sidebar.png) · [完整页面](docs/demo-main.png)。

页面名称跟随界面语言：`Activity`、`アクティビティ` 或 `活动`。

## 统计内容

每个本地日期一格，按浏览器的 IANA 时区切分：

| 指标 | 来源 |
| --- | --- |
| 消息 | `user/message` 与 `assistant/message` 事件 |
| 工具调用 | `tool/call` 事件 |
| 轮次 | `turn/start` 事件 |
| Token | assistant 消息的 input + output |
| 活跃时长 | 当天出现过任意事件的分钟数（去重） |
| 会话 | 当天创建的会话（header 的 `createdAt`） |

每个会话日志按 revision 只读一次并缓存在 Host 内存中，未变化的会话不会重复读取。分叉或带 seed 的会话包含继承的历史，因此过去的日子可能被重复计算。这个数字是用量概览，不是账单。

## 选项

所有选项按浏览器保存（`localStorage`，键 `dsh-activity-heatmap/settings/v1`），修改后立即生效。

| 选项 | 值 | 默认 |
| --- | --- | --- |
| 指标 | 消息、活跃时长、工具调用、轮次、会话、Token | 消息 |
| 日历 | 一年（53 周）、按月（12 个小日历）、最近（13/26/52 周） | 一年 |
| 形状 | 方形、圆角、圆形、六边形、菱形、星形、自定义 SVG 路径 | 方形 |
| 格子大小 | 5–20 px | 8 px |
| 间距 | 1–8 px | 2 px |
| 配色 | GitHub、海洋、紫罗兰、日落、单色、自定义 | GitHub |
| 颜色 | 4 级浓度 + 空白日跟随主题 | GitHub 绿 |
| 每周始于 | 周日、周一 | 周一 |
| 浓度 | 线性、对数、分位 | 线性 |
| 标签 | 月份、星期、图例 | 开 |
| 侧边栏小组件 | 显示/隐藏，7–52 周 | 开，22 周 |
| 输入框条 | 显示/隐藏 | 关 |

自定义形状是写给 `0 0 100 100` viewBox 的 SVG 路径，例如 `M50 4 L96 92 L4 92 Z`。非法路径会被忽略，回退为方形。

## 隐私

- Host 端只注册一个精确的本地回环路由 `/plugin-api/activity-heatmap/stats`，返回日期、会话数、轮次、消息数、工具调用数、Token、事件数和活跃分钟数
- 不返回提示词、回复、文件路径、标题或工具参数
- 不发起任何对外网络请求
- 计数通过只读的 `sessionPersistence` / `sessionQuery` 服务从本地会话语料计算

## 兼容性与卸载

Bundle 只插入一个 Host 行（`activity-heatmap`）和一个 Client 模块，唯一的硬 Host 依赖是 `webServer`；没有它时插件保持 inactive。

卸载：**Plugins** → 该 bundle 的页面 → **Remove**。浏览器里的设置会保留，清除站点数据即可重置。

## 开发

不需要构建。Host 是 ESM，Client 是普通 JavaScript 模块。

```
index.js            Host：会话扫描、按天计数、stats 路由
client.js           Client：设置存储、热力图、侧边栏、面板、设置页
cordis.patch.yml    bundle 行
locale/{en,ja,zh}.json   Plugin Manager 标题与描述
icon.svg            图标
video/              动态图形源码、原创配乐、渲染脚本
docs/               虚构演示 HTML 与截图
```

安装本地 checkout：

```text
plugin_manager { action: "install_bundle", target: "/absolute/path/to/dsh-activity-heatmap" }
```

修改 `client.js` 后刷新页面；修改 `index.js` 后把行关闭再打开（或重启），让 Host 模块重新导入。

## 作者

<img src="docs/author.jpg" width="56" height="56" alt="高本">

**高本** · [@4uthen7](https://github.com/4uthen7) · [SphinxGG.com](https://sphinxgg.com)

由高本设计并开发。MIT 许可证。

## 许可证

MIT，见 [LICENSE](LICENSE)。
