export interface RoadmapNodeResource {
  title: string;
  url: string;
  type: "Best Starting Point" | "Official Docs" | "Beginner Friendly" | "Practice Resource" | "Advanced Reading";
}

export interface RoadmapNodeData {
  id: string;
  title: string;
  simpleExplanation: string;
  whyItMatters: string;
  keyConcepts: string[];
  resources: RoadmapNodeResource[];
}

export interface RoadmapChapter {
  id: string;
  title: string;
  nodes: RoadmapNodeData[];
}

export interface RoleData {
  id: string;
  title: string;
  description: string;
  timeline: string;
  difficulty: "Beginner Friendly" | "Intermediate" | "Advanced" | "Beginner Friendly → Intermediate";
  iconName: string;
  importanceDescription?: string;
  importanceStats?: { label: string; icon: string }[];
  chapters: RoadmapChapter[];
}

// Generate some basic template nodes to reuse for placeholders
const templateNodes: RoadmapNodeData[] = [
  {
    id: "node-1",
    title: "Foundational Concepts",
    simpleExplanation: "Understand the core principles of this role.",
    whyItMatters: "A solid foundation is key to advanced mastery.",
    keyConcepts: ["Read the overview", "Understand the landscape", "Set up your environment"],
    resources: [{ title: "Getting Started Guide", url: "#", type: "Best Starting Point" }]
  },
  {
    id: "node-2",
    title: "Core Technologies",
    simpleExplanation: "Master the essential tools required.",
    whyItMatters: "These tools are what you will use every day.",
    keyConcepts: ["Learn syntax", "Build a small project", "Understand best practices"],
    resources: [{ title: "Official Documentation", url: "#", type: "Official Docs" }]
  },
  {
    id: "node-3",
    title: "Advanced Architecture",
    simpleExplanation: "Learn how to structure large-scale applications.",
    whyItMatters: "This distinguishes senior engineers from junior ones.",
    keyConcepts: ["Study design patterns", "Optimize performance", "Deploy to production"],
    resources: [{ title: "Advanced Patterns", url: "#", type: "Advanced Reading" }]
  }
];

// Helper to make unique IDs (For legacy roles during transition)
const generateChapters = (rolePrefix: string): RoadmapChapter[] => [
  {
    id: `chapter-${rolePrefix}-01-basics`,
    title: "The Basics",
    nodes: [
      {
        id: `${rolePrefix}-node-placeholder`,
        title: "Coming Soon",
        simpleExplanation: "This track is currently being upgraded to our new mentor system.",
        whyItMatters: "Stay tuned.",
        keyConcepts: ["Patience"],
        resources: []
      }
    ]
  }
];

