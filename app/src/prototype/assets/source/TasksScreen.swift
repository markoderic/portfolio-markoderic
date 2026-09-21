import SwiftUI
import PlannerCore

// Tasks (round two, 2026-09-06). Three true counts, Today first with one
// check moment per row, habits with a rail each and "n of m days this month",
// the consistency map, then the weeks ahead. No percentages, no streak number.
struct TasksScreen: View {
    @Bindable var store: AppStore

    private var today: String { store.todayString }
    private var monthStart: String { DateUtils.string(DateUtils.startOfMonth(DateUtils.parse(today) ?? Date())) }

    private var filter: String { store.ui.taskFilter }
    private var filtered: [TaskItem] {
        filter == "All" ? store.data.tasks : store.data.tasks.filter { $0.category == filter }
    }
    private var open: [TaskItem] { filtered.filter { !$0.completed } }
    private var todayTasks: [TaskItem] { open.filter { $0.dueDate == today } }
    private var overdue: [TaskItem] { open.filter { Ranges.isBeforeToday($0.dueDate, today: today) }.sorted { $0.dueDate < $1.dueDate } }
    private var upcoming: [TaskItem] { open.filter { $0.dueDate > today }.sorted { ($0.dueDate, $0.startTime) < ($1.dueDate, $1.startTime) } }
    private var anytime: [TaskItem] { open.filter { $0.dueDate.isEmpty } }
    private var completed: [TaskItem] { filtered.filter { $0.completed }.sorted { $0.completedAt > $1.completedAt } }

    private var endThisWeek: String { DateUtils.string(DateUtils.endOfWeek(DateUtils.parse(today) ?? Date())) }
    private var endNextWeek: String { DateUtils.addDays(endThisWeek, 7) }
    private var upThisWeek: [TaskItem] { upcoming.filter { $0.dueDate <= endThisWeek } }
    private var upNextWeek: [TaskItem] { upcoming.filter { $0.dueDate > endThisWeek && $0.dueDate <= endNextWeek } }
    private var upLater: [TaskItem] { upcoming.filter { $0.dueDate > endNextWeek } }

    // facts
    private var doneThisMonth: Int {
        store.data.tasks.filter { $0.completed && $0.completedAt.hasPrefix(String(today.prefix(7))) }.count
    }
    private var habitsToday: [Habit] { HabitEngine.habitsForDate(store.data, today) }
    private var habitsKeptToday: Int { habitsToday.filter { HabitEngine.isDone(store.data, habitId: $0.id, date: today) }.count }

    @State private var habitDay = "today"

    var body: some View {
        TopBar(title: "Tasks", eyebrow: DateLabel.string(today, "EEEE, MMMM d")) {
            HStack(spacing: 8) {
                filterMenu
                PillButton(label: "Add task", icon: "plus", style: .primary) { store.presentTaskForm() }
                    .tourTarget("tasks.add")
            }
        }

        HStack(spacing: 8) {
            FactTile(value: "\(todayTasks.count + overdue.count)", label: "Left today")
            FactTile(value: "\(doneThisMonth)", label: "Done this month")
            FactTile(value: "\(habitsKeptToday)", label: "Habits today", of: habitsToday.isEmpty ? nil : "\(habitsToday.count)")
        }

        // MARK: Today
        MilestoneCard(store: store, kind: "task", empty: todayTasks.isEmpty && overdue.isEmpty) { celebrated in
        if todayTasks.isEmpty && overdue.isEmpty {
            EmptyCard(fact: celebrated ? "Nothing left today." : "Nothing due today.",
                      next: upcoming.first.map { "Next up: \($0.title), \(Copy.dayName($0.dueDate, today: today))." }
                            ?? (anytime.isEmpty ? "Add a task with Quick add, or plan one for later in the week."
                                                : "Pick something from Anytime, or plan one for later in the week."))
        } else {
            ListCard {
                CardHead("Today", fact: "\(todayTasks.count + overdue.count) left" + (overdue.isEmpty ? "" : " · \(overdue.count) overdue"))
                    .padding(.top, 8).padding(.bottom, 2)
                ReorderableRows(items: overdue + todayTasks, canMove: { $0.dueDate == $1.dueDate }, onMove: { from, to in moveTask(overdue + todayTasks, from, to) }) { t in
                    TaskRowView(store: store, task: t)
                }
            }
        }
        }

        // MARK: Habits
        habitsCard

        // MARK: Consistency (the map Marko keeps)
        VStack(alignment: .leading, spacing: 12) {
            CardHead("Consistency", fact: "last 17 weeks")
            HabitHeatmap(store: store)
        }
        .plannerCard(padding: 16, radius: Theme.radiusMd)

        // MARK: the weeks ahead
        if !upThisWeek.isEmpty { group("This week", upThisWeek) }
        if !upNextWeek.isEmpty { group("Next week", upNextWeek) }
        if !upLater.isEmpty { group("Later", upLater) }
        if !anytime.isEmpty { group("Anytime", anytime) }
        if !completed.isEmpty {
            CollapsibleSection(title: "Done", items: Array(completed.prefix(60)) + completed.dropFirst(60).filter { $0.id == store.revealedCompletedTaskID }, startExpanded: store.revealedCompletedTaskID != nil, accent: Theme.muted) { task in
                TaskRowView(store: store, task: task)
            }
        }
    }

