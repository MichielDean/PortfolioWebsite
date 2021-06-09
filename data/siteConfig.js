module.exports = {
  siteTitle: `Hello. I'm Michiel Bugher.`,
  siteDescription: `Portfolio Website`,
  keyWords: ['gatsbyjs', 'react', 'portfolio'],
  authorName: 'Michiel Bugher',
  githubUsername: 'MichielDean',
  authorAvatar: '/images/me.png',
  authorDescription: `<p>I have been testing software since 2007 and I started learning to write code in 2011.</p>
  <p>My strong leadership skills lead me towards management, when I was given my first opportunity in early 2019.</p>
  <p>I love spending time with my family and traveling. I am comfortable hiking outdoors, or inside playing video games.</p>
  <p>I prefer to work in an environment where everyone cares personally and is enabled to challenge each other directly.</p>`,
  skills: [
    {
      name: 'People Management',
      level: 80
    },
    {
      name: 'c#/Java',
      level: 85
    },
    {
      name: 'Javascript/Typescript (React, Angular, Protractor, Cypress)',
      level: 75
    },
    {
      name: 'SQL',
      level: 80
    },
    {
      name: 'Selenium',
      level: 90
    },
    {
      name: 'Test Automation',
      level: 90
    },
  ],
  monthNames: [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ],
  jobs: [
    {
      company: `Jelli`,
      startDate: new Date(2019, 3, 1),
      endDate: null,
      occupation: `Senior Software Engineering Manager, QA`,
      description:  [
        `I started my career at Jelli as a Senior SDET, but was promoted to manager very quickly. When the opportunity was presented, I rose to the challenge to take on a new path for my career. The QA team had very low morale and was not writing much test automation. In my time, I have focused on increasing team happiness, productivity, and knowledge. We now have a very functional team that is properly embedded into scrum teams and writing effective test automation for each sprint.`,
        `The testing frameworks at Jelli were very poor when I started, so I created new libraries that are more extensible while also making it easier to write tests.`,
        `I have spent a lot of time managing the entire recruiting pipeline for QA at Jelli. I have been able to hire some high performing engineers to keep pace with engineering.`,
        `I have also taken on some DevOps roles at Jelli, consolidating environments to reduce cost and help with uptime. I also modernized our Jenkins implementation to use spot instances and jenkinsfiles. This has made our continuous integration much more stable and reduced build times by ten minutes on average.`,
        `Versioning was a very large issue at Jelli that I also wanted to tackle. I gave multiple presentations to the teams, educating them and encouraging them to move to semantic versioning. I created multiple wiki pages on how to properly manage versioning for each of our tech stacks. I started with our QA codebase as a proof of concept to show the team how it is more effective. Semantic versioning is now standard for all of Jelli engineering.`,
        `Shifting left with our testing efforts was an early goal of mine. On my first major project, I created a build process that uses docker and embedded tomcat to spin up a local environment. This allows us to write API level integration tests on a local machine, before deploying to a lower environment. This also allows us to run our unit and integration tests during the build process. The result is that the developers have feedback much earlier in the process, if they break an endpoint and have increased productivity overall. The API endpoints on this project are virtually bug free.`,
      ] 
    },  {
      company: `Risk Placement Services`,
      startDate: new Date(2018, 4, 1),
      endDate: new Date(2019, 3, 1),
      occupation: `Senior SDET`,
      description: [
        `When I started at RPS, there was very little in the way of automated testing. Within my first month, I had established an automation framework and set it up within the delivery pipeline. ` +
          `With more confidence in the quality of code, I pushed for automatic deployments out to staging. This was a big deal because before this time, everything required user interaction and I am a champion for automation throughout the entire life cycle.`,
        `Drastically increased the quality of the websites that we offer by pushing testing into the entire delivery process. With these in place, the team was able to decrease time to production for our projects and make production deployments less of an event and more of a joy.`,
        `Standardized templates for projects inside of TeamCity. Part of this initiative was also to transform repositories so they are all structured the same. When you open a repository for an API, you can always expect to see the same patterns. ` +
          `The simplified process within TeamCity also changed from taking multiple hours to complete into a few minute process. With simplified setup, we saw a productivity increase within the project and release life cycle.`,
        `I also standardized deployments in Octopus by type of application. There were drastic decreases in the time required to set up deployments for a new micro service. Again, went from taking multiple hours to complete to just a few minutes. Since we create a lot of services, this has sped up development time drastically, which has increased the time to market for all projects.`,
        `There was traditionally very little done for the new hire process, but I was determined to change that. I authored a powershell script using Chocolatey that installed all of the software dependencies that a new developer would need. ` +
          `What this means for new developers, is that they can now hit the ground running when they start and not spend the first few days installing the necessary software. It can also be run to update existing software, which reduces developer downtime while enabling them to keep their software up to date.`,
        `In my time here, I have also been promoting scrum best practices. I have championed for many iterative changes that have drastically changed the landscape of our development process. We have switched from sprints to Kanban and have seen a very large increase in productivity. ` +
          `Stakeholders have commented that they feel like the department is much more responsive to their needs and are more engaged with the development process. The IT department doesn't have the best reputation and I am working hard to help improve that image and repair relationships.`,
        `To keep my other skills sharp, I also practice by taking tickets from the top of the backlog to work as a developer. I believe it is important to step out of your comfort zone periodically as it is the best way to personally grow.`,
      ]  
    }, {
      company: `Scentsy, Inc (Corporate Office)`,
      startDate: new Date(2011, 5, 1),
      endDate: new Date(2017, 4, 1),
      occupation: `SDET III`,
      description: [
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
      ]
    }, {
      company: `Lionbridge`,
      startDate: new Date(2007, 4, 1),
      endDate: new Date(2011, 5, 1),
      occupation: `Test Engineer`,
      description: [
        `In my time at Lionbridge, I was able to show competence and work my way into becoming a full time employee (FTE). ` +
          `This may not seem like a great feat, but there were very few FTE hired within the company and it was very difficult to become one.`,
        `During one contract in particular, we had a team of developers assigned to a project and I was assigned to a separate contract by myself, testing their software. ` +
          `The manager at the company liked my work so much, he kept my contract much longer than expected, even after cancelling the other development project.`,
        `Manual testing on a wide variety of products including mobile, web, hardware specifications, translations, etc.`,
        `Performed contract work with HP, Microsoft, Palm, and many more.`,
      ]  
    },
  ],
  social: {
    linkedin: "https://www.linkedin.com/in/michielbugher/",
    github: "https://github.com/MichielDean",
    email: "miyike@gmail.com"
  },
  googleAnalyticsId: 'UA-000000000-1',
  background_color: '#ffffff',
  theme_color: '#25303B',
  fontColor: "#000000cc",
  enableDarkmode: true, // If true, enables dark mode switch
  display: 'minimal-ui',
  icon: 'src/assets/favicon.png'
}