import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

const schemaPath = fileURLToPath(new URL('../supabase/schema.sql', import.meta.url));
const POINTS_SECTION = '-- Per-user cumulative points totals and idempotent game point events';
const USER_A = '00000000-0000-4000-8000-000000000001';
const USER_B = '00000000-0000-4000-8000-000000000002';

test('points RPC owns writes, is idempotent, and isolates users', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      insert into auth.users (id) values ('${USER_A}'), ('${USER_B}');
    `);

    const schema = await readFile(schemaPath, 'utf8');
    const pointsIndex = schema.indexOf(POINTS_SECTION);
    assert.ok(pointsIndex >= 0, 'points schema section exists');
    await db.exec(schema.slice(pointsIndex));
    await db.exec(`
      grant usage on schema public to anon, authenticated;
      grant select on public.user_points_totals, public.user_points_events to authenticated;
      set role authenticated;
      select set_config('request.jwt.claim.sub', '${USER_A}', false);
    `);

    await assert.rejects(
      db.query(`insert into public.user_points_totals (user_id, total_points) values ('${USER_A}', 500)`),
      /permission denied/,
    );
    await assert.rejects(
      db.query(`insert into public.user_points_events (user_id, game_id, session_id, event_id, points) values ('${USER_A}', 'game', 'session', 'direct', 500)`),
      /permission denied/,
    );

    const apply = (eventId, points) => db.query(
      'select * from public.apply_game_points_event($1, $2, $3, $4)',
      ['game', 'session', eventId, points],
    );
    assert.deepEqual((await apply('first', 10)).rows[0], {
      accepted: true, total_points: 10, reason: null,
    });
    assert.deepEqual((await apply('first', 10)).rows[0], {
      accepted: false, total_points: 10, reason: 'duplicate',
    });
    assert.deepEqual((await apply('too-much', -11)).rows[0], {
      accepted: false, total_points: 10, reason: 'insufficient_points',
    });
    assert.equal((await db.query('select count(*)::int as count from public.user_points_events')).rows[0].count, 1);

    await db.query(`select set_config('request.jwt.claim.sub', '${USER_B}', false)`);
    assert.equal((await db.query('select count(*)::int as count from public.user_points_events')).rows[0].count, 0);
    assert.equal((await apply('first', 7)).rows[0].total_points, 7);

    await db.exec('reset role; set role anon;');
    await assert.rejects(apply('anonymous', 1), /permission denied/);
  } finally {
    await db.close();
  }
});
