/**
 * Tests for the Lever API client.
 *
 * All HTTP calls are intercepted with jest.spyOn(global, 'fetch') so tests
 * are fast, deterministic, and make no real network requests.
 *
 * Structure follows Given / When / Then thinking:
 *   Given: fetch mocked to return a specific Lever API payload
 *   When:  fetchLeverJobs() is called with an explicit watchlist
 *   Then:  the returned JobInput array matches expectations
 */

import {
  fetchLeverJobs,
  isRemote,
  isValidLeverJobShape,
  matchesTargetRole,
  normalizeJob,
} from '../../job-hunter/sources/lever';
import type { LeverApiPage, LeverJob } from '../../job-hunter/sources/lever';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(responses: Record<string, LeverApiPage>): jest.SpyInstance {
  return jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
    const company = String(url).split('/postings/')[1]?.split('?')[0] ?? '';
    const payload = responses[company] ?? { data: [], hasNext: false };
    return {
      ok: true,
      json: async () => payload,
    } as Response;
  });
}

function makePage(jobs: LeverJob[], hasNext = false, next?: string): LeverApiPage {
  return { data: jobs, hasNext, next };
}

// ─── Test fixtures ────────────────────────────────────────────────────────────

const remoteJob: LeverJob = {
  id: 'uuid-1001',
  text: 'VP of Engineering',
  categories: { location: 'Remote', commitment: 'Full-time' },
  description: '<p>Join us remotely.</p>',
  hostedUrl: 'https://jobs.lever.co/acme/uuid-1001',
  createdAt: 1742428800000, // 2025-03-20T00:00:00.000Z
};

const onSiteJob: LeverJob = {
  id: 'uuid-1002',
  text: 'VP of Engineering',
  categories: { location: 'San Francisco, CA', commitment: 'Full-time' },
  description: '<p>Work in our SF office.</p>',
  hostedUrl: 'https://jobs.lever.co/acme/uuid-1002',
  createdAt: 1742428800000,
};

const irrelevantRemoteJob: LeverJob = {
  id: 'uuid-1003',
  text: 'Software Engineer',
  categories: { location: 'Remote' },
  description: '<p>Remote role.</p>',
  hostedUrl: 'https://jobs.lever.co/acme/uuid-1003',
  createdAt: 1742428800000,
};

const remoteInDescriptionJob: LeverJob = {
  id: 'uuid-1004',
  text: 'Director of Engineering',
  categories: { location: 'New York, NY' },
  description: '<p>This is a remote-friendly role.</p>',
  hostedUrl: 'https://jobs.lever.co/notion/uuid-1004',
  createdAt: 1742515200000, // 2025-03-21T00:00:00.000Z
};

const jobWithSalary: LeverJob = {
  id: 'uuid-2001',
  text: 'VP of Engineering',
  categories: { location: 'Remote' },
  description: '<p>Remote leadership role.</p>',
  lists: [
    { text: 'Requirements', content: '<li>5+ years experience</li>' },
    { text: 'Compensation', content: '$200,000 - $250,000' },
  ],
  hostedUrl: 'https://jobs.lever.co/globex/uuid-2001',
  createdAt: 1742428800000,
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
  it('returns true when categories.location is "Remote"', () => {
    expect(isRemote(remoteJob)).toBe(true);
  });

  it('returns true when categories.location contains "Remote" in a compound string', () => {
    expect(
      isRemote({ categories: { location: 'Remote - US' }, description: '' }),
    ).toBe(true);
  });

  it('returns false when location is on-site and description has no remote mention', () => {
    expect(isRemote(onSiteJob)).toBe(false);
  });

  it('returns true when description contains "remote" even if location is on-site', () => {
    expect(isRemote(remoteInDescriptionJob)).toBe(true);
  });

  it('matches "remote" case-insensitively in location', () => {
    expect(
      isRemote({ categories: { location: 'REMOTE' }, description: '' }),
    ).toBe(true);
  });

  it('matches "remote" case-insensitively in description', () => {
    expect(
      isRemote({ categories: { location: 'Austin, TX' }, description: 'REMOTE-FRIENDLY' }),
    ).toBe(true);
  });

  it('returns false when categories.location is absent and description has no remote mention', () => {
    expect(
      isRemote({ categories: {}, description: 'Great on-site opportunity.' }),
    ).toBe(false);
  });
});

