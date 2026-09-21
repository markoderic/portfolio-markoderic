import SwiftUI
import PlannerCore

// Dashboard (04-features-by-section.md §Dashboard) — first pass: hero, snapshot
// tiles, Today's Focus, weekly progress. (Money-trend scrub + search land later.)
struct DashboardScreen: View {
    @Bindable var store: AppStore
    private var today: String { store.todayString }

    private var todayRange: DateRange { store.range(span: "today") }
    private var safetyRange: DateRange { Ranges.safetyForecast(todayRange, today: today) }
    private var finance: FinanceResult { FinanceEngine.calculate(store.data, range: todayRange, today: today) }
    private var safeFinance: FinanceResult { FinanceEngine.calculate(store.data, range: safetyRange, today: today) }
    private var habit: HabitStatsResult { HabitEngine.stats(store.data, range: todayRange, today: today) }
    private var school: SchoolStatsResult { SchoolEngine.stats(store.data, range: todayRange, today: today) }
    private var weekGym: Int { store.data.gym.workouts.filter { Ranges.inRange($0.date, store.range(span: "week")) }.count }

    private var openToday: [TaskItem] { store.data.tasks.filter { $0.dueDate == today && !$0.completed } }
    private var focusToday: [TaskItem] { store.data.tasks.filter { $0.dueDate == today } }

