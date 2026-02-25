/**
 * Tests for profileDataAdapter
 * Covers: getProfileForResume() with mocked fs + profileData,
 * calculateYearsOfExperience (via getProfileForResume), getProfileAsText()
 */

import * as fs from 'fs';

// Mock fs before any imports that use it
jest.mock('fs');

// Mock profileData — the actual module uses import from '../../data/profileData.js'
// With the .js→no-extension moduleNameMapper, this resolves to profileData.ts
jest.mock('../../data/profileData', () => ({
  profileData: {
    linkedin: 'https://linkedin.com/in/testuser',
    github: 'https://github.com/testuser',
    workHistory: [
      {
        company: 'Test Corp',
        role: 'Senior Engineer',
        duration: 'January 2020 - Present',
        description: [
          { moreInfo: ['Built the thing', 'Fixed the other thing'] },
        ],
      },
      {
        company: 'Old Corp',
        role: 'Junior Developer',
        duration: 'January 2007 - December 2019',
        description: [
          { moreInfo: ['Wrote tests', 'Deployed code'] },
        ],
      },
    ],
  },
}));

import { getProfileForResume, getProfileAsText, SimpleProfile } from '../../resume/services/profileDataAdapter';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validContact = {
  name: 'Hank Hill',
  email: 'hank@strickland.com',
  phone: '555-0100',
  location: 'Arlen, TX',
  website: 'https://hankhill.dev',
};

// Freeze time: January 1, 2026
// January 2007 start → ~19 years of experience
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
});

afterAll(() => {
  jest.useRealTimers();
});

function mockFsWithContact(contact: object) {
  (fs.existsSync as jest.Mock).mockReturnValue(true);
  (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(contact));
}

// ─── getProfileForResume() — contact.json errors ──────────────────────────────

describe('getProfileForResume() — contact.json errors', () => {
  it('throws descriptive error when contact.json does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    expect(() => getProfileForResume()).toThrow('contact.json not found');
  });

  it('throws error listing missing fields when contact.json is incomplete', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ name: 'Hank' }));
    expect(() => getProfileForResume()).toThrow(/missing required fields/i);
  });

  it('error message mentions at least one missing field name', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({ name: 'Hank' }));
    try {
      getProfileForResume();
    } catch (e: unknown) {
      expect((e as Error).message).toMatch(/email|phone|location|website/);
    }
  });
});

// ─── getProfileForResume() — happy path ──────────────────────────────────────

describe('getProfileForResume() — happy path', () => {
  beforeEach(() => mockFsWithContact(validContact));

  it('returns an object with all SimpleProfile fields', () => {
    const profile = getProfileForResume();
    const requiredFields: (keyof SimpleProfile)[] = [
      'name', 'email', 'phone', 'location',
      'linkedin', 'github', 'website', 'summary', 'workHistory',
    ];
    requiredFields.forEach(field => {
      expect(profile).toHaveProperty(field);
    });
  });

  it('returns correct name from contact.json', () => {
    expect(getProfileForResume().name).toBe('Hank Hill');
  });

  it('returns correct email from contact.json', () => {
    expect(getProfileForResume().email).toBe('hank@strickland.com');
  });

  it('returns linkedin from profileData fallback', () => {
    expect(getProfileForResume().linkedin).toBe('https://linkedin.com/in/testuser');
  });

  it('returns github from profileData fallback', () => {
    expect(getProfileForResume().github).toBe('https://github.com/testuser');
  });

  it('returns 2 work history entries matching mock data', () => {
    const profile = getProfileForResume();
    expect(profile.workHistory).toHaveLength(2);
    expect(profile.workHistory[0].company).toBe('Test Corp');
    expect(profile.workHistory[1].company).toBe('Old Corp');
  });

  it('flattens nested description.moreInfo arrays into flat achievements', () => {
    const profile = getProfileForResume();
    const firstJob = profile.workHistory[0];
    expect(firstJob.achievements).toContain('Built the thing');
    expect(firstJob.achievements).toContain('Fixed the other thing');
    expect(Array.isArray(firstJob.achievements)).toBe(true);
  });

  it('summary contains years of experience as a number', () => {
    const profile = getProfileForResume();
    // With frozen time at 2026-01-01 and start date Jan 2007 → ~19 years
    expect(profile.summary).toMatch(/\d+\+?\s*years/i);
  });
});

// ─── calculateYearsOfExperience (tested via getProfileForResume) ─────────────

describe('calculateYearsOfExperience — via getProfileForResume()', () => {
  beforeEach(() => mockFsWithContact(validContact));

  it('calculates ~19 years from January 2007 with time frozen at 2026-01-01', () => {
    // The summary includes the years value — extract it
    const profile = getProfileForResume();
    const match = profile.summary.match(/(\d+)\+?\s*years/i);
    expect(match).not.toBeNull();
    const years = parseInt(match![1]);
    // Jan 2007 to Jan 2026 = 19 years exactly
    expect(years).toBeGreaterThanOrEqual(18);
    expect(years).toBeLessThanOrEqual(20);
  });

  it('produces a different (higher) year count than if work history started in 2015', () => {
    // Verify that earliest date across multiple entries is used
    // Our fixture has Jan 2007 — earlier than Jan 2020 — so count should reflect 2007
    const profile = getProfileForResume();
    const match = profile.summary.match(/(\d+)\+?\s*years/i);
    const years = parseInt(match![1]);
    // If only the 2020 entry was used, years would be ~6; should be ~19
    expect(years).toBeGreaterThan(10);
  });
});

// ─── getProfileAsText() ──────────────────────────────────────────────────────

describe('getProfileAsText()', () => {
  beforeEach(() => mockFsWithContact(validContact));

  it('returns a non-empty string', () => {
    const text = getProfileAsText();
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('contains the candidate name', () => {
    expect(getProfileAsText()).toContain('Hank Hill');
  });

  it('contains a Work History section header', () => {
    expect(getProfileAsText()).toMatch(/work history/i);
  });

  it('contains each company name', () => {
    const text = getProfileAsText();
    expect(text).toContain('Test Corp');
    expect(text).toContain('Old Corp');
  });

  it('contains email', () => {
    expect(getProfileAsText()).toContain('hank@strickland.com');
  });
});
