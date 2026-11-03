# GitHub Issue Kanban for DSH

一个面向 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai) 的看板插件：在 DSH Web 界面的左侧栏加入
「Issue 看板」入口，用看板的方式查看、筛选和领取 GitHub issue，点击 issue 还能看到带动画流向的关系方块图。

> 适用于 DSH 桌面版 / `dsh web`。Host 端读取本机已登录的 `gh` CLI，无第三方服务、无遥测。

## 功能

- **左侧栏入口 → 中央看板**：看板占据主面板，可随时切回对话。
- **收件箱只显示未关闭的 issue；默认「只看自己的」**：当前 `gh` 登录账号创建或被指派的 issue；
  顶部「我的 / 全部」一键切换。
- **收件箱标签筛选**：收件箱顶部「筛选」按钮；每个条件行之间是**且**，同一行内多选的标签之间是**或**；
  最多 6 行，可按标签搜索，筛选按仓库记住（浏览器本地）。
- **DSH 待办分组**：默认 **待办 / 进行中 / 待完结 / 积压** 四列，可新建、重命名、删除。
- **拖拽工作流**：把 issue 拖进分组即创建待办任务；任务卡可在分组间拖动；拖回收件箱即移出。
- **右侧详情面板**：点击 issue 自动从右侧展开，**占半屏宽度**，展示 issue 信息、GitHub 链接、正文摘要，以及关系图；
  适配亮/暗色主题（跟随 DSH 主题切换，独立的不透明容器、阴影与 `color-scheme`，夜间可读性更好）。
- **关系方块流程图**：父/子 issue 上下排列，阻塞/依赖左右排列，边是带箭头的流动虚线动画，
  **动画方向表示上游 → 下游**；带图例和文字关系清单。点「放大」可把关系图抬到上层放大显示，
  「缩小还原」/Esc/点背景回到面板内的原始尺寸。
- **项目跟随**：看板默认项目 = 最后一次离开的聊天会话所属项目的 GitHub remote；
  聊天项目没有 GitHub 关联时保持当前项目不动。
- **数据缓存 + 5 分钟自动刷新 + 手动刷新**，刷新是数据热更新，不重载页面。
- **侧栏数量徽章**：入口图标右上角显示当前范围的未关闭 issue 数（收起侧栏也可见）。
- **对话集成**：注册 `github_kanban_board` / `github_kanban_claim` / `github_kanban_move` 三个智能体工具，
  可以直接在对话里说「领取待办组里的任务」。

## 环境要求

- DSH（桌面版或 `dsh web`，需 Web GUI）
- 本机已安装并登录 GitHub CLI：`gh auth login`，token 至少具备 `repo` 读权限
- 本机 `git`（用于把聊天会话的项目目录解析成 GitHub 仓库）

## 安装

### 1. 克隆仓库

```bash
git clone https://github.com/xiaohui-zhangxh/dsh-github-kanban.git
# 建议放在固定目录，例如 ~/Codes/dsh-github-kanban
```

### 2. 安装到当前 DSH profile

在 DSH 对话里让智能体执行（`target` 换成你的克隆路径）：

```text
plugin_manager({ action: 'install_bundle', target: '/absolute/path/to/dsh-github-kanban' })
```

安装是本地 bundle 软链，插件目录里的改动即改即生效，不用重新打包。
安装完成后刷新 DSH 页面，左侧栏出现「Issue 看板」图标。

> 手动安装（等价）：在 `~/.dsh/profiles/<profile>/cordis.patch.yml` 里追加
>
> ```yaml
> - insert:
>     - id: github-kanban
>       name: '@local/dsh-github-kanban'
>       config:
>         issuesLimit: 300
> ```
>
> 并把该 bundle 加入 profile 的 `dsh.profile.bundles` / `dependencies`（指向本地目录）。

## 配置

插件行配置（`cordis.patch.yml`）：

```yaml
- insert:
    - id: github-kanban
      name: '@local/dsh-github-kanban'
      config:
        issuesLimit: 300   # 可选，单次最多拉取多少个未关闭 issue（50..1000，默认 300）
        repo: owner/name   # 可选，初始仓库；不填则由聊天项目自动识别或面板里手选
```

也可以在面板顶部点击仓库名直接修改（持久化到状态文件）。看板范围（我的 / 全部）选择同样会持久化。

## 使用

1. 点左侧栏「Issue 看板」图标。
2. 顶部选择仓库（从带 GitHub remote 的聊天项目进入时会自动带出）。
3. 从「GitHub 收件箱」把 issue 拖到某个待办分组。
4. 点卡片查看详情和关系图；在对话里说「领取待办组里的任务」让智能体接单。

## 智能体工具

| 工具 | 作用 |
| --- | --- |
| `github_kanban_board` | 读取当前看板：仓库、范围、分组与组内任务、收件箱统计 |
| `github_kanban_claim` | 从分组领取任务：标记领取人、移到「进行中」，返回 issue 标题/链接/标签/正文摘要 |
| `github_kanban_move` | 把 issue 加入或移动到指定分组 |

## 数据与文件

- `$DSH_PROFILE_DIR/github-kanban.state.json`：分组、任务（带来源 `repo`）、看板范围 `scope`、
  最近活跃会话 `activeSessionId`；`version: 2`（旧三列默认分组会自动迁移）
- `$DSH_PROFILE_DIR/github-kanban.cache.json`：issue 缓存（`version: 3`，仅 OPEN，记录 `mine` 标记和
  GitHub 登录名，TTL 5 分钟）
- 所有数据只在本机；插件不收集、不上传任何信息。

## HTTP API（调试用）

插件在同一 Web 源上注册 `/github-kanban/api`：

- `GET` 看板快照；可带 `?session=<会话 id>` 让 Host 跟随该会话的项目
- `GET ?issue=N` 单个 issue 的关系图
- `GET ?stats=1` 轻量计数（侧栏徽章用，不阻塞 gh）
- `POST` 动作：`assign` / `move` / `remove` / `addGroup` / `renameGroup` / `deleteGroup` /
  `claim` / `complete` / `activeSession` / `filter` / `refresh` / `settings`

冒烟脚本：

```bash
test/verify-api.sh http://127.0.0.1:<DSH_WEB_PORT> [issue-number]
```

## 实现结构

| 文件 | 作用 |
| --- | --- |
| `index.js` | Host 半：`gh` issue 拉取与缓存、待办状态、HTTP 路由、3 个智能体工具、会话→仓库解析 |
| `client.js` | Client 半：左侧栏图标 + 数量徽章、看板、拖拽、右侧详情与动画关系图 |
| `cordis.patch.yml` | bundle 插入行 |
| `locale/*.json` | 插件管理器展示的标题/描述（中英） |
| `icon.svg` | 插件图标 |
| `test/verify-api.sh` | 对运行中的 DSH 做接口冒烟验证 |

Host 与 Client 都是手写 ESM/浏览器 JS，无构建步骤、无 npm 依赖。

## 已知限制

- 关系图只做一跳：父/子 issue、正文里的 `#N` 引用与阻塞/依赖关键词；不索引评论级引用。
- 「自己的 issue」= 当前 `gh` 登录账号创建或被指派；取不到登录名时退回显示全部，避免空看板。
- `gh` 未登录或触发速率限制时，看板保留已有分组与任务并显示错误横幅。
- DSH 侧栏行标题由宿主渲染为纯文本，插件只能贡献图标，所以数量徽章画在入口图标右上角。

## License

MIT
