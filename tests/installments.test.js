import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, buildSchedule } from '../src/lib/installments.js';

const sum = (rows) => rows.reduce((s, r) => s + r.amount, 0);

test('addMonths keeps the day and handles month ends', () => {
  assert.equal(addMonths('2026-11-17', 1), '2026-12-17');
  assert.equal(addMonths('2026-12-17', 1), '2027-01-17'); // year change
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28'); // not 3 March
  assert.equal(addMonths('2028-01-31', 1), '2028-02-29'); // leap year
  assert.equal(addMonths('2026-01-31', 2), '2026-03-31'); // back to the 31st
  assert.equal(addMonths('2026-03-15', -3), '2025-12-15');
});

test('1000 admission + 20000 course, 5000 advance, 4 months', () => {
  const { rows, error } = buildSchedule({ total: 21000, upfront: 5000, months: 4, firstDue: '2026-12-17', today: '2026-11-17' });
  assert.equal(error, '');
  assert.equal(rows.length, 5);
  assert.deepEqual(rows[0], { label: 'Advance', dueDate: '2026-11-17', amount: 5000 });
  assert.deepEqual(rows.slice(1).map((r) => r.amount), [4000, 4000, 4000, 4000]);
  assert.deepEqual(rows.slice(1).map((r) => r.dueDate), ['2026-12-17', '2027-01-17', '2027-02-17', '2027-03-17']);
  assert.equal(sum(rows), 21000);
});

test('uneven split: the last installment takes the remainder and the total never drifts', () => {
  for (const [total, upfront, months] of [[21000, 5000, 3], [20000, 0, 7], [999, 1, 3], [100001, 33333, 11]]) {
    const { rows } = buildSchedule({ total, upfront, months, firstDue: '2026-12-01', today: '2026-11-17' });
    assert.equal(sum(rows), total, `total ${total} upfront ${upfront} months ${months}`);
    assert.ok(rows.every((r) => Number.isInteger(r.amount) && r.amount >= 1));
  }
  const { rows } = buildSchedule({ total: 16000, upfront: 0, months: 3, firstDue: '2026-12-01', today: '2026-11-17' });
  assert.deepEqual(rows.map((r) => r.amount), [5333, 5333, 5334]);
});

test('no advance: no advance row', () => {
  const { rows } = buildSchedule({ total: 12000, upfront: 0, months: 3, firstDue: '2026-12-01', today: '2026-11-17' });
  assert.equal(rows.length, 3);
  assert.ok(rows.every((r) => r.label.startsWith('Installment')));
});

test('fully paid up front: only the advance row, no installments', () => {
  const { rows } = buildSchedule({ total: 21000, upfront: 21000, months: 4, firstDue: '2026-12-01', today: '2026-11-17' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].amount, 21000);
});

test('advance larger than the total is refused', () => {
  const r = buildSchedule({ total: 21000, upfront: 21001, months: 3, firstDue: '2026-12-01', today: '2026-11-17' });
  assert.match(r.error, /more than the total/);
  assert.equal(r.rows.length, 0);
});

test('tiny remainder never creates a Rs 0 installment', () => {
  const { rows } = buildSchedule({ total: 5002, upfront: 5000, months: 6, firstDue: '2026-12-01', today: '2026-11-17' });
  assert.equal(sum(rows), 5002);
  assert.ok(rows.every((r) => r.amount >= 1));
});

test('month count is limited to 1..24', () => {
  assert.equal(buildSchedule({ total: 240000, upfront: 0, months: 99, firstDue: '2026-12-01', today: '2026-11-17' }).rows.length, 24);
  assert.equal(buildSchedule({ total: 24000, upfront: 0, months: 0, firstDue: '2026-12-01', today: '2026-11-17' }).rows.length, 1);
});

test('start on the 31st stays on month ends', () => {
  const { rows } = buildSchedule({ total: 3000, upfront: 0, months: 3, firstDue: '2026-01-31', today: '2026-01-10' });
  assert.deepEqual(rows.map((r) => r.dueDate), ['2026-01-31', '2026-02-28', '2026-03-31']);
});
