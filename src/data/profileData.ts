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

export const profileData: Profile = {
        "workHistory": [
          {
            "role": "Director of Software Engineering",
            "company": "Triton Digital",
            "duration": "Mar 2022 - Present",
            "description": [
              {
                "description": "Multi-Team Leadership",
                "moreInfo": [
                  "Direct three engineering teams across the Triton Advertising stack: two development teams and the organization-wide QA team, overseeing five scrum teams and managing multiple direct reports to ensure seamless collaboration and efficient delivery of high-quality software products.",
                  "Lead technical strategy and architecture decisions across assigned development teams and quality assurance, aligning engineering efforts with product vision and business objectives.",
                  "Served as a key liaison between engineering teams and executive leadership, providing insights and recommendations to drive strategic decision-making.",
                  "Held responsible for the overall success of five scrum teams, driving the adoption of best practices, agile methodologies, and innovative solutions to achieve project goals and deliverables."
                ]
              },
              {
                "description": "Cross-Functional Collaboration",
                "moreInfo": [
                  "Fostered a unified engineering culture across development and QA teams, promoting shared ownership of quality, open communication, and collaborative problem-solving.",
                  "Collaborated with cross-functional teams, including product management, operations, and stakeholders, to align team efforts with broader business objectives.",
                  "Broke down silos between development and QA within assigned teams, creating integrated workflows that improved product outcomes, velocity, and team morale."
                ]
              },
              {
                "description": "Test Architecture & Engineering Excellence",
                "moreInfo": [
                  "Defined and implemented an end-to-end test architecture that is reusable across all teams in the organization, significantly improving the efficiency and effectiveness of testing processes and reducing redundancy.",
                  "Established quality standards and engineering best practices adopted across managed development and QA teams.",
                  "Championed shift-left testing practices, integrating quality early in the development lifecycle."
                ]
              },
              {
                "description": "Team Development & Mentorship",
                "moreInfo": [
                  "Conducted bi-weekly one-on-one meetings with all direct reports across development and QA to provide personalized guidance, performance feedback, and professional development support, fostering a culture of continuous improvement.",
                  "Mentored and coached engineers at all levels, fostering their professional growth and enhancing overall team capabilities across multiple disciplines.",
                  "Conducted regular training sessions on engineering best practices, tools, and methodologies to keep teams up-to-date with industry advancements.",
                  "Built career development paths for team members, resulting in internal promotions and increased retention."
                ]
              },
              {
                "description": "Strategic Planning & Innovation",
                "moreInfo": [
                  "Developed and executed strategic plans for assigned teams to support the organization's long-term goals, ensuring that technical strategies align with business objectives and product roadmaps.",
                  "Implemented data-driven approaches to engineering, leveraging metrics and analytics to identify areas for improvement and drive continuous enhancement of processes.",
                  "Led technical innovation initiatives within managed teams, evaluating and adopting new tools and technologies to improve team efficiency and product quality."
                ]
              },
              {
                "description": "AI Tool Rollout & Adoption",
                "moreInfo": [
                  "Piloted and rolled out GitHub Copilot across engineering teams, driving adoption from initial evaluation to active daily use across development and QA.",
                  "Evaluated and adopted Model Context Protocol (MCP) for developer tooling, enabling richer LLM integration into engineering workflows.",
                  "Introduced LLM-assisted code review into the development workflow, surfacing issues earlier and reducing review cycle time.",
                  "Led evaluation of AI tools prior to org-wide adoption, conducting security reviews, IP assessments, and data privacy analysis to ensure responsible adoption."
                ]
              },
              {
                "description": "AI-Augmented Development Workflows",
                "moreInfo": [
                  "Leveraged AI tools to accelerate development team velocity across all aspects of the software development lifecycle.",
                  "Implemented LLM-assisted documentation generation for codebases and APIs, reducing documentation debt and improving onboarding.",
                  "Established an AI-augmented PR review process to surface defects earlier in the development cycle.",
                  "Incorporated AI tools into sprint planning and ticket refinement, improving estimation accuracy and reducing ambiguity before work begins."
                ]
              },
              {
                "description": "AI Governance & Policy",
                "moreInfo": [
                  "Established org-wide AI usage policies covering acceptable use, data classification, and IP ownership.",
                  "Defined standards for responsible AI tool use within engineering teams, balancing velocity gains with risk management.",
                  "Created guidelines specifying when AI-generated code requires additional human review, ensuring oversight of critical code paths."
                ]
              },
              {
                "description": "AI Enablement & Advocacy",
                "moreInfo": [
                  "Created internal playbooks and prompting guides to help engineering teams use AI tools effectively and consistently.",
                  "Coached engineers on effective prompting techniques and AI-assisted development workflows.",
                  "Advocated for AI adoption with executive leadership and peer engineering organizations, building organizational alignment around responsible AI use."
                ]
              }
            ]
          },
          {
            "role": "Senior Software Engineering Manager [QA]",
            "company": "Triton Digital",
            "duration": "Mar 2019 - Mar 2022",
            "description": [
              {
                "description": "Leadership",
                "moreInfo": [
                  "Promoted to senior level manager after demonstrating exceptional leadership competence, resulting in heightened team performance and streamlined project delivery."
                ]
              },
              {
                "description": "Team Transformation",
                "moreInfo": [
                  "Led a comprehensive QA team transformation, significantly improving team morale and adopting innovative automation practices to enhance productivity and accuracy."
                ]
              },
              {
                "description": "Test Automation",
                "moreInfo": [
                  "Established effective test automation practices within sprint cycles, streamlining testing processes, and reducing time-to-market for software releases."
                ]
              },
              {
                "description": "Recruitment and Talent Management",
                "moreInfo": [
                  "Managed the entire QA recruiting pipeline, successfully hiring high-performing engineers who contributed to the team's success and operational excellence."
                ]
              },
              {
                "description": "Stakeholder Communication",
                "moreInfo": [
                  "Facilitated regular updates to stakeholders, ensuring transparency in project progress and maintaining strong relationships with internal and external stakeholders.",
                  "Presented QA findings and metrics to senior leadership, providing actionable insights and influencing decision-making at the highest levels."
                ]
              }
            ]
          },
          {
            "role": "Senior Software Development Engineer Test",
            "company": "Triton Digital",
            "duration": "Mar 2019 - Apr 2019",
            "description": [
              {
                "description": "Rapidly Adapted to Java Development",
                "moreInfo": [
                  "Quickly transitioned from a .NET development background to Java, demonstrating versatility and the ability to learn new technologies efficiently."
                ]
              },
              {
                "description": "Front-End Testing Framework",
                "moreInfo": [
                  "Developed a new front-end testing framework, significantly improving testing efficiency and reliability for the development team."
                ]
              },
              {
                "description": "End-to-End Test Automation",
                "moreInfo": [
                  "Implemented impactful end-to-end test automation, reducing manual testing efforts and enhancing test coverage and accuracy."
                ]
              },
              {
                "description": "Mentoring Junior Engineers",
                "moreInfo": [
                  "Mentored junior engineers, sharing knowledge and best practices to increase team velocity and overall technical competence."
                ]
              }
            ]
          },
          {
            "role": "Senior SDET",
            "company": "Risk Placement Services, Inc.",
            "duration": "May 2018 - Mar 2019",
            "description": [
              {
                "description": "Automation Framework Implementation",
                "moreInfo": [
                  "Established an automation framework within the first month of joining, significantly enhancing the efficiency of testing processes."
                ]
              },
              {
                "description": "Automated Deployment Pipeline",
                "moreInfo": [
                  "Implemented an automated deployment pipeline to the staging environment, reducing manual deployment efforts and minimizing errors."
                ]
              },
              {
                "description": "Championing Automation",
                "moreInfo": [
                  "Championed automation throughout the entire software lifecycle, driving the transition from manual to automated testing practices."
                ]
              },
              {
                "description": "Leadership in Transition",
                "moreInfo": [
                  "Led the transition from manual to automated testing processes, resulting in increased testing efficiency and effectiveness."
                ]
              }
            ]
          },
          {
            "role": "SDET III",
            "company": "Scentsy, Inc.",
            "duration": "Jun 2011 - May 2018",
            "description": [
              {
                "description": "Leadership and Project Management",
                "moreInfo": [
                  "Led the SDET team for the IT department, managing multiple successful projects and ensuring high-quality software delivery."
                ]
              },
              {
                "description": "Test Dashboard Development",
                "moreInfo": [
                  "Built a test dashboard using .NET Core and D3.js with real-time test execution reporting, enhancing transparency and visibility of testing efforts."
                ]
              },
              {
                "description": "Test Analytics and Triage Tools",
                "moreInfo": [
                  "Implemented comprehensive test analytics and triage tools, improving the efficiency of identifying and resolving test issues."
                ]
              },
              {
                "description": "Career Progression",
                "moreInfo": [
                  "Progressed from a manual tester to a lead SDET role, demonstrating continual growth and increased responsibility within the organization."
                ]
              }
            ]
          },
          {
            "role": "Software Test Engineer",
            "company": "Lionbridge",
            "duration": "May 2007 - Jun 2011",
            "description": [
              {
                "description": "Full-Time Employee Achievement",
                "moreInfo": [
                  "Achieved rare full-time employee status through demonstrated competence and exceptional performance."
                ]
              },
              {
                "description": "Contract Work with Major Tech Companies",
                "moreInfo": [
                  "Performed contract work with major tech companies including HP, Microsoft, and Palm, delivering high-quality testing services."
                ]
              },
              {
                "description": "Manual Testing Expertise",
                "moreInfo": [
                  "Conducted manual testing across mobile, web, and hardware platforms, ensuring comprehensive test coverage and reliability."
                ]
              },
              {
                "description": "Client Satisfaction",
                "moreInfo": [
                  "Managed independent testing contracts with high client satisfaction, demonstrating strong project management and communication skills."
                ]
              }
            ]
          }
        ],
    name: "",
    title: "",
    description: "",
    linkedin: "https://www.linkedin.com/in/michielbugher/",
    github: "https://github.com/MichielDean",
    stackOverflow: "https://stackoverflow.com/users/2027382/michiel-bugher",
    projects: []
}