    var body: some View {
        // Weather rides beside the date line; Quick add keeps its spot untouched.
        TopBar(title: "Dashboard", eyebrow: longDate, eyebrowAccessory: AnyView(weatherChip)) {
            PillButton(label: "Quick add", icon: "spark", style: .primary) { store.presentAssistant() }
                .tourTarget("dash.quickadd")
        }
        .onAppear {
            if store.ui.onboarded && store.data.settings.showWeather {
                // The demo never asks for location: fake conditions, like screenshots.
                WeatherStore.shared.refresh(demo: AppStore.demoMode || store.isDemo)
            }
        }

        if store.proOnNotice { ProOnLine(store: store).transition(.opacity) }
        if let notice = store.recoveryNotice {
            RecoveryNoticeCard(text: notice) { withAnimation(Theme.easeOut) { store.recoveryNotice = nil } }
        }
        if store.lastWriteFailed {
            RecoveryNoticeCard(text: "Notch could not save your last change to this phone. Check free space, then make any change to try again. To be safe, export a backup from More, Data.") {
                withAnimation(Theme.easeOut) { store.lastWriteFailed = false }
            }
        }
        if !store.isUnlocked && store.ui.proLapsed && Gate.activeClassCount(store.data) > Gate.freeActiveClasses {
            TrialEndedCard(store: store)
        }

        HStack(spacing: 8) {
            Icon("search", size: 16).foregroundStyle(Theme.subtle)
            TextField("Search tasks, notes, money…", text: Binding(get: { store.ui.dashboardSearch }, set: { store.ui.dashboardSearch = $0 }))
                .font(.planner(15)).foregroundStyle(Theme.text)
            if !store.ui.dashboardSearch.isEmpty {
                Button { store.ui.dashboardSearch = "" } label: { Icon("x", size: 14).foregroundStyle(Theme.subtle) }.buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 14).padding(.vertical, 11)
        .background(Theme.cardSoft, in: Capsule())

        if store.ui.dashboardSearch.trimmingCharacters(in: .whitespaces).isEmpty {
            normalContent
        } else {
            searchResults
        }
    }

    // MARK: weather chip — quiet icon + temp beside the date, mirrors conditions
    @ViewBuilder private var weatherChip: some View {
        if store.data.settings.showWeather, let w = WeatherStore.shared.current {
            HStack(spacing: 4) {
                Icon(WeatherStore.icon(code: w.code, isDay: w.isDay), size: 13)
                Text(WeatherStore.displayTemp(w, pref: store.data.settings.temperatureUnit))
                    .font(.planner(13, .semibold))
            }
            .foregroundStyle(Theme.muted)
            .transition(.opacity)
        }
    }

    // MARK: sample-data banner (only while exploring demo data)
    // MARK: reorderable dashboard sections (hold any section → drag to rearrange)
    private static let allSections = ["trial", "hero", "onething", "tally", "mail", "upnext", "snapshot", "focus", "trend", "overview", "weekly", "recap", "goals", "pronote"]
    // "hero" is now the Next card (design 2.1): the next fixed commitment,
    // then the one thing, then the week's edge. No greeting, no ring.
    @State private var layoutEditing = false
    private var sectionOrder: [String] {
        var order = store.ui.dashboardSectionOrder.filter { Self.allSections.contains($0) }
        for s in Self.allSections where !order.contains(s) {
            if s == "trial" { order.insert(s, at: 0); continue }
            if s == "onething" || s == "tally", let h = order.firstIndex(of: "hero") {
                let at = s == "tally" && order.contains("onething") ? order.firstIndex(of: "onething")! + 1 : h + 1
                order.insert(s, at: at)
            } else { order.append(s) }
        }
        return order
    }

    @ViewBuilder private var normalContent: some View {
        if layoutEditing {
            HStack {
                Text("Drag the handles to rearrange").font(.planner(12, .semibold)).foregroundStyle(Theme.muted)
                Spacer()
                PillButton(label: "Done", icon: "check", style: .primary) { withAnimation(Theme.easeOut) { layoutEditing = false } }
            }
        }
        ReorderableSections(ids: sectionOrder, editing: $layoutEditing, onReorder: { newOrder in
            store.ui.dashboardSectionOrder = newOrder
            store.saveUI()
        }) { id in
            dashSection(id)
        }
    }

    @ViewBuilder private func dashSection(_ id: String) -> some View {
        switch id {
        case "mail": if AppStore.emailFeatureOn && (!store.email.connected || store.mailAnyOn) { MailCard(store: store) }
        case "onething": if store.dayWritesAllowed { OneThingCard(store: store) }
        case "tally": if store.dayWritesAllowed { TallyWeekCard(store: store) }
        case "upnext": upNextSection
        case "snapshot": snapshotSection
        case "focus": focusSection
        case "trend": if !store.isLocked(.moneyTrend) { MoneyTrendChart(months: FinanceEngine.moneyTrendMonths(store.data, count: 6, today: today)) }
        case "pronote": if !store.isUnlocked && !store.ui.freeNoteShown { proNote }
        case "trial": if case .trial(let ends) = store.pro.entitlement { TrialCard(store: store, ends: ends) }
        case "overview": overviewBox
        case "weekly": weeklySection
        case "recap": WeeklyRecapCard(store: store)
        case "goals": goalsSection
        default: NextCard(store: store)
        }
    }

    @ViewBuilder private var upNextSection: some View {
        let up = upNextItems
        if !up.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                SecHead("Up Next")
                VStack(spacing: 0) {
                    ForEach(Array(up.enumerated()), id: \.element.id) { idx, it in
                        Button { it.action() } label: {
                            HStack(spacing: 11) {
                                Circle().fill(it.color).frame(width: 7, height: 7)
                                Text(it.title).font(.planner(14.5, .semibold)).foregroundStyle(Theme.text).lineLimit(1)
                                Text(it.sub).font(.planner(11)).foregroundStyle(Theme.subtle)
                                Spacer(minLength: 8)
                                Text(it.when).font(.planner(12, .semibold)).foregroundStyle(Theme.muted).lineLimit(1)
                            }
                            .padding(.vertical, 9)
                            .contentShape(Rectangle())
                        }.buttonStyle(.plain)
                        if idx < up.count - 1 {
                            Divider().overlay(Theme.line).padding(.leading, 18)
                        }
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 4)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            }
        }
    }

