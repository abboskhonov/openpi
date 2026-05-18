import { Check, Pin } from 'lucide-solid'
import { Show } from 'solid-js'
import type { SessionListItem } from '../../lib/ipc'
import { formatRelativeTime } from '../../lib/sessionView'

type SessionRowProps = {
  session: SessionListItem
  active: boolean
  isPinned: boolean
  onOpen: () => void
  onPin: () => void
  onArchive: () => void
}

export function SessionRow(props: SessionRowProps) {
  return (
    <div class="codex-session-wrap">
      <button
        type="button"
        class={`codex-session ${props.active ? 'is-active' : ''} ${props.isPinned ? 'is-pinned' : ''}`}
        onClick={props.onOpen}
      >
        <span
          class="codex-session-indicator"
          classList={{ 'is-active': props.active, 'is-pinned': props.isPinned }}
        />
        <span class="codex-session-title">{props.session.title}</span>
        <Show when={props.session.inputTokens + props.session.outputTokens > 0}>
          <span class="codex-session-tokens">
            {formatTokens(props.session.inputTokens + props.session.outputTokens)}
          </span>
        </Show>
        <span class="codex-session-time">{formatRelativeTime(props.session.updatedAt)}</span>
      </button>

      <div class="codex-session-actions">
        <button
          type="button"
          class="codex-session-action-btn"
          title="Archive session"
          onClick={(event) => {
            event.stopPropagation()
            props.onArchive()
          }}
        >
          <Check size={10} />
        </button>
        <button
          type="button"
          class={`codex-session-action-btn ${props.isPinned ? 'is-pinned-active' : ''}`}
          title={props.isPinned ? 'Unpin session' : 'Pin session'}
          onClick={(event) => {
            event.stopPropagation()
            props.onPin()
          }}
        >
          <Pin size={10} />
        </button>
      </div>
    </div>
  )
}

function formatTokens(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`
  return `${value}`
}
