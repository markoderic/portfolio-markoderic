import SwiftUI
import PlannerCore

// School (round two, 2026-09-06). The completion card with the coloured bars
// stays. Under it "Due this week" is the first list: the due day where the
// eye lands, the class in its colour. Class cards keep their colour, the exact
// done count and the next meeting or the overdue count. Overdue work stays in
// place with "Overdue · was due Fri, Sep 3" and two exits, Move or Finish.
// The calendar at the bottom is the same month grid as the Calendar tab.

// MARK: - Overview

struct SchoolOverviewContent: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    @Bindable var store: AppStore
    private var today: String { store.todayString }

    private var range: DateRange { store.schoolRange(store.ui.schoolSpan) }
    private var statsRange: DateRange? { store.schoolStatsRange(store.ui.schoolSpan) }
    private var stats: SchoolStatsResult { SchoolEngine.stats(store.data, range: range, today: today) }

    private var activeClasses: [SchoolClass] { store.data.school.classes.filter { $0.isActive } }
    private var openAll: [Assignment] { SchoolEngine.sortByDue(store.data.school.assignments.filter { !SchoolEngine.isComplete($0) }) }
    private var weekEnd: String { DateUtils.addDays(today, 6) }
    private var dueThisWeek: [Assignment] { openAll.filter { !$0.dueDate.isEmpty && $0.dueDate <= weekEnd } }
    private var overdueCount: Int { dueThisWeek.filter { Ranges.isBeforeToday($0.dueDate, today: today) }.count }
    private var later: [Assignment] { openAll.filter { $0.dueDate.isEmpty || $0.dueDate > weekEnd } }
    private var completedList: [Assignment] {
        store.data.school.assignments.filter { SchoolEngine.isComplete($0) }.sorted { $0.dueDate > $1.dueDate }
    }

    @State private var monthOffset = 0

    var body: some View {
        TopBar(title: "School", eyebrow: eyebrow) {
            PillButton(label: "Add", icon: "plus", style: .primary) { store.presentAssignmentForm() }
        }

        // completion (the bars Marko keeps) with the timeframe as a menu
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                CardHead("Completion", fact: "\(stats.completed.count) of \(stats.total) done")
                Spacer(minLength: 8)
                spanMenu
            }
            SchoolProgressView(
                percent: stats.percent, completed: stats.completed.count, total: stats.total, overdue: stats.overdue.count,
                perClass: activeClasses.map { SchoolEngine.classStats($0.id, store.data, range: statsRange) },
                shape: store.data.settings.schoolProgressShape,
                showLegend: store.data.settings.schoolProgressLegend,
                bare: true
            )
        }
        .plannerCard(padding: 16, radius: Theme.radiusMd)

        // MARK: Due this week
        MilestoneCard(store: store, kind: "assignment", empty: dueThisWeek.isEmpty) { celebrated in
        if dueThisWeek.isEmpty {
            EmptyCard(fact: celebrated ? "Nothing due this week. All of it is done." : "Nothing due this week.",
                      next: activeClasses.isEmpty ? "Add a class, then its assignments land here with their dates."
                                                  : "Add an assignment, or import a syllabus to get its dates.")
        } else {
            ListCard {
                CardHead("Due this week", fact: "\(dueThisWeek.count)" + (overdueCount > 0 ? " · \(overdueCount) overdue" : ""))
                    .padding(.top, 8).padding(.bottom, 2)
                ForEach(Array(dueThisWeek.enumerated()), id: \.element.id) { idx, a in
                    AssignmentRowX(store: store, assignment: a)
                    if idx < dueThisWeek.count - 1 { RowDivider(inset: 44) }
                }
            }
        }
        }

        // MARK: Classes
        HStack(alignment: .firstTextBaseline) {
            SecHead("Classes · \(activeClasses.count)")
            Spacer()
            Button { store.presentClassForm() } label: {
                HStack(spacing: 5) { Icon("plus", size: 12); Text("Add class").font(.planner(12.5, .semibold)) }
                    .foregroundStyle(Theme.muted).padding(.horizontal, 11).frame(height: 30)
                    .background(Theme.cardSoft, in: Capsule())
            }.buttonStyle(.plain).tourTarget("school.addclass")
        }
        if activeClasses.isEmpty {
            EmptyCard(fact: "No classes yet.", next: "Add a class by name, or import a syllabus to get its dates.",
                      action: ("Add a class", { store.presentClassForm() }))
        } else {
            let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: typeSize.isAccessibilitySize ? 1 : 2)
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(activeClasses) { klass in classCard(klass) }
            }
        }
        let doneClasses = store.data.school.classes.filter { $0.completed || $0.paused }
        if !doneClasses.isEmpty {
            CollapsibleSection(title: "Completed classes", items: doneClasses, startExpanded: false, accent: Theme.muted) { klass in
                completedClassRow(klass)
            }
        }

        // MARK: later, done
        if !later.isEmpty {
            CollapsibleSection(title: "Later", items: later,
                               startExpanded: later.contains { "assignment-" + $0.id == store.scrollTarget }, accent: Theme.muted) { a in
                AssignmentRowX(store: store, assignment: a, showDay: true)
            }
        }
        if !completedList.isEmpty {
            CollapsibleSection(title: "Done", items: Array(completedList.prefix(80)) + completedList.dropFirst(80).filter { $0.id == store.revealedCompletedAssignmentID }, startExpanded: store.revealedCompletedAssignmentID != nil, accent: Theme.muted) { a in
                AssignmentRowX(store: store, assignment: a, showDay: true)
            }
        }

        // MARK: weekly schedule
        if activeClasses.contains(where: { !$0.meetingTime.isEmpty && !SchoolEngine.meetingWeekdays($0.meetingDays).isEmpty }) {
            VStack(alignment: .leading, spacing: 12) {
                CardHead("Weekly schedule")
                ClassScheduleGrid(classes: activeClasses)
            }
            .plannerCard(padding: 14, radius: Theme.radiusMd)
        }

        // MARK: calendar (the same month as the Calendar tab)
        calendarCard
    }

    private var eyebrow: String {
        let c = activeClasses.count, o = openAll.count
        if c == 0 { return "Classes, assignments and grades" }
        return "\(c) class\(c == 1 ? "" : "es") · \(o) open"
    }

    private var spanMenu: some View {
        let options: [(String, String)] = [("today", "Today"), ("week", "This week"), ("month", "This month"), ("year", "This year"), ("all", "All time")]
        let current = options.first { $0.0 == store.ui.schoolSpan }?.1 ?? "All time"
        return Menu {
            ForEach(options, id: \.0) { opt in
                Button { withAnimation(Theme.periodSwap) { store.ui.schoolSpan = opt.0; store.saveUI() } } label: {
                    store.ui.schoolSpan == opt.0 ? Label(opt.1, systemImage: "checkmark") : Label(opt.1, systemImage: "")
                }
            }
        } label: {
            HStack(spacing: 4) {
                Text(current).font(.planner(12.5, .semibold))
                Icon("chevron", size: 11).rotationEffect(.degrees(90))
            }
            .foregroundStyle(Theme.muted).padding(.horizontal, 10).frame(height: 28)
            .background(Theme.cardSoft, in: Capsule())
        }
    }

    // MARK: class card: colour spine, name, meeting line, "6 of 8 done", next meeting or overdue
    private func classCard(_ klass: SchoolClass) -> some View {
        let s = SchoolEngine.classStats(klass.id, store.data, range: statsRange)
        let color = Color(hex: s.color)
        let open = SchoolEngine.sortByDue(store.data.school.assignments.filter { $0.classId == klass.id && !SchoolEngine.isComplete($0) })
        let overdue = open.filter { Ranges.isBeforeToday($0.dueDate, today: today) }.count
        let next = open.first { !$0.dueDate.isEmpty && $0.dueDate >= today }
        return Button {
            withAnimation(Theme.easeOut) {
                store.ui.schoolView = "class"; store.ui.selectedClassId = klass.id; store.saveUI()
            }
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack(alignment: .top, spacing: 6) {
                    Text(s.name).font(.planner(15, .semibold)).foregroundStyle(Theme.text)
                        .lineLimit(2).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 2)
                    if let letter = s.displayLetter {
                        Text(letter).font(.planner(12, .bold)).foregroundStyle(color)
                            .padding(.horizontal, 7).frame(height: 22).background(color.opacity(0.16), in: Capsule())
                    }
                }
                Text(meetingLine(klass)).font(.planner(11.5)).foregroundStyle(Theme.muted).lineLimit(1)
                Spacer(minLength: 2)
                Text("\(s.completed) of \(s.total) done").font(.planner(12, .semibold)).foregroundStyle(Theme.text).monospacedDigit()
                Text(overdue > 0 ? "\(overdue) overdue" : (next.map { "Next " + Copy.dueShort($0.dueDate, today: today) } ?? (s.total == 0 ? "No work yet" : "All caught up")))
                    .font(.planner(11.5)).foregroundStyle(Theme.muted).lineLimit(1)
                ProgressBar(percent: Double(s.percent), color: color, height: 5)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(minHeight: 118)
            .contentShape(Rectangle())
            .padding(.leading, 6)
            .plannerCard(padding: 12, radius: Theme.radiusMd)
            .leftSpine(color)
        }
        .buttonStyle(PressScale())
        .contextMenu {
            Button { store.presentClassForm(klass) } label: { Label("Edit class", systemImage: "pencil") }
            Button { store.presentGradeForm(klass) } label: { Label("Edit grade", systemImage: "graduationcap") }
            Button { store.presentAssignmentForm(classId: klass.id) } label: { Label("Add assignment", systemImage: "plus") }
            Divider()
            Button { store.setClassCompleted(klass.id, true) } label: { Label("Mark completed", systemImage: "checkmark.circle") }
        }
    }
    private func meetingLine(_ k: SchoolClass) -> String {
        var bits: [String] = []
        if !k.meetingDays.isEmpty { bits.append(k.meetingDays) }
        let start = Format.time(k.meetingTime)
        if !start.isEmpty { bits.append(start) }
        if bits.isEmpty { return k.mode == "online" ? "Online" : (k.professor.isEmpty ? "No schedule set" : k.professor) }
        return bits.joined(separator: " · ")
    }

    private func completedClassRow(_ klass: SchoolClass) -> some View {
        let s = SchoolEngine.classStats(klass.id, store.data)
        return HStack(spacing: 10) {
            Capsule().fill(Color(hex: s.color).opacity(0.7)).frame(width: 4, height: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(s.name).font(.planner(14, .semibold)).foregroundStyle(Theme.muted)
                if let letter = s.displayLetter {
                    Text("Final grade \(letter)").font(.planner(12)).foregroundStyle(Theme.subtle)
                }
            }
            Spacer()
            InlineAction("Reopen") { store.setClassCompleted(klass.id, false) }
        }
        .padding(.vertical, 6)
        .contentShape(Rectangle())
        .onTapGesture {
            withAnimation(Theme.easeOut) {
                store.ui.schoolView = "class"; store.ui.selectedClassId = klass.id; store.saveUI()
            }
        }
    }

    // MARK: calendar card (month grid + the selected day's work)
    private var calendarCard: some View {
        let anchor = DateUtils.addMonths(DateUtils.startOfMonth(DateUtils.parse(today) ?? Date()), monthOffset)
        let byDate = Dictionary(grouping: store.data.school.assignments.filter { !$0.dueDate.isEmpty }, by: { $0.dueDate })
        let selected = store.ui.calendarSelectedDate
        let dayItems = SchoolEngine.sortByDue(byDate[selected] ?? [])
        return VStack(alignment: .leading, spacing: 12) {
            CardHead("Calendar", fact: "deadlines")
            HStack(spacing: 6) {
                Button { withAnimation(Theme.easeOut) { monthOffset -= 1 } } label: {
                    Icon("chevron", size: 14, label: "Previous month").rotationEffect(.degrees(180)).foregroundStyle(Theme.muted)
                        .frame(width: 36, height: 36).background(Theme.cardSoft, in: Circle())
                }.buttonStyle(PressScale())
                Spacer()
                Text(DateLabel.date(anchor, "MMMM yyyy")).font(.planner(15, .semibold)).foregroundStyle(Theme.text).contentTransition(.numericText())
                Spacer()
                if monthOffset != 0 {
                    Button { withAnimation(Theme.easeOut) { monthOffset = 0 } } label: {
                        Text("Today").font(.planner(12, .semibold)).foregroundStyle(Theme.muted)
                            .padding(.horizontal, 9).frame(height: 30).background(Theme.cardSoft, in: Capsule())
                    }.buttonStyle(PressScale())
                }
                Button { withAnimation(Theme.easeOut) { monthOffset += 1 } } label: {
                    Icon("chevron", size: 14, label: "Next month").foregroundStyle(Theme.muted)
                        .frame(width: 36, height: 36).background(Theme.cardSoft, in: Circle())
                }.buttonStyle(PressScale())
            }
            InfinitePager(offset: $monthOffset, height: MonthGrid.height(for: anchor, cellHeight: 42)) { off in
                let a = DateUtils.addMonths(DateUtils.startOfMonth(DateUtils.parse(today) ?? Date()), off)
                MonthGrid(anchor: a, today: today, selected: selected, accentHex: store.accentColor, cellHeight: 42,
                          dots: { ds in (byDate[ds] ?? []).map { classColor($0.classId) } },
                          onSelect: { ds in
                              withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.15)) {
                                  store.ui.calendarSelectedDate = selected == ds ? "" : ds; store.saveUI()
                              }
                          })
            }
            if !selected.isEmpty {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text(DateLabel.string(selected, "EEEE, MMM d")).font(.planner(13, .semibold)).foregroundStyle(Theme.text)
                        Spacer()
                        Button { store.presentAssignmentForm(); } label: {
                            Text("Add").font(.planner(12, .semibold)).foregroundStyle(Theme.muted)
                                .padding(.horizontal, 9).frame(height: 26).background(Theme.cardSoft, in: Capsule())
                        }.buttonStyle(.plain)
                    }
                    .padding(.bottom, 4)
                    if dayItems.isEmpty {
                        Text("Nothing due on \(DateLabel.string(selected, "EEEE")).").font(.planner(12.5)).foregroundStyle(Theme.muted).padding(.vertical, 6)
                    } else {
                        ForEach(dayItems) { a in
                            AgendaRow(color: classColor(a.classId), title: a.title,
                                      meta: (className(a.classId).isEmpty ? "" : className(a.classId) + " · ") + (Format.time(a.dueTime).isEmpty ? "Due" : "Due \(Format.time(a.dueTime))"),
                                      completed: SchoolEngine.isComplete(a), open: { store.presentAssignmentForm(a) })
                        }
                    }
                }
                .transition(.opacity)
            }
        }
        .plannerCard(padding: 14, radius: Theme.radiusMd)
        .animation(.linear(duration: 0.15), value: selected)
        .animation(Theme.easeOut, value: monthOffset)
    }

    private func className(_ id: String) -> String { findById(store.data.school.classes, id)?.name ?? "" }
    private func classColor(_ id: String) -> Color {
        Color(hex: SchoolEngine.classColor(findById(store.data.school.classes, id), fallback: "#7c5cff"))
    }
}

