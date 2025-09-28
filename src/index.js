// const { TodoTxtItem } = "jstodotxt";
import { Item } from 'jstodotxt';

import { parseISO, addDays, addWeeks, addMonths, addYears } from 'date-fns';

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
        const item = new Item(task);
        const ridExt = item.extensions().find((ext) => ext.key === 'rid');
        if (ridExt && ridRegex.test(ridExt.value)) {
            maxId = Math.max(maxId, parseInt(ridExt.value, 10));
        }
    }

    // Step 2: assign new IDs to rid:new or empty rid
    let nextId = maxId + 1;
    return tasks.map((task) => {
        const item = new Item(task);
        const ridExt = item.extensions().find((ext) => ext.key === 'rid');
        if (ridExt?.value === 'new') {
            const assigned = nextId++;
            item.setExtension('rid', '' + assigned);
            return item.toString();
        }
        // technically a key:value without a value is not a proper extension
        // so replace key: manually
        if (/rid:($|\s)/.test(task)) {
            const assigned = nextId++;
            return item.toString().replace(/rid:($|\s)/, `rid:${assigned}$1`);
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
 * @param {string} taskLine - The todo.txt line.
 * @param {Date} [today=new Date()] - Current date.
 * @returns {string|null} New task line, or null if no recurrence.
 */
export function generateNextRecurring(taskLine, today = new Date()) {
    const item = new Item(taskLine);
    const recExt = item.extensions().find((ext) => ext.key === 'rec');
    if (!recExt) return null;

    const rec = recExt.value;
    const strict = rec.startsWith('+');

    // Extract t: and due:
    const tExt = item.extensions().find((ext) => ext.key === 't');
    const dueExt = item.extensions().find((ext) => ext.key === 'due');

    const tDate = tExt ? parseISO(tExt.value) : null;
    const dueDate = dueExt ? parseISO(dueExt.value) : null;

		if (!tDate && !dueDate) {
        return null;
    }
		
    // Remove completion and creation info
    item.clearCompleted();
    item.clearCreated();

    let newT = tDate ? new Date(tDate) : null;
    let newDue = dueDate ? new Date(dueDate) : null;

		// Not sure why this case would exist in dorecur impl, returning null above
    // if (!tDate && !dueDate) {
    //     // No dates, recurrence is not date-based
    //     return item.toString();
    // }
    

    if (tDate && dueDate) {
        if (strict) {
            newT = adjustDate(tDate, rec);
            newDue = adjustDate(dueDate, rec);
        } else {
            const offset = (dueDate - tDate) / (1000 * 60 * 60 * 24);
            newT = adjustDate(today, rec);
            newDue = addDays(newT, offset);
        }
    } else if (strict) {
        if (tDate) newT = adjustDate(tDate, rec);
        if (dueDate) newDue = adjustDate(dueDate, rec);
    } else {
        if (tDate) newT = adjustDate(today, rec);
        if (dueDate) newDue = adjustDate(today, rec);
    }

    // Update extensions
    if (newT) item.setExtension('t', newT.toISOString().slice(0, 10));
    if (newDue) item.setExtension('due', newDue.toISOString().slice(0, 10));

    return item.toString();
}

