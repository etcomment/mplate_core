import { useEffect, useState, useCallback, useRef } from 'react'
import { Shapes, LayoutTemplate, ZoomIn, ZoomOut, X } from 'lucide-react'
import { theme } from './lib/theme'
import { Tabs, type TabItem } from './ui/Tabs'
import { IconButton } from './ui/IconButton'
import { CodeDrawer } from './panels/CodeDrawer'
import { Canvas } from './editor/Canvas'
import { ShapeLibrary } from './panels/ShapeLibrary'
import { IconPanel } from './panels/IconPanel'
import { PropertiesPanel } from './panels/properties/PropertiesPanel'
import { TemplatePanel } from './templates/panels/TemplatePanel'
import { Toolbar } from './panels/Toolbar'
import { SubgraphStylePanel } from './panels/SubgraphStylePanel'
import { LayersPanel } from './panels/LayersPanel'
import { useDiagramStore } from './store/diagramStore'
import { useTemplateStore } from './templates/store'
import { MOBILE_QUERY, useIsMobile } from './hooks/useIsMobile'
import { copyShareLink, restoreInitialState, startDraftAutosave } from './templates/session'
import { fitTemplateToCanvas } from './templates/viewport'
import type { Shape, ShapeStyle, ShapeText, ShapeType, Position, Dimensions } from './core/model/Shape'

interface ClipboardShape {
  type: ShapeType
  position: Position
  dimensions: Dimensions
  style: ShapeStyle
  text: ShapeText
}

let clipboardShapes: ClipboardShape[] | null = null

