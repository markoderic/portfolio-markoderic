import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// The design tokens from styles.css `:root` (03-design-system.md), as code.
// Mode-aware: `Theme.mode` flips the whole surface/text ladder between the
// original dark palette and a matching light one (RootView keeps it in sync
// with the user's Light/Dark/Auto setting and rebuilds on change).
public enum ThemeMode { case dark, light }

public enum Theme {
    public static var mode: ThemeMode = .dark
    private static var dark: Bool { mode == .dark }

    // Canvas & surfaces
    public static var bg: Color { dark ? Color(hex: "#0a0c10") : Color(hex: "#eef0f5") }
    public static var surface: Color { dark ? Color(hex: "#0f1218") : Color(hex: "#f8f9fc") }
    public static var surface2: Color { dark ? Color(hex: "#161a23") : Color(hex: "#ffffff") }
    public static var elevated: Color { dark ? Color(hex: "#161a22") : Color(hex: "#ffffff") }
    public static var elevated2: Color { dark ? Color(hex: "#1c212c") : Color(hex: "#e4e7ef") }
    /// Level-1 surface: solid charcoal, borderless — separation comes from
    /// tonal contrast against bg, not strokes (redesign 2026-08-26).
    public static var card: Color { dark ? Color(hex: "#171b22") : Color.white }
    /// Level-2 nested surface: one visible step above card, still charcoal.
    public static var cardSoft: Color { dark ? Color(hex: "#242a34") : Color.black.opacity(0.06) }
    public static var line: Color { dark ? Color.white.opacity(0.08) : Color.black.opacity(0.08) }
    public static var lineStrong: Color { dark ? Color.white.opacity(0.12) : Color.black.opacity(0.15) }
    public static var hairline: Color { dark ? Color.white.opacity(0.07) : Color.black.opacity(0.06) }
    /// Neutral fill for progress tracks / rest dots / empty heat cells.
    public static var track: Color { dark ? Color.white.opacity(0.09) : Color.black.opacity(0.08) }

    // Text
    public static var text: Color { dark ? Color(hex: "#f5f7fa") : Color(hex: "#171a20") }
    public static var muted: Color { text.opacity(dark ? 0.62 : 0.60) }
    public static var subtle: Color { text.opacity(dark ? 0.40 : 0.42) }

    // Section / detail colors
    public static let blue = Color(hex: "#4f8cff")
    public static let cyan = Color(hex: "#36d3ff")
    public static let purple = Color(hex: "#9d6fff")
    public static let green = Color(hex: "#47dc9a")
    public static let orange = Color(hex: "#ffae52")
    public static let pink = Color(hex: "#ff5c8a")
    public static let teal = Color(hex: "#2fd9c0")
    public static let good = Color(hex: "#32d98f")
    public static let gold = Color(hex: "#ffd166")
    public static let danger = Color(hex: "#ff6b8a")

    // Default accent (user-overridable). accentContrast picks legible fg.
    // A near-white accent flips to near-black on the light theme so buttons
    // and highlights stay visible.
    public static var accentDefault: Color { dark ? Color(hex: "#f7f7ff") : Color(hex: "#1c1f26") }
    public static func accent(_ hex: String) -> Color {
        if !dark {
            var s = hex; if s.hasPrefix("#") { s.removeFirst() }
            if s.count == 6, let v = UInt64(s, radix: 16) {
                let r = Double((v >> 16) & 0xFF), g = Double((v >> 8) & 0xFF), b = Double(v & 0xFF)
                if (r * 299 + g * 587 + b * 114) / 1000 > 215 { return accentDefault }
            }
        }
        return Color(hex: hex, fallback: accentDefault)
    }
    /// Red → yellow → green scale by percent (0…100) for "alive" progress cues.
    public static func progressColor(_ percent: Double) -> Color {
        let p = min(1, max(0, percent / 100))
        let red = (1.0, 0.42, 0.54)   // #ff6b8a
        let gold = (1.0, 0.82, 0.40)  // #ffd166
        let green = (0.28, 0.86, 0.60) // #47dc9a
        func lerp(_ a: (Double, Double, Double), _ b: (Double, Double, Double), _ t: Double) -> Color {
            Color(.sRGB, red: a.0 + (b.0 - a.0) * t, green: a.1 + (b.1 - a.1) * t, blue: a.2 + (b.2 - a.2) * t)
        }
        return p < 0.5 ? lerp(red, gold, p / 0.5) : lerp(gold, green, (p - 0.5) / 0.5)
    }

