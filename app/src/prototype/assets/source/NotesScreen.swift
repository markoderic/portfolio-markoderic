import SwiftUI
import PlannerCore
import PhotosUI
#if canImport(UIKit)
import UIKit
#endif

// Notes tab (04-features-by-section.md §Notes), Apple Notes philosophy:
// the home screen manages (search, filters, per-note ⋯ menu), the editor
// only writes (borderless title + body). Editor is layered in RootView so
// open/back get the native slide navigation like School's class detail.

// MARK: - Notes home

struct NotesListContent: View {
    @Bindable var store: AppStore
    @State private var capture = ""
    @State private var searching = false
    @FocusState private var searchFocus: Bool
    private var today: String { store.todayString }

    private var effectiveFilter: String {
        let f = store.ui.notesFolderId
        if f == "all" || f == "pinned" { return f }
        return store.data.notes.folders.contains { $0.id == f } ? f : "all"
    }

    private var filteredNotes: [Note] {
        var notes = store.data.notes.items
        switch effectiveFilter {
        case "pinned": notes = notes.filter { $0.pinned }
        case "all": break
        default: notes = notes.filter { $0.folderId == effectiveFilter }
        }
        let q = store.ui.notesSearch.lowercased()
        if !q.isEmpty { notes = notes.filter { "\($0.title) \($0.body)".lowercased().contains(q) } }
        return notes.sorted { $0.updatedAt > $1.updatedAt }
    }

