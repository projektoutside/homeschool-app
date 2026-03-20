Original prompt: i want you to focus on the "Cage Pet Rescue" game. Please make this edit to the game, i want you to focus on making this significant change to the game where the user now instead of getting 4 math questions, the user is now only getting ONE math problem question only. so turn the visual display panel at the bottom of the 4 math questions perfectly into one large math question only. the large box should cover the entre area of replacing where the 4 questions were enlarging it to fit perfectly according to the viewers display panel console screen. ensure safety features to ensure rich perfect borders all around all components. and also lets make the "EP" number selection section a little bit larger now since we will have more spacing available as well. lets perfectly balance the visuals of this bottom section in a more neat organize professional way to ensure a easy rich perfect beautiful user friendly experience.

2026-03-20
- Replaced the four-card math deck with a single large `Math Challenge` card in the bottom panel.
- Reduced challenge runtime from four simultaneous problems to one active problem and one timer.
- Enlarged and rebalanced the EP selector panel and strengthened borders/background treatment for the bottom section.
- Live verification completed with Puppeteer at desktop, phone portrait, phone/tablet landscape, and tablet portrait viewports.
- Verified in-browser: first difficulty selection stays free, one correct answer awards one normal EP payout and regenerates one problem, one wrong answer increases stress and regenerates one problem, and Math Wizard solves one visible problem and awards one single-problem payout.
- `npm run audit:games` passed.
- `npm run check` timed out twice in this environment while running the repo-wide lint/build chain, so there is no clean repo-wide pass result from that script in this run.
- Targeted verification passed: `node --check` on `runtime.js`, `constants.js`, and `problem-config.js`, plus `git diff --check` on the edited files.

2026-03-20 follow-up
- Added classroom-style stacked rendering for place-value arithmetic in the bottom math panel so multi-digit and money addition/subtraction style problems line up by column instead of breaking across confusing centered lines.
- Kept plain inline rendering for negatives, algebra, and mixed-expression problems where a stacked worksheet layout would be less clear.
- Added tabular-number styling and compact-landscape safety caps so stacked problems stay aligned and readable inside the bottom card on smaller screens.
- Live browser verification completed for the new stacked formatter in emulated phone portrait and compact landscape layouts. Physical-device testing was not performed in this run.
- Targeted verification passed again: `node --check public/Games/cagepetrescue/src/game/runtime.js` and `git diff --check` on the edited Cage Pet Rescue files.

2026-03-20 inline safety follow-up
- Added a dedicated `.math-problem-inline` single-row renderer and moved width caps onto stacked-only math problem styles so longer inline expressions use the full bottom problem area before shrinking.
- Added inline font-fit safety logic in `runtime.js` so long mixed-operation expressions shrink within bounded limits and keep protected side margins instead of wrapping into a second row.
- Live browser verification forced the real level 7 template `60 ÷ (6 + 4) = ?` and confirmed it stayed on a single row in desktop, compact portrait, and compact landscape layouts with no wrap and preserved side margins.
- Verification passed in this run: `node --check public/Games/cagepetrescue/src/game/runtime.js`, `git diff --check -- public/Games/cagepetrescue/src/game/runtime.js public/Games/cagepetrescue/styles/components.css`, `npm run audit:games`, and `npm run check`.
