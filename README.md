# BetterMyCourses

A privacy-friendly browser extension for [Aalto MyCourses](https://mycourses.aalto.fi/). It adds a true-black theme, locally bundled Lexend text and Rubik digits, configurable link colors, and editable Home/Dashboard banners. Individual course pages retain their native structure, navigation and original icons. Home has a responsive news layout.

Independent project; not an official Aalto University product.

## Install in Brave, Chrome or Edge

1. Download **better-mycourses-1.8.0-chrome.zip** from the [latest release](https://github.com/Tessiaah/BetterMyCourses/releases/latest).
2. Extract the ZIP into a permanent folder. Find the folder containing `manifest.json`.
3. Open `brave://extensions`, `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select that folder.
5. Refresh existing MyCourses tabs and optionally pin BetterMyCourses.

For a source build, load `.output/chrome-mv3` after running `npm run build`.

To update an existing installation, replace its extracted files, click the extension's **Reload** button, confirm **version 1.8.0**, then refresh MyCourses. Refreshing only the website does not reload an updated extension. Keep the installation folder in place.

The popup's **Dark theme** switch updates open MyCourses tabs immediately. Turning it off restores the native site. There is no browser-store listing yet.

## Features

- Black page, subtle ink panels, off-white text and readable metadata.
- Champagne, Ivory, Sage or a custom link color. Dark choices are brightened enough for readable links.
- Shared sitewide link click/focus styling, visible chosen-color keyboard focus, and restrained button/hover motion with reduced-motion support.
- Original course layout, imagery and icon artwork; Files/Quiz/Progress glyphs follow the selected color.
- Refined calendar toolbar, timeline spacing and course overflow-menu placement.
- Dark assignment and Moodle/STACK quiz surfaces, styled Finish review controls, and padded light backgrounds sized to each quiz diagram. Inline equations, icons and interactive drag/drop assets are excluded.
- More space between activity titles, separators and introduction boxes.
- Aligned Clear my choice/Check actions with larger gaps, clearer answer fields, and green/yellow/red feedback driven by native site grading.
- Pure-black course-title panels; Home retains its translucent photo overlay.
- Responsive Home banner and news panels, selected-color details and a translucent black title backing.
- Separate Home/Dashboard banner settings: Original image, My image or Plain black.
- Local banner editor with Fill/Fit/Stretch, drag framing, zoom, keyboard sliders, save/discard/reset and independent page drafts.
- Hidden scrollbar tracks with wheel, touch and keyboard scrolling retained.

Banner uploads accept PNG, JPEG or WebP up to 10 MB. Images are decoded and re-encoded locally, capped at 1920px on the longest side and saved on the device. Fill crops proportionally; Fit shows the whole image with letterboxing; Stretch fills the space with changed proportions. Original images remain the default. Course banners and thumbnails are preserved.

## Privacy and permissions

The production Manifest V3 extension requests only:

| Permission                     | Purpose                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `storage`                      | Theme/color preferences in `storage.sync`; selected banner images and framing in `storage.local`. |
| `https://mycourses.aalto.fi/*` | Apply bundled styles and the content script on MyCourses only.                                    |

No background worker, analytics, telemetry, remote runtime code, remote fonts, external runtime requests, cookie/history access or course-content storage. Fonts are packaged and exposed only to MyCourses. Browser-managed sync applies only to the small theme/color preference. MyCourses' own network behavior is unchanged.

The content script uses bounded, reversible DOM enhancements for Home and legacy title panels, plus a ResizeObserver on the active custom banner. It does not scan question text, inspect image pixels or poll the document. The ZIP contains only the production extension; source, tests, references and development tools stay outside it.

## Development

Requires **Node 24 LTS** and npm. WXT, TypeScript, ESLint, Prettier, Vitest and Playwright versions are locked in `package-lock.json`. Native HTML/CSS is used for the popup and editor. Bootstrap is a development-only fixture dependency.

```powershell
git clone https://github.com/Tessiaah/BetterMyCourses.git
cd BetterMyCourses
npm ci
npm run dev
```

Load `.output/chrome-mv3-dev` manually in your chosen browser while WXT runs. Production builds have the restricted permissions described above; development builds also use WXT's local development connection.

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:theme
npm run zip
```

`build` writes `.output/chrome-mv3`; `zip` rebuilds and writes `.output/better-mycourses-1.8.0-chrome.zip`. `format` applies Prettier. If PowerShell blocks npm wrappers, use `npm.cmd`/`npx.cmd`.

Install Playwright Chromium for browser tests:

```powershell
npx playwright install chromium
npm run test:browser
```

`test:browser` loads the actual production extension in an isolated Chromium profile using local MyCourses fixtures. It requires Chromium's extension-debugging API. `test:theme` exercises built CSS, popup, editor and content JavaScript with simulated extension APIs; it can also use an installed signed Edge:

```powershell
$env:BMC_BROWSER_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:theme
```

This machine's Smart App Control blocks Playwright Chromium, and its installed Edge lacks the extension-loading API. The rendering/integration tests pass in signed Edge; actual installed-extension restart remains a manual check. No OS security settings were changed. See the [QA record](docs/QA.md) for measured scope and remaining checks.

## Source structure

| Path                                                                    | Responsibility                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `entrypoints/theme.content/`                                            | Document-start activation and stylesheet imports.                              |
| `entrypoints/popup/`, `entrypoints/options/`                            | Theme settings and banner editor.                                              |
| `src/theme/links.css`                                                   | Shared ordinary links and keyboard focus.                                      |
| `src/theme/forms.css`                                                   | Shared button and form states.                                                 |
| `src/theme/course-page.css`, `src/theme/quiz.css`, `src/theme/home.css` | Scoped native-course colors/spacing, quiz surfaces and authorized Home layout. |
| `src/theme/`                                                            | Other tokens, typography, motion and component styles.                         |
| `src/utils/`                                                            | Validation, storage, activation and reversible banner/Home/header helpers.     |
| `public/`                                                               | Bundled fonts, extension icons and third-party notices.                        |
| `tests/`                                                                | Unit, actual-extension and simulated-API browser tests.                        |
| `docs/`, `UI Reference/`                                                | Design audit, QA evidence and the four original visual references.             |

Every theme selector is gated by `html[data-better-my-courses='dark']`. Component rules reuse shared tokens; ordinary links and buttons have one owner instead of page-specific focus workarounds. Disabled styles stop matching when the root attribute is removed. An explicit saved Off setting is honored on startup. A brief native-color flash can occur while browser storage loads.

## Live check and limitations

After updating, check one activity title/intro, a quiz diagram and review, clicked links in instructor content, and the translucent Home title panel. Use Tab to confirm visible focus, and test the chosen color plus Off/On. Check a course's native structure/icons, calendar controls, both drawers' scrolling and banner editing. Restart the browser to confirm the installed extension's saved preferences.

Authenticated Aalto markup and unusual plugins still need live verification. Synthetic fixtures and the public homepage do not prove every signed-in variant. Unknown interactive questions, transparent white artwork, canvas charts and third-party/editor iframe documents may retain their original rendering. IntelliBoard SVG styling covers known upstream selectors; Aalto's deployed chart variant remains unverified. No full authenticated accessibility or Core Web Vitals certification is claimed. Chromium browsers are supported; Firefox has not been packaged or validated.

## Design and bundled licenses

The [design audit](docs/DESIGN.md) records the preservation brief and later Home redesign. The project-local [Taste Skill](.agents/skills/design-taste-frontend/SKILL.md) informed applicable design/pre-flight checks; native Moodle structure and the user's specific instructions take precedence over marketing defaults.

Lexend and Rubik are bundled from the official [Google Fonts repository](https://github.com/google/fonts) under the SIL Open Font License; notices ship in `public/fonts/`. Home's five local Phosphor SVG icons retain their [MIT notice](public/licenses/phosphor-MIT.txt). The installed Taste Skill retains its [MIT license](.agents/skills/design-taste-frontend/LICENSE).