// ─── isValidLeverJobShape() ───────────────────────────────────────────────────

describe('isValidLeverJobShape()', () => {
  it('returns true for a well-formed job object', () => {
    expect(isValidLeverJobShape(remoteJob)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidLeverJobShape(null)).toBe(false);
  });

  it('returns false for a non-object', () => {
    expect(isValidLeverJobShape('string')).toBe(false);
  });

  it('returns false when id is missing', () => {
    const { id: _id, ...noId } = remoteJob;
    expect(isValidLeverJobShape(noId)).toBe(false);
  });

  it('returns false when text is missing', () => {
    const { text: _text, ...noText } = remoteJob;
    expect(isValidLeverJobShape(noText)).toBe(false);
  });

  it('returns false when hostedUrl is missing', () => {
    const { hostedUrl: _url, ...noUrl } = remoteJob;
    expect(isValidLeverJobShape(noUrl)).toBe(false);
  });

  it('returns false when categories is null', () => {
    expect(isValidLeverJobShape({ ...remoteJob, categories: null })).toBe(false);
  });
});

// ─── normalizeJob() — field mapping ──────────────────────────────────────────

describe('normalizeJob() — field mapping', () => {
  it('sets source to "lever"', () => {
    expect(normalizeJob(remoteJob, 'acme').source).toBe('lever');
  });

  it('sets ats_type to "lever"', () => {
    expect(normalizeJob(remoteJob, 'acme').ats_type).toBe('lever');
  });

  it('uses the posting id string as external_id', () => {
    expect(normalizeJob(remoteJob, 'acme').external_id).toBe('uuid-1001');
  });

  it('maps text to title', () => {
    expect(normalizeJob(remoteJob, 'acme').title).toBe('VP of Engineering');
  });

  it('uses the provided company argument for company', () => {
    expect(normalizeJob(remoteJob, 'acme').company).toBe('acme');
  });

  it('maps hostedUrl to url', () => {
    expect(normalizeJob(remoteJob, 'acme').url).toBe(
      'https://jobs.lever.co/acme/uuid-1001',
    );
  });

  it('converts createdAt Unix ms timestamp to ISO string for posted_at', () => {
    expect(normalizeJob(remoteJob, 'acme').posted_at).toBe(
      new Date(1742428800000).toISOString(),
    );
  });

  it('sets salary_raw to null when no lists field is present', () => {
    expect(normalizeJob(remoteJob, 'acme').salary_raw).toBeNull();
  });

  it('sets salary_raw to null when lists has no salary/compensation/pay item', () => {
    const jobWithLists: LeverJob = {
      ...remoteJob,
      lists: [{ text: 'Requirements', content: 'Some requirements' }],
    };
    expect(normalizeJob(jobWithLists, 'acme').salary_raw).toBeNull();
  });

  it('extracts salary_raw from a "Compensation" list item', () => {
    expect(normalizeJob(jobWithSalary, 'globex').salary_raw).toBe(
      '$200,000 - $250,000',
    );
  });

  it('extracts salary_raw from a "Salary" list item', () => {
    const jobWithSalaryList: LeverJob = {
      ...remoteJob,
      lists: [{ text: 'Salary', content: '$180k+' }],
    };
    expect(normalizeJob(jobWithSalaryList, 'acme').salary_raw).toBe('$180k+');
  });

  it('extracts salary_raw from a "Pay" list item', () => {
    const jobWithPayList: LeverJob = {
      ...remoteJob,
      lists: [{ text: 'Pay range', content: '$150k-$200k' }],
    };
    expect(normalizeJob(jobWithPayList, 'acme').salary_raw).toBe('$150k-$200k');
  });
});

