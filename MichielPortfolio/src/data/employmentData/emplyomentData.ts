export interface IEmploymentData {
  employer: string;
  title: string;
  employmentStart: string;
  employmentEnd: string;
  details: string[];
}

export class LionBridgeEmploymentData implements IEmploymentData {
  employer: string = 'Lionbridge';
  title: string = 'Test Engineer';
  employmentStart: string = 'April 2007';
  employmentEnd: string = 'May 2011';
  details: string[] = [
    'Manual testing on a wide variety of products including mobile, web, hardware specifications, translations, etc.',
    'Performed contract work with HP, Microsoft, Palm, and many more.',
  ];
}

export class ScentsyEmploymentData implements IEmploymentData {
  employer: string = 'Scentsy, Inc (Corporate Office)';
  title: string = 'SDET III';
  employmentStart: string = 'May 2011';
  employmentEnd: string = 'April 2017';
  details: string[] = [
    'creating testing frameworks, creation and upkeep of tests, and devops responsibilities.',
    'Wrote production ready web services in .net core',
    'Triaged and fixed defects in production code',
    'Analyzed performance bottlenecks and proposed solutions',
  ];
}

export class RpsEmploymentData implements IEmploymentData {
  employer: string = 'Risk Placement Services';
  title: string = 'Senior SDET';
  employmentStart: string = 'April 2017';
  employmentEnd: string = 'PRESENT (Remote Position)';
  details: string[] = [
    'Writing automated tests in C# and Typescript',
    'Managing TeamCity and Octopus',
    'Automating Deployment Pipelines',
    'Automating installers and environment dependencies',
    'Promoting scrum best practices',
  ];
}
