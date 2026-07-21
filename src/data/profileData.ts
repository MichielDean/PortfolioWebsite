export interface SkillCategory {
  category: string;
  skills: string[];
}

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
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  skills: string[];
  skillCategories: SkillCategory[];
  linkedin: string;
  github: string;
  stackOverflow: string;
  projects: Project[];
  workHistory: WorkHistory[];
  doNotClaim: string[];
}

export const profileData: Profile = {
  name: "Michiel Bugher",
  title: "Director of Software Engineering",
  description: "",
  email: "miyike@gmail.com",
  phone: "208-284-9187",
  location: "Boise, Idaho",
  website: "www.michielbugher.com",
  summary: "Engineering leader with 18+ years across three complementary facets: (1) AI-enablement builder — personally authors production agents, MCP servers/skills, RAG/retrieval pipelines, and agent memory systems (lobsterdog agent harness with 32+ skills, LLMem published as pip-installable, Cistern multi-agent AIDLC orchestrator, career-ops autonomous application agent with 65+ submissions); (2) Engineering leader — directs three teams and org-wide QA at Triton Digital (15+ engineers, 5 scrum teams, 100B+ monthly ad impressions), led monolith→microservices and on-prem→Kubernetes migrations, shipped paved-road workflows and developer portals; (3) QE leader — 18 years in quality engineering, automation-first testing, E2E test architecture, shift-left practices, and SOC 3 compliance ownership. Drove GitHub Copilot adoption from 40% to 80% of licensed users and established org-wide AI governance policies. Tailor emphasis to the role at hand.",
  skills: [
    "Engineering Leadership", "Cross-functional Collaboration", "Mentorship", "Strategic Planning", "Test Automation", "Performance Testing", "API Testing", "Security Testing", "Distributed Systems Testing", "C#/.NET", "Java", "TypeScript", "Python", "Selenium", "Playwright", "Cypress", "Jest", "AWS", "CI/CD", "Jenkins", "TeamCity", "Linux Systems", "Relational Databases (SQL Server, Oracle, MySQL, PostgreSQL)", "Puppeteer", "GitHub Copilot", "LLM-assisted Development", "MCP Integration", "AI Governance", "Enterprise QE Strategy & Governance", "Automation-First Testing & CI/CD Integration", "Quality Metrics, Dashboards & Reporting", "Shift-Left Quality Practices", "QE Team Building & Scaling", "End-to-End Test Architecture", "Data-Driven Engineering & Analytics", "Enterprise Software Testing (UI, API, Integration, Regression)", "SDLC Quality Integration", "Kubernetes", "Docker", "Terraform", "GitHub Actions", "Azure", "TestNG", "Node.js", "React", "Go", "FastAPI", "GraphQL", "PostgreSQL (Administration & Schema Design)", "Microservices Architecture", "REST API Design", "Event-Driven Systems", "Caching/CDN Integration", "GitOps", "ArgoCD", "GitLab CI", "Artifactory/Nexus", "Pipeline as Code", "Datadog", "Grafana/Prometheus", "New Relic", "ELK/Splunk", "Developer Productivity", "SOC 3 Compliance", "Incident Response", "On-Call/SLOs", "Architecture Decision Records", "Hiring & Interviewing", "Performance Management", "Roadmap Planning", "Cloud Networking (VPC, Load Balancers, DNS, Service Discovery)", "Claude Code", "Cursor", "Digital Media/Streaming", "Ad Tech", "Cloud Infrastructure/Platform", "SAST (Static Application Security Testing)", "DevSecOps Practices", "Root-Cause Diagnosis", "Post-Mortem / Blameless Reviews", "OKRs", "KPIs / Engineering Metrics", "Error Budgets / SLAs", "Design Docs / Architecture Reviews", "1:1s & Coaching", "Migration / Legacy Modernization", "Deployment Frequency Tracking", "Blue-Green Deployments", "Feature Flags", "Infrastructure as Code", "Helm Charts", "EC2", "S3", "AWS Lambda", "RDS", "EKS", "IAM / Security Groups", "E2E Testing Strategy", "Accessibility Testing", "Visual Regression Testing", "Contract Testing", "Load Testing at Scale", "Kanban", "SAFe / Scaled Agile", "Coding Standards / Paved Roads", "Developer Portals / Golden Paths", "Developer Tooling / Friction Reduction", "Product Engineering", "Subscription / Billing Systems", "User-Facing Analytics / Dashboards", "Executive-Level Reporting", "Product Management Collaboration", "Interview Loop Design", "Headcount Planning", "Pipeline Success Rate Tracking", "Pipeline Latency Optimization", "Build System Optimization",
    "MCP Server Authoring", "Agent Orchestration", "Prompt Engineering", "RAG / Retrieval-Augmented Generation",
    "LLM Application Patterns", "Embeddings & Vector Search", "SQLite FTS5 / BM25", "Semantic Search",
    "Agent Memory Systems", "Autonomous Agents", "CDP / Browser Automation", "Playwright",
    "OpenAI / Anthropic / Ollama APIs", "Developer Enablement", "Champions Network",
    "Voice AI / Speech Processing", "AI-native Onboarding"
  ],
  skillCategories: [
    { category: "Leadership & Strategy", skills: ["Engineering Leadership", "Cross-functional Collaboration", "Mentorship", "Strategic Planning", "Hiring & Interviewing", "Performance Management", "Roadmap Planning", "Architecture Decision Records"] },
    { category: "Testing & QA", skills: ["Test Automation", "Performance Testing", "API Testing", "Security Testing", "Distributed Systems Testing", "Enterprise Software Testing (UI, API, Integration, Regression)", "Shift-Left Quality Practices", "End-to-End Test Architecture"] },
    { category: "Programming Languages", skills: ["C#/.NET", "Java", "TypeScript", "Python", "Node.js", "React", "Go", "FastAPI", "GraphQL"] },
    { category: "Test Frameworks & Tools", skills: ["Selenium", "Playwright", "Cypress", "Jest", "Puppeteer"] },
    { category: "Cloud & DevOps", skills: ["AWS", "Azure", "CI/CD", "Jenkins", "TeamCity", "GitHub Actions", "GitLab CI", "GitOps", "ArgoCD", "Kubernetes", "Docker", "Terraform", "Artifactory/Nexus", "Pipeline as Code", "Infrastructure as Code", "Helm Charts", "Blue-Green Deployments", "Feature Flags", "EC2", "S3", "AWS Lambda", "RDS", "EKS", "IAM / Security Groups", "Cloud Networking (VPC, Load Balancers, DNS, Service Discovery)", "Linux Systems"] },
    { category: "Distributed Systems", skills: ["Microservices Architecture", "REST API Design", "Event-Driven Systems", "Caching/CDN Integration"] },
    { category: "Data & Databases", skills: ["Relational Databases (SQL Server, Oracle, MySQL, PostgreSQL)", "PostgreSQL (Administration & Schema Design)", "Data-Driven Engineering & Analytics"] },
    { category: "Observability & Reliability", skills: ["Datadog", "Grafana/Prometheus", "New Relic", "ELK/Splunk", "Developer Productivity", "Incident Response", "On-Call/SLOs", "Error Budgets / SLAs", "Root-Cause Diagnosis", "Post-Mortem / Blameless Reviews", "Pipeline Success Rate Tracking", "Pipeline Latency Optimization", "Build System Optimization"] },
    { category: "AI & Developer Tooling", skills: ["GitHub Copilot", "Claude Code", "Cursor", "LLM-assisted Development", "MCP Integration", "MCP Server Authoring", "Agent Orchestration", "Prompt Engineering", "RAG / Retrieval-Augmented Generation", "LLM Application Patterns", "Embeddings & Vector Search", "SQLite FTS5 / BM25", "Semantic Search", "Agent Memory Systems", "Autonomous Agents", "CDP / Browser Automation", "OpenAI / Anthropic / Ollama APIs", "AI Governance", "Developer Enablement", "Champions Network", "AI-native Onboarding", "Voice AI / Speech Processing"] },
    { category: "Compliance", skills: ["SOC 3 Compliance", "SAST (Static Application Security Testing)", "DevSecOps Practices"] },
    { category: "QE Strategy & Governance", skills: ["Enterprise QE Strategy & Governance", "Automation-First Testing & CI/CD Integration", "Quality Metrics, Dashboards & Reporting", "QE Team Building & Scaling", "SDLC Quality Integration", "E2E Testing Strategy", "Accessibility Testing", "Visual Regression Testing", "Contract Testing", "Load Testing at Scale"] },
    { category: "Engineering Management", skills: ["OKRs", "KPIs / Engineering Metrics", "Design Docs / Architecture Reviews", "1:1s & Coaching", "Migration / Legacy Modernization", "Deployment Frequency Tracking", "Coding Standards / Paved Roads", "Developer Portals / Golden Paths", "Developer Tooling / Friction Reduction", "Product Engineering", "Executive-Level Reporting", "Product Management Collaboration", "Interview Loop Design", "Headcount Planning"] },
    { category: "Domain Expertise", skills: ["Digital Media/Streaming", "Ad Tech", "Cloud Infrastructure/Platform", "Subscription / Billing Systems", "User-Facing Analytics / Dashboards"] },
    { category: "Process & Agile", skills: ["Agile/Scrum", "Kanban", "SAFe / Scaled Agile"] },
  ],
  linkedin: "https://www.linkedin.com/in/michielbugher/",
  github: "https://github.com/MichielDean",
  stackOverflow: "https://stackoverflow.com/users/2027382/michiel-bugher",
  projects: [],
  "workHistory": [
          {
            "role": "Director of Software Engineering",
            "company": "Triton Digital",
            "duration": "Mar 2022 - Present",
            "description": [
              {
                "description": "Team Leadership & Product Delivery",
                "moreInfo": [
                  "Direct three engineering teams across the Triton Advertising stack — two development teams and the org-wide QA team — overseeing five scrum teams and 15+ engineers delivering products that serve millions of listeners and 100B+ monthly ad impressions.",
                  "Led migration from monolith to microservices, on-prem datacenter to Kubernetes, and legacy CI to a modern developer platform, decommissioning legacy systems and improving deployment velocity across the organization.",
                  "Built career development paths, conducted regular 1:1s, and hired 5+ engineers across development and QA, resulting in internal promotions and strong retention."
                ]
              },
              {
                "description": "AI Tool Rollout & Adoption",
                "moreInfo": [
                  "Piloted and rolled out GitHub Copilot across all five scrum teams, driving adoption from 40% to 80% of licensed users and establishing AI-assisted development as standard practice across development and QA.",
                  "Introduced LLM-assisted code review into the development workflow, significantly reducing review cycle time and surfacing defects earlier in the development cycle."
                ]
              },
              {
                "description": "Quality, Security & Engineering Excellence",
                "moreInfo": [
                  "Defined and implemented an end-to-end test architecture reusable across all teams, integrating shift-left quality practices and SAST scanning into CI/CD pipelines to catch defects and vulnerabilities early.",
                  "Established engineering metrics, coding standards, and paved-road tooling including developer portals and golden paths, reducing developer friction and standardizing practices across multiple teams.",
                  "Owned SOC 3 compliance audits and established org-wide AI usage policies covering acceptable use, data classification, and IP ownership, balancing velocity gains with risk management."
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
          },
          {
            "role": "Independent R&D — Agentic Systems & Open Source",
            "company": "Personal Projects",
            "duration": "2024 - Present",
            "description": [
              {
                "description": "Agent Harness & Skills Platform (Lobsterdog)",
                "moreInfo": [
                  "Built an opencode-based agent harness in production daily use: 32+ skills (git-worktree, cistern, scaledtest, job-search, lobresume, critical-code-reviewer, execution-path-analyst, visual-explainer), session-idle introspection hooks, custom tools, provider abstraction across Ollama/OpenAI/Anthropic, identity layer, RTK token-compression and Caveman ruleset extensions, declarative install/deploy pipeline with systemd timers.",
                  "Authored MCP-style skills consumed by the agent at decision points: memory search before filesystem reads, mandatory worktree workflow, branch-strategy enforcement, pre-PR adversarial review via isolated subagents, test-and-verify quality gates."
                ]
              },
              {
                "description": "Agent Memory System (LLMem)",
                "moreInfo": [
                  "Designed and published a SQLite-backed agent memory system with semantic search, vector embeddings, FTS5 BM25 keyword search, ANN vector index, confidence scoring, a typed 7-category schema (fact/decision/preference/event/project_state/procedure/self_assessment), and background dreaming (decay/boost/promote/merge). Pip-installable and published to GitHub (MichielDean/LLMem).",
                  "Currently in active use with 1023 memories (640 active) powering this resume tailoring session, demonstrating RAG/retrieval, embeddings, and graph-traversal relations in a real agent workflow."
                ]
              },
              {
                "description": "AIDLC Pipeline Orchestrator (Cistern)",
                "moreInfo": [
                  "Built a multi-agent software-delivery pipeline orchestrator routing work units (droplets) through LLM-powered phases: architect cataractae producing design briefs, implementation, adversarial code review, QA with 4-level testing mandate, security, docs, and delivery — each with proof-of-work requirements and phase-specific quality gates.",
                  "Used to run the lobsterdog PR pipeline; integrated with git worktrees, branch strategy, and automerge for autonomous PR delivery."
                ]
              },
              {
                "description": "Autonomous Job-Application Agent (career-ops)",
                "moreInfo": [
                  "Built an autonomous job-discovery and application pipeline that scans 100+ ATS boards (Greenhouse, Ashby, Lever), filters by title/location/freshness, scores fit against a candidate profile, tailors resumes via LLM, fills application forms (Playwright + CDP + React-props injection for Ashby reCAPTCHA v3), and submits — 65+ applications submitted to date.",
                  "Reverse-engineered Ashby reCAPTCHA v3 bypass via headed Chrome over CDP, Greenhouse React onClick invocation via __reactProps, and Greenhouse email-verification code entry across security-input frames; committed fixes upstream."
                ]
              },
              {
                "description": "Triton Digital — Internal Agent Tooling",
                "moreInfo": [
                  "Beyond Copilot rollout, built internal paved-road tooling, agent harnesses, and chat assistants used inside Triton engineering: developer portal and golden-path workflows, CI/CD pipeline-as-code consumed org-wide, and AI-augmented PR review automation surfacing defects earlier in the development cycle."
                ]
              },
              {
                "description": "Voice AI / Speech Processing (Personal)",
                "moreInfo": [
                  "Built local dictation agents and audio-processing tooling for personal notes applications, including speech-to-text pipelines and transcription workflow automation."
                ]
              }
            ]
          }
        ],
  doNotClaim: [
    "DAST",
    "GCP",
    "Canary deployments",
    "Chaos engineering",
    "Service mesh",
    "Ansible",
    "Pulumi",
    "MRPM",
    "Budget ownership",
    "managed budget",
    "managed a budget",
    "owned budget",
    "Contractor budget management",
    "Vendor management",
    "Customer-facing communication",
    "Ruby on Rails",
    "Agency management",
    "agency partner",
    "Outsourced development",
    "Fintech",
    "Payments",
    "Healthcare",
    "HIPAA",
    "Pharma",
    "GMP",
    "Data engineering",
    "Airflow",
    "dbt",
    "Snowflake",
    "Dagster",
    "DORA Metrics",
    "P&L",
    "profit and loss"
  ],
}