// Curriculum data sourced from the GEN AI Course PDF.
// Do not modify UI components; this file provides data consumed by CoursePlayer.

export interface Topic {
  type: 'overview' | 'text' | 'practice_quiz' | 'graded_quiz' | 'image' | 'theory' | 'quiz';
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
      { type: 'overview', title: 'Module Overview', content: 'Building the foundation for AI.' },
      { type: 'text', title: 'What is Artificial Intelligence?', content: '...' },
      { type: 'text', title: 'Types of Artificial Intelligence', content: '...' },
      { type: 'text', title: 'What is Generative AI?', content: '...' },
      { type: 'text', title: 'How Generative AI is Transforming Industries', content: '...' }
    ]
  },
  // ─── MODULE 2 ───────────────────────────────────────────────────────────────
  {
    title: 'How Generative AI Works',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Under the hood of ChatGPT, Claude, and Gemini.' },
      { type: 'text', title: 'Machine Learning Basics', content: '...' },
      { type: 'text', title: 'Neural Networks Explained', content: '...' },
      { type: 'text', title: 'Transformers Architecture', content: '...' },
      { type: 'text', title: 'Tokens and Embeddings', content: '...' },
      { type: 'text', title: 'Large Language Models (LLMs)', content: '...' }
    ]
  },
  // ─── MODULE 3 ───────────────────────────────────────────────────────────────
  {
    title: 'Prompt Engineering Fundamentals',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Mastering AI control.' },
      { type: 'text', title: 'Prompt Structure', content: '...' },
      { type: 'text', title: 'Zero-Shot Prompting', content: '...' },
      { type: 'text', title: 'Few-Shot Prompting', content: '...' },
      { type: 'text', title: 'Chain-of-Thought Reasoning', content: '...' }
    ]
  },
  // ─── MODULE 4 ───────────────────────────────────────────────────────────────
  {
    title: 'AI Text Generation Tools',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Practical AI tools.' },
      { type: 'text', title: 'Using ChatGPT for Productivity', content: '...' },
      { type: 'text', title: 'Claude for Reasoning', content: '...' },
      { type: 'text', title: 'Gemini for Research', content: '...' },
      { type: 'text', title: 'AI Writing Assistants', content: '...' }
    ]
  },
  // ─── MODULE 5 ───────────────────────────────────────────────────────────────
  {
    title: 'AI Image Generation',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Generating visuals with AI.' },
      { type: 'text', title: 'What is AI Image Generation?', content: '...' },
      { type: 'text', title: 'Diffusion Models Explained', content: '...' },
      { type: 'text', title: 'Effective Image Prompts', content: '...' },
      { type: 'text', title: 'Midjourney & Stable Diffusion', content: '...' }
    ]
  },
  // ─── MODULE 6 ───────────────────────────────────────────────────────────────
  {
    title: 'AI Ethics, Bias, and Responsible AI',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Explore ethical considerations in AI deployment.' },
      { type: 'text', title: 'Understanding AI Bias', content: '...' },
      { type: 'text', title: 'Responsible AI Frameworks', content: '...' }
    ]
  },
  // ─── MODULE 7 ───────────────────────────────────────────────────────────────
  {
    title: 'AI-Driven Data Analysis',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Use AI to analyze business data.' },
      { type: 'text', title: 'Automated Data Pipelines', content: '...' },
      { type: 'text', title: 'Generating Insights', content: '...' }
    ]
  },
  // ─── MODULE 8 ───────────────────────────────────────────────────────────────
  {
    title: 'Vector Databases and RAG',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Implement RAG systems.' },
      { type: 'text', title: 'Vector Database Fundamentals', content: '...' },
      { type: 'text', title: 'Building RAG Pipelines', content: '...' }
    ]
  },
  // ─── MODULE 9 ───────────────────────────────────────────────────────────────
  {
    title: 'AI Strategy and Future Trends',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Develop AI business strategies.' },
      { type: 'text', title: 'Defining an AI Strategy', content: '...' },
      { type: 'text', title: 'Future Trends in AI', content: '...' }
    ]
  },
  // ─── MODULE 10 ───────────────────────────────────────────────────────────────
  {
    title: 'AI for Business Operations',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Automating business processes.' },
      { type: 'text', title: 'Process Mining with AI', content: '...' },
      { type: 'text', title: 'AI in Supply Chain', content: '...' }
    ]
  },
  // ─── MODULE 11 ───────────────────────────────────────────────────────────────
  {
    title: 'Advanced AI Architectures',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Understanding advanced models.' },
      { type: 'text', title: 'Multi-Modal AI', content: '...' },
      { type: 'text', title: 'Reinforcement Learning from Human Feedback (RLHF)', content: '...' }
    ]
  },
  // ─── MODULE 12 ───────────────────────────────────────────────────────────────
  {
    title: 'Capstone Project: Building an AI Solution',
    topics: [
      { type: 'overview', title: 'Module Overview', content: 'Final project execution.' },
      { type: 'text', title: 'Project Ideation', content: '...' },
      { type: 'text', title: 'Development and Deployment', content: '...' }
    ]
  },
];

export const getCurriculumData = (courseId: string): ModuleData[] => {
  return CURRICULUM_DATA;
};
