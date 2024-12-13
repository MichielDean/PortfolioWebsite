export interface WorkHistory {
  company: string;
  role: string;
  duration: string;
  description: Description[];
}

export interface Description {
  description: string;
  moreInfo: string[];
}

export interface Project {
  name: string;
  description: string;
  link: string;
}

export interface Profile {
  name: string;
  title: string;
  description: string;
  linkedin: string;
  github: string;
  stackOverflow: string;
  projects: Project[];
  workHistory: WorkHistory[];
}