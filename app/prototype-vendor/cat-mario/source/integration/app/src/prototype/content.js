import resumeUrl from "./assets/marko-deric-resume-2026.pdf?url";
export { resumeUrl };
export const projects = [
  {
    id: "animalfeed",
    title: "AnimalFeed",
    app: "YouTube Studio",
    glyph: "▶",
    color: "#bf4a43",
    category: "Short-form video",
    description:
      "A short-form channel for experiments in pacing, entertaining clips and a recognizable identity.",
    detail:
      "A channel built around quick, entertaining clips and lightweight content systems. Studio brings together the exported channel trends and 72 individual video records.",
    evidence:
      "YouTube Studio’s Lifetime export covers December 10, 2025–September 15, 2026: 2,665,906 views and 2,944 net subscribers. Retrieved September 17, 2026; a historical snapshot, not a live connection.",
    next: "Open Studio for dated views, watch time, net subscriber trends and Lifetime video performance.",
    url: "https://www.youtube.com/@animalfeedreal",
    link: "Visit AnimalFeed on YouTube",
  },
  {
    id: "film",
    title: "Personal branding film",
    app: "Premiere",
    glyph: "Pr",
    color: "#7562a8",
    category: "Editing & storytelling",
    description: "A short personal introduction, cut to a rhythm.",
    detail:
      "A short personal introduction focused on editing, pacing and storytelling. Explore the finished film in a Premiere-inspired review workspace.",
    evidence:
      "The workspace uses the finished MP4. Its review timeline represents that export, not the original editing project's cuts, tracks or effects.",
    next: "Open Premiere to play the film, step through frames and explore its review timeline.",
  },
  {
    id: "notch",
    title: "Notch",
    app: "Xcode",
    glyph: "N",
    color: "#4b7361",
    category: "Native iPhone app",
    description: "A planner for the things that make up a day.",
    detail:
      "I designed, built and published Notch, a native SwiftUI planner for iPhone. It brings tasks, school, calendar, notes and other parts of daily planning together.",
    evidence:
      "The phone runs a browser sample with fictional data. It does not connect native services or accounts, make purchases or run AI. The curated source excerpts are not verified against the current App Store release.",
    next: "Open Xcode for the product overview and source excerpts, or pick up the phone to try the interactive browser sample.",
    url: "https://apps.apple.com/us/app/notch-student-school-planner/id6791906668",
    link: "View Notch on the App Store",
  },
  {
    id: "portfolio",
    title: "This portfolio",
    app: "VS Code",
    glyph: "</>",
    color: "#477ea2",
    category: "Design & development",
    description: "An interactive workspace for exploring the work.",
    detail:
      "I built this portfolio around an interactive desk, using React and React Three Fiber. The desktop brings my projects into familiar software-inspired workspaces, with a phone sample and a printed resume alongside it.",
    evidence:
      "The desktop uses explicit window and menu state. Device motion approaches the current target every frame, so selecting another destination can interrupt a move. Reading surfaces stay still.",
    next: "Open VS Code to read the design notes, browse implementation files and edit a temporary scratch copy. Scratch edits stay in the browser session and do not execute.",
  },
];
export const documents = {
  projects: "Projects",
  about: "About Marko",
  resume: "Resume",
  contact: "Contact",
  controls: "Controls & credits",
  ...Object.fromEntries(projects.map((p) => [p.id, p.title])),
};
