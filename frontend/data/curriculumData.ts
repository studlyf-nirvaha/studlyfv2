// Curriculum data sourced from the GEN AI Course PDF.
// Do not modify UI components; this file provides data consumed by CoursePlayer.



export interface Topic {
  type: 'overview' | 'text' | 'practice_quiz' | 'graded_quiz' | 'image';
  title: string;
  content?: string;
  image?: { src: string; caption?: string };
  practice?: { question: string; options: string[]; answer: number; explanation: string }[];
  graded?: { question: string; options: string[]; correct: number; explanation: string }[];
  resources?: { title: string; type: string; url: string }[];
  objectives?: string[];
}

export interface ModuleData {
  title: string;
  topics: Topic[];
}

export const CURRICULUM_DATA: ModuleData[] = [
  // ─── MODULE 1 ───────────────────────────────────────────────────────────────
  {
    title: 'Introduction to Artificial Intelligence & Generative AI',
    topics: [
      {
        type: 'overview',
        title: 'Module Overview — What You\'ll Learn',
        content: `## Module 1 — Introduction to Artificial Intelligence & Generative AI

This module builds the **foundation** for the entire course. Before learning tools, prompts, or AI systems, you must clearly understand what AI is, how it evolved, and why Generative AI is different from traditional AI systems.

### What You Will Learn
- What Artificial Intelligence is and how it works
- The three types of AI: Narrow AI, AGI, and ASI
- What Generative AI is and how it creates content
- How Generative AI is transforming industries

### Real-World Tools Covered
| Tool | Purpose |
|------|---------|
| ChatGPT | Conversational AI & content generation |
| Gemini | Research & information retrieval |
| Midjourney | AI image generation |
| GitHub Copilot | AI-powered coding assistant |

### Learning Resources
- Google AI Education: [https://ai.google/education](https://ai.google/education)
- IBM AI Topics: [https://www.ibm.com/topics/artificial-intelligence](https://www.ibm.com/topics/artificial-intelligence)
- OpenAI Docs: [https://platform.openai.com/docs](https://platform.openai.com/docs)

> **Estimated Time:** Reading: 20 mins • Practice Quiz: 10 mins • Graded Assignment: 15 mins`,
      image: { src: '/course_assets/Module_1_p1_img1.png', caption: 'Introduction to AI' },
},
      {
        type: 'text',
        title: 'Section 1.1 — What is Artificial Intelligence?',
        content: `## Section 1.1 — What is Artificial Intelligence?

Artificial Intelligence (AI) refers to computer systems designed to perform tasks that **normally require human intelligence**.

These tasks include:
- Understanding language
- Recognizing images
- Solving problems
- Making decisions
- Learning from data

Traditional computer programs follow **fixed instructions** written by humans. AI systems are different — they **learn patterns** from data and use those patterns to make predictions or decisions.

### Simple Way to Think About It

| Traditional Software | Artificial Intelligence |
|---------------------|------------------------|
| Input → Program Rules → Output | Input → Data + Learning Model → Output |

AI **learns patterns** rather than following strict rules.

### Real World Example
Email spam filters (like Gmail) analyze millions of emails to learn patterns that indicate spam. Over time, the system becomes better at detecting unwanted emails **without humans writing rules** for every possible spam message.`
      },
      {
        type: 'text',
        title: 'Section 1.2 — Types of Artificial Intelligence',
        content: `## Section 1.2 — Types of Artificial Intelligence

AI is commonly classified into **three major levels** based on capability:

### 1. Narrow AI (ANI) — Also called Weak AI
This type of AI is designed to perform **one specific task** extremely well.

Examples include:
- Voice assistants (Siri, Alexa)
- Recommendation systems (Netflix, Spotify)
- Chatbots
- Image recognition systems

> **Almost all AI systems today fall into this category.**

### 2. Artificial General Intelligence (AGI)
AGI refers to AI that can perform **any intellectual task** that a human can do. An AGI system would be able to reason, learn new skills, and adapt across different fields.

> AGI does **not exist yet**. It is still a research goal.

### 3. Artificial Super Intelligence (ASI)
This is a hypothetical stage where AI becomes **more intelligent than humans** in all aspects, including creativity and decision-making. ASI remains a theoretical concept.

### Real World Example
Netflix uses **Narrow AI** to recommend movies based on:
- Watch history
- User preferences
- Viewing behavior

The AI learns patterns from millions of users to predict what you might enjoy next.`
      },
      {
        type: 'text',
        title: 'Section 1.3 — What is Generative AI?',
        content: `## Section 1.3 — What is Generative AI?

Generative AI is a type of AI that **creates new content** instead of only analyzing or predicting data. It learns patterns from large datasets and then uses that knowledge to generate new outputs.

Generative AI can produce:
- ✍️ Text
- 🖼️ Images
- 🎵 Music
- 🎬 Videos
- 💻 Code
- 🎨 Designs

The process usually works like this:

\`\`\`
Training Data → AI Model → Generated Output
\`\`\`

The AI learns from billions of examples and then produces new results based on patterns in that data.

### Real World Example
When you ask ChatGPT: *"Write a professional email requesting a meeting"*

The system generates a **completely new email** based on its training data and language understanding.

Another example: Image models like **Midjourney** or **Stable Diffusion** generate images from text prompts.`
      },
      {
        type: 'text',
        title: 'Section 1.4 — How Generative AI is Transforming Industries',
        content: `## Section 1.4 — How Generative AI is Transforming Industries

Generative AI is rapidly transforming how industries operate by **automating creative and cognitive tasks**.

Previously, tasks like writing content, designing graphics, or generating code required human effort. Now AI systems can assist or automate many of these activities.

### Industries Being Transformed

#### 💻 Software Development
AI coding assistants help developers write code faster.
- **GitHub Copilot** suggests code in real time as developers type
- **ChatGPT** helps debug and explain code

#### 📢 Marketing
AI generates:
- Ad copy and blog posts
- Marketing strategies
- Social media content

Tools like **Jasper AI** and **ChatGPT** assist marketing teams.

#### 🎨 Design
AI can generate graphics, logos, and visual content.
- Midjourney
- Stable Diffusion
- Canva AI

#### 📚 Education
AI tutors help students learn faster through personalized explanations and automated assistance.`,
        resources: [
          { title: 'Google AI Education', type: 'link', url: 'https://ai.google/education' },
          { title: 'OpenAI Docs', type: 'link', url: 'https://platform.openai.com/docs' },
          { title: 'Hugging Face', type: 'link', url: 'https://huggingface.co' },
        ],
      },
      {
        type: 'practice_quiz',
        title: 'Practice Quiz — Check Understanding',
        practice: [
          {
            question: 'What is the primary goal of Artificial Intelligence?',
            options: [
              'Replace human workers completely',
              'Perform tasks that normally require human intelligence',
              'Store large amounts of data',
              'Create computer hardware',
            ],
            answer: 1,
            explanation: 'AI is designed to perform tasks that normally require human intelligence — like understanding language, recognizing images, and making decisions.',
          },
          {
            question: 'Which type of AI exists today and powers most real-world systems?',
            options: [
              'Artificial Super Intelligence',
              'Artificial General Intelligence',
              'Narrow AI',
              'Hybrid AI',
            ],
            answer: 2,
            explanation: 'Almost all AI systems today are Narrow AI — designed to perform one specific task extremely well, like recommendation systems or image recognition.',
          },
          {
            question: 'What is the main characteristic of Generative AI?',
            options: [
              'It only analyzes historical data',
              'It generates new content such as text or images',
              'It only performs mathematical calculations',
              'It works without training data',
            ],
            answer: 1,
            explanation: 'Generative AI is called "Generative" because it creates new content — text, images, music, code — based on patterns learned from training data.',
          },
        ],
      },
      {
        type: 'graded_quiz',
        title: 'Graded Assignment — Pass to Unlock Module 2',
        graded: [
          {
            question: 'What is the primary goal of Artificial Intelligence?',
            options: [
              'Replace human workers completely',
              'Perform tasks that normally require human intelligence',
              'Store large amounts of data',
              'Create computer hardware',
            ],
            correct: 1,
            explanation: 'AI is designed to perform tasks that normally require human intelligence.',
          },
          {
            question: 'Which type of AI exists today?',
            options: [
              'Artificial Super Intelligence',
              'Artificial General Intelligence',
              'Narrow AI',
              'Hybrid AI',
            ],
            correct: 2,
            explanation: 'Narrow AI (ANI) is the only type that exists today. AGI and ASI are future concepts.',
          },
          {
            question: 'What is the main characteristic of Generative AI?',
            options: [
              'It only analyzes historical data',
              'It generates new content such as text or images',
              'It only performs mathematical calculations',
              'It works without training data',
            ],
            correct: 1,
            explanation: 'Generative AI creates new content based on patterns learned from training data.',
          },
          {
            question: 'Which of the following is an example of Generative AI?',
            options: [
              'Calculator',
              'ChatGPT',
              'Spreadsheet software',
              'Printer',
            ],
            correct: 1,
            explanation: 'ChatGPT is a Generative AI tool that generates text responses based on training data.',
          },
        ],
      },
    ],
  },

  // ─── MODULE 2 ───────────────────────────────────────────────────────────────
  {
    title: 'How Generative AI Works',
    topics: [
      {
        type: 'overview',
        title: 'Module Overview — What You\'ll Learn',
        content: `## Module 2 — How Generative AI Works

This module explains how systems like **ChatGPT, Claude, and Gemini** actually work under the hood.

### What You Will Learn
- Machine Learning basics
- How Neural Networks work
- The Transformer Architecture that powers modern AI
- Tokens and Embeddings
- Large Language Models (LLMs)

### Key Concepts
\`\`\`
Data → Machine Learning → Neural Network → Transformer → LLM → Generated Output
\`\`\`

### Learning Resources
- Machine Learning Crash Course: [https://developers.google.com/machine-learning/crash-course](https://developers.google.com/machine-learning/crash-course)
- Original Transformer Paper: [https://arxiv.org/abs/1706.03762](https://arxiv.org/abs/1706.03762)

> **Estimated Time:** Reading: 25 mins • Practice Quiz: 12 mins • Graded Assignment: 15 mins`,
      image: { src: '/course_assets/Module_2_p10_img1.png', caption: 'How Generative AI Works' },
},
      {
        type: 'text',
        title: 'Core Reading — How AI Models Work',
        content: `## Section 2.1 — Machine Learning Basics

**Machine Learning (ML)** is the foundation of modern AI. Instead of programming explicit rules, ML systems learn patterns from data.

### How Machine Learning Works
\`\`\`
Data → Learning Algorithm → Trained Model → Predictions
\`\`\`

### Types of Machine Learning
| Type | Description | Example |
|------|-------------|---------|
| **Supervised Learning** | Learns from labeled data | Email spam detection |
| **Unsupervised Learning** | Finds patterns in unlabeled data | Customer segmentation |
| **Reinforcement Learning** | Learns through trial and reward | Game-playing AI |

### Real World Example
A **spam filter** is trained on thousands of emails labeled "spam" or "not spam". The model learns patterns from these examples and applies them to classify new emails automatically.

---

## Section 2.2 — Neural Networks Explained Simply

Neural networks are a type of machine learning model **inspired by the human brain**. They consist of layers of connected nodes called **neurons**.

### A Neural Network Has Three Main Parts:

1. **Input Layer** — Receives the data (e.g., words in a sentence)
2. **Hidden Layers** — Process information by detecting patterns. Deep learning models have many hidden layers.
3. **Output Layer** — Produces the final result (e.g., predicted word)

### Why Neural Networks Matter
Neural networks can learn **extremely complex patterns** in data — patterns that would be impossible to program manually.

For example, a neural network can learn to:
- Recognize faces in photos
- Translate between languages
- Generate realistic text

---

## Section 2.3 — Transformers Architecture

Modern Generative AI systems use a neural network architecture called **Transformers**.

Transformers were introduced in the research paper: *"Attention Is All You Need" (2017)*

### The Key Innovation: Attention Mechanism

Attention allows the model to understand the **relationship between words** in a sentence.

**Example sentence:** *"AI is transforming the world"*

The model must understand that:
- **AI** → subject
- **transforming** → action
- **world** → object

\`\`\`
Attention(Q, K, V) = softmax((QKᵀ) / √d_k) · V
\`\`\`

Transformers analyze **all words in context simultaneously**, which makes them extremely powerful for language understanding.

### Original Research
Vaswani et al. (2017): [https://arxiv.org/abs/1706.03762](https://arxiv.org/abs/1706.03762)

---

## Section 2.4 — Tokens and Embeddings

### What are Tokens?
AI models don't process raw text — they process **tokens**, which are small pieces of text.

Examples:
- The word "unhappiness" might be split into: \`un\` + \`happi\` + \`ness\`
- A sentence like "Hello world" becomes: \`Hello\` + \`world\`

### What are Embeddings?
Embeddings are **numerical representations** of tokens. They capture the *meaning* of words as vectors of numbers.

Words with similar meanings have **similar embeddings**:
\`\`\`
king - man + woman ≈ queen
\`\`\`

This allows AI models to understand language mathematically.

---

## ![Tokens and Embeddings](/images/module2_page17_img1.png)

Section 2.5 — Large Language Models (LLMs)

**Large Language Models (LLMs)** are AI systems trained on massive datasets of text to understand and generate human language.

### Key Characteristics of LLMs
- Trained on **billions of text examples** (books, websites, code, articles)
- Use the **Transformer architecture**
- Can perform many tasks: writing, coding, translation, summarization
- Generate text by **predicting the next most likely token**

### How LLMs Generate Text
\`\`\`
Input Prompt → Tokenization → Embedding → Transformer Layers → Next Token Prediction → Output
\`\`\`

### Popular LLMs
| Model | Company | Strengths |
|-------|---------|-----------|
| GPT-4 | OpenAI | General reasoning, coding |
| Claude | Anthropic | Document analysis, safety |
| Gemini | Google | Multimodal, research |
| Llama | Meta | Open-source |`,
        resources: [
          { title: 'Google ML Crash Course', type: 'link', url: 'https://developers.google.com/machine-learning/crash-course' },
          { title: 'Transformer Paper', type: 'link', url: 'https://arxiv.org/abs/1706.03762' },
        ],
      },
      {
        type: 'practice_quiz',
        title: 'Practice Quiz — Check Understanding',
        practice: [
          {
            question: 'What is the primary purpose of machine learning?',
            options: [
              'Execute predefined rules',
              'Learn patterns from data',
              'Store information',
              'Build computer hardware',
            ],
            answer: 1,
            explanation: 'Machine learning systems learn patterns from data rather than following explicitly programmed rules.',
          },
          {
            question: 'What architecture powers modern large language models?',
            options: [
              'Decision Trees',
              'Transformers',
              'Linear Regression',
              'Random Forest',
            ],
            answer: 1,
            explanation: 'Transformers, introduced in the 2017 paper "Attention Is All You Need", power modern LLMs like GPT-4, Claude, and Gemini.',
          },
        ],
      },
      {
        type: 'graded_quiz',
        title: 'Graded Assignment — Pass to Unlock Module 3',
        graded: [
          {
            question: 'What is the primary purpose of machine learning?',
            options: ['Execute predefined rules', 'Learn patterns from data', 'Store information', 'Build computer hardware'],
            correct: 1,
            explanation: 'Machine learning learns patterns from data automatically.',
          },
          {
            question: 'What architecture powers modern large language models?',
            options: ['Decision Trees', 'Transformers', 'Linear Regression', 'Random Forest'],
            correct: 1,
            explanation: 'The Transformer architecture, introduced in 2017, powers all modern LLMs.',
          },
          {
            question: 'What are tokens in language models?',
            options: ['Entire documents', 'Small pieces of text used by AI models', 'Images', 'Programming commands'],
            correct: 1,
            explanation: 'Tokens are small pieces of text (words or sub-words) that AI models process.',
          },
          {
            question: 'Large Language Models generate text by:',
            options: ['Copying training data', 'Predicting the next most likely token', 'Using predefined templates', 'Searching the internet'],
            correct: 1,
            explanation: 'LLMs generate text autoregressively by predicting the next most probable token at each step.',
          },
        ],
      },
    ],
  },

  // ─── MODULE 3 ───────────────────────────────────────────────────────────────
  {
    title: 'Prompt Engineering Fundamentals',
    topics: [
      {
        type: 'overview',
        title: 'Module Overview — What You\'ll Learn',
        content: `## Module 3 — Prompt Engineering Fundamentals

Learners move from understanding AI to **controlling AI**. Prompt engineering is the skill of structuring instructions so AI produces accurate, useful, and consistent outputs.

### By the End of This Module You Will Be Able To:
- Write effective prompts
- Structure instructions clearly
- Guide AI reasoning step-by-step
- Improve output quality

### Prompting Techniques Covered
| Technique | Description |
|-----------|-------------|
| **Basic Prompting** | Clear role, task, context, output format |
| **Zero-Shot** | No examples provided |
| **Few-Shot** | 2–5 examples guide the AI |
| **Chain-of-Thought** | Step-by-step reasoning |

### Learning Resources
- Prompting Guide: [https://www.promptingguide.ai](https://www.promptingguide.ai)

> **Estimated Time:** Reading: 20 mins • Practice Quiz: 12 mins • Graded Assignment: 15 mins`,
      image: { src: '/course_assets/Module_3_p23_img1.png', caption: 'Prompt Engineering Overview' },
},
      {
        type: 'text',
        title: 'Core Reading — Prompt Engineering Techniques',
        content: `## Section 3.1 — What is Prompt Engineering?

**Prompt Engineering** is the process of designing clear instructions for AI systems to produce accurate, useful, and consistent outputs.

Just as a search engine requires the right keywords, AI models require well-crafted prompts to produce the best results.

---

## Section 3.2 — Prompt Structure

A strong prompt usually includes **four key components**:

### 1. Role
Defines the perspective the AI should take.
> *"Act as a marketing expert"*

### 2. Task
Clearly explains what the AI should do.
> *"Create a marketing plan"*

### 3. Context
Provides background information.
> *"For a small startup selling eco-friendly products"*

### 4. Output Format
Specifies how the answer should be structured.
> *"Provide the response as a numbered list"*

### Full Structured Prompt Example

![Prompt Structure](/images/module3_page26_img1.png)
\`\`\`
Act as a senior software engineer.
Review the following Python code and:
1. Identify any bugs
2. Suggest improvements
3. Estimate time complexity

Format your response with clear headers for each section.

[paste code here]
\`\`\`

---

## Section 3.3 — Zero-Shot Prompting

**Zero-Shot Prompting** means asking the AI to perform a task **without giving any examples**. The AI relies entirely on its training knowledge.

### Example
\`\`\`
Classify the sentiment of this review as Positive, Negative, or Neutral:
"The product arrived on time but the packaging was damaged."
\`\`\`

**When to use Zero-Shot:**
- Simple, straightforward tasks
- When the task is well-defined
- When you want a quick response

---

## ![Zero-Shot Prompting](/images/module3_page28_img1.png)

Section 3.4 — Few-Shot Prompting

**Few-Shot Prompting** improves AI performance by providing **a few examples** before asking the main question.

### Example
\`\`\`
Classify the sentiment:

Review: "Amazing product, works perfectly!" → Positive
Review: "Terrible quality, broke after one day." → Negative
Review: "It's okay, nothing special." → Neutral

Now classify:
Review: "Shipping was fast but the item looks different from the photo."
\`\`\`

**Benefits of Few-Shot:**
- Shows the AI the exact output format you want
- Improves consistency
- Works well for classification and structured tasks

---

## ![Few-Shot Prompting](/images/module3_page30_img1.png)

Section 3.5 — Chain-of-Thought Prompting

**Chain-of-Thought (CoT)** prompting encourages AI to **explain its reasoning step-by-step** before giving the final answer.

### Example
\`\`\`
Think step by step:

A store sells apples for $0.50 each and oranges for $0.75 each.
If I buy 3 apples and 4 oranges, how much do I spend total?

Walk through each calculation before giving the final answer.
\`\`\`

**Why Chain-of-Thought Works:**
- Reduces errors in complex reasoning
- Makes the AI's logic transparent
- Particularly useful for math, logic, and multi-step problems

### Best Practices Summary

| Technique | Best For | Trigger Phrase |
|-----------|----------|----------------|
| Zero-Shot | Simple tasks | Direct question |
| Few-Shot | Consistent formatting | 2-5 examples |
| Chain-of-Thought | Complex reasoning | "Think step by step" |`,
        resources: [{ title: 'Prompting Guide', type: 'link', url: 'https://www.promptingguide.ai' }],
      },
      {
        type: 'practice_quiz',
        title: 'Practice Quiz — Check Understanding',
        practice: [
          {
            question: 'What is the purpose of prompt engineering?',
            options: [
              'Train AI models',
              'Design instructions to guide AI outputs',
              'Build neural networks',
              'Create datasets',
            ],
            answer: 1,
            explanation: 'Prompt engineering is the art and science of designing clear instructions (prompts) to guide AI systems toward accurate and useful outputs.',
          },
          {
            question: 'What is Zero-Shot prompting?',
            options: [
              'Giving multiple examples before asking a task',
              'Asking a task without providing any examples',
              'Training the model with new data',
              'Breaking down reasoning steps',
            ],
            answer: 1,
            explanation: 'Zero-Shot prompting asks the AI to perform a task with no examples — relying entirely on its training knowledge.',
          },
        ],
      },
      {
        type: 'graded_quiz',
        title: 'Graded Assignment — Pass to Unlock Module 4',
        graded: [
          {
            question: 'What is the purpose of prompt engineering?',
            options: ['Train AI models', 'Design instructions to guide AI outputs', 'Build neural networks', 'Create datasets'],
            correct: 1,
            explanation: 'Prompt engineering designs clear instructions to guide AI outputs.',
          },
          {
            question: 'Which component defines the perspective the AI should take?',
            options: ['Context', 'Role', 'Output format', 'Task'],
            correct: 1,
            explanation: 'The "Role" component tells the AI what perspective or persona to adopt, e.g., "Act as a marketing expert".',
          },
          {
            question: 'What is Zero-Shot prompting?',
            options: [
              'Giving multiple examples before asking a task',
              'Asking a task without providing examples',
              'Training the model with new data',
              'Breaking down reasoning steps',
            ],
            correct: 1,
            explanation: 'Zero-Shot prompting asks a task without any examples, relying on the model\'s training.',
          },
          {
            question: 'What is the main purpose of Chain-of-Thought prompting?',
            options: ['Increase dataset size', 'Force AI to answer quickly', 'Encourage step-by-step reasoning', 'Train a new model'],
            correct: 2,
            explanation: 'Chain-of-Thought prompting encourages the AI to reason step-by-step, which reduces errors and improves complex task performance.',
          },
        ],
      },
    ],
  },

  // ─── MODULE 4 ───────────────────────────────────────────────────────────────
  {
    title: 'AI Text Generation Tools',
    topics: [
      {
        type: 'overview',
        title: 'Module Overview — What You\'ll Learn',
        content: `## Module 4 — AI Text Generation Tools

Learners move from theory and prompting into **practical use of real Generative AI tools**. This module focuses on text-based AI systems used for writing, research, productivity, and professional tasks.

### By the End of This Module You Will Be Able To:
- Use major AI chat tools effectively
- Choose the right AI tool for different tasks
- Generate professional content using AI
- Compare capabilities of different AI models

### Tools Covered
| Tool | Company | Best For |
|------|---------|----------|
| **ChatGPT** | OpenAI | General tasks, coding, content |
| **Claude** | Anthropic | Long documents, reasoning |
| **Gemini** | Google | Research, Google ecosystem |
| **Jasper AI** | Jasper | Marketing content |
| **Notion AI** | Notion | Note-taking, summaries |

> **Estimated Time:** Reading: 20 mins • Practice Quiz: 10 mins • Graded Assignment: 15 mins`,
      image: { src: '/course_assets/Module_4_p39_img1.png', caption: 'AI Text Generation Tools' },
},
      {
        type: 'text',
        title: 'Core Reading — AI Tools in Practice',
        content: `## Section 4.1 — Using ChatGPT for Productivity

**ChatGPT** is a conversational AI system designed to understand prompts and generate useful, contextually relevant responses.

### What ChatGPT Can Do
- Writing and editing content
- Answering questions
- Summarizing documents
- Coding assistance
- Brainstorming ideas

### Real World Example
A marketing team can use ChatGPT to generate social media content ideas.

**Example prompt:**
\`\`\`
Generate 10 Instagram post ideas for a sustainable fashion brand.
Focus on:
- Educational posts about sustainable materials
- Behind-the-scenes content
- Customer story formats
\`\`\`

### Step-by-Step: Using ChatGPT
1. Go to [chat.openai.com](https://chat.openai.com)
2. Create or log into an account
3. Enter a prompt in the chat interface
4. Refine the response using follow-up prompts

### Learning Resources
- OpenAI Docs: [https://platform.openai.com/docs](https://platform.openai.com/docs)

---

## Section 4.2 — Using Claude for Reasoning Tasks

**Claude** is an AI assistant developed by **Anthropic**. Claude is known for:
- Strong reasoning and document analysis
- Handling very long documents (up to 100K+ tokens)
- Producing careful, nuanced responses
- Being designed with safety as a priority

### Best Use Cases for Claude
- Analyzing legal documents
- Summarizing long research papers
- Complex reasoning tasks
- Writing detailed reports

### Real World Example
A researcher can upload a 50-page report and ask Claude:
\`\`\`
Summarize the key findings of this report.
List the top 5 recommendations.
Identify any limitations mentioned by the authors.
\`\`\`

**Website:** [https://www.anthropic.com](https://www.anthropic.com)

---

## Section 4.3 — Using Gemini for Research

**Gemini** is an AI assistant developed by **Google**. Gemini integrates AI with Google's information ecosystem.

### Particularly Useful For:
- Research tasks
- Information retrieval
- Summarizing articles
- Answering factual questions
- Google Workspace integration (Docs, Sheets, Gmail)

### Real World Example
A student researching renewable energy can ask:
\`\`\`
Explain the advantages of solar energy and provide 
recent developments in the field since 2023.
Format the response with:
1. Key advantages (bullet points)
2. Recent developments (by year)
3. Future outlook
\`\`\`

**Website:** [https://ai.google](https://ai.google)

---

## Section 4.4 — AI Writing Assistants

AI writing assistants help users generate high-quality written content quickly.

### Common AI Writing Tools
| Tool | Best For |
|------|----------|
| **Jasper AI** | Marketing copy, blog posts |
| **Copy.ai** | Short-form content |
| **Notion AI** | Note organization, summaries |
| **Grammarly** | Grammar correction + AI suggestions |

### What They Can Generate
- Blog posts
- Product descriptions
- Email campaigns
- Social media posts

---

## ![Comparing Major AI Tools](/images/module4_page42_img1.png)

Section 4.5 — Comparing Major AI Tools

| Feature | ChatGPT | Claude | Gemini |
|---------|---------|--------|--------|
| **Company** | OpenAI | Anthropic | Google |
| **Best For** | General tasks | Long documents | Research |
| **Context Window** | Large | Very Large | Large |
| **Coding** | Excellent | Good | Good |
| **Web Access** | Yes (paid) | Yes | Yes |
| **Free Tier** | Yes | Yes | Yes |

### How to Choose the Right Tool
- **Writing and coding** → ChatGPT
- **Document analysis** → Claude
- **Research with current info** → Gemini
- **Marketing content** → Jasper AI`,
        resources: [
  { title: 'OpenAI Docs', type: 'link', url: 'https://platform.openai.com/docs' },
  { title: 'Anthropic (Claude)', type: 'link', url: 'https://www.anthropic.com' },
  { title: 'Google AI (Gemini)', type: 'link', url: 'https://ai.google' },
],
      },
      {
        type: 'practice_quiz',
        title: 'Practice Quiz — Check Understanding',
        practice: [
          {
            question: 'Which AI tool is widely used for conversational interaction and general tasks?',
            options: ['Excel', 'ChatGPT', 'Photoshop', 'WordPress'],
            answer: 1,
            explanation: 'ChatGPT by OpenAI is the most widely used AI tool for conversational interaction, content generation, and general productivity tasks.',
          },
          {
            question: 'Which AI assistant is known for strong reasoning and document analysis?',
            options: ['Claude', 'Gemini', 'Notion', 'Canva'],
            answer: 0,
            explanation: 'Claude by Anthropic is specifically known for strong reasoning capabilities and handling very long documents.',
          },
        ],
      },
      {
        type: 'graded_quiz',
        title: 'Graded Assignment — Pass to Unlock Module 5',
        graded: [
          {
            question: 'Which AI tool is widely used for conversational interaction and general tasks?',
            options: ['Excel', 'ChatGPT', 'Photoshop', 'WordPress'],
            correct: 1,
            explanation: 'ChatGPT is the most popular conversational AI tool for general tasks.',
          },
          {
            question: 'Which AI assistant is known for strong reasoning and document analysis?',
            options: ['Claude', 'Gemini', 'Notion', 'Canva'],
            correct: 0,
            explanation: 'Claude excels at document analysis and complex reasoning tasks.',
          },
          {
            question: 'What is a common use case of AI writing assistants?',
            options: ['Hardware design', 'Generating marketing content', 'Network security', 'Database management'],
            correct: 1,
            explanation: 'AI writing assistants are widely used for generating marketing content like blog posts, email campaigns, and social media copy.',
          },
          {
            question: 'Which AI tool is integrated with Google\'s ecosystem?',
            options: ['ChatGPT', 'Claude', 'Gemini', 'Jasper'],
            correct: 2,
            explanation: 'Gemini is developed by Google and integrates with Google Workspace tools like Docs, Sheets, and Gmail.',
          },
        ],
      },
    ],
  },

  // ─── MODULE 5 ───────────────────────────────────────────────────────────────
  {
    title: 'AI Image Generation',
    topics: [
      {
        type: 'overview',
        title: 'Module Overview — What You\'ll Learn',
        content: `## Module 5 — AI Image Generation

Learners understand how AI generates images and how to use modern image generation tools to create professional-quality visuals.

### What You Will Learn
- How AI creates images from text prompts
- Diffusion Models explained
- Writing effective image prompts
- Using Midjourney and Stable Diffusion

### Tools Covered
| Tool | Type | Best For |
|------|------|----------|
| **DALL·E** | Cloud API | Photorealistic images |
| **Midjourney** | Discord bot | Artistic, high-quality |
| **Stable Diffusion** | Open-source | Custom, local generation |

### Learning Resources
- OpenAI DALL·E: [https://openai.com/dall-e](https://openai.com/dall-e)
- Stability AI: [https://stability.ai](https://stability.ai)

> **Estimated Time:** Reading: 18 mins • Practice Quiz: 10 mins • Graded Assignment: 15 mins`,
      image: { src: '/course_assets/Module_5_p100_img1.png', caption: 'AI Image Generation' },
},
      {
        type: 'text',
        title: 'Core Reading — AI Image Generation',
        content: `## Section 5.1 — What is AI Image Generation?

AI image generation is a technology where Artificial Intelligence **creates images from text descriptions** (called prompts). Instead of drawing or designing manually, users describe what they want in natural language, and the AI generates a matching image.

### How It Works (Simple Overview)
\`\`\`
Text Prompt → AI Model → Generated Image
"A futuristic city at sunset" → [Image Output]
\`\`\`

### What AI Can Generate
- 🖼️ Photorealistic images
- 🎨 Digital art
- 🏠 Architecture concepts
- 👗 Fashion designs
- 📚 Illustrations for books
- 🎮 Game concept art

---

## Section 5.2 — Diffusion Models Explained

Most modern image generation systems use **Diffusion Models**.

These models generate images by **gradually removing noise** from a random pattern until a clear image emerges.

### The Process
\`\`\`
Random Noise → Gradually Refined → Clear Image
[Static] ----→ ----→ ----→ ----→ [Final Image]
\`\`\`

### Why Diffusion Models Are Powerful
- Can generate **highly detailed** and realistic images
- Can be guided by text descriptions
- Can generate images in many different styles

### Popular Diffusion Models
| Model | Company | Access |
|-------|---------|--------|
| Stable Diffusion | Stability AI | Open-source |
| Midjourney | Midjourney Inc. | Discord |
| DALL·E | OpenAI | API/ChatGPT |

---

## Section 5.3 — Writing Effective Image Prompts

The quality of your image depends heavily on the **quality of your prompt**.

### Key Components of an Image Prompt
1. **Subject** — What is in the image?
2. **Style** — What artistic style? (photorealistic, watercolor, digital art)
3. **Lighting** — Natural, dramatic, studio lighting?
4. **Mood** — Atmosphere or emotion
5. **Technical Details** — Resolution, aspect ratio

### Example Prompts

**Basic prompt:**
\`\`\`
A mountain landscape
\`\`\`

**Improved prompt:**
\`\`\`
A stunning mountain landscape at golden hour, 
photorealistic style, dramatic lighting, 
misty valleys, snow-capped peaks, 
4K quality, cinematic composition
\`\`\`

### Common Modifiers
| Category | Examples |
|----------|---------|
| Style | photorealistic, oil painting, digital art, anime |
| Lighting | golden hour, studio lighting, dramatic shadows |
| Quality | 4K, high detail, sharp focus |
| Mood | peaceful, dramatic, mysterious |

---

## Section 5.4 — Using Midjourney

**Midjourney** is one of the most popular AI tools for generating artistic images. It is widely used by designers, illustrators, content creators, and marketing teams.

### Step-by-Step: Using Midjourney
1. Join the Midjourney server on **Discord**
2. Enter the image generation channel
3. Use the command: \`/imagine prompt: futuristic city skyline at sunset\`
4. The AI generates **4 image options**
5. Users can **upscale** or **modify** results

### Real World Example
Design studios use Midjourney to create concept art for games, movies, and branding projects.

---

## Section 5.5 — Using Stable Diffusion

**Stable Diffusion** is an open-source image generation model that can be run locally.

### Advantages of Stable Diffusion
- **Free to use** — no subscription required
- **Runs locally** — no data sent to the cloud
- **Highly customizable** — many community models
- **No content restrictions** — (use responsibly)

### Tools to Run Stable Diffusion
| Tool | Platform | Description |
|------|---------|-------------|
| **AUTOMATIC1111** | Local | Most popular web UI |
| **ComfyUI** | Local | Advanced node-based UI |
| **HuggingFace Spaces** | Cloud | Browser-based |

**HuggingFace:** [https://huggingface.co](https://huggingface.co)

---

## Section 5.6 — Mini Project: AI Image Showcase

Now it's your turn to apply what you've learned! Build a simple web-based image gallery using your favorite AI image generator and link it to your GitHub repository.

### Project Requirements:
1. Generate 5 unique, high-quality images using **Midjourney**, **Stable Diffusion**, or **DALL-E**.
2. Build a simple HTML/CSS/JS or React page to showcase your AI gallery.
3. Push your code to a new public GitHub repository.
4. Link your repository using the button below to complete the course!

### Submit Your Project:
[![GitHub Repo Link](https://img.shields.io/badge/GitHub-Repository-blue?logo=github&style=for-the-badge)](https://github.com/)`,
        resources: [
  { title: 'DALL·E', type: 'link', url: 'https://openai.com/dall-e' },
  { title: 'Stability AI', type: 'link', url: 'https://stability.ai' },
  { title: 'Hugging Face', type: 'link', url: 'https://huggingface.co' },
],
      },
      {
        type: 'practice_quiz',
        title: 'Practice Quiz — Check Understanding',
        practice: [
          {
            question: 'What is the main function of AI image generation?',
            options: ['Analyze images', 'Create images from text prompts', 'Edit videos', 'Build databases'],
            answer: 1,
            explanation: 'AI image generation creates new images from text descriptions (prompts) using models like DALL·E, Midjourney, and Stable Diffusion.',
          },
          {
            question: 'What technology powers most modern AI image generation systems?',
            options: ['Decision Trees', 'Diffusion Models', 'Linear Regression', 'Rule-Based Systems'],
            answer: 1,
            explanation: 'Diffusion Models power most modern image generators — they work by gradually removing noise from a random image until a clear result emerges.',
          },
        ],
      },
      {
        type: 'graded_quiz',
        title: 'Graded Assignment — Pass to Unlock Module 6',
        graded: [
          {
            question: 'What is the main function of AI image generation?',
            options: ['Analyze images', 'Create images from text prompts', 'Edit videos', 'Build databases'],
            correct: 1,
            explanation: 'AI image generation creates images from text descriptions.',
          },
          {
            question: 'Which technology powers most modern AI image generation systems?',
            options: ['Decision Trees', 'Diffusion Models', 'Linear Regression', 'Rule-Based Systems'],
            correct: 1,
            explanation: 'Diffusion Models are the core technology behind Stable Diffusion, Midjourney, and DALL·E.',
          },
          {
            question: 'What is an important component of an effective image prompt?',
            options: ['Lighting description', 'Hardware configuration', 'Database query', 'Network protocol'],
            correct: 0,
            explanation: 'Lighting description (e.g., golden hour, studio lighting) significantly improves AI-generated image quality.',
          },
          {
            question: 'Which tool is an open-source image generation model?',
            options: ['Midjourney', 'Stable Diffusion', 'Photoshop', 'Illustrator'],
            correct: 1,
            explanation: 'Stable Diffusion is open-source and can be run locally without a subscription.',
          },
        ],
      },
    ],
  },
];

export const getCurriculumData = (courseId: string): ModuleData[] => {
  return CURRICULUM_DATA;
};
