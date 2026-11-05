import { useMemo, useState } from 'react'
import { BUILT_IN_THEMES, listTemplates, type IdentityCard } from '@mplate/core'
import { useTemplateStore } from '../store'
import { fitTemplateToCanvas } from '../viewport'
import { Panel } from '../../ui/Panel'
import { Select } from '../../ui/Select'
import { theme } from '../../lib/theme'

const FAMILY_LABELS: Record<string, string> = {
  process: 'Processus',
  timeline: 'Chronologies',
  funnel: 'Entonnoirs',
  pyramid: 'Pyramides',
  cycle: 'Cycles',
  brain: 'Cartes mentales',
  cards: 'Cartes',
  kpi: 'Indicateurs',
  comparison: 'Comparaisons',
  matrix: 'Matrices',
  org: 'Organigrammes',
  stack: 'Architecture',
  venn: 'Venn',
}

const WIDTH_OPTIONS = [
  { value: '1200', label: '1200 px (diapositive)' },
  { value: '960', label: '960 px' },
  { value: '800', label: '800 px (document)' },
  { value: '1600', label: '1600 px' },
]

function groupByFamily(cards: IdentityCard[]): Map<string, IdentityCard[]> {
  const groups = new Map<string, IdentityCard[]>()
  for (const card of cards) {
    const list = groups.get(card.family) ?? []
    list.push(card)
    groups.set(card.family, list)
  }
  for (const list of groups.values()) list.sort((left, right) => Number(right.isDefaultStyle) - Number(left.isDefaultStyle))
  return groups
}

export function TemplatePanel() {
  const activeTemplate = useTemplateStore(s => s.activeTemplate)
  const selectTemplate = useTemplateStore(s => s.selectTemplate)
  const clearTemplate = useTemplateStore(s => s.clearTemplate)
  const themeName = useTemplateStore(s => s.themeName)
  const setTheme = useTemplateStore(s => s.setTheme)
  const templateWidth = useTemplateStore(s => s.templateWidth)
  const setTemplateWidth = useTemplateStore(s => s.setTemplateWidth)

  const [query, setQuery] = useState('')
  const categories = useMemo(() => groupByFamily(listTemplates()), [])
  const categoryNames = [...categories.keys()]
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(categoryNames.length > 0 ? [categoryNames[0]!] : [])
  )

  const normalizedQuery = query.trim().toLowerCase()
  const matches = (card: IdentityCard) => !normalizedQuery || [card.name, card.id, card.description, ...card.useCases, ...card.tags].some(text => text.toLowerCase().includes(normalizedQuery))

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(category)) next.delete(category)
      else next.add(category)
      return next
    })
  }

  const themeOptions = Object.values(BUILT_IN_THEMES).map(item => ({ value: item.name, label: item.name }))

  return (
    <Panel title="Templates" badge={listTemplates().length}>
      <div style={styles.settingsRow}>
        <Select label="Thème" value={themeName} options={themeOptions} onChange={e => setTheme(e.target.value)} />
        <Select label="Largeur" value={String(templateWidth)} options={WIDTH_OPTIONS} onChange={e => setTemplateWidth(Number(e.target.value))} />
      </div>
      <input
        type="search"
        placeholder="Rechercher un template..."
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={styles.searchInput}
      />
      {categoryNames.map((category) => {
        const templates = categories.get(category)!.filter(matches)
        if (templates.length === 0) return null
        const isExpanded = normalizedQuery !== '' || expandedCategories.has(category)
        return (
          <div key={category} style={styles.category}>
            <div style={styles.categoryHeader} onClick={() => toggleCategory(category)}>
              <span style={styles.arrow}>{isExpanded ? '▼' : '▶'}</span>
              {FAMILY_LABELS[category] ?? category}
              <span style={styles.count}>{templates.length}</span>
            </div>
            {isExpanded && templates.map((card) => {
              const isActive = activeTemplate === card.id
              return (
                <button
                  key={card.id}
                  title={card.description}
                  style={{
                    ...styles.templateButton,
                    background: isActive ? theme.color.accent : theme.color.bgSurfaceHover,
                    color: isActive ? theme.color.textOnPrimary : theme.color.textSecondary,
                    border: isActive ? `1px solid ${theme.color.accent}` : `1px solid ${theme.color.border}`,
                  }}
                  onClick={() => {
                    selectTemplate(card.id)
                    requestAnimationFrame(() => fitTemplateToCanvas())
                  }}
                >
                  <span style={styles.templateName}>{card.name}</span>
                  <span style={{ ...styles.templateId, color: isActive ? theme.color.textOnPrimary : theme.color.disabled }}>{card.id}</span>
                </button>
              )
            })}
          </div>
        )
      })}

      {activeTemplate && (
        <button style={styles.clearButton} onClick={clearTemplate}>
          Effacer le template
        </button>
      )}
    </Panel>
  )
}

const styles: Record<string, React.CSSProperties> = {
  settingsRow: {
    display: 'flex',
    gap: theme.spacing.sm,
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
    marginBottom: theme.spacing.sm,
  },
  category: {
    marginBottom: theme.spacing.sm,
  },
  categoryHeader: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: theme.spacing.xs,
    paddingLeft: 2,
    cursor: 'pointer',
    userSelect: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  count: {
    marginLeft: 'auto',
    fontWeight: theme.font.weightMedium,
    color: theme.color.disabled,
  },
  arrow: {
    fontSize: 10,
    display: 'inline-block',
    width: 12,
    textAlign: 'center' as const,
  },
  templateButton: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    width: '100%',
    textAlign: 'left' as const,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    cursor: 'pointer',
    border: `1px solid ${theme.color.border}`,
    marginBottom: 3,
    transition: theme.transition.fast,
  },
  templateName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  templateId: {
    fontFamily: theme.font.mono,
    fontSize: 10,
    flexShrink: 0,
  },
  clearButton: {
    width: '100%',
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightSemibold,
    cursor: 'pointer',
    border: `1px solid ${theme.color.border}`,
    background: 'rgba(211, 47, 47, 0.06)',
    color: theme.color.danger,
    marginTop: theme.spacing.sm,
  },
}
