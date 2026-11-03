import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
export const inject = ['tools']
const ROUTE = '/github-kanban/api'
const STATE_FILE = 'github-kanban.state.json'
const CACHE_FILE = 'github-kanban.cache.json'
const DEFAULT_REPO = ''
const REPO_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/
const CACHE_VERSION = 4
const CACHE_TTL_MS = 300_000
const RELATION_TTL_MS = 60_000
const LOGIN_TTL_MS = 3_600_000
const GH_TIMEOUT_MS = 25_000
const GIT_TIMEOUT_MS = 4_000
const SESSION_REPO_TTL_MS = 60_000
const LINKED_TTL_MS = 30_000
const LINKED_BODY_LIMIT = 12_000
const LINKED_COMMENT_LIMIT = 20
const LINKED_COMMENT_BODY_LIMIT = 4_000
const LINKED_ISSUE_LIMIT = 3
const OPEN_STATE_QUERY = 'state=open'
const SCOPE_MINE = 'mine'
const SCOPE_ALL = 'all'
const FETCH_BUDGET_MS = 20_000
const STALE_WAIT_MS = 2_500
const BOARD_WAIT_MS = 30_000
const TOOL_WAIT_MS = 8_000
const MAX_BODY_BYTES = 1024 * 1024
const MAX_NEIGHBOURS = 12
const BODY_EXCERPT_LENGTH = 600
const REFERENCE_WINDOW = 60
const DEFAULT_GROUPS = [
  { id: 'backlog', name: '待办', order: 0 },
  { id: 'doing', name: '进行中', order: 1 },
  { id: 'wrapup', name: '待完结', order: 2 },
  { id: 'icebox', name: '积压', order: 3 },
]
// The previous default column set. States created by it are migrated once
// (已完成 → 待完结, 积压 added) instead of being kept forever.
const LEGACY_DEFAULT_GROUPS = [
  { id: 'backlog', name: '待办' },
  { id: 'doing', name: '进行中' },
  { id: 'done', name: '已完成' },
]
const STATE_VERSION = 2
const isLegacyDefaultGroups = (groups) => Array.isArray(groups)
  && groups.length === LEGACY_DEFAULT_GROUPS.length
  && groups.every((group, index) => group.id === LEGACY_DEFAULT_GROUPS[index].id && group.name === LEGACY_DEFAULT_GROUPS[index].name)
