# Writerside Studio

This repo turns Writerside into a personal blog and adds an Electron studio built with React, TypeScript, Tailwind, and shadcn-style UI components.

## What it does

- Writes blog posts into `content/posts.json` and generated Writerside topics in `Writerside/topics/posts/`.
- Writes enriched bookmarks into `content/bookmarks.json` and rebuilds `Writerside/topics/bookmarks.md`.
- Runs `git add`, `git commit`, and `git push` from the app so GitHub Actions can rebuild GitHub Pages.
- Starts `opencode serve` automatically when a bookmark needs research and no local server is running.

## Project layout

- `electron/` - Electron main process and preload bridge.
- `src/renderer/` - React renderer, UI components, and styles.
- `lib/` - TypeScript publishing, Writerside generation, git, and OpenCode services.
- `content/` - canonical app data for posts and bookmarks.
- `Writerside/` - static site source built by JetBrains Writerside.
- `.github/workflows/` - GitHub Pages deployment pipeline.

## Local setup

1. Install dependencies with `npm install`.
2. Install the OpenCode CLI and configure a model/provider so bookmark research can run.
3. Initialize the folder as a git repo, add your GitHub remote, and make sure normal `git push` works locally.
4. In the GitHub repository settings, enable GitHub Pages and choose `GitHub Actions` as the source.
5. Launch the studio in dev mode with `npm run dev`, or run the production build locally with `npm start`.

## Helpful scripts

- `npm run sync` regenerates Writerside pages from `content/`.
- `npm run build` creates the Vite renderer bundle and the Electron main/preload bundles in `dist/`.
- `npm run check` type-checks the app, builds it, and verifies generated site files.
- `npm test` runs a small unit test suite for slugs and Writerside page generation.

## Studio layout

- Left rail: dashboard, post, and bookmark navigation.
- Center: embedded `narukealpha.github.io/Blog` view or the active editor.
- Right rail: compact latest-action and activity history.

## Publishing flow

### Posts

Use the desktop studio's post form. When you click publish, the app:

1. saves the post locally,
2. regenerates the Writerside landing pages and TOC,
3. commits only the affected files,
4. pushes the branch to GitHub.

### Bookmarks

Use the bookmark form with a URL. The app:

1. makes sure `opencode serve` is reachable on `127.0.0.1:4096`,
2. asks OpenCode for structured bookmark metadata,
3. updates the reading table,
4. commits and pushes the result.

If git is not ready yet, the content is still saved locally and the app reports the push error instead of discarding your work.
