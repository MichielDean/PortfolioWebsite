/**
 * Tests for the Greenhouse API client.
 *
 * All HTTP calls are intercepted with jest.spyOn(global, 'fetch') so tests
 * are fast, deterministic, and make no real network requests.
 *
 * Structure follows Given / When / Then thinking:
 *   Given: fetch mocked to return a specific Greenhouse API payload
 *   When:  fetchGreenhouseJobs() is called with an explicit watchlist
 *   Then:  the returned JobInput array matches expectations
 */

import {
  fetchGreenhouseJobs,
  isRemote,
  matchesTargetRole,
  normalizeJob,
} from '../../job-hunter/sources/greenhouse';
import type { GreenhouseJob } from '../../job-hunter/sources/greenhouse';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(responses: Record<string, object>): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
    const token = String(url).split('/boards/')[1]?.split('/')[0] ?? '';
    const payload = responses[token] ?? { jobs: [] };
    return {
      ok: true,
      json: async () => payload,
    } as Response;
  });
}

function makeResponse(jobs: GreenhouseJob[]): object {
  return { jobs };
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const remoteJob: GreenhouseJob = {
  id: 1001,
  title: 'VP of Engineering',
  location: { name: 'Remote' },
  content: '<p>Join us remotely.</p>',
  updated_at: '2025-03-20T00:00:00.000Z',
  absolute_url: 'https://boards.greenhouse.io/stripe/jobs/1001',
};

const onSiteJob: GreenhouseJob = {
  id: 1002,
  title: 'VP of Engineering',
  location: { name: 'San Francisco, CA' },
  content: '<p>Work in our SF office.</p>',
  updated_at: '2025-03-20T00:00:00.000Z',
  absolute_url: 'https://boards.greenhouse.io/stripe/jobs/1002',
};

const irrelevantRemoteJob: GreenhouseJob = {
  id: 1003,
  title: 'Software Engineer',
  location: { name: 'Remote' },
  content: '<p>Remote role.</p>',
  updated_at: '2025-03-20T00:00:00.000Z',
  absolute_url: 'https://boards.greenhouse.io/stripe/jobs/1003',
};

const remoteInContentJob: GreenhouseJob = {
  id: 1004,
  title: 'Director of Engineering',
  location: { name: 'New York, NY' },
  content: '<p>This is a remote-friendly role.</p>',
  updated_at: '2025-03-21T00:00:00.000Z',
  absolute_url: 'https://boards.greenhouse.io/notion/jobs/1004',
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

// ─── isRemote() ──────────────────────────────────────────────────────────────

describe('isRemote()', () => {
  it('returns true when location name is "Remote"', () => {
    expect(isRemote(remoteJob)).toBe(true);
  });

  it('returns true when location name contains "Remote" in a compound string', () => {
    expect(isRemote({ location: { name: 'Remote - US' }, content: '' })).toBe(true);
  });

  it('returns false when location is on-site and content has no remote mention', () => {
    expect(isRemote(onSiteJob)).toBe(false);
  });

  it('returns true when content contains "remote" even if location is on-site', () => {
    expect(
      isRemote({ location: { name: 'New York, NY' }, content: '<p>This role can be done remote.</p>' }),
    ).toBe(true);
  });

  it('matches "remote" case-insensitively in location', () => {
    expect(isRemote({ location: { name: 'REMOTE' }, content: '' })).toBe(true);
  });

  it('matches "remote" case-insensitively in content', () => {
    expect(isRemote({ location: { name: 'Austin, TX' }, content: 'REMOTE-FRIENDLY' })).toBe(true);
  });
});

// ─── normalizeJob() — field mapping ──────────────────────────────────────────

describe('normalizeJob() — field mapping', () => {
  it('sets source to "greenhouse"', () => {
    expect(normalizeJob(remoteJob, 'stripe').source).toBe('greenhouse');
  });

  it('sets ats_type to "greenhouse"', () => {
    expect(normalizeJob(remoteJob, 'stripe').ats_type).toBe('greenhouse');
  });

  it('converts numeric id to string for external_id', () => {
    expect(normalizeJob(remoteJob, 'stripe').external_id).toBe('1001');
  });

  it('maps title to title', () => {
    expect(normalizeJob(remoteJob, 'stripe').title).toBe('VP of Engineering');
  });

  it('uses the provided company argument for company', () => {
    expect(normalizeJob(remoteJob, 'stripe').company).toBe('stripe');
  });

  it('maps absolute_url to url', () => {
    expect(normalizeJob(remoteJob, 'stripe').url).toBe(
      'https://boards.greenhouse.io/stripe/jobs/1001',
    );
  });

  it('maps updated_at to posted_at', () => {
    expect(normalizeJob(remoteJob, 'stripe').posted_at).toBe('2025-03-20T00:00:00.000Z');
  });

  it('sets salary_raw to null', () => {
    expect(normalizeJob(remoteJob, 'stripe').salary_raw).toBeNull();
  });
});

// ─── fetchGreenhouseJobs() — filtering ───────────────────────────────────────

describe('fetchGreenhouseJobs() — filtering', () => {
  it('returns only jobs matching target role AND remote', async () => {
    mockFetch({ stripe: makeResponse([remoteJob, onSiteJob, irrelevantRemoteJob]) });
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('1001');
  });

  it('excludes on-site jobs even when title matches', async () => {
    mockFetch({ stripe: makeResponse([onSiteJob]) });
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(0);
  });

  it('excludes jobs with irrelevant titles even when remote', async () => {
    mockFetch({ stripe: makeResponse([irrelevantRemoteJob]) });
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(0);
  });

  it('detects remote from content when location does not mention remote', async () => {
    mockFetch({ notion: makeResponse([remoteInContentJob]) });
    const jobs = await fetchGreenhouseJobs(['notion']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('1004');
  });
});

// ─── fetchGreenhouseJobs() — multi-company ────────────────────────────────────

describe('fetchGreenhouseJobs() — multi-company', () => {
  it('fetches jobs from all companies in the watchlist', async () => {
    const spy = mockFetch({
      stripe: makeResponse([remoteJob]),
      notion: makeResponse([remoteInContentJob]),
    });
    const jobs = await fetchGreenhouseJobs(['stripe', 'notion']);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(2);
  });

  it('tags each job with its board token as the company', async () => {
    mockFetch({
      stripe: makeResponse([remoteJob]),
      notion: makeResponse([remoteInContentJob]),
    });
    const jobs = await fetchGreenhouseJobs(['stripe', 'notion']);
    const companies = jobs.map((j) => j.company);
    expect(companies).toContain('stripe');
    expect(companies).toContain('notion');
  });

  it('returns empty array when watchlist is empty', async () => {
    const spy = mockFetch({});
    const jobs = await fetchGreenhouseJobs([]);
    expect(spy).not.toHaveBeenCalled();
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array when no company has matching jobs', async () => {
    mockFetch({ stripe: makeResponse([onSiteJob, irrelevantRemoteJob]) });
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(0);
  });

  it('concatenates jobs from multiple companies into a single array', async () => {
    mockFetch({
      stripe: makeResponse([remoteJob]),
      notion: makeResponse([remoteInContentJob]),
    });
    const jobs = await fetchGreenhouseJobs(['stripe', 'notion']);
    const externalIds = jobs.map((j) => j.external_id);
    expect(externalIds).toContain('1001');
    expect(externalIds).toContain('1004');
  });
});

// ─── fetchGreenhouseJobs() — request shape ───────────────────────────────────

describe('fetchGreenhouseJobs() — request shape', () => {
  it('sends a GET request to the Greenhouse jobs endpoint with content=true', async () => {
    const spy = mockFetch({ stripe: makeResponse([]) });
    await fetchGreenhouseJobs(['stripe']);
    const [url] = spy.mock.calls[0];
    expect(String(url)).toContain('boards-api.greenhouse.io');
    expect(String(url)).toContain('/stripe/');
    expect(String(url)).toContain('content=true');
  });

  it('uses a separate URL per board token', async () => {
    const spy = mockFetch({ stripe: makeResponse([]), notion: makeResponse([]) });
    await fetchGreenhouseJobs(['stripe', 'notion']);
    const urls = spy.mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.includes('/stripe/'))).toBe(true);
    expect(urls.some((u) => u.includes('/notion/'))).toBe(true);
  });
});

// ─── fetchGreenhouseJobs() — error handling ──────────────────────────────────
//
// Per-company failures are now handled gracefully: the function logs a warning
// and continues to the next company rather than throwing.

describe('fetchGreenhouseJobs() — error handling', () => {
  it('returns empty array (does not throw) when a single company returns non-ok response', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);
    const jobs = await fetchGreenhouseJobs(['unknown-company']);
    expect(jobs).toHaveLength(0);
  });

  it('logs a warning with the board token when API returns non-ok response', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);
    await fetchGreenhouseJobs(['stripe']);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('stripe'));
  });

  it('returns empty array (does not throw) when fetch itself throws (network failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array and logs warning when response jobs field is missing', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array and logs warning when response jobs field is null', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ jobs: null }),
    } as Response);
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(0);
  });

  it('returns results from successful companies when one company fails (partial failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const token = String(url).split('/boards/')[1]?.split('/')[0] ?? '';
      if (token === 'broken') {
        return { ok: false, status: 500, statusText: 'Internal Server Error' } as Response;
      }
      return {
        ok: true,
        json: async () => makeResponse([remoteJob]),
      } as Response;
    });
    const jobs = await fetchGreenhouseJobs(['stripe', 'broken']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('stripe');
  });

  it('skips elements with null location without throwing TypeError', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nullLocationJob = { ...remoteJob, id: 9999, location: null };
    mockFetch({ stripe: { jobs: [nullLocationJob, remoteJob] } });
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('1001');
  });

  it('skips elements with undefined location without throwing TypeError', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const undefinedLocationJob = { ...remoteJob, id: 8888, location: undefined };
    mockFetch({ stripe: { jobs: [undefinedLocationJob, remoteJob] } });
    const jobs = await fetchGreenhouseJobs(['stripe']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('1001');
  });
});