    var body: some View {
        let notes = filteredNotes
        TopBar(title: "Notes", eyebrow: store.data.notes.items.isEmpty ? "Written here, kept here" : "\(store.data.notes.items.count) note\(store.data.notes.items.count == 1 ? "" : "s")") {
            HStack(spacing: 8) {
                Button {
                    withAnimation(Theme.easeOut) { searching.toggle(); if !searching { store.ui.notesSearch = "" } }
                    searchFocus = searching
                } label: {
                    Icon("search", size: 16, label: "Search notes")
                        .foregroundStyle(searching ? Theme.accentContrast(store.accentColor) : Theme.muted)
                        .frame(width: 38, height: 38)
                        .background(searching ? Theme.accent(store.accentColor) : Theme.cardSoft, in: Circle())
                }.buttonStyle(.plain)
                Button { store.presentFolderForm() } label: {
                    Icon("folder", size: 16, label: "New folder").foregroundStyle(Theme.muted)
                        .frame(width: 38, height: 38).background(Theme.cardSoft, in: Circle())
                }.buttonStyle(.plain)
                PillButton(label: "New", icon: "plus", style: .primary) { newNote() }
            }
        }

        if searching {
            HStack(spacing: 8) {
                Icon("search", size: 15).foregroundStyle(Theme.subtle)
                TextField("Search notes", text: Binding(get: { store.ui.notesSearch }, set: { store.ui.notesSearch = $0 }))
                    .font(.planner(15)).foregroundStyle(Theme.text).focused($searchFocus)
                if !store.ui.notesSearch.isEmpty { Button { store.ui.notesSearch = "" } label: { Icon("x", size: 12, label: "Clear").foregroundStyle(Theme.subtle) }.buttonStyle(.plain) }
            }
            .padding(.horizontal, 16).frame(height: 48)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .transition(.opacity)
        } else {
            // capture: a line becomes a note at the top of Today
            HStack(spacing: 10) {
                Icon("note", size: 15).foregroundStyle(Theme.subtle)
                TextField("Write a note", text: $capture)
                    .font(.planner(16)).foregroundStyle(Theme.text)
                    .submitLabel(.done)
                    .onSubmit(commitCapture)
                if !capture.isEmpty {
                    Button(action: commitCapture) {
                        Text("Save").font(.planner(13.5, .semibold)).foregroundStyle(Theme.accentContrast(store.accentColor))
                            .padding(.horizontal, 12).frame(height: 34).background(Theme.accent(store.accentColor), in: Capsule())
                    }.buttonStyle(PressScale())
                }
            }
            .padding(.leading, 16).padding(.trailing, 8).frame(height: 56)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }

        if !store.data.notes.folders.isEmpty || store.data.notes.items.contains(where: \.pinned) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    chip("all", "All notes")
                    if store.data.notes.items.contains(where: \.pinned) { chip("pinned", "Pinned") }
                    ForEach(store.data.notes.folders) { f in folderChip(f) }
                }
            }
        }

        if notes.isEmpty {
            if !store.ui.notesSearch.isEmpty {
                EmptyCard(fact: "Nothing matches \"\(store.ui.notesSearch)\".", next: "Search looks at note titles and text. Try another word, or clear the search.")
            } else {
                EmptyCard(fact: "No notes yet.", next: "Write one above, then tap Save.")
            }
        } else {
            let pinned = notes.filter(\.pinned)
            let rest = notes.filter { !$0.pinned }
            let weekStart = DateUtils.string(DateUtils.startOfWeek(DateUtils.parse(today) ?? Date()))
            let todays = rest.filter { Copy.localDay($0.updatedAt) == today }
            let week = rest.filter { let d = Copy.localDay($0.updatedAt) ?? ""; return d != today && d >= weekStart }
            let earlier = rest.filter { (Copy.localDay($0.updatedAt) ?? "") < weekStart }
            group("Pinned", pinned)
            group("Today", todays)
            group("This week", week)
            group("Earlier", earlier)
        }
    }

    @ViewBuilder private func group(_ title: String, _ list: [Note]) -> some View {
        if !list.isEmpty {
            ListCard {
                CardHead(title, fact: "\(list.count)").padding(.top, 8).padding(.bottom, 2)
                ForEach(Array(list.enumerated()), id: \.element.id) { idx, note in
                    noteRow(note)
                    if idx < list.count - 1 { RowDivider() }
                }
            }
        }
    }

    private func chip(_ id: String, _ label: String) -> some View {
        Chip(label: label, active: effectiveFilter == id) {
            store.ui.notesFolderId = id; store.saveUI()
        }
    }

    private func folderChip(_ f: Folder) -> some View {
        let active = effectiveFilter == f.id
        return HStack(spacing: 6) {
            if !f.color.isEmpty { Circle().fill(Color(hex: f.color)).frame(width: 7, height: 7) }
            Text(f.name).font(.planner(13, .semibold))
        }
        .padding(.horizontal, 13).padding(.vertical, 7)
        .foregroundStyle(active ? Theme.accentContrast(store.accentColor) : Theme.muted)
        .background(active ? Theme.accent(store.accentColor) : Theme.cardSoft, in: Capsule())
        .contentShape(Capsule())
        .onTapGesture { store.ui.notesFolderId = f.id; store.saveUI() }
        .onLongPressGesture(minimumDuration: 0.4) {
            Haptics.tap()
            store.presentFolderForm(f)
        }
    }

    private func noteRow(_ note: Note) -> some View {
        Button { openNote(note.id) } label: {
            HStack(spacing: 12) {
                if !note.color.isEmpty { Circle().fill(Color(hex: note.color)).frame(width: 8, height: 8) }
                VStack(alignment: .leading, spacing: 3) {
                    Text(note.title.isEmpty ? "Untitled note" : note.title).font(.planner(15, .semibold)).foregroundStyle(Theme.text).lineLimit(1)
                    Text(snippet(note)).font(.planner(13)).foregroundStyle(Theme.muted).lineLimit(1)
                    Text(metaLine(note)).font(.planner(12)).foregroundStyle(Theme.subtle).lineLimit(1)
                }
                Spacer(minLength: 6)
                noteMenu(note)
            }
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }.buttonStyle(.plain)
        .swipeActions([SwipeAction(label: note.pinned ? "Unpin" : "Pin") { togglePin(note.id) }, .delete { deleteNote(note.id) }])
    }
    private func metaLine(_ n: Note) -> String {
        let d = Copy.localDay(n.updatedAt) ?? ""
        var bits: [String] = []
        if d == today, let dt = Copy.parseIso(n.updatedAt) {
            let f = DateFormatter(); f.locale = .current; f.dateFormat = Format.use24Hour ? "HH:mm" : "h:mm a"
            bits.append(f.string(from: dt))
        } else if !d.isEmpty { bits.append(DateLabel.string(d, "EEE, MMM d")) }
        if let folder = store.data.notes.folders.first(where: { $0.id == n.folderId }) { bits.append(folder.name) }
        if n.pinned { bits.append("Pinned") }
        return bits.joined(separator: " · ")
    }
    private func isoFallback(_ s: String) -> Date? {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: s)
    }

    private func noteMenu(_ note: Note) -> some View {
        Menu {
            Button { togglePin(note.id) } label: { Label(note.pinned ? "Unpin" : "Pin", systemImage: "pin") }
            Menu {
                ForEach(NoteColors.all, id: \.hex) { c in
                    Button { setColor(note.id, c.hex) } label: {
                        if note.color == c.hex { Label(c.name, systemImage: "checkmark") } else { Text(c.name) }
                    }
                }
            } label: { Label("Change color", systemImage: "paintpalette") }
            if !store.data.notes.folders.isEmpty {
                Menu {
                    Button { setFolder(note.id, "") } label: {
                        if note.folderId.isEmpty { Label("No folder", systemImage: "checkmark") } else { Text("No folder") }
                    }
                    ForEach(store.data.notes.folders) { f in
                        Button { setFolder(note.id, f.id) } label: {
                            if note.folderId == f.id { Label(f.name, systemImage: "checkmark") } else { Text(f.name) }
                        }
                    }
                } label: { Label("Move to folder", systemImage: "folder") }
            }
            Divider()
            Button(role: .destructive) { deleteNote(note.id) } label: { Label("Delete", systemImage: "trash") }
        } label: {
            Icon("more", size: 16, label: "Note options").foregroundStyle(Theme.subtle)
                .frame(width: 34, height: 34)
                .contentShape(Circle())
        }
        .buttonStyle(.plain)
    }

    private func snippet(_ n: Note) -> String {
        let body = n.body.trimmingCharacters(in: .whitespacesAndNewlines)
        return body.isEmpty ? "No text yet" : body.replacingOccurrences(of: "\n", with: " ")
    }

    // MARK: mutations
    private func commitCapture() {
        let text = capture.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        var n = Note(); n.updatedAt = Identity.nowIso()
        let first = text.split(separator: "\n").first.map(String.init) ?? text
        n.title = String(first.prefix(60)); n.body = text
        if effectiveFilter != "all" && effectiveFilter != "pinned" { n.folderId = effectiveFilter }
        store.data.notes.items.insert(n, at: 0); store.save()
        Haptics.tap()
        capture = ""
        let id = n.id
        store.showNotice("Added to Notes.") { [weak store] in store?.data.notes.items.removeAll { $0.id == id }; store?.save() }
    }
    private func openNote(_ id: String) {
        withAnimation(Theme.easeOut) { store.ui.notesEditingId = id }
        store.saveUI()
    }
    private func newNote() {
        var n = Note(); n.updatedAt = Identity.nowIso()
        if effectiveFilter != "all" && effectiveFilter != "pinned" { n.folderId = effectiveFilter }
        store.data.notes.items.insert(n, at: 0)
        withAnimation(Theme.easeOut) { store.ui.notesEditingId = n.id }
        store.save(); store.saveUI()
    }
    private func togglePin(_ id: String) {
        guard let idx = store.data.notes.items.firstIndex(where: { $0.id == id }) else { return }
        store.data.notes.items[idx].pinned.toggle(); touch(idx)
    }
    private func setColor(_ id: String, _ hex: String) {
        guard let idx = store.data.notes.items.firstIndex(where: { $0.id == id }) else { return }
        store.data.notes.items[idx].color = hex; touch(idx)
    }
    private func setFolder(_ id: String, _ folderId: String) {
        guard let idx = store.data.notes.items.firstIndex(where: { $0.id == id }) else { return }
        store.data.notes.items[idx].folderId = folderId; touch(idx)
    }
    private func touch(_ idx: Int) { store.data.notes.items[idx].updatedAt = Identity.nowIso(); store.save() }

    private func deleteNote(_ id: String) {
        guard let idx = store.data.notes.items.firstIndex(where: { $0.id == id }) else { return }
        let item = store.data.notes.items[idx]
        store.deleteWithUndo("Note deleted", remove: { store.data.notes.items.remove(at: idx) },
                             restore: { store.data.notes.items.insert(item, at: min(idx, store.data.notes.items.count)) })
    }
}

