import { theme, BRAND_PALETTE } from '../../lib/theme'
import { ColorGrid } from '../../ui/ColorGrid'

const STANDARD_PALETTE = [
  'transparent', '#ffffff', '#f44336', '#e91e63', '#9c27b0', '#673ab7',
  '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688',
  '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107',
  '#ff9800', '#ff5722', '#795548', '#9e9e9e', '#607d8b',
  '#333333', '#000000',
] as const

export interface ColorFieldProps {
  label: string
  value: string
  onChange: (color: string) => void
}

export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div style={styles.section}>
      <label style={styles.label}>{label}</label>
      <ColorGrid label="Thème mplate" colors={[...BRAND_PALETTE]} value={value} onSelect={onChange} />
      <ColorGrid label="Standard" colors={[...STANDARD_PALETTE]} value={value} onSelect={onChange} />
      <div style={styles.customRow}>
        <label style={styles.customLabel}>Personnalisé</label>
        <input
          type="color"
          value={value && value !== 'transparent' && value !== 'none' ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          style={styles.colorInput}
        />
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: theme.spacing.md,
  },
  label: {
    display: 'block',
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    color: theme.color.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  customRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  customLabel: {
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
  },
  colorInput: {
    width: 36,
    height: 26,
    padding: 0,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    cursor: 'pointer',
    background: theme.color.bgPanel,
  },
}