    private func group(_ title: String, _ tasks: [TaskItem]) -> some View {
        ListCard {
            CardHead(title, fact: "\(tasks.count)").padding(.top, 8).padding(.bottom, 2)
            ReorderableRows(items: tasks, canMove: { title == "Anytime" || ($0.dueDate == $1.dueDate && $0.startTime == $1.startTime) }, onMove: { from, to in moveTask(tasks, from, to) }) { t in
                TaskRowView(store: store, task: t, showDay: title != "Anytime")
            }
        }
    }

    /// Reorder within the master tasks array using the visible group's ids.
    private func moveTask(_ visible: [TaskItem], _ from: Int, _ to: Int) {
        guard from != to, visible.indices.contains(from), visible.indices.contains(to) else { return }
        let movedId = visible[from].id, targetId = visible[to].id
        guard let srcIdx = store.data.tasks.firstIndex(where: { $0.id == movedId }) else { return }
        let item = store.data.tasks.remove(at: srcIdx)
        guard let dstIdx = store.data.tasks.firstIndex(where: { $0.id == targetId }) else {
            store.data.tasks.insert(item, at: min(srcIdx, store.data.tasks.count)); return
        }
        store.data.tasks.insert(item, at: from < to ? dstIdx + 1 : dstIdx)
        store.save()
    }
    private func moveHabit(_ visible: [Habit], _ from: Int, _ to: Int) {
        guard from != to, visible.indices.contains(from), visible.indices.contains(to) else { return }
        let movedId = visible[from].id, targetId = visible[to].id
        guard let srcIdx = store.data.dailyHabits.firstIndex(where: { $0.id == movedId }) else { return }
        let item = store.data.dailyHabits.remove(at: srcIdx)
        guard let dstIdx = store.data.dailyHabits.firstIndex(where: { $0.id == targetId }) else {
            store.data.dailyHabits.insert(item, at: min(srcIdx, store.data.dailyHabits.count)); return
        }
        store.data.dailyHabits.insert(item, at: from < to ? dstIdx + 1 : dstIdx)
        store.save()
    }

    // MARK: filter (a menu, not a chip row)
    private var filterMenu: some View {
        Menu {
            Button { store.ui.taskFilter = "All"; store.saveUI() } label: {
                filter == "All" ? Label("All categories", systemImage: "checkmark") : Label("All categories", systemImage: "")
            }
            Divider()
            ForEach(store.data.settings.taskCategories, id: \.self) { cat in
                Button { store.ui.taskFilter = cat; store.saveUI() } label: {
                    filter == cat ? Label(cat, systemImage: "checkmark") : Label(cat, systemImage: "")
                }
            }
        } label: {
            Icon("list", size: 16, label: "Filter by category")
                .foregroundStyle(filter == "All" ? Theme.muted : Theme.accentContrast(store.accentColor))
                .frame(width: 38, height: 38)
                .background(filter == "All" ? Theme.cardSoft : Theme.accent(store.accentColor), in: Circle())
        }
    }

