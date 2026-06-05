// Edit this file to add / change projects. Each project becomes a floating 3D card.
// accent: drives the card's color glow. tags: short chips. links: appear in the detail panel.
export const projects = [
  {
    title: "EBK",
    subtitle: "Elite Ball Knowledge",
    blurb:
      "A multi-game NFL trivia hub built on ~39,000 player-seasons of nflverse data. Includes an endless Higher/Lower streak game plus Stat Line, Career Path, and an Immaculate-Grid clone. Mobile-first with glassmorphism UI and anime.js motion.",
    tags: ["JavaScript", "Firebase", "Python", "Data"],
    accent: "#38bdf8",
    links: [
      { label: "Play live", url: "https://eliteballknowledge.web.app" },
      { label: "GitHub", url: "https://github.com/s3anzi3/ebk" },
    ],
  },
  {
    title: "Outside-the-Box",
    subtitle: "Thinking Certification",
    blurb:
      "A 50-level browser puzzle game where every level is a trap that punishes the conventional answer and rewards lateral thinking — from Stroop tests to a fake system-breach minigame and a name-recall finale that issues a certificate. A finalist in the Stony Brook University Game Programming Competition.",
    tags: ["TypeScript", "Canvas", "Game", "SBU finalist"],
    accent: "#f59e0b",
    links: [
      { label: "Play live", url: "https://outside-the-box-game.web.app" },
      { label: "GitHub", url: "https://github.com/s3anzi3/outside-the-box-game" },
      { label: "Competition", url: "https://www3.cs.stonybrook.edu/~games/" },
    ],
  },
  {
    title: "Edgeable",
    subtitle: "Subscription Tracker",
    blurb:
      "A self-serve portal for my business, Edgeable. Subscribers log in to check their remaining subscription time; admins see every subscriber's status at a glance. Built on Firebase Auth, Firestore, and Hosting.",
    tags: ["Firebase", "Auth", "Firestore"],
    accent: "#a78bfa",
    links: [{ label: "Visit live", url: "https://edgeabled.web.app" }],
  },
  {
    title: "More soon",
    subtitle: "Work in progress",
    blurb:
      "I'm always building. This slot is a placeholder for the next project — check back, or reach out if you want to know what I'm working on right now.",
    tags: ["Coming soon"],
    accent: "#34d399",
    links: [],
    placeholder: true,
  },
];

export const profile = {
  name: "Sean Moore",
  tagline: "Developer & founder of Edgeable",
  about:
    "I'm a small-business owner and self-taught developer. I run Edgeable and build web apps — games, data-driven tools, and Firebase-powered products — usually shipping the whole thing end to end, from data pipeline to deployed site.",
  email: "seanchristmoore@gmail.com",
  links: [
    { label: "GitHub", url: "https://github.com/s3anzi3" },
    { label: "Email", url: "mailto:seanchristmoore@gmail.com" },
  ],
};
