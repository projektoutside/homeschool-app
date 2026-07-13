# On-Demand Game Library Design

## Goal

Keep the Google Play base installation near 12 MB, launch La's Homeschool Hub immediately after that base installation, and download the large learning and game library only after the learner or parent explicitly agrees inside the app.

This design replaces the current `fast-follow` asset-pack behavior from the earlier Play Asset Delivery design. Browser and GitHub Pages deployments remain unchanged.

## Delivery model

- Change the `game_assets` Play Asset Delivery pack from `fast-follow` to `on-demand`.
- Keep the React/Capacitor shell, icons, configuration, download experience, and other boot-critical files in the base module.
- Keep games, the 3D classroom, worksheets, and other large learning assets in the `game_assets` pack.
- Check the pack location on every Android launch because Google Play may remove or invalidate downloaded packs.
- Query Google Play for the current pack download size before asking for consent.
- Do not call `fetch()` until the user selects **Download Full Library**.
- When the pack is already available, skip the consent screen and open the app normally.

Google Play controls the exact number displayed on its store and system download surfaces. Configuring the content as `on-demand` is the supported way to prevent the approximately 600 MB pack from automatically downloading with or immediately after the base installation.

## First-launch experience

When the pack is not installed, show a full-screen native-shell overlay before learners can enter features that depend on the pack.

### Welcome state

- Heading: **Welcome to La's Homeschool Hub!**
- Message: **To unlock every lesson, activity, and game, download the complete learning library. You can start exploring as soon as it is ready.**
- Show the size reported by Google Play, rounded to a friendly value, before download begins.
- Primary action: **Download Full Library**.
- Secondary action: **Not Now**. This keeps the lightweight welcome screen open with a clear **Download When Ready** action; it does not expose incomplete game or classroom routes.
- Explain that Wi-Fi is recommended and that the library remains available after the download unless app storage is cleared or Google Play invalidates the pack during an update.

### Downloading state

- Show the current phase: preparing, downloading, or finishing.
- Show percentage, downloaded size, total size, and a visual progress bar.
- Keep the screen responsive in portrait and landscape, including Android safe areas and tablets.
- Continue the download through ordinary activity pauses and resumes as allowed by Google Play.
- Automatically enter the app when the pack reaches `COMPLETED`.

### Interactive coins

- Display several large coin targets around the progress card.
- Support pointer, touch, keyboard activation, and accessible labels.
- Each activation gives a small bounce/spark animation and increments a local **Coins collected while waiting** counter.
- Coin activity is decorative and session-only. It does not alter learner rewards, saved progress, Supabase data, or game currency.
- Respect reduced-motion preferences by replacing movement with a simple highlight.
- Keep animations lightweight so they do not compete with extraction, WebView rendering, or low-memory Android devices.

## Native architecture

- Add a focused Capacitor Android plugin responsible for Play Asset Delivery status, size lookup, starting the on-demand fetch, retrying, and emitting progress events.
- Keep `MainActivity` responsible for installing the asset-aware WebView client and registering the plugin.
- Let the boot overlay call the plugin for initial status after the Capacitor bridge is ready instead of relying on an early `evaluateJavascript()` call that may occur before the page handlers exist.
- Continue using `GameAssetWebViewClient` to serve only trusted local requests from the downloaded pack.
- Keep all pack locations runtime-resolved; never cache a filesystem path across launches.

## State flow

1. The base app starts and loads the lightweight shell.
2. The shell asks the native plugin for `game_assets` status and download size.
3. If installed, the shell hides the overlay and continues normally.
4. If absent, the shell presents the welcome and consent state without starting a download.
5. The user selects **Download Full Library**.
6. The plugin calls Google Play Asset Delivery `fetch()` and emits state updates.
7. The shell renders progress and optional coin interactions.
8. If Google Play requires Wi-Fi or additional confirmation, the shell explains the requirement and provides a retry path.
9. When complete, the resolver refreshes the pack location, the overlay closes, and the existing app becomes available without a restart.

## Recovery and edge cases

- **Offline:** Explain that an internet connection is needed and keep a retry action available.
- **Waiting for Wi-Fi:** Explain that the full library is large and ask the user to connect to Wi-Fi, while preserving progress.
- **Google Play confirmation required:** Surface a clear continue action backed by the supported Play confirmation flow where available.
- **Insufficient storage or failed download:** Show a warm, actionable message and retry button; do not loop automatically.
- **Canceled or paused download:** Preserve the welcome screen and allow the user to resume.
- **Activity recreation or app restart:** Re-query current state and resume the correct UI without resetting Play-managed progress.
- **Pack removed after an update:** Return to the consent screen rather than showing broken or blank game pages.
- **Locally sideloaded builds:** Report that the full library must be installed through Google Play, while local bundletool testing uses the supported local-testing asset-pack mode.

## Accessibility and device behavior

- Use semantic headings, readable contrast, visible focus, and minimum 48 dp touch targets.
- Do not rely on hover or animation to communicate download state.
- Keep important controls above Android navigation and display cutouts.
- Support phone and tablet portrait/landscape layouts.
- The Android-only native delivery overlay must not change the normal web, GitHub Pages, iPhone, or iPad experience.

## Verification

This remains a Tier 3 Android-native, download, routing, touch, and responsive-layout change.

- Add focused tests that require `on-demand` delivery and prohibit automatic launch-time `fetch()`.
- Test initial status, consent, progress, completion, retry, and already-installed states.
- Test coin pointer, keyboard, counter, and reduced-motion behavior.
- Run lint, production build, game audit, asset audit, Android tests, and bundle inspection.
- Confirm the base module stays below the existing size limit and the `game_assets` pack remains separate.
- Install the exact signed bundle with bundletool local testing and verify first launch does not automatically fetch the pack.
- Verify download approval, visible progress, coin interaction, completion, and automatic entry on an Android phone emulator.
- Check phone portrait/landscape and tablet portrait/landscape. Code-review Safari/web isolation because Play Asset Delivery is Android-only.
- Upload a new version to Google Play Internal testing and confirm Play reports the small initial install and the on-demand pack separately.
- Report physical-device, emulated, Play Console, and code-review evidence separately.

## Release plan

- Increment Android version code and patch version.
- Build and inspect a signed Android App Bundle.
- Commit and push the implementation to `main` only after the full verification gate passes.
- Publish the new bundle to Google Play Internal testing.
- Return the existing tester opt-in URL and exact release status.

## Out of scope

- Splitting every game into an individual asset pack.
- Changing learner reward balances or adding permanent coin currency.
- Apple App Store packaging.
- Production-track publication.
- Replacing Google Play Asset Delivery with a paid CDN.
