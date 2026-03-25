/**
 * Tests for the TheirStack API client.
 *
 * All HTTP calls are intercepted with jest.spyOn(global, 'fetch') so tests
 * are fast, deterministic, and make no real network requests.
 *
 * Structure follows Given / When / Then thinking:
 *   Given: THEIRSTACK_API_KEY env var set (or not), fetch mocked to return a
 *          specific payload
 *   When:  fetchTheirStackJobs() is called
 *   Then:  the returned array of JobInput values and the outgoing request match
 *          expectations
 */

import { fetchTheirStackJobs, normalizeJob, MAX_PAGES } from '../../job-hunter/sources/theirstack';
import type { TheirStackJob } from '../../job-hunter/sources/theirstack';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(pages: object[]): jest.SpyInstance {
  let callIndex = 0;
  return jest.spyOn(global, 'fetch').mockImplementation(async () => {
    const payload = pages[callIndex++];
    return {
      ok: true,
      json: async () => payload,
    } as Response;
  });
}

function makePage(jobs: TheirStackJob[], page: number, totalPages: number): object {
  return {
    data: jobs,
    metadata: { total_results: jobs.length * totalPages, page, total_pages: totalPages },
  };
}

const jobA: TheirStackJob = {
  id: 101,
  job_title: 'Director of Engineering',
  company_name: 'Acme Corp',
  url: 'https://acme.com/jobs/101',
  min_annual_salary: 180000,
  max_annual_salary: 250000,
  date_posted: '2025-03-24',
};

const jobB: TheirStackJob = {
  id: 202,
  job_title: 'VP of Engineering',
  company_name: 'Globex',
  url: 'https://globex.com/jobs/202',
  min_annual_salary: null,
  max_annual_salary: null,
  date_posted: null,
};

// ─── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  process.env.THEIRSTACK_API_KEY = 'test-api-key';
});

afterEach(() => {
  delete process.env.THEIRSTACK_API_KEY;
  jest.restoreAllMocks();
});

// ─── fetchTheirStackJobs() — missing API key ──────────────────────────────────

describe('fetchTheirStackJobs() — missing API key', () => {
  it('throws when THEIRSTACK_API_KEY is not set', async () => {
    delete process.env.THEIRSTACK_API_KEY;
    await expect(fetchTheirStackJobs()).rejects.toThrow('THEIRSTACK_API_KEY');
  });
});

// ─── fetchTheirStackJobs() — single page ─────────────────────────────────────

