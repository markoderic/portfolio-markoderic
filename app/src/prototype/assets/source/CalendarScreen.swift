import SwiftUI
import PlannerCore

// Calendar (round two, 2026-09-06). Month: a box per day, real swipe paging,
// chevrons, the selected day listed under it. Week and Day: either time
// blocks (the grid with the now line) or a list (one row per item, planned
// work and deadlines as different things). The style is a toggle here and a
// setting in More.
struct CalendarScreen: View {
    @Bindable var store: AppStore
    private var today: String { store.todayString }

    struct CalEvent: Identifiable {
        let id = UUID(); let date: String; let title: String; let time: String; let color: Color; let kind: String
        var completed: Bool = false
        var meta: String = ""
        var open: (() -> Void)? = nil
    }

    // MARK: type filter (persisted in ui.calendarKindFilter: "all" or comma-joined kinds)
    static let allKinds = ["Task", "Assignment", "Class", "Bill", "Reminder", "Workout", "Google", "Apple"]
    private var activeKinds: Set<String> {
        let raw = store.ui.calendarKindFilter
        if raw.isEmpty || raw == "all" { return Set(Self.allKinds) }
        if raw == "none" { return [] }
        return Set(raw.split(separator: ",").map(String.init))
    }
    private var isFiltered: Bool { activeKinds != Set(Self.allKinds) }
    private func kindOn(_ k: String) -> Bool { activeKinds.contains(k) }
    private func toggleKind(_ k: String) {
        var set = activeKinds
        if set.contains(k) { set.remove(k) } else { set.insert(k) }
        store.ui.calendarKindFilter = set.count == Self.allKinds.count ? "all" : (set.isEmpty ? "none" : set.sorted().joined(separator: ","))
        store.saveUI()
    }

    private func className(_ id: String) -> String { findById(store.data.school.classes, id)?.name ?? "" }

    private var events: [CalEvent] {
        var out: [CalEvent] = []
        if kindOn("Task") {
            for t in store.data.tasks where !t.dueDate.isEmpty {
                let tm = Format.time(t.startTime)
                out.append(CalEvent(date: t.dueDate, title: t.title, time: t.startTime, color: Theme.purple, kind: "Task",
                                    completed: t.completed, meta: tm.isEmpty ? "Task" : "Task · \(tm)",
                                    open: { [weak store] in store?.presentTaskForm(t) }))
            }
        }
        if kindOn("Assignment") {
            for a in store.data.school.assignments where !a.dueDate.isEmpty {
                let c = SchoolEngine.classColor(findById(store.data.school.classes, a.classId))
                let tm = Format.time(a.dueTime)
                out.append(CalEvent(date: a.dueDate, title: a.title, time: a.dueTime, color: Color(hex: c), kind: "Assignment",
                                    completed: SchoolEngine.isComplete(a),
                                    meta: "Due" + (tm.isEmpty ? "" : " \(tm)") + (className(a.classId).isEmpty ? "" : " · \(className(a.classId))"),
                                    open: { [weak store] in store?.presentAssignmentForm(a) }))
            }
        }
        if kindOn("Bill") {
            for b in store.data.finance.bills where !b.dueDate.isEmpty {
                out.append(CalEvent(date: b.dueDate, title: b.name, time: "", color: Theme.orange, kind: "Bill",
                                    completed: FinanceEngine.isPaidOn(b, b.dueDate), meta: "Bill · \(Format.currency(b.amount))",
                                    open: { [weak store] in store?.presentBillForm(b) }))
            }
        }
        if kindOn("Reminder") {
            for r in store.data.reminders where !r.date.isEmpty {
                let tm = Format.time(r.time)
                out.append(CalEvent(date: r.date, title: r.title, time: r.time, color: Theme.cyan, kind: "Reminder",
                                    completed: r.completed, meta: tm.isEmpty ? "Reminder · no time" : "Reminder · \(tm)",
                                    open: { [weak store] in store?.presentReminderForm(r) }))
            }
        }
        if kindOn("Workout") {
            for w in store.data.gym.workouts where !w.date.isEmpty {
                out.append(CalEvent(date: w.date, title: w.split.isEmpty ? "Workout" : w.split, time: w.startTime, color: Theme.pink, kind: "Workout",
                                    completed: false, meta: "Workout", open: { [weak store] in store?.presentWorkoutForm(w) }))
            }
        }
        if kindOn("Google"), store.data.settings.gcalEnabled {
            for e in store.email.gcalEvents {
                let tm = e.startMin.map { Format.time(Self.hm($0)) } ?? ""
                out.append(CalEvent(date: e.date, title: e.title, time: e.startMin.map(Self.hm) ?? "",
                                    color: Color(hex: e.colorHex), kind: "Google", meta: "Google Calendar" + (tm.isEmpty ? "" : " · \(tm)")))
            }
        }
        if kindOn("Apple"), store.data.settings.icalMirror {
            let on = Set(store.appleCal.calendars.filter(\.on).map(\.id))
            for e in store.appleCal.events where on.contains(e.calendarId) {
                let tm = e.startMin.map { Format.time(Self.hm($0)) } ?? ""
                out.append(CalEvent(date: e.date, title: e.title, time: e.startMin.map(Self.hm) ?? "",
                                    color: Color(hex: e.colorHex), kind: "Apple", meta: "iPhone calendar" + (tm.isEmpty ? "" : " · \(tm)")))
            }
        }
        return out
    }

