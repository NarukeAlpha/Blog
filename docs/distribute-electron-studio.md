# Distributing The Electron Studio

## Current repo status

- The Electron app already has `electron-builder` wired up in `package.json`.
- `npm run package:studio` builds installers into `release/studio/`.
- `npm run package:studio:dir` builds unpacked app folders for inspection.
- The current config uses:
  - macOS target: `dmg`
  - Windows target: `nsis`
  - output directory: `release/studio`
- Previous build artifacts already exist locally under `release/studio/`, which confirms packaging was run before.

## What is still needed

### 1. Decide the release targets

The current local artifacts are `arm64` only.

Follow this rule:

- If this app is only for your own Apple Silicon machine, the current macOS `arm64` output may be enough.
- If you want normal public downloads, build broader targets.

Recommended targets:

- macOS: `universal` if possible, otherwise both `arm64` and `x64`
- Windows: `x64`

### 2. Add real app icons

There are no checked-in Electron app icon assets right now.

Do this:

1. Create a macOS icon file: `.icns`
2. Create a Windows icon file: `.ico`
3. Store them in a stable repo path such as `build/icons/`
4. Point `electron-builder` at those files in `package.json`

Example shape:

```json
{
  "build": {
    "mac": {
      "icon": "build/icons/studio.icns"
    },
    "win": {
      "icon": "build/icons/studio.ico"
    }
  }
}
```

Without this, the packaged app will keep looking like a default Electron app.

### 3. Decide whether this is local-only or public-facing

If the goal is only to make installable files for yourself, you can stop after local packaging and testing.

If the goal is to let other people download it, also do this:

- macOS code signing
- macOS notarization
- Windows code signing

Notes:

- Unsigned macOS apps trigger Gatekeeper warnings.
- Unsigned Windows apps trigger SmartScreen warnings.
- The repo does not currently include signing or notarization setup.

### 4. Confirm the app works without the repo present

The packaged app should be treated like a standalone desktop app.

Check these assumptions on a clean machine:

1. The app launches from the installer output alone.
2. First-run onboarding works.
3. Saving studio settings works.
4. Publishing to the configured Convex environment works.
5. Optional bookmark enrichment failure is understandable if OpenCode is not installed.

Important:

- The production app does not rely on local `.env` files the same way development does.
- Runtime settings are expected to be entered through onboarding/settings and stored in app data.

### 5. Decide how to handle OpenCode

Bookmark enrichment depends on an external OpenCode CLI command.

That means you need to choose one of these approaches:

1. Document that users must install OpenCode themselves.
2. Bundle or install OpenCode separately as part of your distribution flow.
3. Treat bookmark enrichment as optional and make sure the app fails clearly when OpenCode is missing.

Right now the app already treats it as optional, which is reasonable.

### 6. Add a release workflow if you want repeatable builds

The current GitHub workflows only run tests and checks. They do not build desktop release artifacts.

If you want repeatable releases, add CI jobs that:

1. Build the app on macOS for mac artifacts
2. Build the app on Windows for Windows artifacts
3. Upload the generated `.dmg` and `.exe`
4. Optionally attach them to a GitHub release

For real releases, prefer native CI runners per OS instead of depending on one machine to build everything.

## Recommended sequence

Follow this order.

### Step 1. Install dependencies

```bash
npm install
```

### Step 2. Verify the repo is healthy before packaging

```bash
npm test
npm run check
```

Do not skip this. Packaging a broken build just produces a broken installer.

### Step 3. Add icons

Before making a user-facing build:

1. Create `.icns` and `.ico` assets
2. Save them in the repo
3. Update `package.json` to reference them

### Step 4. Update target architectures

Adjust the `build.mac` and `build.win` targets in `package.json` to match your intended audience.

Recommended default:

- macOS: `universal`
- Windows: `x64`

### Step 5. Build local installer artifacts

```bash
npm run package:studio
```

Expected output location:

- `release/studio/`

Use this command for unpacked output only:

```bash
npm run package:studio:dir
```

### Step 6. Test the packaged app on a clean machine

Test on a machine that does not depend on your repo checkout.

Minimum QA checklist:

1. Install the app from the generated artifact
2. Launch the app successfully
3. Complete onboarding
4. Save dev/prod environment settings
5. Publish a test post
6. Save a test bookmark
7. Verify the app handles missing OpenCode cleanly if it is not installed
8. Verify settings persist after restart

### Step 7. Add signing if this will be shared publicly

For macOS:

1. Enroll in Apple Developer
2. Create the required Developer ID certificate(s)
3. Configure `electron-builder` signing/notarization
4. Store secrets safely in CI or the local build environment

For Windows:

1. Obtain a code-signing certificate
2. Configure `electron-builder` to use it
3. Store secrets safely in CI or the local build environment

Only do this once the unsigned builds are already working.

### Step 8. Automate releases

After local packaging and clean-machine QA are stable:

1. Add GitHub Actions jobs for macOS and Windows packaging
2. Upload artifacts from CI
3. Optionally create tagged GitHub releases with attached installers

## Minimal definition of done

Call the distribution effort complete when all of these are true:

- The app has real icons
- The intended architectures are explicit
- `npm test` passes
- `npm run check` passes
- `npm run package:studio` produces the expected installer files
- The installer works on a clean machine
- The app can complete onboarding and publish successfully
- OpenCode behavior is documented or intentionally optional

## Optional polish after that

- Add code signing and notarization
- Add CI release builds
- Add a versioning and release-notes process
- Add auto-update support later if you actually need it

## Short version

If you want the fastest practical path, do this:

1. Add icons
2. Choose final target architectures
3. Run `npm test`
4. Run `npm run check`
5. Run `npm run package:studio`
6. Test the installer on a clean machine
7. Add signing only after the unsigned release works
