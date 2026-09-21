import { dateAdd, monthAdd } from "./financeModel.js";
export function nextTaskDate(t, today) {
  const d = t.dueDate || today;
  return t.repeatRule === "daily"
    ? dateAdd(d, 1)
    : t.repeatRule === "weekly"
      ? dateAdd(d, 7)
      : t.repeatRule === "monthly"
        ? monthAdd(d, 1)
        : null;
}
export function habitPaused(h, day) {
  return (
    (h.archived && h.archivedAt && day >= h.archivedAt) ||
    (h.pauses || []).some((p) => p.from <= day && day <= p.through)
  );
}
export function weekDates(day) {
  const weekday = new Date(day + "T12:00:00Z").getUTCDay(),
    start = dateAdd(day, -((weekday + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => dateAdd(start, i));
}
export function habitOpen(h, day, rest = []) {
  return !rest.includes(day) && !habitPaused(h, day);
}
export function habitDue(h, day, rest = []) {
  if (h.archived || !habitOpen(h, day, rest)) return false;
  const flexible = Number(h.timesPerWeek) > 0 && Number(h.timesPerWeek) < 7;
  if (!flexible)
    return (
      !h.days?.length ||
      h.days.includes(new Date(day + "T12:00:00Z").getUTCDay())
    );
  if (h.history?.includes(day)) return true;
  const week = weekDates(day),
    needed =
      Number(h.timesPerWeek) -
      week.filter((d) => d < day && h.history?.includes(d)).length,
    left = week.filter((d) => d >= day && habitOpen(h, d, rest)).length;
  return needed > 0 && needed >= left;
}
export function habitStreak(h, today, rest = []) {
  const kept = [...new Set(h.history || [])].filter((d) => d <= today).sort();
  let count = 0,
    best = 0,
    bank = 1,
    covered = [],
    weeks = 0;
  const keep = () => {
    count++;
    if (count % 7 === 0) bank = Math.min(3, bank + 1);
    best = Math.max(best, count);
  };
  const miss = (d) => {
    if (bank > 0) {
      bank--;
      covered.push(d);
    } else {
      best = Math.max(best, count);
      count = 0;
      weeks = 0;
      bank = 1;
      covered = [];
    }
  };
  if (!kept.length)
    return { count: 0, best: 0, bank: 1, covered: [], kept: 0, weeks: 0 };
  if (Number(h.timesPerWeek) > 0 && Number(h.timesPerWeek) < 7) {
    const current = weekDates(today)[0];
    for (
      let week = weekDates(kept[0])[0], i = 0;
      week < current && i < 1000;
      week = dateAdd(week, 7), i++
    ) {
      const days = weekDates(week),
        done = days.filter((d) => kept.includes(d));
      done.forEach(keep);
      if (count) {
        const open = days.filter(
            (d) => d >= kept[0] && !kept.includes(d) && habitOpen(h, d, rest),
          ),
          shortfall = Math.max(
            0,
            Math.min(Number(h.timesPerWeek), done.length + open.length) -
              done.length,
          );
        for (const d of open.slice(open.length - shortfall)) if (count) miss(d);
        if (count) weeks++;
      }
    }
    kept.filter((d) => d >= current && d < today).forEach(keep);
  } else {
    for (
      let d = kept[0], i = 0;
      d < today && i < 7500;
      d = dateAdd(d, 1), i++
    ) {
      if (kept.includes(d)) keep();
      else if (count && habitDue(h, d, rest)) miss(d);
    }
  }
  if (kept.includes(today)) keep();
  return {
    count: h.archived ? 0 : count,
    best,
    bank,
    covered,
    kept: kept.length,
    weeks,
  };
}
export function archiveHabit(h, archived, today) {
  return archived
    ? { ...h, archived: true, archivedAt: today }
    : {
        ...h,
        archived: false,
        archivedAt: null,
        pauses: [
          ...(h.pauses || []),
          ...(h.archivedAt && h.archivedAt < today
            ? [{ from: h.archivedAt, through: dateAdd(today, -1) }]
            : []),
        ],
      };
}
export function planningMutation(s, a) {
  if (a.type === "archiveHabit")
    return {
      ...s,
      habits: s.habits.map((h) =>
        h.id === a.id ? archiveHabit(h, !h.archived, s.today) : h,
      ),
    };
  if (a.type === "restDay")
    return {
      ...s,
      restDays: s.restDays.includes(a.day)
        ? s.restDays.filter((d) => d !== a.day)
        : [...s.restDays, a.day],
    };
  if (a.type === "closeDay") {
    if (s.dayHistory.some((d) => d.date === s.today)) return s;
    return {
      ...s,
      dayHistory: [
        ...s.dayHistory,
        {
          date: s.today,
          oneThing: s.oneThing,
          tasks: s.tasks.filter((t) => t.completedAt === s.today).length,
          habits: s.habits.filter((h) => h.history?.includes(s.today)).length,
          reflection: a.reflection || "",
        },
      ],
    };
  }
  if (a.type === "reorder") {
    const list = s[a.collection];
    if (!Array.isArray(list)) return s;
    const from = list.findIndex((x) => x.id === a.id),
      to = Math.max(0, Math.min(list.length - 1, from + a.direction));
    if (from < 0 || from === to) return s;
    const next = [...list];
    next.splice(to, 0, next.splice(from, 1)[0]);
    return { ...s, [a.collection]: next };
  }
  return s;
}