    private var snapshotSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SecHead("Snapshot")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                StatTile(label: "Safe to spend", value: Format.compactCurrency(safeFinance.safeToSpend), sub: "Money", icon: "wallet", color: Theme.green)
                StatTile(label: "Open today", value: "\(openToday.count)", sub: "Tasks", icon: "check", color: Theme.purple)
                StatTile(label: "Assignments", value: "\(school.openDue.count)", sub: "\(school.overdue.count) overdue", icon: "book", color: Theme.blue)
                StatTile(label: "Workouts", value: "\(weekGym)", sub: "This week", icon: "heart", color: Theme.pink)
            }
        }
    }

    private var focusSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SecHead("Today's Focus")
            if focusToday.isEmpty {
                EmptyCard(fact: "Nothing due today.", next: "Add a task with Quick add, or pick tomorrow's first thing tonight.")
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(focusToday.enumerated()), id: \.element.id) { idx, t in
                        TaskRowView(store: store, task: t)
                        if idx < focusToday.count - 1 { RowDivider(inset: 44) }
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 4)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            }
        }
    }

    private var weeklySection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SecHead("Weekly progress")
            VStack(spacing: 14) {
                let wr = store.range(span: "week")
                let t = HabitEngine.taskStats(store.data, range: wr)
                let h = HabitEngine.stats(store.data, range: wr, today: today)
                let s = SchoolEngine.stats(store.data, range: wr, today: today)
                ProgressRowView(label: "Tasks", percent: Double(t.percent), detail: "\(t.completed)/\(t.total)", color: Theme.purple)
                ProgressRowView(label: "Habits", percent: Double(h.percent), detail: "\(h.completed)/\(h.total)", color: Theme.green)
                ProgressRowView(label: "School", percent: Double(s.percent), detail: "\(s.completed.count)/\(s.total)", color: Theme.blue)
            }
            .plannerCard()
        }
    }

    @ViewBuilder private var goalsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            SecHead("Goals") {
                PillButton(label: "Add goal", icon: "plus", style: .secondary) { store.presentGoalForm() }
            }
            if store.data.goals.isEmpty {
                EmptyCard(fact: "No goals yet.", next: "Set one to work toward, with a date if it has one.",
                          action: ("Add a goal", { store.presentGoalForm() }))
            } else {
                VStack(spacing: 16) {
                    ForEach(store.data.goals) { g in
                        Button { store.presentGoalForm(g) } label: {
                            ProgressRowView(label: g.title, percent: goalPercent(g),
                                            detail: g.category.isEmpty ? nil : g.category, color: Theme.gold)
                                .contentShape(Rectangle())
                        }.buttonStyle(.plain)
                    }
                }
                .plannerCard()
            }
        }
    }

    private func goalPercent(_ g: Goal) -> Double {
        if !g.linkedSavingsGoalId.isEmpty, let sg = findById(store.data.finance.savingsGoals, g.linkedSavingsGoalId) {
            return Double(FinanceEngine.savingsGoalStats(sg, store.data, today: today).percent)
        }
        return g.completed ? 100 : Calc.clamp(g.progressPercent)
    }

    private struct UpNext: Identifiable { let id = UUID(); let date: String; let title: String; let sub: String; let color: Color; let action: () -> Void
        var when: String { DateLabel.string(date, "EEE, MMM d") } }
    private var upNextItems: [UpNext] {
        var items: [UpNext] = []
        for t in store.data.tasks where !t.completed && !t.dueDate.isEmpty && t.dueDate >= today {
            items.append(UpNext(date: t.dueDate, title: t.title, sub: "Task", color: Theme.purple) {
                store.revealUpNextTask(t) })
        }
        for a in store.data.school.assignments where !SchoolEngine.isComplete(a) && !a.dueDate.isEmpty && a.dueDate >= today {
            // dot + label match the class (its accent color and name)
            let klass = findById(store.data.school.classes, a.classId)
            let hex = SchoolEngine.classColor(klass)
            items.append(UpNext(date: a.dueDate, title: a.title,
                                sub: klass?.name.isEmpty == false ? klass!.name : "Assignment",
                                color: Color(hex: hex)) {
                store.revealUpNextAssignment(a) })
        }
        for r in store.data.reminders where !r.completed && !r.date.isEmpty && r.date >= today {
            items.append(UpNext(date: r.date, title: r.title, sub: "Reminder", color: Theme.cyan) {
                store.revealUpNextReminder(r) })
        }
        return items.sorted { $0.date < $1.date }.prefix(4).map { $0 }
    }

    private struct SearchHit: Identifiable { let id = UUID(); let icon: String; let color: Color; let title: String; let sub: String; let action: () -> Void }

    @ViewBuilder private var searchResults: some View {
        let q = store.ui.dashboardSearch.lowercased()
        let hits = gatherHits(q)
        if hits.isEmpty {
            EmptyCard(fact: "Nothing matches \"\(store.ui.dashboardSearch)\".", next: "Search looks at task titles, notes, class names and bill names. Try another word, or clear the search.")
        } else {
            VStack(spacing: 8) {
                ForEach(hits) { hit in
                    Button { hit.action() } label: {
                        HStack(spacing: 12) {
                            Icon(hit.icon, size: 16).foregroundStyle(hit.color)
                                .frame(width: 32, height: 32).background(hit.color.opacity(0.14), in: RoundedRectangle(cornerRadius: 9, style: .continuous))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(hit.title).font(.planner(15, .semibold)).foregroundStyle(Theme.text).lineLimit(1)
                                Text(hit.sub).font(.planner(12)).foregroundStyle(Theme.subtle).lineLimit(1)
                            }
                            Spacer()
                        }.contentShape(Rectangle()).plannerCard(padding: 12, radius: Theme.radiusMd)
                    }.buttonStyle(.plain)
                }
            }
        }
    }

    private func gatherHits(_ q: String) -> [SearchHit] {
        var hits: [SearchHit] = []
        for t in store.data.tasks where t.title.lowercased().contains(q) {
            hits.append(SearchHit(icon: "check", color: Theme.purple, title: t.title, sub: "Task") {
                store.ui.dashboardSearch = ""; store.revealUpNextTask(t)
            })
        }
        for a in store.data.school.assignments where a.title.lowercased().contains(q) {
            hits.append(SearchHit(icon: "book", color: Theme.blue, title: a.title, sub: "Assignment") {
                store.ui.dashboardSearch = ""; store.revealUpNextAssignment(a)
            })
        }
        for n in store.data.notes.items where "\(n.title) \(n.body)".lowercased().contains(q) {
            hits.append(SearchHit(icon: "note", color: Theme.gold, title: n.title.isEmpty ? "Untitled note" : n.title, sub: "Note") {
                store.ui.dashboardSearch = ""; store.ui.activeTab = "notes"; store.ui.notesEditingId = n.id; store.saveUI()
            })
        }
        for s in store.data.finance.spending where "\(s.category) \(s.note)".lowercased().contains(q) {
            hits.append(SearchHit(icon: "wallet", color: Theme.pink, title: s.category.isEmpty ? "Spending" : s.category, sub: "Spending · \(Format.currency(s.amount))") {
                store.ui.dashboardSearch = ""; store.ui.activeTab = "finance"; store.ui.financeSection = "spending"; store.saveUI(); store.presentSpendingForm(s)
            })
        }
        for i in store.data.finance.income where i.source.lowercased().contains(q) {
            hits.append(SearchHit(icon: "wallet", color: Theme.green, title: i.source.isEmpty ? "Income" : i.source, sub: "Income") {
                store.ui.dashboardSearch = ""; store.ui.activeTab = "finance"; store.ui.financeSection = "income"; store.saveUI(); store.presentIncomeForm(i)
            })
        }
        for b in store.data.finance.bills where b.name.lowercased().contains(q) {
            hits.append(SearchHit(icon: "calendar", color: Theme.orange, title: b.name, sub: "Bill · \(Format.currency(b.amount))") {
                store.ui.dashboardSearch = ""; store.ui.activeTab = "finance"; store.ui.financeSection = "bills"; store.saveUI(); store.presentBillForm(b)
            })
        }
        return hits
    }

    @State private var overviewOpen = false
    private var overviewBox: some View {
        let range = store.range(span: store.ui.dashboardSpan)
        let fin = FinanceEngine.calculate(store.data, range: range, today: today)
        let safeRange = Ranges.safetyForecast(range, today: today)
        let safeFin = FinanceEngine.calculate(store.data, range: safeRange, today: today)
        let t = HabitEngine.taskStats(store.data, range: range)
        let hb = HabitEngine.stats(store.data, range: range, today: today)
        let sc = SchoolEngine.stats(store.data, range: range, today: today)
        let obligations = fin.billsDue + fin.debtPayments
        return VStack(alignment: .leading, spacing: 12) {
            Button { withAnimation(Theme.easeOut) { overviewOpen.toggle() } } label: {
                HStack {
                    Text("Overview & metrics").font(.planner(15, .bold)).foregroundStyle(Theme.text)
                    Spacer()
                    Text(range.label).font(.planner(12)).foregroundStyle(Theme.subtle)
                    Icon("chevron", size: 14).rotationEffect(.degrees(overviewOpen ? 90 : 0)).foregroundStyle(Theme.subtle)
                }.contentShape(Rectangle())
            }.buttonStyle(.plain)
            if overviewOpen {
                VStack(alignment: .leading, spacing: 12) {
                    Segmented(options: [("today", "Today"), ("week", "This week"), ("month", "This month"), ("paycheck", "Paycheck")],
                              selection: Binding(get: { store.ui.dashboardSpan }, set: { store.ui.dashboardSpan = $0; store.saveUI() }))
                    Segmented(options: [("cards", "Squares"), ("rings", "Rings")],
                              selection: Binding(get: { store.ui.dashboardStyle }, set: { store.ui.dashboardStyle = $0; store.saveUI() }))
                    let items: [(String, String, Double, Color)] = [
                        ("Tasks completed", "\(t.completed)/\(t.total)", Double(t.percent), Theme.purple),
                        ("Habits", "\(hb.completed)/\(hb.total)", Double(hb.percent), Theme.green),
                        ("Safe to spend", Format.compactCurrency(safeFin.safeToSpend), safeFin.currentMoney > 0 ? min(100, safeFin.safeToSpend / safeFin.currentMoney * 100) : 0, Theme.cyan),
                        ("Projected", Format.compactCurrency(fin.projectedBalance), fin.currentMoney > 0 ? min(100, fin.projectedBalance / max(fin.currentMoney, 1) * 100) : 0, Theme.green),
                        ("Bills + debt", Format.compactCurrency(obligations), fin.currentMoney > 0 ? min(100, obligations / max(fin.currentMoney, 1) * 100) : 0, Theme.orange),
                        ("Assignments", "\(sc.openDue.count)", sc.total > 0 ? Double(100 - sc.percent) : 0, Theme.blue)
                    ]
                    LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                        ForEach(items, id: \.0) { it in
                            if store.ui.dashboardStyle == "rings" {
                                VStack(spacing: 8) {
                                    RingView(percent: it.2, color: it.3, size: 58, lineWidth: 6, label: "\(Int(it.2))%")
                                    AnimatedNumberText(it.1).font(.planner(15, .heavy)).foregroundStyle(Theme.text)
                                    Text(it.0).font(.planner(11)).foregroundStyle(Theme.muted)
                                }
                                .frame(maxWidth: .infinity).plannerCard(radius: Theme.radiusMd)
                            } else {
                                VStack(alignment: .leading, spacing: 6) {
                                    AnimatedNumberText(it.1).font(.planner(19, .heavy)).foregroundStyle(Theme.text)
                                    Text(it.0).font(.planner(12)).foregroundStyle(Theme.muted)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading).plannerCard(radius: Theme.radiusMd)
                            }
                        }
                    }
                }
                .transition(.opacity)
                .frame(maxWidth: .infinity, alignment: .leading)   // pin width so nothing widens
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .plannerCard()
    }

    private func toggleFocus(_ id: String) {
        guard let i = store.data.tasks.firstIndex(where: { $0.id == id }) else { return }
        withAnimation(Theme.easeOut) {
            if store.data.tasks[i].completed {
                store.uncompleteTask(id)
            } else {
                store.completeTask(id)
            }
        }
    }

    /// A free planner with nothing in it yet: two prompts instead of stats.
    private var planerIsEmpty: Bool {
        !store.isUnlocked && store.data.tasks.isEmpty && store.data.school.classes.isEmpty && store.data.dailyHabits.isEmpty
    }
    @ViewBuilder private var hero: some View {
        if planerIsEmpty { emptyHero } else { heroFull }
    }
    private var emptyHero: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 6) {
                Text(greeting).font(.planner(22, .bold)).foregroundStyle(Theme.text)
                Text("Your planner is empty. Two things get it running.")
                    .font(.planner(13)).foregroundStyle(Theme.muted)
            }
            Button { store.presentClassForm() } label: {
                Text("Add your first class").font(.planner(16, .semibold))
                    .foregroundStyle(Theme.accentContrast(store.accentColor))
                    .frame(maxWidth: .infinity).frame(height: 50)
                    .background(Theme.accent(store.accentColor), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
            Button { store.presentTaskForm() } label: {
                Text("Add a task").font(.planner(16, .semibold)).foregroundStyle(Theme.text)
                    .frame(maxWidth: .infinity).frame(height: 50)
                    .background(Theme.cardSoft, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .buttonStyle(.plain)
        }
        .plannerCard(padding: 18)
    }
    /// One line of small type says where Pro lives, once.
    private var proNote: some View {
        Text("Free plan. Pro is in More whenever it is useful.")
            .font(.planner(12)).foregroundStyle(Theme.subtle)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
            .onDisappear { if !store.ui.freeNoteShown { store.ui.freeNoteShown = true; store.saveUI() } }
    }
    private var heroFull: some View {
        let monthNet = FinanceEngine.calculate(store.data, range: store.range(span: "month"), today: today).netIncome
        return VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(greeting).font(.planner(22, .bold)).foregroundStyle(Theme.text)
                    Text("\(openToday.count) \(openToday.count == 1 ? "thing" : "things") to do today")
                        .font(.planner(13)).foregroundStyle(Theme.muted)
                }
                Spacer(minLength: 8)
                ring(percent: focusToday.isEmpty ? 100 : Double(pctDone))   // top-right corner
            }
            HStack(spacing: 10) {
                heroStat("\(openToday.count)", "Tasks left")
                heroStat(Format.compactCurrency(monthNet), "This month", color: monthNet >= 0 ? Theme.green : Theme.danger)
                heroStat("\(habit.percent)%", "Habits", color: Theme.progressColor(Double(habit.percent)))
            }
        }
        .plannerCard(padding: 18)
    }
    private var pctDone: Int {
        let total = focusToday.count
        guard total > 0 else { return 100 }
        let done = total - openToday.count
        return Int((Double(done) / Double(total) * 100).rounded())
    }
    private func heroStat(_ value: String, _ label: String, color: Color = Theme.text) -> some View {
        VStack(spacing: 3) {
            AnimatedNumberText(value).font(.planner(18, .heavy)).foregroundStyle(color).tracking(-0.3)
            Text(label).font(.planner(10.5, .semibold)).foregroundStyle(Theme.subtle)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(Theme.cardSoft, in: RoundedRectangle(cornerRadius: Theme.radiusMd, style: .continuous))
    }
    private func ring(percent: Double) -> some View {
        let c = Theme.progressColor(percent)
        return ZStack {
            Circle().stroke(Theme.track, lineWidth: 7).frame(width: 60, height: 60)
            Circle().trim(from: 0, to: max(0, min(1, percent / 100)))
                .stroke(c, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                .rotationEffect(.degrees(-90)).frame(width: 60, height: 60)
                .animation(Theme.easeOut, value: percent)
            Text("\(Int(percent))%").font(.planner(13, .heavy)).foregroundStyle(c)
        }
    }

    private var greeting: String {
        let h = Calendar.current.component(.hour, from: Date())
        return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"
    }
    private var longDate: String {
        let f = DateFormatter(); f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }
}
