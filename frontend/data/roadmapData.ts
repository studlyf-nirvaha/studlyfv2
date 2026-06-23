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
    chapters: generateChapters("fullstack")
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
              "AI Code Editors (Cursor, Copilot)",
              "Accelerating workflows",
              "Debugging with AI"
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
    description: "Lead product vision, strategy, and execution.",
    timeline: "4–6 Months",
    difficulty: "Beginner Friendly",
    iconName: "Target",
    chapters: generateChapters("pm")
  },
  {
    id: "ui-ux-designer",
    title: "UI/UX Designer",
    description: "Design beautiful, user-centric digital experiences.",
    timeline: "4–6 Months",
    difficulty: "Beginner Friendly",
    iconName: "PenTool",
    chapters: generateChapters("uiux")
  },
  {
    id: "data-analyst",
    title: "Data Analyst",
    description: "Turn raw data into actionable business insights.",
    timeline: "5–7 Months",
    difficulty: "Beginner Friendly",
    iconName: "BarChart3",
    chapters: generateChapters("data")
  },
  {
    id: "devops-engineer",
    title: "DevOps Engineer",
    description: "Automate, deploy, and maintain cloud infrastructure.",
    timeline: "6–9 Months",
    difficulty: "Intermediate",
    iconName: "CloudCog",
    chapters: generateChapters("devops")
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    description: "Secure applications, networks, and organizational data.",
    timeline: "8–10 Months",
    difficulty: "Intermediate",
    iconName: "ShieldCheck",
    chapters: generateChapters("cyber")
  },
  {
    id: "software-engineer",
    title: "Software Engineer",
    description: "Master algorithms, data structures, and system design.",
    timeline: "8–12 Months",
    difficulty: "Intermediate",
    iconName: "Terminal",
    chapters: generateChapters("swe")
  }
];

export const getFlatNodes = (roleId: string): RoadmapNodeData[] => {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return [];
  return role.chapters.flatMap(chapter => chapter.nodes);
};