    // MARK: habits card
    private var habitsCard: some View {
        let date = habitDay == "yesterday" ? DateUtils.addDays(today, -1) : today
        let habits = store.data.dailyHabits.filter { !$0.archived }
        let active = habits.filter { HabitEngine.activeOn($0, date: date) }
        let kept = active.filter { HabitEngine.isDone(store.data, habitId: $0.id, date: date) }.count
        let archived = store.data.dailyHabits.filter { $0.archived }
        // A habit milestone flashes the card once; the row's line says the word.
        return MilestoneCard(store: store, kind: "habit", empty: !active.isEmpty && kept == active.count) { _ in
        ListCard {
            HStack(alignment: .firstTextBaseline) {
                CardHead(habitDay == "yesterday" ? "Habits · yesterday" : "Habits",
                         fact: active.isEmpty ? (habits.isEmpty ? "" : "rest day") : "\(kept) of \(active.count) kept")
                Spacer(minLength: 8)
                Button {
                    withAnimation(Theme.easeOut) { habitDay = habitDay == "today" ? "yesterday" : "today" }
                } label: {
                    Text(habitDay == "today" ? "Yesterday" : "Today").font(.planner(12, .semibold)).foregroundStyle(Theme.muted)
                        .padding(.horizontal, 10).frame(height: 28).background(Theme.cardSoft, in: Capsule())
                }.buttonStyle(.plain)
            }
            .padding(.top, 8).padding(.bottom, 2)
            if habits.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("No habits yet.").font(.planner(15, .semibold)).foregroundStyle(Theme.text)
                    Text("A habit is something you do most days. Add one and mark the days it rests.")
                        .font(.planner(13)).foregroundStyle(Theme.muted).fixedSize(horizontal: false, vertical: true)
                    InlineAction("Add a habit") { store.presentHabitForm() }.padding(.top, 4)
                }
                .padding(.vertical, 10)
            } else {
                ReorderableRows(items: habits, onMove: { from, to in moveHabit(habits, from, to) }) { h in
                    HabitRowView(store: store, habit: h, date: date)
                }
                Button { store.presentHabitForm() } label: {
                    HStack(spacing: 6) { Icon("plus", size: 13); Text("Add habit").font(.planner(13.5, .semibold)) }
                        .foregroundStyle(Theme.muted).frame(height: 40).padding(.leading, 9)
                }.buttonStyle(.plain)
            }
            if !archived.isEmpty {
                RowDivider()
                ForEach(archived) { h in
                    Button { store.presentHabitForm(h) } label: {
                        HStack(spacing: 10) {
                            Text(h.title).font(.planner(14, .semibold)).foregroundStyle(Theme.muted)
                            Spacer()
                            Text("Archived").font(.planner(12)).foregroundStyle(Theme.subtle)
                        }
                        .frame(height: 40).contentShape(Rectangle())
                    }.buttonStyle(.plain)
                }
            }
        }
        }
    }
}

// MARK: - Habit row: check, title, "n of m days this month · Sundays rest", the week's rail

struct HabitRowView: View {
    @Bindable var store: AppStore
    let habit: Habit
    let date: String
    private var today: String { store.todayString }
    private var done: Bool { HabitEngine.isDone(store.data, habitId: habit.id, date: date) }

    private var monthLine: String {
        let start = DateUtils.startOfMonth(DateUtils.parse(today) ?? Date())
        var cur = start, scheduled = 0, kept = 0
        while let t = DateUtils.parse(today), cur <= t {
            let ds = DateUtils.string(cur)
            if HabitEngine.activeOn(habit, date: ds) {
                scheduled += 1
                if HabitEngine.isDone(store.data, habitId: habit.id, date: ds) { kept += 1 }
            }
            cur = DateUtils.addDays(cur, 1)
        }
        // "9 kept this month · 3 a week": a flexible habit has no rest-day clause.
        if habit.isFlexible { return "\(kept) kept this month · \(habit.timesPerWeek) a week" }
        var s = "\(kept) of \(scheduled) day\(scheduled == 1 ? "" : "s") this month"
        let days = Set(habit.days.filter { (0...6).contains($0) })
        if !days.isEmpty && days.count < 7 {
            let names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
            let off = (0...6).filter { !days.contains($0) }
            if off.count == 1 { s += " · \(names[off[0]])s rest" }
            else if off.count <= 3 { s += " · " + off.map { String(names[$0].prefix(3)) }.joined(separator: ", ") + " rest" }
            else { s += " · \(days.count) days a week" }
        }
        return s
    }
    private var week: [String] { DayEngine.weekDates(containing: today) }
    private var kept: Set<String> { Set(week.filter { HabitEngine.isDone(store.data, habitId: habit.id, date: $0) }) }
    /// A planned rest day draws as the rest dot, like an unscheduled weekday.
    private var scheduled: Set<String> { Set(week.filter { StreakEngine.dueOn(habit, date: $0, store.data) }) }
    /// Derived from history on every read; nil when streaks are off.
    private var streak: HabitStreak? {
        store.data.settings.habitStreaks ? StreakEngine.streak(habit, store.data, today: today) : nil
    }

