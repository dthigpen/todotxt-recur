import {
    getKeyValues,
    replaceSpan,
} from 'todotxt-utils';

import { parseISO, addDays, addWeeks, addMonths, addYears } from 'date-fns';

function getValue(task, key) {
    return getKeyValues(task).find((s) => s.key === key) ?? null;
}
/**
 * Normalizes tasks with rid:new or empty rid and assigns unique incrementing IDs.
 * @param {string[]} tasks - Array of todo.txt task strings.
 * @returns {string[]} Array with normalized IDs.
 */
export function normalizeRids(tasks) {
    let maxId = 0;
    const ridRegex = /^(\d+)$/;

    // Step 1: find the max existing numeric rid
    for (const task of tasks) {
        const ridSpan = getValue(task, 'rid');
        if (ridSpan && ridRegex.test(ridSpan.value)) {
            maxId = Math.max(maxId, parseInt(ridSpan.value, 10));
        }
    }

    // Step 2: assign new IDs to rid:new or empty rid
    let nextId = maxId + 1;
    return tasks.map((task) => {
        const ridSpan = getValue(task, 'rid');
        if (ridSpan?.value === 'new') {
            const assigned = nextId++;
            return task.replace(/rid:new/, `rid:${assigned}`);
        }
        if (/rid:($|\s)/.test(task)) {
            const assigned = nextId++;
            return task.replace(/rid:($|\s)/, `rid:${assigned}$1`);
        }

        return task;
    });
}

/**
 * Adjust a date forward according to a recurrence rule like '3d', '+1m', '2b'.
 * @param {Date|null} date - Original date.
 * @param {string} adjust - Recurrence string.
 * @returns {Date|null} Adjusted date, or null if input is null.
 */
export function adjustDate(date, adjust) {
    if (!date) return null;

    const m = adjust.match(/^(\+?)(\d+)([dbwmy]?)$/);
    if (!m) throw new Error('Malformed `rec:` value');

    const [, , numStr, unit = 'd'] = m;
    const num = parseInt(numStr, 10);

    switch (unit) {
        case '':
        case 'd':
            return addDays(date, num);
        case 'b': {
            // Business days (Mon–Fri)
            let d = new Date(date);
            let count = num;
            while (count > 0) {
                d = addDays(d, 1);
                const weekday = d.getDay();
                if (weekday >= 1 && weekday <= 5) count--;
            }
            return d;
        }
        case 'w':
            return addWeeks(date, num);
        case 'm': {
            // Month add with clamp
            const d = addMonths(date, num);
            const endOfMonth = new Date(
                d.getFullYear(),
                d.getMonth() + 1,
                0
            ).getDate();
            if (d.getDate() > endOfMonth) d.setDate(endOfMonth);
            return d;
        }
        case 'y':
            return addYears(date, num);
        default:
            throw new Error('Unknown recurrence unit');
    }
}

/**
 * Generate a new recurring task line according to rec: rules.
 * @param {string} task - The todo.txt line.
 * @param {Date} [today=new Date()] - Current date.
 * @returns {string|null} New task line, or null if no recurrence.
 */
export function generateNextRecurring(task, today = new Date()) {
    const recSpan = getValue(task, 'rec');
    if (!recSpan) return null;

    const tSpan = getValue(task, 't');
    const dueSpan = getValue(task, 'due');

    const tDate = tSpan ? parseISO(tSpan.value) : null;
    const dueDate = dueSpan ? parseISO(dueSpan.value) : null;
    const strict = recSpan.value.startsWith('+');

    // TODO Use todotxt-utils for this
    // Remove completion and creation date if any (x 2025-09-01 ...)
    task = task.replace(
        /^(x\s+\d{4}-\d{2}-\d{2}\s+)?(\([A-Z]\)\s+)?\d{4}-\d{2}-\d{2}\s+/,
        '$2'
    );

    let newT = new Date(tDate);
    let newDue = dueDate ? new Date(dueDate) : null;

    if (!tDate && !dueDate) {
        // No dates, recurrence not date-based
        return task;
    }

    if (tDate && dueDate) {
        if (strict) {
            newT = adjustDate(tDate, recSpan.value);
            newDue = adjustDate(dueDate, recSpan.value);
        } else {
            const offset = (dueDate - tDate) / (1000 * 60 * 60 * 24);
            newT = adjustDate(today, recSpan.value);
            newDue = addDays(newT, offset);
        }
    } else if (strict) {
        if (tDate) newT = adjustDate(tDate, recSpan.value);
        if (dueDate) newDue = adjustDate(dueDate, recSpan.value);
    } else {
        if (tDate) newT = adjustDate(today, recSpan.value);
        if (dueDate) newDue = adjustDate(today, recSpan.value);
    }

    // Replace spans using your utils
    if (tDate) {
        task = replaceSpan(task, tSpan, newT.toISOString().slice(0, 10));
    } else if (newT) {
        // No span, append
        task += ` t:${newT.toISOString().slice(0, 10)}`;
    }
    if (dueDate) {
        task = replaceSpan(task, dueSpan, newDue.toISOString().slice(0, 10));
    } else if (newDue) {
        task += ` due:${newDue.toISOString().slice(0, 10)}`;
    }

    return task;
}
