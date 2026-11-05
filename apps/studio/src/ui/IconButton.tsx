import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { theme } from '../lib/theme'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon: ReactNode
  tooltip?: string
  'aria-label'?: string
}

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: theme.radius.sm,
  border: 'none',
  cursor: 'pointer',
  transition: theme.transition.fast,
  flexShrink: 0,
}

const variantStyles: Record<NonNullable<IconButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    backgroundColor: theme.color.accent,
    color: theme.color.textOnPrimary,
    boxShadow: theme.shadow.xs,
  },
  secondary: {
    backgroundColor: theme.color.bgSurfaceHover,
    color: theme.color.textPrimary,
    border: `1px solid ${theme.color.border}`,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: theme.color.textSecondary,
  },
  danger: {
    backgroundColor: theme.color.danger,
    color: theme.color.textOnPrimary,
    boxShadow: theme.shadow.xs,
  },
}

const sizeStyles: Record<NonNullable<IconButtonProps['size']>, React.CSSProperties> = {
  sm: { width: '28px', height: '28px', fontSize: '14px' },
  md: { width: '36px', height: '36px', fontSize: '18px' },
  lg: { width: '44px', height: '44px', fontSize: '22px' },
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { variant = 'ghost', size = 'md', icon, tooltip, 'aria-label': ariaLabel, disabled, style, className, children, ...props },
    ref
  ) => {
    const isDisabled = disabled ?? false
    const variantStyle = variantStyles[variant ?? 'ghost']
    const sizeStyle = sizeStyles[size ?? 'md']

    const combinedStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyle,
      ...sizeStyle,
      opacity: isDisabled ? 0.5 : 1,
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      pointerEvents: isDisabled ? 'none' : 'auto',
      ...style,
    }

    return (
      <button
        ref={ref}
        className={className}
        disabled={isDisabled}
        style={combinedStyle}
        aria-label={ariaLabel ?? tooltip}
        title={tooltip}
        {...props}
      >
        {children ?? icon}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'