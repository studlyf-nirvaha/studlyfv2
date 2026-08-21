/**
 * Utility to resolve asset paths, preferring optimized (.webp) versions
 * in the 'images-optimized' directory if available.
 */
export const getAssetPath = (path: string): string => {
  if (!path) return '';

  // If path is external, return as is
  if (path.startsWith('http')) return path;

  // Check if it's in the images directory and needs optimization
  if (path.startsWith('/images/')) {
    const fileName = path.split('/').pop() || '';
    const nameWithoutExt = fileName.replace(/\.(png|jpg|jpeg)$/, '');
    
    // Attempt to point to optimized version
    // Note: This assumes optimized files are in /images-optimized/ and have .webp extension
    return `/images-optimized/${nameWithoutExt}.webp`;
  }

  return path;
};

/**
 * Resolves a beautiful, relevant Unsplash image based on a course's title or school category
 * if no custom image is uploaded.
 */
export const getCourseImageUrl = (title: string = '', school: string = '', fallbackImage?: string): string => {
  if (fallbackImage && fallbackImage.trim() !== '') {
    return fallbackImage;
  }

  const lowerTitle = title.toLowerCase();
  const lowerSchool = school.toLowerCase();

  // 1. Generative AI & AI Fundamentals
  if (
    lowerTitle.includes('ai') ||
    lowerTitle.includes('artificial') ||
    lowerTitle.includes('generative') ||
    lowerTitle.includes('intelligence') ||
    lowerTitle.includes('machine learning') ||
    lowerTitle.includes('llm') ||
    lowerSchool.includes('ai') ||
    lowerSchool.includes('intelligence')
  ) {
    return 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop';
  }

  // 2. Data Science / Python / Analytics / Databases
  if (
    lowerTitle.includes('data') ||
    lowerTitle.includes('python') ||
    lowerTitle.includes('science') ||
    lowerTitle.includes('analytics') ||
    lowerTitle.includes('sql') ||
    lowerSchool.includes('data') ||
    lowerSchool.includes('science')
  ) {
    return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop';
  }

  // 3. Mobile App Development (React Native, Flutter, Swift, iOS, Android)
  if (
    lowerTitle.includes('mobile') ||
    lowerTitle.includes('phone') ||
    lowerTitle.includes('app') ||
    lowerTitle.includes('native') ||
    lowerTitle.includes('flutter') ||
    lowerTitle.includes('swift') ||
    lowerTitle.includes('ios') ||
    lowerTitle.includes('android') ||
    lowerSchool.includes('mobile') ||
    lowerSchool.includes('app')
  ) {
    return 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop';
  }

  // 4. UI/UX Design & Creative UI/UX (Figma, Creative, UI, UX)
  if (
    lowerTitle.includes('design') ||
    lowerTitle.includes('ui/ux') ||
    lowerTitle.includes('ui') ||
    lowerTitle.includes('ux') ||
    lowerTitle.includes('figma') ||
    lowerTitle.includes('creative') ||
    lowerTitle.includes('graphic') ||
    lowerSchool.includes('design') ||
    lowerSchool.includes('creative')
  ) {
    return 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&auto=format&fit=crop';
  }

  // 5. Frontend & Full-Stack Web Development
  if (
    lowerTitle.includes('frontend') ||
    lowerTitle.includes('web') ||
    lowerTitle.includes('full-stack') ||
    lowerTitle.includes('development') ||
    lowerTitle.includes('react') ||
    lowerTitle.includes('js') ||
    lowerTitle.includes('css') ||
    lowerSchool.includes('frontend') ||
    lowerSchool.includes('web')
  ) {
    return 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop';
  }

  // 6. Cyber Security / Security
  if (
    lowerTitle.includes('security') ||
    lowerTitle.includes('cyber') ||
    lowerTitle.includes('network') ||
    lowerSchool.includes('security') ||
    lowerSchool.includes('cyber')
  ) {
    return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop';
  }

  // 7. Product Management & Management
  if (
    lowerTitle.includes('product') ||
    lowerTitle.includes('management') ||
    lowerTitle.includes('pm') ||
    lowerTitle.includes('agile') ||
    lowerTitle.includes('scrum') ||
    lowerSchool.includes('management') ||
    lowerSchool.includes('business')
  ) {
    return 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=800&auto=format&fit=crop';
  }

  // 8. Generic Software Engineering / Coding fallback
  return 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop';
};
