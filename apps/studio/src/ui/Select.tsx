import { forwardRef, type SelectHTMLAttributes } from 'react'
import { theme } from '../lib/theme'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: ReadonlyArray<{ value: string; label: string }>
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, style, className, ...props }, ref) => {
    return (
      <div style={styles.container}>
        {label && <label style={styles.label}>{label}</label>}
        <select
          ref={ref}
          className={className}
          style={{ ...styles.select, ...style }}
          {...props}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    )
  }
)

Select.displayName = 'Select'

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    color: theme.color.textSecondary,
  },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeSm,
    fontFamily: theme.font.sans,
    color: theme.color.textPrimary,
    background: theme.color.bgPanel,
    cursor: 'pointer',
    transition: theme.transition.fast,
    outline: 'none',
  },
}
