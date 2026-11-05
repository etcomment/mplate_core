import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { theme } from '../lib/theme'

export interface PanelProps {
  title: string
  icon?: ReactNode
  defaultOpen?: boolean
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
}

export function Panel({ title, icon, defaultOpen = true, badge, actions, children }: PanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <button
          style={styles.toggle}
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span style={styles.chevron}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {icon && <span style={styles.icon}>{icon}</span>}
          <span style={styles.title}>{title}</span>
          {badge && <span style={styles.badge}>{badge}</span>}
        </button>
        {actions && <span style={styles.actions}>{actions}</span>}
      </div>
      {isOpen && <div style={styles.body}>{children}</div>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    background: theme.color.bgPanel,
    flexShrink: 0,
    borderBottom: `1px solid ${theme.color.border}`,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    gap: theme.spacing.xs,
  },
  toggle: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    padding: 0,
    minWidth: 0,
  },
  chevron: {
    display: 'flex',
    alignItems: 'center',
    width: 16,
    flexShrink: 0,
    color: theme.color.textSecondary,
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    color: theme.color.accent,
    flexShrink: 0,
  },
  title: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    padding: `0 ${theme.spacing.xs}`,
    borderRadius: theme.radius.full,
    background: theme.color.bgPanelHover,
    color: theme.color.textSecondary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flexShrink: 0,
  },
  body: {
    padding: `0 ${theme.spacing.md} ${theme.spacing.md}`,
  },
}
