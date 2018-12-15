export interface IEmploymentData {
  employer: string;
  title: string;
  employmentStart: string;
  employmentEnd: string;
  location: string;
  details: string[];
}

export class LionBridgeEmploymentData implements IEmploymentData {
  employer: string = 'Lionbridge';
  title: string = 'Test Engineer';
  employmentStart: string = 'April 2007';
  employmentEnd: string = 'May 2011';
  location: string = 'Boise, Idaho';
  details: string[] = [
    `In my time at Lionbridge, I was able to show competence and work my way into becoming a full time employee (FTE). ` +
      `This may not seem like a great feat, but there were very few FTE hired within the company and it was very difficult to become one.`,
    `During one contract in particular, we had a team of developers assigned to a project and I was assigned to a separate contract by myself, testing their software. ` +
      `The manager at the company liked my work so much, he kept my contract much longer than expected, even after cancelling the other development project.`,
    `Manual testing on a wide variety of products including mobile, web, hardware specifications, translations, etc.`,
    `Performed contract work with HP, Microsoft, Palm, and many more.`,
  ];
}

export class ScentsyEmploymentData implements IEmploymentData {
  employer: string = 'Scentsy, Inc (Corporate Office)';
  title: string = 'SDET III';
  employmentStart: string = 'May 2011';
  employmentEnd: string = 'April 2017';
  location: string = 'Boise, Idaho';
  details: string[] = [
    `When I started at Scentsy, I was a manual tester. I immediately began my journey to become an SDET and moved into the role rather quickly. ` +
      `What really shined was my ability to learn quickly and my unrelenting work ethic.`,
    `In time, I became the lead SDET for the IT department and ran many, very successful projects that increased quality across the organization. ` +
      `My favorite project was building a test dashboard using .net core and D3.js. I had no experience with these technologies when I started, but we ended the project with massive success. ` +
      `The dashboard showed the passing rate of all tests over time along with videos of the test executing. Users could also kick off any number of tests on demand and see the status in real time. ` +
      `We also added analytics and triage tools for the testing team.`,
    `When given the opportunity, I would pick up defects that happened to make it to production and fix them, as well as add unit/integration tests so they wouldn't happen again`,
    `I was an integral part of a team that oversaw the migration of our databases to the latest version of SQL server and helped implement clustering and failover functionality.`,
    `Worked closely with architecture to identify performance bottlenecks using New Relic and Dynatrace. This involved reproducing issues with load testing and writing detailed bug reports that called out specific lines of code to be fixed. ` +
      `Fixing these bottlenecks allowed us to increase the amount of traffic we could handle during flash sales, which drastically improved the earnings potential.`,
  ];
}

export class RpsEmploymentData implements IEmploymentData {
  employer: string = 'Risk Placement Services';
  title: string = 'Senior SDET';
  employmentStart: string = 'April 2017';
  employmentEnd: string = 'PRESENT';
  location: string = 'Remote Position';
  details: string[] = [
    `When I started at RPS, there was very little in the way of automated testing. Within my first month, I had established an automation framework and set it up within the delivery pipeline. ` +
      `With more confidence in the quality of code, I pushed for automatic deployments out to staging. This was a big deal because before this time, everything required user interaction and I am a champion for automation throughout the entire life cycle.`,
    `Drastically increased the quality of the websites that we offer by pushing testing into the entire delivery process. With these in place, the team was able to decrease time to production for our projects and make production deployments less of an event and more of a joy.`,
    `Standardized templates for projects inside of TeamCity. Part of this initiative was also to transform repositories so they are all structured the same. When you open a repository for an API, you can always expect to see the same patterns. ` +
      `The simplified process within TeamCity also changed from taking multiple hours to complete into a few minute process. With simplified setup, we saw a productivity increase within the project and release life cycle.`,
    `I also standardized deployments in Octopus by type of application. There were drastic decreases in the time required to set up deployments for a new micro service. Again, went from taking multiple hours to complete to just a few minutes. Since we create a lot of services, this has sped up development time drastically, which has increased the time to market for all projects.`,
    `There was traditionally very little done for the new hire process, but I was determined to change that. I authored a powershell script using Chocolatey that installed all of the software dependencies that a new developer would need. ` +
      `What this means for new developers, is that they can now hit the ground running when they start and not spend the first few days installing the necessary software. It can also be run to update existing software, which reduces developer downtime while enabling them to keep their software up to date.`,
    `In my time here, I have also been promoting scrum best practices. I have championed for many iterative changes that have drastically changed the landscape of our development process. We have switched from sprints to kanban and have seen a very large increase in productivity. ` +
      `Stakeholders have commented that they feel like the department is much more responsive to their needs and are more engaged with the development process. The IT department doesn't have the best reputation and I am working hard to help improve that image and repair relationships.`,
    `To keep my other skills sharp, I also practice by taking tickets from the top of the backlog to work as a developer. I believe it is important to step out of your comfort zone periodically as it is the best way to personally grow.`,
  ];
}
