import fuzzysort from 'fuzzysort'
import {
  Archive,
  Blocks,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Wrench,
} from 'lucide-solid'
import { createMemo, createSignal, For, Show } from 'solid-js'
import type { ArchivedSessionItem, SessionListItem, WorkspaceInfo } from '../../lib/ipc'
import { formatRelativeTime } from '../../lib/sessionView'
import type { GroupMode, SortMode } from '../../types/session'
import { SessionFilterMenu } from './SessionFilterMenu'
import { SessionRow } from './SessionRow'

const PAGE_SIZE_INITIAL = 12
const PAGE_SIZE_MORE = 6

type SessionSidebarProps = {
  style?: string | Record<string, string>
  sessions: SessionListItem[]
  workspaces: WorkspaceInfo[]
  selectedWorkspacePath?: string | null
  activePath?: string | null
  query: string
  sortBy: SortMode
  groupBy: GroupMode
  showRecent: boolean
  collapsedGroups: Set<string>
  pinnedSessions: Set<string>
  showArchived: boolean
  archivedSessions: ArchivedSessionItem[]
  onQuery: (value: string) => void
  onSort: (value: SortMode) => void
  onGroup: (value: GroupMode) => void
  onShowRecent: (value: boolean) => void
  onCollapseAll: () => void
  onToggleGroup: (group: string) => void
  onNewSession: () => void
  onNewSessionIn: (workspacePath: string) => void
  onArchiveGroup: (label: string, paths: string[]) => void
  onArchiveSession: (path: string) => void
  onPinSession: (path: string) => void
  onToggleArchived: () => void
  onUnarchiveSession: (archivedPath: string) => void
  onDeleteArchivedSession: (archivedPath: string) => void
  onOpenSession: (session: SessionListItem) => void
  onOpenSkills?: () => void
  onOpenExtensions?: () => void
  onOpenWorkspace?: () => void
}