describe('fetchTheirStackJobs() — single page', () => {
  it('returns normalized jobs from a single-page response', async () => {
    mockFetch([makePage([jobA, jobB], 0, 1)]);
    const jobs = await fetchTheirStackJobs();
    expect(jobs).toHaveLength(2);
  });

  it('returns empty array when data is empty', async () => {
    mockFetch([makePage([], 0, 1)]);
    const jobs = await fetchTheirStackJobs();
    expect(jobs).toHaveLength(0);
  });

  it('makes exactly one fetch call for a single-page response', async () => {
    const spy = mockFetch([makePage([jobA], 0, 1)]);
    await fetchTheirStackJobs();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ─── fetchTheirStackJobs() — pagination ──────────────────────────────────────

describe('fetchTheirStackJobs() — pagination', () => {
  it('fetches all pages when total_pages > 1', async () => {
    const spy = mockFetch([
      makePage([jobA], 0, 2),
      makePage([jobB], 1, 2),
    ]);
    const jobs = await fetchTheirStackJobs();
    expect(spy).toHaveBeenCalledTimes(2);
    expect(jobs).toHaveLength(2);
  });

  it('sends incrementing page numbers across paginated requests', async () => {
    const spy = mockFetch([
      makePage([jobA], 0, 3),
      makePage([jobB], 1, 3),
      makePage([jobA], 2, 3),
    ]);
    await fetchTheirStackJobs();
    const bodies = spy.mock.calls.map(([, init]) =>
      JSON.parse((init as RequestInit).body as string),
    );
    expect(bodies[0].page).toBe(0);
    expect(bodies[1].page).toBe(1);
    expect(bodies[2].page).toBe(2);
  });

  it('concatenates jobs from all pages into a single array', async () => {
    mockFetch([
      makePage([jobA], 0, 2),
      makePage([jobB], 1, 2),
    ]);
    const jobs = await fetchTheirStackJobs();
    const externalIds = jobs.map((j) => j.external_id);
    expect(externalIds).toContain('101');
    expect(externalIds).toContain('202');
  });
});

// ─── fetchTheirStackJobs() — request shape ───────────────────────────────────

describe('fetchTheirStackJobs() — request shape', () => {
  it('sends a POST request to the TheirStack jobs search endpoint', async () => {
    const spy = mockFetch([makePage([], 0, 1)]);
    await fetchTheirStackJobs();
    const [url, init] = spy.mock.calls[0];
    expect(String(url)).toContain('theirstack.com');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('sends Authorization: Bearer header with the API key', async () => {
    const spy = mockFetch([makePage([], 0, 1)]);
    await fetchTheirStackJobs();
    const headers = (spy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-api-key');
  });

  it('sends job_title_or containing the four target titles', async () => {
    const spy = mockFetch([makePage([], 0, 1)]);
    await fetchTheirStackJobs();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.job_title_or).toContain('Director of Engineering');
    expect(body.job_title_or).toContain('Senior Engineering Manager');
    expect(body.job_title_or).toContain('VP of Engineering');
    expect(body.job_title_or).toContain('VP of QA');
  });

  it('sends remote=true in request body', async () => {
    const spy = mockFetch([makePage([], 0, 1)]);
    await fetchTheirStackJobs();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.remote).toBe(true);
  });

  it('sends posted_at_max_age_days=1 in request body', async () => {
    const spy = mockFetch([makePage([], 0, 1)]);
    await fetchTheirStackJobs();
    const body = JSON.parse((spy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.posted_at_max_age_days).toBe(1);
  });
});

// ─── fetchTheirStackJobs() — error handling ──────────────────────────────────

describe('fetchTheirStackJobs() — error handling', () => {
  it('throws when the API returns a non-ok response', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);
    await expect(fetchTheirStackJobs()).rejects.toThrow('TheirStack API error');
  });

  it('throws when fetch itself throws (network failure)', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    await expect(fetchTheirStackJobs()).rejects.toThrow('Network error');
  });
});

// ─── normalizeJob() — field mapping ──────────────────────────────────────────

describe('normalizeJob() — field mapping', () => {
  it('sets source to "theirstack"', () => {
    expect(normalizeJob(jobA).source).toBe('theirstack');
  });

  it('sets ats_type to "unknown"', () => {
    expect(normalizeJob(jobA).ats_type).toBe('unknown');
  });

  it('converts numeric id to string for external_id', () => {
    expect(normalizeJob(jobA).external_id).toBe('101');
  });

  it('maps job_title to title', () => {
    expect(normalizeJob(jobA).title).toBe('Director of Engineering');
  });

  it('maps company_name to company', () => {
    expect(normalizeJob(jobA).company).toBe('Acme Corp');
  });

  it('maps url to url', () => {
    expect(normalizeJob(jobA).url).toBe('https://acme.com/jobs/101');
  });

  it('maps date_posted to posted_at', () => {
    expect(normalizeJob(jobA).posted_at).toBe('2025-03-24');
  });

  it('sets posted_at to null when date_posted is null', () => {
    expect(normalizeJob(jobB).posted_at).toBeNull();
  });
});

// ─── fetchTheirStackJobs() — pagination safety guard ─────────────────────────

describe('fetchTheirStackJobs() — pagination safety guard', () => {
  it('stops fetching at MAX_PAGES even when total_pages is much larger', async () => {
    const bigTotal = MAX_PAGES + 100;
    const pages = Array.from({ length: MAX_PAGES }, (_, i) =>
      makePage([jobA], i, bigTotal),
    );
    const spy = mockFetch(pages);
    await fetchTheirStackJobs();
    expect(spy).toHaveBeenCalledTimes(MAX_PAGES);
  });

  it('logs a warning when pagination is truncated at MAX_PAGES', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const bigTotal = MAX_PAGES + 100;
    const pages = Array.from({ length: MAX_PAGES }, (_, i) =>
      makePage([jobA], i, bigTotal),
    );
    mockFetch(pages);
    await fetchTheirStackJobs();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('TheirStack'),
    );
    warnSpy.mockRestore();
  });

  it('does not log a warning when all pages are within MAX_PAGES', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockFetch([makePage([jobA], 0, 1)]);
    await fetchTheirStackJobs();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ─── fetchTheirStackJobs() — response shape validation ───────────────────────

describe('fetchTheirStackJobs() — response shape validation', () => {
  it('throws a descriptive error when response data field is missing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ metadata: { total_pages: 1 } }),
    } as Response);
    await expect(fetchTheirStackJobs()).rejects.toThrow('Unexpected TheirStack response shape');
  });

  it('throws a descriptive error when response data field is null', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: null, metadata: { total_pages: 1 } }),
    } as Response);
    await expect(fetchTheirStackJobs()).rejects.toThrow('Unexpected TheirStack response shape');
  });

  it('throws a descriptive error when metadata is missing', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);
    await expect(fetchTheirStackJobs()).rejects.toThrow('Unexpected TheirStack response shape');
  });

  it('throws a descriptive error when metadata.total_pages is not a number', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], metadata: { total_pages: 'five' } }),
    } as Response);
    await expect(fetchTheirStackJobs()).rejects.toThrow('Unexpected TheirStack response shape');
  });
});

// ─── normalizeJob() — salary normalization ───────────────────────────────────

describe('normalizeJob() — salary normalization', () => {
  it('formats salary_raw as "min-max" when both are present', () => {
    expect(normalizeJob(jobA).salary_raw).toBe('180000-250000');
  });

  it('formats salary_raw as "min" string when only min is present', () => {
    const job: TheirStackJob = { ...jobA, min_annual_salary: 150000, max_annual_salary: null };
    expect(normalizeJob(job).salary_raw).toBe('150000');
  });

  it('formats salary_raw as "max" string when only max is present', () => {
    const job: TheirStackJob = { ...jobA, min_annual_salary: null, max_annual_salary: 200000 };
    expect(normalizeJob(job).salary_raw).toBe('200000');
  });

  it('sets salary_raw to null when both min and max are null', () => {
    expect(normalizeJob(jobB).salary_raw).toBeNull();
  });

  it('sets salary_raw to null when salary fields are absent', () => {
    const job: TheirStackJob = {
      id: 999,
      job_title: 'VP of QA',
      company_name: 'Initech',
      url: 'https://initech.com/jobs/999',
    };
    expect(normalizeJob(job).salary_raw).toBeNull();
  });
});
