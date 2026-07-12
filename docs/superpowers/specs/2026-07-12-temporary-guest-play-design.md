# Temporary Guest Play Design

## Goal

Let a learner press **Play as Guest** on the authentication screen and use the full learner-facing game without creating or signing into a Supabase account.

## User experience

- Keep the existing authentication screen and regular account options.
- Rename the guest action to **Play as Guest**.
- Pressing it immediately starts a temporary guest session and opens the learner home experience.
- Guests can open and play every learner-facing game and resource available to a regular learner.
- Guests can earn points, change their learner profile, and make character or game-progress choices during the active session.
- Show a short explanation that guest progress resets when the guest signs out or closes the browser or app.

## Session and data behavior

- Store guest authentication state and guest-owned progress in session-scoped browser storage, not Supabase or persistent local storage.
- Keep guest state available across page refreshes and route changes in the same open browser/app session.
- Clear guest-owned data when the guest signs out.
- Allow the browser or app lifecycle to discard guest-owned data when the browsing session ends.
- Do not send guest progress to Supabase.
- Keep signed-in Supabase account behavior unchanged, including persistent cloud-backed data.
- Remove or migrate legacy persistent guest keys when a new temporary guest session starts or signs out so older guest data cannot reappear.

## Access boundaries

- Guest mode represents a learner, not a real authenticated Supabase identity.
- Guest users must not receive manager or administrator permissions.
- Manager-only configuration, classroom-management writes, account management, and other privileged Supabase operations remain unavailable.
- Public/read-only catalog content needed to render learner gameplay may continue using the app's existing safe read path.

## Components affected

- Authentication page: guest button label, helper copy, and start action.
- Guest session utility: session-scoped identity, profile, cleanup, and legacy-key handling.
- Authentication context: restore the guest only within the active browser/app session and clear guest state on sign-out.
- Learner state providers and embedded game bridges: ensure points, preferences, and game state use temporary guest storage while keeping account storage unchanged.
- Access guards: confirm every learner route accepts a guest and every privileged route/action still rejects one.

## Error handling

- If session storage is unavailable, do not start guest mode. Explain that the browser must allow temporary storage for guest play.
- A failure in Supabase must not prevent guest play because guest mode is local.
- A guest-only persistence failure should not silently fall back to Supabase or grant elevated access.

## Validation

This is a Tier 3 authentication and full-game journey change.

- Run focused authentication and guest-session tests.
- Run the smallest repository check covering types, lint, production build, and game registration/routing.
- Smoke-test Play as Guest, learner navigation, game launch, points/progress behavior, refresh behavior, sign-out reset, and browser-close/new-session reset.
- Verify a regular Supabase account still signs in and retains persistent data.
- Verify manager/admin surfaces remain denied to guests.
- Exercise desktop, Android phone, iPhone/Safari-sensitive, and tablet viewports. Clearly separate physical-device results from emulation or code review.

## Out of scope

- Converting guest progress into a newly created account.
- Syncing guest progress between devices.
- Giving guests manager or administrator access.
- Changing the design of the regular sign-in or account-creation flows beyond the guest wording.
