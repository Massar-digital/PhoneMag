# Release Process

## Prerequisites

- All changes merged to `main`
- Working tree clean (`git status`)
- CI passes on `main`

## Steps

### 1. Bump version and push tag

```bash
cd frontend-vite

# Pick one:
npm version patch   # 2.0.1 → 2.0.2 (bugfix)
npm version minor   # 2.0.1 → 2.1.0 (feature)
npm version major   # 2.0.1 → 3.0.0 (breaking)

# Push commit + tag
git push --follow-tags
```

This updates `package.json` version, creates a `git tag v2.0.2`, and pushes everything.

### 2. CI builds and publishes automatically

Pushing a `v*` tag triggers `.github/workflows/release.yml` which:

1. Validates tag matches `package.json` version
2. Builds the Django backend with PyInstaller
3. Builds the Electron app with `electron-builder`
4. Publishes to GitHub Releases (`.exe` + `latest.yml`)

Monitor progress at: **https://github.com/Massar-digital/PhoneMag/actions**

### 3. Clients receive the update

Every running client automatically:

1. **Checks for updates** 5 seconds after launch (`autoUpdater.checkForUpdatesAndNotify()`)
2. **Detects new version** from `latest.yml` on GitHub Releases
3. **Downloads** the update in background (progress shown in UI)
4. **Prompts the user**: "Installer et Redémarrer" button appears
5. **Installs and restarts** on click (or on app quit via `autoInstallOnAppQuit`)

### 4. Verify

- Check the [Releases page](https://github.com/Massar-digital/PhoneMag/releases) for the new release
- Open an already-installed app — it should show the update notification within seconds

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| No update notification | Client checks only in production (`!isDev`). Run `npm run electron:build` locally and install the built app. |
| "Update not available" | The running version matches the latest release. Bump the version. |
| CI fails on PyInstaller | Check `backend/build_exe.py` — dependencies may need updating. |
| Release not published | Verify `GITHUB_TOKEN` has write access and `releaseType` in `package.json` is set to `"release"` (not `"draft"`). |
