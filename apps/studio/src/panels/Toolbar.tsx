import { useState, useRef } from 'react'
import { useDiagramStore } from '../store/diagramStore'
import { useTemplateStore } from '../templates/store'
import { Undo2, Redo2, Trash2, MousePointer2, Download, Link2, ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Group, Ungroup, ChevronsLeft, ChevronsRight, Share2, Terminal } from 'lucide-react'
import { downloadContentSvg } from '../export/generateSvg'
import { generateCanvasPng, generateCanvasJpg, downloadBlob, copyCanvasToClipboard } from '../export/generateImage'

interface ToolbarProps {
  leftSidebarCollapsed?: boolean
  onToggleLeftSidebar?: () => void
  rightPanelCollapsed?: boolean
  onToggleRightSidebar?: () => void
  codeDrawerOpen?: boolean
  onToggleCodeDrawer?: () => void
  onShare: () => Promise<boolean>
}

export function Toolbar({
  leftSidebarCollapsed = false,
  onToggleLeftSidebar,
  rightPanelCollapsed = false,
  onToggleRightSidebar,
  codeDrawerOpen = false,
  onToggleCodeDrawer,
  onShare,
}: ToolbarProps) {
  const canUndo = useDiagramStore(s => s.canUndo)
  const canRedo = useDiagramStore(s => s.canRedo)
  const undo = useDiagramStore(s => s.undo)
  const redo = useDiagramStore(s => s.redo)
  const selectedShapeIds = useDiagramStore(s => s.selectedShapeIds)
  const removeShape = useDiagramStore(s => s.removeShape)
  const clearSelection = useDiagramStore(s => s.clearSelection)
  const isConnectMode = useDiagramStore(s => s.isConnectMode)
  const toggleConnectMode = useDiagramStore(s => s.toggleConnectMode)
  const bringToFront = useDiagramStore(s => s.bringToFront)
  const sendToBack = useDiagramStore(s => s.sendToBack)
  const bringForward = useDiagramStore(s => s.bringForward)
  const sendBackward = useDiagramStore(s => s.sendBackward)

  const groupSelectedShapes = useDiagramStore(s => s.groupSelectedShapes)
  const ungroupSelectedShapes = useDiagramStore(s => s.ungroupSelectedShapes)
  const shapes = useDiagramStore(s => s.shapes)

  const selectedTemplateIds = useTemplateStore(s => s.selectedTemplateElementIds)
  const templateElementGroupIds = useTemplateStore(s => s.templateElementGroupIds)
  
  const selectedShapesArray = shapes.filter(s => selectedShapeIds.has(s.id))
  
  const canGroup = selectedShapeIds.size >= 2 || selectedTemplateIds.size >= 2
  const canUngroup = selectedShapesArray.some(s => s.groupId !== undefined) || 
    Array.from(selectedTemplateIds).some(id => templateElementGroupIds[id] !== undefined)


  const [exportOpen, setExportOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const exportButtonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null)

  const toggleExportMenu = () => {
    if (exportOpen) {
      setExportOpen(false)
      return
    }
    const element = exportButtonRef.current
    if (element) {
      const rect = element.getBoundingClientRect()
      setDropdownPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    }
    setExportOpen(true)
  }

  const hasSelection = selectedShapeIds.size > 0

  const handleBringToFront = () => {
    for (const id of selectedShapeIds) bringToFront(id)
  }
  const handleSendToBack = () => {
    for (const id of selectedShapeIds) sendToBack(id)
  }
  const handleBringForward = () => {
    for (const id of selectedShapeIds) bringForward(id)
  }
  const handleSendBackward = () => {
    for (const id of selectedShapeIds) sendBackward(id)
  }

  const handleDelete = () => {
    for (const id of selectedShapeIds) {
      removeShape(id)
    }
    clearSelection()
  }

  const prepareForExport = async () => {
    useDiagramStore.getState().clearSelection()
    useTemplateStore.getState().clearTemplateElementSelection()
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  const handleExportSvg = async () => {
    await prepareForExport()
    try {
      await downloadContentSvg()
    } catch {
      return
    }
    setExportOpen(false)
  }

  const handleExportPng = async () => {
    await prepareForExport()
    const blob = await generateCanvasPng()
    downloadBlob(blob, 'diagram.png')
    setExportOpen(false)
  }

  const handleExportJpg = async () => {
    await prepareForExport()
    const blob = await generateCanvasJpg()
    downloadBlob(blob, 'diagram.jpg')
    setExportOpen(false)
  }

  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    const ok = await onShare()
    if (ok) {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    }
  }

  const handleCopyImage = async () => {
    const ok = await copyCanvasToClipboard()
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={styles.bar} className="ad-toolbar-scroll">
      <button
        style={{
          ...styles.button,
          background: leftSidebarCollapsed ? '#4a90d9' : 'transparent',
          marginRight: 6,
        }}
        onClick={onToggleLeftSidebar}
        title={leftSidebarCollapsed ? 'Afficher le panneau gauche' : 'Masquer le panneau gauche'}
      >
        {leftSidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
      </button>
      <span style={styles.brand}>mplate <span style={{ fontWeight: 400, opacity: 0.75 }}>studio</span></span>
      <div style={styles.spacer} />
      <button
        style={{
          ...styles.button,
          background: isConnectMode ? '#4a90d9' : 'transparent',
          borderRadius: 4,
        }}
        onClick={toggleConnectMode}
        title={isConnectMode ? 'Quitter mode connexion' : 'Mode connexion'}
      >
        <Link2 size={18} />
      </button>
      <div style={styles.separator} />
      <div style={styles.group}>
        <button
          style={{ ...styles.button, opacity: canUndo ? 1 : 0.4 }}
          disabled={!canUndo}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          style={{ ...styles.button, opacity: canRedo ? 1 : 0.4 }}
          disabled={!canRedo}
          onClick={redo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>
      <div style={styles.separator} />
      <div style={styles.group}>
        <button
          style={{ ...styles.button, opacity: canGroup ? 1 : 0.4 }}
          disabled={!canGroup}
          onClick={() => {
            if (selectedTemplateIds.size > 0) {
              useTemplateStore.getState().groupTemplateElements()
            } else {
              groupSelectedShapes()
            }
          }}
          title="Grouper (Ctrl+G)"
        >
          <Group size={18} />
        </button>
        <button
          style={{ ...styles.button, opacity: canUngroup ? 1 : 0.4 }}
          disabled={!canUngroup}
          onClick={() => {
            if (selectedTemplateIds.size > 0) {
              useTemplateStore.getState().ungroupTemplateElements()
            } else {
              ungroupSelectedShapes()
            }
          }}
          title="Dégrouper (Ctrl+Shift+G)"
        >
          <Ungroup size={18} />
        </button>
      </div>
      <div style={styles.separator} />
      <div style={styles.group}>
        <button
          style={{ ...styles.button, opacity: hasSelection ? 1 : 0.4 }}
          disabled={!hasSelection}
          onClick={handleBringToFront}
          title="Premier plan (Ctrl+Shift+]"
        >
          <ChevronsUp size={18} />
        </button>
        <button
          style={{ ...styles.button, opacity: hasSelection ? 1 : 0.4 }}
          disabled={!hasSelection}
          onClick={handleBringForward}
          title="Avancer (Ctrl+])"
        >
          <ChevronUp size={18} />
        </button>
        <button
          style={{ ...styles.button, opacity: hasSelection ? 1 : 0.4 }}
          disabled={!hasSelection}
          onClick={handleSendBackward}
          title="Reculer (Ctrl+[)"
        >
          <ChevronDown size={18} />
        </button>
        <button
          style={{ ...styles.button, opacity: hasSelection ? 1 : 0.4 }}
          disabled={!hasSelection}
          onClick={handleSendToBack}
          title="Arrière-plan (Ctrl+Shift+[)"
        >
          <ChevronsDown size={18} />
        </button>
      </div>
      <div style={styles.separator} />
      <button
        style={{ ...styles.button, opacity: selectedShapeIds.size > 0 ? 1 : 0.4 }}
        disabled={selectedShapeIds.size === 0}
        onClick={handleDelete}
        title="Delete selected"
      >
        <Trash2 size={18} />
      </button>
      <button
        style={{ ...styles.button, opacity: selectedShapeIds.size > 0 ? 1 : 0.4 }}
        disabled={selectedShapeIds.size === 0}
        onClick={clearSelection}
        title="Deselect all"
      >
        <MousePointer2 size={18} />
      </button>
      <div style={styles.separator} />
      <div style={styles.dropdownContainer}>
        <button
          ref={exportButtonRef}
          style={styles.button}
          onClick={toggleExportMenu}
          title="Export"
        >
          <Download size={18} />
        </button>
        {exportOpen && dropdownPosition && (
          <div style={{ ...styles.dropdown, position: 'fixed', top: dropdownPosition.top, right: dropdownPosition.right }}>
            <button style={styles.dropdownItem} onClick={handleExportSvg}>SVG</button>
            <button style={styles.dropdownItem} onClick={handleExportPng}>PNG</button>
            <button style={styles.dropdownItem} onClick={handleExportJpg}>JPG</button>
            <div style={{ height: 1, background: '#555', margin: '4px 0' }} />
            <button style={styles.dropdownItem} onClick={handleCopyImage}>
              {copied ? 'Copié !' : 'Copier image'}
            </button>
          </div>
        )}
      </div>
      <div style={styles.separator} />
      <button
        style={{ ...styles.button, width: 'auto', background: '#2563eb', color: '#ffffff', gap: 6, paddingLeft: 10, paddingRight: 10 }}
        onClick={handleShare}
        title="Copier un lien de partage (le contenu est dans le lien, rien n'est envoyé à un serveur)"
      >
        <Share2 size={16} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>{shared ? 'Lien copié !' : 'Partager'}</span>
      </button>
      <div style={styles.separator} />
      <button
        style={{
          ...styles.button,
          background: codeDrawerOpen ? '#4a90d9' : 'transparent',
        }}
        onClick={onToggleCodeDrawer}
        title={codeDrawerOpen ? 'Masquer l\u2019éditeur de code' : 'Afficher l\u2019éditeur de code DSL'}
      >
        <Terminal size={18} />
      </button>
      <div style={styles.separator} />
      <button
        style={{
          ...styles.button,
          background: rightPanelCollapsed ? '#4a90d9' : 'transparent',
          marginLeft: 2,
        }}
        onClick={onToggleRightSidebar}
        title={rightPanelCollapsed ? 'Afficher le panneau droit' : 'Masquer le panneau droit'}
      >
        {rightPanelCollapsed ? <ChevronsLeft size={18} /> : <ChevronsRight size={18} />}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    padding: '0 12px',
    background: '#2c2c2c',
    color: '#fff',
    gap: 4,
    flexShrink: 0,
    overflowX: 'auto',
    overflowY: 'hidden',
  },
  brand: {
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  group: {
    display: 'flex',
    gap: 2,
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: 'none',
    borderRadius: 4,
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: '#555',
    margin: '0 8px',
  },
  dropdownContainer: {
    position: 'relative',
  },
  dropdown: {
    position: 'fixed',
    top: 0,
    right: 0,
    background: '#333',
    borderRadius: 4,
    padding: '4px 0',
    zIndex: 100,
    minWidth: 80,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  dropdownItem: {
    display: 'block',
    width: '100%',
    padding: '6px 16px',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: 13,
  },
}