// MARK: - Class detail (layered screen)

struct ClassDetailContent: View {
    @Bindable var store: AppStore
    private var today: String { store.todayString }
    private var classId: String { store.ui.selectedClassId }

    var body: some View {
        let klass = findById(store.data.school.classes, classId) ?? SchoolClass()
        let s = SchoolEngine.classStats(classId, store.data)
        let color = Color(hex: Colors.safeHex(klass.accentColor, "#7c5cff"))
        let assignments = store.data.school.assignments.filter { $0.classId == classId }
        let open = SchoolEngine.sortByDue(assignments.filter { !SchoolEngine.isComplete($0) })
        let overdue = open.filter { Ranges.isBeforeToday($0.dueDate, today: today) }.count
        let done = assignments.filter { SchoolEngine.isComplete($0) }.sorted { $0.dueDate > $1.dueDate }
        let graded = done.filter { $0.pointsPossible > 0 }
        let rest = done.filter { $0.pointsPossible <= 0 }
        let exam = SchoolEngine.sortByDue(open.filter { isExam($0) && !$0.dueDate.isEmpty && $0.dueDate >= today }).first

        Button { withAnimation(Theme.easeOut) { store.goBack() } } label: {
            HStack(spacing: 4) { Icon("chevron", size: 16).rotationEffect(.degrees(180)); Text("School").font(.planner(15, .semibold)) }
                .foregroundStyle(Theme.muted).frame(height: 44).contentShape(Rectangle())
        }.buttonStyle(.plain)

        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 8) {
                Capsule().fill(color).frame(width: 5, height: 22)
                Text(klass.name.isEmpty ? "Class" : klass.name).font(.planner(26, .bold)).foregroundStyle(Theme.text).tracking(-0.5)
            }
            Text(scheduleLine(klass)).font(.planner(13)).foregroundStyle(Theme.muted)
        }

        HStack(spacing: 8) {
            FactTile(value: "\(s.completed)", label: "Assignments done", of: "\(s.total)")
            FactTile(value: s.displayLetter ?? "—", label: s.pointsGrade != nil ? "Grade · from points" : (s.manualLetter.isEmpty ? "No grade yet" : "Grade · chosen"))
        }
        HStack(spacing: 8) {
            InlineAction("Edit grade") { store.presentGradeForm(klass) }
            InlineAction("Edit class") { store.presentClassForm(klass) }
            InlineAction("Add work", icon: "plus") { store.presentAssignmentForm(classId: classId) }
        }

        if let exam {
            VStack(alignment: .leading, spacing: 8) {
                CardHead("Next exam", fact: Copy.due(exam.dueDate, exam.dueTime).replacingOccurrences(of: "Due ", with: ""))
                HStack {
                    Text(exam.title).font(.planner(16, .semibold)).foregroundStyle(Theme.text)
                    Spacer()
                    TimelineView(.periodic(from: .now, by: 60)) { _ in
                        Text(examCountdown(exam.dueDate, exam.dueTime, today: today)).font(.planner(15, .semibold)).foregroundStyle(Theme.text).monospacedDigit()
                    }
                }
            }
            .plannerCard(padding: 14, radius: Theme.radiusMd)
        }

        if !klass.meetingTime.isEmpty && !SchoolEngine.meetingWeekdays(klass.meetingDays).isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                CardHead("Schedule")
                ClassScheduleGrid(classes: [klass])
            }
            .plannerCard(padding: 14, radius: Theme.radiusMd)
        }

        // open
        if open.isEmpty {
            EmptyCard(fact: assignments.isEmpty ? "No assignments in this class." : "Nothing open in this class.",
                      next: assignments.isEmpty ? "Add one, or import the syllabus." : "Add the next one when it is set.",
                      action: ("Add assignment", { store.presentAssignmentForm(classId: classId) }))
        } else {
            ListCard {
                CardHead("Open", fact: "\(open.count)" + (overdue > 0 ? " · \(overdue) overdue" : "")).padding(.top, 8).padding(.bottom, 2)
                ForEach(Array(open.enumerated()), id: \.element.id) { idx, a in
                    AssignmentRowX(store: store, assignment: a, showDay: true, hideClass: true)
                    if idx < open.count - 1 { RowDivider(inset: 44) }
                }
            }
        }
        if !graded.isEmpty {
            ListCard {
                CardHead("Graded", fact: "\(graded.count)").padding(.top, 8).padding(.bottom, 2)
                ForEach(Array(graded.enumerated()), id: \.element.id) { idx, a in
                    AssignmentRowX(store: store, assignment: a, showDay: true, hideClass: true)
                    if idx < graded.count - 1 { RowDivider(inset: 44) }
                }
            }
        }
        if !rest.isEmpty {
            CollapsibleSection(title: "Done", items: rest, startExpanded: store.revealedCompletedAssignmentID != nil, accent: Theme.muted) { a in
                AssignmentRowX(store: store, assignment: a, showDay: true, hideClass: true)
            }
        }
        HStack(spacing: 8) {
            InlineAction("Bulk add", icon: "list") { store.presentBulkAssignmentForm(classId: classId) }
            Spacer()
        }
    }

    private func scheduleLine(_ k: SchoolClass) -> String {
        var bits: [String] = []
        if !k.meetingDays.isEmpty { bits.append(k.meetingDays) }
        let start = Format.time(k.meetingTime)
        let end = Format.time(k.meetingEndTime)
        if !start.isEmpty { bits.append(end.isEmpty ? start : "\(start) to \(end)") }
        if !k.professor.isEmpty { bits.append(k.professor) }
        return bits.isEmpty ? (k.mode == "online" ? "Online class" : "No schedule set") : bits.joined(separator: " · ")
    }
    private func isExam(_ a: Assignment) -> Bool {
        "\(a.type) \(a.title)".lowercased().range(of: "\\b(exam|test|final|midterm)\\b", options: .regularExpression) != nil
    }
    /// Days, then hours (< 1 day), then minutes (< 1 hour). Stated, not alarmed.
    private func examCountdown(_ date: String, _ time: String, today: String) -> String {
        let days = FinanceEngine.daysUntil(date, today: today)
        if days < 0 { return "\(-days) day\(days == -1 ? "" : "s") ago" }
        guard !time.isEmpty else {
            if days <= 0 { return "Today" }
            if days == 1 { return "Tomorrow" }
            return "in \(days) days"
        }
        let dp = date.split(separator: "-").compactMap { Int($0) }
        let tp = time.split(separator: ":").compactMap { Int($0) }
        guard dp.count == 3, tp.count == 2 else { return "in \(days) days" }
        var c = DateComponents(); c.year = dp[0]; c.month = dp[1]; c.day = dp[2]; c.hour = tp[0]; c.minute = tp[1]
        guard let due = Calendar.current.date(from: c) else { return "in \(days) days" }
        let secs = due.timeIntervalSinceNow
        if secs <= -3600 { return "earlier today" }
        if secs <= 0 { return "Now" }
        if secs < 3600 { return "in \(Int(secs / 60)) min" }
        if secs < 86_400 { return "in \(Int(secs / 3600)) hr" }
        let d = Int(secs / 86_400)
        return d == 1 ? "Tomorrow" : "in \(d) days"
    }
}

