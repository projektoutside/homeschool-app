# Homeschool Hub 1.0.9 (10)

Release targets: the existing GitHub Pages workflow on `main` and Google Play Internal testing for `com.lashomeschool.hub`. The existing tester cohort, upload key, package identity, on-demand asset delivery and native backend-disabled behavior are retained. No Cloudflare deployment or Apple/TestFlight signing/publishing pipeline is configured in this repository; an iOS source folder alone is not a configured release destination.

## Combined changes

- Car King and Animal Champion reveal the correct answer in red after wrong answers, including finalized speech, with stale-answer/repeated-input guards.
- Many Birds One Stone gains matching icon artwork, an illustrated main menu, Single Player/VS entry, Progressive Play and all-18-level Custom Play; the gameplay header gives more room to the canvas.
- Preschool Fun gains a matching icon, bird-rescue tutorial/practice, nine bundled ElevenLabs effects, friendly narration, six varied activity families, illustrated pattern symbols, fresh empty answer slots and a framed bird scene.
- The separate eight-stage Challenge Mode increases continuous blue-bird chase speed to 11.25 times the first stage, unlocks stages progressively, and awards the saved Ultimate Master crown only after the final challenge. Help, question narration, visibility/host pause and answer celebrations protect thinking time. Free Play remains untimed. Correct answers retain the existing ten-point contract.
- Android advances beyond the published 1.0.8 (9) build. Asset-pack staging validates absolute source/destination roots before deleting generated content or moving assets.

## Integration and protection

The primary checkout was clean at 703dd25. Fresh remote inspection confirmed that the release-audit, Android stability and runtime cleanup branches were already ancestors of main. Their completed work is retained through that history; no outdated branch is remerged. The current games worktree contains the newer completed changes. A recovery Git bundle, binary patch and 129-file archive were saved under `output/releases/1.0.9-10/recovery/` before integration. Existing previews and ignored signing material are preserved.

## Validation and limitations

`npm run check` passed: typecheck, lint, 420 tests, 84 content entries, 1,136 audited assets and production build. `npm audit --audit-level=high` passed with three moderate tooling advisories and no high/critical advisories. New challenge fixtures passed six desktop/phone/tablet/landscape profiles; all eight stages, 45 awards, unlocks/reload, loss/retry, pause and Free Play were exercised. All 63 recorded voice clips passed integrity/decoding and narration recovery checks. Prior focused microphone, touch, menu and VS evidence is indexed in `docs/games-v2-validation.md` and the game design notes.

The actual side-panel browser was blocked by its URL policy; fixture tests use a synthetic origin and no preview session or user data. Physical devices, actual microphones, audible iOS playback, store installation and in-place upgrade are separate unverified gates. The device-lab coordinator was unavailable. Final source SHA, bundle hash/signature/module inspection, provider readback, deployment identity and post-launch QA belong in `output/releases/1.0.9-10/`; a local build or upload alone is not a deployment claim.

Google Play preparation follows the existing track and [official release workflow](https://support.google.com/googleplay/android-developer/answer/9859348). No tester, account permission, signing identity, database policy or new deployment system is changed.
