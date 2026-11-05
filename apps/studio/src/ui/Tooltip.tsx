import { type ReactNode } from 'react'
import { theme } from '../lib/theme'

export interface TooltipProps {
  content: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, side = 'bottom' }: TooltipProps) {
  return (
    <span style={styles.wrapper}>
      {children}
      <span style={{ ...styles.tooltip, ...positionStyles[side] }} role="tooltip">
        {content}
      </span>
    </span>
  )
}

const positionStyles: Record<NonNullable<TooltipProps['side']>, React.CSSProperties> = {
  top: { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
  bottom: { top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
  left: { right: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
  right: { left: 'calc(100% + 6px)', top: '50%', transform: 'translateY(-50%)' },
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
  },
  tooltip: {
    position: 'absolute',
    zIndex: theme.zIndex.tooltip,
    background: theme.color.textPrimary,
    color: theme.color.textOnDark,
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightNormal,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    opacity: 0,
    visibility: 'hidden',
    transition: `opacity ${theme.duration.fast} ease, visibility ${theme.duration.fast} ease`,
    boxShadow: theme.shadow.sm,
    textTransform: 'none',
    letterSpacing: 'normal',
  },
}
