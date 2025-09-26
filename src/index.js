import {
  isCompleted,
  markCompleted,
  getProjects,
  setPriority,
  getKeyValues,
  getValue,
  getCompletionDate,
  getCreationDate,
} from "todotxt-utils";

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
    const rid = getValue(task, "rid");
    if (rid && ridRegex.test(rid)) {
      maxId = Math.max(maxId, parseInt(rid, 10));
    }
  }

  // Step 2: assign new IDs to rid:new or empty rid
  let nextId = maxId + 1;
  return tasks.map(task => {
    const rid = getValue(task, "rid");

    if (rid === "new") {
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


function dateToString(date) {
	const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
/**
 * Generates the next instance of a recurring task if eligible.
 * Rules:
 * - Only generates if previous instance is completed.
 * - Skips tasks with no due date.
 * @param {string} task - The todo.txt task string.
 * @param {Date} today - The current date for reference.
 * @returns {string|null} New task string or null if no new instance is generated.
 */
export function generateNextRecurring(task, today = new Date()) {
  const kv = getKeyValues(task);
  const rec = kv["rec"];
  const dueStr = kv["due"];

  if (!rec || !dueStr) return null; // skip if no recurrence or no due date
  if (!isCompleted(task)) return null; // skip if previous instance is incomplete

  const dueDate = new Date(dueStr);
  let nextDate = new Date(dueDate);

  // Simple recurrence rules: daily, weekly, monthly
  if (rec.endsWith("d")) {
    const n = parseInt(rec) || 1;
    nextDate.setDate(nextDate.getDate() + n);
  } else if (rec.endsWith("w")) {
    const n = parseInt(rec) || 1;
    nextDate.setDate(nextDate.getDate() + 7 * n);
  } else if (rec.endsWith("m")) {
    const n = parseInt(rec) || 1;
    nextDate.setMonth(nextDate.getMonth() + n);
  } else {
    return null; // unknown recurrence format
  }

  // roll forward until nextDate >= today
  while (nextDate < today) {
    if (rec.endsWith("d")) nextDate.setDate(nextDate.getDate() + parseInt(rec));
    if (rec.endsWith("w")) nextDate.setDate(nextDate.getDate() + 7 * parseInt(rec));
    if (rec.endsWith("m")) nextDate.setMonth(nextDate.getMonth() + parseInt(rec));
  }

  // Format date as yyyy-mm-dd
  const newDue = dateToString(nextDate);

  // Replace due date and remove completion marker
  const completionDate = getCompletionDate(task);
  const creationDate = getCreationDate(task);

  let newTask = task.replace(/^x\s+/, "");
 	// remove completion data
  if(completionDate) {
  	newTask = newTask.slice(10)
  }
	// remove creation date so new one can be added
  if(creationDate) {
  	newTask = dateToString(today) + ' ' + newTask.slice(10)
  	
  }
  newTask = newTask.replace(/due:\S+/, `due:${newDue}`);

  return newTask;
}

/**
 * Generates new instances for an array of recurring tasks.
 * @param {string[]} tasks - Array of todo.txt task strings.
 * @param {Date} today - Reference date.
 * @returns {string[]} Array of new task instances.
 */
export function generateNextRecurringBatch(tasks, today = new Date()) {
  const newTasks = [];
  for (const task of tasks) {
    const next = generateNextRecurring(task, today);
    if (next) newTasks.push(next);
  }
  return newTasks;
}


/**
 * Top-level function to normalize IDs and generate next recurring tasks.
 * @param {string[]} tasks - Array of todo.txt task strings.
 * @param {Date} today - Reference date.
 * @returns {string[]} Updated array including new recurring instances.
 */
export function updateRecurrences(tasks, today = new Date()) {
  // Step 1: Normalize IDs
  const normalized = normalizeRids(tasks);

  // Step 2: Generate next recurring instances
  const nextRecurring = generateNextRecurringBatch(normalized, today);

  // Step 3: Return the combined list
  return [...normalized, ...nextRecurring];
}
