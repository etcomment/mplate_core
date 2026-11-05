import { type ReactNode } from 'react'
import { theme } from '../lib/theme'

export interface TabItem {
  id: string
  label: string
  icon?: ReactNode
  badge?: number
}

export interface TabsProps {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, activeId, onChange }: TabsProps) {
  return (
    <div style={styles.container} role="tablist">
      {tabs.map(tab => {
        const isActive = tab.id === activeId
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            style={{
              ...styles.tab,
              color: isActive ? theme.color.accent : theme.color.textSecondary,
              background: isActive ? theme.color.bgPanel : 'transparent',
              borderBottomColor: isActive ? theme.color.accent : 'transparent',
            }}
            onClick={() => onChange(tab.id)}
            title={tab.label}
          >
            {tab.icon && <span style={styles.icon}>{tab.icon}</span>}
            <span style={styles.label}>{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span style={styles.badge}>{tab.badge}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexShrink: 0,
    borderBottom: `1px solid ${theme.color.border}`,
    background: theme.color.bgSurfaceHover,
    gap: theme.spacing.xs,
    padding: `0 ${theme.spacing.xs}`,
    overflowX: 'auto',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightMedium,
    transition: theme.transition.fast,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
  },
  label: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    padding: `0 ${theme.spacing.xs}`,
    borderRadius: theme.radius.full,
    background: theme.color.bgPanelHover,
    color: theme.color.textSecondary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
  },
}
