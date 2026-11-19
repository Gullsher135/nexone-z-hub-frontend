// Fee schedule maths, kept free of React so it can be tested on its own.

const pad = (n) => String(n).padStart(2, '0');

// Same day next month(s). If that day does not exist (31 Jan + 1 month) it uses the last day (28 or 29 Feb).
export function addMonths(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const idx = (m - 1) + n;
  const year = y + Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12; // 0-11
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${pad(month + 1)}-${pad(Math.min(d, last))}`;
}

// total = everything the student owes. upfront = advance (new plan) or amount already received (existing plan).
// The upfront amount is the first row, so the rows always add up to the total.
export function buildSchedule({ total, upfront = 0, upfrontLabel = 'Advance', months = 1, firstDue, today }) {
  total = Math.round(Number(total) || 0);
  upfront = Math.round(Number(upfront) || 0);
  const remaining = total - upfront;
  if (total <= 0) return { error: 'Enter the fee first.', rows: [] };
  if (upfront < 0) return { error: 'Advance cannot be negative.', rows: [] };
  if (remaining < 0) return { error: 'Advance cannot be more than the total fee.', rows: [] };
  const rows = [];
  if (upfront > 0) rows.push({ label: upfrontLabel, dueDate: today, amount: upfront });
  if (remaining > 0) {
    const n = Math.max(1, Math.min(24, Math.floor(Number(months) || 1), remaining)); // never an installment of less than Rs 1
    const each = Math.floor(remaining / n);
    for (let i = 0; i < n; i += 1) {
      rows.push({ label: `Installment ${i + 1}`, dueDate: addMonths(firstDue, i), amount: i === n - 1 ? remaining - each * (n - 1) : each });
    }
  }
  return { error: '', rows };
}
