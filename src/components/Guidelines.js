export default function Guidelines() {
  return (
    <section
      style={{
        marginTop: 14,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Rules & Guidelines</h2>
      <p style={{ marginTop: 0, opacity: 0.8 }}>Last Updated: December 2025</p>
      <ul style={{ lineHeight: 1.6 }}>
        <li>
          For all income and losses, track how much is saved / lost per month
          (Alex, Adriana, Together)
        </li>
        <li>
          Expense categories: Fixed Expenses, Rent/Mortgages, Food, Dogs,
          Holidays & Birthdays, Adventure, Unexpected
        </li>
        <li>Income categories: Salary, Investments, Extra</li>
        <li>
          Any expense over the threshold is flagged (categorized as Unexpected)
        </li>
        <li>Any income over the threshold is flagged (categorized as Extra)</li>
        <li>
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