export function App() {
  const undo = useDiagramStore(s => s.undo)
  const redo = useDiagramStore(s => s.redo)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const removeShape = useDiagramStore(s => s.removeShape)
  const clearSelection = useDiagramStore(s => s.clearSelection)

  const [sidebarTab, setSidebarTab] = useState('templates')
  const [codeDrawerOpen, setCodeDrawerOpen] = useState(() => !window.matchMedia(MOBILE_QUERY).matches)

  const isMobile = useIsMobile()

  const viewBox = useDiagramStore(s => s.viewBox)
  const setViewBox = useDiagramStore(s => s.setViewBox)
  const shapeCount = useDiagramStore(s => s.shapes.length)
  const templateId = useTemplateStore(s => s.activeTemplate)
  const templateElementCount = useTemplateStore(s => s.result?.elements.length ?? 0)
  const templateDiagnostics = useTemplateStore(s => s.result?.diagnostics ?? [])

  useEffect(() => {
    restoreInitialState(window.location, 'process:chevrons')
    const frame = requestAnimationFrame(() => fitTemplateToCanvas())
    const stopAutosave = startDraftAutosave()
    return () => {
      cancelAnimationFrame(frame)
      stopAutosave()
    }
  }, [])

  const [sidebarWidth, setSidebarWidth] = useState(parseInt(theme.layout.sidebarDefaultWidth, 10))
  const [rightPanelWidth, setRightPanelWidth] = useState(parseInt(theme.layout.rightPanelDefaultWidth, 10))
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(isMobile)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(isMobile)
  const [hoveredHandle, setHoveredHandle] = useState<'sidebar' | 'rightPanel' | null>(null)

  const isResizing = useRef<'sidebar' | 'rightPanel' | null>(null)

  const [resizing, setResizing] = useState<'sidebar' | 'rightPanel' | null>(null)

  const handleMouseDown = useCallback((target: 'sidebar' | 'rightPanel') => {
    isResizing.current = target
    setResizing(target)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return

    if (isResizing.current === 'sidebar') {
      const newWidth = e.clientX
      setSidebarWidth(Math.max(parseInt(theme.layout.sidebarMinWidth, 10), Math.min(parseInt(theme.layout.sidebarMaxWidth, 10), newWidth)))
    } else {
      const newWidth = window.innerWidth - e.clientX
      setRightPanelWidth(Math.max(parseInt(theme.layout.rightPanelMinWidth, 10), Math.min(parseInt(theme.layout.rightPanelMaxWidth, 10), newWidth)))
    }
  }, [])

  const handleMouseUp = useCallback(() => {
    isResizing.current = null
    setResizing(null)
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const isInput = Boolean(
        target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest?.('.cm-editor')
        )
      )
      if (isInput) return

      const isMod = e.ctrlKey || e.metaKey

      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if (isMod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
        return
      }

      if (isMod && (e.key === 'g' || e.key === 'G')) {
        e.preventDefault()
        
        const state = useDiagramStore.getState()
        const tState = useTemplateStore.getState()

        if (e.shiftKey) {
          if (tState.selectedTemplateElementIds.size > 0) {
            tState.ungroupTemplateElements()
          } else {
            state.ungroupSelectedShapes()
          }
        } else {
          if (tState.selectedTemplateElementIds.size > 0) {
            tState.groupTemplateElements()
          } else {
            state.groupSelectedShapes()
          }
        }
        return
      }

      if (isMod && (e.key === ']' || e.key === '[')) {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

        if (selectedShapeIds.size > 0) {
          e.preventDefault()
          const state = useDiagramStore.getState()
          if (e.key === ']') {
            if (e.shiftKey) {
              for (const id of selectedShapeIds) state.bringToFront(id)
            } else {
              for (const id of selectedShapeIds) state.bringForward(id)
            }
          } else if (e.key === '[') {
            if (e.shiftKey) {
              for (const id of selectedShapeIds) state.sendToBack(id)
            } else {
              for (const id of selectedShapeIds) state.sendBackward(id)
            }
          }
          return
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        for (const id of selectedShapeIds) {
          removeShape(id)
        }
        clearSelection()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, selectedShapeIds, removeShape, clearSelection])

  useEffect(() => {
    function isEditingTarget(el: HTMLElement): boolean {
      return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
    }

    function handleCopyPaste(e: KeyboardEvent) {
      const isMod = e.ctrlKey || e.metaKey
      const target = e.target as HTMLElement
      if (isEditingTarget(target)) return

      if (isMod && e.key === 'c') {
        const state = useDiagramStore.getState()
        const { selectedShapeIds, selectedDiagramElementIds } = state
        const model = state.getModel()

        const allIds = [...new Set([...selectedShapeIds, ...selectedDiagramElementIds])]
        const shapes = allIds
          .map(id => model.getShape(id))
          .filter((s): s is Shape => s !== undefined)

        if (shapes.length === 0) return

        e.preventDefault()

        const shapesData: ClipboardShape[] = shapes.map(s => ({
          type: s.type,
          position: { x: s.position.x, y: s.position.y },
          dimensions: { width: s.dimensions.width, height: s.dimensions.height },
          style: { ...s.style },
          text: { ...s.text },
        }))

        clipboardShapes = shapesData
        const json = JSON.stringify({ source: 'mplate-studio', shapes: shapesData })
        navigator.clipboard.writeText(json).catch(() => {})
        return
      }

      if (isMod && e.key === 'v') {
        const state = useDiagramStore.getState()

        const pasteFromData = (shapesData: ClipboardShape[]) => {
          for (const s of shapesData) {
            const shape = state.addShape(
              s.type,
              { x: s.position.x + 30, y: s.position.y + 30 },
              s.dimensions,
            )
            state.updateShapeStyle(shape.id, s.style)
            state.updateShapeText(shape.id, s.text)
          }
        }

        const parseAndPaste = (text: string): boolean => {
          let data: { source?: string; shapes?: ClipboardShape[] }
          try {
            data = JSON.parse(text)
          } catch {
            return false
          }
          if (data.source !== 'mplate-studio' || !data.shapes || data.shapes.length === 0) return false
          pasteFromData(data.shapes)
          return true
        }

        e.preventDefault()

        navigator.clipboard.readText()
          .then(text => {
            if (!parseAndPaste(text) && clipboardShapes) {
              pasteFromData(clipboardShapes)
            }
          })
          .catch(() => {
            if (clipboardShapes) {
              pasteFromData(clipboardShapes)
            }
          })

        return
      }
    }

    window.addEventListener('keydown', handleCopyPaste)
    return () => window.removeEventListener('keydown', handleCopyPaste)
  }, [])

  const handleZoomIn = useCallback(() => {
    setViewBox({ ...viewBox, scale: Number(Math.min(5, viewBox.scale + 0.1).toFixed(3)) })
  }, [viewBox, setViewBox])

  const handleZoomOut = useCallback(() => {
    setViewBox({ ...viewBox, scale: Number(Math.max(0.1, viewBox.scale - 0.1).toFixed(3)) })
  }, [viewBox, setViewBox])

  const handleZoomReset = useCallback(() => {
    setViewBox({ ...viewBox, scale: 1 })
  }, [viewBox, setViewBox])

  const sidebarTabs: TabItem[] = [
    { id: 'forms', label: 'Formes', icon: <Shapes size={14} /> },
    { id: 'templates', label: 'Templates', icon: <LayoutTemplate size={14} /> },
  ]

  const zoomControls = (
    <div style={styles.zoomControls}>
      <IconButton
        size="sm"
        variant="secondary"
        icon={<ZoomOut size={14} />}
        tooltip="Zoom arrière"
        onClick={handleZoomOut}
      />
      <button style={styles.zoomValue} onClick={handleZoomReset} title="Réinitialiser le zoom">
        {Math.round(viewBox.scale * 100)}%
      </button>
      <IconButton
        size="sm"
        variant="secondary"
        icon={<ZoomIn size={14} />}
        tooltip="Zoom avant"
        onClick={handleZoomIn}
      />
    </div>
  )

  const sidebarTabContent = (
    <div style={styles.sidebarContent}>
      {sidebarTab === 'forms' && (
        <>
          <ShapeLibrary />
          <IconPanel />
          <SubgraphStylePanel />
        </>
      )}
      {sidebarTab === 'templates' && (
        <>
          <TemplatePanel />
        </>
      )}
    </div>
  )

  return (
    <div style={styles.container}>
      <Toolbar
        leftSidebarCollapsed={leftSidebarCollapsed}
        onToggleLeftSidebar={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        rightPanelCollapsed={rightPanelCollapsed}
        onToggleRightSidebar={() => setRightPanelCollapsed(!rightPanelCollapsed)}
        codeDrawerOpen={codeDrawerOpen}
        onToggleCodeDrawer={() => setCodeDrawerOpen(!codeDrawerOpen)}
        onShare={() => copyShareLink(window.location)}
      />
      <div style={styles.workspace}>
        {isMobile ? (
          <>
            <div style={styles.canvas}>
              <Canvas />
              {zoomControls}
            </div>
            {!leftSidebarCollapsed && (
              <div style={styles.mobileBackdrop} onClick={() => setLeftSidebarCollapsed(true)}>
                <div style={styles.mobilePanelLeft} onClick={e => e.stopPropagation()}>
                  <div style={styles.mobilePanelHeader}>
                    <span style={styles.mobilePanelTitle}>
                      {sidebarTab === 'templates' ? 'Templates' : 'Formes'}
                    </span>
                    <IconButton
                      size="sm"
                      icon={<X size={16} />}
                      tooltip="Fermer"
                      onClick={() => setLeftSidebarCollapsed(true)}
                    />
                  </div>
                  <Tabs tabs={sidebarTabs} activeId={sidebarTab} onChange={setSidebarTab} />
                  {sidebarTabContent}
                </div>
              </div>
            )}
            {!rightPanelCollapsed && (
              <div style={styles.mobileBackdrop} onClick={() => setRightPanelCollapsed(true)}>
                <div style={styles.mobilePanelRight} onClick={e => e.stopPropagation()}>
                  <div style={styles.mobilePanelHeader}>
                    <span style={styles.mobilePanelTitle}>Calques & Propriétés</span>
                    <IconButton
                      size="sm"
                      icon={<X size={16} />}
                      tooltip="Fermer"
                      onClick={() => setRightPanelCollapsed(true)}
                    />
                  </div>
                  <LayersPanel />
                  <PropertiesPanel />
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {!leftSidebarCollapsed && (
              <div style={{ ...styles.sidebar, width: sidebarWidth, maxWidth: 'none' }}>
                <Tabs tabs={sidebarTabs} activeId={sidebarTab} onChange={setSidebarTab} />
                {sidebarTabContent}
                <div
                  style={{
                    ...styles.resizeHandle,
                    borderRightColor: hoveredHandle === 'sidebar' || resizing === 'sidebar' ? '#bbb' : 'transparent',
                  }}
                  onMouseDown={() => handleMouseDown('sidebar')}
                  onMouseEnter={() => setHoveredHandle('sidebar')}
                  onMouseLeave={() => setHoveredHandle(null)}
                />
              </div>
            )}
            <div style={styles.canvas}>
              <Canvas />
              {zoomControls}
            </div>
            {!rightPanelCollapsed && (
              <div style={{ ...styles.rightPanels, width: rightPanelWidth, maxWidth: 'none' }}>
                <div
                  style={{
                    ...styles.resizeHandle,
                    left: 0,
                    right: 'auto',
                    borderRight: 'none',
                    borderLeft: '3px solid transparent',
                    borderLeftColor: hoveredHandle === 'rightPanel' || resizing === 'rightPanel' ? '#bbb' : 'transparent',
                  }}
                  onMouseDown={() => handleMouseDown('rightPanel')}
                  onMouseEnter={() => setHoveredHandle('rightPanel')}
                  onMouseLeave={() => setHoveredHandle(null)}
                />
                <LayersPanel />
                <PropertiesPanel />
              </div>
            )}
          </>
        )}
      </div>

      <CodeDrawer
        isOpen={codeDrawerOpen}
        onClose={() => setCodeDrawerOpen(false)}
      />

      <div style={styles.statusBar}>
        <span style={styles.statusItem}>{shapeCount} élément{shapeCount > 1 ? 's' : ''}</span>
        <span style={styles.statusDivider} />
        <span style={styles.statusItem}>
          {sidebarTab === 'templates' ? 'Galerie de templates' : 'Bibliothèque de formes'}
        </span>
        {templateId ? (
          <>
            <span style={styles.statusDivider} />
            <span style={styles.statusItem}>{templateId} · {templateElementCount} élément{templateElementCount > 1 ? 's' : ''} de template</span>
          </>
        ) : null}
        {templateDiagnostics.length > 0 ? (
          <>
            <span style={styles.statusDivider} />
            <span style={{ ...styles.statusItem, color: templateDiagnostics.some(d => d.severity === 'error') ? '#ff8a80' : '#ffd180' }}>
              {templateDiagnostics.length} diagnostic{templateDiagnostics.length > 1 ? 's' : ''} DSL
            </span>
          </>
        ) : null}
        <span style={{ ...styles.statusItem, marginLeft: 'auto', opacity: 0.7 }}>mplate studio · sans compte · rien n'est envoyé à un serveur</span>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    fontFamily: theme.font.sans,
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${theme.color.border}`,
    flexShrink: 0,
    position: 'relative',
    background: theme.color.bgPanel,
  },
  sidebarContent: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  workspace: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    background: theme.color.bgCanvas,
  },
  zoomControls: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.xs,
    background: theme.color.bgPanel,
    borderRadius: theme.radius.md,
    boxShadow: theme.shadow.md,
    padding: theme.spacing.xs,
    zIndex: 10,
  },
  zoomValue: {
    minWidth: 48,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: 'none',
    background: 'transparent',
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    color: theme.color.textSecondary,
    cursor: 'pointer',
    textAlign: 'center',
    transition: theme.transition.fast,
  },
  statusBar: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.md,
    height: 28,
    padding: `0 ${theme.spacing.md}`,
    background: theme.color.toolbar,
    color: theme.color.toolbarText,
    fontSize: theme.font.sizeXs,
    flexShrink: 0,
    overflow: 'hidden',
  },
  statusItem: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  statusDivider: {
    width: 1,
    height: 14,
    background: 'rgba(255, 255, 255, 0.2)',
    flexShrink: 0,
  },
  rightPanels: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: theme.layout.rightPanelMinWidth,
    maxWidth: theme.layout.rightPanelMaxWidth,
    overflow: 'auto',
    borderLeft: `1px solid ${theme.color.border}`,
    position: 'relative',
  },
  mobileBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: theme.color.bgOverlay,
    zIndex: 210,
    display: 'flex',
    animation: 'ad-fade-in 160ms ease',
  },
  mobilePanelLeft: {
    width: 'min(85vw, 320px)',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: theme.color.bgPanel,
    borderRight: `1px solid ${theme.color.border}`,
    boxShadow: theme.shadow.lg,
    animation: 'ad-slide-in-left 200ms ease',
  },
  mobilePanelRight: {
    width: 'min(85vw, 320px)',
    height: '100%',
    marginLeft: 'auto',
    display: 'flex',
    flexDirection: 'column',
    background: theme.color.bgPanel,
    borderLeft: `1px solid ${theme.color.border}`,
    boxShadow: theme.shadow.lg,
    animation: 'ad-slide-in-right 200ms ease',
    overflowY: 'auto',
  },
  mobilePanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderBottom: `1px solid ${theme.color.border}`,
    background: theme.color.bgSurfaceHover,
    flexShrink: 0,
  },
  mobilePanelTitle: {
    fontSize: theme.font.sizeSm,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textPrimary,
  },
  resizeHandle: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 3,
    cursor: 'col-resize',
    zIndex: 10,
    borderRight: '3px solid transparent',
    transition: 'border-color 0.15s',
    background: 'transparent',
  },
}
