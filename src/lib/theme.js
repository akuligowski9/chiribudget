// Earth tone color palette with slate blue accent
export const colors = {
  // Primary earth tones
  cream: '#FAF7F2',
  sand: '#E8E0D5',
  warmGray: '#9C9589',
  stone: '#6B6560',
  charcoal: '#3D3835',

  // Accent earth tones
  sage: '#7D8471',
  olive: '#5C5C44',
  terracotta: '#C4785E',
  clay: '#A65D4E',

  // Slate blue accent
  slate: '#5B7B95',
  slateLight: '#7A9BB5',
  slateDark: '#4A6578',

  // Functional colors (softened)
  success: '#6B8E6B',
  error: '#B5594E',
  warning: '#C9A962',
  info: '#5B7B95',

  // Income/Expense
  income: '#5E8C61',
  expense: '#B5594E',

  // Backgrounds
  bgPrimary: '#F5D4BE',
  bgCard: '#FFFFFF',
  bgHover: '#F5F0E8',
  bgActive: '#EDE6DB',

  // Text
  textPrimary: '#3D3835',
  textSecondary: '#6B6560',
  textMuted: '#9C9589',

  // Borders
  border: '#E8E0D5',
  borderLight: '#F0EBE3',
};

// Shared styles
export const styles = {
  card: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 1px 3px rgba(61, 56, 53, 0.06)',
  },
  cardHover: {
    boxShadow: '0 2px 8px rgba(61, 56, 53, 0.1)',
  },
  button: {
    padding: '10px 18px',
    borderRadius: 8,
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  buttonPrimary: {
    background: colors.slate,
    color: '#FFFFFF',
  },
  buttonSecondary: {
    background: colors.sand,
    color: colors.charcoal,
  },
  input: {
    padding: '10px 14px',
    borderRadius: 8,
    border: `1px solid ${colors.border}`,
    fontSize: 15,
    background: colors.bgCard,
    color: colors.textPrimary,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  inputFocus: {
    borderColor: colors.warmGray,
  },
  label: {
    fontSize: 14,
    fontWeight: 500,
    color: colors.textSecondary,
    marginBottom: 6,
  },
};
