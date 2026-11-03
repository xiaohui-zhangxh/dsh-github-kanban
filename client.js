window.__ModuleLoader__.load({
  id: '@local/dsh-github-kanban',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useState, useEffect, useRef, useMemo, useCallback } = React

    const NS = 'githubKanban'
    const PANEL_ID = 'github-issues'
    const API = '/github-kanban/api'
    const EMPTY = []

    // ------------------------------------------------------------------
    // Locale dictionaries (zh is authoritative, en mirrors every key)
    // ------------------------------------------------------------------

    const ZH = {
      'panel.label': 'Issue 看板',
      'panel.title': 'GitHub Issue 看板',
      'panel.repo': '仓库',
      'panel.refresh': '刷新',
      'panel.refreshing': '刷新中…',
      'panel.updated': '更新于',
      'panel.countTitle': '{n} 个未关闭 issue',
      'scope.mine': '我的',
      'scope.all': '全部',
      'scope.title': '切换范围：我的 issue（创建或指派给我）/ 全部未关闭 issue',
      'panel.error': '看板加载失败',
      'panel.retry': '重试',
      'panel.loading': '正在加载看板…',
      'panel.empty': '暂无内容',
      'inbox.title': 'GitHub 收件箱',
      'inbox.hint': '把 issue 拖进分组，即可加入 DSH 待办',
      'filter.open': '标签筛选',
      'filter.title': '标签筛选',
      'filter.hint': '行内多选标签 = 或条件；行与行 = 且条件',
      'filter.addRow': '添加条件行',
      'filter.addLabel': '选择标签',
      'filter.removeRow': '删除条件行',
      'filter.removeLabel': '移除标签 {name}',
      'filter.search': '搜索标签',
      'filter.clear': '清空筛选',
      'filter.close': '关闭筛选',
      'filter.empty': '还没有筛选条件，点击「添加条件行」',
      'filter.noLabels': '当前没有可筛选的标签',
      'filter.noMatch': '没有符合筛选条件的 issue',
      'filter.active': '已启用 {n} 行标签条件',
      'filter.rows': '{n} 行',
      'group.add': '添加',
      'group.new': '新建分组',
      'group.namePlaceholder': '分组名称',
      'group.rename': '重命名分组',
      'group.delete': '删除分组',
      'group.deleteConfirm': '删除分组？',
      'group.empty': '暂无卡片',
      'card.claimed': '已领取',
      'card.grouped': '已在分组中',
      'detail.title': 'Issue 详情',
      'detail.close': '关闭详情',
      'detail.open': '在 GitHub 打开',
      'detail.body': '正文摘要',
      'detail.bodyEmpty': '没有正文内容',
      'detail.group': '待办分组',
      'detail.addToGroup': '加入分组',
      'detail.remove': '移出待办',
      'detail.relations': '关联关系',
      'detail.relationsEmpty': '未发现关联 issue',
      'detail.zoom': '放大',
      'detail.shrink': '缩小还原',
      'detail.zoomHint': '上层放大显示；点击节点可切换 issue',
      'detail.truncated': '关联过多，仅显示部分邻居。',
      'detail.graphError': '关联关系加载失败',
      'detail.added': '已加入分组',
      'detail.removed': '已移出待办',
      'detail.comments': '{n} 条评论',
      'detail.updatedAt': '更新于 {date}',
      'relation.parent': '父子',
      'relation.finished': '已完成',
      'relation.unfinished': '未完成',
      'relation.group': '看板分组',
      'relation.stateLegend': '状态：✓ 已完成（已关闭）· ○ 未完成；色条 / 圆点 = 看板分组颜色',
      'relation.blocks': '阻塞 / 依赖',
      'relation.relates': '关联',
      'relation.list': '关系列表',
      'relation.legend': '图例',
      'action.failed': '操作失败',
      'action.busy': '处理中…',
      'action.dismiss': '关闭',
      'settings.repo': '仓库（owner/name）',
      'settings.save': '保存',
      'settings.cancel': '取消',
      'settings.invalid': '仓库格式应为 owner/name',
      'state.open': '打开',
      'state.closed': '已关闭',
      'time.justNow': '刚刚',
      'time.minutes': '{n} 分钟前',
      'time.hours': '{n} 小时前',
      'time.days': '{n} 天前',
      'error.boundary': '看板渲染出错，请刷新页面后重试。',
    }

    const EN = {
      'panel.label': 'Issue board',
      'panel.title': 'GitHub Issue Board',
      'panel.repo': 'Repository',
      'panel.refresh': 'Refresh',
      'panel.refreshing': 'Refreshing…',
      'panel.updated': 'Updated',
      'panel.countTitle': '{n} open issues',
      'scope.mine': 'Mine',
      'scope.all': 'All',
      'scope.title': 'Toggle scope: my issues (created by or assigned to me) / all open issues',
      'panel.error': 'Failed to load the board',
      'panel.retry': 'Retry',
      'panel.loading': 'Loading board…',
      'panel.empty': 'Nothing to show',
      'inbox.title': 'GitHub inbox',
      'inbox.hint': 'Drag an issue into a group to turn it into a DSH todo',
      'filter.open': 'Label filters',
      'filter.title': 'Label filters',
      'filter.hint': 'Labels inside a row are ORed; rows are ANDed',
      'filter.addRow': 'Add condition row',
      'filter.addLabel': 'Pick labels',
      'filter.removeRow': 'Remove condition row',
      'filter.removeLabel': 'Remove label {name}',
      'filter.search': 'Search labels',
      'filter.clear': 'Clear filters',
      'filter.close': 'Close filters',
      'filter.empty': 'No conditions yet — click “Add condition row”',
      'filter.noLabels': 'No labels available',
      'filter.noMatch': 'No issue matches the label filters',
      'filter.active': '{n} label condition row(s) active',
      'filter.rows': '{n} row(s)',
      'group.add': 'Add',
      'group.new': 'New group',
      'group.namePlaceholder': 'Group name',
      'group.rename': 'Rename group',
      'group.delete': 'Delete group',
      'group.deleteConfirm': 'Delete this group?',
      'group.empty': 'No cards',
      'card.claimed': 'Claimed',
      'card.grouped': 'In a group',
      'detail.title': 'Issue detail',
      'detail.close': 'Close detail',
      'detail.open': 'Open on GitHub',
      'detail.body': 'Body excerpt',
      'detail.bodyEmpty': 'No body content',
      'detail.group': 'Todo group',
      'detail.addToGroup': 'Add to group',
      'detail.remove': 'Remove from todos',
      'detail.relations': 'Relationships',
      'detail.relationsEmpty': 'No related issues found',
      'detail.zoom': 'Enlarge',
      'detail.shrink': 'Restore',
      'detail.zoomHint': 'Shown enlarged above the board; click a node to switch issues',
      'detail.truncated': 'Too many relations; only some neighbours are shown.',
      'detail.graphError': 'Failed to load relationships',
      'detail.added': 'Added to the group',
      'detail.removed': 'Removed from todos',
      'detail.comments': '{n} comments',
      'detail.updatedAt': 'Updated {date}',
      'relation.parent': 'Parent / child',
      'relation.finished': 'Done',
      'relation.unfinished': 'Open',
      'relation.group': 'Kanban group',
      'relation.stateLegend': 'State: ✓ done (closed) · ○ open; bars / dots = kanban group colour',
      'relation.blocks': 'Blocks / depends on',
      'relation.relates': 'Related',
      'relation.list': 'Relation list',
      'relation.legend': 'Legend',
      'action.failed': 'Action failed',
      'action.busy': 'Working…',
      'action.dismiss': 'Dismiss',
      'settings.repo': 'Repository (owner/name)',
      'settings.save': 'Save',
      'settings.cancel': 'Cancel',
      'settings.invalid': 'Repository must look like owner/name',
      'state.open': 'Open',
      'state.closed': 'Closed',
      'time.justNow': 'just now',
      'time.minutes': '{n} min ago',
      'time.hours': '{n} h ago',
      'time.days': '{n} d ago',
      'error.boundary': 'The board failed to render. Refresh the page and try again.',
    }

    // ------------------------------------------------------------------
    // Component-local CSS (one <style> rendered by the page component)
    // ------------------------------------------------------------------


    const MARKDOWN_CSS = `
      .gkb-md { display: flex; flex-direction: column; gap: 8px; }
      .gkb-md > * { margin: 0; max-width: 100%; }
      .gkb-md p { margin: 0; }
      .gkb-md h1, .gkb-md h2, .gkb-md h3, .gkb-md h4, .gkb-md h5, .gkb-md h6 {
        margin: 0; font-weight: 600; color: var(--dsw-alias-label-primary); }
      .gkb-md h1 { font-size: 16px; line-height: 22px; }
      .gkb-md h2 { font-size: 15px; line-height: 21px; }
      .gkb-md h3 { font-size: 14px; line-height: 20px; }
      .gkb-md h4, .gkb-md h5, .gkb-md h6 { font-size: 13px; line-height: 19px; }
      .gkb-md ul, .gkb-md ol { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 3px; }
      .gkb-md li { margin: 0; }
      .gkb-md blockquote { margin: 0; padding: 4px 8px; border-left: 2px solid var(--dsw-alias-border-l2);
        color: var(--dsw-alias-label-secondary); }
      .gkb-md code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px;
        padding: 1px 4px; border-radius: 4px; background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-primary); }
      .gkb-md pre { margin: 0; padding: 8px; border-radius: 8px; background: var(--dsw-alias-bg-base);
        border: 1px solid var(--dsw-alias-border-l1); overflow-x: auto; }
      .gkb-md pre code { background: transparent; padding: 0; font-size: 11px; line-height: 16px; white-space: pre; }
      .gkb-md a { color: var(--dsw-alias-brand-primary); text-decoration: none; }
      .gkb-md a:hover { text-decoration: underline; }
      .gkb-md hr { border: none; border-top: 1px solid var(--dsw-alias-border-l1); margin: 4px 0; }
      .gkb-md table { border-collapse: collapse; width: 100%; font-size: 11px; }
      .gkb-md th, .gkb-md td { border: 1px solid var(--dsw-alias-border-l1); padding: 4px 6px;
        text-align: left; vertical-align: top; }
      .gkb-md th { background: var(--dsw-alias-bg-layer-2); font-weight: 600; }
      .gkb-md strong { color: var(--dsw-alias-label-primary); }
      .gkb-md img { max-width: 100%; }
      .gkb-md-task { display: inline-flex; align-items: center; gap: 4px; }
      .gkb-md-task-box { display: inline-block; width: 10px; height: 10px; border-radius: 2px;
        border: 1px solid var(--dsw-alias-border-l2); }
      .gkb-md-task-box[data-checked="true"] { background: var(--dsw-alias-brand-primary);
        border-color: var(--dsw-alias-brand-primary); }
    `

    const CSS = `
      .gkb-root { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 360px;
        box-sizing: border-box; overflow: hidden; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary);
        font-family: inherit; font-size: 12px; line-height: 18px; color-scheme: light; }
      .gkb-root[data-scheme="dark"] { color-scheme: dark; }
      .gkb-root *, .gkb-root *::before, .gkb-root *::after { box-sizing: border-box; }
      .gkb-header { flex: none; display: flex; align-items: center; gap: 10px; padding: 9px 14px;
        border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .gkb-title { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600; color: var(--dsw-alias-label-primary);
        white-space: nowrap; }
      .gkb-spacer { flex: 1 1 auto; }
      .gkb-muted { color: var(--dsw-alias-label-secondary); font-size: 11px; white-space: nowrap; }
      .gkb-chip { display: inline-flex; align-items: center; gap: 6px; height: 24px; padding: 0 9px; border-radius: 999px;
        border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 11px; cursor: pointer; max-width: 260px; }
      .gkb-chip:hover { border-color: var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-primary); }
      .gkb-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .gkb-chip-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-state-success-primary);
        flex: none; }
      .gkb-chip-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gkb-btn { display: inline-flex; align-items: center; gap: 5px; height: 24px; padding: 0 9px; border-radius: 6px;
        border: 1px solid var(--dsw-alias-border-l2); background: transparent; color: var(--dsw-alias-label-primary);
        font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap; }
      .gkb-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
      .gkb-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .gkb-btn:disabled { opacity: .55; cursor: default; }
      .gkb-btn-primary { border-color: var(--dsw-alias-brand-primary); color: var(--dsw-alias-brand-primary);
        font-weight: 500; }
      .gkb-icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px;
        padding: 0; border: 0; border-radius: 5px; background: transparent; color: var(--dsw-alias-label-secondary);
        cursor: pointer; flex: none; }
      .gkb-icon-btn:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .gkb-icon-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; }
      .gkb-icon-btn:disabled { opacity: .5; cursor: default; }
      .gkb-glyph { display: block; }
      .gkb-input { height: 24px; padding: 0 8px; border-radius: 6px; border: 1px solid var(--dsw-alias-border-l2);
        background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px;
        min-width: 0; }
      .gkb-input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px;
        border-color: var(--dsw-alias-brand-primary); }
      .gkb-repo-form { display: inline-flex; align-items: center; gap: 6px; }
      .gkb-repo-input { width: 190px; }
      .gkb-banner { flex: none; display: flex; align-items: center; gap: 8px; margin: 8px 14px 0; padding: 7px 10px;
        border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
        font-size: 12px; }
      .gkb-banner-error { border-color: var(--dsw-alias-state-error-primary); }
      .gkb-banner-warn { border-color: var(--dsw-alias-state-warn-primary); }
      .gkb-banner-title { font-weight: 600; color: var(--dsw-alias-state-error-primary); white-space: nowrap; }
      .gkb-banner-warn .gkb-banner-title { color: var(--dsw-alias-state-warn-primary); }
      .gkb-banner-text { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary); overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .gkb-board { position: relative; flex: 1 1 auto; min-height: 0; }
      .gkb-strip { height: 100%; display: flex; align-items: stretch; gap: 10px; padding: 12px 14px 14px;
        overflow-x: auto; overflow-y: hidden; background: var(--dsw-specific-sidebar-fill); }
      .gkb-loading { display: flex; align-items: center; justify-content: center; height: 100%; font-size: 12px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-col { flex: 0 0 280px; width: 280px; min-height: 0; display: flex; flex-direction: column;
        position: relative;
        border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-1);
        transition: border-color 120ms ease-in-out; }
      .gkb-col[data-over="true"] { border-color: var(--dsw-alias-brand-primary); background: var(--dsw-alias-bg-layer-2); }
      .gkb-col-head { flex: none; display: flex; align-items: center; gap: 6px; padding: 8px 10px; min-height: 36px;
        border-bottom: 1px solid var(--dsw-alias-border-l1); }
      .gkb-col-dot { width: 7px; height: 7px; border-radius: 2px; background: var(--dsw-alias-label-secondary);
        flex: none; }
      .gkb-col-inbox .gkb-col-dot { background: var(--dsw-alias-brand-primary); }
      .gkb-col-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .gkb-col-count { flex: none; min-width: 18px; height: 16px; padding: 0 5px; border-radius: 8px;
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-secondary); font-size: 10px;
        line-height: 16px; text-align: center; font-variant-numeric: tabular-nums; }
      .gkb-col-actions { margin-left: auto; display: inline-flex; align-items: center; gap: 2px; flex: none; }
      .gkb-col-hint { flex: none; padding: 6px 10px 0; font-size: 11px; line-height: 15px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-labelfilter { position: absolute; top: 42px; left: 6px; z-index: 40;
        width: min(480px, calc(100vw - 120px)); max-height: min(72vh, 560px); overflow-y: auto;
        display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 10px;
        border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 14px 36px rgba(0, 0, 0, .24); }
      .gkb-root[data-scheme="dark"] .gkb-labelfilter { box-shadow: 0 18px 48px rgba(0, 0, 0, .62); }
      .gkb-filter-head { display: flex; align-items: center; gap: 8px; }
      .gkb-filter-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
      .gkb-filter-hint { font-size: 10.5px; line-height: 14px; color: var(--dsw-alias-label-secondary); }
      .gkb-filter-grow { flex: 1 1 auto; }
      .gkb-filter-row { display: flex; flex-direction: column; gap: 6px; padding: 6px;
        border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); }
      .gkb-filter-row-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
      .gkb-filter-row-index { flex: none; min-width: 16px; font-size: 10px; font-variant-numeric: tabular-nums;
        color: var(--dsw-alias-label-secondary); }
      .gkb-filter-row-labels { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; flex: 1 1 auto; min-width: 0; }
      .gkb-filter-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 18px;
        padding: 0 5px; border-radius: 999px; border: 1px solid var(--dsw-alias-border-l2);
        background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
        font: inherit; font-size: 10px; line-height: 16px; cursor: pointer; }
      .gkb-filter-chip:hover { border-color: var(--dsw-alias-state-error-primary); }
      .gkb-filter-chip:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .gkb-filter-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gkb-filter-chip-x { color: var(--dsw-alias-label-secondary); }
      .gkb-filter-picker { display: flex; flex-direction: column; gap: 2px; max-height: 180px; overflow-y: auto;
        padding: 4px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-2); }
      .gkb-filter-search { width: 100%; margin-bottom: 4px; }
      .gkb-label-option { display: flex; align-items: center; gap: 6px; width: 100%; min-width: 0; padding: 3px 6px;
        border: none; border-radius: 5px; background: transparent; color: var(--dsw-alias-label-primary);
        font: inherit; font-size: 11px; text-align: left; cursor: pointer; }
      .gkb-label-option:hover { background: var(--dsw-alias-bg-layer-1); }
      .gkb-label-option:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -2px; }
      .gkb-label-option[data-on="true"] { background: var(--dsw-alias-bg-base); font-weight: 600; }
      .gkb-label-option-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gkb-label-option-count { margin-left: auto; flex: none; font-size: 10px; font-variant-numeric: tabular-nums;
        color: var(--dsw-alias-label-secondary); }
      .gkb-filter-empty { padding: 8px 6px; text-align: center; font-size: 11px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-filter-actions { display: flex; align-items: center; gap: 6px; }
      .gkb-filter-count { flex: none; font-size: 10px; font-variant-numeric: tabular-nums;
        color: var(--dsw-alias-label-secondary); }
      .gkb-col-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 8px; display: flex;
        flex-direction: column; gap: 8px; }
      .gkb-col-empty { margin: auto 0; padding: 16px 8px; text-align: center; font-size: 11px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-rename { display: flex; align-items: center; gap: 4px; flex: 1 1 auto; min-width: 0; }
      .gkb-rename-input { flex: 1 1 auto; width: 100%; min-width: 0; height: 22px; }
      .gkb-card { display: flex; flex-direction: column; gap: 6px; padding: 8px 9px; border-radius: 8px;
        border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary); cursor: pointer; }
      .gkb-card:hover { border-color: var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-2); }
      .gkb-card:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .gkb-card[data-active="true"] { border-color: var(--dsw-alias-brand-primary); }
      .gkb-card[data-dragging="true"] { opacity: .45; }
      .gkb-card-top { display: flex; align-items: center; gap: 6px; }
      .gkb-card-num { font-size: 11px; font-weight: 600; color: var(--dsw-alias-label-secondary);
        font-variant-numeric: tabular-nums; flex: none; }
      .gkb-card-grow { flex: 1 1 auto; }
      .gkb-card-title { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        font-size: 12px; line-height: 16px; word-break: break-word; }
      .gkb-card-labels { display: flex; flex-wrap: wrap; gap: 4px; overflow: hidden; }
      .gkb-label { display: inline-flex; align-items: center; gap: 4px; max-width: 100%; height: 17px; padding: 0 6px;
        border-radius: 999px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary); font-size: 10px; line-height: 15px; overflow: hidden; }
      .gkb-label-dot { width: 5px; height: 5px; border-radius: 50%; flex: none;
        background: var(--dsw-alias-label-secondary); }
      .gkb-label-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gkb-card-foot { display: flex; align-items: center; gap: 6px; min-height: 14px; }
      .gkb-card-meta { font-size: 10px; color: var(--dsw-alias-label-secondary); overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; }
      .gkb-card-group { margin-left: auto; flex: none; max-width: 130px; overflow: hidden; text-overflow: ellipsis;
        white-space: nowrap; font-size: 10px; color: var(--dsw-alias-brand-primary); }
      .gkb-badge-claimed { flex: none; height: 16px; padding: 0 5px; border-radius: 4px; font-size: 10px;
        line-height: 14px; color: var(--dsw-alias-state-success-primary);
        border: 1px solid var(--dsw-alias-state-success-primary); }
      .gkb-state-dot { width: 6px; height: 6px; border-radius: 50%; flex: none;
        background: var(--dsw-alias-state-success-primary); }
      .gkb-state-dot[data-state="CLOSED"] { background: var(--dsw-alias-state-idle-primary); }
      .gkb-add-col { flex: 0 0 220px; width: 220px; display: flex; flex-direction: column; }
      .gkb-add-btn { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; height: 40px;
        border: 1px dashed var(--dsw-alias-border-l2); border-radius: 10px; background: transparent;
        color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer; }
      .gkb-add-btn:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary);
        background: var(--dsw-alias-bg-layer-1); }
      .gkb-add-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .gkb-add-form { display: flex; flex-direction: column; gap: 6px; padding: 8px; border-radius: 10px;
        border: 1px dashed var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1); }
      .gkb-add-input { width: 100%; }
      .gkb-add-actions { display: flex; gap: 6px; }
      .gkb-detail { position: absolute; top: 0; right: 0; bottom: 0; z-index: 20;
        width: 50%; min-width: 380px; max-width: 100%;
        display: flex; flex-direction: column; min-height: 0; border-left: 1px solid var(--dsw-alias-border-l2);
        background: var(--dsw-alias-bg-layer-1); transform: translateX(100%); visibility: hidden;
        box-shadow: -12px 0 32px rgba(0, 0, 0, .18);
        transition: transform 200ms cubic-bezier(.22, .61, .36, 1), visibility 0s linear 200ms; }
      .gkb-detail[data-open="true"] { transform: translateX(0); visibility: visible;
        transition: transform 200ms cubic-bezier(.22, .61, .36, 1), visibility 0s linear 0s; }
      .gkb-detail[data-zoomed="true"] { transform: none; }
      .gkb-root[data-scheme="dark"] .gkb-detail { box-shadow: -18px 0 52px rgba(0, 0, 0, .55); }
      .gkb-detail-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 10px 14px;
        background: var(--dsw-alias-bg-layer-2);
        border-bottom: 1px solid var(--dsw-alias-border-l2); }
      .gkb-detail-head-main { display: flex; align-items: center; gap: 8px; flex: 1 1 auto; min-width: 0; }
      .gkb-detail-num { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
      .gkb-pill { flex: none; height: 18px; padding: 0 6px; border-radius: 4px; font-size: 10px; line-height: 16px;
        border: 1px solid var(--dsw-alias-state-success-primary); color: var(--dsw-alias-state-success-primary); }
      .gkb-pill[data-state="CLOSED"] { border-color: var(--dsw-alias-state-idle-primary);
        color: var(--dsw-alias-label-secondary); }
      .gkb-detail-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 12px; display: flex;
        flex-direction: column; gap: 12px; }
      .gkb-detail-title { margin: 0; font-size: 14px; line-height: 20px; font-weight: 600;
        word-break: break-word; }
      .gkb-detail-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 11px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-detail-labels { display: flex; flex-wrap: wrap; gap: 4px; }
      .gkb-section { display: flex; flex-direction: column; gap: 8px; }
      .gkb-section-title { margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .02em;
        color: var(--dsw-alias-label-secondary); }
      .gkb-section-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
      .gkb-zoom-btn { flex: none; height: 20px; padding: 0 7px; font-size: 10.5px; }
      .gkb-rel-zoom { position: fixed; inset: 0; z-index: 80; display: flex; align-items: center;
        justify-content: center; padding: 16px; }
      .gkb-rel-zoom-backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, .48); }
      .gkb-rel-zoom-card { position: relative; display: flex; flex-direction: column; gap: 10px;
        width: min(92vw, 1500px); height: min(88vh, 940px); padding: 14px; border-radius: 14px;
        border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 24px 80px rgba(0, 0, 0, .5); }
      .gkb-root[data-scheme="dark"] .gkb-rel-zoom-card { box-shadow: 0 28px 96px rgba(0, 0, 0, .72); }
      .gkb-rel-zoom-head { flex: none; display: flex; align-items: center; gap: 8px; }
      .gkb-rel-zoom-title { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary); }
      .gkb-rel-zoom-hint { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
      .gkb-rel-zoom-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column;
        gap: 8px; overflow: hidden; }
      .gkb-rel-zoom-graph { flex: 1 1 auto; min-height: 0; display: flex; align-items: center;
        justify-content: center; overflow: auto; }
      .gkb-rel-zoom-graph .gkb-graph-svg { width: 100%; height: 100%; max-height: 100%; }
      .gkb-rel-zoom-actions { flex: none; display: flex; justify-content: flex-end; gap: 8px; }
      .gkb-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11px;
        color: var(--dsw-alias-brand-primary); text-decoration: none; }
      .gkb-link:hover { text-decoration: underline; }
      .gkb-link:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .gkb-body-text { max-height: 260px; overflow-y: auto; padding: 8px; border-radius: 8px;
        border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base); font-size: 12px;
        line-height: 18px; color: var(--dsw-alias-label-secondary); word-break: break-word; }
      .gkb-body-text .gkb-md { color: var(--dsw-alias-label-secondary); }
      .gkb-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
      .gkb-select { height: 24px; max-width: 100%; padding: 0 6px; border-radius: 6px;
        border: 1px solid var(--dsw-alias-border-l2); background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary); font: inherit; font-size: 11px; }
      .gkb-select:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: -1px; }
      .gkb-action-msg { font-size: 11px; color: var(--dsw-alias-state-success-primary); }
      .gkb-action-error { font-size: 11px; color: var(--dsw-alias-state-error-primary); }
      .gkb-graph { border-radius: 10px; border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-base); padding: 6px; }
      .gkb-graph-svg { display: block; width: 100%; height: auto; overflow: visible; }
      .gkb-gnode { cursor: pointer; }
      .gkb-gnode-focus { cursor: default; }
      .gkb-gnode-rect { fill: var(--dsw-alias-bg-layer-1); stroke: var(--dsw-alias-border-l2); stroke-width: 1; }
      .gkb-gnode-focus .gkb-gnode-rect { fill: var(--dsw-alias-bg-layer-2);
        stroke: var(--dsw-alias-brand-primary); stroke-width: 1.6; }
      .gkb-gnode:hover .gkb-gnode-rect, .gkb-gnode:focus-visible .gkb-gnode-rect {
        stroke: var(--dsw-alias-brand-primary); }
      .gkb-gnode:focus-visible { outline: none; }
      .gkb-gnode:focus-visible .gkb-gnode-rect { stroke-width: 2; }
      .gkb-gnode-badge { fill: var(--dsw-alias-bg-layer-2); }
      .gkb-gnode-num { fill: var(--dsw-alias-label-secondary); font-size: 9px; font-weight: 600; }
      .gkb-gnode-title { fill: var(--dsw-alias-label-primary); font-size: 10.5px; }
      .gkb-gnode-focus .gkb-gnode-title { font-size: 11.5px; }
      .gkb-gnode-dot { fill: var(--dsw-alias-state-success-primary); }
      .gkb-gnode-dot[data-state="CLOSED"] { fill: var(--dsw-alias-state-idle-primary); }
      .gkb-edge-line { fill: none; stroke-width: 1.6; stroke-dasharray: 5 5; stroke-linecap: round;
        animation: gkb-flow 1.2s linear infinite; }
      .gkb-edge-label { font-size: 9px; fill: var(--dsw-alias-label-secondary); paint-order: stroke;
        stroke: var(--dsw-alias-bg-base); stroke-width: 3px; stroke-linejoin: round; }
      .gkb-legend { display: flex; flex-wrap: wrap; gap: 10px; }
      .gkb-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-legend-dash { animation: gkb-flow 1.2s linear infinite; }
      .gkb-rel-list { display: flex; flex-direction: column; gap: 4px; }
      .gkb-rel-item { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; padding: 4px 6px;
        border-radius: 6px; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-bg-base);
        font-size: 11px; }
      .gkb-rel-endpoint { display: inline-flex; align-items: center; gap: 4px; min-width: 0; }
      .gkb-rel-state { flex: none; font-size: 10px; line-height: 14px; font-weight: 600;
        color: var(--dsw-alias-state-success-primary); }
      .gkb-rel-state[data-state="CLOSED"] { color: var(--dsw-alias-label-secondary); }
      .gkb-group-chip { display: inline-flex; align-items: center; gap: 4px; max-width: 118px; height: 16px;
        padding: 0 5px; border-radius: 4px; border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-2); font-size: 9.5px; line-height: 14px;
        color: var(--dsw-alias-label-secondary); overflow: hidden; }
      .gkb-group-dot { width: 6px; height: 6px; border-radius: 50%; flex: none;
        background: var(--dsw-alias-label-secondary); }
      .gkb-group-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .gkb-state-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; font-size: 10px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-gnode-accent { pointer-events: none; }
      .gkb-gnode-closed .gkb-gnode-rect { stroke-dasharray: 4 3; }
      .gkb-gnode-closed .gkb-gnode-title { fill: var(--dsw-alias-label-secondary); }
      .gkb-gnode-state-text { fill: var(--dsw-alias-label-secondary); font-size: 8px; font-weight: 600; }
      .gkb-gnode-closed .gkb-gnode-state-text { fill: var(--dsw-alias-state-idle-primary); }
      .gkb-gnode:not(.gkb-gnode-closed) .gkb-gnode-state-text { fill: var(--dsw-alias-state-success-primary); }
      .gkb-rel-num { flex: none; font-weight: 600; color: var(--dsw-alias-label-secondary);
        font-variant-numeric: tabular-nums; }
      .gkb-rel-kind { flex: none; font-size: 10px; }
      .gkb-rel-arrow { flex: none; color: var(--dsw-alias-label-secondary); }
      .gkb-rel-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px;
        color: var(--dsw-alias-label-secondary); }
      .gkb-empty { padding: 18px 10px; text-align: center; font-size: 11px;
        color: var(--dsw-alias-label-secondary); border-radius: 8px;
        border: 1px dashed var(--dsw-alias-border-l2); }
      .gkb-note { font-size: 10.5px; color: var(--dsw-alias-state-warn-primary); }
      .gkb-error { font-size: 11px; color: var(--dsw-alias-state-error-primary); }
      .gkb-skeleton { display: flex; flex-direction: column; gap: 8px; padding: 4px 0; }
      .gkb-sk-bar { height: 10px; border-radius: 5px; background: var(--dsw-alias-bg-layer-2);
        animation: gkb-pulse 1.5s ease-in-out infinite; }
      .gkb-sk-block { height: 96px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1); animation: gkb-pulse 1.5s ease-in-out infinite; }
      @keyframes gkb-flow { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -20; } }
      @keyframes gkb-pulse { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
      @media (prefers-reduced-motion: reduce) {
        .gkb-edge-line, .gkb-legend-dash, .gkb-sk-bar, .gkb-sk-block { animation: none; }
        .gkb-detail, .gkb-detail[data-open="true"] { transition: none; }
      }
      ${MARKDOWN_CSS}
    `

    // ------------------------------------------------------------------
    // Artwork constants (literal colours are allowed for the graph only)
    // ------------------------------------------------------------------

    const EDGE_KINDS = [
      { kind: 'parent', colour: '#8b5cf6', labelKey: 'relation.parent' },
      { kind: 'blocks', colour: '#ef4444', labelKey: 'relation.blocks' },
      { kind: 'relates', colour: '#38bdf8', labelKey: 'relation.relates' },
    ]
    const EDGE_COLOUR = { parent: '#8b5cf6', blocks: '#ef4444', relates: '#38bdf8' }
    const EDGE_LABEL_KEY = {
      parent: 'relation.parent',
      blocks: 'relation.blocks',
      relates: 'relation.relates',
    }

    const GRAPH_FOCUS = { w: 192, h: 64 }
    const GRAPH_NODE = { w: 160, h: 60 }
    const GRAPH_PAD = 24

    // Kanban column marker palette (artwork colours: they identify groups in
    // the board columns, relation graph accents and relation rows alike).
    const GROUP_COLOURS = ['#3b82f6', '#f59e0b', '#a855f7', '#64748b', '#14b8a6', '#ec4899']

    const GLYPHS = {
      plus: 'M8 3.5v9M3.5 8h9',
      close: 'M4 4l8 8M12 4l-8 8',
      check: 'M3.5 8.5l3.2 3L12.5 4.5',
      pencil: 'M3 13l.9-3 6.6-6.6 2.1 2.1L6 12.1 3 13z',
      trash: 'M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8L11 4.5',
      refresh: 'M12.5 8a4.5 4.5 0 1 1-1.3-3.1M12.8 2.6v2.9h-2.9',
      external: 'M9 3.5h3.5V7M12.5 3.5L8 8M11 9v3.5H3.5V5H7',
      filter: 'M2.5 3.5h11l-4.1 4.9v4.1l-2.8-1.3V8.4L2.5 3.5z',
      expand: 'M6 2.5H2.5V6M10 2.5h3.5V6M6 13.5H2.5V10M10 13.5h3.5V10',
      collapse: 'M2.5 6H6V2.5M13.5 6H10V2.5M2.5 10H6v3.5M13.5 10H10v3.5',
    }

    // ------------------------------------------------------------------
    // Generic helpers
    // ------------------------------------------------------------------

    let fallbackT = function (key) {
      return typeof key === 'string' ? key : ''
    }

    function resolveT(props) {
      return props && typeof props.t === 'function' ? props.t : fallbackT
    }

    function tx(t, key, vars) {
      let text = ''
      if (typeof t === 'function') {
        try {
          text = t(key)
        } catch (reason) {
          text = ''
        }
      }
      if (typeof text !== 'string' || text === '') text = typeof key === 'string' ? key : ''
      if (!vars || typeof vars !== 'object') return text
      return text.replace(/\{(\w+)\}/g, (match, name) => (
        typeof vars[name] === 'string' || typeof vars[name] === 'number' ? String(vars[name]) : match
      ))
    }

    // ------------------------------------------------------------------
    // Minimal safe Markdown renderer (GFM-ish subset; never uses innerHTML)
    // ------------------------------------------------------------------

    function mdSafeHref(value) {
      if (typeof value !== 'string') return null
      const url = value.trim()
      if (url === '') return null
      if (/^https?:\/\//i.test(url) || /^mailto:/i.test(url) || url.startsWith('/') || url.startsWith('#')) return url
      return null
    }

    function mdSplitRow(row) {
      return String(row)
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .split('|')
        .map((cell) => cell.trim())
    }

    function parseMarkdownBlocks(text) {
      const lines = String(text === null || text === undefined ? '' : text).replace(/\r\n?/g, '\n').split('\n')
      const blocks = []
      let paragraph = []
      let index = 0
      const flushParagraph = () => {
        if (paragraph.length === 0) return
        blocks.push({ type: 'paragraph', text: paragraph.join('\n') })
        paragraph = []
      }
      while (index < lines.length) {
        const line = lines[index]
        if (/^\s*$/.test(line)) {
          flushParagraph()
          index += 1
          continue
        }
        const fence = /^\s*```\s*([A-Za-z0-9_+#.-]*)\s*$/.exec(line)
        if (fence !== null) {
          flushParagraph()
          const code = []
          index += 1
          while (index < lines.length && /^\s*```\s*$/.test(lines[index]) === false) {
            code.push(lines[index])
            index += 1
          }
          if (index < lines.length) index += 1
          blocks.push({ type: 'code', lang: fence[1], text: code.join('\n') })
          continue
        }
        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading !== null) {
          flushParagraph()
          blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] })
          index += 1
          continue
        }
        if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
          flushParagraph()
          blocks.push({ type: 'hr' })
          index += 1
          continue
        }
        if (/^\s{0,3}>\s?/.test(line)) {
          flushParagraph()
          const quote = []
          while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index])) {
            quote.push(lines[index].replace(/^\s{0,3}>\s?/, ''))
            index += 1
          }
          blocks.push({ type: 'quote', text: quote.join('\n') })
          continue
        }
        const nextLine = index + 1 < lines.length ? lines[index + 1] : ''
        if (line.indexOf('|') !== -1 && nextLine.indexOf('-') !== -1
          && /^\s*\|?\s*:?-{2,}[-\s|:]*$/.test(nextLine)) {
          flushParagraph()
          const header = mdSplitRow(line)
          index += 2
          const rows = []
          while (index < lines.length && lines[index].indexOf('|') !== -1 && /^\s*$/.test(lines[index]) === false) {
            rows.push(mdSplitRow(lines[index]))
            index += 1
          }
          blocks.push({ type: 'table', header, rows })
          continue
        }
        const listItem = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line)
        if (listItem !== null) {
          flushParagraph()
          const ordered = /^\d/.test(listItem[2])
          const items = []
          while (index < lines.length) {
            const itemMatch = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[index])
            if (itemMatch === null) {
              if (items.length > 0 && /^\s{2,}\S/.test(lines[index])) {
                items[items.length - 1].text += '\n' + lines[index].trim()
                index += 1
                continue
              }
              break
            }
            items.push({ text: itemMatch[3], indent: itemMatch[1].length })
            index += 1
          }
          blocks.push({ type: ordered ? 'ol' : 'ul', items })
          continue
        }
        paragraph.push(line)
        index += 1
      }
      flushParagraph()
      return blocks
    }

    function renderMarkdownInline(text, keyBase) {
      const nodes = []
      let buffer = ''
      let index = 0
      let keySeq = 0
      const nextKey = () => keyBase + ':' + (keySeq++)
      const flush = () => {
        if (buffer === '') return
        nodes.push(buffer)
        buffer = ''
      }
      while (index < text.length) {
        const rest = text.slice(index)
        const char = text[index]
        if (char === '\\' && index + 1 < text.length) {
          buffer += text[index + 1]
          index += 2
          continue
        }
        if (char === '\n') {
          flush()
          nodes.push(h('br', { key: nextKey() }))
          index += 1
          continue
        }
        let match = /^`([^`\n]+)`/.exec(rest)
        if (match !== null) {
          flush()
          nodes.push(h('code', { key: nextKey() }, match[1]))
          index += match[0].length
          continue
        }
        match = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest)
        if (match !== null) {
          const href = mdSafeHref(match[2])
          const label = '🖼 ' + (match[1] !== '' ? match[1] : match[2])
          flush()
          nodes.push(href === null
            ? h('span', { key: nextKey() }, label)
            : h('a', { key: nextKey(), className: 'gkb-md-image', href, target: '_blank', rel: 'noreferrer' }, label))
          index += match[0].length
          continue
        }
        match = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(rest)
        if (match !== null) {
          const href = mdSafeHref(match[2])
          const label = renderMarkdownInline(match[1], keyBase + 'k' + keySeq)
          flush()
          nodes.push(href === null
            ? h('span', { key: nextKey() }, label)
            : h('a', { key: nextKey(), href, target: '_blank', rel: 'noreferrer' }, label))
          index += match[0].length
          continue
        }
        match = /^(\*\*|__)([\s\S]+?)\1/.exec(rest)
        if (match !== null) {
          flush()
          nodes.push(h('strong', { key: nextKey() }, renderMarkdownInline(match[2], keyBase + 's' + keySeq)))
          index += match[0].length
          continue
        }
        match = /^~~([\s\S]+?)~~/.exec(rest)
        if (match !== null) {
          flush()
          nodes.push(h('del', { key: nextKey() }, renderMarkdownInline(match[1], keyBase + 'd' + keySeq)))
          index += match[0].length
          continue
        }
        match = /^(\*|_)([^*_\n]+?)\1/.exec(rest)
        if (match !== null && (match[1] === '*' || index === 0 || /[^A-Za-z0-9]/.test(text[index - 1]))) {
          flush()
          nodes.push(h('em', { key: nextKey() }, renderMarkdownInline(match[2], keyBase + 'e' + keySeq)))
          index += match[0].length
          continue
        }
        match = /^<((?:https?:\/\/)[^>\s]+)>/.exec(rest)
        if (match !== null) {
          flush()
          nodes.push(h('a', { key: nextKey(), href: match[1], target: '_blank', rel: 'noreferrer' }, match[1]))
          index += match[0].length
          continue
        }
        match = /^(https?:\/\/[^\s<>()]+[^\s<>().,;:!?])/.exec(rest)
        if (match !== null) {
          flush()
          nodes.push(h('a', { key: nextKey(), href: match[1], target: '_blank', rel: 'noreferrer' }, match[1]))
          index += match[0].length
          continue
        }
        buffer += char
        index += 1
      }
      flush()
      return nodes
    }

    function renderMarkdownBlocks(blocks, keyBase) {
      return blocks.map((block, index) => {
        const key = keyBase + 'b' + index
        if (block.type === 'paragraph') return h('p', { key }, renderMarkdownInline(block.text, key + 'i'))
        if (block.type === 'heading') return h('h' + block.level, { key }, renderMarkdownInline(block.text, key + 'i'))
        if (block.type === 'code') return h('pre', { key }, h('code', null, block.text))
        if (block.type === 'hr') return h('hr', { key })
        if (block.type === 'quote') {
          return h('blockquote', { key }, renderMarkdownBlocks(parseMarkdownBlocks(block.text), key + 'q'))
        }
        if (block.type === 'table') {
          return h('table', { key },
            h('thead', null, h('tr', null, block.header.map((cell, cellIndex) => h('th', {
              key: cellIndex,
            }, renderMarkdownInline(cell, key + 'h' + cellIndex))))),
            h('tbody', null, block.rows.map((row, rowIndex) => h('tr', { key: rowIndex },
              row.map((cell, cellIndex) => h('td', { key: cellIndex },
                renderMarkdownInline(cell !== undefined ? cell : '', key + 'r' + rowIndex + 'c' + cellIndex)))))))
        }
        if (block.type === 'ul' || block.type === 'ol') {
          const Tag = block.type === 'ol' ? 'ol' : 'ul'
          return h(Tag, { key }, block.items.map((item, itemIndex) => {
            const taskMatch = /^\[( |x|X)\]\s+([\s\S]*)$/.exec(item.text)
            if (taskMatch !== null) {
              const checked = taskMatch[1].toLowerCase() === 'x'
              return h('li', { key: itemIndex },
                h('span', { className: 'gkb-md-task' },
                  h('span', { className: 'gkb-md-task-box', 'data-checked': checked ? 'true' : 'false', 'aria-hidden': 'true' }),
                  h('span', null, renderMarkdownInline(taskMatch[2], key + 't' + itemIndex))))
            }
            return h('li', { key: itemIndex }, renderMarkdownInline(item.text, key + 'i' + itemIndex))
          }))
        }
        return null
      }).filter((node) => node !== null)
    }

    function renderMarkdown(text, extraClassName) {
      const blocks = parseMarkdownBlocks(text)
      if (blocks.length === 0) return null
      const className = 'gkb-md' + (typeof extraClassName === 'string' && extraClassName !== '' ? ' ' + extraClassName : '')
      return h('div', { className }, renderMarkdownBlocks(blocks, 'md'))
    }

    function toNumber(value) {
      if (typeof value === 'number') return Number.isFinite(value) ? value : null
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    }

    function errorMessage(reason, fallback) {
      if (reason && typeof reason.message === 'string' && reason.message.trim() !== '') return reason.message
      if (typeof reason === 'string' && reason.trim() !== '') return reason
      return typeof fallback === 'string' ? fallback : ''
    }

    function timestampOf(value) {
      if (typeof value !== 'string' || value === '') return 0
      const parsed = Date.parse(value)
      return Number.isFinite(parsed) ? parsed : 0
    }

    function formatDateShort(value) {
      if (typeof value !== 'string') return ''
      return value.length >= 10 ? value.slice(0, 10) : ''
    }

    function formatRelative(t, then, now) {
      if (!Number.isFinite(then) || then <= 0) return ''
      const diff = Math.max(0, now - then)
      const minutes = Math.floor(diff / 60000)
      if (minutes < 1) return tx(t, 'time.justNow')
      if (minutes < 60) return tx(t, 'time.minutes', { n: minutes })
      const hours = Math.floor(minutes / 60)
      if (hours < 24) return tx(t, 'time.hours', { n: hours })
      return tx(t, 'time.days', { n: Math.floor(hours / 24) })
    }

    function stateLabel(t, state) {
      return tx(t, state === 'CLOSED' ? 'state.closed' : 'state.open')
    }

    function labelColour(value) {
      if (typeof value !== 'string') return ''
      const raw = value.replace(/^#/, '').trim()
      return /^[0-9a-fA-F]{3,8}$/.test(raw) ? '#' + raw : ''
    }

    // ------------------------------------------------------------------
    // Inbox label filters: rows are ANDed; labels inside one row are ORed.
    // ------------------------------------------------------------------

    const LABEL_FILTER_STORAGE_PREFIX = 'github-kanban.labelFilters.'

    function normalizeLabelFilters(value) {
      if (!Array.isArray(value)) return []
      const rows = []
      for (const row of value) {
        if (!Array.isArray(row)) continue
        const labels = []
        for (const label of row) {
          if (typeof label !== 'string') continue
          const name = label.trim()
          if (name === '' || labels.includes(name)) continue
          labels.push(name)
        }
        if (labels.length > 0) rows.push(labels)
        if (rows.length >= 6) break
      }
      return rows
    }

    function loadLabelFilters(repo) {
      if (typeof repo !== 'string' || repo === '' || typeof localStorage === 'undefined') return []
      try {
        const raw = localStorage.getItem(LABEL_FILTER_STORAGE_PREFIX + repo)
        if (raw === null || raw === '') return []
        return normalizeLabelFilters(JSON.parse(raw))
      } catch (reason) {
        return []
      }
    }

    function saveLabelFilters(repo, filters) {
      if (typeof repo !== 'string' || repo === '' || typeof localStorage === 'undefined') return
      try {
        const normalized = normalizeLabelFilters(filters)
        const key = LABEL_FILTER_STORAGE_PREFIX + repo
        if (normalized.length === 0) localStorage.removeItem(key)
        else localStorage.setItem(key, JSON.stringify(normalized))
      } catch (reason) {
        // Filter persistence is a convenience; a full quota must not break the board.
      }
    }

    function matchesLabelFilters(issue, filters) {
      const rows = normalizeLabelFilters(filters)
      if (rows.length === 0) return true
      const names = new Set(
        Array.isArray(issue && issue.labels)
          ? issue.labels.map((label) => label && label.name).filter((name) => typeof name === 'string')
          : [],
      )
      return rows.every((row) => row.some((name) => names.has(name)))
    }

    function compareIssues(a, b) {
      const stateA = a.state === 'CLOSED' ? 1 : 0
      const stateB = b.state === 'CLOSED' ? 1 : 0
      if (stateA !== stateB) return stateA - stateB
      return timestampOf(b.updatedAt) - timestampOf(a.updatedAt)
    }

    function round1(value) {
      return Math.round(value * 10) / 10
    }

    // ------------------------------------------------------------------
    // Host HTTP access (same-origin route registered by the Host half)
    // ------------------------------------------------------------------

    async function requestJson(url, init) {
      const response = await fetch(url, init)
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        const message = data && typeof data.error === 'string' ? data.error : ''
        throw new Error(message !== '' ? message : 'HTTP ' + response.status)
      }
      if (data === null || typeof data !== 'object') throw new Error('')
      return data
    }

    // The Session the user last left in the conversation panel. The Host maps
    // it to a GitHub repository so the board follows the active project; the
    // last non-null value is kept because switching to the board itself
    // unretains the conversation (the "showing" row disappears).
    let reportedSession = null
    let sessionReportInFlight = false
    let sessionReportPending = null

    function flushSessionReport() {
      const next = sessionReportPending
      sessionReportPending = null
      if (next === null) {
        sessionReportInFlight = false
        return
      }
      fetch(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'activeSession', sessionId: next }),
      })
        .catch(() => {})
        .finally(() => {
          if (sessionReportPending !== null) flushSessionReport()
          else sessionReportInFlight = false
        })
    }

    function reportActiveSession(sessionId) {
      if (typeof sessionId !== 'string' || sessionId === '' || sessionId === reportedSession) return
      reportedSession = sessionId
      sessionReportPending = sessionId
      if (sessionReportInFlight) return
      sessionReportInFlight = true
      flushSessionReport()
    }

    function getBoardSnapshot() {
      const query = reportedSession === null ? '' : '?session=' + encodeURIComponent(reportedSession)
      return requestJson(API + query)
    }

    function postAction(action) {
      return requestJson(API, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(action),
      })
    }

    // ------------------------------------------------------------------
    // Sidebar entry badge: shared open-issue count for the panel icon
    // ------------------------------------------------------------------

    const EMPTY_ISSUE_STATS = { count: null, loading: false }
    let issueStats = EMPTY_ISSUE_STATS
    const issueStatsListeners = new Set()
    let issueStatsToken = 0
    let boardMounted = false

    function publishIssueStats(next) {
      issueStats = next
      for (const listener of issueStatsListeners) {
        try {
          listener()
        } catch (reason) {
          // A badge subscriber failing must not break the board refresh.
        }
      }
    }

    function subscribeIssueStats(listener) {
      issueStatsListeners.add(listener)
      return () => {
        issueStatsListeners.delete(listener)
      }
    }

    function fetchIssueStats(attempt) {
      const token = issueStatsToken
      const query = '?stats=1' + (reportedSession === null ? '' : '&session=' + encodeURIComponent(reportedSession))
      fetch(API + query)
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (token !== issueStatsToken || data === null || typeof data !== 'object') return
          const count = typeof data.count === 'number' && data.count >= 0 ? data.count : null
          publishIssueStats({ count, loading: data.loading === true })
          if (data.loading === true && attempt < 6) setTimeout(() => fetchIssueStats(attempt + 1), 1500)
        })
        .catch(() => {
          // The badge is optional chrome; the board itself reports fetch errors.
        })
    }

    function refreshIssueStats() {
      issueStatsToken += 1
      fetchIssueStats(0)
    }

    // ------------------------------------------------------------------
    // Active theme scheme: a light/dark attribute drives the detail panel's
    // night-mode contrast (opaque surface, stronger shadow, color-scheme).
    // ------------------------------------------------------------------

    const SCHEME_QUERY = '(prefers-color-scheme: dark)'
    let activeScheme = 'light'
    const schemeListeners = new Set()

    function schemeFromSnapshot(snapshot) {
      const scheme = snapshot && snapshot.active && typeof snapshot.active.colorScheme === 'string'
        ? snapshot.active.colorScheme
        : ''
      return scheme === 'dark' ? 'dark' : 'light'
    }

    function detectScheme() {
      try {
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
          return window.matchMedia(SCHEME_QUERY).matches ? 'dark' : 'light'
        }
      } catch (reason) {
        // No media query in this host; fall back to the light palette marker.
      }
      return 'light'
    }

    function setActiveScheme(next) {
      const scheme = next === 'dark' ? 'dark' : 'light'
      if (scheme === activeScheme) return
      activeScheme = scheme
      for (const listener of schemeListeners) {
        try {
          listener()
        } catch (reason) {
          // A scheme subscriber failing must not break the theme change.
        }
      }
    }

    function subscribeScheme(listener) {
      schemeListeners.add(listener)
      return () => {
        schemeListeners.delete(listener)
      }
    }

    function useScheme() {
      const [scheme, setScheme] = useState(activeScheme)
      useEffect(() => {
        const sync = () => setScheme(activeScheme)
        const unsubscribe = subscribeScheme(sync)
        sync()
        return unsubscribe
      }, [])
      return scheme
    }

    // ------------------------------------------------------------------
    // Host payload normalisation (defensive: every field is optional)
    // ------------------------------------------------------------------

    function normalizeIssue(raw) {
      if (!raw || typeof raw !== 'object') return null
      const number = toNumber(raw.number)
      if (number === null) return null
      const labels = []
      if (Array.isArray(raw.labels)) {
        for (const label of raw.labels) {
          if (!label || typeof label !== 'object') continue
          if (typeof label.name !== 'string' || label.name === '') continue
          labels.push({ name: label.name, color: typeof label.color === 'string' ? label.color : '' })
        }
      }
      const comments = toNumber(raw.comments)
      return {
        number,
        title: typeof raw.title === 'string' ? raw.title : '',
        state: raw.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
        url: typeof raw.url === 'string' ? raw.url : '',
        author: typeof raw.author === 'string' ? raw.author : '',
        labels,
        assignees: Array.isArray(raw.assignees) ? raw.assignees.filter((name) => typeof name === 'string') : [],
        comments: comments === null ? 0 : comments,
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
        milestone: typeof raw.milestone === 'string' ? raw.milestone : '',
        bodyExcerpt: typeof raw.bodyExcerpt === 'string' ? raw.bodyExcerpt : '',
      }
    }

    function normalizeGroup(raw, index) {
      if (!raw || typeof raw !== 'object') return null
      const id = typeof raw.id === 'string' && raw.id !== '' ? raw.id : ''
      if (id === '') return null
      const order = toNumber(raw.order)
      return {
        id,
        name: typeof raw.name === 'string' && raw.name.trim() !== '' ? raw.name : id,
        order: order === null ? index : order,
      }
    }

    function normalizeTask(raw) {
      if (!raw || typeof raw !== 'object') return null
      const id = typeof raw.id === 'string' && raw.id !== '' ? raw.id : ''
      const issueNumber = toNumber(raw.issueNumber)
      const groupId = typeof raw.groupId === 'string' && raw.groupId !== '' ? raw.groupId : ''
      if (id === '' || issueNumber === null || groupId === '') return null
      const claimedAt = raw.claimedAt === null || raw.claimedAt === undefined ? null : toNumber(raw.claimedAt)
      return {
        id,
        issueNumber,
        groupId,
        claimedAt,
        claimedBy: typeof raw.claimedBy === 'string' ? raw.claimedBy : null,
      }
    }

    function mergeBoard(previous, data) {
      const base = previous && typeof previous === 'object'
        ? previous
        : { repo: '', scope: 'mine', fetchedAt: 0, issues: EMPTY, groups: EMPTY, tasks: EMPTY, truncated: false }
      const fetchedAt = toNumber(data.fetchedAt)
      return {
        repo: typeof data.repo === 'string' ? data.repo : base.repo,
        scope: typeof data.scope === 'string' ? data.scope : base.scope,
        fetchedAt: fetchedAt === null ? base.fetchedAt : fetchedAt,
        issues: Array.isArray(data.issues) ? data.issues.map(normalizeIssue).filter(Boolean) : base.issues,
        groups: Array.isArray(data.groups) ? data.groups.map(normalizeGroup).filter(Boolean) : base.groups,
        tasks: Array.isArray(data.tasks) ? data.tasks.map(normalizeTask).filter(Boolean) : base.tasks,
        truncated: typeof data.truncated === 'boolean' ? data.truncated : base.truncated,
      }
    }

    function readDragPayload(event) {
      try {
        const transfer = event.dataTransfer
        if (!transfer || typeof transfer.getData !== 'function') return null
        const raw = transfer.getData('text/plain')
        if (typeof raw !== 'string' || raw === '') return null
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch (reason) {
        return null
      }
    }

    // ------------------------------------------------------------------
    // SVG graph layout helpers
    // ------------------------------------------------------------------

    function isWideChar(char) {
      const code = typeof char === 'string' ? char.codePointAt(0) : 0
      if (typeof code !== 'number') return false
      if (code >= 0x1100 && code <= 0x115f) return true
      if (code >= 0x2e80 && code <= 0xa4cf) return true
      if (code >= 0xac00 && code <= 0xd7a3) return true
      if (code >= 0xf900 && code <= 0xfaff) return true
      if (code >= 0xfe30 && code <= 0xfe4f) return true
      if (code >= 0xff00 && code <= 0xff60) return true
      if (code >= 0xffe0 && code <= 0xffe6) return true
      return code >= 0x20000 && code <= 0x3fffd
    }

    function wrapSvgTitle(text, maxWidth, fontSize, maxLines) {
      const value = typeof text === 'string' ? text.replace(/\s+/g, ' ').trim() : ''
      if (value === '') return []
      const charWidth = (char) => (isWideChar(char) ? fontSize : fontSize * 0.56)
      const lines = []
      let current = ''
      let width = 0
      let truncated = false
      for (const char of value) {
        const step = charWidth(char)
        if (width + step > maxWidth && current !== '') {
          lines.push(current)
          current = ''
          width = 0
          if (lines.length >= maxLines) {
            truncated = true
            break
          }
        }
        current += char
        width += step
      }
      if (!truncated && current !== '') lines.push(current)
      if (truncated && lines.length > 0) {
        let last = lines[lines.length - 1]
        let lastWidth = 0
        for (const char of last) lastWidth += charWidth(char)
        while (last.length > 0 && lastWidth + fontSize * 0.8 > maxWidth) {
          const removed = last.slice(-1)
          last = last.slice(0, -1)
          lastWidth -= charWidth(removed)
        }
        lines[lines.length - 1] = last + '…'
      }
      return lines.slice(0, maxLines)
    }

    function edgeGeometry(fromNode, toNode) {
      const dx = toNode.cx - fromNode.cx
      const dy = toNode.cy - fromNode.cy
      let p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y
      if (Math.abs(dy) >= Math.abs(dx)) {
        const sign = dy >= 0 ? 1 : -1
        p0x = fromNode.cx
        p0y = fromNode.cy + (sign * fromNode.h) / 2
        p3x = toNode.cx
        p3y = toNode.cy - (sign * toNode.h) / 2
        const bend = Math.max(16, Math.abs(p3y - p0y) * 0.5) * sign
        p1x = p0x
        p1y = p0y + bend
        p2x = p3x
        p2y = p3y - bend
      } else {
        const sign = dx >= 0 ? 1 : -1
        p0x = fromNode.cx + (sign * fromNode.w) / 2
        p0y = fromNode.cy
        p3x = toNode.cx - (sign * toNode.w) / 2
        p3y = toNode.cy
        const bend = Math.max(16, Math.abs(p3x - p0x) * 0.5) * sign
        p1x = p0x + bend
        p1y = p0y
        p2x = p3x - bend
        p2y = p3y
      }
      const d = 'M ' + round1(p0x) + ' ' + round1(p0y)
        + ' C ' + round1(p1x) + ' ' + round1(p1y)
        + ', ' + round1(p2x) + ' ' + round1(p2y)
        + ', ' + round1(p3x) + ' ' + round1(p3y)
      const midX = (p0x + 3 * p1x + 3 * p2x + p3x) / 8
      const midY = (p0y + 3 * p1y + 3 * p2y + p3y) / 8
      return { d, midX, midY }
    }

    function computeGraphLayout(data) {
      try {
        if (!data || typeof data !== 'object' || Array.isArray(data)) return null
        const focusNumber = toNumber(data.focus)
        if (focusNumber === null) return null
        const inputNodes = Array.isArray(data.nodes) ? data.nodes : []
        const inputEdges = Array.isArray(data.edges) ? data.edges : []

        const nodes = []
        const known = new Map()
        for (const raw of inputNodes) {
          if (!raw || typeof raw !== 'object') continue
          const number = toNumber(raw.number)
          if (number === null || known.has(number)) continue
          const node = {
            number,
            title: typeof raw.title === 'string' ? raw.title : '',
            state: raw.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
            role: typeof raw.role === 'string' ? raw.role : 'related',
          }
          known.set(number, node)
          nodes.push(node)
        }
        if (!known.has(focusNumber)) {
          const focusNode = { number: focusNumber, title: '', state: 'OPEN', role: 'focus' }
          known.set(focusNumber, focusNode)
          nodes.push(focusNode)
        }

        // The Host may report the same issue pair in both directions (a child
        // body links back to its parent while the parent's sub-issue list gives
        // parent → child). Collapse per unordered pair, keeping the first
        // direction (Host emits API-derived edges before text references) and
        // upgrading to the stronger kind, then derive roles from what is kept.
        const KIND_RANK = { parent: 3, blocks: 2, relates: 1 }
        const ROLE_RANK = { parent: 5, child: 4, blocker: 3, blocked: 2, related: 1 }
        const keptEdges = new Map()
        for (const raw of inputEdges) {
          if (!raw || typeof raw !== 'object') continue
          const from = toNumber(raw.from)
          const to = toNumber(raw.to)
          if (from === null || to === null || from === to) continue
          if (!known.has(from) || !known.has(to)) continue
          const kind = raw.kind === 'parent' || raw.kind === 'blocks' ? raw.kind : 'relates'
          const signature = Math.min(from, to) + ':' + Math.max(from, to)
          const previous = keptEdges.get(signature)
          if (previous !== undefined && KIND_RANK[kind] <= KIND_RANK[previous.kind]) continue
          keptEdges.set(signature, {
            id: signature + ':' + kind,
            from,
            to,
            kind,
            label: typeof raw.label === 'string' ? raw.label : '',
          })
        }
        const edges = [...keptEdges.values()]

        const roleOf = (number) => {
          let role = 'related'
          let best = 0
          for (const edge of edges) {
            let candidate = ''
            if (edge.to === focusNumber && edge.from === number) {
              candidate = edge.kind === 'parent' ? 'parent' : edge.kind === 'blocks' ? 'blocker' : 'related'
            } else if (edge.from === focusNumber && edge.to === number) {
              candidate = edge.kind === 'parent' ? 'child' : edge.kind === 'blocks' ? 'blocked' : 'related'
            } else {
              continue
            }
            if (ROLE_RANK[candidate] > best) {
              best = ROLE_RANK[candidate]
              role = candidate
            }
          }
          return role
        }

        const pools = { parent: [], child: [], blocker: [], blocked: [], related: [] }
        for (const node of nodes) {
          if (node.number === focusNumber) continue
          const role = roleOf(node.number)
          node.role = role
          pools[role].push(node)
        }

        const positions = new Map()
        positions.set(focusNumber, { cx: 0, cy: 0, w: GRAPH_FOCUS.w, h: GRAPH_FOCUS.h, focus: true })
        // Lay neighbours out in small grids instead of a single tall column so
        // the picture stays wide and fits the detail panel without scrolling.
        const rowGap = 30
        const rowStep = GRAPH_NODE.h + 14
        const colStep = GRAPH_NODE.w + 16
        const gridColumns = (count) => (count <= 2 ? Math.max(1, count) : 3)
        const gridHeight = (count, columns) => {
          const rows = Math.max(1, Math.ceil(count / columns))
          return rows * GRAPH_NODE.h + (rows - 1) * 14
        }
        const placeGrid = (list, topY, columns) => {
          const count = list.length
          for (let index = 0; index < count; index += 1) {
            const row = Math.floor(index / columns)
            const column = index % columns
            const inRow = Math.min(columns, count - row * columns)
            positions.set(list[index].number, {
              cx: (column - (inRow - 1) / 2) * colStep,
              cy: topY + row * rowStep + GRAPH_NODE.h / 2,
              w: GRAPH_NODE.w,
              h: GRAPH_NODE.h,
              focus: false,
            })
          }
        }
        const parentColumns = gridColumns(pools.parent.length)
        const parentHeight = pools.parent.length === 0 ? 0 : gridHeight(pools.parent.length, parentColumns)
        if (pools.parent.length > 0) {
          placeGrid(pools.parent, -((GRAPH_FOCUS.h / 2) + rowGap + parentHeight), parentColumns)
        }
        const childColumns = gridColumns(pools.child.length)
        const childHeight = pools.child.length === 0 ? 0 : gridHeight(pools.child.length, childColumns)
        if (pools.child.length > 0) {
          placeGrid(pools.child, (GRAPH_FOCUS.h / 2) + rowGap, childColumns)
        }

        const sideX = (GRAPH_FOCUS.w / 2) + 24 + (GRAPH_NODE.w / 2)
        const placeColumn = (list, cx) => {
          const count = list.length
          for (let index = 0; index < count; index += 1) {
            const cy = (index - (count - 1) / 2) * rowStep
            positions.set(list[index].number, { cx, cy, w: GRAPH_NODE.w, h: GRAPH_NODE.h, focus: false })
          }
        }
        placeColumn(pools.blocker, -sideX)
        placeColumn(pools.blocked, sideX)

        const stackSpan = (count) => (
          (count <= 1 ? 0 : ((count - 1) / 2) * rowStep) + (GRAPH_NODE.h / 2)
        )
        const relatedColumns = gridColumns(pools.related.length)
        const relatedTop = Math.max(
          (GRAPH_FOCUS.h / 2) + rowGap + childHeight + (pools.child.length > 0 ? 22 : 0),
          stackSpan(pools.blocker.length) + 22,
          stackSpan(pools.blocked.length) + 22,
        )
        if (pools.related.length > 0) placeGrid(pools.related, relatedTop, relatedColumns)

        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity
        for (const node of nodes) {
          const pos = positions.get(node.number)
          if (!pos) continue
          minX = Math.min(minX, pos.cx - pos.w / 2)
          maxX = Math.max(maxX, pos.cx + pos.w / 2)
          minY = Math.min(minY, pos.cy - pos.h / 2)
          maxY = Math.max(maxY, pos.cy + pos.h / 2)
        }
        if (!Number.isFinite(minX) || !Number.isFinite(minY)) return null

        const laidOutNodes = []
        for (const node of nodes) {
          const pos = positions.get(node.number)
          if (!pos) continue
          laidOutNodes.push({
            number: node.number,
            title: node.title,
            state: node.state,
            role: node.role,
            focus: pos.focus === true,
            cx: pos.cx,
            cy: pos.cy,
            w: pos.w,
            h: pos.h,
          })
        }
        const byNumber = new Map()
        for (const node of laidOutNodes) byNumber.set(node.number, node)

        const laidOutEdges = []
        for (const edge of edges) {
          const fromNode = byNumber.get(edge.from)
          const toNode = byNumber.get(edge.to)
          if (!fromNode || !toNode) continue
          const geometry = edgeGeometry(fromNode, toNode)
          laidOutEdges.push({
            id: edge.id,
            from: edge.from,
            to: edge.to,
            kind: edge.kind,
            label: edge.label,
            d: geometry.d,
            midX: geometry.midX,
            midY: geometry.midY,
          })
        }

        const width = Math.max(260, round1(maxX - minX + GRAPH_PAD * 2))
        const height = Math.max(150, round1(maxY - minY + GRAPH_PAD * 2))
        const viewBox = [
          round1(minX - GRAPH_PAD),
          round1(minY - GRAPH_PAD),
          width,
          height,
        ].join(' ')

        return { viewBox, nodes: laidOutNodes, edges: laidOutEdges }
      } catch (reason) {
        return null
      }
    }

    function edgeLabel(t, edge) {
      if (edge && typeof edge.label === 'string' && edge.label !== '') return edge.label
      return tx(t, EDGE_LABEL_KEY[edge && edge.kind] || 'relation.relates')
    }

    // ------------------------------------------------------------------
    // Small presentational pieces
    // ------------------------------------------------------------------

    function Glyph(props) {
      const name = typeof props.name === 'string' ? props.name : ''
      const d = GLYPHS[name] || ''
      const size = toNumber(props.size) === null ? 14 : Number(props.size)
      return h('svg', {
        className: 'gkb-glyph',
        viewBox: '0 0 16 16',
        width: size,
        height: size,
        'aria-hidden': 'true',
        focusable: 'false',
      }, h('path', {
        d,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.4,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
      }))
    }

    function IconButton(props) {
      return h('button', {
        className: 'gkb-icon-btn',
        type: 'button',
        'aria-label': props.label,
        title: typeof props.title === 'string' ? props.title : props.label,
        disabled: props.disabled === true,
        onClick: props.onClick,
      }, h(Glyph, { name: props.icon, size: 14 }))
    }

    function LabelChip(props) {
      const label = props.label && typeof props.label === 'object' ? props.label : null
      if (label === null || typeof label.name !== 'string') return null
      const colour = labelColour(label.color)
      return h('span', { className: 'gkb-label', title: label.name },
        h('span', {
          className: 'gkb-label-dot',
          'aria-hidden': 'true',
          style: colour !== '' ? { background: colour } : undefined,
        }),
        h('span', { className: 'gkb-label-name' }, label.name))
    }

    function KanbanIcon(props) {
      const t = resolveT(props)
      const size = toNumber(props.size) === null ? 18 : Number(props.size)
      const active = props.active === true
      const [stats, setStats] = useState(issueStats)
      useEffect(() => {
        let mounted = true
        const sync = () => {
          if (mounted) setStats(issueStats)
        }
        const unsubscribe = subscribeIssueStats(sync)
        sync()
        if (!boardMounted) refreshIssueStats()
        // The badge stays fresh even while the board panel is closed; when the
        // board page is mounted its own refresh already publishes the count.
        const interval = setInterval(() => {
          if (boardMounted) return
          if (typeof document !== 'undefined' && document.hidden === true) return
          refreshIssueStats()
        }, 300000)
        return () => {
          mounted = false
          unsubscribe()
          clearInterval(interval)
        }
      }, [])
      const count = typeof stats.count === 'number' && stats.count > 0 ? stats.count : 0
      const badgeText = count > 99 ? '99+' : count > 0 ? String(count) : ''
      const bars = [
        { x: 3, y: 4, w: 5, h: 16, opacity: active ? 0.95 : 0.55 },
        { x: 9.5, y: 4, w: 5, h: 11, opacity: active ? 0.8 : 0.42 },
        { x: 16, y: 4, w: 5, h: 7, opacity: active ? 0.65 : 0.3 },
      ]
      return h('span', {
        className: 'gkb-side-entry',
        style: { position: 'relative', display: 'inline-flex', width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        title: count > 0 ? tx(t, 'panel.countTitle', { n: count }) : undefined,
      },
      h('svg', {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        'aria-hidden': 'true',
        style: {
          display: 'block',
          color: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor',
          opacity: active ? 1 : 0.8,
        },
      }, bars.map((bar) => h('rect', {
        key: bar.x,
        x: bar.x,
        y: bar.y,
        width: bar.w,
        height: bar.h,
        rx: 1.6,
        fill: 'currentColor',
        opacity: bar.opacity,
      }))),
      badgeText === '' ? null : h('span', {
        className: 'gkb-side-badge',
        'aria-hidden': 'true',
        style: {
          position: 'absolute',
          top: -5,
          right: -3,
          boxSizing: 'border-box',
          minWidth: 13,
          height: 13,
          padding: '0 3px',
          borderRadius: 7,
          background: 'var(--dsw-alias-brand-primary)',
          color: 'var(--dsw-alias-bg-base)',
          fontFamily: 'inherit',
          fontSize: 8,
          fontWeight: 600,
          lineHeight: '13px',
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums',
          pointerEvents: 'none',
        },
      }, badgeText))
    }

    // ------------------------------------------------------------------
    // Board card
    // ------------------------------------------------------------------

    function IssueCard(props) {
      const t = resolveT(props)
      const issue = props.issue && typeof props.issue === 'object' ? props.issue : null
      if (issue === null) return null
      const number = toNumber(issue.number)
      if (number === null) return null
      const task = props.task && typeof props.task === 'object' ? props.task : null
      const group = props.group && typeof props.group === 'object' ? props.group : null
      const title = typeof issue.title === 'string' && issue.title !== '' ? issue.title : '#' + number
      const labels = Array.isArray(issue.labels) ? issue.labels.slice(0, 3) : []
      const claimed = task !== null && task.claimedAt !== null && task.claimedAt !== undefined
      const meta = []
      if (Array.isArray(issue.assignees) && issue.assignees.length > 0) meta.push('@' + issue.assignees[0])
      if (typeof issue.milestone === 'string' && issue.milestone !== '') meta.push('◈ ' + issue.milestone)
      const dragKind = props.dragKind === 'task' && task !== null && typeof task.id === 'string' ? 'task' : 'issue'
      // Only the inbox repeats an issue that already lives in a group, so the
      // group marker is meaningful there and noise on a group card.
      const groupName = dragKind === 'issue' && group !== null && typeof group.name === 'string' ? group.name : ''
      const dragPayload = dragKind === 'task'
        ? { kind: 'task', taskId: task.id, number, groupId: task.groupId }
        : { kind: 'issue', number }
      const onClick = () => {
        if (typeof props.onOpen === 'function') props.onOpen(number)
      }
      return h('article', {
        className: 'gkb-card',
        draggable: true,
        role: 'button',
        tabIndex: 0,
        'aria-label': '#' + number + ' ' + title,
        title,
        'data-active': props.active === true ? 'true' : 'false',
        'data-dragging': props.dragging === true ? 'true' : 'false',
        onClick,
        onKeyDown: (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        },
        onDragStart: (event) => {
          if (typeof props.onDragStart === 'function') props.onDragStart(event, dragPayload)
        },
        onDragEnd: () => {
          if (typeof props.onDragEnd === 'function') props.onDragEnd()
        },
      },
      h('div', { className: 'gkb-card-top' },
        h('span', { className: 'gkb-card-num' }, '#' + number),
        h('span', {
          className: 'gkb-state-dot',
          'data-state': issue.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
          title: stateLabel(t, issue.state),
          'aria-hidden': 'true',
        }),
        h('span', { className: 'gkb-card-grow' }),
        claimed ? h('span', { className: 'gkb-badge-claimed' }, t('card.claimed')) : null),
      h('div', { className: 'gkb-card-title' }, title),
      labels.length > 0
        ? h('div', { className: 'gkb-card-labels' }, labels.map((label, index) => h(LabelChip, {
          key: typeof label.name === 'string' ? label.name + index : index,
          label,
          t,
        })))
        : null,
      meta.length > 0 || groupName !== ''
        ? h('div', { className: 'gkb-card-foot' },
          meta.length > 0 ? h('span', { className: 'gkb-card-meta' }, meta.join(' · ')) : null,
          groupName !== ''
            ? h('span', { className: 'gkb-card-group', title: t('card.grouped') }, groupName)
            : null)
        : null)
    }

    // ------------------------------------------------------------------
    // Column shell (head content is supplied by the page so it can host
    // the inline rename / delete confirm states)
    // ------------------------------------------------------------------

    function Column(props) {
      const children = props.children
      const hasChildren = Array.isArray(children)
        ? children.length > 0
        : children !== null && children !== undefined && children !== false
      return h('section', {
        className: 'gkb-col' + (props.tone === 'inbox' ? ' gkb-col-inbox' : ''),
        'data-over': props.over === true ? 'true' : 'false',
        onDragOver: props.onDragOver,
        onDragLeave: props.onDragLeave,
        onDrop: props.onDrop,
      },
      h('header', { className: 'gkb-col-head' }, props.head),
      props.hint ? h('div', { className: 'gkb-col-hint' }, props.hint) : null,
      props.overlay || null,
      h('div', { className: 'gkb-col-list' },
        hasChildren ? children : h('div', { className: 'gkb-col-empty' }, props.empty)),
      props.footer || null)
    }

    // ------------------------------------------------------------------
    // Relationship graph (SVG artwork; literal colours live here)
    // ------------------------------------------------------------------

    function RelationGraph(props) {
      const t = resolveT(props)
      const layout = props.layout
      const uidRef = useRef(null)
      if (uidRef.current === null) {
        uidRef.current = 'gkb' + Math.random().toString(36).slice(2, 8)
      }
      const uid = uidRef.current
      const onSelectIssue = typeof props.onSelectIssue === 'function' ? props.onSelectIssue : null
      const groupMarks = props.groupMarks instanceof Map ? props.groupMarks : null
      if (!layout || !Array.isArray(layout.nodes) || layout.nodes.length === 0) return null
      const edges = Array.isArray(layout.edges) ? layout.edges : []
      const nodes = layout.nodes

      const edgeElements = edges.map((edge) => {
        const colour = EDGE_COLOUR[edge.kind] || EDGE_COLOUR.relates
        return h('g', { key: edge.id },
          h('path', {
            className: 'gkb-edge-line',
            d: edge.d,
            stroke: colour,
            markerEnd: 'url(#' + uid + '-' + (EDGE_COLOUR[edge.kind] ? edge.kind : 'relates') + ')',
          }),
          // Plain "relates" edges would repeat the same word on every line;
          // their kind is carried by colour and the legend instead.
          edge.kind === 'relates' ? null : h('text', {
            className: 'gkb-edge-label',
            x: round1(edge.midX),
            y: round1(edge.midY - 5),
            'textAnchor': 'middle',
          }, edgeLabel(t, edge)))
      })

      const nodeElements = nodes.map((node) => {
        const w = node.w
        const hh = node.h
        const badge = '#' + node.number
        const badgeWidth = 14 + badge.length * (node.focus ? 6.6 : 6)
        const badgeY = -hh / 2 + (node.focus ? 7 : 6)
        const badgeH = node.focus ? 15 : 14
        const lines = wrapSvgTitle(
          node.title !== '' ? node.title : badge,
          w - 22,
          node.focus ? 12 : 11,
          3,
        )
        const titleStart = 4
        const lineHeight = node.focus ? 13 : 12
        const interactive = !node.focus && onSelectIssue !== null
        const rect = h('rect', {
          className: 'gkb-gnode-rect',
          x: -w / 2,
          y: -hh / 2,
          width: w,
          height: hh,
          rx: 9,
        })
        const badgeRect = h('rect', {
          className: 'gkb-gnode-badge',
          x: -w / 2 + 9,
          y: badgeY,
          width: badgeWidth,
          height: badgeH,
          rx: 4,
        })
        const numberText = h('text', {
          className: 'gkb-gnode-num',
          x: -w / 2 + 9 + badgeWidth / 2,
          y: badgeY + badgeH - 4,
          textAnchor: 'middle',
        }, badge)
        const stateDot = h('circle', {
          className: 'gkb-gnode-dot',
          'data-state': node.state === 'CLOSED' ? 'CLOSED' : 'OPEN',
          cx: w / 2 - 11,
          cy: badgeY + badgeH / 2,
          r: 3,
        })
        const stateText = h('text', {
          className: 'gkb-gnode-state-text',
          x: w / 2 - 17,
          y: badgeY + badgeH - 4,
          textAnchor: 'end',
        }, node.state === 'CLOSED' ? t('relation.finished') : t('relation.unfinished'))
        const mark = groupMarks !== null ? groupMarks.get(node.number) : undefined
        const accent = mark === undefined
          ? null
          : h('rect', {
            className: 'gkb-gnode-accent',
            x: -w / 2 + 2.5,
            y: -hh / 2 + 9,
            width: 3,
            height: hh - 18,
            rx: 1.5,
            fill: mark.color,
          })
        const titleText = lines.length > 0
          ? h('text', {
            className: 'gkb-gnode-title',
            x: 0,
            y: 0,
            textAnchor: 'middle',
          }, lines.map((line, index) => h('tspan', {
            key: index,
            x: 0,
            dy: index === 0 ? titleStart : lineHeight,
          }, line)))
          : null
        return h('g', {
          key: node.number,
          className: 'gkb-gnode' + (node.focus ? ' gkb-gnode-focus' : '')
            + (node.state === 'CLOSED' ? ' gkb-gnode-closed' : ''),
          transform: 'translate(' + round1(node.cx) + ' ' + round1(node.cy) + ')',
          role: interactive ? 'button' : undefined,
          tabIndex: interactive ? 0 : undefined,
          'aria-label': interactive ? badge + ' ' + node.title : undefined,
          onClick: interactive ? () => onSelectIssue(node.number) : undefined,
          onKeyDown: interactive
            ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelectIssue(node.number)
              }
            }
            : undefined,
        }, accent, rect, badgeRect, numberText, stateDot, stateText, titleText)
      })

      return h('svg', {
        className: 'gkb-graph-svg',
        viewBox: layout.viewBox,
        preserveAspectRatio: 'xMidYMid meet',
        role: 'img',
        'aria-label': t('detail.relations'),
      },
      h('defs', null, EDGE_KINDS.map((item) => h('marker', {
        key: item.kind,
        id: uid + '-' + item.kind,
        viewBox: '0 0 10 10',
        refX: 9,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: 'auto',
      }, h('path', { d: 'M 0 0 L 10 5 L 0 10 Z', fill: item.colour })))),
      h('g', null, edgeElements),
      h('g', null, nodeElements))
    }

    // ------------------------------------------------------------------
    // Right-hand detail panel
    // ------------------------------------------------------------------

    function DetailPanel(props) {
      const t = resolveT(props)
      const number = toNumber(props.number)
      const open = props.open === true
      const issue = props.issue && typeof props.issue === 'object' ? props.issue : null
      const task = props.task && typeof props.task === 'object' ? props.task : null
      const groups = Array.isArray(props.groups) ? props.groups : EMPTY
      const tasks = Array.isArray(props.tasks) ? props.tasks : EMPTY
      const repo = typeof props.repo === 'string' ? props.repo : ''
      const runAction = typeof props.runAction === 'function' ? props.runAction : null
      const onSelectIssue = typeof props.onSelectIssue === 'function' ? props.onSelectIssue : null
      const relationsZoomed = props.relationsZoomed === true
      const onZoomRelations = typeof props.onZoomRelations === 'function' ? props.onZoomRelations : null

      const [graph, setGraph] = useState(null)
      const [graphLoading, setGraphLoading] = useState(false)
      const [graphError, setGraphError] = useState(null)
      const [attempt, setAttempt] = useState(0)
      const [groupChoice, setGroupChoice] = useState('')
      const [busy, setBusy] = useState(null)
      const [notice, setNotice] = useState(null)
      const [actionError, setActionError] = useState(null)
      const cacheRef = useRef(null)
      if (cacheRef.current === null) cacheRef.current = new Map()

      useEffect(() => {
        if (number === null) {
          setGraph(null)
          setGraphLoading(false)
          setGraphError(null)
          return undefined
        }
        const cache = cacheRef.current
        const hit = cache.get(number)
        if (hit && Date.now() - hit.at < 60000) {
          setGraph(hit.value)
          setGraphLoading(false)
          setGraphError(null)
          return undefined
        }
        let cancelled = false
        setGraphLoading(true)
        setGraphError(null)
        setGraph(null)
        requestJson(API + '?issue=' + encodeURIComponent(String(number)))
          .then((data) => {
            if (cancelled) return
            cache.set(number, { at: Date.now(), value: data })
            setGraph(data)
            setGraphLoading(false)
          })
          .catch((reason) => {
            if (cancelled) return
            setGraphError(errorMessage(reason, ''))
            setGraphLoading(false)
          })
        return () => {
          cancelled = true
        }
      }, [number, attempt])

      const taskGroupId = task !== null && typeof task.groupId === 'string' ? task.groupId : ''

      useEffect(() => {
        setGroupChoice(taskGroupId !== '' ? taskGroupId : '')
      }, [number, taskGroupId])

      useEffect(() => {
        if (groupChoice !== '') return
        const first = groups.length > 0 && groups[0] && typeof groups[0].id === 'string' ? groups[0].id : ''
        if (first !== '') setGroupChoice(first)
      }, [groups, groupChoice])

      useEffect(() => {
        setNotice(null)
        setActionError(null)
        setBusy(null)
      }, [number])

      const graphLayout = useMemo(() => computeGraphLayout(graph), [graph])
      const relationsReady = graphLayout !== null && graphLayout.nodes.length > 1 && graphLayout.edges.length > 0
      // Which kanban column each related issue sits in, with the same palette
      // the board columns use. State (open/closed) is tracked separately.
      const groupMarksByIssue = useMemo(() => {
        const marks = new Map()
        const colourByGroup = new Map()
        groups.forEach((group, index) => colourByGroup.set(group.id, {
          id: group.id,
          name: group.name,
          color: GROUP_COLOURS[index % GROUP_COLOURS.length],
        }))
        for (const task of tasks) {
          const marker = colourByGroup.get(task.groupId)
          if (marker !== undefined) marks.set(task.issueNumber, marker)
        }
        return marks
      }, [groups, tasks])
      const nodeStates = useMemo(() => {
        const states = new Map()
        if (graphLayout !== null) for (const node of graphLayout.nodes) states.set(node.number, node.state === 'CLOSED' ? 'CLOSED' : 'OPEN')
        return states
      }, [graphLayout])
      const presentGroups = useMemo(() => {
        const marks = new Map()
        if (graphLayout !== null) {
          for (const node of graphLayout.nodes) {
            const marker = groupMarksByIssue.get(node.number)
            if (marker !== undefined && !marks.has(marker.id)) marks.set(marker.id, marker)
          }
        }
        return [...marks.values()]
      }, [graphLayout, groupMarksByIssue])

      const presentKinds = useMemo(() => {
        const kinds = new Set()
        if (graphLayout && Array.isArray(graphLayout.edges)) {
          for (const edge of graphLayout.edges) kinds.add(edge.kind)
        }
        return kinds
      }, [graphLayout])

      const nodeTitles = useMemo(() => {
        const titles = new Map()
        if (graphLayout && Array.isArray(graphLayout.nodes)) {
          for (const node of graphLayout.nodes) titles.set(node.number, node.title || '')
        }
        return titles
      }, [graphLayout])

      const close = () => {
        if (typeof props.onClose === 'function') props.onClose()
      }

      const retryGraph = () => {
        if (number !== null) cacheRef.current.delete(number)
        setAttempt((value) => value + 1)
      }

      const assign = async () => {
        if (number === null || groupChoice === '' || busy !== null || runAction === null) return
        setBusy('assign')
        setNotice(null)
        setActionError(null)
        try {
          await runAction({ action: 'assign', issue: number, group: groupChoice })
          setNotice(t('detail.added'))
        } catch (reason) {
          setActionError(errorMessage(reason, ''))
        } finally {
          setBusy(null)
        }
      }

      const remove = async () => {
        if (task === null || typeof task.id !== 'string' || busy !== null || runAction === null) return
        setBusy('remove')
        setNotice(null)
        setActionError(null)
        try {
          await runAction({ action: 'remove', taskId: task.id })
          setNotice(t('detail.removed'))
        } catch (reason) {
          setActionError(errorMessage(reason, ''))
        } finally {
          setBusy(null)
        }
      }

      const focusNode = graph && Array.isArray(graph.nodes)
        ? graph.nodes.find((node) => node && toNumber(node.number) === number) || null
        : null
      const title = issue !== null && typeof issue.title === 'string' && issue.title !== ''
        ? issue.title
        : focusNode !== null && typeof focusNode.title === 'string' && focusNode.title !== ''
          ? focusNode.title
          : number === null ? '' : '#' + number
      const issueUrl = issue !== null && typeof issue.url === 'string' && issue.url !== ''
        ? issue.url
        : repo !== '' && number !== null
          ? 'https://github.com/' + repo + '/issues/' + number
          : ''
      const state = issue !== null && issue.state === 'CLOSED'
        ? 'CLOSED'
        : focusNode !== null && focusNode.state === 'CLOSED' ? 'CLOSED' : 'OPEN'
      const labels = issue !== null && Array.isArray(issue.labels) ? issue.labels.slice(0, 8) : []
      const excerpt = issue !== null && typeof issue.bodyExcerpt === 'string' ? issue.bodyExcerpt : ''
      const detailBody = graph !== null && typeof graph.body === 'string' && graph.body.trim() !== ''
        ? graph.body
        : excerpt
      const metaItems = []
      if (issue !== null && typeof issue.author === 'string' && issue.author !== '') {
        metaItems.push('@' + issue.author)
      }
      if (issue !== null && toNumber(issue.comments) !== null && issue.comments > 0) {
        metaItems.push(tx(t, 'detail.comments', { n: issue.comments }))
      }
      const updatedDate = issue !== null ? formatDateShort(issue.updatedAt) : ''
      if (updatedDate !== '') metaItems.push(tx(t, 'detail.updatedAt', { date: updatedDate }))

      const legend = presentKinds.size === 0 ? null : h('div', { className: 'gkb-legend' },
        h('span', { className: 'gkb-muted' }, t('relation.legend') + '：'),
        EDGE_KINDS.filter((item) => presentKinds.has(item.kind)).map((item) => h('span', {
          className: 'gkb-legend-item',
          key: item.kind,
        },
        h('svg', { width: 22, height: 8, viewBox: '0 0 22 8', 'aria-hidden': 'true' },
          h('line', {
            className: 'gkb-legend-dash',
            x1: 1,
            y1: 4,
            x2: 21,
            y2: 4,
            stroke: item.colour,
            strokeWidth: 1.6,
            strokeDasharray: '4 4',
          })),
        h('span', null, t(item.labelKey)))))

      const renderEndpoint = (number) => {
        const marker = groupMarksByIssue.get(number) || null
        const state = nodeStates.get(number) === 'CLOSED' ? 'CLOSED' : 'OPEN'
        return h('span', { className: 'gkb-rel-endpoint' },
          h('span', { className: 'gkb-rel-num' }, '#' + number),
          h('span', {
            className: 'gkb-rel-state',
            'data-state': state,
            'aria-hidden': 'true',
            title: state === 'CLOSED' ? t('relation.finished') : t('relation.unfinished'),
          }, state === 'CLOSED' ? '✓' : '○'),
          marker !== null
            ? h('span', { className: 'gkb-group-chip', title: t('relation.group') + '：' + marker.name },
              h('span', { className: 'gkb-group-dot', style: { background: marker.color }, 'aria-hidden': 'true' }),
              h('span', { className: 'gkb-group-name' }, marker.name))
            : null)
      }
      const renderEdgeRow = (edge) => {
        const fromTitle = nodeTitles.get(edge.from) || ''
        const toTitle = nodeTitles.get(edge.to) || ''
        const label = edgeLabel(t, edge)
        return h('div', {
          className: 'gkb-rel-item',
          key: edge.id,
          title: '#' + edge.from + (fromTitle !== '' ? ' ' + fromTitle : '')
            + ' → #' + edge.to + (toTitle !== '' ? ' ' + toTitle : ''),
        },
        renderEndpoint(edge.from),
        h('span', { className: 'gkb-rel-kind', style: { color: EDGE_COLOUR[edge.kind] || EDGE_COLOUR.relates } }, label),
        h('span', { className: 'gkb-rel-arrow', 'aria-hidden': 'true' }, '→'),
        renderEndpoint(edge.to),
        toTitle !== '' ? h('span', { className: 'gkb-rel-title' }, toTitle) : null)
      }
      const stateLegend = graphLayout === null ? null : h('div', { className: 'gkb-state-legend' },
        h('span', { className: 'gkb-legend-item' },
          h('span', { className: 'gkb-rel-state', 'data-state': 'CLOSED', 'aria-hidden': 'true' }, '✓'),
          t('relation.finished')),
        h('span', { className: 'gkb-legend-item' },
          h('span', { className: 'gkb-rel-state', 'data-state': 'OPEN', 'aria-hidden': 'true' }, '○'),
          t('relation.unfinished')),
        presentGroups.map((marker) => h('span', { key: marker.id, className: 'gkb-legend-item' },
          h('span', { className: 'gkb-group-dot', style: { background: marker.color }, 'aria-hidden': 'true' }),
          marker.name)))

      const neighbourCount = graphLayout === null ? 0 : Math.max(0, graphLayout.nodes.length - 1)
      const truncatedNote = !graphLoading && graphError === null && graph !== null
        && (graph.truncated === true || neighbourCount > 12)
        ? h('div', { className: 'gkb-note' }, t('detail.truncated'))
        : null

      const relationSection = h('section', { className: 'gkb-section' },
        h('div', { className: 'gkb-section-head' },
          h('h3', { className: 'gkb-section-title' }, t('detail.relations')),
          relationsReady && onZoomRelations !== null
            ? h('button', {
              className: 'gkb-btn gkb-zoom-btn',
              type: 'button',
              title: t('detail.zoom'),
              'aria-label': t('detail.zoom'),
              onClick: () => onZoomRelations(true),
            }, h(Glyph, { name: 'expand', size: 12 }), h('span', null, t('detail.zoom')))
            : null),
        number === null
          ? h('div', { className: 'gkb-empty' }, t('detail.relationsEmpty'))
          : graphLoading
            ? h('div', { className: 'gkb-skeleton' },
              h('div', { className: 'gkb-sk-bar', style: { width: '46%' } }),
              h('div', { className: 'gkb-sk-block' }))
            : graphError !== null
              ? h('div', { className: 'gkb-section' },
                h('div', { className: 'gkb-error' },
                  graphError === '' ? t('detail.graphError') : graphError),
                h('button', {
                  className: 'gkb-btn',
                  type: 'button',
                  onClick: retryGraph,
                }, t('panel.retry')))
              : graphLayout === null || graphLayout.nodes.length <= 1 || graphLayout.edges.length === 0
                ? h('div', { className: 'gkb-empty' }, t('detail.relationsEmpty'))
                : h('div', { className: 'gkb-section' },
                  h('div', { className: 'gkb-graph' }, h(RelationGraph, {
                    t,
                    layout: graphLayout,
                    groupMarks: groupMarksByIssue,
                    onSelectIssue,
                  })),
                  legend,
                  stateLegend,
                  h('div', { className: 'gkb-section' },
                    h('h3', { className: 'gkb-section-title' }, t('relation.list')),
                    h('div', { className: 'gkb-rel-list' },
                      graphLayout.edges.map(renderEdgeRow)))),
        truncatedNote)

      // Lifted above the whole frame: only while the relations graph has
      // content; Escape / backdrop / the restore button return to the panel.
      const zoomOverlay = relationsZoomed && relationsReady && onZoomRelations !== null
        ? h('div', { className: 'gkb-rel-zoom', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('detail.relations') },
          h('div', {
            className: 'gkb-rel-zoom-backdrop',
            'aria-hidden': 'true',
            onClick: () => onZoomRelations(false),
          }),
          h('div', { className: 'gkb-rel-zoom-card' },
            h('div', { className: 'gkb-rel-zoom-head' },
              h('span', { className: 'gkb-rel-zoom-title' }, (number === null ? '' : '#' + number + ' ') + t('detail.relations')),
              h('span', { className: 'gkb-rel-zoom-hint' }, t('detail.zoomHint')),
              h('span', { className: 'gkb-spacer' }),
              h(IconButton, {
                icon: 'collapse',
                label: t('detail.shrink'),
                title: t('detail.shrink'),
                onClick: () => onZoomRelations(false),
              })),
            h('div', { className: 'gkb-rel-zoom-body' },
              h('div', { className: 'gkb-graph gkb-rel-zoom-graph' }, h(RelationGraph, {
                t,
                layout: graphLayout,
                groupMarks: groupMarksByIssue,
                onSelectIssue,
              })),
              legend,
              stateLegend),
            h('div', { className: 'gkb-rel-zoom-actions' },
              h('button', {
                className: 'gkb-btn',
                type: 'button',
                onClick: () => onZoomRelations(false),
              }, h(Glyph, { name: 'collapse' }), h('span', null, t('detail.shrink'))))))
        : null

      const body = number === null
        ? h('div', { className: 'gkb-detail-body' },
          h('div', { className: 'gkb-empty' }, t('panel.empty')))
        : h('div', { className: 'gkb-detail-body' },
          h('h2', { className: 'gkb-detail-title' }, title),
          metaItems.length > 0
            ? h('div', { className: 'gkb-detail-meta' },
              metaItems.map((text, index) => h('span', { key: index }, text)))
            : null,
          labels.length > 0
            ? h('div', { className: 'gkb-detail-labels' },
              labels.map((label, index) => h(LabelChip, {
                key: typeof label.name === 'string' ? label.name + index : index,
                label,
                t,
              })))
            : null,
          issueUrl !== ''
            ? h('a', {
              className: 'gkb-link',
              href: issueUrl,
              target: '_blank',
              rel: 'noreferrer',
            }, h(Glyph, { name: 'external', size: 12 }), h('span', null, t('detail.open')))
            : null,
          h('section', { className: 'gkb-section' },
            h('h3', { className: 'gkb-section-title' }, t('detail.body')),
            h('div', { className: 'gkb-body-text' }, detailBody !== '' ? renderMarkdown(detailBody) : t('detail.bodyEmpty'))),
          h('section', { className: 'gkb-section' },
            h('h3', { className: 'gkb-section-title' }, t('detail.group')),
            h('div', { className: 'gkb-actions' },
              h('select', {
                className: 'gkb-select',
                value: groupChoice,
                'aria-label': t('detail.group'),
                disabled: groups.length === 0,
                onChange: (event) => setGroupChoice(event.target.value),
              }, groups.map((group) => h('option', {
                key: group.id,
                value: group.id,
              }, group.name))),
              h('button', {
                className: 'gkb-btn gkb-btn-primary',
                type: 'button',
                disabled: busy !== null || groupChoice === '' || groups.length === 0,
                onClick: () => {
                  void assign()
                },
              }, busy === 'assign' ? t('action.busy') : t('detail.addToGroup')),
              task !== null
                ? h('button', {
                  className: 'gkb-btn',
                  type: 'button',
                  disabled: busy !== null,
                  onClick: () => {
                    void remove()
                  },
                }, busy === 'remove' ? t('action.busy') : t('detail.remove'))
                : null),
            notice !== null ? h('div', { className: 'gkb-action-msg' }, notice) : null,
            actionError !== null
              ? h('div', { className: 'gkb-action-error' },
                t('action.failed') + '：' + (actionError === '' ? t('action.failed') : actionError))
              : null),
          relationSection)

      return h('aside', {
        className: 'gkb-detail',
        'data-open': open ? 'true' : 'false',
        'data-zoomed': relationsZoomed && relationsReady ? 'true' : 'false',
        'aria-hidden': open ? 'false' : 'true',
        'aria-label': t('detail.title'),
      },
      h('header', { className: 'gkb-detail-head' },
        h('div', { className: 'gkb-detail-head-main' },
          h('span', { className: 'gkb-detail-num' }, number === null ? t('detail.title') : '#' + number),
          number !== null
            ? h('span', { className: 'gkb-pill', 'data-state': state }, stateLabel(t, state))
            : null),
        h(IconButton, {
          icon: 'close',
          label: t('detail.close'),
          title: t('detail.close'),
          onClick: close,
        })),
      body,
      zoomOverlay)
    }

    // ------------------------------------------------------------------
    // Board page (everything above the detail panel)
    // ------------------------------------------------------------------

    function BoardView(props) {
      const t = resolveT(props)
      const scheme = useScheme()

      const [board, setBoard] = useState(null)
      const [loading, setLoading] = useState(true)
      const [refreshing, setRefreshing] = useState(false)
      const [fetchError, setFetchError] = useState(null)
      const [hostError, setHostError] = useState(null)
      const [actionError, setActionError] = useState(null)
      const [now, setNow] = useState(() => Date.now())
      const [dragState, setDragState] = useState(null)
      const [dropTarget, setDropTarget] = useState(null)
      const [adding, setAdding] = useState(false)
      const [groupDraft, setGroupDraft] = useState('')
      const [renaming, setRenaming] = useState(null)
      const [renameDraft, setRenameDraft] = useState('')
      const [confirmDelete, setConfirmDelete] = useState(null)
      const [repoDraft, setRepoDraft] = useState(null)
      const [selected, setSelected] = useState(null)
      const [panelOpen, setPanelOpen] = useState(false)
      const [relationsZoomed, setRelationsZoomed] = useState(false)
      const [labelFilters, setLabelFilters] = useState([])
      const [filterOpen, setFilterOpen] = useState(false)
      const [pickerRow, setPickerRow] = useState(null)
      const [filterSearch, setFilterSearch] = useState('')

      const inFlightRef = useRef(false)
      const lastSyncRef = useRef(0)
      const suppressClickRef = useRef(0)
      const stripRef = useRef(null)
      const addInputRef = useRef(null)
      const filterPanelRef = useRef(null)
      const filterButtonRef = useRef(null)
      const filtersRepoRef = useRef('')
      const mountedRef = useRef(true)

      const applyData = useCallback((data) => {
        if (!data || typeof data !== 'object') return
        setBoard((previous) => mergeBoard(previous, data))
        if (Object.prototype.hasOwnProperty.call(data, 'error')) {
          setHostError(typeof data.error === 'string' && data.error.trim() !== '' ? data.error : null)
        }
        if (Array.isArray(data.issues)) {
          publishIssueStats({
            count: data.issues.filter((issue) => issue !== null && issue.state !== 'CLOSED').length,
            loading: false,
          })
        }
        setNow(Date.now())
        lastSyncRef.current = Date.now()
      }, [])

      const loadBoard = useCallback(async (mode) => {
        if (inFlightRef.current) return
        inFlightRef.current = true
        if (mode !== 'poll') setRefreshing(true)
        try {
          // Polling and manual refresh ask the Host to refetch from GitHub;
          // the first mount may reuse the Host's cache. Either way the result
          // is merged into React state below — no page reload, no remount.
          const data = mode === 'refresh' || mode === 'poll'
            ? await postAction({ action: 'refresh' })
            : await getBoardSnapshot()
          applyData(data)
          setFetchError(null)
        } catch (reason) {
          setFetchError(errorMessage(reason, ''))
        } finally {
          inFlightRef.current = false
          if (mountedRef.current) {
            setLoading(false)
            setRefreshing(false)
          }
        }
      }, [applyData])

      const runAction = useCallback(async (action) => {
        const data = await postAction(action)
        applyData(data)
        return data
      }, [applyData])

      useEffect(() => {
        mountedRef.current = true
        boardMounted = true
        void loadBoard('initial')
        return () => {
          mountedRef.current = false
          boardMounted = false
        }
      }, [loadBoard])

      // The only polling interval in this module. The board refreshes itself
      // every five minutes and catches up when the page becomes visible again
      // after more than five minutes; one in-flight request at a time, skipped
      // while hidden, cleared on unmount. Every refresh merges data into state.
      useEffect(() => {
        const interval = setInterval(() => {
          if (typeof document !== 'undefined' && document.hidden === true) return
          if (inFlightRef.current) return
          void loadBoard('poll')
        }, 300000)
        const onVisible = () => {
          if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
          if (Date.now() - lastSyncRef.current < 300000) return
          if (inFlightRef.current) return
          void loadBoard('poll')
        }
        document.addEventListener('visibilitychange', onVisible)
        return () => {
          clearInterval(interval)
          document.removeEventListener('visibilitychange', onVisible)
        }
      }, [loadBoard])

      useEffect(() => {
        if (!panelOpen) return undefined
        const onKeyDown = (event) => {
          if (event.key !== 'Escape') return
          // The enlarged relations layer sits above the panel: Escape first
          // returns it to the in-panel size, then a second Escape closes panel.
          if (relationsZoomed) setRelationsZoomed(false)
          else setPanelOpen(false)
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [panelOpen, relationsZoomed])

      useEffect(() => {
        if (!adding) return undefined
        if (stripRef.current) {
          stripRef.current.scrollLeft = stripRef.current.scrollWidth
        }
        if (addInputRef.current && typeof addInputRef.current.focus === 'function') {
          addInputRef.current.focus()
        }
        return undefined
      }, [adding])

      const boardGroups = board && Array.isArray(board.groups) ? board.groups : EMPTY
      const boardTasks = board && Array.isArray(board.tasks) ? board.tasks : EMPTY
      const boardIssues = board && Array.isArray(board.issues) ? board.issues : EMPTY

      const issueByNumber = useMemo(() => {
        const map = new Map()
        for (const issue of boardIssues) map.set(issue.number, issue)
        return map
      }, [boardIssues])

      const taskByIssue = useMemo(() => {
        const map = new Map()
        for (const task of boardTasks) {
          if (!map.has(task.issueNumber)) map.set(task.issueNumber, task)
        }
        return map
      }, [boardTasks])

      const groupById = useMemo(() => {
        const map = new Map()
        for (const group of boardGroups) map.set(group.id, group)
        return map
      }, [boardGroups])

      const sortedGroups = useMemo(() => boardGroups.slice().sort((a, b) => (
        a.order - b.order || String(a.name).localeCompare(String(b.name))
      )), [boardGroups])

      const orderedInbox = useMemo(() => (
        boardIssues.filter((issue) => issue.state !== 'CLOSED').sort(compareIssues)
      ), [boardIssues])

      const cardsByGroup = useMemo(() => {
        const map = new Map()
        for (const task of boardTasks) {
          const list = map.get(task.groupId) || []
          list.push({ task, issue: issueByNumber.get(task.issueNumber) || null })
          map.set(task.groupId, list)
        }
        return map
      }, [boardTasks, issueByNumber])

      const repo = board && typeof board.repo === 'string' ? board.repo : ''
      const updatedText = board && toNumber(board.fetchedAt) !== null && board.fetchedAt > 0
        ? tx(t, 'panel.updated') + ' ' + formatRelative(t, board.fetchedAt, now)
        : ''

      let bannerText = null
      if (fetchError !== null) {
        bannerText = fetchError === '' ? t('panel.error') : fetchError
      } else if (hostError !== null && hostError !== '') {
        bannerText = hostError
      }

      // Inbox label filters: every row is an AND clause and the labels picked
      // inside a row are OR alternatives.
      const activateFilters = useCallback((updater) => {
        setLabelFilters((previous) => {
          const next = typeof updater === 'function' ? updater(previous) : updater
          const safe = Array.isArray(next) ? next : previous
          saveLabelFilters(filtersRepoRef.current, safe)
          return safe
        })
      }, [])

      useEffect(() => {
        if (filtersRepoRef.current === repo) return
        filtersRepoRef.current = repo
        setLabelFilters(loadLabelFilters(repo))
        setFilterOpen(false)
        setPickerRow(null)
        setFilterSearch('')
      }, [repo])

      useEffect(() => {
        if (!filterOpen) return undefined
        const close = () => {
          setFilterOpen(false)
          setPickerRow(null)
          setFilterSearch('')
        }
        const onPointerDown = (event) => {
          const target = event.target
          if (typeof Node !== 'undefined' && !(target instanceof Node)) return
          if (filterPanelRef.current && filterPanelRef.current.contains(target)) return
          if (filterButtonRef.current && filterButtonRef.current.contains(target)) return
          close()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') close()
        }
        document.addEventListener('pointerdown', onPointerDown)
        document.addEventListener('keydown', onKeyDown)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown)
          document.removeEventListener('keydown', onKeyDown)
        }
      }, [filterOpen])

      const filteredInbox = useMemo(() => (
        orderedInbox.filter((issue) => matchesLabelFilters(issue, labelFilters))
      ), [orderedInbox, labelFilters])

      const activeFilterRows = labelFilters.filter((row) => Array.isArray(row) && row.length > 0).length

      const labelOptions = useMemo(() => {
        const map = new Map()
        for (const issue of orderedInbox) {
          for (const label of issue.labels) {
            if (!label || typeof label.name !== 'string' || label.name === '') continue
            const previous = map.get(label.name)
            if (previous === undefined) map.set(label.name, { name: label.name, color: label.color || '', count: 1 })
            else previous.count += 1
          }
        }
        return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      }, [orderedInbox])

      const pickerOptions = useMemo(() => {
        const query = filterSearch.trim().toLowerCase()
        if (query === '') return labelOptions
        return labelOptions.filter((option) => option.name.toLowerCase().includes(query))
      }, [labelOptions, filterSearch])

      const toggleFilterLabel = (rowIndex, name) => {
        activateFilters((previous) => {
          const rows = previous.map((row) => (Array.isArray(row) ? row.slice() : []))
          while (rows.length <= rowIndex) rows.push([])
          const row = rows[rowIndex]
          const existing = row.indexOf(name)
          if (existing >= 0) row.splice(existing, 1)
          else row.push(name)
          return rows
        })
      }

      const removeFilterRow = (rowIndex) => {
        activateFilters((previous) => previous.filter((row, index) => index !== rowIndex))
        setPickerRow((current) => {
          if (current === rowIndex) return null
          return current !== null && current > rowIndex ? current - 1 : current
        })
      }

      const addFilterRow = () => {
        if (labelFilters.length >= 6) return
        activateFilters((previous) => [...previous, []])
        setPickerRow(labelFilters.length)
        setFilterSearch('')
      }

      const clearFilters = () => {
        activateFilters([])
        setPickerRow(null)
        setFilterSearch('')
      }

      const openIssue = (number) => {
        if (number === null) return
        if (panelOpen && selected === number) {
          setRelationsZoomed(false)
          setPanelOpen(false)
          return
        }
        setSelected(number)
        setPanelOpen(true)
      }

      const handleCardClick = (number) => {
        if (Date.now() - suppressClickRef.current < 320) return
        openIssue(number)
      }

      const handleDragStart = (event, payload) => {
        suppressClickRef.current = Date.now()
        setDragState(payload)
        setDropTarget(null)
        const transfer = event.dataTransfer
        if (transfer) {
          transfer.effectAllowed = 'move'
          if (typeof transfer.setData === 'function') {
            transfer.setData('text/plain', JSON.stringify(payload))
          }
        }
      }

      const handleDragEnd = () => {
        suppressClickRef.current = Date.now()
        setDragState(null)
        setDropTarget(null)
      }

      const canDrop = (payload, target) => {
        if (!payload) return false
        if (target === 'inbox') return payload.kind === 'task'
        if (target === 'group') return payload.kind === 'issue' || payload.kind === 'task'
        return false
      }

      const handleDragOver = (event, key, target) => {
        if (!canDrop(dragState, target)) return
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
        if (dropTarget !== key) setDropTarget(key)
      }

      const handleDragLeave = (event, key) => {
        const related = event.relatedTarget
        if (typeof Node !== 'undefined' && related instanceof Node && event.currentTarget.contains(related)) return
        setDropTarget((current) => (current === key ? null : current))
      }

      const performAction = async (action) => {
        setActionError(null)
        try {
          await runAction(action)
          return true
        } catch (reason) {
          setActionError(errorMessage(reason, ''))
          return false
        }
      }

      const handleDrop = async (event, target) => {
        event.preventDefault()
        const payload = dragState || readDragPayload(event)
        setDragState(null)
        setDropTarget(null)
        suppressClickRef.current = Date.now()
        if (!payload) return
        if (target.kind === 'inbox') {
          if (payload.kind !== 'task' || typeof payload.taskId !== 'string') return
          await performAction({ action: 'remove', taskId: payload.taskId })
          return
        }
        if (target.kind !== 'group' || typeof target.groupId !== 'string') return
        if (payload.kind === 'issue') {
          const number = toNumber(payload.number)
          if (number === null) return
          const existing = taskByIssue.get(number)
          if (existing && existing.groupId === target.groupId) return
          await performAction({ action: 'assign', issue: number, group: target.groupId })
          return
        }
        if (payload.kind === 'task' && typeof payload.taskId === 'string') {
          if (payload.groupId === target.groupId) return
          await performAction({ action: 'move', taskId: payload.taskId, group: target.groupId })
        }
      }

      const submitAddGroup = async (event) => {
        if (event) event.preventDefault()
        const name = groupDraft.trim()
        if (name === '') return
        if (await performAction({ action: 'addGroup', name })) {
          setGroupDraft('')
          setAdding(false)
        }
      }

      const startRename = (group) => {
        setConfirmDelete(null)
        setRenaming(group.id)
        setRenameDraft(group.name)
      }

      const submitRename = async (group) => {
        const name = renameDraft.trim()
        if (name === '' || name === group.name) {
          setRenaming(null)
          return
        }
        if (await performAction({ action: 'renameGroup', groupId: group.id, name })) {
          setRenaming(null)
        }
      }

      const submitDelete = async (group) => {
        if (await performAction({ action: 'deleteGroup', groupId: group.id })) {
          setConfirmDelete(null)
        }
      }

      const submitRepo = async (event) => {
        if (event) event.preventDefault()
        const repo = (repoDraft || '').trim()
        if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
          setActionError(t('settings.invalid'))
          return
        }
        if (await performAction({ action: 'settings', repo })) {
          setRepoDraft(null)
        }
      }

      const inboxCards = filteredInbox.map((issue) => {
        const task = taskByIssue.get(issue.number) || null
        const group = task !== null ? groupById.get(task.groupId) || null : null
        return h(IssueCard, {
          key: 'inbox-' + issue.number,
          t,
          issue,
          task,
          group,
          dragKind: 'issue',
          active: panelOpen && selected === issue.number,
          dragging: dragState !== null && dragState.kind === 'issue' && dragState.number === issue.number,
          onOpen: handleCardClick,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
        })
      })

      const filterButton = h('button', {
        className: 'gkb-btn',
        type: 'button',
        ref: filterButtonRef,
        'aria-label': t('filter.open'),
        title: activeFilterRows > 0 ? tx(t, 'filter.active', { n: activeFilterRows }) : t('filter.open'),
        onClick: () => {
          setFilterOpen((open) => {
            if (open) {
              setPickerRow(null)
              setFilterSearch('')
            }
            return !open
          })
        },
      },
      h(Glyph, { name: 'filter' }),
      activeFilterRows > 0 ? h('span', { className: 'gkb-filter-count' }, String(activeFilterRows)) : null)

      const filterPanel = filterOpen
        ? h('div', { className: 'gkb-labelfilter', ref: filterPanelRef, role: 'dialog', 'aria-label': t('filter.title') },
          h('div', { className: 'gkb-filter-head' },
            h('span', { className: 'gkb-filter-title' }, t('filter.title')),
            h('span', { className: 'gkb-filter-hint' }, t('filter.hint')),
            h('span', { className: 'gkb-filter-grow' }),
            h(IconButton, {
              icon: 'close',
              label: t('filter.close'),
              title: t('filter.close'),
              onClick: () => {
                setFilterOpen(false)
                setPickerRow(null)
                setFilterSearch('')
              },
            })),
          labelFilters.length === 0
            ? h('div', { className: 'gkb-filter-empty' }, t('filter.empty'))
            : labelFilters.map((row, rowIndex) => h('div', { className: 'gkb-filter-row', key: 'filter-row-' + rowIndex },
              h('div', { className: 'gkb-filter-row-line' },
                h('span', { className: 'gkb-filter-row-index' }, String(rowIndex + 1)),
                h('div', { className: 'gkb-filter-row-labels' },
                  row.length === 0
                    ? h('span', { className: 'gkb-muted' }, t('filter.addLabel'))
                    : row.map((name) => {
                      const option = labelOptions.find((item) => item.name === name) || { name, color: '' }
                      const colour = labelColour(option.color)
                      return h('button', {
                        key: name,
                        className: 'gkb-filter-chip',
                        type: 'button',
                        title: tx(t, 'filter.removeLabel', { name }),
                        onClick: () => toggleFilterLabel(rowIndex, name),
                      },
                      h('span', { className: 'gkb-label-dot', 'aria-hidden': 'true', style: colour !== '' ? { background: colour } : undefined }),
                      h('span', { className: 'gkb-filter-chip-name' }, name),
                      h('span', { className: 'gkb-filter-chip-x', 'aria-hidden': 'true' }, '×'))
                    }),
                  h('button', {
                    className: 'gkb-btn',
                    type: 'button',
                    onClick: () => {
                      setPickerRow(pickerRow === rowIndex ? null : rowIndex)
                      setFilterSearch('')
                    },
                  }, h(Glyph, { name: 'plus' }), h('span', null, t('filter.addLabel')))),
                h(IconButton, {
                  icon: 'trash',
                  label: t('filter.removeRow'),
                  title: t('filter.removeRow'),
                  onClick: () => removeFilterRow(rowIndex),
                })),
              pickerRow === rowIndex
                ? h('div', { className: 'gkb-filter-picker' },
                  h('input', {
                    className: 'gkb-input gkb-filter-search',
                    value: filterSearch,
                    placeholder: t('filter.search'),
                    'aria-label': t('filter.search'),
                    onChange: (event) => setFilterSearch(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key === 'Escape') {
                        event.stopPropagation()
                        setPickerRow(null)
                        setFilterSearch('')
                      }
                    },
                  }),
                  pickerOptions.length === 0
                    ? h('div', { className: 'gkb-filter-empty' }, t('filter.noLabels'))
                    : pickerOptions.map((option) => {
                      const on = row.includes(option.name)
                      const colour = labelColour(option.color)
                      return h('button', {
                        key: option.name,
                        className: 'gkb-label-option',
                        type: 'button',
                        'data-on': on ? 'true' : 'false',
                        'aria-pressed': on ? 'true' : 'false',
                        onClick: () => toggleFilterLabel(rowIndex, option.name),
                      },
                      h('span', { className: 'gkb-label-dot', 'aria-hidden': 'true', style: colour !== '' ? { background: colour } : undefined }),
                      h('span', { className: 'gkb-label-option-name' }, option.name),
                      h('span', { className: 'gkb-label-option-count' }, String(option.count)))
                    }))
                : null)),
          h('div', { className: 'gkb-filter-actions' },
            h('button', {
              className: 'gkb-btn',
              type: 'button',
              disabled: labelFilters.length >= 6,
              onClick: addFilterRow,
            }, h(Glyph, { name: 'plus' }), h('span', null, t('filter.addRow'))),
            h('span', { className: 'gkb-filter-grow' }),
            labelFilters.length > 0
              ? h('button', { className: 'gkb-btn', type: 'button', onClick: clearFilters }, t('filter.clear'))
              : null))
        : null

      const inboxHead = [
        h('span', { className: 'gkb-col-dot', key: 'dot', 'aria-hidden': 'true' }),
        h('span', { className: 'gkb-col-title', key: 'title' }, t('inbox.title')),
        h('span', {
          className: 'gkb-col-count',
          key: 'count',
          title: activeFilterRows > 0 ? t('filter.noMatch') : undefined,
        }, activeFilterRows > 0 ? `${inboxCards.length}/${orderedInbox.length}` : String(inboxCards.length)),
        h('span', { className: 'gkb-col-actions', key: 'actions' },
          filterButton,
          h('button', {
            className: 'gkb-btn',
            type: 'button',
            disabled: refreshing,
            onClick: () => {
              void loadBoard('refresh')
            },
          }, h(Glyph, { name: 'refresh' }), h('span', null, refreshing ? t('panel.refreshing') : t('panel.refresh')))),
      ]

      const inboxColumn = h(Column, {
        key: 'inbox',
        tone: 'inbox',
        head: inboxHead,
        hint: t('inbox.hint'),
        overlay: filterPanel,
        empty: activeFilterRows > 0 ? t('filter.noMatch') : t('panel.empty'),
        over: dropTarget === 'inbox' && canDrop(dragState, 'inbox'),
        onDragOver: (event) => handleDragOver(event, 'inbox', 'inbox'),
        onDragLeave: (event) => handleDragLeave(event, 'inbox'),
        onDrop: (event) => {
          void handleDrop(event, { kind: 'inbox' })
        },
      }, inboxCards)

      const groupColumns = sortedGroups.map((group, groupIndex) => {
        const cards = cardsByGroup.get(group.id) || EMPTY
        const key = 'group:' + group.id
        const head = renaming === group.id
          ? h('form', {
            className: 'gkb-rename',
            key: 'rename',
            onSubmit: (event) => {
              event.preventDefault()
              void submitRename(group)
            },
          },
          h('input', {
            className: 'gkb-input gkb-rename-input',
            value: renameDraft,
            autoFocus: true,
            maxLength: 40,
            'aria-label': t('group.rename'),
            onChange: (event) => setRenameDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setRenaming(null)
              }
            },
          }),
          h('button', {
            className: 'gkb-icon-btn',
            type: 'submit',
            'aria-label': t('settings.save'),
            title: t('settings.save'),
          }, h(Glyph, { name: 'check' })),
          h(IconButton, {
            icon: 'close',
            label: t('settings.cancel'),
            onClick: () => setRenaming(null),
          }))
          : confirmDelete === group.id
            ? [
              h('span', { className: 'gkb-col-title', key: 'ask' }, t('group.deleteConfirm')),
              h('span', { className: 'gkb-col-actions', key: 'confirm' },
                h('button', {
                  className: 'gkb-btn',
                  type: 'button',
                  onClick: () => {
                    void submitDelete(group)
                  },
                }, t('group.delete')),
                h('button', {
                  className: 'gkb-btn',
                  type: 'button',
                  onClick: () => setConfirmDelete(null),
                }, t('settings.cancel'))),
            ]
            : [
              h('span', {
                className: 'gkb-col-dot',
                key: 'dot',
                'aria-hidden': 'true',
                style: { background: GROUP_COLOURS[groupIndex % GROUP_COLOURS.length] },
              }),
              h('span', { className: 'gkb-col-title', key: 'title', title: group.name }, group.name),
              h('span', { className: 'gkb-col-count', key: 'count' }, String(cards.length)),
              h('span', { className: 'gkb-col-actions', key: 'actions' },
                h(IconButton, {
                  icon: 'pencil',
                  label: t('group.rename'),
                  onClick: () => startRename(group),
                }),
                h(IconButton, {
                  icon: 'trash',
                  label: t('group.delete'),
                  onClick: () => {
                    setRenaming(null)
                    setConfirmDelete(group.id)
                  },
                })),
            ]
        return h(Column, {
          key: group.id,
          tone: 'group',
          head,
          empty: t('group.empty'),
          over: dropTarget === key && canDrop(dragState, 'group'),
          onDragOver: (event) => handleDragOver(event, key, 'group'),
          onDragLeave: (event) => handleDragLeave(event, key),
          onDrop: (event) => {
            void handleDrop(event, { kind: 'group', groupId: group.id })
          },
        }, cards.map((card) => h(IssueCard, {
          key: card.task.id,
          t,
          issue: card.issue || {
            number: card.task.issueNumber,
            title: '',
            state: 'OPEN',
            labels: [],
            assignees: [],
            milestone: '',
          },
          task: card.task,
          group,
          dragKind: 'task',
          active: panelOpen && selected === card.task.issueNumber,
          dragging: dragState !== null && dragState.kind === 'task' && dragState.taskId === card.task.id,
          onOpen: handleCardClick,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
        })))
      })

      const addTile = h('section', { className: 'gkb-add-col', key: 'add-group' },
        adding
          ? h('form', {
            className: 'gkb-add-form',
            onSubmit: (event) => {
              event.preventDefault()
              void submitAddGroup(event)
            },
          },
          h('input', {
            ref: addInputRef,
            className: 'gkb-input gkb-add-input',
            value: groupDraft,
            placeholder: t('group.namePlaceholder'),
            'aria-label': t('group.new'),
            maxLength: 40,
            onChange: (event) => setGroupDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.stopPropagation()
                setGroupDraft('')
                setAdding(false)
              }
            },
          }),
          h('div', { className: 'gkb-add-actions' },
            h('button', {
              className: 'gkb-btn gkb-btn-primary',
              type: 'submit',
              disabled: groupDraft.trim() === '',
            }, t('group.add')),
            h('button', {
              className: 'gkb-btn',
              type: 'button',
              onClick: () => {
                setGroupDraft('')
                setAdding(false)
              },
            }, t('settings.cancel'))))
          : h('button', {
            className: 'gkb-add-btn',
            type: 'button',
            onClick: () => {
              setGroupDraft('')
              setAdding(true)
            },
          }, h(Glyph, { name: 'plus' }), h('span', null, t('group.new'))))

      const scope = board && typeof board.scope === 'string' ? board.scope : 'mine'
      const scopeChip = h('button', {
        className: 'gkb-chip',
        type: 'button',
        title: t('scope.title'),
        'aria-label': t('scope.title'),
        onClick: () => {
          void runAction({ action: 'filter', scope: scope === 'mine' ? 'all' : 'mine' })
            .catch((reason) => setActionError(errorMessage(reason, '')))
        },
      },
      h('span', { className: 'gkb-chip-text' }, scope === 'mine' ? t('scope.mine') : t('scope.all')))
      const header = h('header', { className: 'gkb-header' },
        h('h1', { className: 'gkb-title' }, t('panel.title')),
        repoDraft === null
          ? h('button', {
            className: 'gkb-chip',
            type: 'button',
            title: t('settings.repo'),
            onClick: () => setRepoDraft(repo),
          },
          h('span', { className: 'gkb-chip-dot', 'aria-hidden': 'true' }),
          h('span', { className: 'gkb-chip-text' }, repo !== '' ? repo : t('panel.repo')))
          : h('form', {
            className: 'gkb-repo-form',
            onSubmit: (event) => {
              event.preventDefault()
              void submitRepo(event)
            },
          },
          h('input', {
            className: 'gkb-input gkb-repo-input',
            value: repoDraft,
            autoFocus: true,
            placeholder: 'owner/name',
            'aria-label': t('settings.repo'),
            onChange: (event) => setRepoDraft(event.target.value),
            onKeyDown: (event) => {
              if (event.key === 'Escape') setRepoDraft(null)
            },
          }),
          h('button', {
            className: 'gkb-btn gkb-btn-primary',
            type: 'submit',
          }, t('settings.save')),
          h('button', {
            className: 'gkb-btn',
            type: 'button',
            onClick: () => setRepoDraft(null),
          }, t('settings.cancel'))),
        scopeChip,
        updatedText !== '' ? h('span', { className: 'gkb-muted' }, updatedText) : null,
        h('span', { className: 'gkb-spacer' }),
        h('button', {
          className: 'gkb-btn',
          type: 'button',
          onClick: () => {
            setGroupDraft('')
            setAdding(true)
          },
        }, h(Glyph, { name: 'plus' }), h('span', null, t('group.new'))),
        h('button', {
          className: 'gkb-btn',
          type: 'button',
          disabled: refreshing,
          onClick: () => {
            void loadBoard('refresh')
          },
        }, h(Glyph, { name: 'refresh' }),
        h('span', null, refreshing ? t('panel.refreshing') : t('panel.refresh'))))

      const errorBanner = bannerText === null
        ? null
        : h('div', { className: 'gkb-banner gkb-banner-error', role: 'alert' },
          h('span', { className: 'gkb-banner-title' }, t('panel.error')),
          h('span', { className: 'gkb-banner-text', title: bannerText }, bannerText),
          h('button', {
            className: 'gkb-btn',
            type: 'button',
            onClick: () => {
              void loadBoard('refresh')
            },
          }, t('panel.retry')))

      const actionBanner = actionError === null
        ? null
        : h('div', { className: 'gkb-banner gkb-banner-warn', role: 'status' },
          h('span', { className: 'gkb-banner-title' }, t('action.failed')),
          h('span', { className: 'gkb-banner-text', title: actionError },
            actionError === '' ? t('action.failed') : actionError),
          h(IconButton, {
            icon: 'close',
            label: t('action.dismiss'),
            onClick: () => setActionError(null),
          }))

      const boardContent = loading && board === null
        ? h('div', { className: 'gkb-loading' }, t('panel.loading'))
        : h('div', { className: 'gkb-strip', ref: stripRef },
          inboxColumn,
          groupColumns,
          addTile)

      return h('div', { className: 'gkb-root', 'data-scheme': scheme },
        h('style', null, CSS),
        header,
        errorBanner,
        actionBanner,
        h('div', { className: 'gkb-board' },
          boardContent,
          h(DetailPanel, {
            t,
            number: selected,
            open: panelOpen,
            issue: selected === null ? null : issueByNumber.get(selected) || null,
            task: selected === null ? null : taskByIssue.get(selected) || null,
            groups: sortedGroups,
            tasks: boardTasks,
            repo,
            runAction,
            relationsZoomed,
            onZoomRelations: (next) => setRelationsZoomed(next === true),
            onClose: () => {
              setRelationsZoomed(false)
              setPanelOpen(false)
            },
            onSelectIssue: openIssue,
          })))
    }

    // ------------------------------------------------------------------
    // Error boundary so a render bug can never take the slot down
    // ------------------------------------------------------------------

    class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props)
        this.state = { failed: false }
      }

      static getDerivedStateFromError() {
        return { failed: true }
      }

      render() {
        if (this.state.failed) return this.props.fallback || null
        return this.props.children
      }
    }

    function BoardPage(props) {
      const t = resolveT(props)
      return h(ErrorBoundary, {
        fallback: h('div', {
          style: {
            padding: '16px',
            fontSize: '12px',
            color: 'var(--dsw-alias-label-secondary)',
          },
        }, t('error.boundary')),
      }, h(BoardView, props))
    }

    // ------------------------------------------------------------------
    // Plugin entry
    // ------------------------------------------------------------------

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh: ZH, en: EN }), 'github-kanban: dictionaries')
        // The theme service reports the resolved light/dark palette; the OS
        // media query is only a fallback when the service is unavailable.
        try {
          const theme = typeof ctx.get === 'function' ? ctx.get('theme') : undefined
          activeScheme = theme && typeof theme.getTheme === 'function'
            ? schemeFromSnapshot(theme.getTheme())
            : detectScheme()
          if (typeof ctx.on === 'function') {
            ctx.on('theme/change', (snapshot) => setActiveScheme(schemeFromSnapshot(snapshot)))
          }
        } catch (reason) {
          activeScheme = detectScheme()
        }
        const t = ctx.locale.bind(NS)
        fallbackT = t
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: PANEL_ID,
          locale: NS,
        }, BoardPage))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: PANEL_ID,
          order: 20,
          locale: NS,
          label: () => t('panel.label'),
        }, KanbanIcon))
        // Track which Session the conversation panel is showing and tell the
        // Host. That Session's project decides the board's default repository;
        // a project without a GitHub origin leaves the board's repo untouched.
        try {
          ctx.inject(['sessions'], (owner) => {
            let disposed = false
            const readShowing = () => {
              if (disposed) return
              try {
                const snapshot = owner.sessions.list.getSnapshot()
                const rows = snapshot && snapshot.byId ? snapshot.byId : null
                if (rows === null) return
                for (const id of Object.keys(rows)) {
                  const row = rows[id]
                  if (row && row.retainedBy && (row.retainedBy.mainView ?? 0) > 0) {
                    reportActiveSession(id)
                    return
                  }
                }
              } catch (reason) {
                // The session catalog is optional context; never break the board for it.
              }
            }
            const unsubscribe = owner.sessions.list.subscribe(readShowing)
            owner.effect(() => () => {
              disposed = true
              unsubscribe()
            })
            readShowing()
          })
        } catch (reason) {
          // Without the session service the board simply keeps its saved repo.
        }
      },
    }
  },
})