// MARK: - Note editor (write-only, Apple Notes style)

struct NoteEditorContent: View {
    @Bindable var store: AppStore
    let noteId: String

    #if canImport(UIKit)
    @StateObject private var rich = RichTextController()
    @StateObject private var accessoryBox = AccessoryBox()
    #endif
    @State private var photoItems: [PhotosPickerItem] = []

    private var idx: Int? { store.data.notes.items.firstIndex(where: { $0.id == noteId }) }

    var body: some View {
        if let idx {
            HStack {
                Button { goBack() } label: {
                    HStack(spacing: 4) { Icon("chevron", size: 16).rotationEffect(.degrees(180)); Text("Notes").font(.planner(15, .semibold)) }
                        .foregroundStyle(Theme.muted).frame(height: 44).contentShape(Rectangle())
                }.buttonStyle(.plain)
                Spacer()
                PhotosPicker(selection: $photoItems, maxSelectionCount: 6, matching: .images) {
                    Icon("camera", size: 16, label: "Add photo").foregroundStyle(Theme.muted)
                        .frame(width: 38, height: 38).background(Theme.cardSoft, in: Circle())
                }
                Button { goBack() } label: {
                    Text("Done").font(.planner(14, .semibold)).foregroundStyle(Theme.accentContrast(store.accentColor))
                        .padding(.horizontal, 14).frame(height: 38).background(Theme.accent(store.accentColor), in: Capsule())
                }.buttonStyle(PressScale())
            }
            .onChange(of: photoItems) { _, items in importPhotos(items) }
            TextField("Title", text: Binding(
                get: { store.data.notes.items[idx].title },
                set: { store.data.notes.items[idx].title = $0; touch(idx) }))
                .font(.planner(24, .bold)).foregroundStyle(Theme.text)
            Text(editedLine(store.data.notes.items[idx])).font(.planner(12)).foregroundStyle(Theme.subtle)
                .padding(.top, -10)

            #if canImport(UIKit)
            // Formatting lives on the keyboard's accessory bar (rides above the
            // keys, like Apple Notes) instead of a fixed toolbar in the page.
            RichTextView(controller: rich,
                         initialRTF: store.data.notes.items[idx].richBody,
                         initialPlain: store.data.notes.items[idx].body,
                         isDark: Theme.mode == .dark,
                         accessory: accessoryBox.view(for: AnyView(keyboardFormatBar)))
                .frame(minHeight: 200)
                .onAppear {
                    rich.onChange = { plain, rtf in
                        guard let i = self.idx else { return }
                        store.data.notes.items[i].body = plain
                        store.data.notes.items[i].richBody = rtf
                        touch(i)
                    }
                }
            #endif

            imagesRow(idx)
            checklistSection(idx)
        }
    }

