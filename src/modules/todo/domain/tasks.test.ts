import { describe, expect, it } from "vitest";
import {
  compareTasks,
  daysBetween,
  dueLabel,
  focusTasks,
  groupOf,
  groupOpenTasks,
  summarizeTasks,
  type TaskLike,
} from "./tasks";

const TODAY = "2026-11-23"; // Monday
const task = (id: string, dueIso: string | null, extra: Partial<TaskLike> = {}): TaskLike => ({
  id,
  dueIso,
  priority: "NORMAL",
  createdAtIso: "2026-11-01T10:00:00.000Z",
  ...extra,
});

describe("daysBetween", () => {
  it("counts calendar days, across months and DST", () => {
    expect(daysBetween("2026-11-23", "2026-11-25")).toBe(2);
    expect(daysBetween("2026-11-30", "2026-12-01")).toBe(1);
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
    expect(daysBetween("2026-11-23", "2026-11-20")).toBe(-3);
  });
});

describe("groupOf", () => {
  it.each([
    [null, "noDate"],
    ["2026-11-22", "overdue"],
    ["2026-11-23", "today"],
    ["2026-11-24", "tomorrow"],
    ["2026-11-25", "week"],
    ["2026-11-30", "week"],
    ["2026-12-01", "later"],
  ] as const)("%s → %s", (dueIso, group) => {
    expect(groupOf(dueIso, TODAY)).toBe(group);
  });
});

describe("compareTasks", () => {
  it("high priority, then due date (none last), then creation", () => {
    const tasks = [
      task("no-date", null),
      task("late", "2026-11-30"),
      task("early", "2026-11-24"),
      task("high", "2026-12-15", { priority: "HIGH" }),
      task("early-newer", "2026-11-24", { createdAtIso: "2026-11-05T00:00:00.000Z" }),
    ];
    expect([...tasks].sort(compareTasks).map((t) => t.id)).toEqual(["high", "early", "early-newer", "late", "no-date"]);
  });
});

describe("groupOpenTasks", () => {
  it("keeps the display order and drops empty groups", () => {
    const groups = groupOpenTasks([task("a", null), task("b", "2026-11-20"), task("c", "2026-11-23")], TODAY);
    expect(groups.map((g) => [g.id, g.label, g.tasks.map((t) => t.id)])).toEqual([
      ["overdue", "En retard", ["b"]],
      ["today", "Aujourd'hui", ["c"]],
      ["noDate", "Sans date", ["a"]],
    ]);
  });

  it("returns nothing for no task", () => {
    expect(groupOpenTasks([], TODAY)).toEqual([]);
  });
});

describe("dueLabel", () => {
  it.each([
    ["2026-11-23", "Aujourd'hui", "today"],
    ["2026-11-24", "Demain", "soon"],
    ["2026-11-22", "Hier", "overdue"],
    ["2026-11-20", "Il y a 3 j", "overdue"],
    ["2026-11-27", "Vendredi", "soon"],
    ["2026-11-29", "Dimanche", "soon"],
    ["2026-11-30", "30/11", "normal"],
    ["2027-01-05", "05/01/2027", "normal"],
  ])("%s → %s", (dueIso, label, tone) => {
    expect(dueLabel(dueIso, TODAY)).toEqual({ label, tone });
  });
});

describe("summarizeTasks / focusTasks", () => {
  const tasks = [
    task("old", "2026-11-10"),
    task("late", "2026-11-22"),
    task("today", "2026-11-23"),
    task("today-high", "2026-11-23", { priority: "HIGH" }),
    task("tomorrow", "2026-11-24"),
    task("in7", "2026-11-30"),
    task("in8", "2026-12-01"),
    task("none", null),
  ];

  it("counts overdue, today and the next 7 days", () => {
    expect(summarizeTasks(tasks, TODAY)).toEqual({ open: 8, overdue: 2, today: 2, nextSevenDays: 2 });
  });

  it("lists overdue (oldest first) then today (high first), limited", () => {
    expect(focusTasks(tasks, TODAY).map((t) => t.id)).toEqual(["old", "late", "today-high", "today"]);
    expect(focusTasks(tasks, TODAY, 2).map((t) => t.id)).toEqual(["old", "late"]);
  });
});
