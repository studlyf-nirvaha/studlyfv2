import { RoadmapChapter } from './roadmapData';

export interface SkillRoadmapData {
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

export const skillRoadmaps: Record<string, SkillRoadmapData> = {
  python: {
    id: "python",
    title: "Python Developer",
    description: "Master Python programming from syntax basics to writing scalable scripts, data pipelines, and advanced web applications.",
    timeline: "2-3 Months",
    difficulty: "Beginner Friendly",
    iconName: "Terminal",
    importanceDescription: "Python is one of the most versatile and widely-used programming languages in the world. It powers data science, machine learning, web scraping, automation, and robust backend APIs.",
    importanceStats: [
      { label: "AI & Data Science Standard", icon: "BrainCircuit" },
      { label: "Massive Global Ecosystem", icon: "Globe" },
      { label: "Beginner-Friendly Syntax", icon: "CheckCircle2" },
      { label: "High Industry Demand", icon: "TrendingUp" }
    ],
    chapters: [
      {
        id: "chapter-py-01",
        title: "Python Fundamentals",
        nodes: [
          {
            id: "py-node-1",
            title: "Syntax & Variables",
            simpleExplanation: "Learn how to store data using variables and understand Python's basic data types such as integers, floats, strings, and booleans.",
            whyItMatters: "Variables are the foundational building blocks of any computer program.",
            keyConcepts: ["Variables & Scope", "Strings & Operations", "Numeric Types", "Type Casting"],
            resources: [
              { title: "Python Official Tutorial", url: "https://docs.python.org/3/tutorial/introduction.html", type: "Official Docs" },
              { title: "Python Basics - W3Schools", url: "https://www.w3schools.com/python/", type: "Beginner Friendly" }
            ]
          },
          {
            id: "py-node-2",
            title: "Control Flow & Loops",
            simpleExplanation: "Control the path of your code execution using conditionals (if/else) and loop structures (for/while).",
            whyItMatters: "Control flow allows your program to make decisions and repeat processes dynamically.",
            keyConcepts: ["If/Elif/Else Statements", "For Loops & range()", "While Loops", "Break & Continue"],
            resources: [
              { title: "Control Flow - Python Docs", url: "https://docs.python.org/3/tutorial/controlflow.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-py-02",
        title: "Data Structures & Functions",
        nodes: [
          {
            id: "py-node-3",
            title: "Built-in Data Collections",
            simpleExplanation: "Master lists, tuples, sets, and dictionaries to organize and store collections of data efficiently.",
            whyItMatters: "Choosing the correct data structure is vital for writing clean, optimized, and performant code.",
            keyConcepts: ["Lists & List Comprehensions", "Dictionaries (Key-Value)", "Tuples (Immutability)", "Sets (Uniqueness)"],
            resources: [
              { title: "Data Structures - Python Docs", url: "https://docs.python.org/3/tutorial/datastructures.html", type: "Official Docs" },
              { title: "Python Data Structures Guide", url: "https://realpython.com/python-data-structures/", type: "Advanced Reading" }
            ]
          },
          {
            id: "py-node-4",
            title: "Functions & Modular Coding",
            simpleExplanation: "Learn to write reusable blocks of code using functions, parameters, return statements, and lambda expressions.",
            whyItMatters: "Functions prevent code duplication and make your codebase modular and easy to test.",
            keyConcepts: ["Def Keyword", "Arguments & Kwargs", "Return Values", "Lambda / Anonymous Functions"],
            resources: [
              { title: "Defining Functions - Python Docs", url: "https://docs.python.org/3/tutorial/controlflow.html#defining-functions", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-py-03",
        title: "Object-Oriented Programming (OOP)",
        nodes: [
          {
            id: "py-node-5",
            title: "Classes & Objects",
            simpleExplanation: "Model real-world entities using classes, instances, constructors (__init__), and attributes.",
            whyItMatters: "OOP is the primary paradigm used to build large, scalable software architectures.",
            keyConcepts: ["Classes & Instances", "The __init__ Constructor", "Self Parameter", "Instance Methods"],
            resources: [
              { title: "Python OOP - Real Python", url: "https://realpython.com/python3-object-oriented-programming/", type: "Beginner Friendly" },
              { title: "Classes - Python Docs", url: "https://docs.python.org/3/tutorial/classes.html", type: "Official Docs" }
            ]
          },
          {
            id: "py-node-6",
            title: "Inheritance & Polymorphism",
            simpleExplanation: "Learn how child classes inherit behaviors from parent classes and override methods for custom functionality.",
            whyItMatters: "Inheritance promotes code reuse, while polymorphism enables flexibility in application design.",
            keyConcepts: ["Method Overriding", "Super() Keyword", "Multiple Inheritance", "Abstract Base Classes"],
            resources: [
              { title: "Inheritance in Python", url: "https://docs.python.org/3/tutorial/classes.html#inheritance", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-py-04",
        title: "File Handling & Error Management",
        nodes: [
          {
            id: "py-node-7",
            title: "File I/O Operations",
            simpleExplanation: "Read and write data to external files (TXT, CSV, JSON) safely using context managers.",
            whyItMatters: "Applications must interact with persistent storage to load configurations, save logs, or process data.",
            keyConcepts: ["Open() Function", "Read/Write Modes", "With Context Manager", "CSV and JSON modules"],
            resources: [
              { title: "Reading & Writing Files", url: "https://docs.python.org/3/tutorial/inputoutput.html#reading-and-writing-files", type: "Official Docs" }
            ]
          },
          {
            id: "py-node-8",
            title: "Exception Handling",
            simpleExplanation: "Anticipate runtime issues and handle them gracefully using try, except, else, and finally blocks.",
            whyItMatters: "Graceful error handling prevents your application from crashing in production.",
            keyConcepts: ["Try / Except Blocks", "Catching Specific Exceptions", "Finally Block", "Raising Exceptions"],
            resources: [
              { title: "Errors & Exceptions - Python Docs", url: "https://docs.python.org/3/tutorial/errors.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-py-05",
        title: "Advanced Concepts & Tooling",
        nodes: [
          {
            id: "py-node-9",
            title: "Decorators & Generators",
            simpleExplanation: "Learn decorators to modify function behaviors dynamically, and generators to yield values lazily.",
            whyItMatters: "Generators save massive memory by processing large data streams one item at a time.",
            keyConcepts: ["First-class Functions", "Wrapper Functions", "Yield Keyword", "Lazy Evaluation"],
            resources: [
              { title: "Primer on Python Decorators", url: "https://realpython.com/primer-on-python-decorators/", type: "Advanced Reading" }
            ]
          },
          {
            id: "py-node-10",
            title: "Virtual Environments & Pip",
            simpleExplanation: "Manage third-party libraries and isolate project dependencies using pip and virtual environments (venv).",
            whyItMatters: "Dependency isolation ensures different projects don't conflict due to package version mismatches.",
            keyConcepts: ["Pip Install", "Requirements.txt", "Venv / Virtualenv", "Dependency Isolation"],
            resources: [
              { title: "Virtual Environments - Python Docs", url: "https://docs.python.org/3/tutorial/venv.html", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  java: {
    id: "java",
    title: "Java Developer",
    description: "Build robust, cross-platform enterprise software, desktop apps, and high-performance backend systems using Java.",
    timeline: "3-4 Months",
    difficulty: "Intermediate",
    iconName: "Database",
    importanceDescription: "Java is the language of choice for large corporations and enterprise web backends. Known for its 'Write Once, Run Anywhere' (WORA) philosophy, it is highly structured, performant, and reliable.",
    importanceStats: [
      { label: "Enterprise Scale Standard", icon: "ShieldCheck" },
      { label: "Strict Typing Security", icon: "Lock" },
      { label: "High Platform Portability", icon: "Layers" },
      { label: "Top Corporate Hiring", icon: "TrendingUp" }
    ],
    chapters: [
      {
        id: "chapter-jv-01",
        title: "Java Syntax & Basics",
        nodes: [
          {
            id: "jv-node-1",
            title: "JVM Architecture & Variables",
            simpleExplanation: "Learn how Java compiles to bytecode and runs on the JVM, and understand primitive and non-primitive variables.",
            whyItMatters: "Understanding JVM mechanics is key to writing high-performance Java code.",
            keyConcepts: ["JDK vs JRE vs JVM", "Bytecode compilation", "Java Data Types", "Variables & Scope"],
            resources: [
              { title: "Java Platform Overview", url: "https://docs.oracle.com/en/java/", type: "Official Docs" },
              { title: "Java Basics - W3Schools", url: "https://www.w3schools.com/java/", type: "Beginner Friendly" }
            ]
          },
          {
            id: "jv-node-2",
            title: "Control Statements",
            simpleExplanation: "Direct your application logic using conditional operators and loop structures.",
            whyItMatters: "Control structures form the logical pathways of your enterprise system.",
            keyConcepts: ["If/Else & Switch Cases", "For, While, Do-While Loops", "Break & Continue", "Arrays basics"],
            resources: [
              { title: "Java Control Flow Tutorial", url: "https://docs.oracle.com/javase/tutorial/java/nutsandbolts/flow.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-jv-02",
        title: "Object-Oriented Programming (OOP)",
        nodes: [
          {
            id: "jv-node-3",
            title: "Classes & Constructors",
            simpleExplanation: "Master the structure of classes, packages, object instantiation, and constructors.",
            whyItMatters: "Java is purely object-oriented; everything relies on classes.",
            keyConcepts: ["Classes and Objects", "Constructor Overloading", "Access Modifiers", "This keyword"],
            resources: [
              { title: "Classes & Objects - Oracle Docs", url: "https://docs.oracle.com/javase/tutorial/java/javaOO/classes.html", type: "Official Docs" }
            ]
          },
          {
            id: "jv-node-4",
            title: "Inheritance & Interfaces",
            simpleExplanation: "Implement parent-child class structures and build contracts using Java interfaces.",
            whyItMatters: "Interfaces allow you to write decoupleable, testable, and highly maintainable components.",
            keyConcepts: ["Extends vs Implements", "Abstract Classes", "Method Overriding vs Overloading", "Super Keyword"],
            resources: [
              { title: "Interfaces and Inheritance", url: "https://docs.oracle.com/javase/tutorial/java/IandI/index.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-jv-03",
        title: "Collections & Generics",
        nodes: [
          {
            id: "jv-node-5",
            title: "Java Collections Framework",
            simpleExplanation: "Master ArrayLists, HashSets, HashMaps, and Queues for data handling.",
            whyItMatters: "The collections framework is the utility backbone of data manipulation in Java.",
            keyConcepts: ["List & Set interfaces", "Map interface (HashMap)", "Queue & Deque", "Iterator pattern"],
            resources: [
              { title: "Collections Trail - Oracle Docs", url: "https://docs.oracle.com/javase/tutorial/collections/index.html", type: "Official Docs" }
            ]
          },
          {
            id: "jv-node-6",
            title: "Generics in Java",
            simpleExplanation: "Write class structures and methods that are type-safe and reusable across different data types.",
            whyItMatters: "Generics eliminate runtime ClassCastExceptions by enforcing compile-time safety.",
            keyConcepts: ["Generic Classes", "Generic Methods", "Wildcards (?, extends, super)", "Type Erasure"],
            resources: [
              { title: "Generics - Oracle Docs", url: "https://docs.oracle.com/javase/tutorial/java/generics/index.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-jv-04",
        title: "Exceptions & Memory Management",
        nodes: [
          {
            id: "jv-node-7",
            title: "Exception Handling",
            simpleExplanation: "Master checked vs unchecked exceptions, and read files safely using try-with-resources.",
            whyItMatters: "Proper handling ensures enterprise servers recover gracefully from unexpected state failures.",
            keyConcepts: ["Checked vs Unchecked", "Throws vs Throw", "Try-Catch-Finally", "Try-With-Resources"],
            resources: [
              { title: "Exceptions Trail", url: "https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html", type: "Official Docs" }
            ]
          },
          {
            id: "jv-node-8",
            title: "Garbage Collection & JVM Memory",
            simpleExplanation: "Understand how Java allocates memory in the Stack and Heap and handles automatic garbage collection.",
            whyItMatters: "Proper memory allocation awareness helps prevent fatal OutOfMemoryErrors.",
            keyConcepts: ["Stack vs Heap Memory", "Garbage Collection Basics", "Memory Leak Prevention"],
            resources: [
              { title: "Garbage Collection Basics", url: "https://www.oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-jv-05",
        title: "Multithreading & Concurrency",
        nodes: [
          {
            id: "jv-node-9",
            title: "Threads & Synchronization",
            simpleExplanation: "Run multiple parts of your program concurrently using Threads and prevent race conditions.",
            whyItMatters: "Concurrency allows Java servers to handle thousands of requests simultaneously.",
            keyConcepts: ["Thread class & Runnable", "Synchronized keyword", "Volatile variables", "Race Conditions"],
            resources: [
              { title: "Concurrency Trail", url: "https://docs.oracle.com/javase/tutorial/essential/concurrency/index.html", type: "Official Docs" }
            ]
          },
          {
            id: "jv-node-10",
            title: "Executor Service & Futures",
            simpleExplanation: "Manage threads efficiently using thread pools instead of manually spawning them.",
            whyItMatters: "Thread pools prevent resource exhaustion on heavily loaded production machines.",
            keyConcepts: ["Executor Framework", "Callable vs Runnable", "Futures & CompletableFuture", "Thread Pools"],
            resources: [
              { title: "Java Concurrency Utilities", url: "https://docs.oracle.com/javase/8/docs/technotes/guides/concurrency/index.html", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  sql: {
    id: "sql",
    title: "SQL & Database Engineer",
    description: "Design relational database schemas, write high-performance queries, and manage transactional integrity.",
    timeline: "1-2 Months",
    difficulty: "Beginner Friendly",
    iconName: "Database",
    importanceDescription: "Data is the most valuable asset of modern tech. SQL is the universal language used to store, query, and analyze relational data in databases like PostgreSQL, MySQL, and SQL Server.",
    importanceStats: [
      { label: "Universal Data standard", icon: "Database" },
      { label: "Crucial for Backends", icon: "Terminal" },
      { label: "High Analytics Value", icon: "BarChart3" },
      { label: "Foundational Skill", icon: "CheckCircle2" }
    ],
    chapters: [
      {
        id: "chapter-sq-01",
        title: "SQL Basics & Filtering",
        nodes: [
          {
            id: "sq-node-1",
            title: "SELECT & WHERE",
            simpleExplanation: "Learn to fetch columns from database tables and filter records based on specific criteria.",
            whyItMatters: "Filtering and reading data is the most common database operation.",
            keyConcepts: ["Select & Alias", "Where condition", "Like & Wildcards", "And/Or/Not operators"],
            resources: [
              { title: "SQLbolt Tutorial", url: "https://sqlbolt.com/", type: "Best Starting Point" },
              { title: "W3Schools SQL Tutorial", url: "https://www.w3schools.com/sql/", type: "Beginner Friendly" }
            ]
          },
          {
            id: "sq-node-2",
            title: "Sorting & Pagination",
            simpleExplanation: "Sort your query results and paginate datasets using ORDER BY, LIMIT, and OFFSET.",
            whyItMatters: "Sorting and pagination are critical for building performant frontend listing pages.",
            keyConcepts: ["Order By (Asc/Desc)", "Limit & Offset", "Null sorting behavior"],
            resources: [
              { title: "SQL Order By - PostgreSQL Docs", url: "https://www.postgresql.org/docs/current/queries-order.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-sq-02",
        title: "Joins & Subqueries",
        nodes: [
          {
            id: "sq-node-3",
            title: "Relational Joins",
            simpleExplanation: "Combine rows from two or more tables based on a related column between them.",
            whyItMatters: "Relational databases normalize data across multiple tables. Joins assemble it.",
            keyConcepts: ["Inner Join", "Left & Right Joins", "Full Outer Join", "Cross Join / Cartesian"],
            resources: [
              { title: "Visual Guide to SQL Joins", url: "https://wikipedia.org/wiki/Join_(SQL)", type: "Beginner Friendly" }
            ]
          },
          {
            id: "sq-node-4",
            title: "Subqueries & CTEs",
            simpleExplanation: "Write queries nested inside other queries, and structure complex syntax using Common Table Expressions.",
            whyItMatters: "CTEs make complex analytical queries readable, modular, and maintainable.",
            keyConcepts: ["Nested Subqueries", "With Clause (CTEs)", "Correlated Subqueries"],
            resources: [
              { title: "PostgreSQL CTEs Guide", url: "https://www.postgresql.org/docs/current/queries-with.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-sq-03",
        title: "Aggregations & Grouping",
        nodes: [
          {
            id: "sq-node-5",
            title: "Aggregations",
            simpleExplanation: "Summarize data using statistical functions like COUNT, SUM, AVG, MIN, and MAX.",
            whyItMatters: "Aggregations are the basis of reports, dashboards, and quantitative insights.",
            keyConcepts: ["Sum & Avg", "Min & Max", "Count & Count(Distinct)"],
            resources: [
              { title: "SQL Aggregate Functions", url: "https://www.w3schools.com/sql/sql_count_sum_avg.asp", type: "Beginner Friendly" }
            ]
          },
          {
            id: "sq-node-6",
            title: "Group By & Having",
            simpleExplanation: "Group rows sharing common attributes, and filter aggregates using the HAVING clause.",
            whyItMatters: "Having acts like WHERE but operates on aggregrated groups.",
            keyConcepts: ["Group By syntax", "Having vs Where", "Multiple column grouping"],
            resources: [
              { title: "Grouping - PostgreSQL Docs", url: "https://www.postgresql.org/docs/current/queries-table-expressions.html#QUERIES-GROUP", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-sq-04",
        title: "Database Design & Normalization",
        nodes: [
          {
            id: "sq-node-7",
            title: "Keys & Relationships",
            simpleExplanation: "Learn schema design using Primary Keys, Foreign Keys, and Unique Constraints.",
            whyItMatters: "Constraints enforce relational integrity, preventing corrupted or orphan data records.",
            keyConcepts: ["Primary Key", "Foreign Key constraints", "One-to-Many, Many-to-Many relationships", "Cascade delete/update"],
            resources: [
              { title: "Relational Database Design Basics", url: "https://en.wikipedia.org/wiki/Relational_database", type: "Official Docs" }
            ]
          },
          {
            id: "sq-node-8",
            title: "Normalization (1NF - 3NF)",
            simpleExplanation: "Organize database columns and tables to minimize redundancy and dependency.",
            whyItMatters: "Unnormalized databases suffer from write anomalies and bloated file sizes.",
            keyConcepts: ["First Normal Form (1NF)", "Second Normal Form (2NF)", "Third Normal Form (3NF)"],
            resources: [
              { title: "Database Normalization Guide", url: "https://en.wikipedia.org/wiki/Database_normalization", type: "Advanced Reading" }
            ]
          }
        ]
      },
      {
        id: "chapter-sq-05",
        title: "Advanced Queries & Indexing",
        nodes: [
          {
            id: "sq-node-9",
            title: "Window Functions",
            simpleExplanation: "Perform calculations across a set of table rows that are related to the current row.",
            whyItMatters: "Window functions let you rank, track running totals, and compare rows without self-joins.",
            keyConcepts: ["Over() Clause", "Partition By", "Rank & Dense_Rank", "Lead & Lag"],
            resources: [
              { title: "Window Functions Tutorial", url: "https://www.postgresql.org/docs/current/tutorial-window.html", type: "Official Docs" }
            ]
          },
          {
            id: "sq-node-10",
            title: "Indexes & Performance",
            simpleExplanation: "Create database indexes (B-Tree) to speed up search lookups, and analyze query execution plans.",
            whyItMatters: "Missing indexes turn millisecond searches into multi-minute table scans.",
            keyConcepts: ["Index Creation", "B-Tree Indexes", "Explain / Explain Analyze", "Table Scan vs Index Scan"],
            resources: [
              { title: "PostgreSQL Indexes Guide", url: "https://www.postgresql.org/docs/current/indexes.html", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  dsa: {
    id: "dsa",
    title: "Algorithms & Structures Specialist",
    description: "Master problem-solving patterns, core data structures, and algorithms to crack top-tier technical interviews.",
    timeline: "3-4 Months",
    difficulty: "Advanced",
    iconName: "Terminal",
    importanceDescription: "Data Structures & Algorithms are the foundation of computer science. They train your brain in systematic problem solving and are the core gating metric for hiring at FAANG/Tier-1 software companies.",
    importanceStats: [
      { label: "Core Interview Filter", icon: "ShieldCheck" },
      { label: "Optimize Code Efficiency", icon: "TrendingUp" },
      { label: "Logical Problem Solving", icon: "Terminal" },
      { label: "System Level Foundations", icon: "Layers" }
    ],
    chapters: [
      {
        id: "chapter-ds-01",
        title: "Linear Data Structures",
        nodes: [
          {
            id: "ds-node-1",
            title: "Arrays & Linked Lists",
            simpleExplanation: "Master sequential arrays (contiguous memory) and linked lists (pointers) and their operational trade-offs.",
            whyItMatters: "Arrays offer O(1) lookups but O(n) insertions, whereas Linked Lists offer O(1) insertions but O(n) lookups.",
            keyConcepts: ["Array shifting & resizing", "Singly vs Doubly Linked Lists", "Pointer manipulation", "Floyd's Cycle Detection"],
            resources: [
              { title: "Linked List Structure - Wikipedia", url: "https://en.wikipedia.org/wiki/Linked_list", type: "Official Docs" }
            ]
          },
          {
            id: "ds-node-2",
            title: "Stacks & Queues",
            simpleExplanation: "Learn LIFO (Last In First Out) stacks and FIFO (First In First Out) queues.",
            whyItMatters: "Stacks power recursion and undo histories; queues handle background scheduling.",
            keyConcepts: ["Push, Pop, Peek", "Enqueue & Dequeue", "Circular Queue", "Monotonic Stack pattern"],
            resources: [
              { title: "Stack Data Structure - Wikipedia", url: "https://en.wikipedia.org/wiki/Stack_(abstract_data_type)", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ds-02",
        title: "Sorting, Searching & Complexity",
        nodes: [
          {
            id: "ds-node-3",
            title: "Big-O Complexity Analysis",
            simpleExplanation: "Learn to evaluate execution runtime (time complexity) and RAM allocation (space complexity) mathematically.",
            whyItMatters: "Big-O is the standard language developers use to evaluate code performance and scalability.",
            keyConcepts: ["Time & Space Complexity", "Worst, Best, Average Cases", "O(1), O(log n), O(n), O(n log n), O(n²)"],
            resources: [
              { title: "Big-O Cheat Sheet", url: "https://en.wikipedia.org/wiki/Big_O_notation", type: "Official Docs" }
            ]
          },
          {
            id: "ds-node-4",
            title: "Sorting & Binary Search",
            simpleExplanation: "Understand Quick Sort, Merge Sort, and search sorted arrays in logarithmic time.",
            whyItMatters: "Binary Search reduces lookup checks in massive arrays from 1 million to just 20 checks.",
            keyConcepts: ["Merge Sort (Divide & Conquer)", "Quick Sort (Pivot)", "Binary Search algorithm", "Search Space optimization"],
            resources: [
              { title: "Binary Search - Wikipedia", url: "https://en.wikipedia.org/wiki/Binary_search_algorithm", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ds-03",
        title: "Non-Linear Structures",
        nodes: [
          {
            id: "ds-node-5",
            title: "Trees & Binary Search Trees",
            simpleExplanation: "Understand hierarchical trees, traversals, and BST properties where left < parent < right.",
            whyItMatters: "Balanced BSTs enable searching, insertion, and deletion in O(log n) time.",
            keyConcepts: ["Inorder, Preorder, Postorder Traversals", "Binary Search Tree properties", "Balanced Trees (AVL/Red-black basics)"],
            resources: [
              { title: "Binary Search Tree - Wikipedia", url: "https://en.wikipedia.org/wiki/Binary_search_tree", type: "Official Docs" }
            ]
          },
          {
            id: "ds-node-6",
            title: "Hash Tables & Collisions",
            simpleExplanation: "Learn how hash functions map keys to values for instant lookups.",
            whyItMatters: "Hash tables power dictionaries and sets, making read/write operations perform at O(1) average time.",
            keyConcepts: ["Hash Functions", "Collision Resolution (Chaining vs Open Addressing)", "Load Factor & Rehashing"],
            resources: [
              { title: "Hash Table Mechanics", url: "https://en.wikipedia.org/wiki/Hash_table", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ds-04",
        title: "Graphs & Traversals",
        nodes: [
          {
            id: "ds-node-7",
            title: "Graph Representations",
            simpleExplanation: "Represent networks of nodes and edges using Adjacency Lists and Matrices.",
            whyItMatters: "Graphs model social networks, city maps, search engine indexes, and dependencies.",
            keyConcepts: ["Adjacency Matrix vs List", "Directed vs Undirected Graphs", "Weighted Graphs"],
            resources: [
              { title: "Graph Data Structure", url: "https://en.wikipedia.org/wiki/Graph_(abstract_data_type)", type: "Official Docs" }
            ]
          },
          {
            id: "ds-node-8",
            title: "BFS & DFS",
            simpleExplanation: "Master Breadth-First Search (level-by-level using Queue) and Depth-First Search (deep dive using Recursion/Stack).",
            whyItMatters: "BFS resolves shortest path in unweighted graphs; DFS is ideal for connectivity and backtracking.",
            keyConcepts: ["Queue-based BFS", "Stack/Recursion-based DFS", "Cycle Detection", "Topological Sorting"],
            resources: [
              { title: "DFS Algorithm - Wikipedia", url: "https://en.wikipedia.org/wiki/Depth-first_search", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ds-05",
        title: "Advanced Algorithm Paradigms",
        nodes: [
          {
            id: "ds-node-9",
            title: "Recursion & Backtracking",
            simpleExplanation: "Understand functions that call themselves, and backtracking to search all options and discard dead ends.",
            whyItMatters: "Backtracking solves complex optimization and constraint problems like Sudoku or maze pathways.",
            keyConcepts: ["Base case vs Recursive case", "Call Stack state", "Pruning search trees", "N-Queens / Permutations"],
            resources: [
              { title: "Backtracking Paradigm", url: "https://en.wikipedia.org/wiki/Backtracking", type: "Official Docs" }
            ]
          },
          {
            id: "ds-node-10",
            title: "Dynamic Programming (DP)",
            simpleExplanation: "Solve complex problems by breaking them down into overlapping subproblems and caching results (Memoization/Tabulation).",
            whyItMatters: "DP turns O(2^n) exponential algorithms into highly performant O(n) linear algorithms.",
            keyConcepts: ["Overlapping Subproblems", "Memoization (Top-down)", "Tabulation (Bottom-up)", "Knapsack Problem / LCS"],
            resources: [
              { title: "Dynamic Programming Guide", url: "https://en.wikipedia.org/wiki/Dynamic_programming", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  react: {
    id: "react",
    title: "React Frontend Engineer",
    description: "Build interactive, high-performance web applications using component architectures and modern state libraries.",
    timeline: "2 Months",
    difficulty: "Intermediate",
    iconName: "MonitorSmartphone",
    importanceDescription: "React is the dominant frontend UI library. Knowing React is essential for frontend careers, allowing you to design modular, fast, and interactive user interfaces.",
    importanceStats: [
      { label: "Industry Standard Library", icon: "MonitorSmartphone" },
      { label: "Highly Reusable Components", icon: "Layers" },
      { label: "Massive Job Market", icon: "TrendingUp" },
      { label: "Rich Library Ecosystem", icon: "Globe" }
    ],
    chapters: [
      {
        id: "chapter-re-01",
        title: "React Core Concepts",
        nodes: [
          {
            id: "re-node-1",
            title: "JSX & Components",
            simpleExplanation: "Learn JSX syntax (writing HTML inside Javascript) and component architecture.",
            whyItMatters: "JSX and components allow you to write reusable modular building blocks for your user interfaces.",
            keyConcepts: ["JSX syntax rules", "Functional Components", "Nesting Components", "Props definition"],
            resources: [
              { title: "Quick Start - React Docs", url: "https://react.dev/learn", type: "Official Docs" },
              { title: "React Tutorial - W3Schools", url: "https://www.w3schools.com/react/", type: "Beginner Friendly" }
            ]
          },
          {
            id: "re-node-2",
            title: "State & Events",
            simpleExplanation: "Understand component memory (state) using useState and handling clicks, submits, and inputs.",
            whyItMatters: "State makes your user interface responsive and interactive.",
            keyConcepts: ["useState Hook", "Immutable state updates", "Event handlers", "Forms & Controlled Inputs"],
            resources: [
              { title: "State: A Component's Memory", url: "https://react.dev/learn/state-a-components-memory", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-re-02",
        title: "Side Effects & Context",
        nodes: [
          {
            id: "re-node-3",
            title: "useEffect Hook",
            simpleExplanation: "Run side effects such as data fetching, subscriptions, or manual DOM adjustments after rendering.",
            whyItMatters: "useEffect is how your React frontend synchronizes with external APIs and services.",
            keyConcepts: ["Dependencies array", "Effect cleanup", "Data fetching flow", "Infinity loop prevention"],
            resources: [
              { title: "Synchronizing with Effects", url: "https://react.dev/learn/synchronizing-with-effects", type: "Official Docs" }
            ]
          },
          {
            id: "re-node-4",
            title: "React Context API",
            simpleExplanation: "Share global data (like themes or auth tokens) down the component tree without prop drilling.",
            whyItMatters: "Context makes managing global configurations clean and keeps prop signatures concise.",
            keyConcepts: ["CreateContext", "Provider Component", "useContext hook", "Avoid re-render traps"],
            resources: [
              { title: "Passing Data Deeply with Context", url: "https://react.dev/learn/passing-data-deeply-with-context", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-re-03",
        title: "React Performance Optimization",
        nodes: [
          {
            id: "re-node-5",
            title: "Memoization Hooks",
            simpleExplanation: "Cache expensive calculations and function declarations using useMemo and useCallback.",
            whyItMatters: "Memoization prevents unnecessary computations and child re-renders on every parent state change.",
            keyConcepts: ["useMemo Hook", "useCallback Hook", "React.memo", "Referential Equality"],
            resources: [
              { title: "useMemo - React Docs", url: "https://react.dev/reference/react/useMemo", type: "Official Docs" },
              { title: "useCallback - React Docs", url: "https://react.dev/reference/react/useCallback", type: "Official Docs" }
            ]
          },
          {
            id: "re-node-6",
            title: "State Management Libraries",
            simpleExplanation: "Learn external state stores like Zustand or Redux for complex, large-scale apps.",
            whyItMatters: "Built-in React state becomes unmanageable when hundreds of components need synchronized state.",
            keyConcepts: ["Global store", "Selectors", "Actions / Reducers", "Zustand basics"],
            resources: [
              { title: "Zustand Documentation", url: "https://zustand-demo.pmnd.rs/", type: "Practice Resource" }
            ]
          }
        ]
      },
      {
        id: "chapter-re-04",
        title: "Routing & Architecture",
        nodes: [
          {
            id: "re-node-7",
            title: "React Router",
            simpleExplanation: "Implement client-side navigation, URL params, and route guarding.",
            whyItMatters: "Routing allows you to build multi-page single-page-applications (SPAs) without page refreshes.",
            keyConcepts: ["BrowserRouter / HashRouter", "Routes & Route element", "useParams & useNavigate", "Protected Routes"],
            resources: [
              { title: "React Router Dom guide", url: "https://reactrouter.com/en/main", type: "Official Docs" }
            ]
          },
          {
            id: "re-node-8",
            title: "Custom Hooks",
            simpleExplanation: "Extract stateful component logic into reusable JavaScript functions starting with 'use'.",
            whyItMatters: "Custom Hooks keep components thin, descriptive, and focus-oriented.",
            keyConcepts: ["Hook rules", "Extracting logic", "Sharing stateful logic vs sharing state"],
            resources: [
              { title: "Reusing Logic with Custom Hooks", url: "https://react.dev/learn/reusing-logic-with-custom-hooks", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-re-05",
        title: "Advanced Ecosystem",
        nodes: [
          {
            id: "re-node-9",
            title: "Suspense & Lazy Loading",
            simpleExplanation: "Defer loading code files for routes or heavy components until they are actually needed.",
            whyItMatters: "Code splitting reduces initial bundle sizes, ensuring fast load speeds on mobile networks.",
            keyConcepts: ["React.lazy", "Suspense boundaries", "Fallback UIs", "Bundle size optimization"],
            resources: [
              { title: "Lazy Loading - React Docs", url: "https://react.dev/reference/react/lazy", type: "Official Docs" }
            ]
          },
          {
            id: "re-node-10",
            title: "React Server Components (RSC)",
            simpleExplanation: "Learn about rendering components on the server for faster page loads and seamless backend integrations.",
            whyItMatters: "RSCs provide a unified server/client paradigm, drastically reducing client JS footprints.",
            keyConcepts: ["Server Components vs Client Components", "Next.js App Router basics", "Data fetching in RSCs"],
            resources: [
              { title: "Next.js App Router Guide", url: "https://nextjs.org/docs", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  nodejs: {
    id: "nodejs",
    title: "Node.js Developer",
    description: "Build fast, scalable asynchronous server APIs, microservices, and databases using Node.js and Express.",
    timeline: "2-3 Months",
    difficulty: "Intermediate",
    iconName: "Database",
    importanceDescription: "Node.js allows developers to write server-side code in JavaScript. Because of its asynchronous event-driven architecture, it excels at real-time apps, streaming platforms, and high-performance Web APIs.",
    importanceStats: [
      { label: "Asynchronous Event Loop", icon: "Clock" },
      { label: "Full-Stack Single Language", icon: "MonitorSmartphone" },
      { label: "Huge Package Ecosystem", icon: "Globe" },
      { label: "Excellent for APIs", icon: "Terminal" }
    ],
    chapters: [
      {
        id: "chapter-nd-01",
        title: "Node.js Core",
        nodes: [
          {
            id: "nd-node-1",
            title: "Event Loop & Async I/O",
            simpleExplanation: "Understand Node's single-threaded, non-blocking model and the Event Loop phases.",
            whyItMatters: "Asynchronous I/O prevents server operations from locking up during database queries or network requests.",
            keyConcepts: ["Single Threaded Model", "Call Stack & Callback Queue", "Event Loop Phases", "Async/Await vs Promises"],
            resources: [
              { title: "About Node.js", url: "https://nodejs.org/en/about/", type: "Official Docs" },
              { title: "Node.js Event Loop Guide", url: "https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/", type: "Official Docs" }
            ]
          },
          {
            id: "nd-node-2",
            title: "Common Modules & File System",
            simpleExplanation: "Work with built-in modules like 'fs', 'path', and 'http' to build basic CLI tools or web servers.",
            whyItMatters: "Built-in core modules handle local OS level tasks without installing heavy third-party packages.",
            keyConcepts: ["Require vs ES Modules", "fs/promises module", "path.join & resolve", "process env"],
            resources: [
              { title: "Node.js File System module", url: "https://nodejs.org/api/fs.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-nd-02",
        title: "Express.js framework",
        nodes: [
          {
            id: "nd-node-3",
            title: "Routing & Controllers",
            simpleExplanation: "Build structured HTTP route paths, URL parameters, query strings, and controllers.",
            whyItMatters: "Express is the standard Node.js server framework, streamlining REST API creation.",
            keyConcepts: ["app.get / post / put / delete", "req.params & req.query", "Controller extraction", "REST principles"],
            resources: [
              { title: "Express.js Getting Started", url: "https://expressjs.com/en/starter/installing.html", type: "Official Docs" }
            ]
          },
          {
            id: "nd-node-4",
            title: "Express Middleware",
            simpleExplanation: "Master the middleware pipeline: functions that intercept requests before route handlers.",
            whyItMatters: "Middlewares handle centralized concerns like request validation, CORS settings, parsing, and logging.",
            keyConcepts: ["Custom Middlewares", "next() execution control", "Centralized Error Handler", "Body parser & CORS"],
            resources: [
              { title: "Using Middleware in Express", url: "https://expressjs.com/en/guide/using-middleware.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-nd-03",
        title: "Database Integration & ORMs",
        nodes: [
          {
            id: "nd-node-5",
            title: "MongoDB & Mongoose",
            simpleExplanation: "Connect Express to MongoDB, create schemas, validation, and perform CRUD operations.",
            whyItMatters: "MongoDB stores data in JSON-like documents, pairing naturally with JavaScript backends.",
            keyConcepts: ["NoSQL Collections", "Mongoose Schemas & Models", "Find, Insert, Update, Delete queries", "Mongoose hooks/middleware"],
            resources: [
              { title: "Mongoose Documentation", url: "https://mongoosejs.com/docs/", type: "Official Docs" }
            ]
          },
          {
            id: "nd-node-6",
            title: "Prisma & SQL DBs",
            simpleExplanation: "Integrate relational databases like PostgreSQL using schema declarations and migrations in Prisma ORM.",
            whyItMatters: "ORMs enforce data safety, type checking, and automate SQL database updates.",
            keyConcepts: ["Prisma Schema", "Database Migrations", "Relations handling", "Type-safe database clients"],
            resources: [
              { title: "Prisma Quickstart Guide", url: "https://www.prisma.io/docs/getting-started", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-nd-04",
        title: "Security & Authentication",
        nodes: [
          {
            id: "nd-node-7",
            title: "JWT Authentication",
            simpleExplanation: "Create user registrations, hash passwords with bcrypt, issue JWT tokens, and guard routes.",
            whyItMatters: "Secure authentication blocks access to protected user data and prevents malicious operations.",
            keyConcepts: ["Bcrypt hashing", "JSON Web Tokens sign/verify", "Authorization headers", "Auth middleware"],
            resources: [
              { title: "JWT Introduction", url: "https://jwt.io/introduction", type: "Best Starting Point" }
            ]
          },
          {
            id: "nd-node-8",
            title: "API Security Best Practices",
            simpleExplanation: "Secure APIs against common vulnerabilities like injections, DDoS, and parameter pollution.",
            whyItMatters: "Exposed API servers are constant targets for data scraping and system breaches.",
            keyConcepts: ["Helmet middleware", "Rate limiting", "Input sanitization (express-validator)", "CORS setups"],
            resources: [
              { title: "Express Production Security Guide", url: "https://expressjs.com/en/advanced/best-practice-security.html", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-nd-05",
        title: "Streams, WebSockets & Scaling",
        nodes: [
          {
            id: "nd-node-9",
            title: "Streams & Large Files",
            simpleExplanation: "Read and write massive files chunk-by-chunk without overloading RAM using Node Streams.",
            whyItMatters: "Streams prevent server crashes by capping RAM usage when handling video or file downloads.",
            keyConcepts: ["Readable & Writable Streams", "Pipe API", "Buffer chunks vs Streams", "Backpressure"],
            resources: [
              { title: "Node.js Streams API Docs", url: "https://nodejs.org/api/stream.html", type: "Official Docs" }
            ]
          },
          {
            id: "nd-node-10",
            title: "Real-time with Socket.io",
            simpleExplanation: "Establish persistent bidirectional communication between client and server using WebSockets.",
            whyItMatters: "WebSockets power immediate real-time chat, notifications, and telemetry updates.",
            keyConcepts: ["WS Protocol vs HTTP", "Socket.io integration", "Emitting Events", "Rooms & Broadcasters"],
            resources: [
              { title: "Socket.io Documentation", url: "https://socket.io/docs/v4/", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  uiux: {
    id: "uiux",
    title: "UI/UX Designer",
    description: "Design delightful, user-centric interfaces and map frictionless product flows from wireframes to developer handoff.",
    timeline: "2 Months",
    difficulty: "Beginner Friendly",
    iconName: "PenTool",
    importanceDescription: "Products are won or lost on user experience. A UI/UX designer ensures that digital software is visually stunning, highly intuitive, accessible, and drives conversion goals.",
    importanceStats: [
      { label: "User Centric Mindset", icon: "PenTool" },
      { label: "Figma Tooling Standard", icon: "Layers" },
      { label: "High Startup Value", icon: "Rocket" },
      { label: "Aesthetics & Hierarchy", icon: "CheckCircle2" }
    ],
    chapters: [
      {
        id: "chapter-ui-01",
        title: "Design Principles",
        nodes: [
          {
            id: "ui-node-1",
            title: "Visual Hierarchy",
            simpleExplanation: "Arrange elements to show importance. Master typography scaling, color contrast, and white space layouts.",
            whyItMatters: "Hierarchy guides the user's eye naturally to call-to-actions, preventing visual clutter.",
            keyConcepts: ["F & Z reading patterns", "Typography sizes", "White space as layout tool", "Emphasis & contrast"],
            resources: [
              { title: "Visual Hierarchy Principles - Wikipedia", url: "https://en.wikipedia.org/wiki/Visual_hierarchy", type: "Official Docs" }
            ]
          },
          {
            id: "ui-node-2",
            title: "Color Theory & Harmonies",
            simpleExplanation: "Select appropriate color palettes (monochromatic, analogous, complementary) and design for light/dark modes.",
            whyItMatters: "Colors evoke emotional reactions and define brand credibility and interface usability.",
            keyConcepts: ["HSL, Hex & RGB", "Primary, secondary, and accent usage", "Contrast ratios (WCAG AA)", "Light vs Dark mode systems"],
            resources: [
              { title: "Color Theory Basics", url: "https://en.wikipedia.org/wiki/Color_theory", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-ui-02",
        title: "User Research & Flow",
        nodes: [
          {
            id: "ui-node-3",
            title: "User Interviews & Personas",
            simpleExplanation: "Gather feedback from target cohorts to formulate user personas and outline problem statements.",
            whyItMatters: "User research ensures you design for actual customer needs, rather than making internal assumptions.",
            keyConcepts: ["Qualitative vs Quantitative research", "Creating User Personas", "Empathy Maps", "Problem definition statements"],
            resources: [
              { title: "User Persona Guide", url: "https://en.wikipedia.org/wiki/Persona_(user_experience)", type: "Official Docs" }
            ]
          },
          {
            id: "ui-node-4",
            title: "Information Architecture (IA)",
            simpleExplanation: "Organize, label, and map application navigation paths and structure product sitemaps.",
            whyItMatters: "Without structured IA, users get lost inside complex menus, increasing drop-offs.",
            keyConcepts: ["Sitemaps", "User Flow Diagrams", "Card Sorting tests", "Navigation taxonomies"],
            resources: [
              { title: "Information Architecture Introduction", url: "https://en.wikipedia.org/wiki/Information_architecture", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ui-03",
        title: "Wireframing & Prototyping",
        nodes: [
          {
            id: "ui-node-5",
            title: "Low-Fidelity Sketching",
            simpleExplanation: "Create rapid layouts on paper or digital boards to validate wireframe paths without visual design noise.",
            whyItMatters: "Sketching lets you discard weak UX layout ideas in minutes, before spending hours in Figma.",
            keyConcepts: ["Crazy Eights sketching", "Grid structures", "Balsamiq / FigJam tools", "Component layout mockups"],
            resources: [
              { title: "Wireframe Guide - Wikipedia", url: "https://en.wikipedia.org/wiki/Website_wireframe", type: "Official Docs" }
            ]
          },
          {
            id: "ui-node-6",
            title: "Interactive Prototyping in Figma",
            simpleExplanation: "Design high-fidelity screens, configure click interactions, component variants, and animations.",
            whyItMatters: "Interactive prototypes let clients and user testers feel the app workflow as if it were coded.",
            keyConcepts: ["Figma Auto-layout", "Component Sets & Variants", "Smart Animate transitions", "Interactive component states"],
            resources: [
              { title: "Figma Learn Tutorials", url: "https://help.figma.com/hc/en-us/categories/360002051614-Learn-Figma", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ui-04",
        title: "Testing & Accessibility",
        nodes: [
          {
            id: "ui-node-7",
            title: "Usability Testing Methods",
            simpleExplanation: "Perform moderated/unmoderated user tests, record interaction friction, and analyze drop-offs.",
            whyItMatters: "Testing reveals where actual users struggle, providing concrete data for redesign iterations.",
            keyConcepts: ["A/B Testing", "Think-aloud protocols", "System Usability Scale (SUS)", "Heatmap analysis"],
            resources: [
              { title: "Usability Testing Basics", url: "https://en.wikipedia.org/wiki/Usability_testing", type: "Official Docs" }
            ]
          },
          {
            id: "ui-node-8",
            title: "Accessibility Standards (WCAG)",
            simpleExplanation: "Ensure your designs are usable by people with visual, hearing, motor, or cognitive disabilities.",
            whyItMatters: "Accessibility is a legal mandate in many regions and ensures a high quality experience for everyone.",
            keyConcepts: ["WCAG 2.1 AA/AAA rules", "Contrast Checkers", "Screen reader guidelines", "Focus states and keyboard nav"],
            resources: [
              { title: "W3C Web Accessibility (WAI)", url: "https://www.w3.org/WAI/", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-ui-05",
        title: "Design Systems & Handoff",
        nodes: [
          {
            id: "ui-node-9",
            title: "Design Tokens & UI Kits",
            simpleExplanation: "Create centralized tokens for colors, sizing, spacing, and typography. Design reusable buttons, inputs, and modals.",
            whyItMatters: "Design systems guarantee product consistency across engineering teams and product lines.",
            keyConcepts: ["Design Tokens (variables)", "Atomic Design methodology", "Figma library publishing", "Maintenance practices"],
            resources: [
              { title: "Atomic Design Principles", url: "https://bradfrost.com/blog/post/atomic-web-design/", type: "Best Starting Point" }
            ]
          },
          {
            id: "ui-node-10",
            title: "Developer Handoff",
            simpleExplanation: "Organize layers, define auto-layout responsive constraints, and supply assets/specs to engineers.",
            whyItMatters: "Precise specs and asset exports minimize bugs and speed up CSS translation.",
            keyConcepts: ["Figma Dev Mode", "Redlining and spacing annotations", "SVG asset exports", "Component documentation"],
            resources: [
              { title: "Figma Developer Handoff Guide", url: "https://help.figma.com/hc/en-us/articles/1500004291301-Guide-to-developer-handoff", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  },
  marketing: {
    id: "marketing",
    title: "Growth & Performance Marketer",
    description: "Formulate product marketing strategies, master search engines (SEO), run high-yielding paid ads, and construct growth loops.",
    timeline: "2 Months",
    difficulty: "Beginner Friendly",
    iconName: "BarChart3",
    importanceDescription: "Excellent products fail if nobody knows they exist. Modern marketing is quantitative and data-driven; it uses data collection, campaigns, and optimization engines to acquire users cost-effectively.",
    importanceStats: [
      { label: "CAC / LTV Optimization", icon: "DollarSign" },
      { label: "Data-Driven Decisions", icon: "BarChart3" },
      { label: "SEO & Keyword Authority", icon: "Globe" },
      { label: "Multi-Channel Campaigns", icon: "Target" }
    ],
    chapters: [
      {
        id: "chapter-mk-01",
        title: "Marketing Foundations",
        nodes: [
          {
            id: "mk-node-1",
            title: "CAC, LTV & Funnel Metrics",
            simpleExplanation: "Understand key unit economics: Customer Acquisition Cost, Lifetime Value, and Conversion Funnels.",
            whyItMatters: "A business is only viable if LTV is significantly larger than CAC (typically 3x+).",
            keyConcepts: ["LTV:CAC ratio", "AARRR Pirate Metrics", "Conversion rate calculation", "Churn rates"],
            resources: [
              { title: "CAC/LTV Analysis Guide", url: "https://en.wikipedia.org/wiki/Customer_acquisition_cost", type: "Official Docs" }
            ]
          },
          {
            id: "mk-node-2",
            title: "Ideal Customer Profile (ICP)",
            simpleExplanation: "Narrow down your target audience demographics, pain points, purchasing behavior, and channels.",
            whyItMatters: "Broad marketing wastes budget. Target audience alignment drives higher CTR and conversions.",
            keyConcepts: ["ICP vs Buyer Persona", "B2B vs B2C audience profiling", "Value Proposition matching", "Survey designs"],
            resources: [
              { title: "Target Audience Definition", url: "https://en.wikipedia.org/wiki/Target_audience", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-mk-02",
        title: "Search Engine Optimization (SEO)",
        nodes: [
          {
            id: "mk-node-3",
            title: "Keyword Research & Strategy",
            simpleExplanation: "Find search terms your customers use, and analyze search volumes and keyword difficulty.",
            whyItMatters: "SEO provides passive, organic, high-intent traffic without ongoing advertising spend.",
            keyConcepts: ["Short-tail vs Long-tail keywords", "Search intent types (informational, transactional)", "Keyword tools (Semrush, Ahrefs)", "Competitive analysis"],
            resources: [
              { title: "SEO Introduction - Wikipedia", url: "https://en.wikipedia.org/wiki/Search_engine_optimization", type: "Official Docs" }
            ]
          },
          {
            id: "mk-node-4",
            title: "On-Page & Off-Page SEO",
            simpleExplanation: "Optimize page tags, H1 headers, image alt text, and build domain authority with backlinks.",
            whyItMatters: "On-page tells search crawlers what your page is about; off-page authority tells them you are trustworthy.",
            keyConcepts: ["Meta title & description limits", "Header structures (H1-H6)", "Backlink building (organic)", "Internal link mapping"],
            resources: [
              { title: "Google Search Central SEO Starter Guide", url: "https://developers.google.com/search/docs/fundamentals/seo-starter-guide", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-mk-03",
        title: "Paid Advertising & Channels",
        nodes: [
          {
            id: "mk-node-5",
            title: "Google Search Ads (PPC)",
            simpleExplanation: "Set up Google Ads search campaigns, match types, write copy, and configure keyword bids.",
            whyItMatters: "PPC lets you bid to show at the top of Google immediately for high-value transactional search terms.",
            keyConcepts: ["CPC, CTR, and Impression Share", "Broad, Phrase, and Exact Match keywords", "Quality Score mechanics", "Negative keywords"],
            resources: [
              { title: "Google Ads Official Tutorials", url: "https://support.google.com/google-ads", type: "Official Docs" }
            ]
          },
          {
            id: "mk-node-6",
            title: "Paid Social (Meta & LinkedIn)",
            simpleExplanation: "Run visual ad campaigns targeting interests, demographics, and custom upload lists.",
            whyItMatters: "Paid social helps build demand by targeting specific lookalike audiences matching your current buyers.",
            keyConcepts: ["Campaign Objectives (leads, conversions)", "Creative variations (videos, carousels)", "Meta Pixel & Conversion API", "Custom & Lookalike Audiences"],
            resources: [
              { title: "Meta Blueprint Course", url: "https://www.facebook.com/business/learn", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-mk-04",
        title: "Retention & Funnel Optimization",
        nodes: [
          {
            id: "mk-node-7",
            title: "Email Marketing & Automation",
            simpleExplanation: "Create onboarding email drips, segments, newsletters, and trigger flows based on actions.",
            whyItMatters: "Email is a direct channel to users, generating the highest ROI of any marketing channel.",
            keyConcepts: ["Welcome series flows", "Behavioral triggers", "Open rates, CTR, Unsubscribes", "Audience segmentation"],
            resources: [
              { title: "Email Campaign Optimization Guide", url: "https://en.wikipedia.org/wiki/Email_marketing", type: "Official Docs" }
            ]
          },
          {
            id: "mk-node-8",
            title: "Landing Page Copy & Conversions",
            simpleExplanation: "Design high-converting layouts, write compelling headlines, clear CTAs, and run A/B copy tests.",
            whyItMatters: "Driving traffic is useless if your landing page fails to convert visitors into leads or signups.",
            keyConcepts: ["Hero sections & Above-the-fold", "Social proof and trust signals", "Single vs multi-step forms", "A/B Testing setups"],
            resources: [
              { title: "Landing Page Guidelines", url: "https://en.wikipedia.org/wiki/Landing_page", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-mk-05",
        title: "Analytics & Growth Loops",
        nodes: [
          {
            id: "mk-node-9",
            title: "Google Analytics 4 & Tagging",
            simpleExplanation: "Install GA4 tracking codes, set up custom events, track UTM variables, and build conversion reports.",
            whyItMatters: "You cannot optimize campaigns or budgets if you cannot accurately attribute where conversions originated.",
            keyConcepts: ["GA4 Events & Conversions", "UTM parameter variables", "Attribution Models (first vs last touch)", "Session tracking"],
            resources: [
              { title: "Google Analytics Help", url: "https://support.google.com/analytics", type: "Official Docs" }
            ]
          },
          {
            id: "mk-node-10",
            title: "Viral Loops & Referral Programs",
            simpleExplanation: "Build organic loops where users invite new users, incentivized by referral bonuses or product values.",
            whyItMatters: "Viral loops lower your average CAC by using existing customers to acquire new ones organically.",
            keyConcepts: ["K-Factor calculation", "Incentivized sharing mechanisms", "Dropbox/Airbnb case studies", "Gamification components"],
            resources: [
              { title: "Viral Marketing Loops Overview", url: "https://en.wikipedia.org/wiki/Viral_marketing", type: "Advanced Reading" }
            ]
          }
        ]
      }
    ]
  },
  pm: {
    id: "pm",
    title: "Product Manager",
    description: "Bridge the gap between engineering, design, and business to define product strategies, prioritisations, and PRDs.",
    timeline: "2-3 Months",
    difficulty: "Beginner Friendly",
    iconName: "Target",
    importanceDescription: "Product Managers act as the glue in cross-functional software teams. They solve user problems, prioritize engineering backlogs, write specifications (PRDs), and steer products from conception to release.",
    importanceStats: [
      { label: "Cross-Functional Leader", icon: "Target" },
      { label: "Backlog Prioritization", icon: "Layers" },
      { label: "Write Clear Specifications", icon: "Terminal" },
      { label: "Product Market Fit focus", icon: "Rocket" }
    ],
    chapters: [
      {
        id: "chapter-pm-01",
        title: "Product Fundamentals",
        nodes: [
          {
            id: "pm-node-1",
            title: "Role of the PM & Lifecycle",
            simpleExplanation: "Learn the core responsibilities of a PM and follow the stages of the Product Lifecycle.",
            whyItMatters: "A PM does not write code or design UIs directly; they manage the 'Why' and the 'What'.",
            keyConcepts: ["Product Lifecycle (Introduction to Decline)", "PM vs Project Manager vs Product Owner", "Agile & Scrum frameworks", "Stakeholder communications"],
            resources: [
              { title: "Product Management Principles", url: "https://en.wikipedia.org/wiki/Product_management", type: "Official Docs" }
            ]
          },
          {
            id: "pm-node-2",
            title: "Product Market Fit (PMF)",
            simpleExplanation: "Identify market needs, define value propositions, and validate whether a product satisfies its market.",
            whyItMatters: "Creating products that nobody wants is the #1 cause of startup failure.",
            keyConcepts: ["Sean Ellis PMF test", "Value Proposition Canvas", "Customer discovery interviews", "MVP definitions"],
            resources: [
              { title: "Product-Market Fit Basics", url: "https://en.wikipedia.org/wiki/Product/market_fit", type: "Beginner Friendly" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-02",
        title: "Product Strategy & OKRs",
        nodes: [
          {
            id: "pm-node-3",
            title: "Competitive Analysis",
            simpleExplanation: "Evaluate competitors' feature sets, pricing models, market positioning, and identify gaps.",
            whyItMatters: "Understanding the competitive landscape helps you define your product's unique value proposition.",
            keyConcepts: ["Feature Matrix mapping", "SWOT Analysis", "Market size calculation (TAM, SAM, SOM)", "Defensibility / Moats"],
            resources: [
              { title: "Competitor Analysis - Wikipedia", url: "https://en.wikipedia.org/wiki/Competitor_analysis", type: "Official Docs" }
            ]
          },
          {
            id: "pm-node-4",
            title: "Setting OKRs & KPIs",
            simpleExplanation: "Define high-level Objectives and Key Results, and select quantitative performance metrics.",
            whyItMatters: "OKRs align cross-functional teams around measurable, common, and outcome-oriented goals.",
            keyConcepts: ["Objective guidelines", "Key Results (Measurable)", "KPIs (LTV, churn, DAU/MAU)", "North Star Metric"],
            resources: [
              { title: "OKRs Overview - Wikipedia", url: "https://en.wikipedia.org/wiki/OKR", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-03",
        title: "Prioritization & Roadmaps",
        nodes: [
          {
            id: "pm-node-5",
            title: "Prioritization Frameworks",
            simpleExplanation: "Apply quantitative scoring models (RICE, Kano) to decide which features get built first.",
            whyItMatters: "Resources are limited. Frameworks remove emotional biases and ensure you build high-impact features.",
            keyConcepts: ["RICE (Reach, Impact, Confidence, Effort)", "Kano Model (Delighters vs Basic)", "MoSCoW (Must, Should, Could, Won't)", "Opportunity Scoring"],
            resources: [
              { title: "RICE Prioritization Guide", url: "https://en.wikipedia.org/wiki/RICE_prioritization_model", type: "Official Docs" }
            ]
          },
          {
            id: "pm-node-6",
            title: "Creating Product Roadmaps",
            simpleExplanation: "Structure timeline roadmaps showing feature progression and communicate them to stakeholders.",
            whyItMatters: "Roadmaps align sales, engineering, design, and executives on the future product timeline.",
            keyConcepts: ["Now/Next/Later roadmaps", "Theme-based planning", "Gantt chart vs Outcome roadmaps", "Release planning"],
            resources: [
              { title: "Product Roadmap Introduction", url: "https://en.wikipedia.org/wiki/Technology_roadmap", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-04",
        title: "Specifications & PRDs",
        nodes: [
          {
            id: "pm-node-7",
            title: "Writing PRDs",
            simpleExplanation: "Write Product Requirements Documents covering scope, user stories, metrics, and edge cases.",
            whyItMatters: "A PRD gives developers and designers the exact spec needed to build a feature without confusion.",
            keyConcepts: ["Problem Definition", "Feature Scope & Out of Scope", "Success Metrics", "Wireframe links & UI dependencies"],
            resources: [
              { title: "Product Requirements Document Guide", url: "https://en.wikipedia.org/wiki/Product_requirements_document", type: "Official Docs" }
            ]
          },
          {
            id: "pm-node-8",
            title: "User Stories & Backlogs",
            simpleExplanation: "Write agile user stories (As a..., I want..., So that...) and manage the team backlog.",
            whyItMatters: "Structured user stories break heavy PRDs down into dev-friendly, estimable tasks.",
            keyConcepts: ["User Story format", "Acceptance Criteria (Gherkin syntax)", "Backlog grooming / refining", "Sprint planning basics"],
            resources: [
              { title: "User Stories in Scrum", url: "https://en.wikipedia.org/wiki/User_story", type: "Official Docs" }
            ]
          }
        ]
      },
      {
        id: "chapter-pm-05",
        title: "Launch & Analytics",
        nodes: [
          {
            id: "pm-node-9",
            title: "Go-To-Market (GTM) Strategy",
            simpleExplanation: "Plan product releases, coordinate sales training, write launch materials, and map user onboarding flows.",
            whyItMatters: "A feature release is useless if users are never notified or don't know how to use it.",
            keyConcepts: ["Beta testing programs", "Feature flag releases", "Launch communications", "Sales enablement"],
            resources: [
              { title: "Go-to-market Strategy Guide", url: "https://en.wikipedia.org/wiki/Go-to-market_strategy", type: "Official Docs" }
            ]
          },
          {
            id: "pm-node-10",
            title: "A/B Testing & Analysis",
            simpleExplanation: "Define control and variant cohorts, run tests, and check statistical significance before full releases.",
            whyItMatters: "A/B tests back product choices with real-world customer usage data, rather than assumptions.",
            keyConcepts: ["A/B Testing setups", "Statistical significance (p-value basics)", "Product metrics (activation, retention)", "Amplitude / Mixpanel analytics"],
            resources: [
              { title: "A/B Testing Basics - Wikipedia", url: "https://en.wikipedia.org/wiki/A/B_testing", type: "Official Docs" }
            ]
          }
        ]
      }
    ]
  }
};
