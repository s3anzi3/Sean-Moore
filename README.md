# Sean Moore — 3D Portfolio

A single-page portfolio built with **Three.js + Vite**. Projects float as interactive 3D
cards over a parallax starfield — drag to orbit, click a card to open its details.

## Run it

```bash
npm install      # first time only
npm run dev      # open the printed localhost URL
```

## Build for production

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build locally
```

## Editing content

Everything you'd normally change lives in **`src/projects.js`**:

- `projects[]` — each entry becomes a floating card. Fields: `title`, `subtitle`, `blurb`,
  `tags`, `accent` (glow color), `links` (buttons in the detail panel), `placeholder` (bool).
- `profile` — your name, the About text, email, and the contact links.

Add a project by appending another object to the `projects` array — the 3D layout, glow,
and detail panel all adapt automatically.

## Deploy to Firebase Hosting

1. Put your Firebase project ID in `.firebaserc` (the `"default"` value).
2. Make sure you're logged in: `firebase login` (use `seanchristmoore@gmail.com`).
3. Deploy:

```bash
npm run deploy   # runs vite build, then firebase deploy --only hosting
```

`firebase.json` already points Hosting at the `dist/` folder.
```