    /// Muscle-map fill by "sets this week, equivalent" (handoff/HEATMAP-PLAN.md
    /// §2): green 0 → gold 7.5 → orange 12.5 → danger 17.5 → purple 22.5,
    /// continuous between the anchors and clamped outside them. The app has
    /// no true red; `danger` is the closest and already means "hot".
    public static let heatAnchors: [Double] = [0, 7.5, 12.5, 17.5, 22.5]
    public static func heat(_ weeklySets: Double) -> Color {
        typealias RGB = (Double, Double, Double)
        func rgb(_ h: UInt32) -> RGB { (Double((h >> 16) & 0xFF) / 255, Double((h >> 8) & 0xFF) / 255, Double(h & 0xFF) / 255) }
        let stops: [RGB] = [rgb(0x47dc9a), rgb(0xffd166), rgb(0xffae52), rgb(0xff6b8a), rgb(0x9d6fff)]   // green gold orange danger purple
        func color(_ c: RGB) -> Color { Color(.sRGB, red: c.0, green: c.1, blue: c.2, opacity: 1) }
        let s = weeklySets.isFinite ? weeklySets : 0
        if s <= heatAnchors[0] { return color(stops[0]) }
        for i in 1..<heatAnchors.count where s <= heatAnchors[i] {
            let t = (s - heatAnchors[i - 1]) / (heatAnchors[i] - heatAnchors[i - 1])
            let a = stops[i - 1], b = stops[i]
            return color((a.0 + (b.0 - a.0) * t, a.1 + (b.1 - a.1) * t, a.2 + (b.2 - a.2) * t))
        }
        return color(stops[stops.count - 1])
    }
    /// The five band colours for the legend, low → peak.
    public static var heatLegend: [Color] { heatAnchors.map(heat) }

    /// Subtle, consistent color per task/bill/spending category.
    public static func categoryColor(_ name: String) -> Color {
        switch name.lowercased() {
        case "school": return blue
        case "money": return green
        case "business": return cyan
        case "gym": return pink
        case "shopping": return gold
        case "errand", "errands": return orange
        case "personal": return purple
        case "food", "groceries": return teal
        default:
            let palette = [blue, green, cyan, pink, gold, orange, purple, teal]
            let h = abs(name.hashValue)
            return name.isEmpty ? muted : palette[h % palette.count]
        }
    }

    public static func accentContrast(_ hex: String) -> Color {
        var s = hex; if s.hasPrefix("#") { s.removeFirst() }
        if s.count == 3 { s = s.map { "\($0)\($0)" }.joined() }
        guard s.count == 6, let v = UInt64(s, radix: 16) else { return dark ? Color(hex: "#07090d") : .white }
        var r = Double((v >> 16) & 0xFF), g = Double((v >> 8) & 0xFF), b = Double(v & 0xFF)
        // Mirror accent(): in light mode a near-white accent is DRAWN as near-black
        // (#1c1f26), so contrast must be judged against the color actually rendered,
        // not the stored hex — otherwise dark text lands on the dark fill.
        if !dark, (r * 299 + g * 587 + b * 114) / 1000 > 215 { (r, g, b) = (0x1c, 0x1f, 0x26) }
        // WCAG relative luminance: pick whichever of white or near-black reads
        // better on this fill. Purple, pink and blue accents fail with white.
        func lin(_ c: Double) -> Double { let s = c / 255; return s <= 0.03928 ? s / 12.92 : pow((s + 0.055) / 1.055, 2.4) }
        let L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
        let onWhite = 1.05 / (L + 0.05), onDark = (L + 0.05) / (0.0289 + 0.05)   // #07090d ≈ 0.0289
        return onDark >= onWhite ? Color(hex: "#07090d") : .white
        let brightness = (r * 299 + g * 587 + b * 114) / 1000
        return brightness > 150 ? Color(hex: "#07090d") : .white
    }

