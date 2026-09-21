import Foundation

// Port of school stats & grades (app.js:7329–7503).

public struct ClassStats: Equatable {
    public var id: String
    public var name: String
    public var color: String
    public var total: Int
    public var completed: Int
    public var percent: Int
    public var pointsGrade: Double?       // nil when no graded points
    public var manualLetter: String
    public var displayLetter: String?
    public var gradeSource: String
}

public struct SchoolStatsResult: Equatable {
    public var openDue: [Assignment]
    public var overdue: [Assignment]
    public var completed: [Assignment]
    public var total: Int
    public var percent: Int
}

public enum SchoolEngine {
    /// Class display color. Completed classes go GRAY — their colors free up
    /// for new classes without confusion; reopening restores the real color.
    public static let completedGray = "#6b7280"
    public static func classColor(_ k: SchoolClass?, fallback: String = "#4f8cff") -> String {
        guard let k else { return fallback }
        return k.completed ? completedGray : Colors.safeHex(k.accentColor, fallback)
    }

    public static func isComplete(_ a: Assignment) -> Bool {
        Normalizers.assignmentStatus(a.status) == "completed"
    }

    public static func sortByDue(_ list: [Assignment]) -> [Assignment] {
        list.sorted { ($0.dueDate.isEmpty ? "9999-12-31" : $0.dueDate) < ($1.dueDate.isEmpty ? "9999-12-31" : $1.dueDate) }
    }

    public static func stats(_ data: AppData, range: DateRange, today: String) -> SchoolStatsResult {
        let assignments = data.school.assignments
        let openDue = sortByDue(assignments.filter { !isComplete($0) && Ranges.inRange($0.dueDate, range) })
        let overdue = sortByDue(assignments.filter { !isComplete($0) && Ranges.isBeforeToday($0.dueDate, today: today) })
        let inRange = assignments.filter { Ranges.inRange($0.dueDate, range) }
        let completed = inRange.filter(isComplete)
        return SchoolStatsResult(openDue: openDue, overdue: overdue, completed: completed,
                                 total: inRange.count, percent: Calc.pct(Double(completed.count), Double(inRange.count)))
    }

    /// Parse meeting-day text into weekday indices (0=Sun…6=Sat).
    /// Accepts "Mon Wed", "Tue/Thu", compact "MWF", "TR" (R = Thursday), etc.
    public static func meetingWeekdays(_ text: String) -> [Int] {
        let lower = text.lowercased()
        var days = Set<Int>()
        let prefixes: [(String, Int)] = [("su", 0), ("mo", 1), ("tu", 2), ("we", 3), ("th", 4), ("fr", 5), ("sa", 6)]
        let tokens = lower.split(whereSeparator: { !$0.isLetter })
        for tok in tokens {
            var matched = false
            if tok.count >= 2 {
                for (p, d) in prefixes where tok.hasPrefix(p) { days.insert(d); matched = true; break }
            }
            if !matched {
                for ch in tok {   // compact notation: M T W R F S U
                    switch ch {
                    case "m": days.insert(1); case "t": days.insert(2); case "w": days.insert(3)
                    case "r": days.insert(4); case "f": days.insert(5); case "s": days.insert(6); case "u": days.insert(0)
                    default: break
                    }
                }
            }
        }
        return days.sorted()
    }

    /// "HH:mm" → minutes since midnight (nil when empty/invalid).
    public static func timeMinutes(_ time: String) -> Int? {
        let parts = time.split(separator: ":")
        guard parts.count >= 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
        return h * 60 + m
    }

    /// `range` scopes the completion counts (total/completed/percent) to a
    /// timeframe — the progress bar then reflects "this week/today/…". The grade
    /// (points → letter) is always all-time; a class grade isn't timeframe-bound.
    public static func classStats(_ classId: String, _ data: AppData, range: DateRange? = nil) -> ClassStats {
        let klass = findById(data.school.classes, classId) ?? SchoolClass()
        let all = data.school.assignments.filter { $0.classId == classId }
        let scoped = range == nil ? all : all.filter { Ranges.inRange($0.dueDate, range!) }
        let completed = scoped.filter(isComplete).count
        // Only graded work counts: completed, or with points actually awarded.
        // A pending assignment with "out of 100" filled in is not a zero.
        let points = all.filter { $0.pointsPossible > 0 && (isComplete($0) || $0.pointsEarned > 0) }
        let earned = Calc.sum(points) { $0.pointsEarned }
        let possible = Calc.sum(points) { $0.pointsPossible }
        let pointsGrade: Double? = possible != 0 ? (earned / possible) * 100 : nil
        let manualLetter = Grades.letters.contains(klass.gradeLetter) ? klass.gradeLetter : ""
        let displayLetter: String? = !manualLetter.isEmpty ? manualLetter : (pointsGrade != nil ? Grades.letter(forPercent: pointsGrade!) : nil)
        let gradeSource = !manualLetter.isEmpty ? "Chosen grade" : (pointsGrade != nil ? "Estimated from points" : "No grade set yet")
        return ClassStats(id: classId, name: klass.name.isEmpty ? "Class" : klass.name,
                          color: SchoolEngine.classColor(klass, fallback: "#7c5cff"),
                          total: scoped.count, completed: completed,
                          percent: Calc.pct(Double(completed), Double(scoped.count)),
                          pointsGrade: pointsGrade, manualLetter: manualLetter,
                          displayLetter: displayLetter, gradeSource: gradeSource)
    }
}
