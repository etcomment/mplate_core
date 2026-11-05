import { theme } from '../../lib/theme'

export const fieldStyles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionLabel: {
    display: 'block',
    fontSize: theme.font.sizeXs,
    fontWeight: theme.font.weightMedium,
    color: theme.color.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeSm,
    fontFamily: theme.font.sans,
    color: theme.color.textPrimary,
    background: theme.color.bgPanel,
    outline: 'none',
    transition: theme.transition.fast,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
    border: `1px solid ${theme.color.border}`,
    borderRadius: theme.radius.sm,
    fontSize: theme.font.sizeSm,
    fontFamily: theme.font.sans,
    color: theme.color.textPrimary,
    background: theme.color.bgPanel,
    outline: 'none',
    resize: 'vertical',
    transition: theme.transition.fast,
  },
  range: {
    flex: 1,
    cursor: 'pointer',
    accentColor: theme.color.accent,
  },
  rangeValue: {
    fontSize: theme.font.sizeXs,
    color: theme.color.textSecondary,
    minWidth: 32,
    textAlign: 'right',
  },
}