    // Shape / elevation
    // Softer, larger corners to match the web's rounded, liquid feel.
    public static let radius: CGFloat = 26
    public static let radiusLg: CGFloat = 32
    public static let radiusMd: CGFloat = 20
    public static let radiusSm: CGFloat = 13
    public static let navHeight: CGFloat = 56

    public static var shadow: Color { Color.black.opacity(dark ? 0.42 : 0.18) }
    public static var shadowSoft: Color { Color.black.opacity(dark ? 0.30 : 0.10) }

    // Glass material
    public static var glass: Color { dark ? Color.white.opacity(0.06) : Color.black.opacity(0.045) }
    public static var glassStrong: Color { dark ? Color.white.opacity(0.10) : Color.black.opacity(0.08) }
    public static var glassBorder: Color { dark ? Color.white.opacity(0.16) : Color.black.opacity(0.14) }

    // Spacing rhythm (view gap is 18 in the web .view grid)
    public static let viewGap: CGFloat = 18
    public static let cardPad: CGFloat = 16

    // Motion (match the cubic-bezier curves, not SwiftUI's default springs)
    /// The motion sheet's ease-out: cubic-bezier(.2,.8,.2,1). Nothing overshoots.
    public static let easeOut = Animation.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.24)
    /// Short ease-out for fills and selections (150 ms).
    public static let quick = Animation.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.15)
    /// Growth: a notch, a bar (220 ms).
    public static let grow = Animation.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.22)
    public static let easeSpring = Animation.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.30)
    /// Real spring for floating panels/sheets (travel country panel etc.)
    public static let springy = Animation.spring(response: 0.42, dampingFraction: 0.82)
    public static let periodSwap = Animation.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.19)
    /// Full-screen modal zoom (Mail view, detail expands) — same curve as
    /// periodSwap but slow enough to read as motion, not a teleport.
    public static let modalZoom = Animation.timingCurve(0.2, 0.8, 0.2, 1, duration: 0.42)
    public static let durFast = 0.14
    public static let dur = 0.20
    public static let durSlow = 0.28
}

// Typography ladder approximating the rem scale in styles.css (×16px base).
public extension Font {
    /// Every size in the app goes through here, so Dynamic Type applies
    /// everywhere. The factor is clamped: body text grows up to 1.35×,
    /// display sizes (20 pt and up) up to 1.15×, so tiles and cards keep
    /// their shape at the accessibility sizes.
    static func planner(_ size: CGFloat, _ weight: Font.Weight = .regular) -> Font {
        .system(size: Theme.scaled(size), weight: weight, design: .default)
    }
}
public extension Theme {
    static func scaled(_ size: CGFloat) -> CGFloat {
        #if canImport(UIKit)
        let factor = UIFontMetrics(forTextStyle: .body).scaledValue(for: 100) / 100
        let cap: CGFloat = size >= 20 ? 1.15 : 1.35
        return (size * min(max(factor, 0.9), cap)).rounded(.toNearestOrEven)
        #else
        return size
        #endif
    }
}

// Section → accent color mapping used by nav icons / tiles.
public enum Section: String, CaseIterable {
    case dashboard, tasks, reminders, finance, school, calendar, health, meals, notes, travel, more
    public var color: Color {
        switch self {
        case .dashboard: return Theme.text
        case .tasks: return Theme.green
        case .reminders: return Theme.cyan
        case .finance: return Theme.green
        case .school: return Theme.purple
        case .calendar: return Theme.blue
        case .health: return Theme.pink
        case .meals: return Theme.orange
        case .notes: return Theme.gold
        case .travel: return Theme.teal
        case .more: return Theme.text
        }
    }
    public var title: String { rawValue.prefix(1).uppercased() + rawValue.dropFirst() }
    /// For display. `title` is computed from the raw value, so it is a String
    /// and `Text(String)` is verbatim — the tab bar stayed English in every
    /// locale. LocalizedStringKey makes SwiftUI look the name up.
    public var titleKey: LocalizedStringKey { LocalizedStringKey(title) }
    public var icon: String {
        switch self {
        case .dashboard: return "grid"
        case .tasks: return "check"
        case .reminders: return "bell"
        case .finance: return "wallet"
        case .school: return "book"
        case .calendar: return "calendar"
        case .health: return "heart"
        case .meals: return "fork"
        case .notes: return "note"
        case .travel: return "globe"
        case .more: return "more"
        }
    }
}