const KIND_LABEL = { parent: '父子', blocks: '阻塞', relates: '关联' }
const KIND_PRIORITY = { parent: 3, blocks: 2, relates: 1 }
const ROLE_PRIORITY = { parent: 5, child: 4, blocker: 3, blocked: 2, related: 1 }
const DEPENDENCY_KEYWORDS = ['blocked by', 'depends on', '依赖', '阻塞']
const PARENT_KEYWORDS = ['parent', '父', '上级']
const CHILD_KEYWORDS = ['child', '子任务', '子 issue']
const NULLABLE_STRING = { oneOf: [{ type: 'string' }, { type: 'null' }] }
const NULLABLE_NUMBER = { oneOf: [{ type: 'number' }, { type: 'null' }] }
const ISSUE_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    number: { type: 'integer' }, title: { type: 'string' }, url: { type: 'string' }, state: { type: 'string' },
    labels: { type: 'array', items: { type: 'string' } }, bodyExcerpt: { type: 'string' },
  },
  required: ['number', 'title', 'url', 'state', 'labels', 'bodyExcerpt'],
  additionalProperties: false,
}
const BOARD_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    repo: { type: 'string', description: '仓库 owner/name' },
    scope: { type: 'string', enum: [SCOPE_MINE, SCOPE_ALL], description: '当前看板范围：mine 只看我创建/指派给我的 issue，all 看全部未关闭 issue' },
    groups: {
      type: 'array', description: 'DSH 待办分组（按显示顺序）',
      items: {
        type: 'object', additionalProperties: false,
        properties: { id: { type: 'string' }, name: { type: 'string' }, tasks: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { issueNumber: { type: 'integer' }, title: { type: 'string' }, claimedBy: NULLABLE_STRING }, required: ['issueNumber', 'title', 'claimedBy'] } } },
        required: ['id', 'name', 'tasks'],
      },
    },
    inbox: {
      type: 'object', additionalProperties: false,
      properties: { total: { type: 'integer', description: '缓存中的 issue 总数' }, open: { type: 'integer' }, recent: { type: 'array', description: '最近更新的 issue（最多 5 个）', items: { type: 'object', additionalProperties: false, properties: { number: { type: 'integer' }, title: { type: 'string' } }, required: ['number', 'title'] } } },
      required: ['total', 'open', 'recent'],
    },
  },
  required: ['repo', 'scope', 'groups', 'inbox'],
  additionalProperties: false,
}
let warn = () => {}
let ghBinary = ''
const profileDir = () => process.env.DSH_PROFILE_DIR ?? process.env.DSH_HOME ?? path.join(os.homedir(), '.dsh')
const statePath = () => path.join(profileDir(), STATE_FILE)
const cachePath = () => path.join(profileDir(), CACHE_FILE)
const describeError = (error) => (error instanceof Error ? error.message : typeof error === 'string' ? error : String(error))
const httpError = (message, status) => Object.assign(new Error(message), { status })
const delay = (milliseconds) => new Promise((resolve) => {
  const timer = setTimeout(resolve, milliseconds)
  timer.unref?.()
})
const clampInt = (value, min, max, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback
}
const createId = (prefix) => `${prefix}${typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`}`
const clip = (text, limit) => (typeof text !== 'string' ? '' : text.length > limit ? `${text.slice(0, limit)}…` : text)
const defaultGroups = () => DEFAULT_GROUPS.map((group) => ({ ...group }))
const emptyCache = (repo, error = null) => ({ repo, fetchedAt: 0, issues: [], bodies: new Map(), truncated: false, error, login: null })
const normalizeScope = (value) => (value === SCOPE_ALL ? SCOPE_ALL : value === SCOPE_MINE ? SCOPE_MINE : null)
const isCachedIssue = (value) => value !== null && typeof value === 'object' && Number.isInteger(value.number) && typeof value.title === 'string' && Array.isArray(value.labels) && Array.isArray(value.assignees)
const normalizeRepo = (value) => {
  if (typeof value !== 'string') return null
  const repo = value.trim()
  return REPO_PATTERN.test(repo) ? repo : null
}
function normalizeGroups(raw) {
  if (!Array.isArray(raw)) return []
  const groups = []
  const usedIds = new Set()
  const usedNames = new Set()
  for (const item of raw) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    const name = typeof item?.name === 'string' ? item.name.trim() : ''
    if (id === '' || name === '' || usedIds.has(id) || usedNames.has(name)) continue
    usedIds.add(id)
    usedNames.add(name)
    groups.push({ id, name, order: Number.isFinite(Number(item.order)) ? Number(item.order) : groups.length })
  }
  return groups.sort((left, right) => left.order - right.order)
}
function normalizeTasks(raw, groups, fallbackRepo) {
  if (!Array.isArray(raw) || groups.length === 0) return []
  const groupIds = new Set(groups.map((group) => group.id))
  const tasks = []
  const usedIds = new Set()
  const usedIssues = new Set()
  for (const item of raw) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    const issueNumber = Number(item?.issueNumber)
    if (id === '' || usedIds.has(id) || !Number.isInteger(issueNumber) || issueNumber <= 0 || usedIssues.has(issueNumber)) continue
    usedIds.add(id)
    usedIssues.add(issueNumber)
    const claimedBy = item.claimedBy === 'agent' || item.claimedBy === 'user' ? item.claimedBy : null
    const claimedAt = claimedBy !== null && item.claimedAt !== null && Number.isFinite(Number(item.claimedAt)) ? Number(item.claimedAt) : null
    // Tasks belong to the repository they were dragged from; switching the
    // board's repository (last-chat project follow) must not leak another
    // project's todo cards into the new board.
    const taskRepo = typeof item.repo === 'string' && REPO_PATTERN.test(item.repo) ? item.repo : fallbackRepo
    tasks.push({ id, issueNumber, groupId: groupIds.has(item.groupId) ? item.groupId : groups[0].id, repo: taskRepo, createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : 0, claimedAt, claimedBy })
  }
  return tasks
}
function buildState(raw, fallbackRepo, fallbackScope) {
  // `scope: 'mine'` is the default board view: only issues the signed-in
  // GitHub user created or is assigned to.
  const state = { version: STATE_VERSION, repo: fallbackRepo, scope: fallbackScope ?? SCOPE_MINE, activeSessionId: null, groups: defaultGroups(), tasks: [] }
  if (raw !== null && typeof raw === 'object') {
    state.repo = normalizeRepo(raw.repo) ?? fallbackRepo
    state.scope = normalizeScope(raw.scope) ?? state.scope
    if (typeof raw.activeSessionId === 'string' && raw.activeSessionId !== '') state.activeSessionId = raw.activeSessionId
    const groups = normalizeGroups(raw.groups)
    if (groups.length > 0) state.groups = groups
    state.tasks = normalizeTasks(raw.tasks, state.groups, state.repo)
    if (isLegacyDefaultGroups(state.groups)) {
      state.groups = defaultGroups()
      for (const task of state.tasks) if (task.groupId === 'done') task.groupId = 'wrapup'
    }
  }
  return state
}
function readStateFile() {
  try {
    return { value: JSON.parse(fs.readFileSync(statePath(), 'utf8')), error: null }
  } catch (error) {
    if (error !== null && typeof error === 'object' && error.code === 'ENOENT') return { value: null, error: null }
    return { value: null, error }
  }
}
function writeAtomic(file, text) {
  const temp = `${file}.${process.pid}.tmp`
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(temp, text, 'utf8')
    fs.renameSync(temp, file)
    return true
  } catch (error) {
    warn(`写入 ${path.basename(file)} 失败（改动只保留在内存中）：${describeError(error)}`)
    try {
      fs.unlinkSync(temp)
    } catch (cleanupError) {
      warn(`清理临时文件失败：${describeError(cleanupError)}`)
    }
    return false
  }
}
const writeStateFile = (state) => writeAtomic(statePath(), `${JSON.stringify(state, null, 2)}\n`)
function readDiskCache(repo) {
  let parsed
  try {
    parsed = JSON.parse(fs.readFileSync(cachePath(), 'utf8'))
  } catch (error) {
    if (error === null || typeof error !== 'object' || error.code !== 'ENOENT') warn(`读取看板缓存失败（忽略）：${describeError(error)}`)
    return null
  }
  if (parsed === null || typeof parsed !== 'object' || parsed.repo !== repo || !Array.isArray(parsed.issues)) return null
  // Version bump: older caches lack the `mine` flags and viewer login the
  // "my issues" scope needs, or held closed issues; discard and refetch.
  if (parsed.version !== CACHE_VERSION) return null
  const issues = parsed.issues.filter(isCachedIssue).filter((issue) => issue.state !== 'CLOSED')
  if (issues.length === 0) return null
  const bodies = new Map()
  // v4 caches keep the full bodies (bounded) so relation text-scanning and the
  // detail Markdown renderer survive a restart; older caches only had excerpts.
  if (Array.isArray(parsed.bodies)) {
    for (const entry of parsed.bodies) {
      if (!Array.isArray(entry) || entry.length < 2) continue
      const number = Number(entry[0])
      if (Number.isInteger(number) && typeof entry[1] === 'string' && entry[1] !== '') bodies.set(number, entry[1])
    }
  }
  for (const issue of issues) {
    if (bodies.has(issue.number)) continue
    if (typeof issue.bodyExcerpt === 'string' && issue.bodyExcerpt !== '') bodies.set(issue.number, issue.bodyExcerpt)
  }
  const login = typeof parsed.login === 'string' && parsed.login !== '' ? parsed.login : null
  return { repo, fetchedAt: Number(parsed.fetchedAt) || 0, issues, bodies, truncated: parsed.truncated === true, error: null, login }
}
function removeDiskCache() {
  try {
    fs.unlinkSync(cachePath())
  } catch (error) {
    if (error === null || typeof error !== 'object' || error.code !== 'ENOENT') warn(`删除看板缓存失败（忽略）：${describeError(error)}`)
  }
}
function isExecutable(file) {
  try {
    fs.accessSync(file, fs.constants.X_OK)
    return true
  } catch (error) {
    void error
    return false
  }
}
function findOnPath(name) {
  for (const directory of ['/opt/homebrew/bin', '/usr/local/bin', ...(process.env.PATH ?? '').split(path.delimiter)]) {
    if (directory !== '' && isExecutable(path.join(directory, name))) return path.join(directory, name)
  }
  return ''
}
function resolveGhBin() {
  if (ghBinary !== '') return ghBinary
  const candidates = []
  if (typeof process.env.GH_BIN === 'string' && process.env.GH_BIN.trim() !== '') candidates.push(process.env.GH_BIN.trim())
  for (const candidate of [...candidates, 'gh', '/opt/homebrew/bin/gh', '/usr/local/bin/gh', path.join(os.homedir(), '.local/bin/gh')]) {
    if (candidate === 'gh') {
      const found = findOnPath('gh')
      if (found === '') continue
      ghBinary = found
      return ghBinary
    }
    if (isExecutable(candidate)) {
      ghBinary = candidate
      return ghBinary
    }
  }
  return ''
}
function runGh(args) {
  return new Promise((resolve, reject) => {
    const binary = resolveGhBin()
    if (binary === '') {
      reject(new Error('找不到 gh CLI，请先安装 GitHub CLI 或设置 GH_BIN'))
      return
    }
    const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH ?? ''}` }
    execFile(binary, args, { timeout: GH_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024, env }, (error, stdout, stderr) => {
      if (error === null || error === undefined) {
        resolve(stdout)
        return
      }
      if (error.code === 'ENOENT') return reject(new Error(`找不到 gh 可执行文件（${binary}）`))
      if (error.killed === true || error.signal === 'SIGTERM') return reject(new Error(`gh 命令超过 ${GH_TIMEOUT_MS / 1000} 秒未返回`))
      const detail = typeof stderr === 'string' ? stderr.trim() : ''
      reject(new Error(detail !== '' ? detail : describeError(error)))
    })
  })
}
async function ghJson(args) {
  const stdout = await runGh(args)
  const text = typeof stdout === 'string' ? stdout.trim() : ''
  if (text === '') return null
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`gh 返回了无法解析的 JSON：${describeError(error)}`)
  }
}
function excerptOf(body) {
  if (typeof body !== 'string' || body === '') return ''
  const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.length > BODY_EXCERPT_LENGTH ? normalized.slice(0, BODY_EXCERPT_LENGTH) : normalized
}
function normalizeIssue(raw, repo) {
  const number = Number(raw?.number)
  if (!Number.isInteger(number) || number <= 0) return null
  const labels = (Array.isArray(raw.labels) ? raw.labels : [])
    .filter((label) => typeof label?.name === 'string')
    .map((label) => ({ name: label.name, color: typeof label.color === 'string' ? label.color : '' }))
  const assignees = (Array.isArray(raw.assignees) ? raw.assignees : [])
    .map((assignee) => (typeof assignee === 'string' ? assignee : typeof assignee?.login === 'string' ? assignee.login : ''))
    .filter((login) => login !== '')
  const summary = typeof raw.sub_issues_summary === 'object' ? raw.sub_issues_summary : null
  return {
    number,
    title: typeof raw.title === 'string' ? raw.title : '',
    state: String(raw.state ?? '').toUpperCase() === 'CLOSED' ? 'CLOSED' : 'OPEN',
    url: typeof raw.html_url === 'string' && raw.html_url !== '' ? raw.html_url : `https://github.com/${repo}/issues/${number}`,
    author: typeof raw.user?.login === 'string' ? raw.user.login : '',
    labels,
    assignees,
    comments: Number.isFinite(Number(raw.comments)) ? Number(raw.comments) : 0,
    createdAt: typeof raw.created_at === 'string' ? raw.created_at : null,
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    closedAt: typeof raw.closed_at === 'string' ? raw.closed_at : null,
    milestone: typeof raw.milestone?.title === 'string' ? raw.milestone.title : null,
    bodyExcerpt: excerptOf(raw.body),
    subIssues: { total: Number(summary?.total) || 0, completed: Number(summary?.completed) || 0 },
  }
}
async function fetchIssues(repo, limit, bodies) {
  const startedAt = Date.now()
  const pages = Math.max(1, Math.ceil(limit / 100))
  const issues = []
  let truncated = false
  for (let page = 1; page <= pages; page += 1) {
    // The board shows unclosed issues only; ask GitHub for just those so the
    // cache and every relation scan stay focused on actionable work.
    const raw = await ghJson(['api', `repos/${repo}/issues?${OPEN_STATE_QUERY}&per_page=100&sort=updated&direction=desc&page=${page}`])
    if (!Array.isArray(raw)) throw new Error('GitHub 返回的 issue 列表格式不正确')
    for (const item of raw) {
      if (item === null || typeof item !== 'object' || item.pull_request !== undefined) continue
      const issue = normalizeIssue(item, repo)
      if (issue === null || issue.state === 'CLOSED') continue
      issues.push(issue)
      if (typeof item.body === 'string' && item.body !== '') bodies.set(issue.number, item.body)
      if (issues.length >= limit) break
    }
    if (issues.length >= limit) {
      truncated = true
      break
    }
    if (raw.length < 100) break
    if (Date.now() - startedAt > FETCH_BUDGET_MS) {
      truncated = true
      break
    }
  }
  return { issues, truncated }
}
function nodeFromRaw(raw, repo) {
  const number = Number(raw?.number)
  if (!Number.isInteger(number) || number <= 0) return null
  const labels = (Array.isArray(raw.labels) ? raw.labels : [])
    .map((label) => (typeof label === 'string' ? label : typeof label?.name === 'string' ? label.name : ''))
    .filter((name) => name !== '')
  return {
    number,
    title: typeof raw.title === 'string' ? raw.title : '',
    state: String(raw.state ?? '').toUpperCase() === 'CLOSED' ? 'CLOSED' : 'OPEN',
    url: typeof raw.html_url === 'string' && raw.html_url !== '' ? raw.html_url : `https://github.com/${repo}/issues/${number}`,
    labels,
  }
}
const nodeFromCache = (issue) => ({ number: issue.number, title: issue.title, state: issue.state, url: issue.url, labels: issue.labels.map((label) => label.name) })
const taskView = (task) => ({ id: task.id, issueNumber: task.issueNumber, groupId: task.groupId, claimedAt: task.claimedAt, claimedBy: task.claimedBy })
function classifyReference(text, index) {
  const lower = text.toLowerCase()
  const start = Math.max(0, index - REFERENCE_WINDOW)
  const windowText = lower.slice(start, Math.min(lower.length, index + REFERENCE_WINDOW))
  let best = 'relates'
  let bestDistance = Number.POSITIVE_INFINITY
  const consider = (keywords, kind) => {
    for (const keyword of keywords) {
      let found = windowText.indexOf(keyword)
      while (found !== -1) {
        const distance = Math.abs(start + found - index)
        if (distance < bestDistance) {
          bestDistance = distance
          best = kind
        }
        found = windowText.indexOf(keyword, found + 1)
      }
    }
  }
  consider(DEPENDENCY_KEYWORDS, 'blocks')
  consider(PARENT_KEYWORDS, 'parent')
  consider(CHILD_KEYWORDS, 'child')
  return best
}
function textReferences(text) {
  const references = []
  if (typeof text !== 'string' || text === '') return references
  const pattern = /#(\d+)/g
  let match = pattern.exec(text)
  while (match !== null) {
    const number = Number(match[1])
    if (Number.isInteger(number) && number > 0) references.push({ number, kind: classifyReference(text, match.index) })
    match = pattern.exec(text)
  }
  return references
}
function appendReference(edges, fromNumber, toNumber, kind) {
  if (fromNumber !== toNumber) edges.push({ from: fromNumber, to: toNumber, kind })
}
function roleOf(number, focus, edges) {
  if (number === focus) return 'focus'
  let role = 'related'
  let best = 0
  const consider = (candidate) => {
    const priority = ROLE_PRIORITY[candidate] ?? 0
    if (priority > best) {
      best = priority
      role = candidate
    }
  }
  for (const edge of edges) {
    if (edge.from === focus && edge.to === number) consider(edge.kind === 'parent' ? 'child' : edge.kind === 'blocks' ? 'blocked' : 'related')
    else if (edge.to === focus && edge.from === number) consider(edge.kind === 'parent' ? 'parent' : edge.kind === 'blocks' ? 'blocker' : 'related')
  }
  return role
}
function assembleGraph(focus, focusNode, nodes, edges) {
  const pairs = new Map()
  for (const edge of edges) {
    if (edge.from !== focus && edge.to !== focus) continue
    if (!nodes.has(edge.from) || !nodes.has(edge.to)) continue
    // Sub-issue relations and text references can report the same pair in both
    // directions (a child body links back to its parent while the parent's
    // sub-issue list already gave parent → child). Collapse per unordered pair,
    // keeping the first direction — API-derived edges are pushed before text
    // references — and upgrading to the stronger kind.
    const key = `${Math.min(edge.from, edge.to)}|${Math.max(edge.from, edge.to)}`
    const previous = pairs.get(key)
    if (previous === undefined || (KIND_PRIORITY[edge.kind] ?? 0) > (KIND_PRIORITY[previous.kind] ?? 0)) pairs.set(key, { from: edge.from, to: edge.to, kind: edge.kind })
  }
  const keptEdges = [...pairs.values()]
  const neighbours = new Set()
  for (const edge of keptEdges) {
    if (edge.from !== focus) neighbours.add(edge.from)
    if (edge.to !== focus) neighbours.add(edge.to)
  }
  const ordered = [...neighbours].sort((left, right) => {
    const leftRole = ROLE_PRIORITY[roleOf(left, focus, keptEdges)] ?? 0
    const rightRole = ROLE_PRIORITY[roleOf(right, focus, keptEdges)] ?? 0
    return rightRole - leftRole || left - right
  })
  const kept = new Set([focus, ...ordered.slice(0, MAX_NEIGHBOURS)])
  const finalEdges = keptEdges.filter((edge) => kept.has(edge.from) && kept.has(edge.to)).map((edge) => ({ ...edge, label: KIND_LABEL[edge.kind] ?? KIND_LABEL.relates }))
  const graphNodes = [{ ...focusNode, role: 'focus' }]
  for (const number of ordered) if (kept.has(number)) graphNodes.push({ ...nodes.get(number), role: roleOf(number, focus, finalEdges) })
  return { focus, nodes: graphNodes, edges: finalEdges, truncated: ordered.length > MAX_NEIGHBOURS }
}
function boardViewOf(state, cache) {
  const all = cache.repo === state.repo ? cache.issues : []
  // Same ownership rule as the HTTP board: only the signed-in user's issues
  // unless the board scope is `all` (or the login is unknown).
  const issues = state.scope === SCOPE_MINE && typeof cache.login === 'string' && cache.login !== ''
    ? all.filter((issue) => issue.mine === true)
    : all
  const byNumber = new Map(all.map((issue) => [issue.number, issue]))
  const groups = state.groups.map((group) => ({
    id: group.id,
    name: group.name,
    tasks: state.tasks.filter((task) => task.repo === state.repo && task.groupId === group.id).map((task) => ({ issueNumber: task.issueNumber, title: byNumber.get(task.issueNumber)?.title ?? '', claimedBy: task.claimedBy })),
  }))
  const recent = issues.slice(0, 5).map((issue) => ({ number: issue.number, title: issue.title }))
  return { repo: state.repo, scope: state.scope, groups, inbox: { total: issues.length, open: issues.filter((issue) => issue.state === 'OPEN').length, recent } }
}
function renderBoard(view) {
  const scopeText = view.scope === SCOPE_ALL ? '全部 issue' : '我的 issue（创建或指派给我）'
  const repoText = view.repo === '' ? '未选择仓库' : view.repo
  const lines = [`看板 · ${repoText} · ${scopeText}`]
  for (const group of view.groups) {
    const tasks = group.tasks.map((task) => `#${task.issueNumber} ${clip(task.title, 60)}${task.claimedBy === null ? '' : task.claimedBy === 'agent' ? '（Agent 已领取）' : '（已领取）'}`)
    const shown = tasks.length === 0 ? '（空）' : `${tasks.slice(0, 6).join('；')}${tasks.length > 6 ? `；…等 ${tasks.length} 个` : ''}`
    lines.push(`${group.name}（${group.tasks.length}）：${shown}`)
  }
  const inbox = view.inbox
  const recent = inbox.recent.length === 0 ? '' : `；最近：${inbox.recent.map((issue) => `#${issue.number} ${clip(issue.title, 50)}`).join('，')}`
  lines.push(`收件箱：共 ${inbox.total} 个 issue，其中 ${inbox.open} 个 open${recent}`)
  return lines.join('\n')
}
function sendJson(response, status, body) {
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.setHeader('cache-control', 'no-store')
  response.end(JSON.stringify(body))
}
async function readJsonBody(request) {
  const chunks = []
  let total = 0
  for await (const chunk of request) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw httpError('请求体过大', 413)
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  if (raw.trim() === '') return {}
  try {
    return JSON.parse(raw)
  } catch (error) {
    throw httpError(`请求体不是合法 JSON：${describeError(error)}`, 400)
  }
}
export function apply(ctx, config) {
  warn = (message) => {
    try {
      ctx.logger?.warn?.(`[github-kanban] ${message}`)
    } catch (error) {
      void error
    }
  }
  const fallbackRepo = normalizeRepo(config?.repo) ?? DEFAULT_REPO
  const issuesLimit = clampInt(config?.issuesLimit, 50, 1000, 300)
  const loaded = readStateFile()
  if (loaded.error !== null) warn(`读取看板状态失败，使用默认分组：${describeError(loaded.error)}`)
  const state = buildState(loaded.value, fallbackRepo, normalizeScope(config?.scope) ?? SCOPE_MINE)
  // Persist the default-group migration once so the new four columns survive
  // the next load even if the user changes nothing else.
  if (loaded.value !== null && Number(loaded.value.version ?? 1) < STATE_VERSION) writeStateFile(state)
  let issueCache = readDiskCache(state.repo) ?? emptyCache(state.repo)
  let viewerLoginCache = { login: null, at: 0 }
  const relationCache = new Map()
  const sessionRepoCache = new Map()
  let refreshTask = null
  let webServer
  function webOrigin() {
    try {
      return webServer?.getOrigin?.()
    } catch (error) {
      warn(`读取服务地址失败：${describeError(error)}`)
      return undefined
    }
  }
  function findGroupRef(reference) {
    if (typeof reference !== 'string') return undefined
    const token = reference.trim()
    if (token === '') return undefined
    return state.groups.find((group) => group.id === token) ?? state.groups.find((group) => group.name === token) ?? state.groups.find((group) => group.name.toLowerCase() === token.toLowerCase())
  }
  function specialGroup(kind) {
    // `doing` = the claimed/work-in-progress column; `done` = the final
    // wrap-up column of the default board.
    if (kind === 'doing') return state.groups.find((group) => group.id === 'doing') ?? state.groups.find((group) => group.name === '进行中' || group.name === 'Doing')
    return state.groups.find((group) => group.id === 'wrapup') ?? state.groups.find((group) => group.name === '待完结' || group.name === 'Done')
  }
  const failure = (message, status) => ({ error: message, status })
  const success = (extra) => ({ ok: true, ...extra })
  // Only the active repository's cards appear on this board; tasks created in
  // another project stay persisted and come back when that project is active.
  const currentTasks = () => state.tasks.filter((task) => task.repo === state.repo)
  function resolveGitBin() {
    for (const candidate of ['/usr/bin/git', '/opt/homebrew/bin/git', '/usr/local/bin/git']) {
      if (isExecutable(candidate)) return candidate
    }
    const onPath = findOnPath('git')
    return onPath !== '' ? onPath : 'git'
  }
  function runGit(args) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH ?? ''}` }
      execFile(resolveGitBin(), args, { timeout: GIT_TIMEOUT_MS, env }, (error, stdout) => {
        if (error !== null && error !== undefined) {
          reject(error)
          return
        }
        resolve(typeof stdout === 'string' ? stdout : '')
      })
    })
  }
  function githubRepoFromRemote(value) {
    if (typeof value !== 'string' || value.trim() === '') return null
    const match = value.trim().match(/github\.com[:/]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i)
    if (match === null) return null
    const repo = `${match[1]}/${match[2].replace(/\.git$/i, '')}`
    return REPO_PATTERN.test(repo) ? repo : null
  }
  async function resolveRepoOfSession(sessionId) {
    if (typeof sessionId !== 'string' || sessionId === '') return null
    const cached = sessionRepoCache.get(sessionId)
    if (cached !== undefined && Date.now() - cached.at < SESSION_REPO_TTL_MS) return cached.repo
    let repo = null
    try {
      const sessions = ctx.get('sessions')
      const session = sessions !== undefined && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
      if (session !== undefined && session !== null) {
        let cwd = ''
        try {
          const workingDirectory = ctx.get('workingDirectory')
          if (workingDirectory !== undefined && typeof workingDirectory.get === 'function') cwd = workingDirectory.get(session) ?? ''
        } catch (error) {
          void error
        }
        if (cwd === '' && typeof session.header?.cwd === 'string') cwd = session.header.cwd
        if (cwd !== '') repo = githubRepoFromRemote(await runGit(['-C', cwd, 'remote', 'get-url', 'origin']))
      }
    } catch (error) {
      // A conversation whose directory is not a Git repository (or has no
      // GitHub origin) deliberately yields null: the board keeps its project.
      void error
    }
    sessionRepoCache.set(sessionId, { repo, at: Date.now() })
    return repo
  }
  // ------------------------------------------------------------------
  // Session ↔ GitHub issue/PR linkage for the conversation GitHub view
  // ------------------------------------------------------------------
  const linkedCache = new Map()
  function bodyExcerpt(value, limit) {
    if (typeof value !== 'string') return ''
    return value.length > limit ? `${value.slice(0, limit)}…` : value
  }
  async function sessionProject(sessionId) {
    const sessions = ctx.get('sessions')
    const session = sessions !== undefined && typeof sessions.get === 'function' ? sessions.get(sessionId) : undefined
    if (session === undefined || session === null) return null
    let cwd = ''
    try {
      const workingDirectory = ctx.get('workingDirectory')
      if (workingDirectory !== undefined && typeof workingDirectory.get === 'function') cwd = workingDirectory.get(session) ?? ''
    } catch (error) {
      void error
    }
    if (cwd === '' && typeof session.header?.cwd === 'string') cwd = session.header.cwd
    let branch = ''
    if (cwd !== '') {
      try {
        branch = (await runGit(['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'])).trim()
      } catch (error) {
        void error
      }
    }
    const repo = cwd === '' ? null : await resolveRepoOfSession(sessionId)
    return { repo, cwd, branch }
  }
  async function fetchLinkedComments(repo, number) {
    const raw = await fetchRawOrNull(['api', `repos/${repo}/issues/${number}/comments?per_page=100`])
    if (!Array.isArray(raw)) return []
    return raw.slice(-LINKED_COMMENT_LIMIT).map((comment) => ({
      id: Number(comment?.id) || 0,
      author: typeof comment?.user?.login === 'string' ? comment.user.login : '',
      body: bodyExcerpt(comment?.body, LINKED_COMMENT_BODY_LIMIT),
      createdAt: typeof comment?.created_at === 'string' ? comment.created_at : null,
    }))
  }
  async function fetchLinkedThread(repo, number) {
    const raw = await fetchRawOrNull(['api', `repos/${repo}/issues/${number}`])
    if (raw === null || typeof raw !== 'object' || Number(raw.number) !== number) return null
    const isPr = raw.pull_request !== undefined && raw.pull_request !== null
    const comments = await fetchLinkedComments(repo, number)
    let pull = null
    if (isPr) {
      const prRaw = await fetchRawOrNull(['api', `repos/${repo}/pulls/${number}`])
      if (prRaw !== null && typeof prRaw === 'object') {
        pull = {
          base: typeof prRaw.base?.ref === 'string' ? prRaw.base.ref : '',
          head: typeof prRaw.head?.ref === 'string' ? prRaw.head.ref : '',
          merged: prRaw.merged === true,
          draft: prRaw.draft === true,
          additions: Number(prRaw.additions) || 0,
          deletions: Number(prRaw.deletions) || 0,
          changedFiles: Number(prRaw.changed_files) || 0,
        }
      }
    }
    return {
      kind: isPr ? 'pr' : 'issue',
      number,
      title: typeof raw.title === 'string' ? raw.title : '',
      state: String(raw.state ?? '').toUpperCase() === 'CLOSED' ? 'CLOSED' : 'OPEN',
      url: typeof raw.html_url === 'string' ? raw.html_url : `https://github.com/${repo}/issues/${number}`,
      author: typeof raw.user?.login === 'string' ? raw.user.login : '',
      labels: (Array.isArray(raw.labels) ? raw.labels : [])
        .filter((label) => typeof label?.name === 'string')
        .map((label) => ({ name: label.name, color: typeof label.color === 'string' ? label.color : '' })),
      body: bodyExcerpt(raw.body, LINKED_BODY_LIMIT),
      createdAt: typeof raw.created_at === 'string' ? raw.created_at : null,
      updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : null,
      comments,
      commentsTotal: Number(raw.comments) || comments.length,
      pull,
    }
  }
  function linkedIssueNumbersFromText(text) {
    if (typeof text !== 'string' || text === '') return []
    const numbers = []
    const pattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|关联|修复|关闭)\s*[:：]?\s*#(\d{1,6})/gi
    let match = pattern.exec(text)
    while (match !== null) {
      const number = Number(match[1])
      if (Number.isInteger(number) && number > 0 && !numbers.includes(number)) numbers.push(number)
      match = pattern.exec(text)
    }
    return numbers
  }
  function branchIssueCandidates(branch) {
    if (typeof branch !== 'string' || branch === '') return []
    const found = []
    const patterns = [
      /(?:^|[^A-Za-z0-9])issue[-_/ ]?(\d{1,6})(?![0-9])/i,
      /(?:^|[^A-Za-z0-9])(\d{3,6})(?:[-_/ ]|$)/,
    ]
    for (const pattern of patterns) {
      const match = branch.match(pattern)
      if (match === null) continue
      const number = Number(match[1])
      if (Number.isInteger(number) && number > 0 && !found.includes(number)) found.push(number)
    }
    return found
  }
  async function branchCommitIssueNumbers(cwd) {
    if (typeof cwd !== 'string' || cwd === '') return []
    try {
      const log = await runGit(['-C', cwd, 'log', '--pretty=%s', '-8'])
      const numbers = []
      const pattern = /#(\d{2,6})/g
      let match = pattern.exec(log)
      while (match !== null) {
        const number = Number(match[1])
        if (Number.isInteger(number) && number > 0 && !numbers.includes(number)) numbers.push(number)
        match = pattern.exec(log)
      }
      return numbers
    } catch (error) {
      void error
      return []
    }
  }
  async function linkedForSession(sessionId, force) {
    const missing = { associated: false, repo: '', cwd: '', branch: '', reason: 'no-session', issues: [], prs: [], fetchedAt: Date.now() }
    if (typeof sessionId !== 'string' || sessionId === '') return missing
    const cached = linkedCache.get(sessionId)
    if (force !== true && cached !== undefined && Date.now() - cached.fetchedAt < LINKED_TTL_MS) return cached
    const project = await sessionProject(sessionId)
    if (project === null) return { ...missing, fetchedAt: Date.now() }
    const { repo, cwd, branch } = project
    if (repo === null || repo === '') {
      const payload = { associated: false, repo: '', cwd, branch, reason: cwd === '' ? 'no-workdir' : 'no-github-remote', issues: [], prs: [], fetchedAt: Date.now() }
      linkedCache.set(sessionId, payload)
      return payload
    }
    let prNumber = null
    try {
      const list = await ghJson(['pr', 'list', '--repo', repo, '--head', branch, '--state', 'all', '--limit', '5', '--json', 'number,state,title,url,isDraft,mergedAt'])
      if (Array.isArray(list) && list.length > 0) {
        const preferred = list.find((item) => item.state === 'OPEN') ?? list[0]
        prNumber = Number(preferred.number)
      }
    } catch (error) {
      void error
    }
    const issueNumbers = []
    const addIssue = (value) => {
      const number = Number(value)
      if (!Number.isInteger(number) || number <= 0) return
      if (number === prNumber || issueNumbers.includes(number)) return
      if (issueNumbers.length >= LINKED_ISSUE_LIMIT) return
      issueNumbers.push(number)
    }
    if (prNumber !== null) {
      try {
        const meta = await ghJson(['pr', 'view', String(prNumber), '--repo', repo, '--json', 'closingIssuesReferences,body'])
        if (meta !== null && typeof meta === 'object') {
          for (const reference of Array.isArray(meta.closingIssuesReferences) ? meta.closingIssuesReferences : []) addIssue(reference?.number)
          for (const number of linkedIssueNumbersFromText(meta.body)) addIssue(number)
        }
      } catch (error) {
        void error
      }
    }
    for (const number of branchIssueCandidates(branch)) addIssue(number)
    for (const number of await branchCommitIssueNumbers(cwd)) addIssue(number)
    const [prItems, issueItems] = await Promise.all([
      prNumber === null ? Promise.resolve([]) : fetchLinkedThread(repo, prNumber).then((item) => (item === null ? [] : [item])).catch(() => []),
      Promise.all(issueNumbers.map((number) => fetchLinkedThread(repo, number).then((item) => (item !== null && item.kind === 'issue' ? item : null)).catch(() => null))),
    ])
    const issues = issueItems.filter((item) => item !== null)
    const prs = prItems.filter((item) => item !== null)
    const payload = {
      associated: issues.length + prs.length > 0,
      repo,
      cwd,
      branch,
      reason: issues.length + prs.length > 0 ? null : 'no-link',
      issues,
      prs,
      fetchedAt: Date.now(),
    }
    linkedCache.set(sessionId, payload)
    return payload
  }
  async function inspectLinkedNumber(sessionId, number) {
    if (!Number.isInteger(number) || number <= 0) throw httpError('编号不正确', 400)
    const project = await sessionProject(sessionId)
    if (project === null) throw httpError('会话不在当前进程中', 404)
    if (project.repo === null || project.repo === '') throw httpError('当前工作目录没有关联 GitHub 仓库', 400)
    const item = await fetchLinkedThread(project.repo, number)
    if (item === null) throw httpError(`#${number} 不存在或无权访问`, 404)
    return { ...item, repo: project.repo, branch: project.branch }
  }
  async function commentOnThread(body) {
    const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''
    const number = Number(body?.number)
    const text = typeof body?.body === 'string' ? body.body.trim() : ''
    if (text === '') return failure('回复内容不能为空', 400)
    if (text.length > 60_000) return failure('回复内容过长', 400)
    if (!Number.isInteger(number) || number <= 0) return failure('编号不正确', 400)
    const project = await sessionProject(sessionId)
    if (project === null) return failure('会话不在当前进程中', 404)
    if (project.repo === null || project.repo === '') return failure('当前工作目录没有关联 GitHub 仓库', 400)
    const raw = await ghJson(['api', '-X', 'POST', `repos/${project.repo}/issues/${number}/comments`, '-f', `body=${text}`])
    linkedCache.delete(sessionId)
    const comment = raw !== null && typeof raw === 'object'
      ? {
          id: Number(raw.id) || 0,
          author: typeof raw.user?.login === 'string' ? raw.user.login : '',
          body: typeof raw.body === 'string' ? raw.body : text,
          createdAt: typeof raw.created_at === 'string' ? raw.created_at : null,
        }
      : { id: 0, author: '', body: text, createdAt: null }
    return success({ comment, repo: project.repo, number })
  }
  async function applyActiveSession(sessionId) {
    if (typeof sessionId !== 'string' || sessionId.trim() === '') return { changed: false, repo: state.repo, switched: false }
    const nextSessionId = sessionId.trim()
    if (nextSessionId === state.activeSessionId) return { changed: false, repo: state.repo, switched: false }
    state.activeSessionId = nextSessionId
    writeStateFile(state)
    const repo = await resolveRepoOfSession(nextSessionId)
    if (repo === null || repo === state.repo) return { changed: true, repo: state.repo, switched: false }
    state.repo = repo
    writeStateFile(state)
    issueCache = emptyCache(repo)
    relationCache.clear()
    removeDiskCache()
    // Kick the new project's fetch; a board GET arriving now shares this
    // promise, so the first render after the switch already shows the new repo.
    void refreshIssues()
    return { changed: true, repo, switched: true }
  }
  async function fetchRawOrNull(args) {
    try {
      return await ghJson(args)
    } catch (error) {
      void error
      return null
    }
  }
  async function viewerLogin() {
    if (typeof viewerLoginCache.login === 'string' && viewerLoginCache.login !== '' && Date.now() - viewerLoginCache.at < LOGIN_TTL_MS) return viewerLoginCache.login
    const me = await fetchRawOrNull(['api', 'user'])
    const login = me !== null && typeof me === 'object' && typeof me.login === 'string' && me.login !== '' ? me.login : null
    if (login !== null) viewerLoginCache = { login, at: Date.now() }
    return viewerLoginCache.login
  }
  function visibleIssues() {
    const cached = issueCache.repo === state.repo ? issueCache.issues : []
    if (state.scope !== SCOPE_MINE) return cached
    // Without a known viewer login the host cannot decide ownership, so it
    // shows the whole (unclosed) inbox instead of an empty board.
    if (typeof issueCache.login !== 'string' || issueCache.login === '') return cached
    return cached.filter((issue) => issue.mine === true)
  }
  async function doRefresh(repo) {
    const bodies = new Map()
    const fetched = await fetchIssues(repo, issuesLimit, bodies)
    const login = await viewerLogin().catch(() => null)
    // A fetch that finishes after the board switched projects must not
    // overwrite the new project's snapshot or its disk cache.
    if (repo !== state.repo) return issueCache
    const issues = login === null
      ? fetched.issues
      : fetched.issues.map((issue) => ({ ...issue, mine: issue.author === login || issue.assignees.includes(login) }))
    issueCache = { repo, fetchedAt: Date.now(), issues, bodies, truncated: fetched.truncated, error: null, login }
    relationCache.clear()
    writeAtomic(cachePath(), `${JSON.stringify({
      version: CACHE_VERSION,
      repo,
      fetchedAt: issueCache.fetchedAt,
      issues: issueCache.issues,
      truncated: issueCache.truncated,
      login,
      bodies: [...bodies.entries()].map(([number, body]) => [number, bodyExcerpt(body, 100_000)]),
    })}\n`)
    return issueCache
  }
  const NO_REPO_MESSAGE = '尚未选择仓库：点击看板顶部的仓库名输入 owner/name，或在插件配置里设置 repo；从带 GitHub 关联的聊天项目进入会自动识别'
  function refreshIssues() {
    if (state.repo === '') {
      issueCache = emptyCache('', NO_REPO_MESSAGE)
      return Promise.resolve(issueCache)
    }
    // One in-flight fetch per repository. A repository switch starts its own
    // refresh immediately instead of waiting for (and sharing a result with)
    // the previous repository's request.
    if (refreshTask !== null && refreshTask.repo === state.repo) return refreshTask.promise
    const repo = state.repo
    const promise = doRefresh(repo)
      .catch((error) => {
        const message = `读取 GitHub issue 失败：${describeError(error)}。请确认已安装 gh CLI 并运行过 gh auth login，且当前账号能访问 ${repo}。`
        // A failed fetch for a project that is no longer active must not
        // replace the active project's snapshot with an empty error cache.
        if (repo !== state.repo) return issueCache
        warn(message)
        issueCache = issueCache.repo === repo ? { ...issueCache, error: message } : emptyCache(repo, message)
        return issueCache
      })
      .finally(() => {
        if (refreshTask !== null && refreshTask.promise === promise) refreshTask = null
      })
    refreshTask = { repo, promise }
    return promise
  }
  async function ensureBoard(waitMs) {
    const usable = issueCache.repo === state.repo && issueCache.issues.length > 0
    if (usable && issueCache.error === null && Date.now() - issueCache.fetchedAt < CACHE_TTL_MS) return
    if (!usable) {
      await refreshIssues()
      return
    }
    await Promise.race([refreshIssues(), delay(waitMs)])
  }
  function boardPayload() {
    return { repo: state.repo, scope: state.scope, fetchedAt: issueCache.fetchedAt, error: issueCache.error, issues: visibleIssues(), truncated: issueCache.truncated, groups: state.groups, tasks: currentTasks() }
  }
  async function issueSnapshot(issueNumber) {
    const cached = issueCache.repo === state.repo ? issueCache.issues.find((issue) => issue.number === issueNumber) : undefined
    const issue = cached !== undefined ? cached : normalizeIssue(await fetchRawOrNull(['api', `repos/${state.repo}/issues/${issueNumber}`]) ?? {}, state.repo)
    if (issue === null) return null
    return { number: issue.number, title: issue.title, url: issue.url, state: issue.state, labels: issue.labels.map((label) => label.name), bodyExcerpt: issue.bodyExcerpt }
  }
  async function computeRelations(focusNumber) {
    const repo = state.repo
    const cachedFocus = issueCache.repo === repo ? issueCache.issues.find((issue) => issue.number === focusNumber) : undefined
    let focusNode = cachedFocus === undefined ? null : nodeFromCache(cachedFocus)
    let focusBody = issueCache.repo === repo ? issueCache.bodies.get(focusNumber) ?? '' : ''
    if (focusBody === '' && cachedFocus !== undefined) focusBody = cachedFocus.bodyExcerpt
    if (focusNode === null || focusBody === '') {
      const raw = await fetchRawOrNull(['api', `repos/${repo}/issues/${focusNumber}`])
      if (raw !== null && typeof raw === 'object') {
        focusNode = nodeFromRaw(raw, repo) ?? focusNode
        if (typeof raw.body === 'string' && raw.body !== '') focusBody = raw.body
      }
    }
    if (focusNode === null) throw new Error(`无法读取 issue #${focusNumber}：请确认 gh CLI 可用且该 issue 属于 ${repo}`)
    const [parentRaw, childrenRaw] = await Promise.all([
      fetchRawOrNull(['api', `repos/${repo}/issues/${focusNumber}/parent`]),
      fetchRawOrNull(['api', `repos/${repo}/issues/${focusNumber}/sub_issues`]),
    ])
    const nodes = new Map()
    const edges = []
    const addNode = (node) => {
      if (node !== null) nodes.set(node.number, node)
    }
    addNode(focusNode)
    const parentNode = nodeFromRaw(parentRaw, repo)
    if (parentNode !== null) {
      addNode(parentNode)
      edges.push({ from: parentNode.number, to: focusNumber, kind: 'parent' })
    }
    for (const childRaw of Array.isArray(childrenRaw) ? childrenRaw : []) {
      const childNode = nodeFromRaw(childRaw, repo)
      if (childNode === null) continue
      addNode(childNode)
      edges.push({ from: focusNumber, to: childNode.number, kind: 'parent' })
    }
    for (const reference of textReferences(focusBody)) {
      if (reference.kind === 'blocks') appendReference(edges, reference.number, focusNumber, 'blocks')
      else if (reference.kind === 'parent') appendReference(edges, reference.number, focusNumber, 'parent')
      else if (reference.kind === 'child') appendReference(edges, focusNumber, reference.number, 'parent')
      else appendReference(edges, focusNumber, reference.number, 'relates')
    }
    for (const [otherNumber, body] of issueCache.bodies) {
      if (otherNumber === focusNumber) continue
      for (const reference of textReferences(body)) {
        if (reference.number !== focusNumber) continue
        if (reference.kind === 'blocks') appendReference(edges, focusNumber, otherNumber, 'blocks')
        else if (reference.kind === 'parent') appendReference(edges, focusNumber, otherNumber, 'parent')
        else if (reference.kind === 'child') appendReference(edges, otherNumber, focusNumber, 'parent')
        else appendReference(edges, otherNumber, focusNumber, 'relates')
      }
    }
    const endpoints = new Set()
    for (const edge of edges) {
      if (edge.from !== focusNumber) endpoints.add(edge.from)
      if (edge.to !== focusNumber) endpoints.add(edge.to)
    }
    for (const endpoint of endpoints) {
      if (nodes.has(endpoint)) continue
      const cached = issueCache.repo === repo ? issueCache.issues.find((issue) => issue.number === endpoint) : undefined
      if (cached !== undefined) addNode(nodeFromCache(cached))
    }
    const missing = [...endpoints].filter((endpoint) => !nodes.has(endpoint)).slice(0, MAX_NEIGHBOURS)
    if (missing.length > 0) {
      const raws = await Promise.all(missing.map((endpoint) => fetchRawOrNull(['api', `repos/${repo}/issues/${endpoint}`])))
      for (const raw of raws) addNode(nodeFromRaw(raw, repo))
    }
    const graph = assembleGraph(focusNumber, focusNode, nodes, edges)
    // Full body for the detail panel's Markdown renderer (the board cache only
    // keeps a short plain excerpt).
    return { ...graph, body: bodyExcerpt(focusBody, 20_000) }
  }
  async function relationsFor(focusNumber) {
    if (state.repo === '') throw new Error(NO_REPO_MESSAGE)
    const key = `${state.repo}#${focusNumber}`
    const cached = relationCache.get(key)
    if (cached !== undefined && Date.now() - cached.at < RELATION_TTL_MS) return cached.payload
    await ensureBoard(STALE_WAIT_MS)
    const payload = await computeRelations(focusNumber)
    relationCache.set(key, { at: Date.now(), payload })
    return payload
  }
  function assignOperation(issueNumber, groupRef) {
    if (!Number.isInteger(issueNumber) || issueNumber <= 0) return failure('issue 编号不正确', 400)
    const group = findGroupRef(groupRef)
    if (group === undefined) return failure('分组不存在', 404)
    let task = currentTasks().find((item) => item.issueNumber === issueNumber)
    if (task === undefined) {
      task = { id: createId('t_'), issueNumber, groupId: group.id, repo: state.repo, createdAt: Date.now(), claimedAt: null, claimedBy: null }
      state.tasks.push(task)
    } else {
      task.groupId = group.id
    }
    writeStateFile(state)
    return success({ task, group: { id: group.id, name: group.name } })
  }
  function moveOperation(taskId, groupRef) {
    const token = typeof taskId === 'string' ? taskId.trim() : ''
    if (token === '') return failure('缺少任务 id', 400)
    const task = currentTasks().find((item) => item.id === token)
    if (task === undefined) return failure('任务不存在', 404)
    const group = findGroupRef(groupRef)
    if (group === undefined) return failure('分组不存在', 404)
    task.groupId = group.id
    writeStateFile(state)
    return success({ task })
  }
  function removeOperation(taskId) {
    const token = typeof taskId === 'string' ? taskId.trim() : ''
    if (token === '') return failure('缺少任务 id', 400)
    const task = currentTasks().find((item) => item.id === token)
    if (task === undefined) return failure('任务不存在', 404)
    const index = state.tasks.indexOf(task)
    if (index !== -1) state.tasks.splice(index, 1)
    writeStateFile(state)
    return success({ task, taskId: task.id })
  }
  function addGroupOperation(name) {
    const groupName = typeof name === 'string' ? name.trim() : ''
    if (groupName === '') return failure('分组名称不能为空', 400)
    if (groupName.length > 40) return failure('分组名称最多 40 个字符', 400)
    if (state.groups.some((group) => group.name === groupName)) return failure('已存在同名分组', 409)
    const group = { id: createId('g_'), name: groupName, order: state.groups.reduce((maximum, item) => Math.max(maximum, item.order), -1) + 1 }
    state.groups.push(group)
    writeStateFile(state)
    return success({ group })
  }
  function renameGroupOperation(groupId, name) {
    const group = state.groups.find((item) => item.id === groupId)
    if (group === undefined) return failure('分组不存在', 404)
    const groupName = typeof name === 'string' ? name.trim() : ''
    if (groupName === '') return failure('分组名称不能为空', 400)
    if (groupName.length > 40) return failure('分组名称最多 40 个字符', 400)
    if (state.groups.some((other) => other.id !== group.id && other.name === groupName)) return failure('已存在同名分组', 409)
    group.name = groupName
    writeStateFile(state)
    return success({ group })
  }
  function deleteGroupOperation(groupId) {
    const index = state.groups.findIndex((group) => group.id === groupId)
    if (index === -1) return failure('分组不存在', 404)
    if (state.groups.length <= 1) return failure('至少要保留一个分组', 400)
    const [removed] = state.groups.splice(index, 1)
    let moved = 0
    for (const task of state.tasks) {
      if (task.groupId !== removed.id) continue
      task.groupId = state.groups[0].id
      moved += 1
    }
    writeStateFile(state)
    return success({ removed: { id: removed.id, name: removed.name }, moved })
  }
  function claimOperation(input) {
    const taskId = typeof input.taskId === 'string' ? input.taskId.trim() : ''
    const issueNumber = Number(input.issue)
    let task
    if (taskId !== '') {
      task = currentTasks().find((item) => item.id === taskId)
      if (task === undefined) return failure('任务不存在', 404)
      if (task.claimedAt !== null) return success({ task, alreadyClaimed: true })
    } else if (Number.isInteger(issueNumber) && issueNumber > 0) {
      task = currentTasks().find((item) => item.issueNumber === issueNumber)
      if (task === undefined) return failure(`#${issueNumber} 尚未加入任何待办分组`, 404)
      if (task.claimedAt !== null) return success({ task, alreadyClaimed: true })
    } else {
      const groupReference = typeof input.group === 'string' ? input.group : ''
      const scoped = findGroupRef(groupReference)
      if (groupReference.trim() !== '' && scoped === undefined) return failure('分组不存在', 404)
      if (scoped !== undefined) {
        task = currentTasks().find((item) => item.claimedAt === null && item.groupId === scoped.id)
        if (task === undefined) return failure('该分组没有可领取的任务', 409)
      } else {
        task = currentTasks().find((item) => item.claimedAt === null)
        if (task === undefined) return failure(currentTasks().length === 0 ? '看板里还没有待办任务，请先把 issue 加入分组' : '所有任务都已被领取', 409)
      }
    }
    task.claimedAt = Date.now()
    task.claimedBy = input.by === 'user' ? 'user' : 'agent'
    const doing = specialGroup('doing')
    if (doing !== undefined) task.groupId = doing.id
    writeStateFile(state)
    return success({ task, alreadyClaimed: false })
  }
  function completeOperation(taskId) {
    const token = typeof taskId === 'string' ? taskId.trim() : ''
    if (token === '') return failure('缺少任务 id', 400)
    const task = currentTasks().find((item) => item.id === token)
    if (task === undefined) return failure('任务不存在', 404)
    const done = specialGroup('done')
    if (done !== undefined) task.groupId = done.id
    else if (task.claimedAt === null) {
      task.claimedAt = Date.now()
      task.claimedBy = 'user'
    }
    writeStateFile(state)
    return success({ task })
  }
  function scopeOperation(scope) {
    const next = normalizeScope(scope)
    if (next === null) return failure('scope 必须是 mine 或 all', 400)
    state.scope = next
    writeStateFile(state)
    return { board: true }
  }
  function replyOutcome(response, outcome) {
    if (outcome.error !== undefined) {
      sendJson(response, outcome.status ?? 400, { error: outcome.error })
      return
    }
    sendJson(response, 200, { ok: true, groups: state.groups, tasks: currentTasks(), ...outcome })
  }
  const actions = {
    assign: (body) => assignOperation(Number(body.issue), body.group),
    move: (body) => moveOperation(body.taskId, body.group),
    remove: (body) => removeOperation(body.taskId),
    addGroup: (body) => addGroupOperation(body.name),
    renameGroup: (body) => renameGroupOperation(typeof body.groupId === 'string' ? body.groupId : '', body.name),
    deleteGroup: (body) => deleteGroupOperation(typeof body.groupId === 'string' ? body.groupId : ''),
    claim: (body) => claimOperation({ taskId: body.taskId, group: body.group, by: body.by }),
    complete: (body) => completeOperation(body.taskId),
    activeSession: async (body) => applyActiveSession(typeof body.sessionId === 'string' ? body.sessionId : ''),
    comment: async (body) => commentOnThread(body),
    filter: (body) => scopeOperation(body.scope),
    refresh: async () => {
      await refreshIssues()
      return { board: true }
    },
    settings: async (body) => {
      const repo = normalizeRepo(body.repo)
      if (repo === null) return failure('仓库格式不正确，应为 owner/name', 400)
      state.repo = repo
      writeStateFile(state)
      issueCache = emptyCache(repo)
      relationCache.clear()
      removeDiskCache()
      await refreshIssues()
      return { board: true }
    },
  }
  const handler = async (request, response) => {
    try {
      const origin = request.headers.origin
      const site = request.headers['sec-fetch-site']
      if ((typeof origin === 'string' && origin !== '' && origin !== webOrigin()) || (typeof site === 'string' && site !== 'same-origin')) {
        sendJson(response, 403, { error: 'forbidden' })
        return
      }
      if (request.method === 'GET') {
        const url = new URL(request.url ?? ROUTE, 'http://localhost')
        const linkedToken = url.searchParams.get('linked')
        if (linkedToken !== null) {
          const linkedSession = url.searchParams.get('session') ?? ''
          if (linkedSession === '') {
            sendJson(response, 400, { error: '缺少 session' })
            return
          }
          try {
            sendJson(response, 200, await linkedForSession(linkedSession, url.searchParams.get('refresh') === '1'))
          } catch (error) {
            sendJson(response, 502, { error: describeError(error) })
          }
          return
        }
        const inspectToken = url.searchParams.get('inspect')
        if (inspectToken !== null) {
          const inspectSession = url.searchParams.get('session') ?? ''
          if (inspectSession === '') {
            sendJson(response, 400, { error: '缺少 session' })
            return
          }
          const inspectNumber = Number(inspectToken)
          try {
            sendJson(response, 200, await inspectLinkedNumber(inspectSession, inspectNumber))
          } catch (error) {
            sendJson(response, typeof error?.status === 'number' ? error.status : 502, { error: describeError(error) })
          }
          return
        }
        // The Client reports the Session it last showed in the conversation
        // panel. Every board read follows that project when it maps to a
        // GitHub repository; a project without one leaves the repo alone.
        const sessionToken = url.searchParams.get('session')
        if (sessionToken !== null && sessionToken !== '') await applyActiveSession(sessionToken)
        if (url.searchParams.get('stats') !== null) {
          // Cheap badge read for the sidebar entry: current counts from the
          // cache, no blocking GitHub fetch. An empty cache kicks a background
          // refresh and reports `loading` so the Client can retry shortly.
          const cached = issueCache.repo === state.repo ? issueCache : emptyCache(state.repo)
          const count = cached.repo === state.repo ? visibleIssues().length : 0
          const loading = count === 0 && cached.error === null
          if (loading) void refreshIssues()
          sendJson(response, 200, { repo: state.repo, scope: state.scope, count, fetchedAt: cached.fetchedAt, error: cached.error, loading })
          return
        }
        const issueToken = url.searchParams.get('issue')
        if (issueToken !== null) {
          const issueNumber = Number(issueToken)
          if (!Number.isInteger(issueNumber) || issueNumber <= 0) {
            sendJson(response, 400, { error: 'issue 编号不正确' })
            return
          }
          try {
            sendJson(response, 200, await relationsFor(issueNumber))
          } catch (error) {
            sendJson(response, 502, { error: describeError(error) })
          }
          return
        }
        await ensureBoard(BOARD_WAIT_MS)
        sendJson(response, 200, boardPayload())
        return
      }
      if (request.method !== 'POST') {
        sendJson(response, 405, { error: 'method not allowed' })
        return
      }
      let body
      try {
        body = await readJsonBody(request)
      } catch (error) {
        sendJson(response, error?.status ?? 400, { error: describeError(error) })
        return
      }
      const action = typeof body.action === 'string' ? body.action : ''
      if (!Object.hasOwn(actions, action)) {
        sendJson(response, 400, { error: `未知操作：${action === '' ? '(空)' : action}` })
        return
      }
      const outcome = await actions[action](body)
      if (outcome.board === true) sendJson(response, 200, { ok: true, ...boardPayload() })
      else replyOutcome(response, outcome)
    } catch (error) {
      if (response.headersSent !== true) sendJson(response, 500, { error: describeError(error) })
    }
  }
  const boardTool = {
    name: 'github_kanban_board',
    description: '查看 GitHub issue 看板：当前仓库、范围（我的 issue / 全部）、DSH 待办分组及组内任务、GitHub 收件箱统计。默认只统计我创建或指派给我的未关闭 issue。用户问「看板里有什么」「待办分组/进行中的任务」时调用。',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
    output: {
      schema: BOARD_OUTPUT_SCHEMA,
      render: (args, value) => [{ type: 'text', text: renderBoard(value) }],
    },
    async execute() {
      await ensureBoard(TOOL_WAIT_MS)
      return boardViewOf(state, issueCache)
    },
  }
  const claimTool = {
    name: 'github_kanban_claim',
    description: '从 DSH 待办分组里领取一个任务：标记领取人、移到「进行中」，并返回该 issue 的标题、状态、标签和正文摘要。用户说「领取/认领待办里的任务」「我来做这个」时调用。可指定分组或 issue 编号；不指定时按看板顺序领取第一个未领取任务。',
    parameters: {
      type: 'object',
      properties: {
        group: { type: 'string', description: '可选：分组 id 或名称（如 backlog / 待办）。只在指定分组里领取' },
        issue: { type: 'integer', description: '可选：指定要领取的 issue 编号，该 issue 必须已在某个分组里' },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', description: '是否领取成功' },
          message: { type: 'string', description: '给用户看的中文说明' },
          issue: { oneOf: [{ type: 'null' }, ISSUE_SUMMARY_SCHEMA] },
          group: { oneOf: [{ type: 'null' }, { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id', 'name'], additionalProperties: false }] },
        },
        required: ['ok', 'message', 'issue', 'group'],
        additionalProperties: false,
      },
      render: (args, value) => {
        const lines = [value.message]
        if (value.issue !== null) {
          lines.push(`#${value.issue.number} · ${value.issue.state} · ${value.issue.url}`)
          if (value.issue.labels.length > 0) lines.push(`标签：${value.issue.labels.join('、')}`)
          if (value.issue.bodyExcerpt !== '') lines.push(`摘要：${clip(value.issue.bodyExcerpt, 400)}`)
        }
        return [{ type: 'text', text: lines.join('\n') }]
      },
    },
    async execute(args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      await ensureBoard(TOOL_WAIT_MS)
      const issueNumber = Number(input.issue)
      const outcome = claimOperation({
        group: typeof input.group === 'string' ? input.group : undefined,
        issue: Number.isInteger(issueNumber) && issueNumber > 0 ? issueNumber : undefined,
      })
      if (outcome.error !== undefined) return { ok: false, message: outcome.error, issue: null, group: null }
      const issue = await issueSnapshot(outcome.task.issueNumber)
      const group = state.groups.find((item) => item.id === outcome.task.groupId)
      const groupView = group === undefined ? null : { id: group.id, name: group.name }
      const title = issue === null || issue.title === '' ? '' : ` ${issue.title}`
      return { ok: true, message: `${outcome.alreadyClaimed === true ? '已被领取' : '已领取'} #${outcome.task.issueNumber}${title}（分组：${groupView?.name ?? '未知'}）`, issue, group: groupView }
    },
  }
  const moveTool = {
    name: 'github_kanban_move',
    description: '把某个 GitHub issue 加入指定的 DSH 待办分组；已在分组里则移动到该分组。用户说「把 #123 放到进行中」「把这个 issue 加进待办」时调用。',
    parameters: {
      type: 'object',
      properties: {
        issue: { type: 'integer', description: 'GitHub issue 编号' },
        group: { type: 'string', description: '目标分组 id 或名称（如 backlog / 待办 / 进行中 / 待完结 / 积压）' },
      },
      required: ['issue', 'group'],
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', description: '是否操作成功' },
          message: { type: 'string', description: '给用户看的中文说明' },
          task: {
            oneOf: [
              { type: 'null' },
              { type: 'object', properties: { id: { type: 'string' }, issueNumber: { type: 'integer' }, groupId: { type: 'string' }, claimedAt: NULLABLE_NUMBER, claimedBy: NULLABLE_STRING }, required: ['id', 'issueNumber', 'groupId', 'claimedAt', 'claimedBy'], additionalProperties: false },
            ],
          },
        },
        required: ['ok', 'message', 'task'],
        additionalProperties: false,
      },
      render: (args, value) => [{ type: 'text', text: value.message }],
    },
    async execute(args) {
      const input = args !== null && typeof args === 'object' ? args : {}
      const issueNumber = Number(input.issue)
      const outcome = assignOperation(issueNumber, typeof input.group === 'string' ? input.group : '')
      if (outcome.error !== undefined) return { ok: false, message: outcome.error, task: null }
      const group = state.groups.find((item) => item.id === outcome.task.groupId)
      return { ok: true, message: `已把 #${issueNumber} 加入分组「${group?.name ?? outcome.task.groupId}」`, task: taskView(outcome.task) }
    },
  }
  if (ctx.tools !== undefined && typeof ctx.tools.register === 'function') {
    for (const definition of [boardTool, claimTool, moveTool]) {
      try {
        ctx.effect(() => ctx.tools.register(definition), `github-kanban:${definition.name}`)
      } catch (error) {
        warn(`注册工具 ${definition.name} 失败：${describeError(error)}`)
      }
    }
  } else {
    warn('缺少 tools 服务，Agent 工具未注册')
  }
  ctx.inject(['webServer'], (webCtx) => {
    webServer = webCtx.webServer
    let disposeRoute = () => {}
    try {
      disposeRoute = webCtx.webServer.register({ kind: 'exact', path: ROUTE, handler })
    } catch (error) {
      warn(`注册 HTTP 路由 ${ROUTE} 失败：${describeError(error)}`)
    }
    webCtx.effect(() => () => {
      webServer = undefined
      disposeRoute()
    })
  })
}
