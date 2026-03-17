This archive documents category-era scaffolding removed during the three-area reset.

Removed as dead code:
- `src/data/content/language.ts`
- `src/data/content/puzzles.ts`
- the unused `CATEGORIES` export from `src/data/mockContent.ts`

Reason:
- The app now treats `Home page`, `Games`, and `Classroom` as the only top-level product areas.
- These files were empty and were no longer part of any runtime import path after the registry migration.