    static func hm(_ m: Int) -> String { String(format: "%02d:%02d", (m / 60) % 24, m % 60) }

    private func classMeetings(on ds: String) -> [CalEvent] {
        guard kindOn("Class"), let d = DateUtils.parse(ds) else { return [] }
        let wd = DateUtils.weekday(d)
        return store.data.school.classes.compactMap { k in
            guard !k.completed, !k.meetingTime.isEmpty, SchoolEngine.meetingWeekdays(k.meetingDays).contains(wd) else { return nil }
            let c = Colors.safeHex(k.accentColor, "#7c5cff")
            let a = Format.time(k.meetingTime), b = Format.time(k.meetingEndTime)
            return CalEvent(date: ds, title: k.name.isEmpty ? "Class" : k.name, time: k.meetingTime, color: Color(hex: c), kind: "Class",
                            meta: "Class" + (a.isEmpty ? "" : " · \(a)") + (b.isEmpty ? "" : " to \(b)"))
        }
    }
    private func classMeetingBlocks(_ ds: String) -> [TimelineEvent] {
        guard kindOn("Class"), let d = DateUtils.parse(ds) else { return [] }
        let wd = DateUtils.weekday(d)
        return store.data.school.classes.compactMap { k in
            guard !k.completed, let start = SchoolEngine.timeMinutes(k.meetingTime), SchoolEngine.meetingWeekdays(k.meetingDays).contains(wd) else { return nil }
            let end = SchoolEngine.timeMinutes(k.meetingEndTime).flatMap { $0 > start ? $0 : nil } ?? (start + 60)
            let c = Colors.safeHex(k.accentColor, "#7c5cff")
            return TimelineEvent(date: ds, title: k.name.isEmpty ? "Class" : k.name, color: Color(hex: c), startMin: start, durationMin: end - start)
        }
    }
    private func items(on ds: String) -> [CalEvent] {
        (events.filter { $0.date == ds } + classMeetings(on: ds)).sorted { ($0.time.isEmpty ? "99" : $0.time) < ($1.time.isEmpty ? "99" : $1.time) }
    }

    @State private var monthOffset = 0
    @State private var weekOffset = 0
    @State private var dayOffset = 0

    private var effectiveSelected: String { store.ui.calendarSelectedDate.isEmpty ? today : store.ui.calendarSelectedDate }
    private var view: String { store.ui.calendarView }
    private var weekStyle: String { store.data.settings.calendarWeekStyle }
    private var dayStyle: String { store.data.settings.calendarDayStyle }

    var body: some View {
        TopBar(title: "Calendar", eyebrow: DateLabel.string(today, "EEEE, MMMM d")) {
            PillButton(label: "Add", icon: "plus", style: .primary) { store.presentTaskForm(date: effectiveSelected) }
                .tourTarget("calendar.add")
        }
        HStack(spacing: 8) {
            Segmented(options: [("month", "Month"), ("week", "Week"), ("day", "Day")], selection: Binding(
                get: { store.ui.calendarView }, set: { store.ui.calendarView = $0; store.saveUI() }), fullWidth: true)
            filterMenu
        }
        if isFiltered {
            HStack(spacing: 6) {
                Text("Showing \(activeKinds.isEmpty ? "nothing" : activeKinds.sorted().joined(separator: ", ").lowercased())")
                    .font(.planner(12)).foregroundStyle(Theme.muted).lineLimit(1)
                Spacer()
                Button { store.ui.calendarKindFilter = "all"; store.saveUI() } label: {
                    Text("Show all").font(.planner(12, .semibold)).foregroundStyle(Theme.text)
                }.buttonStyle(.plain)
            }
            .padding(.horizontal, 14).frame(height: 36)
            .background(Theme.card, in: Capsule())
        }

        switch view {
        case "week": weekBody.transition(.opacity)
        case "day": dayBody.transition(.opacity)
        default: monthBody.transition(.opacity)
        }
    }

