import {
  calculateYears,
  formatDuration,
  calculateTotalYearsOfExperience,
  calculateCompanyTotalYears
} from '../../utils/dateUtils';
import { WorkHistory } from '../../data/profileData';

describe('dateUtils', () => {
  describe('calculateYears', () => {
    beforeEach(() => {
      // Mock the current date to ensure consistent test results
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-11-09'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('calculates years correctly for a complete year range', () => {
      const duration = 'Jan 2020 - Jan 2021';
      const years = calculateYears(duration);
      expect(years).toBeCloseTo(1, 1);
    });

    it('calculates years correctly for multi-year range', () => {
      const duration = 'Mar 2019 - Mar 2022';
      const years = calculateYears(duration);
      expect(years).toBeCloseTo(3, 1);
    });

    it('calculates years correctly for Present as end date', () => {
      const duration = 'Mar 2022 - Present';
      const years = calculateYears(duration);
      // From Mar 2022 to Nov 2025 is approximately 3.67 years
      expect(years).toBeGreaterThan(3);
      expect(years).toBeLessThan(4);
    });

    it('calculates years correctly for partial years', () => {
      const duration = 'Jan 2020 - Jul 2020';
      const years = calculateYears(duration);
      expect(years).toBeCloseTo(0.5, 1);
    });

    it('handles months correctly', () => {
      const duration = 'Jan 2020 - Apr 2020';
      const years = calculateYears(duration);
      expect(years).toBeCloseTo(0.25, 1);
    });
  });

  describe('formatDuration', () => {
    it('formats less than 1 year as months', () => {
      expect(formatDuration(0.5)).toBe('6 months');
    });

    it('formats 1 month correctly (singular)', () => {
      expect(formatDuration(0.083)).toBe('1 month');
    });

    it('formats multiple months correctly (plural)', () => {
      expect(formatDuration(0.25)).toBe('3 months');
      expect(formatDuration(0.75)).toBe('9 months');
    });

    it('formats exactly 1 year as singular', () => {
      expect(formatDuration(1)).toBe('1 year');
    });

    it('formats multiple years as plural', () => {
      expect(formatDuration(2)).toBe('2 years');
      expect(formatDuration(5)).toBe('5 years');
    });

    it('rounds to nearest half year', () => {
      expect(formatDuration(1.2)).toBe('1 year');
      expect(formatDuration(1.3)).toBe('1.5 years');
      expect(formatDuration(1.7)).toBe('1.5 years');
      expect(formatDuration(1.8)).toBe('2 years');
    });

    it('handles edge case of 0.5 years', () => {
      expect(formatDuration(0.5)).toBe('6 months');
    });

    it('handles decimal years correctly', () => {
      expect(formatDuration(2.25)).toBe('2.5 years');
      expect(formatDuration(2.5)).toBe('2.5 years');
      expect(formatDuration(2.75)).toBe('3 years');
    });
  });

  describe('calculateTotalYearsOfExperience', () => {
    const mockWorkHistory: WorkHistory[] = [
      {
        role: 'Senior Engineer',
        company: 'Tech Corp',
        duration: 'Jan 2020 - Jan 2022',
        description: []
      },
      {
        role: 'Junior Engineer',
        company: 'Startup Inc',
        duration: 'Jan 2018 - Jan 2020',
        description: []
      }
    ];

    it('calculates total years across all positions', () => {
      const total = calculateTotalYearsOfExperience(mockWorkHistory);
      // 2 years + 2 years = 4 years
      expect(total).toBe('4 years');
    });

    it('handles empty work history', () => {
      const total = calculateTotalYearsOfExperience([]);
      expect(total).toBe('0 months');
    });

    it('handles single position', () => {
      const singlePosition: WorkHistory[] = [
        {
          role: 'Engineer',
          company: 'Company',
          duration: 'Jan 2023 - Jul 2023',
          description: []
        }
      ];
      const total = calculateTotalYearsOfExperience(singlePosition);
      expect(total).toBe('6 months');
    });

    it('rounds total years to nearest half', () => {
      const mockHistory: WorkHistory[] = [
        {
          role: 'Role 1',
          company: 'Company',
          duration: 'Jan 2020 - May 2020', // ~4 months
          description: []
        },
        {
          role: 'Role 2',
          company: 'Company',
          duration: 'Jun 2020 - Oct 2020', // ~4 months
          description: []
        }
      ];
      const total = calculateTotalYearsOfExperience(mockHistory);
      // ~8 months should be rounded
      expect(total).toMatch(/month/);
    });
  });

  describe('calculateCompanyTotalYears', () => {
    const multiplePositions: WorkHistory[] = [
      {
        role: 'Senior Engineer',
        company: 'Tech Corp',
        duration: 'Jan 2022 - Jan 2023',
        description: []
      },
      {
        role: 'Engineer',
        company: 'Tech Corp',
        duration: 'Jan 2020 - Jan 2022',
        description: []
      }
    ];

    it('calculates total years for multiple positions at same company', () => {
      const total = calculateCompanyTotalYears(multiplePositions);
      // 1 year + 2 years = 3 years
      expect(total).toBe('3 years');
    });

    it('handles single position at company', () => {
      const singlePosition: WorkHistory[] = [
        {
          role: 'Engineer',
          company: 'Tech Corp',
          duration: 'Jan 2020 - Jan 2021',
          description: []
        }
      ];
      const total = calculateCompanyTotalYears(singlePosition);
      expect(total).toBe('1 year');
    });

    it('rounds to nearest half year', () => {
      const positions: WorkHistory[] = [
        {
          role: 'Senior',
          company: 'Company',
          duration: 'Jan 2020 - May 2021', // ~1.33 years
          description: []
        },
        {
          role: 'Junior',
          company: 'Company',
          duration: 'May 2021 - Oct 2021', // ~0.42 years
          description: []
        }
      ];
      const total = calculateCompanyTotalYears(positions);
      // ~1.75 years should round to 1.5 years
      expect(total).toBe('1.5 years');
    });

    it('formats months correctly for less than 1 year total', () => {
      const positions: WorkHistory[] = [
        {
          role: 'Intern',
          company: 'Company',
          duration: 'Jan 2020 - Apr 2020', // ~3 months
          description: []
        }
      ];
      const total = calculateCompanyTotalYears(positions);
      // Note: calculateYears returns years as decimal, ~0.25 years rounds to 0.5, 
      // which is 6 months
      expect(total).toMatch(/month/);
    });
  });
});