export function SessionSidebar(props: SessionSidebarProps) {
  const [searchVisible, setSearchVisible] = createSignal(Boolean(props.query))
  const [expandedWorkspaces, setExpandedWorkspaces] = createSignal<Set<string>>(new Set())

  // Per-workspace visible count (pagination within folder)
  const [visibleCounts, setVisibleCounts] = createSignal<Map<string, number>>(new Map())

  // Auto-expand the active workspace on first load
  createMemo(() => {
    const activePath = props.activePath
    if (!activePath) return
    const activeSession = props.sessions.find((s) => s.path === activePath)
    if (activeSession) {
      setExpandedWorkspaces((prev) => {
        if (prev.has(activeSession.workspacePath)) return prev
        const next = new Set(prev)
        next.add(activeSession.workspacePath)
        return next
      })
    }
  })

  const toggleWorkspace = (path: string) => {
    setExpandedWorkspaces((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const expandAll = () => {
    const allPaths = new Set<string>(props.workspaces.map((w) => w.path))
    for (const s of props.sessions) {
      allPaths.add(s.workspacePath)
    }
    setExpandedWorkspaces(allPaths)
  }

  const collapseAll = () => {
    setExpandedWorkspaces(new Set<string>())
  }

  const getVisible = (key: string) => visibleCounts().get(key) ?? PAGE_SIZE_INITIAL
  const loadMore = (key: string, total: number) => {
    setVisibleCounts((prev) => {
      const next = new Map(prev)
      next.set(key, Math.min((next.get(key) ?? PAGE_SIZE_INITIAL) + PAGE_SIZE_MORE, total))
      return next
    })
  }

  // Build complete workspace list: from workspaces prop + any from sessions
  const allWorkspaces = createMemo(() => {
    const map = new Map<string, WorkspaceInfo>()
    for (const w of props.workspaces) {
      map.set(w.path, w)
    }
    for (const s of props.sessions) {
      if (!map.has(s.workspacePath)) {
        map.set(s.workspacePath, {
          path: s.workspacePath,
          displayName: s.workspaceName,
          lastOpenedAt: null,
          sessionCount: 0,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.lastOpenedAt ? new Date(a.lastOpenedAt).getTime() : 0
      const bTime = b.lastOpenedAt ? new Date(b.lastOpenedAt).getTime() : 0
      return bTime - aTime || a.displayName.localeCompare(b.displayName)
    })
  })

  // Group sessions by workspace
  const workspaceSessions = createMemo(() => {
    const map = new Map<string, SessionListItem[]>()
    for (const session of props.sessions) {
      const list = map.get(session.workspacePath) ?? []
      list.push(session)
      map.set(session.workspacePath, list)
    }
    // Sort within each workspace by updatedAt desc
    for (const [, list] of map) {
      list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    }
    return map
  })

  // Search: fuzzy match across sessions
  const searchResults = createMemo(() => {
    const q = props.query.trim()
    if (!q) return null
    return fuzzysort
      .go(q, props.sessions, { keys: ['title', 'workspaceName'], threshold: -10000 })
      .map((result) => result.obj)
  })

  return (
    <aside class="session-sidebar codex-sidebar" style={props.style}>
      {/* Vertical action list */}
      <div class="codex-sidebar-top">
        <button
          type="button"
          class="codex-action-row is-primary no-drag"
          onClick={props.onNewSession}
          title="New chat"
        >
          <PencilLine size={15} />
          <span>New chat</span>
        </button>
        <button
          type="button"
          class="codex-action-row no-drag"
          onClick={() => props.onOpenSkills?.()}
          title="Skills"
        >
          <Blocks size={15} />
          <span>Skills</span>
        </button>
        <button
          type="button"
          class="codex-action-row no-drag"
          onClick={() => props.onOpenExtensions?.()}
          title="Extensions"
        >
          <Wrench size={15} />
          <span>Extensions</span>
        </button>
        <button
          type="button"
          class="codex-action-row no-drag"
          onClick={() => props.onOpenWorkspace?.()}
          title="Add workspace"
        >
          <Plus size={15} />
          <span>Add workspace</span>
        </button>
      </div>

      {/* Threads section header */}
      <div class="codex-section-header">
        <span class="codex-section-label">Threads</span>
        <div class="codex-section-actions">
          <button
            type="button"
            class="codex-section-action-btn"
            title="Search threads"
            onClick={() => setSearchVisible((v) => !v)}
          >
            <Search size={12} />
          </button>
          <button
            type="button"
            class="codex-section-action-btn"
            title="Expand all workspaces"
            onClick={expandAll}
          >
            <ChevronDown size={12} />
          </button>
          <button
            type="button"
            class="codex-section-action-btn"
            title="Collapse all workspaces"
            onClick={collapseAll}
          >
            <ChevronRight size={12} />
          </button>
          <SessionFilterMenu
            sortBy={props.sortBy}
            groupBy={props.groupBy}
            showRecent={props.showRecent}
            onSort={props.onSort}
            onGroup={props.onGroup}
            onShowRecent={props.onShowRecent}
            onCollapseAll={props.onCollapseAll}
          />
        </div>
      </div>

      {/* Search field */}
      <Show when={searchVisible()}>
        <div class="codex-search-field">
          <Search size={12} />
          <input
            value={props.query}
            onInput={(event) => props.onQuery(event.currentTarget.value)}
            placeholder="Search threads"
          />
        </div>
      </Show>

      {/* Scrollable content */}
      <div class="codex-sidebar-scroll">
        {/* Search results mode */}
        <Show when={searchResults()}>
          {(results) => (
            <>
              <Show when={results().length === 0}>
                <div class="codex-empty">No threads match your search.</div>
              </Show>
              <For each={results()}>
                {(session) => (
                  <SessionRow
                    session={session}
                    active={props.activePath === session.path}
                    isPinned={props.pinnedSessions.has(session.path)}
                    onOpen={() => props.onOpenSession(session)}
                    onPin={() => props.onPinSession(session.path)}
                    onArchive={() => props.onArchiveSession(session.path)}
                  />
                )}
              </For>
            </>
          )}
        </Show>

        {/* Normal folder view */}
        <Show when={!searchResults()}>
          <For each={allWorkspaces()}>
            {(workspace) => {
              const sessions = workspaceSessions().get(workspace.path) ?? []
              const isExpanded = () => expandedWorkspaces().has(workspace.path)
              const hasSessions = sessions.length > 0
              const visibleCount = () => getVisible(workspace.path)
              const visibleSessions = () => sessions.slice(0, visibleCount())
              const hasMore = () => sessions.length > visibleCount()
              const remaining = () => sessions.length - visibleCount()

              return (
                <Show when={hasSessions}>
                  <div class="codex-workspace-folder">
                    {/* Folder header */}
                    <button
                      type="button"
                      class="codex-folder-header"
                      onClick={() => toggleWorkspace(workspace.path)}
                    >
                      <span class="codex-folder-chevron">
                        {isExpanded() ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </span>
                      <span class="codex-folder-icon">
                        <FolderOpen size={12} />
                      </span>
                      <span class="codex-folder-name">{workspace.displayName}</span>
                      <span class="codex-folder-count">{sessions.length}</span>
                    </button>

                    {/* Sessions list (indented) */}
                    <Show when={isExpanded()}>
                      <div class="codex-folder-sessions">
                        <For each={visibleSessions()}>
                          {(session) => (
                            <SessionRow
                              session={session}
                              active={props.activePath === session.path || session.active}
                              isPinned={props.pinnedSessions.has(session.path)}
                              onOpen={() => props.onOpenSession(session)}
                              onPin={() => props.onPinSession(session.path)}
                              onArchive={() => props.onArchiveSession(session.path)}
                            />
                          )}
                        </For>
                        <Show when={hasMore()}>
                          <button
                            type="button"
                            class="codex-load-more"
                            onClick={() => loadMore(workspace.path, sessions.length)}
                          >
                            Load {Math.min(PAGE_SIZE_MORE, remaining())} more
                            <span class="codex-load-more-rem">{remaining()} remaining</span>
                          </button>
                        </Show>
                      </div>
                    </Show>
                  </div>
                </Show>
              )
            }}
          </For>

          {/* Show empty state only when no workspaces have sessions */}
          <Show
            when={
              allWorkspaces().every((w) => (workspaceSessions().get(w.path) ?? []).length === 0) &&
              !props.showArchived
            }
          >
            <div class="codex-empty">
              No threads yet. Start a prompt to create your first Pi thread.
            </div>
          </Show>
        </Show>

        {/* Archived section */}
        <Show when={props.showArchived}>
          <div class="codex-workspace-folder codex-archived-folder">
            <button type="button" class="codex-folder-header" onClick={props.onToggleArchived}>
              <span class="codex-folder-chevron">
                <ChevronDown size={12} />
              </span>
              <span class="codex-folder-icon">
                <Archive size={12} />
              </span>
              <span class="codex-folder-name">Archived</span>
              <span class="codex-folder-count">{props.archivedSessions.length}</span>
            </button>
            <div class="codex-folder-sessions">
              <Show
                when={props.archivedSessions.length > 0}
                fallback={<div class="codex-archived-empty">No archived sessions</div>}
              >
                <For each={props.archivedSessions}>
                  {(item) => (
                    <div class="codex-archived-row">
                      <span class="codex-archived-name">{item.workspaceName}</span>
                      <span class="codex-archived-time">
                        {formatRelativeTime(new Date(item.archivedAt).toISOString())}
                      </span>
                      <div class="codex-archived-actions">
                        <button
                          type="button"
                          title="Restore session"
                          onClick={() => props.onUnarchiveSession(item.archivedPath)}
                        >
                          <RotateCcw size={10} />
                        </button>
                        <button
                          type="button"
                          title="Permanently delete"
                          onClick={() => props.onDeleteArchivedSession(item.archivedPath)}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  )}
                </For>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </aside>
  )
}
