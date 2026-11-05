import { useState, useMemo, type ReactElement, type CSSProperties } from 'react'
import { TEMPLATE_ICONS, iconCatalogue } from '../icons/registry'
import { Panel } from '../ui/Panel'
import { theme, INK_COLOR } from '../lib/theme'
import { useDiagramStore } from '../store/diagramStore'

const ICON_SIZE = 34
const PAGE_SIZE = 96

const CATEGORIES = [
  { key: 'all', label: 'Tous' },
  { key: 'mplate', label: 'DSL mplate' },
  { key: 'lucide', label: 'Lucide' },
]

export function IconPanel(): ReactElement {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const addShape = useDiagramStore(state => state.addShape)

  const filteredIcons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return iconCatalogue().filter(icon => {
      const matchesCategory = selectedCategory === 'all' || icon.source === selectedCategory
      if (!matchesCategory) return false

      if (!query) return true
      return icon.id.includes(query) || icon.id.replace(/-/g, ' ').includes(query)
    })
  }, [searchQuery, selectedCategory])

  const displayedIcons = useMemo(() => {
    return filteredIcons.slice(0, visibleCount)
  }, [filteredIcons, visibleCount])

  const handleIconClick = (name: string) => {
    addShape('icon', { x: 200, y: 200 }, { width: 60, height: 60 }, name)
  }

  return (
    <Panel title="Icônes" badge={`${filteredIcons.length}`}>
      <div style={styles.container}>
        <input
          type="text"
          placeholder="Rechercher une icône..."
          value={searchQuery}
          onChange={e => {
            setSearchQuery(e.target.value)
            setVisibleCount(PAGE_SIZE)
          }}
          style={styles.searchInput}
        />

        <div style={styles.categoryBar}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => {
                setSelectedCategory(cat.key)
                setVisibleCount(PAGE_SIZE)
              }}
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === cat.key ? styles.categoryButtonActive : {}),
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div style={styles.grid}>
          {displayedIcons.map(iconDef => {
            const Icon = TEMPLATE_ICONS[iconDef.id]
            if (!Icon) return null
            return (
              <div
                key={iconDef.id}
                className="ad-icon-grid-item"
                style={styles.item}
                title={iconDef.id}
                draggable
                onClick={() => handleIconClick(iconDef.id)}
                onDragStart={e => {
                  e.dataTransfer.setData('templateIcon', iconDef.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
              >
                <div style={styles.iconBox}>
                  <Icon size={24} color={INK_COLOR} />
                </div>
                <div style={styles.label}>{iconDef.id}</div>
              </div>
            )
          })}
        </div>

        {filteredIcons.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
            style={styles.loadMoreButton}
          >
            Afficher plus ({filteredIcons.length - visibleCount} restantes)
          </button>
        )}
      </div>
    </Panel>
  )
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  searchInput: {
    width: '100%',
    padding: '6px 10px',
    fontSize: 12,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    background: theme.color.bgCanvas,
    color: theme.color.textPrimary,
    outline: 'none',
    boxSizing: 'border-box',
  },
  categoryBar: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    maxHeight: 64,
    overflowY: 'auto',
  },
  categoryButton: {
    padding: '3px 8px',
    fontSize: 11,
    border: `1px solid ${theme.color.border}`,
    borderRadius: 12,
    background: theme.color.bgPanel,
    color: theme.color.textSecondary,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  categoryButtonActive: {
    background: theme.color.accent,
    color: '#ffffff',
    borderColor: theme.color.accent,
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))',
    gap: 6,
    maxHeight: 340,
    overflowY: 'auto',
    padding: 2,
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 4,
    cursor: 'pointer',
    borderRadius: theme.radius.sm,
    border: `1px solid transparent`,
    transition: theme.transition.fast,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: theme.color.bgPanel,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
  },
  label: {
    fontSize: 9,
    color: theme.color.textSecondary,
    marginTop: 3,
    textAlign: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 54,
  },
  loadMoreButton: {
    padding: '6px 12px',
    fontSize: 11,
    background: theme.color.bgCanvas,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    color: theme.color.accent,
    cursor: 'pointer',
    fontWeight: 500,
    marginTop: 4,
  },
}
