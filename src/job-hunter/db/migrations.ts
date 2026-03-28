import Database from 'better-sqlite3';

/**
 * Per-connection initialisation. Must be called on every new connection,
 * independent of whether migrations need to run. Sets SQLite pragmas that
 * reset on each new connection (e.g. foreign_keys).
 */
export function initConnection(db: Database.Database): void {
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
}

/**
 * Apply all schema migrations to the given database.
 *
 * Idempotent — safe to call multiple times. Uses `CREATE TABLE IF NOT EXISTS`
 * so re-running against an existing schema is a no-op.
 *
 * Also calls initConnection() so callers do not need to do so separately
 * when opening a fresh database for the first time.
 */
export function runMigrations(db: Database.Database): void {
  initConnection(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      source      TEXT    NOT NULL,
      ats_type    TEXT    NOT NULL,
      external_id TEXT    NOT NULL,
      title       TEXT    NOT NULL,
      company     TEXT    NOT NULL,
      url         TEXT    NOT NULL,
      salary_raw  TEXT,
      posted_at   TEXT,
      fetched_at  TEXT    NOT NULL,
      blacklisted INTEGER NOT NULL DEFAULT 0,
      UNIQUE (source, external_id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      job_id    INTEGER NOT NULL PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
      score     REAL    NOT NULL,
      rationale TEXT    NOT NULL,
      scored_at TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS approvals (
      job_id      INTEGER NOT NULL PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
      status      TEXT    NOT NULL DEFAULT 'pending',
      actioned_at TEXT
    );

    CREATE TABLE IF NOT EXISTS applications (
      job_id       INTEGER NOT NULL PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
      method       TEXT    NOT NULL,
      submitted_at TEXT    NOT NULL,
      result       TEXT
    );
  `);

  // Idempotent column addition — guard against 'duplicate column name' on re-runs.
  try {
    db.exec('ALTER TABLE jobs ADD COLUMN description TEXT');
  } catch (err: unknown) {
    if (!(err instanceof Error) || !err.message.includes('duplicate column name')) {
      throw err;
    }
  }
}
