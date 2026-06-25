import { CURRICULUM_DATA, ModuleData } from '../data/curriculumData';
import { GFG_CURRICULUM_DATA } from '../data/gfgCurriculumData';
import { AI_AUTOMATION_CURRICULUM } from '../data/aiAutomationCurriculum';

/**
 * Helper to sanitize curriculum topics to ensure they are always renderable strings or simple objects.
 */
const sanitizeTopic = (topic: any): any => {
  if (typeof topic === 'string') return topic;
  if (typeof topic === 'object' && topic !== null) {
    // If it's a topic object with content/title, return a simple object or string
    return topic.title || topic.content || JSON.stringify(topic);
  }
  return String(topic);
};

export const getDetailedCurriculum = (courseId: string): ModuleData[] => {
  const resolvedId = courseId.toLowerCase();
  
  if (resolvedId === 'ai-foundations' || resolvedId.includes('fundamentals')) {
    // Normalize the CURRICULUM_DATA to ensure topics are strings and filter out quiz items
    return CURRICULUM_DATA.map(mod => ({
      ...mod,
      topics: mod.topics
        .filter(t => {
          const title = typeof t === 'string' ? t : (t.title || '');
          return !title.includes('Practice Quiz') && !title.includes('Graded Assignment');
        })
        .map(sanitizeTopic)
    }));
  }

  if (resolvedId.includes('ai-automation')) {
    return AI_AUTOMATION_CURRICULUM.map(mod => ({
      title: mod.title,
      description: mod.description,
      duration: mod.duration,
      topics: mod.topics.map(t => ({
        type: t.type || 'text',
        title: t.title,
        content: t.content
      }))
    }));
  }
  
  // Normalize the default CURRICULUM_DATA to ensure topics are strings
  return CURRICULUM_DATA.map(mod => ({
    ...mod,
    topics: mod.topics
      .filter(t => {
        const title = typeof t === 'string' ? t : (t.title || '');
        return !title.includes('Practice Quiz') && !title.includes('Graded Assignment');
      })
      .map(sanitizeTopic)
  }));
};
