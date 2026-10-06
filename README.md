# BetterMyCourses

A privacy-friendly browser extension for [Aalto MyCourses](https://mycourses.aalto.fi/). It adds a true-black theme, locally bundled Lexend text and Rubik digits, configurable link colors, and editable Home/Dashboard banners. Individual course pages retain their native structure, navigation and original icons. Home has a responsive news layout.

Independent project; not an official Aalto University product.

## Install in Brave, Chrome or Edge

1. Download **better-mycourses-1.11.0-chrome.zip** from the [latest release](https://github.com/Tessiaah/BetterMyCourses/releases/latest).
2. Extract the ZIP into a permanent folder. Find the folder containing `manifest.json`.
3. Open `brave://extensions`, `chrome://extensions` or `edge://extensions` and enable **Developer mode**.
4. Choose **Load unpacked** and select that folder.
5. Refresh existing MyCourses tabs and optionally pin BetterMyCourses.

For a source build, load `.output/chrome-mv3` after running `npm run build`.

To update an existing installation, replace its extracted files, click the extension's **Reload** button, confirm **version 1.11.0**, then refresh MyCourses. Refreshing only the website does not reload an updated extension. Keep the installation folder in place.

The popup's **Dark theme** switch updates open MyCourses tabs immediately. Turning it off restores the native theme. **Study Assist** is a separate, optional switch; turn it off to remove its question drawers. There is no browser-store listing yet.

## Features

- Black page, subtle ink panels, off-white text and readable metadata.
- Champagne, Ivory, Sage or a custom link color. Dark choices are brightened enough for readable links.
- Shared sitewide link click/focus styling, visible chosen-color keyboard focus, and restrained button/hover motion with reduced-motion support.
- Original course layout, imagery and icon artwork; Files/Quiz/Progress glyphs follow the selected color.
- Refined calendar toolbar, timeline spacing and course overflow-menu placement.
- Dark assignment and Moodle/STACK quiz surfaces, styled Finish review controls, and padded light backgrounds sized to each quiz diagram. Inline equations, icons and interactive drag/drop assets are excluded.
- More space between activity titles, separators and introduction boxes.
- Dark authored course tables, including inline/legacy fills and merged cells; readable highlights, stripes and semantic status rows.
- Aligned Clear my choice/Check actions with larger gaps, clearer answer fields, and green/yellow/red feedback driven by native site grading.
- Adaptive multiple-choice feedback uses the site's latest grading badge, including questions with a neutral overall state.
- Compact dark quiz timer with a larger selected-color countdown, Hide/Show inside the panel, and native deadline urgency preserved.
- Optional **Study Assist** in quiz attempts/reviews: Drawing and Formulas tabs, pen colors, stroke size, eraser, undo, clear and Browse mode. Off by default; works with either theme.
- Personal formula library with subjects, global title search, live LaTeX previews, editing and deletion. Calculus and resistor starter references are included. Click a formula to place a draggable reference on screen; closing clears ink and placed cards while retaining the saved library.
- Pure-black course-title panels and a consistent dark course navigation bar; Home retains its translucent photo overlay.
- Responsive Home banner and news panels, selected-color details and a translucent black title backing.
- Separate Home/Dashboard banner settings: Original image, My image or Plain black.
- Local banner editor with Fill/Fit/Stretch, drag framing, zoom, keyboard sliders, save/discard/reset and independent page drafts.
- Hidden scrollbar tracks with wheel, touch and keyboard scrolling retained.

Banner uploads accept PNG, JPEG or WebP up to 10 MB. Images are decoded and re-encoded locally, capped at 1920px on the longest side and saved on the device. Fill crops proportionally; Fit shows the whole image with letterboxing; Stretch fills the space with changed proportions. Original images remain the default. Course banners and thumbnails are preserved.

## Study Assist

Enable **Study Assist** in the extension popup, then open **Study Assist** below a quiz question. The floating toolbar has **Drawing** and **Formulas** tabs. It stays reachable while scrolling. Use a mouse, touch or pen to sketch over diagrams or work through a calculation.

- **Pen**: your chosen extension color by default, presets, a custom color picker and adjustable 2–16px stroke size.
- **Eraser** removes only your ink; **Undo** reverses the last stroke or erasure; **Clear** removes all ink.
- **Browse** lets you interact with the original page while retaining drawings. Choose Pen/Eraser to resume.
- **Formulas** starts with Math and Electrical Engineering subjects. Select a subject to browse, or search a title across every subject. **Add subject** creates your own category; select it to rename or delete it.
- **Add formula** saves a title, subject and math LaTeX, with a live preview and syntax errors before saving. Enter `R_{\mathrm{eq}}=R_1+R_2` without `$` delimiters. Use each formula's edit/delete actions to maintain your library. Deleting a subject also deletes its formulas after confirmation.
- Click a formula to place it on screen. Drag its title with a mouse, pen or touch; a focused title also accepts arrow keys (10px, or 1px with Shift). Up to eight references can stay visible while scrolling. Remove a card with its X action. Switching tabs retains ink and cards; Formulas lets you interact with the page.
- **Close**, Escape, collapsing the drawer, opening another question's drawer, disabling Study Assist or leaving the page clears the drawings and placed cards. Reopening starts with a blank screen and your saved library. Escape within an editor first cancels that edit.

Only one workspace is active per tab. Ink follows the question while the page scrolls and resizes; cards stay within the visible viewport. Neither ink nor card positions are saved, synced, exported or sent to a service. Your subjects, titles and LaTeX are saved locally in this browser profile, shared by its MyCourses tabs. The library supports up to 60 subjects and 500 formulas (60-character subject names, 100-character titles, 2048-character LaTeX). It is a reference library with formatting checks; it does not solve, validate numerical answers or fetch quiz answers. Native grading, timers and submission behavior are unchanged.

## Privacy and permissions

The production Manifest V3 extension requests only:

| Permission                     | Purpose                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                      | Theme/color/Study Assist preferences in `storage.sync`; banner images/framing and the personal formula library in `storage.local`. |
| `https://mycourses.aalto.fi/*` | Apply bundled styles and the content script on MyCourses only.                                                                     |

No background worker, analytics, telemetry, remote runtime code, remote fonts, external runtime requests, cookie/history access or course-content storage. Fonts are packaged and exposed only to MyCourses. Browser-managed sync applies only to the small theme/color/Study Assist preferences. MyCourses' own network behavior is unchanged.

The content script uses bounded, reversible DOM enhancements for Home and legacy title panels, plus a ResizeObserver on the active custom banner. When explicitly enabled, Study Assist observes only the quiz form/main region to maintain drawers after native updates. Opening a drawer creates a transparent viewport canvas and toolbar. Pointer coordinates, colors, stroke widths and placed cards remain in page memory; history is bounded and removed on close/disable. Scroll/resize listeners and workspace/card ResizeObservers exist only while it is open and are removed on close. Formula storage contains only library metadata and user-entered titles/LaTeX; updates are coordinated between tabs. KaTeX, its styles and fonts are bundled locally and isolated from the site's own math. No question text, student answer values, hidden answer payloads or page image pixels are inspected. There is no document-wide observer or polling. The ZIP contains only the production extension; source, tests, references and development tools stay outside it.

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

`build` writes `.output/chrome-mv3`; `zip` rebuilds and writes `.output/better-mycourses-1.11.0-chrome.zip`. `format` applies Prettier. If PowerShell blocks npm wrappers, use `npm.cmd`/`npx.cmd`.

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

| Path                                                                    | Responsibility                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `entrypoints/theme.content/`                                            | Document-start activation and stylesheet imports.                                                              |
| `entrypoints/popup/`, `entrypoints/options/`                            | Theme settings and banner editor.                                                                              |
| `src/theme/links.css`                                                   | Shared ordinary links and keyboard focus.                                                                      |
| `src/theme/forms.css`                                                   | Shared button and form states.                                                                                 |
| `src/theme/course-page.css`, `src/theme/quiz.css`, `src/theme/home.css` | Scoped native-course colors/spacing, quiz surfaces and authorized Home layout.                                 |
| `src/theme/`                                                            | Other tokens, typography, motion and component styles.                                                         |
| `src/utils/`                                                            | Validation, storage, activation and reversible banner/Home/header helpers.                                     |
| `src/features/`                                                         | Study Assist lifecycle, temporary drawing, formula model/storage/renderer/library, draggable cards and styles. |
| `public/`                                                               | Bundled fonts, extension icons and third-party notices.                                                        |
| `tests/`                                                                | Unit, actual-extension and simulated-API browser tests.                                                        |
| `docs/`, `UI Reference/`                                                | Design audit, QA evidence and the four original visual references.                                             |

Every theme selector is gated by `html[data-better-my-courses='dark']`; independent Study Assist styles are gated by `html[data-bmc-study-assist='on']`. Component rules reuse shared tokens; ordinary links and buttons have one owner instead of page-specific focus workarounds. Disabled styles stop matching when their root attribute is removed. Explicit saved Off settings are honored on startup. A brief native-color flash can occur while browser storage loads.

## Live check and limitations

After updating, check adaptive multiple-choice feedback colors and toggle Study Assist. Verify Drawing tools, formula search, a new subject and LaTeX formula, drag/arrow-key placement, Close/reopening and native Check behavior. Restart the browser to confirm saved preferences and your local formula library. Confirm the course tabs have no white strip. Use Tab to confirm visible focus, and test the chosen color plus Off/On. Check a course's native structure/icons, quiz diagrams, the translucent Home title, calendar controls, both side drawers' scrolling and banner editing.

Authenticated Aalto markup and unusual plugins still need live verification. Synthetic fixtures and the public homepage do not prove every signed-in variant. Unknown interactive questions, transparent white artwork, canvas charts and third-party/editor iframe documents may retain their original rendering. IntelliBoard SVG styling covers known upstream selectors; Aalto's deployed chart variant remains unverified. No full authenticated accessibility or Core Web Vitals certification is claimed. Chromium browsers are supported; Firefox has not been packaged or validated.

## Design and bundled licenses

The [design audit](docs/DESIGN.md) records the preservation brief and later Home redesign. The project-local [Taste Skill](.agents/skills/design-taste-frontend/SKILL.md) informed applicable design/pre-flight checks; native Moodle structure and the user's specific instructions take precedence over marketing defaults.

Lexend and Rubik are bundled from the official [Google Fonts repository](https://github.com/google/fonts) under the SIL Open Font License; notices ship in `public/fonts/`. Home's five local Phosphor SVG icons retain their [MIT notice](public/licenses/phosphor-MIT.txt). The installed Taste Skill retains its [MIT license](.agents/skills/design-taste-frontend/LICENSE).

Formula typesetting uses locally bundled [KaTeX](https://katex.org/) and WOFF2 math fonts under its [MIT notice](public/licenses/katex-MIT.txt). Starter references are editable mathematical formulas, checked against OpenStax [Calculus Volume 1](https://openstax.org/books/calculus-volume-1/pages/3-3-differentiation-rules) and [University Physics Volume 2](https://openstax.org/books/university-physics-volume-2/pages/10-2-resistors-in-series-and-parallel); they are not an official Aalto formula sheet. Detailed source links are in the design audit.