// MARK: - Assignment row: check, title, class · due; overdue gets Move and Finish

struct AssignmentRowX: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Bindable var store: AppStore
    let assignment: Assignment
    var showDay: Bool = false
    var hideClass: Bool = false
    @State private var pendingDone = false
    private var today: String { store.todayString }

    private var a: Assignment { findById(store.data.school.assignments, assignment.id) ?? assignment }
    private var complete: Bool { SchoolEngine.isComplete(a) || pendingDone }
    private var overdue: Bool { !complete && Ranges.isBeforeToday(a.dueDate, today: today) }
    private var classColor: Color {
        Color(hex: Colors.safeHex(findById(store.data.school.classes, a.classId)?.accentColor ?? "", "#7c5cff"))
    }
    private var className: String { findById(store.data.school.classes, a.classId)?.name ?? "" }
    private var tomorrow: String { DateUtils.addDays(today, 1) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 8) {
                CheckCircle(done: complete) { toggleComplete() }
                    .background(MilestoneRing(store: store, id: a.id, enabled: hideClass == (store.ui.schoolView == "class")))
                Button { store.presentAssignmentForm(a) } label: {
                    HStack(spacing: 8) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(a.title).font(.planner(15, .semibold)).foregroundStyle(Theme.text)
                                .strikethrough(complete, color: Theme.subtle).lineLimit(2)
                            HStack(spacing: 5) {
                                if !hideClass && !className.isEmpty {
                                    Circle().fill(classColor).frame(width: 6, height: 6)
                                    Text(className).font(.planner(12, .semibold)).foregroundStyle(classColor).lineLimit(1)
                                }
                                Text(meta).font(.planner(12)).foregroundStyle(Theme.muted).lineLimit(1)
                            }
                        }
                        Spacer(minLength: 6)
                        if !right.isEmpty {
                            Text(right).font(.planner(12.5, right.contains("/") ? .semibold : .regular)).foregroundStyle(right.contains("/") ? Theme.text : Theme.muted).monospacedDigit()
                        }
                    }
                    .opacity(complete ? 0.55 : 1)
                    .animation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.2), value: complete)
                    .contentShape(Rectangle())
                }.buttonStyle(.plain)
            }
            .padding(.vertical, 6)
            if overdue {
                HStack(spacing: 8) {
                    InlineAction("Due \(Copy.dayName(tomorrow, today: today))") { move(to: tomorrow) }
                    InlineAction("Finish") { toggleComplete() }
                }
                .padding(.leading, 44).padding(.bottom, 10)
            }
        }
        .swipeActions([
            SwipeAction(label: "Edit") { store.presentAssignmentForm(a) },
            .delete { store.deleteAssignment(a.id) }
        ])
        .id("assignment-" + a.id)
        .modifier(CompletionTransition())
        .contextMenu {
            Button { store.setAssignmentStatus(a.id, "not started") } label: { Label("Not started", systemImage: "circle") }
            Button { store.setAssignmentStatus(a.id, "in progress") } label: { Label("In progress", systemImage: "clock") }
            Button { toggleComplete() } label: { Label(complete ? "Reopen" : "Finish", systemImage: "checkmark.circle") }
            Divider()
            Button { move(to: today) } label: { Label("Due today", systemImage: "calendar") }
            Button { move(to: tomorrow) } label: { Label("Due tomorrow", systemImage: "calendar") }
            Button { store.presentAssignmentForm(a) } label: { Label("Edit", systemImage: "pencil") }
            Button(role: .destructive) { store.deleteAssignment(a.id) } label: { Label("Delete", systemImage: "trash") }
        }
    }

    private var meta: String {
        let sep = (!hideClass && !className.isEmpty) ? "· " : ""
        if overdue { return sep + Copy.overdue(a.dueDate) }
        var bits: [String] = []
        if a.dueDate.isEmpty { bits.append("No date") }
        else if showDay { bits.append(Copy.due(a.dueDate, a.dueTime)) }
        else { let t = Format.time(a.dueTime); if !t.isEmpty { bits.append("due \(t)") } }
        if a.status == "in progress" && !complete { bits.append("in progress") }
        if a.type != "assignment" && !a.type.isEmpty { bits.append(a.type) }
        return bits.isEmpty ? "" : sep + bits.joined(separator: " · ")
    }
    private var right: String {
        if complete, a.pointsPossible > 0 { return "\(Int(a.pointsEarned)) / \(Int(a.pointsPossible))" }
        if complete || overdue || showDay { return "" }
        return Copy.dueShort(a.dueDate, today: today)
    }

    private func move(to date: String) {
        guard let i = store.data.school.assignments.firstIndex(where: { $0.id == a.id }) else { return }
        let old = store.data.school.assignments[i].dueDate
        withAnimation(.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.22)) { store.data.school.assignments[i].dueDate = date }
        store.save()
        let id = a.id
        store.showNotice("Due \(Copy.dayName(date, today: today)).") { [weak store] in
            guard let store, let j = store.data.school.assignments.firstIndex(where: { $0.id == id }) else { return }
            withAnimation(Theme.easeOut) { store.data.school.assignments[j].dueDate = old }
            store.save()
        }
    }
    private func toggleComplete() {
        if SchoolEngine.isComplete(a) {
            withAnimation(Theme.easeOut) { store.uncompleteAssignment(a.id, status: "not started") }
        } else if !pendingDone {
            pendingDone = true
            let id = a.id
            let previousStatus = a.status.isEmpty ? "not started" : a.status   // Undo restores it, In progress included
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.42) {
                withAnimation(reduceMotion ? Theme.quick : Theme.grow) {
                    store.completeAssignment(id) {
                        if let current = store.data.school.assignments.first(where: { $0.id == id }),
                           !current.dueDate.isEmpty, current.dueDate <= DateUtils.addDays(store.todayString, 6),
                           Milestone.schoolEmpty(store) {
                            Milestone.finish(store: store, kind: "assignment", id: id)
                        } else { Haptics.done() }
                    }
                }
                pendingDone = false
                store.showNotice(Copy.finished) { [weak store] in
                    withAnimation(reduceMotion ? Theme.quick : Theme.grow) { store?.uncompleteAssignment(id, status: previousStatus) }
                }
            }
        }
    }
}