    private func editedLine(_ n: Note) -> String {
        var bits: [String] = []
        let d = Copy.localDay(n.updatedAt) ?? ""
        if !d.isEmpty { bits.append("Edited " + (d == store.todayString ? "today" : DateLabel.string(d, "EEE, MMM d"))) }
        if let folder = store.data.notes.folders.first(where: { $0.id == n.folderId }) { bits.append(folder.name) }
        return bits.joined(separator: " · ")
    }

    // MARK: keyboard format bar (inputAccessoryView content)
    #if canImport(UIKit)
    private var keyboardFormatBar: some View {
        HStack(spacing: 6) {
            fmtButton { Text("B").font(.planner(15, .heavy)) } action: { rich.toggleBold() }
            fmtButton { Text("U").font(.planner(15, .semibold)).underline() } action: { rich.toggleUnderline() }
            fmtButton { Text("Title").font(.planner(13, .bold)) } action: { rich.applyTitle() }
            fmtButton { Text("Body").font(.planner(13, .semibold)) } action: { rich.applyBody() }
            fmtButton { Text("•").font(.planner(17, .bold)) } action: { rich.bullet() }
            fmtButton { Icon("check", size: 15) } action: { addChecklistItem() }
            Spacer()
            fmtButton { Icon("chevron", size: 14).rotationEffect(.degrees(90)) } action: { dismissKeyboard() }
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .frame(maxWidth: .infinity)
        .background(Theme.elevated)
        .overlay(Rectangle().fill(Theme.line).frame(height: 0.5), alignment: .top)
    }
    #endif

    private func importPhotos(_ items: [PhotosPickerItem]) {
        #if canImport(UIKit)
        guard !items.isEmpty, idx != nil else { return }
        Task {
            for item in items {
                if let data = try? await item.loadTransferable(type: Data.self),
                   let ui = UIImage(data: data), let id = ImageStore.save(ui) {
                    await MainActor.run {
                        if let i = self.idx { store.data.notes.items[i].imageIds.append(id); touch(i) }
                    }
                }
            }
            await MainActor.run { photoItems = [] }
        }
        #endif
    }
    private func fmtButton<L: View>(@ViewBuilder _ label: () -> L, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            label().foregroundStyle(Theme.text)
                .frame(width: 40, height: 34)
                .background(Theme.cardSoft, in: RoundedRectangle(cornerRadius: 9, style: .continuous))
        }.buttonStyle(.plain)
    }

