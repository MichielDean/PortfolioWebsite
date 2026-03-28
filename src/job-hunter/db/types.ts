export type AtsType = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'icims' | 'taleo' | 'unknown';
export type ApprovalStatus = 'pending' | 'approved' | 'denied';
export type ApplicationMethod = 'greenhouse' | 'lever' | 'manual';

// ─── Row types (reflect SQLite schema exactly) ────────────────────────────────

/** A row from the `jobs` table. `blacklisted` is a SQLite INTEGER: 0 = false, 1 = true. */
export interface Job {
  id: number;
  source: string;
  ats_type: AtsType;
  external_id: string;
  title: string;
  company: string;
  url: string;
  salary_raw: string | null;
  posted_at: string | null;
  fetched_at: string;
  blacklisted: number;
}

export interface Score {
  job_id: number;
  score: number;
  rationale: string;
  scored_at: string;
}

export interface Approval {
  job_id: number;
  status: ApprovalStatus;
  actioned_at: string | null;
}

export interface Application {
  job_id: number;
  method: ApplicationMethod;
  submitted_at: string;
  result: string | null;
}

// ─── Input types (caller-supplied fields; generated fields are omitted) ───────

export interface JobInput {
  source: string;
  ats_type: AtsType;
  external_id: string;
  title: string;
  company: string;
  url: string;
  salary_raw?: string | null;
  posted_at?: string | null;
}

export interface ScoreInput {
  job_id: number;
  score: number;
  rationale: string;
}

export interface ApprovalInput {
  job_id: number;
  status: ApprovalStatus;
}

export interface ApplicationInput {
  job_id: number;
  method: ApplicationMethod;
  submitted_at: string;
  result?: string | null;
}