export const rolesData: RoleData[] = [
  {
    id: "frontend-developer",
    title: "Frontend Developer",
    description: "Build stunning, responsive, modern web applications that users interact with every day.",
    timeline: "6–8 Months",
    difficulty: "Beginner Friendly",
    iconName: "MonitorSmartphone",
    importanceDescription: "Frontend Developers build the digital experiences users interact with every day.\n\nFrom startups to global tech companies, every modern product depends on fast, responsive, beautiful interfaces. Frontend engineering combines creativity, problem-solving, and real-world product building.",
    importanceStats: [
      { label: "High Hiring Demand", icon: "TrendingUp" },
      { label: "Build Real Products", icon: "Layout" },
      { label: "Freelance Friendly", icon: "Globe" },
      { label: "Startup Ready", icon: "Rocket" }
    ],
    chapters: [
      {
        id: "chapter-fe-01",
        title: "Internet Fundamentals",
        nodes: [
          {
            id: "fe-node-1",
            title: "How the Internet Works",
            simpleExplanation: "Understand how websites actually reach users through servers, browsers, and networking.",
            whyItMatters: "Before you can build the web, you need to know how it operates under the hood.",
            keyConcepts: ["How Internet Works", "What is HTTP?", "Domain Names", "Hosting", "DNS", "Browsers & Rendering"],
            resources: [
              { title: "MDN Web Docs", url: "https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/How_does_the_Internet_work", type: "Official Docs" },
              { title: "Wikipedia (HTTP, DNS)", url: "https://en.wikipedia.org/wiki/HTTP", type: "Advanced Reading" },
              { title: "FreeCodeCamp Internet Basics", url: "https://www.freecodecamp.org/news/how-the-internet-works-for-developers/", type: "Best Starting Point" }
            ]
          },
          {
            id: "fe-node-2",
            title: "Version Control Systems",
            simpleExplanation: "Learn to track code changes and collaborate with other developers using Git.",
            whyItMatters: "Every professional developer on earth uses version control. It's how teams build software together without overwriting each other's work.",
            keyConcepts: ["Git Basics", "GitHub", "GitLab", "Bitbucket", "Version Control Concepts"],
            resources: [
              { title: "Official Git Docs", url: "https://git-scm.com/doc", type: "Official Docs" },
              { title: "GitHub Docs", url: "https://docs.github.com/en", type: "Advanced Reading" },
              { title: "FreeCodeCamp Git Tutorial", url: "https://www.freecodecamp.org/news/learn-the-basics-of-git-in-under-10-minutes-da548267cc91/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-02",
        title: "HTML Foundations",
        nodes: [
          {
            id: "fe-node-3",
            title: "HTML Basics",
            simpleExplanation: "HTML is the skeleton of the web. It defines the structure of your content.",
            whyItMatters: "Writing good semantic HTML improves accessibility, SEO, and makes your web apps robust.",
            keyConcepts: ["Semantic HTML", "Forms & Validation", "Accessibility", "SEO Basics"],
            resources: [
              { title: "MDN HTML Docs", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", type: "Official Docs" },
              { title: "W3Schools HTML", url: "https://www.w3schools.com/html/", type: "Beginner Friendly" },
              { title: "FreeCodeCamp HTML", url: "https://www.freecodecamp.org/learn/responsive-web-design/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-03",
        title: "CSS Foundations",
        nodes: [
          {
            id: "fe-node-4",
            title: "CSS Basics",
            simpleExplanation: "CSS brings your HTML to life with colors, layouts, and animations.",
            whyItMatters: "Users judge products by their design. Mastering CSS ensures your apps look professional across all screen sizes.",
            keyConcepts: ["CSS Fundamentals", "Layout Systems", "Responsive Design", "Flexbox", "Grid"],
            resources: [
              { title: "MDN CSS Docs", url: "https://developer.mozilla.org/en-US/docs/Web/CSS", type: "Official Docs" },
              { title: "CSS Tricks", url: "https://css-tricks.com/", type: "Advanced Reading" },
              { title: "Flexbox Froggy", url: "https://flexboxfroggy.com/", type: "Practice Resource" }
            ]
          },
          {
            id: "fe-node-5",
            title: "Writing Better CSS",
            simpleExplanation: "Learn modern ways to write scalable and maintainable styles.",
            whyItMatters: "As applications grow, raw CSS becomes chaotic. Modern architectures and utility frameworks like Tailwind solve this.",
            keyConcepts: ["Tailwind CSS", "BEM", "CSS Architecture", "Shadcn UI", "UI Libraries"],
            resources: [
              { title: "Tailwind CSS Docs", url: "https://tailwindcss.com/docs", type: "Official Docs" },
              { title: "Shadcn UI", url: "https://ui.shadcn.com/", type: "Advanced Reading" }
            ]
          },
          {
            id: "fe-node-6",
            title: "CSS Preprocessors",
            simpleExplanation: "Tools that add superpowers like variables and nesting to standard CSS.",
            whyItMatters: "While native CSS is catching up, preprocessors are still widely used in legacy and enterprise codebases.",
            keyConcepts: ["Sass", "PostCSS"],
            resources: [
              { title: "Sass Official Guide", url: "https://sass-lang.com/guide", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-04",
        title: "JavaScript",
        nodes: [
          {
            id: "fe-node-7",
            title: "JavaScript Fundamentals",
            simpleExplanation: "The programming language that makes the web interactive.",
            whyItMatters: "This is the core of frontend engineering. You must master JavaScript before moving on to React.",
            keyConcepts: ["Variables", "Functions", "DOM Manipulation", "Fetch API", "Async/Await"],
            resources: [
              { title: "JavaScript.info", url: "https://javascript.info/", type: "Best Starting Point" },
              { title: "MDN JS Docs", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript", type: "Official Docs" },
              { title: "FreeCodeCamp JS", url: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-05",
        title: "Package Managers & Tooling",
        nodes: [
          {
            id: "fe-node-8",
            title: "Package Managers",
            simpleExplanation: "Tools to install and manage third-party code libraries.",
            whyItMatters: "Modern apps rely on thousands of open-source packages. Package managers keep them organized.",
            keyConcepts: ["npm", "pnpm", "yarn", "package.json"],
            resources: [
              { title: "NPM Docs", url: "https://docs.npmjs.com/", type: "Official Docs" }
            ]
          },
          {
            id: "fe-node-9",
            title: "Build Tools",
            simpleExplanation: "Tools that bundle and optimize your code for production browsers.",
            whyItMatters: "You don't ship raw code. You ship optimized, minified bundles for speed.",
            keyConcepts: ["Vite", "Webpack", "esbuild", "SWC", "Rollup", "Parcel"],
            resources: [
              { title: "Vite Guide", url: "https://vitejs.dev/guide/", type: "Best Starting Point" },
              { title: "Webpack Concepts", url: "https://webpack.js.org/concepts/", type: "Advanced Reading" }
            ]
          },
          {
            id: "fe-node-10",
            title: "Linters & Formatters",
            simpleExplanation: "Tools that automatically format code and catch basic errors.",
            whyItMatters: "They enforce consistency across teams and prevent bugs before they happen.",
            keyConcepts: ["ESLint", "Prettier"],
            resources: [
              { title: "Prettier Docs", url: "https://prettier.io/", type: "Official Docs" },
              { title: "ESLint Getting Started", url: "https://eslint.org/docs/latest/use/getting-started", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-06",
        title: "Frameworks",
        nodes: [
          {
            id: "fe-node-11",
            title: "Pick a Framework",
            simpleExplanation: "A library that makes building complex UIs much easier than raw JavaScript.",
            whyItMatters: "Almost no modern company builds frontend apps with plain JavaScript. React is the industry standard.",
            keyConcepts: ["React (Recommended)", "Vue", "Angular", "Svelte", "SolidJS", "Components", "State", "Props"],
            resources: [
              { title: "React Docs", url: "https://react.dev/", type: "Official Docs" },
              { title: "React.dev Learn", url: "https://react.dev/learn", type: "Best Starting Point" },
              { title: "Scrimba React", url: "https://scrimba.com/learn/learnreact", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-07",
        title: "Authentication & APIs",
        nodes: [
          {
            id: "fe-node-12",
            title: "Authentication",
            simpleExplanation: "How to securely log users in and keep their data private.",
            whyItMatters: "Every real product needs users. Understanding auth patterns is mandatory for frontend engineers.",
            keyConcepts: ["JWT", "OAuth", "Session Auth", "Basic Security", "Protected Routes"],
            resources: [
              { title: "JWT Introduction", url: "https://jwt.io/introduction", type: "Best Starting Point" }
            ]
          },
          {
            id: "fe-node-13",
            title: "GraphQL",
            simpleExplanation: "A modern alternative to REST for fetching data from backends.",
            whyItMatters: "It allows frontend developers to request exactly the data they need, nothing more.",
            keyConcepts: ["Apollo", "Relay Modern", "Queries", "Mutations"],
            resources: [
              { title: "GraphQL Learn", url: "https://graphql.org/learn/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-08",
        title: "Type Safety",
        nodes: [
          {
            id: "fe-node-14",
            title: "TypeScript",
            simpleExplanation: "JavaScript with syntax for types. It catches errors before you even run the code.",
            whyItMatters: "TypeScript is the absolute industry standard. Knowing it is non-negotiable for mid-to-senior roles.",
            keyConcepts: ["Types", "Interfaces", "Generics"],
            resources: [
              { title: "TypeScript Docs", url: "https://www.typescriptlang.org/docs/", type: "Official Docs" },
              { title: "Total TypeScript", url: "https://www.totaltypescript.com/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-09",
        title: "SSR & Framework Ecosystem",
        nodes: [
          {
            id: "fe-node-15",
            title: "SSR (Server-Side Rendering)",
            simpleExplanation: "Rendering React on the server to make initial loads faster and improve SEO.",
            whyItMatters: "Standard React apps are slow to load and bad for SEO. SSR fixes this.",
            keyConcepts: ["Next.js", "Nuxt.js", "Astro"],
            resources: [
              { title: "Next.js Docs", url: "https://nextjs.org/docs", type: "Official Docs" }
            ]
          },
          {
            id: "fe-node-16",
            title: "Static Site Generation",
            simpleExplanation: "Pre-building pages at compile time for maximum speed.",
            whyItMatters: "Perfect for blogs, marketing sites, and documentation.",
            keyConcepts: ["Next.js Static Export", "Astro", "Eleventy"],
            resources: [
              { title: "Astro Concepts", url: "https://docs.astro.build/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-10",
        title: "Web Performance & Security",
        nodes: [
          {
            id: "fe-node-17",
            title: "Web Security Basics",
            simpleExplanation: "Protecting your users from attacks.",
            whyItMatters: "Frontend apps are vulnerable to XSS and CSRF. You must know how to mitigate these.",
            keyConcepts: ["CORS", "CSP", "OWASP Basics", "HTTPS"],
            resources: [
              { title: "MDN Web Security", url: "https://developer.mozilla.org/en-US/docs/Web/Security", type: "Official Docs" }
            ]
          },
          {
            id: "fe-node-18",
            title: "Performance Optimization",
            simpleExplanation: "Making your apps load instantly and feel buttery smooth.",
            whyItMatters: "Amazon found that every 100ms of latency cost them 1% in sales. Performance is money.",
            keyConcepts: ["Lighthouse", "Core Web Vitals", "Lazy Loading", "Performance Metrics"],
            resources: [
              { title: "web.dev Vitals", url: "https://web.dev/vitals/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-11",
        title: "Advanced Browser APIs",
        nodes: [
          {
            id: "fe-node-19",
            title: "Browser APIs",
            simpleExplanation: "Using the browser's hidden superpowers.",
            whyItMatters: "Allows you to build apps that feel like native desktop/mobile applications.",
            keyConcepts: ["Storage", "Notifications", "Service Workers", "WebSockets", "Geolocation", "Device APIs"],
            resources: [
              { title: "MDN Web APIs", url: "https://developer.mozilla.org/en-US/docs/Web/API", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-12",
        title: "Mobile & Desktop Ecosystem",
        nodes: [
          {
            id: "fe-node-20",
            title: "Mobile Apps",
            simpleExplanation: "Using web technologies to build native iOS and Android apps.",
            whyItMatters: "React Native allows frontend developers to instantly become mobile developers.",
            keyConcepts: ["React Native", "Flutter", "Ionic"],
            resources: [
              { title: "React Native", url: "https://reactnative.dev/", type: "Best Starting Point" }
            ]
          },
          {
            id: "fe-node-21",
            title: "Desktop Apps",
            simpleExplanation: "Building cross-platform apps for Mac, Windows, and Linux.",
            whyItMatters: "Slack, VS Code, and Discord are all built using these technologies.",
            keyConcepts: ["Electron", "Tauri"],
            resources: [
              { title: "Tauri Overview", url: "https://tauri.app/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fe-13",
        title: "Final Career Layer",
        nodes: [
          {
            id: "fe-node-22",
            title: "Projects & Portfolio",
            simpleExplanation: "Proving you can actually code by building real things.",
            whyItMatters: "Your portfolio is more important than your degree. Build real, usable products.",
            keyConcepts: ["Build portfolio", "Clone projects", "Deploy apps", "Resume projects"],
            resources: [
              { title: "Frontend Mentor", url: "https://www.frontendmentor.io/", type: "Practice Resource" }
            ]
          },
          {
            id: "fe-node-23",
            title: "Career Readiness",
            simpleExplanation: "Preparing to get hired.",
            whyItMatters: "Being a great coder is only half the battle. You have to sell yourself to get the job.",
            keyConcepts: ["Resume", "GitHub Profile", "Interview Prep", "Freelancing", "Internship Readiness"],
            resources: [
              { title: "Great Frontend Interviews", url: "https://www.greatfrontend.com/", type: "Best Starting Point" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "backend-developer",
    title: "Backend Developer",
    description: "Build scalable servers, APIs, databases, authentication systems, and the core logic that powers modern applications.",
    timeline: "7–10 Months",
    difficulty: "Beginner Friendly → Intermediate",
    iconName: "Database",
    importanceDescription: "Backend Developers build the systems users never see but every product depends on.\n\nFrom authentication and APIs to databases and scalability, backend engineers power startups, SaaS products, fintech apps, and enterprise systems.",
    importanceStats: [
      { label: "High Demand", icon: "TrendingUp" },
      { label: "Backend Powers Everything", icon: "Database" },
      { label: "Startup Ready", icon: "Rocket" },
      { label: "Scalable Career Path", icon: "BarChart3" }
    ],
    chapters: [
      {
        id: "chapter-be-01",
        title: "Internet Fundamentals",
        nodes: [
          {
            id: "be-node-1",
            title: "How the Internet Works",
            simpleExplanation: "Understand how applications communicate through networks before building servers.",
            whyItMatters: "Before you can build backend servers, you need to know how the network routing and HTTP protocols work.",
            keyConcepts: ["How Internet Works", "HTTP Basics", "Domain Names", "Hosting", "DNS", "Browser Request Lifecycle"],
            resources: [
              { title: "MDN HTTP Docs", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP", type: "Official Docs" },
              { title: "Wikipedia (HTTP & DNS)", url: "https://en.wikipedia.org/wiki/HTTP", type: "Advanced Reading" },
              { title: "FreeCodeCamp Internet Basics", url: "https://www.freecodecamp.org/news/how-the-internet-works-for-developers/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-02",
        title: "Pick a Programming Language",
        nodes: [
          {
            id: "be-node-2",
            title: "Backend Language Foundations",
            simpleExplanation: "Learn the programming language you will use to write your server logic.",
            whyItMatters: "The language you choose will dictate your framework, ecosystem, and available libraries. JavaScript (Node.js) is highly recommended for beginners.",
            keyConcepts: ["Recommended: JavaScript (Node.js)", "Python", "Java", "Go", "C#", "Rust", "Ruby", "PHP"],
            resources: [
              { title: "JavaScript.info", url: "https://javascript.info/", type: "Best Starting Point" },
              { title: "Python Docs", url: "https://docs.python.org/3/", type: "Official Docs" },
              { title: "FreeCodeCamp", url: "https://www.freecodecamp.org/", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-03",
        title: "Version Control",
        nodes: [
          {
            id: "be-node-3",
            title: "Git & Collaboration",
            simpleExplanation: "Learn how to track code changes and collaborate with other developers.",
            whyItMatters: "Version control is mandatory in the software industry for working safely in teams.",
            keyConcepts: ["Git", "GitHub", "GitLab"],
            resources: [
              { title: "Git Docs", url: "https://git-scm.com/doc", type: "Official Docs" },
              { title: "GitHub Docs", url: "https://docs.github.com/en", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-04",
        title: "Relational Databases",
        nodes: [
          {
            id: "be-node-4",
            title: "SQL Fundamentals",
            simpleExplanation: "Databases store application data in structured tables.",
            whyItMatters: "Relational databases are the backbone of most backend systems.",
            keyConcepts: ["PostgreSQL", "MySQL", "MariaDB", "SQLite", "MSSQL", "Oracle"],
            resources: [
              { title: "PostgreSQL Docs", url: "https://www.postgresql.org/docs/", type: "Official Docs" },
              { title: "SQLBolt", url: "https://sqlbolt.com/", type: "Practice Resource" },
              { title: "FreeCodeCamp SQL", url: "https://www.freecodecamp.org/news/sql-and-databases-full-course/", type: "Best Starting Point" }
            ]
          },
          {
            id: "be-node-5",
            title: "Database Design",
            simpleExplanation: "Learn how to properly structure your database tables and relationships.",
            whyItMatters: "Bad database design leads to slow queries and corrupted data. Normalization ensures data integrity.",
            keyConcepts: ["Normalization", "Table Models", "Primary Keys", "Foreign Keys", "Relationships"],
            resources: [
              { title: "Database Design Basics", url: "https://www.geeksforgeeks.org/database-design-in-dbms/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-05",
        title: "APIs",
        nodes: [
          {
            id: "be-node-6",
            title: "Learn APIs",
            simpleExplanation: "APIs allow different software systems to talk to each other.",
            whyItMatters: "This is the primary way frontend applications interact with your backend server.",
            keyConcepts: ["REST APIs", "JSON APIs", "GraphQL", "SOAP", "gRPC"],
            resources: [
              { title: "RESTful API Tutorial", url: "https://restfulapi.net/", type: "Best Starting Point" },
              { title: "MDN APIs", url: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Introduction", type: "Official Docs" },
              { title: "GraphQL Docs", url: "https://graphql.org/learn/", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-06",
        title: "Authentication & Authorization",
        nodes: [
          {
            id: "be-node-7",
            title: "Authentication Systems",
            simpleExplanation: "Verifying who a user is, and checking what they are allowed to do.",
            whyItMatters: "Security is non-negotiable. Without auth, anyone could delete everyone else's data.",
            keyConcepts: ["JWT", "OAuth", "Session Auth", "Token Authentication", "Cookie Authentication", "OpenID", "SAML"],
            resources: [
              { title: "Auth0 Docs", url: "https://auth0.com/docs", type: "Official Docs" },
              { title: "JWT.io", url: "https://jwt.io/introduction", type: "Advanced Reading" },
              { title: "OAuth Guide", url: "https://oauth.net/2/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-07",
        title: "Caching",
        nodes: [
          {
            id: "be-node-8",
            title: "Performance Through Caching",
            simpleExplanation: "Storing frequently accessed data in fast memory so you don't have to query the database every time.",
            whyItMatters: "Caching is the #1 way to drastically improve backend performance and save server costs.",
            keyConcepts: ["Redis", "Memcached", "CDN", "Server Side Cache", "Client Side Cache"],
            resources: [
              { title: "Redis Docs", url: "https://redis.io/docs/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-08",
        title: "Web Security",
        nodes: [
          {
            id: "be-node-9",
            title: "Backend Security",
            simpleExplanation: "Protecting your servers and data from malicious actors.",
            whyItMatters: "A data breach can bankrupt a company. Security must be built in from day one.",
            keyConcepts: ["Hashing", "bcrypt", "scrypt", "MD5", "SHA", "HTTPS", "CORS", "CSP", "SSL/TLS", "OWASP Basics", "API Security"],
            resources: [
              { title: "OWASP Docs", url: "https://owasp.org/www-project-top-ten/", type: "Official Docs" },
              { title: "MDN Security Docs", url: "https://developer.mozilla.org/en-US/docs/Web/Security", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-09",
        title: "Testing",
        nodes: [
          {
            id: "be-node-10",
            title: "Backend Testing",
            simpleExplanation: "Writing code that tests your backend code automatically.",
            whyItMatters: "Automated tests prevent you from accidentally breaking existing features when you add new ones.",
            keyConcepts: ["Unit Testing", "Integration Testing", "Functional Testing"],
            resources: [
              { title: "Jest Docs", url: "https://jestjs.io/docs/getting-started", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-10",
        title: "CI/CD",
        nodes: [
          {
            id: "be-node-11",
            title: "Deployment Pipelines",
            simpleExplanation: "Automating the process of testing and deploying your code to servers.",
            whyItMatters: "Manual deployments are error-prone. CI/CD pipelines automate the deployment lifecycle.",
            keyConcepts: ["CI/CD Basics", "Deployment Workflows"],
            resources: [
              { title: "GitHub Actions", url: "https://docs.github.com/en/actions", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-11",
        title: "ORM & Database Tools",
        nodes: [
          {
            id: "be-node-12",
            title: "ORM",
            simpleExplanation: "Using code to interact with databases instead of writing raw SQL.",
            whyItMatters: "ORMs massively speed up development time and help prevent SQL injection vulnerabilities.",
            keyConcepts: ["Prisma", "Sequelize", "TypeORM"],
            resources: [
              { title: "Prisma Docs", url: "https://www.prisma.io/docs/", type: "Best Starting Point" }
            ]
          },
          {
            id: "be-node-13",
            title: "Database Scaling",
            simpleExplanation: "Techniques for handling massive amounts of data and users.",
            whyItMatters: "When your app goes viral, your database will crash if it isn't properly scaled.",
            keyConcepts: ["Indexes", "Replication", "Partitioning", "CAP Theorem"],
            resources: [
              { title: "CAP Theorem Basics", url: "https://en.wikipedia.org/wiki/CAP_theorem", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-12",
        title: "Architecture & System Design",
        nodes: [
          {
            id: "be-node-14",
            title: "Software Architecture",
            simpleExplanation: "How to structure the massive moving parts of your backend.",
            whyItMatters: "Good architecture allows teams to work together efficiently. Bad architecture leads to unmaintainable code.",
            keyConcepts: ["Monolith", "Microservices", "Serverless", "Event Driven Architecture"],
            resources: [
              { title: "AWS Architecture", url: "https://aws.amazon.com/architecture/", type: "Official Docs" }
            ]
          },
          {
            id: "be-node-15",
            title: "Design Principles",
            simpleExplanation: "Rules for writing clean, maintainable backend code.",
            whyItMatters: "Principles like the Twelve-Factor App ensure your backend is scalable and portable.",
            keyConcepts: ["Domain Driven Design", "Event Sourcing", "CQRS", "Twelve-Factor Apps"],
            resources: [
              { title: "The Twelve-Factor App", url: "https://12factor.net/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-13",
        title: "Containers & Deployment",
        nodes: [
          {
            id: "be-node-16",
            title: "Containers",
            simpleExplanation: "Packaging your app and all its dependencies so it runs identically everywhere.",
            whyItMatters: "Solves the 'It works on my machine' problem.",
            keyConcepts: ["Docker", "LXC", "Kubernetes"],
            resources: [
              { title: "Docker Docs", url: "https://docs.docker.com/", type: "Official Docs" },
              { title: "Kubernetes Docs", url: "https://kubernetes.io/docs/home/", type: "Advanced Reading" }
            ]
          },
          {
            id: "be-node-17",
            title: "Web Servers",
            simpleExplanation: "Software that sits in front of your app to handle raw HTTP traffic.",
            whyItMatters: "Nginx and Apache handle load balancing, SSL, and static file serving much better than Node or Python.",
            keyConcepts: ["Nginx", "Apache", "IIS", "Caddy"],
            resources: [
              { title: "Nginx Beginner's Guide", url: "https://nginx.org/en/docs/beginners_guide.html", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-14",
        title: "Search & Real-Time Systems",
        nodes: [
          {
            id: "be-node-18",
            title: "Search Engines",
            simpleExplanation: "Dedicated databases optimized purely for searching text extremely fast.",
            whyItMatters: "Standard databases are too slow for full-text search across millions of records.",
            keyConcepts: ["Elasticsearch", "Solr"],
            resources: [
              { title: "Elasticsearch Docs", url: "https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html", type: "Official Docs" }
            ]
          },
          {
            id: "be-node-19",
            title: "Real-Time Communication",
            simpleExplanation: "Pushing data to the client instantly without them having to refresh.",
            whyItMatters: "Required for chat apps, live notifications, and real-time dashboards.",
            keyConcepts: ["WebSockets", "Server Sent Events", "Long Polling", "Short Polling"],
            resources: [
              { title: "WebSockets API", url: "https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-15",
        title: "NoSQL Databases",
        nodes: [
          {
            id: "be-node-20",
            title: "NoSQL",
            simpleExplanation: "Databases that store data in documents or key-value pairs instead of tables.",
            whyItMatters: "Great for unstructured data and massive horizontal scaling.",
            keyConcepts: ["MongoDB", "Redis", "Firebase", "DynamoDB", "CouchDB"],
            resources: [
              { title: "MongoDB Docs", url: "https://www.mongodb.com/docs/", type: "Official Docs" }
            ]
          },
          {
            id: "be-node-21",
            title: "Graph Databases",
            simpleExplanation: "Databases optimized for storing complex relationships, like a social network.",
            whyItMatters: "Much faster than SQL JOINs when querying deeply connected data.",
            keyConcepts: ["Neo4j", "Cassandra", "ArangoDB", "AWS Neptune"],
            resources: [
              { title: "Neo4j Sandbox", url: "https://neo4j.com/sandbox/", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-16",
        title: "Production Readiness",
        nodes: [
          {
            id: "be-node-22",
            title: "Building for Scale",
            simpleExplanation: "Designing systems that don't crash when traffic spikes.",
            whyItMatters: "Downtime costs money and ruins user trust.",
            keyConcepts: ["Graceful Degradation", "Load Balancing", "Circuit Breakers", "Migration Strategies", "Scaling Types"],
            resources: [
              { title: "System Design Primer", url: "https://github.com/donnemartin/system-design-primer", type: "Advanced Reading" }
            ]
          },
          {
            id: "be-node-23",
            title: "Observability",
            simpleExplanation: "Knowing exactly what your servers are doing at all times.",
            whyItMatters: "If a server crashes at 3 AM, logs and metrics are the only way to figure out why.",
            keyConcepts: ["Monitoring", "Instrumentation", "Logging", "Telemetry"],
            resources: [
              { title: "Datadog HQ", url: "https://www.datadoghq.com/", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-be-17",
        title: "Career Layer",
        nodes: [
          {
            id: "be-node-24",
            title: "Projects & Portfolio",
            simpleExplanation: "Prove your skills by building robust, public APIs.",
            whyItMatters: "Employers want to see live code and well-written documentation.",
            keyConcepts: ["Build APIs", "Authentication system", "Real-world backend projects", "Deployment"],
            resources: [
              { title: "Backend Project Ideas", url: "https://github.com/florinpop17/app-ideas", type: "Best Starting Point" }
            ]
          },
          {
            id: "be-node-25",
            title: "Career Readiness",
            simpleExplanation: "Preparing to pass backend engineering interviews.",
            whyItMatters: "System design interviews are notoriously difficult. You must practice.",
            keyConcepts: ["Resume", "GitHub", "Open Source", "Interview Prep", "Internship Readiness"],
            resources: [
              { title: "LeetCode", url: "https://leetcode.com/", type: "Practice Resource" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "full-stack",
    title: "Full Stack Developer",
    description: "Master both frontend interfaces and backend infrastructure.",
    timeline: "10–12 Months",
    difficulty: "Intermediate",
    iconName: "Layers",
    chapters: [
      {
        id: "chapter-fs-01",
        title: "Frontend Basics (HTML, CSS & JavaScript)",
        nodes: [
          {
            id: "node-fs-01-web-basics",
            title: "Semantic HTML & Responsive CSS",
            simpleExplanation: "HTML structures web content, while CSS styles it. Semantic HTML uses tags that explain their meaning to both browsers and developers. Responsive CSS ensures layouts adapt to mobile, tablet, and desktop screens using Flexbox, CSS Grid, and media queries.",
            whyItMatters: "Every web page starts with HTML and CSS. Using semantic tags improves accessibility (SEO) and maintainability, while responsive styling is required for modern multi-device compatibility.",
            keyConcepts: ["Semantic tags (<header>, <article>, etc.)", "CSS Box Model & Positioning", "Flexbox and CSS Grid layouts", "Mobile-First Design & Media Queries"],
            resources: [
              { title: "MDN HTML Basics", url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics", type: "Best Starting Point" },
              { title: "CSS Tricks Guide to Flexbox", url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/", type: "Practice Resource" }
            ]
          },
          {
            id: "node-fs-01-js-core",
            title: "Advanced JavaScript & DOM Manipulation",
            simpleExplanation: "JavaScript brings web pages to life. You need to master core concepts like scope, closures, promises, async/await, fetching data from APIs, and manipulating the Document Object Model (DOM).",
            whyItMatters: "Frontend frameworks like React are built on top of JavaScript. You cannot master React without a strong command of JavaScript fundamentals.",
            keyConcepts: ["Prototypal Inheritance & ES6+", "Asynchronous JS (Promises & Async/Await)", "API Fetching (Fetch API / Axios)", "DOM Event Delegation"],
            resources: [
              { title: "javascript.info - Modern JS", url: "https://javascript.info/", type: "Best Starting Point" },
              { title: "Eloquent JavaScript", url: "https://eloquentjavascript.net/", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-fs-02",
        title: "Frontend Frameworks (React & Next.js)",
        nodes: [
          {
            id: "node-fs-02-react",
            title: "React.js Fundamentals",
            simpleExplanation: "React is a component-based UI library. You learn how to split interfaces into reusable pieces, manage data flow using State and Props, and hook into lifecycle events using React Hooks (useState, useEffect, useMemo).",
            whyItMatters: "React is the most popular frontend library in the industry. It powers highly interactive web interfaces and dynamic user experiences.",
            keyConcepts: ["Component Lifecycle & JSX", "Props vs State", "React Hooks (useState, useEffect, useContext)", "Form handling & dynamic lists"],
            resources: [
              { title: "Official React Documentation", url: "https://react.dev/", type: "Official Docs" },
              { title: "React Tutorial by Scrimba", url: "https://scrimba.com/learn/learnreact", type: "Beginner Friendly" }
            ]
          },
          {
            id: "node-fs-02-nextjs",
            title: "Next.js App Router & Server-Side Rendering (SSR)",
            simpleExplanation: "Next.js is a production framework built on top of React. It handles routing, server-side rendering (SSR), static site generation (SSG), and API routes, giving you a full-stack capability on the frontend.",
            whyItMatters: "Standard React is client-side rendered, which hurts SEO and load times. Next.js solves this by rendering components on the server before serving them to the client.",
            keyConcepts: ["Next.js App Router (Layouts & Pages)", "Server Components vs Client Components", "Static Site Generation (SSG) & SSR", "Optimized Image and Font Loading"],
            resources: [
              { title: "Next.js Learn Course", url: "https://nextjs.org/learn", type: "Best Starting Point" },
              { title: "Next.js Documentation", url: "https://nextjs.org/docs", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-fs-03",
        title: "Backend Services & Database Design",
        nodes: [
          {
            id: "node-fs-03-nodejs",
            title: "Node.js & Express.js APIs",
            simpleExplanation: "Node.js lets you run JavaScript on the server. Express is a lightweight framework to create routing logic, handle middleware, parse incoming requests, and build RESTful API endpoints.",
            whyItMatters: "A full-stack developer must be able to design, write, and secure the server logic that interfaces between the database and the frontend app.",
            keyConcepts: ["Node.js event loop & file system", "Creating Express servers & routers", "REST API design patterns", "Express Middleware (CORS, body parser)"],
            resources: [
              { title: "Node.js Introduction by MDN", url: "https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs", type: "Best Starting Point" },
              { title: "Express.js Official Guide", url: "https://expressjs.com/", type: "Official Docs" }
            ]
          },
          {
            id: "node-fs-03-databases",
            title: "Relational (PostgreSQL) & Document (MongoDB) Databases",
            simpleExplanation: "Databases store application data. Relational databases (like PostgreSQL) store data in structured tables using SQL, enforcing relations. NoSQL databases (like MongoDB) store data in flexible, JSON-like document models.",
            whyItMatters: "Choosing the correct data model and optimizing queries prevents data corruption and keeps your application fast under heavy loads.",
            keyConcepts: ["SQL Schemas, Joins, and Foreign Keys", "NoSQL Document Structure", "Database Indexing & Query Optimization", "Object-Relational Mapping (ORM) (Prisma/Mongoose)"],
            resources: [
              { title: "PostgreSQL Tutorial", url: "https://www.postgresqltutorial.com/", type: "Best Starting Point" },
              { title: "MongoDB University Basics", url: "https://learn.mongodb.com/", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-fs-04",
        title: "Security, Auth & Real-Time Sync",
        nodes: [
          {
            id: "node-fs-04-auth",
            title: "Authentication & Authorization (JWT & OAuth)",
            simpleExplanation: "Authentication verifies who a user is (e.g. login with password or Google), while authorization verifies what they are allowed to do (e.g. edit a profile vs view as guest). JWT (JSON Web Tokens) are used to securely transmit user identity information.",
            whyItMatters: "Security is a core requirement of all software projects. You must secure user passwords, authenticate API endpoints, and protect sensitive database tables.",
            keyConcepts: ["Password hashing with bcrypt", "JWT Sign/Verify flow", "OAuth 2.0 (Login with Google/GitHub)", "Role-Based Access Control (RBAC)"],
            resources: [
              { title: "Web Security 101 by Auth0", url: "https://auth0.com/docs/secure", type: "Best Starting Point" },
              { title: "OWASP Top Ten Security Risks", url: "https://owasp.org/www-project-top-ten/", type: "Advanced Reading" }
            ]
          },
          {
            id: "node-fs-04-realtime",
            title: "WebSockets & Real-Time Communication",
            simpleExplanation: "WebSockets establish a persistent, bi-directional communication channel between client and server, enabling instant updates without refresh (e.g. chat apps, live notifications).",
            whyItMatters: "Standard HTTP requests are client-initiated and short-lived. Real-time apps need the server to push events directly to the client instantly.",
            keyConcepts: ["WebSocket protocol vs HTTP", "Socket.io implementation", "Event broadcasting & rooms", "Scaling WebSockets (Redis Adapter)"],
            resources: [
              { title: "Socket.io Get Started Guide", url: "https://socket.io/get-started/chat", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-fs-05",
        title: "Containers, Testing & Deployment",
        nodes: [
          {
            id: "node-fs-05-docker",
            title: "Docker Containerization",
            simpleExplanation: "Docker packages your code, runtime, system libraries, and settings into a single container. This ensures that your application runs exactly the same way in local development as it does in production cloud environments.",
            whyItMatters: "Docker solves the 'it works on my machine' problem, simplifies team setups, and is the standard for modern cloud deployment models.",
            keyConcepts: ["Writing Dockerfiles", "Container vs Image", "Docker Compose for multi-container apps", "Volume mounting & environment variables"],
            resources: [
              { title: "Docker Getting Started Guide", url: "https://docs.docker.com/get-started/", type: "Official Docs" },
              { title: "Docker for Beginners", url: "https://docker-curriculum.com/", type: "Beginner Friendly" }
            ]
          },
          {
            id: "node-fs-05-deploy",
            title: "CI/CD Pipelines & Cloud Hosting",
            simpleExplanation: "CI/CD (Continuous Integration / Continuous Deployment) automates building, testing, and deploying your code every time you push to GitHub. You deploy frontends to Vercel/Netlify, databases to AWS RDS/Supabase, and backends to Render/AWS EC2.",
            whyItMatters: "Manual deployments are slow, error-prone, and risky. Automating deployments ensures high availability and lets teams ship features faster.",
            keyConcepts: ["GitHub Actions workflow pipelines", "Deploying static websites (Vercel/Render)", "Environment configuration in production", "Monitoring, SSL certificates, & domain setups"],
            resources: [
              { title: "GitHub Actions Introduction", url: "https://docs.github.com/en/actions", type: "Best Starting Point" },
              { title: "Deploying Fullstack Apps on Render", url: "https://render.com/docs", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "ai-ml-engineer",
    title: "AI/ML Engineer",
    description: "Build intelligent systems using LLMs, agents, embeddings, RAG, multimodal AI, and production-ready AI applications.",
    timeline: "8–12 Months",
    difficulty: "Intermediate",
    iconName: "BrainCircuit",
    importanceDescription: "AI Engineers are building the future of intelligent systems. From ChatGPT-like assistants to recommendation systems, healthcare AI, autonomous workflows, and modern productivity tools—AI engineers are among the highest leverage builders of the next decade.",
    importanceStats: [
      { label: "High Industry Demand", icon: "TrendingUp" },
      { label: "Top Paying Role", icon: "DollarSign" },
      { label: "Future-Proof Skillset", icon: "ShieldCheck" },
      { label: "Build Real Products", icon: "Rocket" }
    ],
    chapters: [
      {
        id: "chapter-ai-01",
        title: "Introduction to AI Engineering",
        nodes: [
          {
            id: "node-ai-01-introduction",
            title: "What is an AI Engineer?",
            simpleExplanation: "An AI Engineer builds smart systems that can understand, generate, or automate tasks using artificial intelligence. Think: ChatGPT, recommendation systems, voice assistants, automation tools.",
            whyItMatters: "Understanding this helps you know what career you are preparing for before learning technical skills. It clarifies the difference between building models from scratch (ML/Research) vs. building products using existing APIs (AI Engineering).",
            keyConcepts: [
              "What AI engineers do",
              "Difference between AI & ML",
              "Real-world applications",
              "Product-oriented AI building"
            ],
            resources: [
              { title: "What is an AI Engineer?", url: "https://www.latent.space/p/ai-engineer", type: "Best Starting Point" },
              { title: "AI vs ML Engineer", url: "https://en.wikipedia.org/wiki/Artificial_intelligence", type: "Beginner Friendly" }
            ]
          },
          {
            id: "node-ai-02-terminology",
            title: "AI Terminology",
            simpleExplanation: "Every industry has its jargon. Before you build AI, you need to speak the language: LLMs, Tokens, Embeddings, RAG, and Agents.",
            whyItMatters: "You cannot read documentation or follow tutorials if you don't know the core vocabulary of the ecosystem.",
            keyConcepts: [
              "AI vs AGI",
              "LLMs (Large Language Models)",
              "Inference vs Training",
              "RAG (Retrieval-Augmented Generation)",
              "Embeddings & Vector Databases",
              "AI Agents"
            ],
            resources: [
              { title: "Generative AI Glossary", url: "https://developers.google.com/machine-learning/glossary", type: "Official Docs" },
              { title: "Understanding LLMs", url: "https://www.ibm.com/topics/large-language-models", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-02",
        title: "Pre-Trained Models",
        nodes: [
          {
            id: "node-ai-03-pretrained-models",
            title: "Understanding Pre-Trained Models",
            simpleExplanation: "Instead of training a multi-million dollar AI model yourself, you borrow an existing 'Pre-Trained' model (like GPT-4 or Claude 3) and build your app around it.",
            whyItMatters: "Knowing which model to pick for your specific feature determines how fast, cheap, and smart your application will be.",
            keyConcepts: [
              "Benefits of Pre-trained Models",
              "Context Window / Token Limits",
              "Cut-off Dates & Knowledge gaps",
              "Major Players: OpenAI, Anthropic, Google, Mistral"
            ],
            resources: [
              { title: "Introduction to Foundation Models", url: "https://crfm.stanford.edu/", type: "Best Starting Point" },
              { title: "Hugging Face Models", url: "https://huggingface.co/models", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-03",
        title: "OpenAI API & Prompt Engineering",
        nodes: [
          {
            id: "node-ai-04-openai",
            title: "OpenAI Platform",
            simpleExplanation: "The OpenAI API allows you to send code requests to ChatGPT's brain directly from your application.",
            whyItMatters: "This is the core building block of 90% of modern AI applications. Mastering this API is step one.",
            keyConcepts: [
              "Chat Completions API",
              "Writing system prompts",
              "Maximum Tokens & Token Counting",
              "Pricing & Cost Management"
            ],
            resources: [
              { title: "OpenAI Quickstart", url: "https://platform.openai.com/docs/quickstart", type: "Official Docs" },
              { title: "Token Pricing Tool", url: "https://openai.com/pricing", type: "Practice Resource" }
            ]
          },
          {
            id: "node-ai-05-prompt-eng",
            title: "Prompt Engineering",
            simpleExplanation: "Prompt Engineering is the art of giving the AI exact, structured instructions to get reliable, programmatic outputs (like JSON) instead of random conversation.",
            whyItMatters: "If your app asks the AI to summarize an article, you need to guarantee the AI doesn't start hallucinating or outputting weird formats that break your code.",
            keyConcepts: [
              "OpenAI Playground testing",
              "Prompt Design Basics",
              "Few-shot vs Zero-shot prompting",
              "System vs User messages"
            ],
            resources: [
              { title: "OpenAI Prompting Guide", url: "https://platform.openai.com/docs/guides/prompt-engineering", type: "Official Docs" },
              { title: "Learn Prompting", url: "https://learnprompting.org/", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-04",
        title: "AI Safety & Ethics",
        nodes: [
          {
            id: "node-ai-06-safety",
            title: "Safe AI Development",
            simpleExplanation: "Making sure users can't trick your AI into saying something offensive, leaking data, or performing malicious actions.",
            whyItMatters: "If you build an AI customer support bot, you must ensure users can't 'prompt inject' it into giving away free refunds or swearing.",
            keyConcepts: [
              "Prompt Injection Attacks",
              "Security & Privacy Concerns",
              "OpenAI Moderation API",
              "Prompt Guardrails & Adversarial Testing"
            ],
            resources: [
              { title: "OpenAI Safety Best Practices", url: "https://platform.openai.com/docs/guides/safety-best-practices", type: "Official Docs" },
              { title: "OWASP Top 10 for LLMs", url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-05",
        title: "Open Source AI",
        nodes: [
          {
            id: "node-ai-07-open-source",
            title: "Open Source Models",
            simpleExplanation: "Instead of paying OpenAI, you can download free models to your own computer or servers using tools like HuggingFace and Ollama.",
            whyItMatters: "Open source allows for total data privacy, free usage, and extreme customization. Essential for enterprise roles.",
            keyConcepts: [
              "Finding models on Hugging Face Hub",
              "Using Transformers.js",
              "Running local models with Ollama",
              "Inference SDKs"
            ],
            resources: [
              { title: "Ollama Quickstart", url: "https://ollama.com/", type: "Best Starting Point" },
              { title: "Hugging Face Course", url: "https://huggingface.co/learn/nlp-course/chapter1/1", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-06",
        title: "Embeddings & Vector Databases",
        nodes: [
          {
            id: "node-ai-08-embeddings",
            title: "Embeddings",
            simpleExplanation: "Embeddings are a way to convert text (or images) into a list of numbers so the computer can mathematically understand 'meaning' and 'similarity'.",
            whyItMatters: "This is the secret sauce behind modern search engines, recommendation systems, and AI memory.",
            keyConcepts: [
              "What are Embeddings",
              "Semantic Search",
              "Data Classification",
              "Generating embeddings with OpenAI"
            ],
            resources: [
              { title: "OpenAI Embeddings Docs", url: "https://platform.openai.com/docs/guides/embeddings", type: "Official Docs" },
              { title: "Understanding Embeddings", url: "https://vickiboykis.com/what_are_embeddings/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-ai-10-vector-db",
            title: "Vector Databases",
            simpleExplanation: "A special type of database designed specifically to store and search through millions of embeddings (number lists) instantly.",
            whyItMatters: "Standard SQL databases are bad at 'find text similar in meaning to this'. Vector DBs like Pinecone or Chroma do this in milliseconds.",
            keyConcepts: [
              "Purpose of Vector DBs",
              "Storing & Indexing",
              "Similarity Search (Cosine similarity)",
              "Popular DBs: Pinecone, Chroma, Qdrant"
            ],
            resources: [
              { title: "Chroma DB Quickstart", url: "https://docs.trychroma.com/getting-started", type: "Official Docs" },
              { title: "Pinecone Learning Center", url: "https://www.pinecone.io/learn/", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-07",
        title: "RAG Systems",
        nodes: [
          {
            id: "node-ai-11-rag",
            title: "Retrieval-Augmented Generation (RAG)",
            simpleExplanation: "RAG is a technique where you search a Vector DB for your company's private documents, and then inject those documents into the AI's prompt so it can answer questions about your specific data.",
            whyItMatters: "ChatGPT doesn't know about your company's internal HR policies. RAG allows you to build a chatbot that does, without retraining the whole model.",
            keyConcepts: [
              "RAG vs Fine-Tuning",
              "Document Chunking",
              "Retrieval Pipeline",
              "Using LangChain or LlamaIndex"
            ],
            resources: [
              { title: "LangChain RAG Guide", url: "https://python.langchain.com/docs/use_cases/question_answering/", type: "Official Docs" },
              { title: "RAG Explained Simply", url: "https://www.promptingguide.ai/techniques/rag", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-08",
        title: "AI Agents",
        nodes: [
          {
            id: "node-ai-12-agents",
            title: "AI Agents",
            simpleExplanation: "Agents are AI programs that don't just chat—they are given 'Tools' (like internet access, calculators, or APIs) and allowed to think and act autonomously to solve a goal.",
            whyItMatters: "Agents represent the transition from AI as a 'chatbot' to AI as a 'digital worker'. This is the cutting edge of AI Engineering.",
            keyConcepts: [
              "Agentic Use Cases",
              "OpenAI Function Calling (Tools)",
              "ReAct Prompting (Reason + Act)",
              "Multi-step autonomous reasoning"
            ],
            resources: [
              { title: "OpenAI Tool Calling", url: "https://platform.openai.com/docs/guides/function-calling", type: "Official Docs" },
              { title: "Intro to AI Agents", url: "https://lilianweng.github.io/posts/2023-06-23-agent/", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-09",
        title: "Multimodal AI",
        nodes: [
          {
            id: "node-ai-13-multimodal",
            title: "Multimodal Systems",
            simpleExplanation: "AI that can see images, hear audio, and speak, rather than just reading and writing text.",
            whyItMatters: "Allows you to build apps that can analyze medical X-rays, transcribe podcasts, or generate art dynamically.",
            keyConcepts: [
              "Image Understanding (Vision API)",
              "Image Generation (DALL-E)",
              "Speech-to-Text (Whisper API)",
              "Text-to-Speech"
            ],
            resources: [
              { title: "OpenAI Vision Docs", url: "https://platform.openai.com/docs/guides/vision", type: "Official Docs" },
              { title: "Whisper API", url: "https://platform.openai.com/docs/guides/speech-to-text", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ai-10",
        title: "Development Tools",
        nodes: [
          {
            id: "node-ai-14-toolkit",
            title: "AI Development Toolkit",
            simpleExplanation: "The modern software tools and IDEs optimized for AI developers.",
            whyItMatters: "Using AI to write AI code speeds up development by 10x.",
            keyConcepts: [
              "Cursor IDE & VSC Extensions",
              "GitHub Copilot",
              "LangSmith & Tracing",
              "Prompt Engineering Environments"
            ],
            resources: [
              { title: "Cursor Editor", url: "https://cursor.sh/", type: "Best Starting Point" },
              { title: "GitHub Copilot", url: "https://github.com/features/copilot", type: "Practice Resource" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "product-manager",
    title: "Product Manager",
    description: "Lead product vision, strategy, user research, backlog grooming, and cross-functional execution.",
    timeline: "6–8 Months",
    difficulty: "Beginner Friendly",
    iconName: "Target",
    importanceDescription: "Product Managers connect user needs with business goals and technical feasibility. They define what to build, why to build it, and measure product success.",
    importanceStats: [
      { label: "High Executive Demand", icon: "TrendingUp" },
      { label: "Cross-Functional Leadership", icon: "Layout" },
      { label: "High Business Impact", icon: "Target" },
      { label: "Strategic Vision", icon: "Rocket" }
    ],
    chapters: [
      {
        id: "chapter-pm-01",
        title: "Product Strategy & Market Research",
        nodes: [
          {
            id: "node-pm-01-vision",
            title: "Product Vision & Strategy",
            simpleExplanation: "Define the long-term direction of a product and how it solves real market problems.",
            whyItMatters: "Without strategy, teams build feature bloat instead of high-value products.",
            keyConcepts: ["Value Proposition", "Competitive Analysis", "Market Sizing (TAM/SAM/SOM)", "Product Positioning"],
            resources: [
              { title: "Product Strategy Guide by Mind the Product", url: "https://www.mindtheproduct.com/", type: "Best Starting Point" },
              { title: "Reforge Product Frameworks", url: "https://www.reforge.com/blog", type: "Official Docs" }
            ]
          },
          {
            id: "node-pm-02-user-research",
            title: "User Research & Customer Interviews",
            simpleExplanation: "Conduct qualitative and quantitative research to uncover core user pain points.",
            whyItMatters: "Building what users actually need prevents costly product failures.",
            keyConcepts: ["User Personas", "Jobs to be Done (JTBD)", "Customer Interviewing", "Survey Design"],
            resources: [
              { title: "The Mom Test Summary", url: "https://www.momtestbook.com/", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-02",
        title: "Agile Execution & Roadmapping",
        nodes: [
          {
            id: "node-pm-03-roadmap",
            title: "Feature Prioritization & Roadmaps",
            simpleExplanation: "Decide what to build next using frameworks like RICE, Kano, and MoSCoW.",
            whyItMatters: "Engineering bandwidth is limited; prioritizing high-impact features is essential.",
            keyConcepts: ["RICE Framework", "Theme-based Roadmaps", "MVP Scope Definition", "Backlog Grooming"],
            resources: [
              { title: "Atlassian Product Roadmaps Guide", url: "https://www.atlassian.com/agile/product-management/roadmaps", type: "Official Docs" }
            ]
          },
          {
            id: "node-pm-04-scrum",
            title: "Agile, Scrum & PRD Writing",
            simpleExplanation: "Write clear Product Requirement Documents (PRDs) and manage sprint planning.",
            whyItMatters: "Ensures developers and designers have zero ambiguity during implementation.",
            keyConcepts: ["Writing User Stories", "Acceptance Criteria", "PRD Templates", "Sprint Ceremonies"],
            resources: [
              { title: "Scrum Guide", url: "https://scrumguides.org/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-03",
        title: "Product UX Wireframing & Design Alignment",
        nodes: [
          {
            id: "node-pm-05-wireframe",
            title: "Lo-Fi Wireframing for PMs",
            simpleExplanation: "Sketch basic screen layouts in Balsamiq or Figma to communicate product ideas visually.",
            whyItMatters: "A sketch saves hours of debate during product alignment meetings.",
            keyConcepts: ["Lo-Fi Wireframing", "User Journey Mapping", "Figma for Non-Designers"],
            resources: [
              { title: "Balsamiq Wireframing Guide", url: "https://balsamiq.com/learn/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-04",
        title: "Product Analytics & Growth Loops",
        nodes: [
          {
            id: "node-pm-06-metrics",
            title: "Product Analytics & North Star Metrics",
            simpleExplanation: "Track retention, activation, churn, and funnel conversion rates using Mixpanel or Amplitude.",
            whyItMatters: "Data-driven PMs make objective decisions to grow active users.",
            keyConcepts: ["North Star Metric", "AARRR Pirate Metrics", "Funnel Analysis", "Cohort Retention"],
            resources: [
              { title: "Mixpanel Product Analytics Guide", url: "https://mixpanel.com/blog/", type: "Practice Resource" }
            ]
          },
          {
            id: "node-pm-07-abtesting",
            title: "A/B Testing & Product Experiments",
            simpleExplanation: "Run statistical experiments to test new features before rolling out to 100% of users.",
            whyItMatters: "Validates hypotheses with real user behavior instead of guessing.",
            keyConcepts: ["A/B Test Design", "Statistical Significance", "Control vs Variant Groups"],
            resources: [
              { title: "Optimizely Experimentation Guide", url: "https://www.optimizely.com/optimization-glossary/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-05",
        title: "Product Launch & Career Readiness",
        nodes: [
          {
            id: "node-pm-08-gtm",
            title: "Go-to-Market Strategy & Product Launch",
            simpleExplanation: "Plan product releases with marketing, sales, customer support, and engineering teams.",
            whyItMatters: "Great products fail without a clear product launch and adoption strategy.",
            keyConcepts: ["Product Launch Checklist", "Release Notes", "Sales Enablement", "Beta Testing Programs"],
            resources: [
              { title: "Product Hunt Launch Guide", url: "https://www.producthunt.com/ship", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-pm-09-interview",
            title: "Product Management Case Study & Interviewing",
            simpleExplanation: "Master product design, product strategy, and metric calculation case studies for top tech interviews.",
            whyItMatters: "PM interviews rely heavily on structured framework responses (CIRCLES, BUS).",
            keyConcepts: ["CIRCLES Framework", "Product Design Interviewing", "Behavioral Interview Prep", "PM Portfolio"],
            resources: [
              { title: "Exponent PM Interview Prep", url: "https://www.tryexponent.com/", type: "Best Starting Point" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "ui-ux-designer",
    title: "UI/UX Designer",
    description: "Design beautiful, intuitive, accessible, and user-centric digital products.",
    timeline: "6–8 Months",
    difficulty: "Beginner Friendly",
    iconName: "PenTool",
    importanceDescription: "UI/UX Designers create intuitive, visually stunning web and mobile interfaces that feel seamless for users.",
    importanceStats: [
      { label: "High Design Demand", icon: "TrendingUp" },
      { label: "Figma & Design Systems", icon: "Layout" },
      { label: "User Centric", icon: "Target" },
      { label: "Portfolio Driven", icon: "PenTool" }
    ],
    chapters: [
      {
        id: "chapter-uiux-01",
        title: "UX Fundamentals & Cognitive Psychology",
        nodes: [
          {
            id: "node-uiux-01-foundations",
            title: "User Experience Foundations",
            simpleExplanation: "Understand cognitive psychology, usability heuristics, and mental models.",
            whyItMatters: "Great UI design is rooted in intuitive usability and seamless navigation.",
            keyConcepts: ["Nielsen Norman 10 Heuristics", "Laws of UX (Fitts, Hick, Miller)", "Mental Models", "Gestalt Principles"],
            resources: [
              { title: "Laws of UX", url: "https://lawsofux.com/", type: "Best Starting Point" },
              { title: "NN/g 10 Usability Heuristics", url: "https://www.nngroup.com/articles/ten-usability-heuristics/", type: "Official Docs" }
            ]
          },
          {
            id: "node-uiux-02-research",
            title: "User Research & Empathy Mapping",
            simpleExplanation: "Gather user insights through interviews, surveys, and competitive audits.",
            whyItMatters: "Designing without user data leads to subjective, biased interfaces.",
            keyConcepts: ["Empathy Maps", "User Personas", "Journey Mapping", "Card Sorting"],
            resources: [
              { title: "Interaction Design Foundation User Research Guide", url: "https://www.interaction-design.org/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-uiux-02",
        title: "Information Architecture & Wireframing",
        nodes: [
          {
            id: "node-uiux-03-ia",
            title: "Information Architecture & Site Maps",
            simpleExplanation: "Structure content logically so users can navigate without getting lost.",
            whyItMatters: "Clear hierarchy prevents user confusion and drop-offs.",
            keyConcepts: ["Navigation Patterns", "Site Maps", "Tree Testing", "Content Hierarchy"],
            resources: [
              { title: "Information Architecture Institute", url: "https://www.iainstitute.org/", type: "Official Docs" }
            ]
          },
          {
            id: "node-uiux-04-wireframing",
            title: "Wireframing & Lo-Fi Prototyping",
            simpleExplanation: "Create low-fidelity structural sketches before jumping into visual details.",
            whyItMatters: "Allows rapid iteration on core navigation and layout structure.",
            keyConcepts: ["Paper Prototyping", "Balsamiq / Figma Lo-Fi", "Grid Systems", "Layout Hierarchy"],
            resources: [
              { title: "Figma Wireframing Basics", url: "https://www.figma.com/resource-library/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-uiux-03",
        title: "Visual UI Design & Typography",
        nodes: [
          {
            id: "node-uiux-05-typography",
            title: "Color Theory & Typography Scales",
            simpleExplanation: "Master font pairing, typographic hierarchy, color contrast ratios, and visual balance.",
            whyItMatters: "Typography makes up 90% of web interface design.",
            keyConcepts: ["Type Scales", "Font Pairing", "Color Psychology", "WCAG Contrast Ratios"],
            resources: [
              { title: "Refactoring UI Book Insights", url: "https://www.refactoringui.com/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-uiux-06-figma",
            title: "Mastering Figma & Auto Layout",
            simpleExplanation: "Master modern UI design tools, Auto Layout, component variants, and interactive prototypes.",
            whyItMatters: "Figma is the industry standard for collaborative product design.",
            keyConcepts: ["Auto Layout 5.0", "Component Sets & Variants", "Interactive Components", "Color & Typography Tokens"],
            resources: [
              { title: "Figma Official Learn Hub", url: "https://help.figma.com/hc/en-us/categories/360002051613-Learn-Figma", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-uiux-04",
        title: "Design Systems & Accessibility",
        nodes: [
          {
            id: "node-uiux-07-design-systems",
            title: "Design Systems & Component Libraries",
            simpleExplanation: "Build scalable design systems with standard tokens, typography scales, and accessibility compliance.",
            whyItMatters: "Design systems enable teams to maintain visual consistency across massive apps.",
            keyConcepts: ["Design Tokens", "WCAG Accessibility Guidelines", "Dark Mode Tokens", "Developer Handoff"],
            resources: [
              { title: "Material Design 3", url: "https://m3.material.io/", type: "Official Docs" },
              { title: "Apple Human Interface Guidelines", url: "https://developer.apple.com/design/human-interface-guidelines/", type: "Official Docs" }
            ]
          },
          {
            id: "node-uiux-08-portfolio",
            title: "UI/UX Case Studies & Portfolio Building",
            simpleExplanation: "Document your design process in 2-3 detailed case studies that showcase problem-solving skills.",
            whyItMatters: "Design recruiters hire based on how you solve problems, not just final pretty screens.",
            keyConcepts: ["Case Study Structure", "Before/After Iterations", "Usability Testing Results", "Portfolio Hosting"],
            resources: [
              { title: "Bestfolio UI/UX Examples", url: "https://bestfolios.com/", type: "Practice Resource" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    description: "Turn raw data into actionable business insights using SQL, Python, Excel, and interactive dashboards.",
    timeline: "6–8 Months",
    difficulty: "Beginner Friendly",
    iconName: "BarChart3",
    importanceDescription: "Data Analysts bridge raw databases with business decision-making through SQL queries, statistical analysis, and interactive dashboards.",
    importanceStats: [
      { label: "High Industry Need", icon: "TrendingUp" },
      { label: "SQL & Visualization", icon: "BarChart3" },
      { label: "Business Intelligence", icon: "Target" },
      { label: "Entry-Level Friendly", icon: "GraduationCap" }
    ],
    chapters: [
      {
        id: "chapter-da-01",
        title: "SQL & Relational Databases",
        nodes: [
          {
            id: "node-da-01-sql",
            title: "Mastering SQL Queries",
            simpleExplanation: "Extract, filter, join, and aggregate data from PostgreSQL and MySQL databases.",
            whyItMatters: "SQL is the #1 required skill for every data professional.",
            keyConcepts: ["SELECT, WHERE, GROUP BY", "JOINs (Inner, Left, Right, Full)", "Subqueries & CTEs", "Window Functions (RANK, OVER)"],
            resources: [
              { title: "Mode Analytics SQL Tutorial", url: "https://mode.com/sql-tutorial/", type: "Best Starting Point" },
              { title: "SQLZoo Practice", url: "https://sqlzoo.net/", type: "Practice Resource" }
            ]
          },
          {
            id: "node-da-02-advanced-sql",
            title: "Advanced SQL & Database Optimization",
            simpleExplanation: "Write optimized queries, work with indexes, partition tables, and analyze query execution plans.",
            whyItMatters: "Slow queries paralyze production business intelligence dashboards.",
            keyConcepts: ["Indexes", "EXPLAIN ANALYZE", "Database Views", "Stored Procedures"],
            resources: [
              { title: "PostgreSQL Official Documentation", url: "https://www.postgresql.org/docs/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-da-02",
        title: "Python Data Analysis & Cleaning",
        nodes: [
          {
            id: "node-da-03-pandas",
            title: "Data Manipulation with Pandas & NumPy",
            simpleExplanation: "Clean messy real-world datasets, handle missing values, merge datasets, and manipulate DataFrames.",
            whyItMatters: "80% of data work involves cleaning and preparing data for analysis.",
            keyConcepts: ["DataFrames", "Handling Null Values", "Groupby & Pivots", "Time Series Analysis"],
            resources: [
              { title: "Pandas Documentation", url: "https://pandas.pydata.org/docs/user_guide/index.html", type: "Official Docs" }
            ]
          },
          {
            id: "node-da-04-eda",
            title: "Exploratory Data Analysis (EDA)",
            simpleExplanation: "Uncover patterns, spot anomalies, and test hypotheses using Matplotlib & Seaborn.",
            whyItMatters: "EDA transforms raw rows of numbers into meaningful stories.",
            keyConcepts: ["Histograms & Scatter Plots", "Correlation Matrices", "Outlier Detection", "Distribution Metrics"],
            resources: [
              { title: "Kaggle EDA Tutorials", url: "https://www.kaggle.com/learn", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-da-03",
        title: "Dashboards & Business Intelligence",
        nodes: [
          {
            id: "node-da-05-tableau",
            title: "Interactive Dashboards (Tableau / Power BI)",
            simpleExplanation: "Build interactive executive dashboards that highlight key business metrics.",
            whyItMatters: "Stakeholders prefer visual dashboards over raw data tables.",
            keyConcepts: ["Dashboard Storytelling", "Calculated Fields", "Filters & Parameters", "Publishing Reports"],
            resources: [
              { title: "Tableau Free Training", url: "https://www.tableau.com/learn/training", type: "Official Docs" },
              { title: "Power BI Learning Path", url: "https://learn.microsoft.com/en-us/power-bi/", type: "Official Docs" }
            ]
          },
          {
            id: "node-da-06-ab-metrics",
            title: "Business Metrics & A/B Testing",
            simpleExplanation: "Measure retention, CAC, LTV, conversion funnels, and run A/B test analysis.",
            whyItMatters: "Directly connects data analysis with business revenue and user growth.",
            keyConcepts: ["Cohort Analysis", "Customer Acquisition Cost (CAC)", "Lifetime Value (LTV)", "Hypothesis Testing"],
            resources: [
              { title: "Reforge Growth Metrics", url: "https://www.reforge.com/", type: "Best Starting Point" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "data-scientist",
    title: "Data Scientist",
    description: "Turn raw data into predictive intelligence using advanced analytics, statistics, machine learning, and deep learning.",
    timeline: "7–10 Months",
    difficulty: "Beginner Friendly → Intermediate",
    iconName: "BarChart3",
    importanceDescription: "Data Scientists combine computer science, mathematics, and domain knowledge to build predictive models and extract deep intelligence.",
    importanceStats: [
      { label: "Top Tech Role", icon: "TrendingUp" },
      { label: "Machine Learning", icon: "BrainCircuit" },
      { label: "Predictive Analytics", icon: "BarChart3" },
      { label: "High Earning Potential", icon: "Target" }
    ],
    chapters: [
      {
        id: "chapter-ds-01",
        title: "Mathematics & Statistics Foundations",
        nodes: [
          {
            id: "node-ds-01-stats",
            title: "Applied Statistics & Probability",
            simpleExplanation: "Master hypothesis testing, probability distributions, regression models, and confidence intervals.",
            whyItMatters: "Statistical foundation ensures machine learning models produce reliable conclusions.",
            keyConcepts: ["p-values & Hypothesis Testing", "Normal Distribution", "Linear & Logistic Regression", "A/B Testing Math"],
            resources: [
              { title: "StatQuest with Josh Starmer", url: "https://statquest.org/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-ds-02-linear-algebra",
            title: "Linear Algebra & Calculus for ML",
            simpleExplanation: "Understand matrix multiplication, eigenvectors, gradient descent, and partial derivatives.",
            whyItMatters: "All neural networks and machine learning models are fundamentally linear algebra operations.",
            keyConcepts: ["Vectors & Matrices", "Eigenvalues & Eigenvectors", "Gradient Descent Optimization", "Cost Functions"],
            resources: [
              { title: "3Blue1Brown Essence of Linear Algebra", url: "https://www.3blue1brown.com/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-ds-02",
        title: "Supervised & Unsupervised Machine Learning",
        nodes: [
          {
            id: "node-ds-03-sklearn",
            title: "Supervised Learning Algorithms",
            simpleExplanation: "Train models like Decision Trees, Random Forests, Gradient Boosting (XGBoost), and Support Vector Machines.",
            whyItMatters: "Supervised learning predicts outcomes based on historical labeled training data.",
            keyConcepts: ["Train/Test Split", "Cross-Validation", "Overfitting & Regularization (L1/L2)", "ROC-AUC & F1 Score"],
            resources: [
              { title: "Scikit-Learn User Guide", url: "https://scikit-learn.org/stable/user_guide.html", type: "Official Docs" }
            ]
          },
          {
            id: "node-ds-04-clustering",
            title: "Unsupervised Learning & Dimensionality Reduction",
            simpleExplanation: "Group unlabeled data using K-Means, Hierarchical Clustering, and PCA (Principal Component Analysis).",
            whyItMatters: "Discovers hidden customer segments and reduces high-dimensional data noise.",
            keyConcepts: ["K-Means Clustering", "PCA", "t-SNE", "Anomaly Detection"],
            resources: [
              { title: "Kaggle Machine Learning Course", url: "https://www.kaggle.com/learn/intro-to-machine-learning", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-ds-03",
        title: "Deep Learning & Model Deployment",
        nodes: [
          {
            id: "node-ds-05-deep-learning",
            title: "Neural Networks with PyTorch / TensorFlow",
            simpleExplanation: "Build multi-layer perceptrons, Convolutional Neural Networks (CNNs), and Recurrent Neural Networks (RNNs).",
            whyItMatters: "Deep learning powers modern computer vision, speech recognition, and generative AI.",
            keyConcepts: ["Backpropagation", "Activation Functions (ReLU, Softmax)", "CNNs for Images", "PyTorch Tensors"],
            resources: [
              { title: "PyTorch Official Tutorials", url: "https://pytorch.org/tutorials/", type: "Official Docs" },
              { title: "Fast.ai Deep Learning Course", url: "https://www.fast.ai/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-ds-06-mlops",
            title: "MLOps & Model Deployment (FastAPI, MLflow)",
            simpleExplanation: "Deploy trained machine learning models as REST APIs using Docker, FastAPI, and MLflow model registry.",
            whyItMatters: "A model stuck in a Jupyter Notebook provides zero business value until deployed.",
            keyConcepts: ["FastAPI Model Serving", "MLflow Experiment Tracking", "Model Drift", "Docker for ML"],
            resources: [
              { title: "MLflow Documentation", url: "https://mlflow.org/docs/latest/index.html", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "devops-engineer",
    title: "DevOps Engineer",
    description: "Automate, deploy, scale, and maintain cloud infrastructure and CI/CD pipelines.",
    timeline: "7–10 Months",
    difficulty: "Intermediate",
    iconName: "CloudCog",
    importanceDescription: "DevOps Engineers bridge software development and IT operations to enable rapid, reliable software releases through automation.",
    importanceStats: [
      { label: "Critical Cloud Role", icon: "CloudCog" },
      { label: "Docker & Kubernetes", icon: "Layers" },
      { label: "CI/CD Automation", icon: "TrendingUp" },
      { label: "High Demand", icon: "Target" }
    ],
    chapters: [
      {
        id: "chapter-devops-01",
        title: "Linux & Shell Automation",
        nodes: [
          {
            id: "node-devops-01-linux",
            title: "Linux Systems Administration & Bash Scripting",
            simpleExplanation: "Navigate the Linux CLI, manage permissions, write automation scripts, and manage system processes.",
            whyItMatters: "99% of cloud infrastructure runs on Linux servers.",
            keyConcepts: ["Linux Permissions & Systemd", "Bash Shell Scripting", "SSH & Key Authentication", "Networking (IP, Ports, DNS)"],
            resources: [
              { title: "Linux Journey", url: "https://linuxjourney.com/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-devops-02",
        title: "Containers & Orchestration",
        nodes: [
          {
            id: "node-devops-02-docker",
            title: "Containerization with Docker",
            simpleExplanation: "Package applications with all their dependencies into lightweight, isolated containers.",
            whyItMatters: "Eliminates 'it works on my machine' issues across dev and prod.",
            keyConcepts: ["Dockerfiles", "Docker Compose", "Multi-stage Builds", "Container Volumes & Networks"],
            resources: [
              { title: "Docker Official Docs", url: "https://docs.docker.com/get-started/", type: "Official Docs" }
            ]
          },
          {
            id: "node-devops-03-k8s",
            title: "Kubernetes Container Orchestration",
            simpleExplanation: "Manage cluster deployments, auto-scaling, load balancing, and self-healing for containerized apps.",
            whyItMatters: "Kubernetes is the industry standard for production container management.",
            keyConcepts: ["Pods & Deployments", "Services & Ingress", "ConfigMaps & Secrets", "Helm Charts"],
            resources: [
              { title: "Kubernetes Basics Guide", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-devops-03",
        title: "CI/CD & Infrastructure as Code",
        nodes: [
          {
            id: "node-devops-04-cicd",
            title: "CI/CD Pipelines (GitHub Actions / Jenkins)",
            simpleExplanation: "Automate testing, building, and deployment every time code is pushed to Git.",
            whyItMatters: "Enables continuous integration and seamless deployment to staging/production.",
            keyConcepts: ["Workflows & Jobs", "Secrets Management", "Automated Testing Triggers", "Deployment Strategies"],
            resources: [
              { title: "GitHub Actions Documentation", url: "https://docs.github.com/en/actions", type: "Official Docs" }
            ]
          },
          {
            id: "node-devops-05-terraform",
            title: "Infrastructure as Code (Terraform)",
            simpleExplanation: "Provision cloud infrastructure (VMs, DBs, Networks) using code configurations.",
            whyItMatters: "Version controls infrastructure deployment so environments can be recreated in minutes.",
            keyConcepts: ["Terraform State", "Providers (AWS/Azure)", "Modules", "Plan & Apply Workflows"],
            resources: [
              { title: "HashiCorp Terraform Tutorials", url: "https://developer.hashicorp.com/terraform/tutorials", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-devops-04",
        title: "Cloud Platforms & Monitoring",
        nodes: [
          {
            id: "node-devops-06-aws",
            title: "AWS Cloud Core (EC2, S3, RDS, IAM)",
            simpleExplanation: "Configure Amazon Web Services cloud compute, storage, databases, and IAM access controls.",
            whyItMatters: "AWS is the leading enterprise cloud infrastructure provider.",
            keyConcepts: ["EC2 Virtual Machines", "S3 Object Storage", "RDS Relational DBs", "VPC & Subnets"],
            resources: [
              { title: "AWS Skill Builder", url: "https://explore.skillbuilder.aws/", type: "Official Docs" }
            ]
          },
          {
            id: "node-devops-07-observability",
            title: "Monitoring & Observability (Prometheus & Grafana)",
            simpleExplanation: "Set up real-time server metrics, log aggregation, and alerting dashboards.",
            whyItMatters: "Detects system downtime before users notice.",
            keyConcepts: ["Prometheus Metrics", "Grafana Dashboards", "Log Aggregation (ELK Stack)", "Alertmanager"],
            resources: [
              { title: "Prometheus Documentation", url: "https://prometheus.io/docs/introduction/overview/", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    description: "Protect applications, networks, and enterprise assets against security threats and cyber attacks.",
    timeline: "8–10 Months",
    difficulty: "Intermediate",
    iconName: "ShieldCheck",
    importanceDescription: "Cybersecurity specialists safeguard critical enterprise infrastructure, user privacy, and applications from cyber threats.",
    importanceStats: [
      { label: "Zero-Unemployment Role", icon: "ShieldCheck" },
      { label: "Web App Security", icon: "Target" },
      { label: "Ethical Hacking", icon: "Terminal" },
      { label: "High Responsibility", icon: "TrendingUp" }
    ],
    chapters: [
      {
        id: "chapter-cyber-01",
        title: "Networking & Security Fundamentals",
        nodes: [
          {
            id: "node-cyber-01-network",
            title: "Computer Networking & Protocols",
            simpleExplanation: "Understand OSI 7-Layer model, TCP/IP, DNS, HTTP/HTTPS, and Wireshark packet capture.",
            whyItMatters: "You cannot defend what you don't understand network-wise.",
            keyConcepts: ["OSI & TCP/IP Model", "Packet Analysis", "Firewalls & VPNs", "SSL/TLS Handshake"],
            resources: [
              { title: "TryHackMe Networking Fundamentals", url: "https://tryhackme.com/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-cyber-02-sysadmin",
            title: "Linux & Windows Security Hardening",
            simpleExplanation: "Configure file permissions, audit logs, manage user privileges, and disable vulnerable services.",
            whyItMatters: "System hardening minimizes attack surface area for potential intruders.",
            keyConcepts: ["Principle of Least Privilege", "Linux File Permissions", "Windows Active Directory Basics", "SSH Hardening"],
            resources: [
              { title: "CIS Benchmarks", url: "https://www.cisecurity.org/benchmark", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-cyber-02",
        title: "Web Security & Penetration Testing",
        nodes: [
          {
            id: "node-cyber-03-owasp",
            title: "OWASP Top 10 Web Vulnerabilities",
            simpleExplanation: "Identify and exploit common web vulnerabilities like SQL Injection, XSS, CSRF, and SSRF.",
            whyItMatters: "OWASP Top 10 covers the most dangerous security threats in modern web apps.",
            keyConcepts: ["SQL Injection (SQLi)", "Cross-Site Scripting (XSS)", "Broken Authentication", "Burp Suite Basics"],
            resources: [
              { title: "OWASP Top 10 Official Guide", url: "https://owasp.org/www-project-top-ten/", type: "Official Docs" },
              { title: "PortSwigger Web Security Academy", url: "https://portswigger.net/web-security", type: "Practice Resource" }
            ]
          },
          {
            id: "node-cyber-04-[#pentest]",
            title: "Penetration Testing & Reconnaissance",
            simpleExplanation: "Perform network scanning, vulnerability assessment, and exploit testing using Nmap, Metasploit, and Wireshark.",
            whyItMatters: "Simulating real cyber attacks reveals weaknesses before black-hat hackers find them.",
            keyConcepts: ["Information Gathering", "Nmap Port Scanning", "Vulnerability Scanning", "Metasploit Basics"],
            resources: [
              { title: "Hack The Box Academy", url: "https://academy.hackthebox.com/", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-cyber-03",
        title: "Cryptography & Incident Defense",
        nodes: [
          {
            id: "node-cyber-05-crypto",
            title: "Applied Cryptography & PKI",
            simpleExplanation: "Understand symmetric/asymmetric encryption, hashing (SHA-256), and digital signatures.",
            whyItMatters: "Cryptography protects data in transit and data at rest from unauthorized exposure.",
            keyConcepts: ["AES vs RSA Encryption", "Hashing Functions", "Public Key Infrastructure (PKI)", "TLS Certificates"],
            resources: [
              { title: "Crypto101 Guide", url: "https://www.crypto101.io/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-cyber-06-incident",
            title: "Incident Response & Security Operations (SOC)",
            simpleExplanation: "Detect cyber intrusions, analyze malware signatures, and respond to security breaches using SIEM tools.",
            whyItMatters: "Fast incident response minimizes business damage during active cyber attacks.",
            keyConcepts: ["SIEM (Splunk/Elastic)", "Log Analysis", "Incident Response Lifecycle", "Threat Intelligence"],
            resources: [
              { title: "SANS Institute Incident Handler Guide", url: "https://www.sans.org/", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    description: "Master computer science fundamentals, data structures, algorithms, object-oriented design, and scalable system architecture.",
    timeline: "8–12 Months",
    difficulty: "Intermediate",
    iconName: "Terminal",
    importanceDescription: "Software Engineers solve complex architectural problems, build fault-tolerant systems, and craft robust software at scale.",
    importanceStats: [
      { label: "Core Industry Role", icon: "Terminal" },
      { label: "DSA & System Design", icon: "Layers" },
      { label: "High Demand", icon: "TrendingUp" },
      { label: "Global Opportunities", icon: "Target" }
    ],
    chapters: [
      {
        id: "chapter-swe-01",
        title: "Data Structures & Time Complexity",
        nodes: [
          {
            id: "node-swe-01-dsa",
            title: "Core Data Structures & Big-O Notation",
            simpleExplanation: "Master Big-O time and space complexity for Arrays, Strings, Linked Lists, Stacks, and Queues.",
            whyItMatters: "Essential for writing efficient code and passing technical coding interviews.",
            keyConcepts: ["Big-O Complexity (Time & Space)", "Two Pointers Technique", "Sliding Window", "Recursion Basics"],
            resources: [
              { title: "NeetCode 150 Roadmap", url: "https://neetcode.io/", type: "Best Starting Point" },
              { title: "LeetCode Practice", url: "https://leetcode.com/", type: "Practice Resource" }
            ]
          },
          {
            id: "node-swe-02-trees-graphs",
            title: "Trees, Graphs & Dynamic Programming",
            simpleExplanation: "Master Binary Search Trees, Graph Traversal (DFS/BFS), Hash Tables, and Dynamic Programming.",
            whyItMatters: "Graph and DP algorithms solve complex real-world routing and optimization problems.",
            keyConcepts: ["Binary Search Trees", "DFS & BFS Traversal", "Hash Table Collisions", "Memoization & DP"],
            resources: [
              { title: "GeeksforGeeks DSA Guide", url: "https://www.geeksforgeeks.org/data-structures/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-swe-02",
        title: "Object-Oriented Design & Clean Code",
        nodes: [
          {
            id: "node-swe-03-solid",
            title: "SOLID Principles & Design Patterns",
            simpleExplanation: "Write clean, modular, maintainable software using SOLID principles and GoF design patterns.",
            whyItMatters: "Clean code allows large teams to work on codebases without breaking existing functionality.",
            keyConcepts: ["SOLID Principles", "Factory Pattern", "Singleton & Observer Patterns", "Clean Code Rules"],
            resources: [
              { title: "Refactoring.Guru Design Patterns", url: "https://refactoring.guru/design-patterns", type: "Best Starting Point" }
            ]
          }
        ]
      },
      {
        id: "chapter-swe-03",
        title: "System Design & Distributed Architecture",
        nodes: [
          {
            id: "node-swe-04-system-design",
            title: "High-Level System Design (HLD)",
            simpleExplanation: "Design high-availability systems with Load Balancers, Caching, Databases, and Messaging Queues.",
            whyItMatters: "Distinguishes mid-level engineers from senior architects building scalable web apps.",
            keyConcepts: ["Load Balancing", "Redis Caching", "Database Sharding & Replication", "Kafka Message Queues"],
            resources: [
              { title: "System Design Primer by Donne Martin", url: "https://github.com/donnemartin/system-design-primer", type: "Official Docs" },
              { title: "ByteByteGo System Design Newsletter", url: "https://bytebytego.com/", type: "Best Starting Point" }
            ]
          },
          {
            id: "node-swe-05-testing",
            title: "Software Testing & CI/CD Culture",
            simpleExplanation: "Write Unit Tests, Integration Tests, and automated deployment pipelines.",
            whyItMatters: "Automated tests prevent bugs from breaking live customer production apps.",
            keyConcepts: ["Unit Testing (Jest/PyTest)", "Test-Driven Development (TDD)", "Integration Tests", "CI/CD Deployment"],
            resources: [
              { title: "Martin Fowler Testing Pyramid", url: "https://martinfowler.com/articles/practical-test-pyramid.html", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  }
];

export const getFlatNodes = (roleId: string): RoadmapNodeData[] => {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return [];
  return role.chapters.flatMap(chapter => chapter.nodes);
};