    // MARK: images
    @ViewBuilder private func imagesRow(_ idx: Int) -> some View {
        let ids = store.data.notes.items[idx].imageIds
        if !ids.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ids, id: \.self) { id in
                        #if canImport(UIKit)
                        StoredPhoto(id: id, size: 96) { ui in
                            Image(uiImage: ui).resizable().scaledToFill()
                                .frame(width: 96, height: 96).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                                .overlay(alignment: .topTrailing) {
                                    Button { removeImage(idx, id) } label: {
                                        Icon("x", size: 10, label: "Remove photo").foregroundStyle(.white)
                                            .frame(width: 22, height: 22).background(.black.opacity(0.55), in: Circle())
                                    }.buttonStyle(.plain).padding(4)
                                }
                        }
                        #endif
                    }
                }
            }
        }
    }

    // MARK: checklist
    @ViewBuilder private func checklistSection(_ idx: Int) -> some View {
        let items = store.data.notes.items[idx].checklist
        if !items.isEmpty {
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { i, item in
                    HStack(spacing: 10) {
                        Button { toggleCheck(idx, item.id) } label: {
                            ZStack {
                                Circle().strokeBorder(item.done ? Theme.green : Theme.line, lineWidth: 1.6)
                                    .background(Circle().fill(item.done ? Theme.green : .clear)).frame(width: 22, height: 22)
                                if item.done { Icon("check", size: 12).foregroundStyle(.white) }
                            }
                        }.buttonStyle(.plain)
                        TextField("Item", text: Binding(
                            get: { checkText(idx, item.id) },
                            set: { setCheckText(idx, item.id, $0) }))
                            .font(.planner(15)).foregroundStyle(item.done ? Theme.muted : Theme.text)
                            .strikethrough(item.done, color: Theme.subtle)
                        Button { deleteCheck(idx, item.id) } label: { Icon("x", size: 13, label: "Delete item").foregroundStyle(Theme.subtle) }.buttonStyle(.plain)
                    }
                    .padding(.vertical, 7)
                    if i < items.count - 1 { Divider().overlay(Theme.line).padding(.leading, 32) }
                }
            }.plannerCard(padding: 12)
        }
    }

    // MARK: mutations
    private func goBack() {
        withAnimation(Theme.easeOut) { store.ui.notesEditingId = "" }
        store.saveUI()
    }
    private func touch(_ idx: Int) { store.data.notes.items[idx].updatedAt = Identity.nowIso(); store.save() }

    private func addChecklistItem() {
        guard let idx else { return }
        store.data.notes.items[idx].checklist.append(ChecklistItem()); touch(idx)
    }
    private func toggleCheck(_ idx: Int, _ id: String) {
        guard let i = store.data.notes.items[idx].checklist.firstIndex(where: { $0.id == id }) else { return }
        withAnimation(Theme.easeOut) { store.data.notes.items[idx].checklist[i].done.toggle() }; touch(idx)
    }
    private func checkText(_ idx: Int, _ id: String) -> String {
        store.data.notes.items[idx].checklist.first(where: { $0.id == id })?.text ?? ""
    }
    private func setCheckText(_ idx: Int, _ id: String, _ t: String) {
        guard let i = store.data.notes.items[idx].checklist.firstIndex(where: { $0.id == id }) else { return }
        store.data.notes.items[idx].checklist[i].text = t; touch(idx)
    }
    private func deleteCheck(_ idx: Int, _ id: String) {
        withAnimation(Theme.easeOut) { store.data.notes.items[idx].checklist.removeAll { $0.id == id } }; touch(idx)
    }
    private func removeImage(_ idx: Int, _ id: String) {
        withAnimation(Theme.easeOut) { store.data.notes.items[idx].imageIds.removeAll { $0 == id } }
        ImageStore.delete(id); touch(idx)
    }
}

// Shared color menu entries (note ⋯ menu).
enum NoteColors {
    static let all: [(name: String, hex: String)] = [
        ("Default", ""), ("Cyan", "#25d8ff"), ("Purple", "#7c5cff"), ("Green", "#32d98f"),
        ("Yellow", "#ffd166"), ("Pink", "#ff6b8a"), ("Orange", "#ff9f43")
    ]
}

extension AppStore {
    /// Abandoned-note cleanup: a brand-new note left completely empty is
    /// silently removed when the editor closes (no toast, nothing to undo).
    public func removeNoteIfEmpty(_ id: String) {
        guard let idx = data.notes.items.firstIndex(where: { $0.id == id }) else { return }
        let n = data.notes.items[idx]
        let empty = n.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && n.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && n.checklist.allSatisfy { $0.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
            && n.imageIds.isEmpty
        if empty {
            ImageStore.deleteAll(n.imageIds)
            data.notes.items.remove(at: idx); save()
        }
    }
}
