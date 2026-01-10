import { colors, styles } from '@/lib/theme';

export default function Guidelines() {
  return (
    <section style={{ ...styles.card, marginTop: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Rules & Guidelines</h2>
      <p
        style={{
          marginTop: 0,
          marginBottom: 16,
          fontSize: 13,
          color: colors.textMuted,
        }}
      >
        Last Updated: December 2025
      </p>
      <ul
        style={{
          lineHeight: 1.7,
          color: colors.textSecondary,
          paddingLeft: 20,
          margin: 0,
        }}
      >
        <li style={{ marginBottom: 8 }}>
          For all income and losses, track how much is saved / lost per month
          (Alex, Adriana, Together)
        </li>
        <li style={{ marginBottom: 8 }}>
          <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
            Expense categories:
          </span>{' '}
          Fixed Expenses, Rent/Mortgages, Food, Dogs, Holidays & Birthdays,
          Adventure, Unexpected
        </li>
        <li style={{ marginBottom: 8 }}>
          <span style={{ color: colors.textPrimary, fontWeight: 500 }}>
            Income categories:
          </span>{' '}
          Salary, Investments, Extra
        </li>
        <li style={{ marginBottom: 8 }}>
          Any expense over the threshold is flagged (categorized as Unexpected)
        </li>
        <li style={{ marginBottom: 8 }}>
          Any income over the threshold is flagged (categorized as Extra)
        </li>
        <li style={{ marginBottom: 8 }}>
          Update each month by month-end — discuss together at least once after
          updates
        </li>
        <li>
          Notify each other before new recurring costs or spending over the
          threshold
        </li>
      </ul>
    </section>
  );
}