    var body: some View {
        let s = streak
        HStack(spacing: 8) {
            CheckCircle(done: done) { toggle() }
                .background(MilestoneRing(store: store, id: habit.id))
            Button { store.presentHabitForm(habit) } label: {
                VStack(alignment: .leading, spacing: 3) {
                    Text(habit.title).font(.planner(15, .semibold)).foregroundStyle(Theme.text)
                        .lineLimit(1)
                    Text(s.map { StreakCopy.subline($0, today: today, monthLine: monthLine) } ?? monthLine)
                        .font(.planner(12)).foregroundStyle(Theme.muted).lineLimit(1).monospacedDigit()
                }
                .opacity(done ? 0.55 : 1)
                .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.2), value: done)
                Spacer(minLength: 8)
                HabitWeekRail(week: week, kept: kept, scheduled: scheduled, today: today, accent: Theme.accent(store.accentColor),
                              covered: Set(s?.coveredDays ?? []), label: s.flatMap { StreakCopy.label($0) })
            }
            .buttonStyle(.plain)
            .contentShape(Rectangle())
        }
        .padding(.vertical, 6)
        .accessibilityValue(s.flatMap { StreakCopy.accessibilityValue($0, week: week) } ?? "")
        .opacity(HabitEngine.activeOn(habit, date: date) ? 1 : 0.5)
        .swipeActions([SwipeAction(label: "Edit") { store.presentHabitForm(habit) }, .delete { store.deleteHabit(habit.id) }])
    }
    private func toggle() {
        store.setHabitDone(habit.id, on: date, done: !done)
    }
}

// MARK: - Task row: the check moment, then the notice names the day

struct TaskRowView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Bindable var store: AppStore
    let task: TaskItem
    var showDay: Bool = false
    private var today: String { store.todayString }
    @State private var pendingDone = false

    private var done: Bool { task.completed || pendingDone }
    private var isOverdue: Bool { !task.completed && Ranges.isBeforeToday(task.dueDate, today: today) }
    private var tomorrow: String { DateUtils.addDays(today, 1) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                CheckCircle(done: done) { toggle() }
                    .background(MilestoneRing(store: store, id: task.id))
                Button { store.presentTaskForm(task) } label: {
                    HStack(spacing: 8) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(task.title).font(.planner(15, .semibold)).foregroundStyle(Theme.text)
                                .strikethrough(done, color: Theme.subtle).lineLimit(2)
                            if !meta.isEmpty {
                                Text(meta).font(.planner(12)).foregroundStyle(isOverdue ? Theme.muted : Theme.muted).lineLimit(1)
                            }
                        }
                        Spacer(minLength: 6)
                        if !right.isEmpty {
                            Text(right).font(.planner(12.5)).foregroundStyle(Theme.muted).monospacedDigit()
                        }
                    }
                    .opacity(done ? 0.55 : 1)
                    .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.2), value: done)
                    .contentShape(Rectangle())
                }.buttonStyle(.plain)
            }
            .padding(.vertical, 6)
            if isOverdue && !done {
                HStack(spacing: 8) {
                    InlineAction("Due \(Copy.dayName(tomorrow, today: today))") { move(to: tomorrow) }
                    InlineAction("Finish") { toggle() }
                }
                .padding(.leading, 44).padding(.bottom, 10)
            }
        }
        .swipeActions([
            SwipeAction(label: task.dueDate == tomorrow ? "Today" : "Tomorrow") { move(to: task.dueDate == tomorrow ? today : tomorrow) },
            SwipeAction(label: "Edit") { store.presentTaskForm(task) },
            .delete { store.deleteTask(task.id) }
        ])
        .id("task-" + task.id)
        .modifier(CompletionTransition())
    }

    private var meta: String {
        var bits: [String] = []
        if !task.category.isEmpty { bits.append(task.category) }
        if isOverdue { bits.append(Copy.overdue(task.dueDate)) }
        else if showDay, !task.dueDate.isEmpty { bits.append("due " + DateLabel.string(task.dueDate, "EEE, MMM d")) }
        if task.completed, !task.completedAt.isEmpty { bits.append("done " + DateLabel.string(String(task.completedAt.prefix(10)), "MMM d")) }
        return bits.joined(separator: " · ")
    }
    private var right: String {
        if task.completed { return "" }
        let t = Format.time(task.startTime)
        if !t.isEmpty { return t }
        if showDay || isOverdue { return "" }
        return ""
    }

    private func move(to date: String) {
        guard let i = store.data.tasks.firstIndex(where: { $0.id == task.id }) else { return }
        let old = store.data.tasks[i].dueDate
        withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.22)) { store.data.tasks[i].dueDate = date }
        store.save()
        let id = task.id
        store.showNotice("Due \(Copy.dayName(date, today: today)).") { [weak store] in
            guard let store, let j = store.data.tasks.firstIndex(where: { $0.id == id }) else { return }
            withAnimation(Theme.easeOut) { store.data.tasks[j].dueDate = old }
            store.save()
        }
    }
    private func toggle() {
        guard let i = store.data.tasks.firstIndex(where: { $0.id == task.id }) else { return }
        if store.data.tasks[i].completed {
            withAnimation(Theme.easeOut) { store.uncompleteTask(task.id) }
        } else if !pendingDone {
            pendingDone = true
            let id = task.id
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.42) {
                withAnimation(reduceMotion ? Theme.quick : Theme.grow) {
                    store.completeTask(id) {
                        if let current = store.data.tasks.first(where: { $0.id == id }),
                           !current.dueDate.isEmpty, current.dueDate <= store.todayString,
                           (store.ui.taskFilter == "All" || current.category == store.ui.taskFilter),
                           Milestone.tasksEmpty(store) {
                            Milestone.finish(store: store, kind: "task", id: id)
                        } else { Haptics.done() }
                    }
                }
                pendingDone = false
                store.showNotice(Copy.finished) { [weak store] in
                    withAnimation(reduceMotion ? Theme.quick : Theme.grow) { store?.uncompleteTask(id) }
                }
            }
        }
    }
}

