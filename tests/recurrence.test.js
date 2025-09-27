import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { generateNextRecurring, normalizeRids } from '../src/index.js'; // adjust path as needed

// Helpers: simple date factory
const D = (y, m, d) => new Date(y, m - 1, d);

// ------------------------------------------------------------------
// Test cases: Each has input, optional `now`, and expected output.
// ------------------------------------------------------------------
const cases = [
  {
    name: 'no recurrence returns null',
    input: 'Fix lamp',
    expect: null,
  },
  {
    name: 'simple daily recurrence unchanged',
    input: 'Meet friend for tea rec:1',
    expect: 'Meet friend for tea rec:1',
  },
  {
    name: 'recurs every 5 days from now',
    now: D(2021, 1, 2),
    input: 'Water flowers t:2021-01-01 rec:5d',
    expect: 'Water flowers t:2021-01-07 rec:5d',
  },
  {
    name: 'yearly strict recurrence',
    input: 'Send birthday greeting to friend t:2021-04-04 rec:+1y',
    expect: 'Send birthday greeting to friend t:2022-04-04 rec:+1y',
  },
  {
    name: 'monthly strict recurrence with due date',
    input: 'Pay rent t:2021-01-28 due:2021-02-01 rec:+1m',
    expect: 'Pay rent t:2021-02-28 due:2021-03-01 rec:+1m',
  },
  {
    name: 'two-week recurrence from now',
    now: D(2021, 1, 3),
    input: 'Do offline backup t:2021-01-01 due:2021-01-08 rec:2w',
    expect: 'Do offline backup t:2021-01-17 due:2021-01-24 rec:2w',
  },
  {
    name: 'month-end recurrence',
    now: D(2021, 1, 31),
    input: 'Get groceries t:2021-01-14 rec:1m',
    expect: 'Get groceries t:2021-02-28 rec:1m',
  },
  {
    name: 'strict month-end recurrence with due',
    input: 'Pay rent t:2021-01-31 due:2021-02-01 rec:+1m',
    expect: 'Pay rent t:2021-02-28 due:2021-03-01 rec:+1m',
  },
];

// ------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------
for (const c of cases) {
  test(c.name, () => {
    const result = generateNextRecurring(c.input, c.now);
    assert.equal(result, c.expect);
  });
}

test('Recurrence Ids get generated', () => {
	const tasks = [
		'Get groceries t:2021-01-14 rec:1m', // no rid, no change
		'Pay rent t:2021-01-28 due:2021-02-01 rec:+1m rid:new', // rid:new, generate
		'Do offline backup rid: t:2021-01-01 due:2021-01-08 rec:2w', // rid:, generate
		'Do offline backup rid:backup t:2021-01-01 due:2021-01-08 rec:2w', // rid:backup, exists, do nothing
		'Do offline backup rid:13 t:2021-01-01 due:2021-01-08 rec:2w', // rid:13, exists, do nothing
	];
	const expectedTasks = [
		'Get groceries t:2021-01-14 rec:1m',
		'Pay rent t:2021-01-28 due:2021-02-01 rec:+1m rid:14',
		'Do offline backup rid:15 t:2021-01-01 due:2021-01-08 rec:2w',
		'Do offline backup rid:backup t:2021-01-01 due:2021-01-08 rec:2w',
		'Do offline backup rid:13 t:2021-01-01 due:2021-01-08 rec:2w',
	];
	assert.equal(
		normalizeRids(tasks),
		expectedTasks
	)
})
test.run();
