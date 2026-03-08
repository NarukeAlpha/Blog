# Writerside Blog Studio

This repo turns Writerside into a personal blog and adds a small Electron studio for one-click publishing.

## What it does

- Writes blog posts into `content/posts.json` and generated Writerside topics in `Writerside/topics/posts/`.
- Writes enriched bookmarks into `content/bookmarks.json` and rebuilds `Writerside/topics/bookmarks.md`.
- Runs `git add`, `git commit`, and `git push` from the app so GitHub Actions can rebuild GitHub Pages.
- Starts `opencode serve` automatically when a bookmark needs research and no local server is running.

## Project layout

- `electron/` - desktop studio UI and IPC bridge.
- `lib/` - publishing, Writerside generation, git, and OpenCode services.
- `content/` - canonical app data for posts and bookmarks.
- `Writerside/` - static site source built by JetBrains Writerside.
- `.github/workflows/` - GitHub Pages deployment pipeline.

## Local setup

1. Install dependencies with `npm install`.
2. Install the OpenCode CLI and configure a model/provider so bookmark research can run.
3. Initialize the folder as a git repo, add your GitHub remote, and make sure normal `git push` works locally.
4. In the GitHub repository settings, enable GitHub Pages and choose `GitHub Actions` as the source.
5. Launch the studio with `npm start`.

## Helpful scripts

- `npm run sync` regenerates Writerside pages from `content/`.
- `npm run check` syntax-checks the Electron and library code, then verifies generated site files.
- `npm test` runs a small unit test suite for slugs and Writerside page generation.

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
