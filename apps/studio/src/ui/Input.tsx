import { forwardRef, type InputHTMLAttributes } from 'react'
import { theme } from '../lib/theme'

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  invalid?: boolean
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ label, error, hint, invalid, style, className, ...props }, ref) => {
    const isInvalid = invalid ?? Boolean(error)
    return (
      <div style={styles.container}>
        {label && <label style={styles.label}>{label}</label>}
        <input
          ref={ref}
          className={className}
          style={{
            ...styles.input,
            borderColor: isInvalid ? theme.color.danger : theme.color.border,
            ...style,
          }}
          aria-invalid={isInvalid}
          {...props}
        />
        {hint && !error && <div style={styles.hint}>{hint}</div>}
        {error && <div style={styles.error}>{error}</div>}
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(
  ({ label, value, onChange, min, max, step = 1, suffix, style, className, ...props }, ref) => {
    return (
      <div style={styles.container}>
        {label && <label style={styles.label}>{label}</label>}
        <div style={styles.inputGroup}>
          <input
            ref={ref}
            className={className}
            type="number"
            style={{
              ...styles.input,
              ...(suffix ? { paddingRight: theme.spacing.xl } : {}),
              ...style,
            }}
            value={Number.isFinite(value) ? value : ''}
            min={min}
            max={max}
            step={step}
            onChange={e => {
              const parsed = Number(e.target.value)
              if (e.target.value === '' || Number.isNaN(parsed)) {
                onChange(min ?? 0)
                return
              }
              onChange(parsed)
            }}
            {...props}
          />
          {suffix && <span style={styles.suffix}>{suffix}</span>}
        </div>
      </div>
    )
  }
)

NumberInput.displayName = 'NumberInput'

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
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeSm,
    fontFamily: theme.font.sans,
    color: theme.color.textPrimary,
    background: theme.color.bgPanel,
    transition: theme.transition.fast,
    outline: 'none',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  suffix: {
    position: 'absolute',
    right: theme.spacing.sm,
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
    pointerEvents: 'none',
  },
  hint: {
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
  },
  error: {
    fontSize: theme.font.sizeXs,
    color: theme.color.danger,
  },
}