    // MARK: month
    private var monthAnchor: Date {
        DateUtils.addMonths(DateUtils.startOfMonth(DateUtils.parse(today) ?? Date()), monthOffset)
    }
    private func monthAnchor(_ off: Int) -> Date {
        DateUtils.addMonths(DateUtils.startOfMonth(DateUtils.parse(today) ?? Date()), off)
    }
    private var monthBody: some View {
        VStack(spacing: 12) {
            VStack(spacing: 10) {
                navRow(title: DateLabel.date(monthAnchor, "MMMM yyyy"), isCurrent: monthOffset == 0,
                       back: { withAnimation(Theme.easeOut) { monthOffset -= 1 } },
                       forward: { withAnimation(Theme.easeOut) { monthOffset += 1 } },
                       reset: { withAnimation(Theme.easeOut) { monthOffset = 0; select(today) } })
                let byDate = Dictionary(grouping: events, by: { $0.date })
                InfinitePager(offset: $monthOffset, height: MonthGrid.height(for: monthAnchor)) { off in
                    MonthGrid(anchor: monthAnchor(off), today: today, selected: effectiveSelected, accentHex: store.accentColor,
                              dots: { ds in ((byDate[ds] ?? []) + classMeetings(on: ds)).map(\.color) },
                              onSelect: { select($0) },
                              onLongPress: { jumpToDay($0) })
                }
            }
            .plannerCard(padding: 14, radius: Theme.radiusMd)
            .animation(Theme.easeOut, value: monthOffset)
            dayCard(effectiveSelected)
        }
    }

