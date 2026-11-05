import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { theme } from '../lib/theme'
import { IconButton } from './IconButton'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  width?: number
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, width = 600, children }: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div style={styles.overlay} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{ ...styles.panel, width, maxWidth: 'calc(100vw - 32px)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div style={styles.header}>
          {title && <h2 style={styles.title}>{title}</h2>}
          <IconButton size="sm" icon={<X size={16} />} tooltip="Fermer" onClick={onClose} />
        </div>
        <div style={styles.body}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: theme.color.bgOverlay,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: theme.zIndex.modal,
    padding: theme.spacing.lg,
  },
  panel: {
    background: theme.color.bgPanel,
    borderRadius: theme.radius.lg,
    boxShadow: theme.shadow.xl,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 64px)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
    borderBottom: `1px solid ${theme.color.border}`,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: theme.font.sizeLg,
    fontWeight: theme.font.weightSemibold,
    color: theme.color.textPrimary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  body: {
    padding: theme.spacing.lg,
    overflowY: 'auto',
  },
}
