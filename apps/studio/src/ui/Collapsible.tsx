import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { theme } from '../lib/theme'

export interface CollapsibleProps {
  title: string
  defaultOpen?: boolean
  badge?: ReactNode
  onToggle?: (isOpen: boolean) => void
  children: ReactNode
}

export function Collapsible({ title, defaultOpen = false, badge, onToggle, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = () => {
    const next = !isOpen
    setIsOpen(next)
    onToggle?.(next)
  }

  return (
    <div style={styles.container}>
      <button
        style={styles.header}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-label={title}
      >
        <span style={styles.chevron}>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span style={styles.title}>{title}</span>
        {badge && <span style={styles.badge}>{badge}</span>}
      </button>
      {isOpen && <div style={styles.body}>{children}</div>}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: `1px solid ${theme.color.border}`,
    background: theme.color.bgPanel,
    flexShrink: 0,
  },
  header: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    transition: theme.transition.fast,
  },
  chevron: {
    display: 'flex',
    alignItems: 'center',
    width: 16,
    flexShrink: 0,
  },
  title: {
    flex: 1,
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
  },
  body: {
    padding: `0 ${theme.spacing.md} ${theme.spacing.md}`,
  },
}
