# Publishing workflow

## Desktop authoring

- Write a post in the Electron studio and the app saves it into `content/posts.json` plus a Writerside topic file.
- Paste a bookmark and the app asks OpenCode for a title, thumbnail, source, and short description.
- Generated landing pages stay in sync through the shared content generator.

## GitHub delivery

- The studio stages the affected files, creates a focused commit, and pushes the branch.
- A GitHub Actions workflow builds the `Writerside/hi` instance and deploys it to GitHub Pages.

## Manual maintenance

- Run `npm run sync` if you edit the JSON content directly and want to regenerate the Writerside pages.
- Run `npm run check` and `npm test` before committing larger structural changes to the studio.
