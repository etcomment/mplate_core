import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { theme } from '../lib/theme'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const baseStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing.xs,
  fontFamily: theme.font.sans,
  fontWeight: theme.font.weightMedium,
  borderRadius: theme.radius.sm,
  border: 'none',
  cursor: 'pointer',
  transition: theme.transition.fast,
  whiteSpace: 'nowrap',
  textDecoration: 'none',
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
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

const sizeStyles: Record<NonNullable<ButtonProps['size']>, React.CSSProperties> = {
  sm: {
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    fontSize: theme.font.sizeXs,
    minHeight: '28px',
  },
  md: {
    padding: `${theme.spacing.xs} ${theme.spacing.md}`,
    fontSize: theme.font.sizeSm,
    minHeight: '36px',
  },
  lg: {
    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
    fontSize: theme.font.sizeMd,
    minHeight: '44px',
  },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      style,
      className,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled ?? false
    const variantStyle = variantStyles[variant ?? 'primary']
    const sizeStyle = sizeStyles[size ?? 'md']

    const combinedStyle: React.CSSProperties = {
      ...baseStyles,
      ...variantStyle,
      ...sizeStyle,
      width: fullWidth ? '100%' : 'auto',
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
        {...props}
      >
        {iconPosition === 'left' && icon}
        {children}
        {iconPosition === 'right' && icon}
      </button>
    )
  }
)

Button.displayName = 'Button'