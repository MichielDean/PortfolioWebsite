import { WorkHistory } from "../data/profileData";

export const calculateYears = (durationString: string): number => {
  const [startDate, endDate] = durationString.split(' - ');
  const start = new Date(startDate);
  const end = endDate === 'Present' ? new Date() : new Date(endDate);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  
  return years;
};

const roundToHalf = (num: number): number => {
  return Math.round(num * 2) / 2;
};

export const formatDuration = (years: number): string => {
  if (years < 1) {
    const months = Math.round(years * 12);
    return `${months} month${months === 1 ? '' : 's'}`;
  }
  return `${roundToHalf(years)} year${roundToHalf(years) === 1 ? '' : 's'}`;
};

export const calculateTotalYearsOfExperience = (workHistory: WorkHistory[]): string => {
  const totalYears = workHistory.reduce((acc, work) => {
    return acc + calculateYears(work.duration);
  }, 0);
  
  const roundedYears = roundToHalf(totalYears);
  return formatDuration(roundedYears);
};

export const calculateCompanyTotalYears = (positions: WorkHistory[]): string => {
  const totalYears = positions.reduce((acc, position) => {
    return acc + calculateYears(position.duration);
  }, 0);
  
  return formatDuration(roundToHalf(totalYears));
};

export const calculateYearsInIndustry = (workHistory: WorkHistory[]): number => {
  if (workHistory.length === 0) return 0;
  
  // Find the earliest start date
  const earliestStart = workHistory.reduce((earliest, work) => {
    const startDate = new Date(work.duration.split(' - ')[0]);
    return startDate < earliest ? startDate : earliest;
  }, new Date(workHistory[0].duration.split(' - ')[0]));
  
  const now = new Date();
  const diffTime = now.getTime() - earliestStart.getTime();
  const years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
  
  return Math.floor(years);
};