// ─── fetchLeverJobs() — filtering ────────────────────────────────────────────

describe('fetchLeverJobs() — filtering', () => {
  it('returns only jobs matching target role AND remote', async () => {
    mockFetch({ acme: makePage([remoteJob, onSiteJob, irrelevantRemoteJob]) });
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('uuid-1001');
  });

  it('excludes on-site jobs even when title matches', async () => {
    mockFetch({ acme: makePage([onSiteJob]) });
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('excludes jobs with irrelevant titles even when remote', async () => {
    mockFetch({ acme: makePage([irrelevantRemoteJob]) });
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('detects remote from description when location does not mention remote', async () => {
    mockFetch({ notion: makePage([remoteInDescriptionJob]) });
    const jobs = await fetchLeverJobs(['notion']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('uuid-1004');
  });
});

// ─── fetchLeverJobs() — multi-company ────────────────────────────────────────

describe('fetchLeverJobs() — multi-company', () => {
  it('fetches jobs from all companies in the watchlist', async () => {
    const spy = mockFetch({
      acme: makePage([remoteJob]),
      notion: makePage([remoteInDescriptionJob]),
    });
    const jobs = await fetchLeverJobs(['acme', 'notion']);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(2);
  });

  it('tags each job with its company slug as the company', async () => {
    mockFetch({
      acme: makePage([remoteJob]),
      notion: makePage([remoteInDescriptionJob]),
    });
    const jobs = await fetchLeverJobs(['acme', 'notion']);
    const companies = jobs.map((j) => j.company);
    expect(companies).toContain('acme');
    expect(companies).toContain('notion');
  });

  it('returns empty array when watchlist is empty', async () => {
    const spy = mockFetch({});
    const jobs = await fetchLeverJobs([]);
    expect(spy).not.toHaveBeenCalled();
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array when no company has matching jobs', async () => {
    mockFetch({ acme: makePage([onSiteJob, irrelevantRemoteJob]) });
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('concatenates jobs from multiple companies into a single array', async () => {
    mockFetch({
      acme: makePage([remoteJob]),
      notion: makePage([remoteInDescriptionJob]),
    });
    const jobs = await fetchLeverJobs(['acme', 'notion']);
    const externalIds = jobs.map((j) => j.external_id);
    expect(externalIds).toContain('uuid-1001');
    expect(externalIds).toContain('uuid-1004');
  });
});

// ─── fetchLeverJobs() — pagination ───────────────────────────────────────────

describe('fetchLeverJobs() — pagination', () => {
  it('fetches the next page when hasNext is true', async () => {
    const page2Job: LeverJob = {
      ...remoteJob,
      id: 'uuid-page2',
      text: 'Senior Engineering Manager',
    };
    let callCount = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      callCount++;
      const hasOffset = String(url).includes('offset=');
      const jobs = hasOffset ? [page2Job] : [remoteJob];
      return {
        ok: true,
        json: async () => makePage(jobs, !hasOffset, hasOffset ? undefined : 'uuid-cursor'),
      } as Response;
    });

    const jobs = await fetchLeverJobs(['acme']);
    expect(callCount).toBe(2);
    expect(jobs).toHaveLength(2);
    const ids = jobs.map((j) => j.external_id);
    expect(ids).toContain('uuid-1001');
    expect(ids).toContain('uuid-page2');
  });

  it('stops fetching when hasNext is false', async () => {
    const spy = mockFetch({ acme: makePage([remoteJob], false) });
    await fetchLeverJobs(['acme']);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('breaks out of the pagination loop when hasNext is true but next cursor is absent', async () => {
    let callCount = 0;
    jest.spyOn(global, 'fetch').mockImplementation(async () => {
      callCount++;
      if (callCount > 2) throw new Error('Infinite loop detected: too many fetch calls');
      return {
        ok: true,
        json: async () => ({ data: [remoteJob], hasNext: true }),  // hasNext=true but no next cursor
      } as Response;
    });

    const jobs = await fetchLeverJobs(['acme']);

    // The loop must break after the first page — hasNext=true with no cursor is a broken API
    // response; continuing would re-fetch the same page forever.
    expect(callCount).toBe(1);
    expect(jobs).toHaveLength(1);
  });

  it('sends the cursor from the previous page as offset on the next request', async () => {
    const spy = jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const hasOffset = String(url).includes('offset=next-cursor');
      return {
        ok: true,
        json: async () => makePage([], !hasOffset, hasOffset ? undefined : 'next-cursor'),
      } as Response;
    });

    await fetchLeverJobs(['acme']);
    expect(spy).toHaveBeenCalledTimes(2);
    const secondUrl = String(spy.mock.calls[1][0]);
    expect(secondUrl).toContain('offset=next-cursor');
  });
});

// ─── fetchLeverJobs() — request shape ────────────────────────────────────────

describe('fetchLeverJobs() — request shape', () => {
  it('sends a request to the Lever postings endpoint with mode=json', async () => {
    const spy = mockFetch({ acme: makePage([]) });
    await fetchLeverJobs(['acme']);
    const [url] = spy.mock.calls[0];
    expect(String(url)).toContain('api.lever.co');
    expect(String(url)).toContain('/postings/acme');
    expect(String(url)).toContain('mode=json');
  });

  it('uses a separate URL per company', async () => {
    const spy = mockFetch({ acme: makePage([]), notion: makePage([]) });
    await fetchLeverJobs(['acme', 'notion']);
    const urls = spy.mock.calls.map(([url]) => String(url));
    expect(urls.some((u) => u.includes('/postings/acme'))).toBe(true);
    expect(urls.some((u) => u.includes('/postings/notion'))).toBe(true);
  });
});

// ─── fetchLeverJobs() — error handling ───────────────────────────────────────

describe('fetchLeverJobs() — error handling', () => {
  it('returns empty array (does not throw) when a single company returns non-ok response', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);
    const jobs = await fetchLeverJobs(['unknown-company']);
    expect(jobs).toHaveLength(0);
  });

  it('logs a warning with the company slug when API returns non-ok response', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
    } as Response);
    await fetchLeverJobs(['acme']);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('acme'));
  });

  it('returns empty array (does not throw) when fetch itself throws (network failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array and logs warning when response data field is missing', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('returns empty array and logs warning when response data field is null', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: null, hasNext: false }),
    } as Response);
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(0);
  });

  it('returns results from successful companies when one company fails (partial failure)', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const company = String(url).split('/postings/')[1]?.split('?')[0] ?? '';
      if (company === 'broken') {
        return { ok: false, status: 500, statusText: 'Internal Server Error' } as Response;
      }
      return {
        ok: true,
        json: async () => makePage([remoteJob]),
      } as Response;
    });
    const jobs = await fetchLeverJobs(['acme', 'broken']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe('acme');
  });

  it('skips elements with null categories without throwing TypeError', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const nullCategoriesJob = { ...remoteJob, id: 'uuid-null-cat', categories: null };
    mockFetch({ acme: { data: [nullCategoriesJob as unknown as LeverJob, remoteJob], hasNext: false } });
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('uuid-1001');
  });

  it('skips elements with missing hostedUrl without throwing TypeError', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const noUrlJob = { ...remoteJob, id: 'uuid-no-url', hostedUrl: undefined };
    mockFetch({ acme: { data: [noUrlJob as unknown as LeverJob, remoteJob], hasNext: false } });
    const jobs = await fetchLeverJobs(['acme']);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].external_id).toBe('uuid-1001');
  });
});
