import { useState, useCallback, useRef } from 'react'
import { MermaidEditorBody } from './MermaidEditor'
import { TemplateDslEditorBody } from '../templates/panels/TemplateDslEditor'
import { Tabs, type TabItem } from '../ui/Tabs'
import { theme } from '../lib/theme'
import { useIsMobile } from '../hooks/useIsMobile'

export interface CodeDrawerProps {
  isOpen: boolean
  onClose: () => void
}

export function CodeDrawer({ isOpen, onClose }: CodeDrawerProps) {
  const [activeTab, setActiveTab] = useState('templates')
  const isMobile = useIsMobile()
  const [height, setHeight] = useState(() =>
    parseInt(isMobile ? theme.layout.drawerMinHeight : theme.layout.drawerDefaultHeight, 10)
  )
  const resizingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    if (resizingRef.current) return
    resizingRef.current = true
    const startY = e.clientY
    const startHeight = height
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY
      const next = Math.max(
        parseInt(theme.layout.drawerMinHeight, 10),
        Math.min(parseInt(theme.layout.drawerMaxHeight, 10), startHeight + delta)
      )
      setHeight(next)
    }
    const handleMouseUp = () => {
      resizingRef.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [height])

  const tabs: TabItem[] = [
    { id: 'templates', label: 'Template DSL' },
    { id: 'mermaid', label: 'Mermaid' },
  ]

  return (
    <div style={{ ...styles.drawer, height: isOpen ? height : 0 }} aria-hidden={!isOpen}>
      {isOpen && (
        <>
          <div style={styles.resizeHandle} onMouseDown={handleMouseDown} title="Redimensionner" />
          <div style={styles.header}>
            <Tabs tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
            <button style={styles.closeButton} onClick={onClose} title="Masquer l'éditeur de code">
              Masquer
            </button>
          </div>
          <div style={styles.body}>
            <div style={activeTab === 'mermaid' ? styles.view : styles.viewHidden}>
              <MermaidEditorBody />
            </div>
            <div style={activeTab === 'templates' ? styles.view : styles.viewHidden}>
              <TemplateDslEditorBody />
            </div>
          </div>
        </>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  drawer: {
    display: 'flex',
    flexDirection: 'column',
    background: theme.color.bgPanel,
    borderTop: `1px solid ${theme.color.border}`,
    overflow: 'hidden',
    flexShrink: 0,
    transition: 'height 200ms ease',
  },
  resizeHandle: {
    height: 4,
    cursor: 'row-resize',
    background: 'transparent',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing.md,
    flexShrink: 0,
  },
  closeButton: {
    border: 'none',
    background: 'transparent',
    color: theme.color.textSecondary,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    cursor: 'pointer',
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    transition: theme.transition.fast,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: `0 ${theme.spacing.lg} ${theme.spacing.lg}`,
    minHeight: 0,
  },
  view: {
    height: '100%',
  },
  viewHidden: {
    display: 'none',
  },
}
