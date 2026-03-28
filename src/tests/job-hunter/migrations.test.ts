/**
 * Tests for the migrations module.
 *
 * Uses an in-memory SQLite DB for fast, isolated, deterministic tests.
 *
 * Structure follows Given / When / Then:
 *   Given: a fresh Database instance
 *   When:  initConnection() or runMigrations() is called
 *   Then:  the expected SQLite pragmas are in effect
 */

import Database from 'better-sqlite3';
import { initConnection, runMigrations } from '../../job-hunter/db/migrations';

// ─── initConnection() ─────────────────────────────────────────────────────────

describe('initConnection()', () => {
  it('Given a new connection, When initConnection is called, Then foreign_keys are enabled', () => {
    const db = new Database(':memory:');
    initConnection(db);
    const fkEnabled = db.pragma('foreign_keys', { simple: true });
    expect(fkEnabled).toBe(1);
  });

  it('Given a new connection, When initConnection is called, Then busy_timeout is set to 5000', () => {
    const db = new Database(':memory:');
    initConnection(db);
    const timeout = db.pragma('busy_timeout', { simple: true });
    expect(timeout).toBe(5000);
  });
});

// ─── runMigrations() ──────────────────────────────────────────────────────────

describe('runMigrations()', () => {
  it('Given a fresh DB, When runMigrations is called, Then busy_timeout is set to 5000', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const timeout = db.pragma('busy_timeout', { simple: true });
    expect(timeout).toBe(5000);
  });

  it('Given a fresh DB, When runMigrations is called, Then the jobs table has a description column', () => {
    const db = new Database(':memory:');
    runMigrations(db);
    const cols = (db.pragma('table_info(jobs)') as Array<{ name: string }>).map(
      (r) => r.name,
    );
    expect(cols).toContain('description');
  });
});
