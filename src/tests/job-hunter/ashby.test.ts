/**
 * Tests for the Ashby API client.
 *
 * All HTTP calls are intercepted with jest.spyOn(global, 'fetch') so tests
 * are fast, deterministic, and make no real network requests.
 *
 * Structure follows Given / When / Then thinking:
 *   Given: fetch mocked to return a specific Ashby API payload
 *   When:  fetchAshbyJobs() is called with an explicit watchlist
 *   Then:  the returned JobInput array matches expectations
 */

import {
  fetchAshbyJobs,
  isRemote,
  isValidAshbyJobShape,
  matchesTargetRole,
  normalizeJob,
} from '../../job-hunter/sources/ashby';
import type { AshbyJob, AshbyJobBoardResponse } from '../../job-hunter/sources/ashby';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(
  responses: Record<string, AshbyJobBoardResponse>,
): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
    const body = JSON.parse((init?.body as string) ?? '{}') as { jobBoardName?: string };
    const boardName = body.jobBoardName ?? '';
    const payload = responses[boardName] ?? { jobs: [] };
    return {
      ok: true,
      json: async () => payload,
    } as Response;
  });
}

function makePage(
  jobs: AshbyJob[],
  nextCursor?: string | null,
): AshbyJobBoardResponse {
  return { jobs, nextCursor: nextCursor ?? null };
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const remoteJob: AshbyJob = {
  id: 'ashby-uuid-1001',
  title: 'VP of Engineering',
  publishedDate: '2025-03-20T00:00:00.000Z',
  jobUrl: 'https://jobs.ashbyhq.com/acme/ashby-uuid-1001',
  isRemote: true,
  location: 'Remote',
};

const onSiteJob: AshbyJob = {
  id: 'ashby-uuid-1002',
  title: 'VP of Engineering',
  publishedDate: '2025-03-20T00:00:00.000Z',
  jobUrl: 'https://jobs.ashbyhq.com/acme/ashby-uuid-1002',
  isRemote: false,
  location: 'San Francisco, CA',
};

const irrelevantRemoteJob: AshbyJob = {
  id: 'ashby-uuid-1003',
  title: 'Software Engineer',
  publishedDate: '2025-03-20T00:00:00.000Z',
  jobUrl: 'https://jobs.ashbyhq.com/acme/ashby-uuid-1003',
  isRemote: true,
  location: 'Remote',
};

const remoteInLocationJob: AshbyJob = {
  id: 'ashby-uuid-1004',
  title: 'Director of Engineering',
  publishedDate: '2025-03-21T00:00:00.000Z',
  jobUrl: 'https://jobs.ashbyhq.com/notion/ashby-uuid-1004',
  isRemote: false,
  location: 'Remote - US',
};

const jobWithSalary: AshbyJob = {
  id: 'ashby-uuid-2001',
  title: 'VP of Engineering',
  publishedDate: '2025-03-20T00:00:00.000Z',
  jobUrl: 'https://jobs.ashbyhq.com/globex/ashby-uuid-2001',
  isRemote: true,
  location: 'Remote',
  compensation: { compensationTierSummary: '$200,000 - $250,000' },
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── matchesTargetRole() ──────────────────────────────────────────────────────

describe('matchesTargetRole()', () => {
  it('returns true for an exact target role title', () => {
    expect(matchesTargetRole('VP of Engineering')).toBe(true);
  });

  it('returns true for a title that contains the target role', () => {
    expect(matchesTargetRole('Senior VP of Engineering')).toBe(true);
  });

  it('returns false for an unrelated title', () => {
    expect(matchesTargetRole('Software Engineer')).toBe(false);
  });

  it('matches target roles case-insensitively', () => {
    expect(matchesTargetRole('vp of engineering')).toBe(true);
  });

  it('returns false for an empty title', () => {
    expect(matchesTargetRole('')).toBe(false);
  });

  it('uses a provided roles list instead of the default', () => {
    expect(matchesTargetRole('Custom Role', ['Custom Role'])).toBe(true);
    expect(matchesTargetRole('VP of Engineering', ['Custom Role'])).toBe(false);
  });
});

// ─── isRemote() ───────────────────────────────────────────────────────────────

describe('isRemote()', () => {
  it('returns true when isRemote flag is true', () => {
    expect(isRemote(remoteJob)).toBe(true);
  });

  it('returns false when isRemote is false and location is on-site', () => {
    expect(isRemote(onSiteJob)).toBe(false);
  });

  it('returns true when isRemote is false but location contains "Remote"', () => {
    expect(isRemote(remoteInLocationJob)).toBe(true);
  });

  it('matches "remote" case-insensitively in location', () => {
    expect(isRemote({ isRemote: false, location: 'REMOTE' })).toBe(true);
  });

  it('returns true when location contains "Remote" in a compound string', () => {
    expect(isRemote({ isRemote: false, location: 'Remote - US' })).toBe(true);
  });

  it('returns false when location is null and isRemote is false', () => {
    expect(isRemote({ isRemote: false, location: null })).toBe(false);
  });

  it('returns false when location is absent and isRemote is not set', () => {
    expect(isRemote({ isRemote: undefined, location: undefined })).toBe(false);
  });
});

// ─── isValidAshbyJobShape() ───────────────────────────────────────────────────

describe('isValidAshbyJobShape()', () => {
  it('returns true for a well-formed job object', () => {
    expect(isValidAshbyJobShape(remoteJob)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidAshbyJobShape(null)).toBe(false);
  });

  it('returns false for a non-object', () => {
    expect(isValidAshbyJobShape('string')).toBe(false);
  });

  it('returns false when id is missing', () => {
    const { id: _id, ...noId } = remoteJob;
    expect(isValidAshbyJobShape(noId)).toBe(false);
  });

  it('returns false when title is missing', () => {
    const { title: _title, ...noTitle } = remoteJob;
    expect(isValidAshbyJobShape(noTitle)).toBe(false);
  });

  it('returns false when jobUrl is missing', () => {
    const { jobUrl: _url, ...noUrl } = remoteJob;
    expect(isValidAshbyJobShape(noUrl)).toBe(false);
  });
});

// ─── normalizeJob() — field mapping ──────────────────────────────────────────

describe('normalizeJob() — field mapping', () => {
  it('sets source to "ashby"', () => {
    expect(normalizeJob(remoteJob, 'acme').source).toBe('ashby');
  });

  it('sets ats_type to "ashby"', () => {
    expect(normalizeJob(remoteJob, 'acme').ats_type).toBe('ashby');
  });

  it('uses the job id as external_id', () => {
    expect(normalizeJob(remoteJob, 'acme').external_id).toBe('ashby-uuid-1001');
  });

  it('maps title to title', () => {
    expect(normalizeJob(remoteJob, 'acme').title).toBe('VP of Engineering');
  });

  it('uses the provided company argument for company', () => {
    expect(normalizeJob(remoteJob, 'acme').company).toBe('acme');
  });

  it('maps jobUrl to url', () => {
    expect(normalizeJob(remoteJob, 'acme').url).toBe(
      'https://jobs.ashbyhq.com/acme/ashby-uuid-1001',
    );
  });

  it('maps publishedDate to posted_at', () => {
    expect(normalizeJob(remoteJob, 'acme').posted_at).toBe('2025-03-20T00:00:00.000Z');
  });

  it('sets posted_at to null when publishedDate is absent', () => {
    const jobNoDdate: AshbyJob = { ...remoteJob, publishedDate: undefined };
    expect(normalizeJob(jobNoDdate, 'acme').posted_at).toBeNull();
  });

  it('sets salary_raw to null when compensation is absent', () => {
    expect(normalizeJob(remoteJob, 'acme').salary_raw).toBeNull();
  });

  it('sets salary_raw to null when compensationTierSummary is absent', () => {
    const jobNoSalary: AshbyJob = { ...remoteJob, compensation: {} };
    expect(normalizeJob(jobNoSalary, 'acme').salary_raw).toBeNull();
  });

  it('extracts salary_raw from compensation.compensationTierSummary', () => {
    expect(normalizeJob(jobWithSalary, 'globex').salary_raw).toBe('$200,000 - $250,000');
  });
});

// ─── fetchAshbyJobs() — filtering ────────────────────────────────────────────

describe('fetchAshbyJobs() — filtering', () => {
  it('returns only jobs matching target role AND remote', async () => {
    mockFetch({ acme: makePage([remoteJob, onSiteJob, irrelevantRemoteJob]) });
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('ashby-uuid-1001');
  });

  it('excludes on-site jobs even when title matches', async () => {
    mockFetch({ acme: makePage([onSiteJob]) });
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('excludes jobs with irrelevant titles even when remote', async () => {
    mockFetch({ acme: makePage([irrelevantRemoteJob]) });
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('detects remote from location field when isRemote is false', async () => {
    mockFetch({ notion: makePage([remoteInLocationJob]) });
    const jobs = await fetchAshbyJobs(['notion']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('ashby-uuid-1004');
  });
});

// ─── fetchAshbyJobs() — multi-company ────────────────────────────────────────

describe('fetchAshbyJobs() — multi-company', () => {
  it('fetches jobs from all companies in the watchlist', async () => {
    const spy = mockFetch({
      acme: makePage([remoteJob]),
      notion: makePage([remoteInLocationJob]),
    });
    const jobs = await fetchAshbyJobs(['acme', 'notion']);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(2);
  });

  it('tags each job with its board name as the company', async () => {
    mockFetch({
      acme: makePage([remoteJob]),
      notion: makePage([remoteInLocationJob]),
    });
    const jobs = await fetchAshbyJobs(['acme', 'notion']);
    const companies = jobs.map((j) => j.company);
    expect(companies).toContain('acme');
    expect(companies).toContain('notion');
  });

  it('returns empty array when watchlist is empty', async () => {
    const spy = mockFetch({});
    const jobs = await fetchAshbyJobs([]);
    expect(spy).not.toHaveBeenCalled();
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array when no company has matching jobs', async () => {
    mockFetch({ acme: makePage([onSiteJob, irrelevantRemoteJob]) });
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('concatenates jobs from multiple companies into a single array', async () => {
    mockFetch({
      acme: makePage([remoteJob]),
      notion: makePage([remoteInLocationJob]),
    });
    const jobs = await fetchAshbyJobs(['acme', 'notion']);
    const externalIds = jobs.map((j) => j.external_id);
    expect(externalIds).toContain('ashby-uuid-1001');
    expect(externalIds).toContain('ashby-uuid-1004');
  });
});

// ─── fetchAshbyJobs() — pagination ───────────────────────────────────────────

describe('fetchAshbyJobs() — pagination', () => {
  it('fetches the next page when nextCursor is present', async () => {
    const page2Job: AshbyJob = {
      ...remoteJob,
      id: 'ashby-uuid-page2',
      title: 'Senior Engineering Manager',
    };
    let callCount = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      callCount++;
      const body = JSON.parse((init?.body as string) ?? '{}') as { cursor?: string };
      const hasCursor = !!body.cursor;
      const jobs = hasCursor ? [page2Job] : [remoteJob];
      return {
        ok: true,
        json: async () => makePage(jobs, hasCursor ? null : 'cursor-token'),
      } as Response;
    });

    const jobs = await fetchAshbyJobs(['acme']);
    expect(callCount).toBe(2);
    expect(jobs).toHaveLength(2);
    const ids = jobs.map((j) => j.external_id);
    expect(ids).toContain('ashby-uuid-1001');
    expect(ids).toContain('ashby-uuid-page2');
  });

  it('stops fetching when nextCursor is null', async () => {
    const spy = mockFetch({ acme: makePage([remoteJob], null) });
    await fetchAshbyJobs(['acme']);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('sends the cursor from the previous page on the next request', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? '{}') as { cursor?: string };
      const hasCursor = !!body.cursor;
      return {
        ok: true,
        json: async () => makePage([], hasCursor ? null : 'next-cursor'),
      } as Response;
    });

    await fetchAshbyJobs(['acme']);
    expect(spy).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(
      (spy.mock.calls[1][1]?.body as string) ?? '{}',
    ) as { cursor?: string };
    expect(secondBody.cursor).toBe('next-cursor');
  });
});

// ─── fetchAshbyJobs() — request shape ────────────────────────────────────────

describe('fetchAshbyJobs() — request shape', () => {
  it('sends a POST request to the Ashby job board endpoint', async () => {
    const spy = mockFetch({ acme: makePage([]) });
    await fetchAshbyJobs(['acme']);
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain('api.ashbyhq.com/posting-api/job-board');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('sends Content-Type: application/json header', async () => {
    const spy = mockFetch({ acme: makePage([]) });
    await fetchAshbyJobs(['acme']);
    const [, init] = spy.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      'Content-Type': 'application/json',
    });
  });

  it('sends jobBoardName in the request body', async () => {
    const spy = mockFetch({ acme: makePage([]) });
    await fetchAshbyJobs(['acme']);
    const [, init] = spy.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string) as Record<string, string>;
    expect(body.jobBoardName).toBe('acme');
  });

  it('uses separate requests per company', async () => {
    const spy = mockFetch({ acme: makePage([]), notion: makePage([]) });
    await fetchAshbyJobs(['acme', 'notion']);
    const bodies = spy.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string) as { jobBoardName: string },
    );
    expect(bodies.some((b) => b.jobBoardName === 'acme')).toBe(true);
    expect(bodies.some((b) => b.jobBoardName === 'notion')).toBe(true);
  });
});

// ─── fetchAshbyJobs() — error handling ───────────────────────────────────────

describe('fetchAshbyJobs() — error handling', () => {
  it('returns empty array (does not throw) when a single company returns non-ok response', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);
    const jobs = await fetchAshbyJobs(['unknown-company']);
    expect(jobs).toHaveLength(0);
  });

  it('logs a warning with the board name when API returns non-ok response', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);
    await fetchAshbyJobs(['acme']);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('acme'));
  });

  it('returns empty array (does not throw) when fetch itself throws (network failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array and logs warning when response jobs field is missing', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array and logs warning when response jobs field is null', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ jobs: null }),
    } as Response);
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('returns results from successful companies when one company fails (partial failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockImplementation(async (_url, init) => {
      const body = JSON.parse((init?.body as string) ?? '{}') as { jobBoardName?: string };
      if (body.jobBoardName === 'broken') {
        return { ok: false, status: 500, statusText: 'Internal Server Error' } as Response;
      }
      return {
        ok: true,
        json: async () => makePage([remoteJob]),
      } as Response;
    });
    const jobs = await fetchAshbyJobs(['acme', 'broken']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('acme');
  });

  it('skips elements with missing jobUrl without throwing TypeError', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const noUrlJob = { ...remoteJob, id: 'ashby-no-url', jobUrl: undefined };
    mockFetch({ acme: { jobs: [noUrlJob as unknown as AshbyJob, remoteJob] } });
    const jobs = await fetchAshbyJobs(['acme']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('ashby-uuid-1001');
  });
});