    private func select(_ ds: String) {
        withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.15)) {
            store.ui.calendarSelectedDate = ds
            store.saveUI()
        }
    }
    private func jumpToDay(_ ds: String) {
        Haptics.tap()
        withAnimation(Theme.easeOut) {
            store.ui.calendarSelectedDate = ds
            store.ui.calendarView = "day"
            store.saveUI()
        }
    }

    private func navRow(title: String, isCurrent: Bool, back: @escaping () -> Void, forward: @escaping () -> Void, reset: @escaping () -> Void) -> some View {
        HStack(spacing: 6) {
            Button(action: back) {
                Icon("chevron", size: 15, label: "Previous").rotationEffect(.degrees(180)).foregroundStyle(Theme.muted)
                    .frame(width: 40, height: 40).background(Theme.cardSoft, in: Circle())
            }.buttonStyle(PressScale())
            Spacer(minLength: 4)
            Text(title).font(.planner(16, .semibold)).foregroundStyle(Theme.text).contentTransition(.numericText())
            Spacer(minLength: 4)
            if !isCurrent {
                Button(action: reset) {
                    Text("Today").font(.planner(12.5, .semibold)).foregroundStyle(Theme.muted)
                        .padding(.horizontal, 10).frame(height: 32).background(Theme.cardSoft, in: Capsule())
                }.buttonStyle(PressScale())
                .transition(.opacity)
            }
            Button(action: forward) {
                Icon("chevron", size: 15, label: "Next").foregroundStyle(Theme.muted)
                    .frame(width: 40, height: 40).background(Theme.cardSoft, in: Circle())
            }.buttonStyle(PressScale())
        }
        .animation(Theme.easeOut, value: isCurrent)
    }

    /// The selected day's items, the same row pattern as everywhere else.
    private func dayCard(_ ds: String) -> some View {
        let list = items(on: ds)
        return ListCard {
            HStack(alignment: .firstTextBaseline) {
                CardHead(dayTitle(ds), fact: list.isEmpty ? "" : "\(list.count)")
                Spacer(minLength: 8)
                Button { store.presentTaskForm(date: ds) } label: {
                    Text("Add").font(.planner(12.5, .semibold)).foregroundStyle(Theme.muted)
                        .padding(.horizontal, 10).frame(height: 28).background(Theme.cardSoft, in: Capsule())
                }.buttonStyle(.plain)
            }
            .padding(.top, 8).padding(.bottom, 2)
            if list.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Nothing on \(DateLabel.string(ds, "EEEE, MMMM d")).").font(.planner(14, .semibold)).foregroundStyle(Theme.text)
                    Text("Plan work for a deadline here, or add a task.").font(.planner(12.5)).foregroundStyle(Theme.muted)
                }
                .padding(.vertical, 10)
            } else {
                ForEach(Array(list.enumerated()), id: \.element.id) { idx, e in
                    AgendaRow(color: e.color, title: e.title, meta: e.meta, right: Format.time(e.time), completed: e.completed, open: e.open)
                    if idx < list.count - 1 { RowDivider(inset: 17) }
                }
            }
        }
        .id(ds)
        .transition(.opacity)
        .animation(.linear(duration: 0.15), value: ds)
    }
    private func dayTitle(_ ds: String) -> String {
        if ds == today { return "Today · " + DateLabel.string(ds, "EEE, MMM d") }
        if ds == DateUtils.addDays(today, 1) { return "Tomorrow · " + DateLabel.string(ds, "EEE, MMM d") }
        return DateLabel.string(ds, "EEEE, MMM d")
    }

    // MARK: timeline events
    private func minutes(_ time: String) -> Int? {
        let parts = time.split(separator: ":"); guard parts.count >= 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
        return h * 60 + m
    }
    private var timelineEvents: [TimelineEvent] {
        var out: [TimelineEvent] = []
        if kindOn("Task") {
            for t in store.data.tasks where !t.dueDate.isEmpty {
                out.append(TimelineEvent(date: t.dueDate, title: t.title, color: Theme.purple, startMin: minutes(t.startTime),
                                         durationMin: durationBetween(t.startTime, t.endTime),
                                         completed: t.completed, open: { [weak store] in store?.presentTaskForm(t) }))
            }
        }
        if kindOn("Assignment") {
            for a in store.data.school.assignments where !a.dueDate.isEmpty {
                let c = SchoolEngine.classColor(findById(store.data.school.classes, a.classId))
                // a deadline takes no time: a thin row at its minute
                out.append(TimelineEvent(date: a.dueDate, title: "Due · " + a.title, color: Color(hex: c), startMin: minutes(a.dueTime), durationMin: 30,
                                         completed: SchoolEngine.isComplete(a), open: { [weak store] in store?.presentAssignmentForm(a) }))
            }
        }
        if kindOn("Reminder") {
            for r in store.data.reminders where !r.date.isEmpty {
                out.append(TimelineEvent(date: r.date, title: r.title, color: Theme.cyan, startMin: minutes(r.time), durationMin: 30,
                                         completed: r.completed, open: { [weak store] in store?.presentReminderForm(r) }))
            }
        }
        if kindOn("Workout") {
            for w in store.data.gym.workouts where !w.date.isEmpty {
                out.append(TimelineEvent(date: w.date, title: w.split.isEmpty ? "Workout" : w.split, color: Theme.pink,
                                         startMin: minutes(w.startTime), durationMin: max(30, Int(w.duration)),
                                         completed: false, open: { [weak store] in store?.presentWorkoutForm(w) }))
            }
        }
        if kindOn("Bill") {
            for b in store.data.finance.bills where !b.dueDate.isEmpty {
                out.append(TimelineEvent(date: b.dueDate, title: b.name, color: Theme.orange, startMin: nil, durationMin: 0,
                                         completed: FinanceEngine.isPaidOn(b, b.dueDate), open: { [weak store] in store?.presentBillForm(b) }))
            }
        }
        if kindOn("Google"), store.data.settings.gcalEnabled {
            for e in store.email.gcalEvents {
                out.append(TimelineEvent(date: e.date, title: e.title, color: Color(hex: e.colorHex),
                                         startMin: e.startMin, durationMin: e.startMin == nil ? 0 : max(30, e.durationMin)))
            }
        }
        if kindOn("Apple"), store.data.settings.icalMirror {
            let on = Set(store.appleCal.calendars.filter(\.on).map(\.id))
            for e in store.appleCal.events where on.contains(e.calendarId) {
                out.append(TimelineEvent(date: e.date, title: e.title, color: Color(hex: e.colorHex),
                                         startMin: e.startMin, durationMin: e.startMin == nil ? 0 : max(30, e.durationMin)))
            }
        }
        return out
    }
    private func durationBetween(_ start: String, _ end: String) -> Int {
        guard let s = minutes(start) else { return 60 }
        if let e = minutes(end), e > s { return e - s }
        return 60
    }

    // MARK: week
    private func weekDays(_ off: Int) -> [String] {
        let base = DateUtils.addDays(DateUtils.parse(today) ?? Date(), off * 7)
        let start = DateUtils.startOfWeek(base)
        let count = store.data.settings.weekWeekdaysOnly ? 5 : 7
        return (0..<count).map { DateUtils.string(DateUtils.addDays(start, $0)) }
    }
    private func weekTitle(_ days: [String]) -> String {
        guard let first = days.first, let last = days.last else { return "" }
        let sameMonth = String(first.prefix(7)) == String(last.prefix(7))
        return sameMonth
            ? "\(DateLabel.string(first, "MMM d")) to \(DateLabel.string(last, "d"))"
            : "\(DateLabel.string(first, "MMM d")) to \(DateLabel.string(last, "MMM d"))"
    }

    private var styleToggle: some View {
        let isWeek = view == "week"
        return Segmented(options: [("blocks", "Blocks"), ("list", "List")], selection: Binding(
            get: { isWeek ? weekStyle : dayStyle },
            set: { v in
                if isWeek { store.data.settings.calendarWeekStyle = v } else { store.data.settings.calendarDayStyle = v }
                store.save()
            }))
    }

    @ViewBuilder private var weekBody: some View {
        VStack(spacing: 10) {
            navRow(title: weekTitle(weekDays(weekOffset)), isCurrent: weekOffset == 0,
                   back: { withAnimation(Theme.easeOut) { weekOffset -= 1 } },
                   forward: { withAnimation(Theme.easeOut) { weekOffset += 1 } },
                   reset: { withAnimation(Theme.easeOut) { weekOffset = 0 } })
            HStack { styleToggle; Spacer() }
            if weekStyle == "list" {
                weekList(weekDays(weekOffset))
                    .id(weekOffset)
                    .transition(.asymmetric(insertion: .move(edge: .trailing).combined(with: .opacity), removal: .opacity))
                    .gesture(DragGesture(minimumDistance: 24).onEnded { v in
                        guard abs(v.translation.width) > abs(v.translation.height) * 1.2 else { return }
                        withAnimation(Theme.easeOut) { if v.translation.width > 40 { weekOffset -= 1 } else if v.translation.width < -40 { weekOffset += 1 } }
                    })
            } else {
                InfinitePager(offset: $weekOffset, height: 520) { off in
                    let days = weekDays(off)
                    TimelineGrid(days: days, events: timelineEvents + days.flatMap { classMeetingBlocks($0) }, today: today,
                                 fullBleed: true,
                                 selectedDay: store.ui.calendarSelectedDate,
                                 onDayTap: { d in select(store.ui.calendarSelectedDate == d ? "" : d) },
                                 onDayLongPress: { d in jumpToDay(d) },
                                 onSlotTap: { d, minutes in newItemAt(d, minutes) })
                }
                .padding(.horizontal, -16)
                if !store.ui.calendarSelectedDate.isEmpty { dayCard(store.ui.calendarSelectedDate) }
            }
        }
    }

    /// Seven day rows, one card each. Planned work and deadlines are two rows
    /// on two days, never merged.
    private func weekList(_ days: [String]) -> some View {
        VStack(spacing: 8) {
            ForEach(days, id: \.self) { ds in
                let list = items(on: ds)
                ListCard(padding: 14) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(DateLabel.string(ds, "EEE").uppercased()).font(.planner(11, .bold)).tracking(0.8)
                            .foregroundStyle(ds == today ? Theme.accent(store.accentColor) : Theme.muted)
                        Text(DateLabel.string(ds, "d")).font(.planner(15, .bold)).foregroundStyle(ds == today ? Theme.accent(store.accentColor) : Theme.text).monospacedDigit()
                        Spacer()
                        if list.isEmpty { Text("Nothing").font(.planner(12)).foregroundStyle(Theme.subtle) }
                        Button { store.presentTaskForm(date: ds) } label: {
                            Icon("plus", size: 12, label: "Add on this day").foregroundStyle(Theme.subtle).frame(width: 28, height: 28)
                        }.buttonStyle(.plain)
                    }
                    .padding(.top, 6)
                    ForEach(Array(list.enumerated()), id: \.element.id) { idx, e in
                        AgendaRow(color: e.color, title: e.title, meta: e.meta, right: Format.time(e.time), completed: e.completed, open: e.open)
                        if idx < list.count - 1 { RowDivider(inset: 17) }
                    }
                }
                .contentShape(Rectangle())
                .onLongPressGesture(minimumDuration: 0.4) { jumpToDay(ds) }
            }
        }
    }

    // MARK: day
    private var dayBody: some View {
        let d = effectiveSelected
        return VStack(spacing: 10) {
            dayStrip(d)
            HStack {
                Text(DateLabel.string(d, "EEEE, MMMM d")).font(.planner(16, .semibold)).foregroundStyle(Theme.text)
                    .contentTransition(.numericText())
                Spacer()
                styleToggle
            }
            if dayStyle == "list" {
                dayCard(d)
            } else {
                TimelineGrid(days: [d], events: timelineEvents + classMeetingBlocks(d), today: today, dayHeader: false,
                             onSlotTap: { day, minutes in newItemAt(day, minutes) })
                    .plannerCard(padding: 8, radius: Theme.radiusMd)
                    .id(d)
                    .transition(.opacity)
                    .gesture(DragGesture(minimumDistance: 24).onEnded { v in
                        guard abs(v.translation.width) > abs(v.translation.height) * 1.2 else { return }
                        let shifted = DateUtils.addDays(d, v.translation.width > 0 ? -1 : 1)
                        withAnimation(Theme.easeOut) { store.ui.calendarSelectedDate = shifted; store.saveUI() }
                    })
            }
        }
    }

    /// The week strip above the day: tap a day to switch; chevrons page weeks.
    private func dayStrip(_ selected: String) -> some View {
        let weekStart = DateUtils.startOfWeek(DateUtils.parse(selected) ?? Date())
        return HStack(spacing: 2) {
            stripChevron(back: true, selected: selected)
            ForEach(0..<7, id: \.self) { i in
                let ds = DateUtils.string(DateUtils.addDays(weekStart, i))
                let sel = ds == selected
                VStack(spacing: 3) {
                    Text(DateLabel.string(ds, "EEE")).font(.planner(10, .semibold)).foregroundStyle(Theme.subtle)
                    Text("\(Int(ds.suffix(2)) ?? 0)")
                        .font(.planner(15, sel || ds == today ? .bold : .regular)).monospacedDigit()
                        .foregroundStyle(sel ? Theme.accentContrast(store.accentColor)
                                             : (ds == today ? Theme.accent(store.accentColor) : Theme.text))
                        .frame(width: 32, height: 32)
                        .background(sel ? Theme.accent(store.accentColor) : .clear, in: Circle())
                }
                .frame(maxWidth: .infinity)
                .contentShape(Rectangle())
                .onTapGesture {
                    withAnimation(Theme.periodSwap) { store.ui.calendarSelectedDate = ds; store.saveUI() }
                }
            }
            stripChevron(back: false, selected: selected)
        }
        .padding(.vertical, 8).padding(.horizontal, 4)
        .plannerCard(padding: 4, radius: Theme.radiusMd)
    }
    private func stripChevron(back: Bool, selected: String) -> some View {
        Button {
            let shifted = DateUtils.string(DateUtils.addDays(DateUtils.parse(selected) ?? Date(), back ? -7 : 7))
            withAnimation(Theme.periodSwap) { store.ui.calendarSelectedDate = shifted; store.saveUI() }
        } label: {
            Icon("chevron", size: 14, label: back ? "Previous week" : "Next week").rotationEffect(.degrees(back ? 180 : 0))
                .foregroundStyle(Theme.subtle)
                .frame(width: 26, height: 44)
                .contentShape(Rectangle())
        }.buttonStyle(.plain)
    }

    private func newItemAt(_ date: String, _ minutes: Int) {
        let time = String(format: "%02d:%02d", minutes / 60, minutes % 60)
        Haptics.tap()
        store.presentTaskForm(date: date, startTime: time)
    }

    // MARK: filter menu
    private var filterMenu: some View {
        Menu {
            ForEach(Self.allKinds, id: \.self) { k in
                Button { toggleKind(k) } label: {
                    if kindOn(k) { Label(k + "s", systemImage: "checkmark") } else { Text(k + "s") }
                }
            }
            Divider()
            Button { store.ui.calendarKindFilter = "all"; store.saveUI() } label: { Label("Show everything", systemImage: "line.3.horizontal.decrease.circle") }
        } label: {
            Icon("list", size: 16, label: "Filter")
                .foregroundStyle(isFiltered ? Theme.accentContrast(store.accentColor) : Theme.muted)
                .frame(width: 40, height: 40)
                .background(isFiltered ? Theme.accent(store.accentColor) : Theme.cardSoft, in: Circle())
        }
    }
}