// MARK: - Consistency heatmap (the map Marko keeps; unchanged)

struct HabitHeatmap: View {
    @Bindable var store: AppStore
    private var today: String { store.todayString }
    private let totalDays = 119
    private let gap: CGFloat = 3

    private enum Cell { case empty; case day(Double) }   // Double = completion %, -1 = no habits

    private var columns: [[Cell]] {
        let start = DateUtils.addDays(today, -(totalDays - 1))
        let startPad = DateUtils.parse(start).map { DateUtils.weekday($0) } ?? 0
        var flat: [Cell] = Array(repeating: .empty, count: startPad)
        for i in 0..<totalDays { flat.append(.day(dayPct(DateUtils.addDays(start, i)))) }
        var cols: [[Cell]] = []
        var i = 0
        while i < flat.count { cols.append(Array(flat[i..<min(i + 7, flat.count)])); i += 7 }
        if var last = cols.last, last.count < 7 {
            last += Array(repeating: .empty, count: 7 - last.count); cols[cols.count - 1] = last
        }
        return cols
    }

    private func dayPct(_ ds: String) -> Double {
        let scheduled = HabitEngine.habitsForDate(store.data, ds)
        guard !scheduled.isEmpty else { return -1 }
        let done = scheduled.filter { HabitEngine.isDone(store.data, habitId: $0.id, date: ds) }.count
        return Double(done) / Double(scheduled.count) * 100
    }

    var body: some View {
        let cols = columns
        let n = max(1, cols.count)
        return GeometryReader { geo in
            let cell = (geo.size.width - gap * CGFloat(n - 1)) / CGFloat(n)
            HStack(spacing: gap) {
                ForEach(0..<n, id: \.self) { ci in
                    VStack(spacing: gap) {
                        ForEach(0..<7, id: \.self) { ri in
                            RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                                .fill(color(cols[ci][ri]))
                                .frame(width: cell, height: cell)
                        }
                    }
                }
            }
        }
        .aspectRatio(CGFloat(n) / 7.0, contentMode: .fit)
    }

    private func color(_ cell: Cell) -> Color {
        switch cell {
        case .empty: return .clear
        case .day(let p):
            switch p {
            case 100...: return Theme.green.opacity(0.95)
            case 75..<100: return Theme.green.opacity(0.7)
            case 50..<75: return Theme.green.opacity(0.5)
            case 0.001..<50: return Theme.green.opacity(0.28)
            default: return Theme.track
            }
        }
    }
}
