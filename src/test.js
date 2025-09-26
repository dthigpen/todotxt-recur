import assert from "assert";
import {
  normalizeRids,
  generateNextRecurring,
  generateNextRecurringBatch,
  updateRecurrences,
} from "./index.js";

function runTests() {
  // --- normalizeRids ---
  {
    const tasks = [
      "2025-09-01 Pay rent rid:1",
      "2025-09-01 Jog rid:new",
      "2025-09-01 Water plants rid:",
    ];
    const normalized = normalizeRids(tasks);

    // rid:1 should remain, others should be numbered 2 and 3
    assert.ok(
      normalized.some(t => /rid:2/.test(t)),
      "should assign rid:2"
    );
    assert.ok(
      normalized.some(t => /rid:3/.test(t)),
      "should assign rid:3"
    );
    assert.ok(
      normalized.some(t => /rid:1/.test(t)),
      "should preserve rid:1"
    );
  }

  // --- generateNextRecurring ---
  {
    const task = "x 2025-09-02 2025-09-01 Pay rent rid:1 rec:1m due:2025-09-05";
    const next = generateNextRecurring(task, new Date("2025-09-02"));

    assert.ok(/rid:1/.test(next), "should keep same rid");
    assert.ok(
      /2025-10-01/.test(next),
      "next occurrence should be one month later " + next
    );
  }

  // --- generateNextRecurringBatch ---
  {
    const tasks = [
      "2025-09-01 Daily jog rid:2 rec:1d",
      "2025-09-01 Pay rent rid:1 rec:1m",
    ];
    const nextBatch = generateNextRecurringBatch(tasks, new Date("2025-09-02"));

    assert.strictEqual(nextBatch.length, 2, "should return two tasks");
    assert.ok(
      nextBatch.some(t => /2025-09-02/.test(t)),
      "daily jog should recur on 2025-09-02"
    );
    assert.ok(
      nextBatch.some(t => /2025-10-01/.test(t)),
      "rent should recur one month later"
    );
  }

  // --- updateRecurrences ---
  {
    const tasks = [
      "2025-09-01 Daily jog rid:2 rec:1d",
      "2025-09-01 Pay rent rid:1 rec:1M",
    ];
    const updated = updateRecurrences(tasks, new Date("2025-09-02"));

    assert.strictEqual(updated.length, 2, "should return two updated tasks");
    assert.ok(
      updated.some(t => /2025-09-02/.test(t)),
      "daily jog should advance"
    );
  }

  console.log("✅ All tests passed!");
}

runTests();
