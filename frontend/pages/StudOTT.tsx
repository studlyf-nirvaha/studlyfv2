import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, X, Clock, Plus, Home, Headphones, Sparkles, BookOpen, BrainCircuit, TrendingUp, ChevronRight, User, Search, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const getYouTubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getYouTubeThumbnail = (url: string) => {
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : '';
};

const SIDEBAR_ITEMS = [
  { icon: Home, label: 'Home', id: 'home' },
  { icon: Headphones, label: 'Podcast', id: 'podcast' },
  { icon: Sparkles, label: 'Modern Spirituality', id: 'spirituality' },
  { icon: BookOpen, label: 'Micro Learning', id: 'micro' },
  { icon: BrainCircuit, label: 'Vibe with AI', id: 'vibe' },
  { icon: TrendingUp, label: 'Business Studies', id: 'business' },
  { icon: History, label: 'History', id: 'history' },
];

const FEATURED_VIDEOS: VideoItem[] = [
  {
    id: 'feat-1',
    title: 'The Reality of Building an AI Startup',
    subtitle: 'Dive into the untold truths of building and scaling a generative AI startup in today\'s hyper-competitive landscape. Unfiltered insights from founders who are in the trenches.',
    url: 'https://www.youtube.com/watch?v=1bRwQVOSynE',
    category: 'Startup Secrets',
    duration: '45 mins',
    tags: ['AI', 'Startup', 'Exclusive']
  },
  {
    id: 'feat-2',
    title: 'Mastering System Design in 2026',
    subtitle: 'An architectural deep dive into how top tier tech companies are structuring their microservices, streaming pipelines, and data layers for massive global scale.',
    url: 'https://www.youtube.com/watch?v=b4b8ktEV4Bg',
    category: 'Engineering Mastery',
    duration: '32 mins',
    tags: ['System Design', 'Architecture', 'Advanced']
  },
  {
    id: 'feat-3',
    title: 'The Psychology of Extreme Productivity',
    subtitle: 'Unlocking deep work and flow states. Learn the exact protocols top performers use to manage their time and attention in an era of endless digital distractions.',
    url: 'https://www.youtube.com/watch?v=5rJ8P1VnZIM',
    category: 'Deep Work',
    duration: '18 mins',
    tags: ['Productivity', 'Focus', 'Mindset']
  },
  {
    id: 'feat-4',
    title: 'Vibe with AI: The LLM Revolution',
    subtitle: 'Understanding the core mechanisms behind large language models and how to leverage prompt engineering as a powerful cognitive extension for your daily workflows.',
    url: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
    category: 'AI Decoded',
    duration: '52 mins',
    tags: ['LLMs', 'Research', 'Deep Learning']
  },
  {
    id: 'feat-5',
    title: 'Designing Next-Gen User Experiences',
    subtitle: 'Exploring spatial computing, gesture-based interfaces, and how the physical and digital worlds are seamlessly blending together in modern product design.',
    url: 'https://www.youtube.com/watch?v=1bRwQVOSynE',
    category: 'Design Systems',
    duration: '24 mins',
    tags: ['UI/UX', 'Product', 'Future']
  }
];

interface VideoItem {
  id: string | number;
  url?: string;
  title?: string;
  subtitle?: string;
  category?: string;
  duration?: string;
  tags?: string[];
  watchedAt?: number;
}

interface CategoryData {
  title: string;
  desc: string;
  videos: VideoItem[];
}

const DEFAULT_CATEGORIES: Record<string, CategoryData> = {
  'podcast': {
    title: 'Podcast',
    desc: 'Deep dives and unfiltered conversations with industry leaders and visionary founders.',
    videos: []
  },
  'spirituality': {
    title: 'Modern Spirituality',
    desc: 'Finding balance, focus, and mental clarity in a hyper-connected, fast-paced world.',
    videos: []
  },
  'micro': {
    title: 'Micro Learning',
    desc: 'Short, powerful bursts of knowledge to accelerate your enterprise career.',
    videos: []
  },
  'vibe': {
    title: 'Vibe with AI',
    desc: 'Exploring the bleeding edge of Artificial Intelligence, prompt engineering, and LLMs.',
    videos: []
  },
  'business': {
    title: 'Business Studies',
    desc: 'Core business concepts, financial literacy, market analysis, and product strategies.',
    videos: []
  }
};

const VideoCard = ({ vid, onPlay, isHistory = false }: { vid: VideoItem, onPlay: (vid: VideoItem, title: string, author: string) => void, isHistory?: boolean }) => {
  const [title, setTitle] = useState(vid.title || '');
  const [author, setAuthor] = useState(vid.subtitle || '');
  const [isLoading, setIsLoading] = useState(!vid.title && !!vid.url);

  useEffect(() => {
    if (vid.url && !vid.title) {
      // Stagger fetches slightly to avoid sudden burst of requests
      const numericId = typeof vid.id === 'number' ? vid.id : 0;
      const delay = (numericId % 10) * 150;
      const timer = setTimeout(() => {
        fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(vid.url!)}&format=json`)
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              setTitle(data.title || 'StudOTT Video');
              setAuthor(data.author_name || 'Content');
            } else {
              setTitle('StudOTT Video');
              setAuthor('Content');
            }
            setIsLoading(false);
          })
          .catch(() => {
            setTitle('StudOTT Video');
            setAuthor('Content');
            setIsLoading(false);
          });
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [vid.url, vid.title, vid.id]);

  return (
    <div 
      onClick={() => vid.url && onPlay(vid, title, author)}
      className="w-full aspect-video relative rounded-lg overflow-hidden cursor-pointer group shadow-sm hover:shadow-[0_8px_25px_rgba(108,43,255,0.4)] border border-white/5 hover:border-[#6C2BFF]/50 transition-all duration-300 hover:-translate-y-1 hover:scale-105 bg-[#141414]"
    >
      {vid.url ? (
        <img 
          src={getYouTubeThumbnail(vid.url)} 
          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105" 
          alt={title || 'Video Thumbnail'} 
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#1a1a2e] to-[#0A0A0F] flex items-center justify-center opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105">
           <Play className="w-8 h-8 text-white/10" />
        </div>
      )}
      
      {/* Shadow Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-[#030305]/20 to-transparent opacity-100 group-hover:opacity-90 transition-opacity" />
      <div className="absolute inset-0 bg-[#6C2BFF]/20 mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Top Tag or Resume CTA */}
      {isHistory ? (
        <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:translate-y-0 z-10">
          <span className="px-2 py-1 bg-[#6C2BFF]/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider rounded-md border border-white/20 shadow-[0_4px_15px_rgba(108,43,255,0.5)] flex items-center gap-1">
            <Play className="w-2.5 h-2.5 fill-white" /> Resume Watching
          </span>
        </div>
      ) : vid.category ? (
        <div className="absolute top-2 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-y-1 group-hover:translate-y-0 z-10">
          <span className="px-1.5 py-0.5 bg-black/60 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-wider rounded border border-white/10">{vid.category}</span>
        </div>
      ) : null}

      {/* Play Icon - Small */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100 z-10">
        <div className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-full border border-white/30 flex items-center justify-center shadow-[0_0_20px_rgba(108,43,255,0.5)] group-hover:bg-white/20 transition-colors">
          <Play className="w-4 h-4 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Content Bottom */}
      <div className="absolute bottom-0 left-0 p-2.5 w-full transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300 ease-out z-10">
        {isLoading ? (
          <div className="h-3 w-3/4 bg-white/10 rounded mb-1 animate-pulse" />
        ) : (
          <h3 className="text-white font-semibold text-xs sm:text-sm leading-tight mb-0.5 group-hover:text-[#A88CFF] transition-colors line-clamp-1">{title || 'Coming Soon'}</h3>
        )}
        
        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
          {isLoading ? (
            <div className="h-2 w-1/2 bg-white/10 rounded animate-pulse" />
          ) : (
            <p className="text-gray-400 text-[9px] font-medium line-clamp-1 pr-2">{author || 'Structural layout'}</p>
          )}
          {vid.duration && (
            <span className="flex items-center gap-1 text-[8px] text-white font-bold bg-white/10 px-1.5 py-0.5 rounded border border-white/10 backdrop-blur-md shrink-0">
              <Clock className="w-2.5 h-2.5" /> {vid.duration}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const StudOTT: React.FC = () => {
  const { user } = useAuth();
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState('home');
  const [categories, setCategories] = useState<Record<string, CategoryData>>(DEFAULT_CATEGORIES);
  const [showIntro, setShowIntro] = useState(true);
  const [heroVideo, setHeroVideo] = useState(FEATURED_VIDEOS[0]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [continueWatchingVideos, setContinueWatchingVideos] = useState<VideoItem[]>([]);
  
  const introVideoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const userId = user?.user_id || user?.uid || user?.email || 'guest';
  const historyKey = `studott_history_${userId}`;

  // Load History
  useEffect(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        setContinueWatchingVideos(JSON.parse(saved));
      } else {
        setContinueWatchingVideos([]);
      }
    } catch (e) {
      console.error("Failed to parse history", e);
    }
  }, [historyKey]);

  const handleVideoOpen = (vid: VideoItem, fetchedTitle: string, fetchedSubtitle: string) => {
    setActiveVideoUrl(vid.url || null);
    if (!vid.url) return;
    
    const fullVid: VideoItem = {
      ...vid,
      title: vid.title || fetchedTitle,
      subtitle: vid.subtitle || fetchedSubtitle,
      watchedAt: Date.now()
    };
    
    setContinueWatchingVideos(prev => {
      const filtered = prev.filter(v => v.url !== fullVid.url);
      const newHistory = [fullVid, ...filtered].slice(0, 15);
      localStorage.setItem(historyKey, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Flatten videos for search
  const allVideos = useMemo(() => {
    const list: VideoItem[] = [...FEATURED_VIDEOS];
    Object.values(categories).forEach(cat => {
      list.push(...cat.videos);
    });
    // Remove duplicates by URL
    const unique = new Map();
    list.forEach(v => { if (v.url && !unique.has(v.url)) unique.set(v.url, v); });
    return Array.from(unique.values()) as VideoItem[];
  }, [categories]);

  // Search Scoring Logic
  const getSearchScore = (v: VideoItem, q: string) => {
    const title = v.title?.toLowerCase() || '';
    const category = v.category?.toLowerCase() || '';
    const subtitle = v.subtitle?.toLowerCase() || '';
    const tags = v.tags || [];
    
    let score = 0;
    
    // 1. Title matching (Highest Priority)
    if (title === q) score += 100;
    else if (title.startsWith(q)) score += 80;
    else if (title.includes(q)) score += 50;
    
    // 2. Tags/Keywords
    if (tags.some(t => t.toLowerCase() === q)) score += 30;
    else if (tags.some(t => t.toLowerCase().includes(q))) score += 20;
    
    // 3. Category
    if (category === q) score += 15;
    else if (category.includes(q)) score += 10;
    
    // 4. Mentor/Subtitle
    if (subtitle === q) score += 5;
    else if (subtitle.includes(q)) score += 2;
    
    return score;
  };

  // Filter videos
  const searchResults = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return [];
    const lowerQ = debouncedSearchQuery.toLowerCase();
    
    return allVideos
      .map(v => ({ video: v, score: getSearchScore(v, lowerQ) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.video);
  }, [debouncedSearchQuery, allVideos]);

  // Search suggestions (max 5)
  const suggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerQ = searchQuery.toLowerCase();
    
    return allVideos
      .map(v => ({ video: v, score: getSearchScore(v, lowerQ) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.video)
      .slice(0, 5);
  }, [searchQuery, allVideos]);

  useEffect(() => {
    // Pick a random video on mount
    const randomVideo = FEATURED_VIDEOS[Math.floor(Math.random() * FEATURED_VIDEOS.length)];
    setHeroVideo(randomVideo);
  }, []);

  const handleIntroEnd = () => {
    setShowIntro(false);
  };

  useEffect(() => {
    let isMounted = true;
    if (showIntro && introVideoRef.current) {
      const el = introVideoRef.current;
      const playPromise = el.play();
      if (playPromise !== undefined) {
        playPromise.catch(e => {
          if (!isMounted) return;
          // If browser blocks unmuted autoplay, fallback to muted
          if (e.name === 'NotAllowedError') {
            el.muted = true;
            el.play().catch(() => {
              if (isMounted) handleIntroEnd();
            });
          }
        });
      }
    }
    return () => { isMounted = false; };
  }, [showIntro]);

  const heroThumb = getYouTubeThumbnail(heroVideo.url || '');

  const scrollRow = (rowId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(`row-${rowId}`);
    if (container) {
      const scrollAmount = container.clientWidth * 0.75;
      container.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // Prevent scroll when modal is open
  useEffect(() => {
    if (activeVideoUrl) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [activeVideoUrl]);

  // Load CSV Data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/studott-content.csv');
        if (!response.ok) return;
        const text = await response.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

        const newCategories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
        let currentKey = '';
        let videoId = 1;

        const getKey = (title: string) => {
          const t = title.toLowerCase();
          if (t.includes('podcast')) return 'podcast';
          if (t.includes('spirituality')) return 'spirituality';
          if (t.includes('micro')) return 'micro';
          if (t.includes('vibe') || t.includes('ai')) return 'vibe';
          if (t.includes('business')) return 'business';
          return t.replace(/\s+/g, '-');
        };

        for (const line of lines) {
          if (line.startsWith('http')) {
            if (currentKey && newCategories[currentKey]) {
              newCategories[currentKey].videos.push({
                id: videoId++,
                url: line,
                category: newCategories[currentKey].title,
                duration: ''
              });
            }
          } else {
            currentKey = getKey(line);
            if (!newCategories[currentKey]) {
              newCategories[currentKey] = { title: line, desc: '', videos: [] };
            } else {
              newCategories[currentKey].title = line; // Use exactly what is in CSV
            }
          }
        }
        
        setCategories(newCategories);
      } catch (err) {
        console.error('Failed to parse CSV data', err);
      }
    };
    loadData();
  }, []);

  return (
    <div className="flex h-screen bg-[#030305] text-white font-sans selection:bg-[#6C2BFF]/40 relative overflow-hidden">
      
      {/* Premium Cinematic Intro Overlay */}
      <AnimatePresence>
        {showIntro && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 1.05, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeOut" } }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="w-full h-full relative overflow-hidden bg-black"
            >
              <video
                className="w-full h-full object-cover"
                src="/videos/studott-intro.mp4"
                autoPlay
                muted
                playsInline
                onEnded={handleIntroEnd}
                onError={handleIntroEnd}
                ref={introVideoRef}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/80 via-transparent to-transparent pointer-events-none" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Ambient Mesh */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#6C2BFF]/15 rounded-full blur-[150px] mix-blend-screen" />
        <div className="absolute bottom-[20%] right-[-10%] w-[800px] h-[800px] bg-[#EC4899]/10 rounded-full blur-[150px] mix-blend-screen" />
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideoUrl && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          >
            <button 
              onClick={() => setActiveVideoUrl(null)}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-black/40 rounded-full flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all z-[210] border border-white/10 shadow-2xl group backdrop-blur-md"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-90 transition-transform duration-300" />
            </button>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full h-full bg-black relative"
            >
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <div className="w-12 h-12 border-4 border-[#6C2BFF]/30 border-t-[#6C2BFF] rounded-full animate-spin" />
              </div>
              <iframe
                className="relative z-10 w-full h-full"
                src={`https://www.youtube.com/embed/${getYouTubeId(activeVideoUrl)}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Sidebar */}
      <aside className="hidden md:flex flex-col w-20 xl:w-64 h-full border-r border-white/5 bg-[#05050A]/60 backdrop-blur-3xl z-40 pt-[104px] pb-8 shrink-0 transition-all duration-500">
        <div className="px-6 mb-12 flex justify-center xl:justify-start cursor-pointer" onClick={() => navigate('/')}>
          <img src="/images/studott.jpg" alt="STUDOTT" className="h-8 xl:h-9 w-auto object-contain drop-shadow-[0_0_15px_rgba(108,43,255,0.2)] rounded-sm" />
        </div>
        
        <nav className="flex-1 flex flex-col gap-2 px-3">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeMenu === item.id;
            return (
              <button 
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${isActive ? 'bg-[#6C2BFF]/15 text-white' : 'text-gray-500 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? 'text-[#A88CFF]' : 'group-hover:text-[#A88CFF]'}`} />
                <span className={`hidden xl:block text-sm font-bold tracking-wide transition-colors ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{item.label}</span>
                {isActive && (
                  <motion.div layoutId="activeNavIndicator" className="absolute left-0 w-1 h-6 bg-[#6C2BFF] rounded-r-full shadow-[0_0_10px_#6C2BFF]" />
                )}
              </button>
            )
          })}
        </nav>
        
        {/* Sidebar ends cleanly after nav */}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10 overflow-y-auto h-full custom-scrollbar pt-[88px] sm:pt-[104px] pb-16">
        
        <div className="md:hidden flex items-center justify-between px-6 py-4 sticky top-0 z-40 bg-[#05050A]/80 backdrop-blur-xl border-b border-white/5">
          <img src="/images/studott.jpg" alt="STUDOTT" className="h-6 w-auto object-contain drop-shadow-[0_0_10px_rgba(108,43,255,0.2)] rounded-sm" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6C2BFF] to-[#EC4899] p-[1.5px]">
            <div className="w-full h-full bg-[#05050A] rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {activeMenu === 'home' ? (
          <>
            {/* Search Bar Container */}
            <div className="px-6 lg:px-12 pt-6 pb-2 relative z-50">
              <div className="relative max-w-2xl mx-auto">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-[#A88CFF] transition-colors" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-11 pr-10 py-3.5 bg-[#141414]/80 border border-white/10 rounded-2xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6C2BFF]/50 focus:border-[#6C2BFF]/50 backdrop-blur-xl transition-all shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                    placeholder="Search by title, mentor, category, or topic..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setDebouncedSearchQuery('');
                      }}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    >
                      <X className="h-5 w-5 text-gray-400 hover:text-white transition-colors" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute w-full mt-2 bg-[#1A1A1A]/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[100]"
                    >
                      {suggestions.map((vid, idx) => (
                        <div
                          key={`sugg-${vid.id || idx}`}
                          onClick={() => {
                            setSearchQuery(vid.title || '');
                            setDebouncedSearchQuery(vid.title || '');
                            setShowSuggestions(false);
                          }}
                          className="px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center gap-3 transition-colors border-b border-white/5 last:border-0"
                        >
                          <Search className="w-4 h-4 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">{vid.title}</p>
                            {(vid.category || vid.subtitle) && (
                              <p className="text-gray-400 text-xs truncate">{vid.category} {vid.subtitle ? `• ${vid.subtitle}` : ''}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Search Results */}
            {debouncedSearchQuery.trim() !== '' && (
              <div className="relative z-20 pt-8 pb-12 px-6 lg:px-12">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 mb-6">
                  Search Results <span className="text-gray-500 text-lg font-normal">for "{debouncedSearchQuery}"</span>
                </h2>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {searchResults.map((vid, idx) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: idx * 0.05 }}
                        key={vid.id} 
                        className="w-full"
                      >
                        <VideoCard vid={vid} onPlay={handleVideoOpen} />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full bg-[#141414]/50 border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                      <Search className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No matching content found</h3>
                    <p className="text-gray-400">Try searching by mentor, category, or topic</p>
                  </div>
                )}
              </div>
            )}

            {/* Hero Section */}
            {!debouncedSearchQuery.trim() && (
            <div className="relative pt-8 md:pt-16 lg:pt-20 pb-16 px-6 lg:px-12 flex flex-col-reverse lg:flex-row items-center justify-center gap-10 lg:gap-16 min-h-[60vh] lg:min-h-[75vh]">
              
              {/* Left Content */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full lg:w-[45%] xl:w-[40%] relative z-10 flex flex-col items-start"
              >
                <div className="flex flex-wrap items-center gap-3 mb-6">
                  <span className="px-3 py-1.5 bg-gradient-to-r from-[#6C2BFF] to-[#8B5CF6] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-md shadow-[0_0_20px_rgba(108,43,255,0.4)]">
                    Featured Session
                  </span>
                </div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6 drop-shadow-2xl">
                  {heroVideo.title}
                </h1>
                
                <p className="text-base sm:text-lg text-gray-300 mb-8 max-w-lg leading-relaxed font-medium drop-shadow-md">
                  {heroVideo.subtitle}
                </p>
                
                <div className="flex flex-wrap items-center gap-3 mb-10">
                  {heroVideo.tags?.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-300 text-[11px] uppercase tracking-wider font-bold rounded-lg">{tag}</span>
                  ))}
                  <span className="px-3 py-1.5 bg-white/5 border border-[#6C2BFF]/30 text-[#A88CFF] text-[11px] uppercase tracking-wider font-bold rounded-lg">{heroVideo.duration}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <button 
                    onClick={() => handleVideoOpen(heroVideo, heroVideo.title || '', heroVideo.subtitle || '')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-white text-black rounded-xl font-black hover:bg-gray-200 transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                  >
                    <Play className="w-5 h-5 fill-black" />
                    <span className="tracking-widest text-sm uppercase">Watch Now</span>
                  </button>
                  <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-white/5 backdrop-blur-md text-white rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10 hover:border-[#6C2BFF]/50 hover:scale-105 active:scale-95 group">
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    <span className="tracking-widest text-sm uppercase text-gray-300 group-hover:text-white transition-colors">Save List</span>
                  </button>
                </div>
              </motion.div>

              {/* Right Poster */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="w-full lg:w-[55%] xl:w-[60%] relative z-10"
              >
                {/* 3D Perspective Container */}
                <div className="perspective-1000 w-full h-full">
                  <div 
                    className="relative w-full aspect-video sm:aspect-[16/10] lg:aspect-[16/9] rounded-[2rem] overflow-hidden shadow-[0_20px_80px_rgba(108,43,255,0.25)] border border-white/10 group cursor-pointer transform-gpu hover:rotate-y-[-2deg] hover:rotate-x-[2deg] transition-all duration-700 bg-[#0A0A0F]" 
                    onClick={() => handleVideoOpen(heroVideo, heroVideo.title || '', heroVideo.subtitle || '')}
                  >
                    <img src={heroThumb} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-1000" alt="Hero" />
                    
                    {/* Cinematic Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#05050A] via-[#05050A]/20 to-transparent mix-blend-overlay" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05050A] via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 bg-[#6C2BFF]/20 mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    
                    {/* Premiere Badge */}
                    <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-xl">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Premiere</span>
                    </div>

                    {/* Central Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center scale-90 group-hover:scale-100 transition-transform duration-500 ease-out">
                      <div className="w-16 h-16 sm:w-24 sm:h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/30 shadow-[0_0_50px_rgba(108,43,255,0.5)] group-hover:bg-white/20 group-hover:border-white/50 transition-all duration-300">
                        <Play className="w-6 h-6 sm:w-10 sm:h-10 text-white fill-white ml-1 sm:ml-2 drop-shadow-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            )}

            {/* Home Rows (Categories) */}
            <div className="relative z-20 pb-24 px-6 lg:px-12 -mt-4 space-y-12 md:space-y-16">
              {Object.entries(categories).map(([key, row], rIdx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, delay: rIdx * 0.1 }}
                  key={key}
                  className="w-full relative group/row"
                >
                  <div className="flex items-center justify-between mb-4 lg:mb-5">
                    <h2 
                      onClick={() => setActiveMenu(key)}
                      className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2 cursor-pointer group-hover/row:text-[#A88CFF] transition-colors"
                    >
                      {row.title}
                      <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-[#A88CFF] opacity-0 -ml-2 group-hover/row:opacity-100 group-hover/row:translate-x-1 transition-all duration-300" />
                    </h2>
                  </div>
                  <div className="relative group/scroll">
                    <button 
                      onClick={() => scrollRow(key, 'left')}
                      className="absolute left-0 sm:-left-2 top-[40%] -translate-y-[50%] z-30 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none group-hover/scroll:pointer-events-auto"
                    >
                      <div className="w-10 h-24 sm:w-12 sm:h-32 bg-[#141414]/95 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 hover:scale-105 transition-all shadow-2xl">
                        <ChevronRight className="w-8 h-8 text-white rotate-180 opacity-70 hover:opacity-100" />
                      </div>
                    </button>

                    <div 
                      id={`row-${key}`}
                      className="flex overflow-x-auto gap-3 md:gap-4 pb-6 pt-2 snap-x snap-mandatory pr-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                      {row.videos && row.videos.length > 0 ? (
                        row.videos.map((vid: VideoItem) => (
                          <div key={vid.id} className="w-[160px] sm:w-[200px] lg:w-[240px] xl:w-[260px] snap-center shrink-0">
                            <VideoCard vid={vid} onPlay={handleVideoOpen} />
                          </div>
                        ))
                      ) : (
                        Array.from({ length: 7 }).map((_, i) => (
                          <div key={`placeholder-${key}-${i}`} className="w-[160px] sm:w-[200px] lg:w-[240px] xl:w-[260px] snap-center shrink-0">
                            <VideoCard 
                              vid={{ id: `placeholder-${key}-${i}`, category: row.title, duration: 'TBA' }} 
                              onPlay={handleVideoOpen} 
                            />
                          </div>
                        ))
                      )}
                    </div>

                    <button 
                      onClick={() => scrollRow(key, 'right')}
                      className="absolute right-0 sm:right-2 top-[40%] -translate-y-[50%] z-30 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none group-hover/scroll:pointer-events-auto"
                    >
                      <div className="w-10 h-24 sm:w-12 sm:h-32 bg-[#141414]/95 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 hover:scale-105 transition-all shadow-2xl">
                        <ChevronRight className="w-8 h-8 text-white opacity-70 hover:opacity-100" />
                      </div>
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* Continue Watching Row */}
              {continueWatchingVideos.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6 }}
                  className="w-full relative group/row"
                >
                  <div className="flex items-center justify-between mb-4 lg:mb-5">
                    <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2 group-hover/row:text-[#A88CFF] transition-colors">
                      <History className="w-5 h-5 md:w-6 md:h-6 text-[#A88CFF]" />
                      Continue Watching
                    </h2>
                  </div>
                  <div className="relative group/scroll">
                    <button 
                      onClick={() => scrollRow('continue-watching', 'left')}
                      className="absolute left-0 sm:-left-2 top-[40%] -translate-y-[50%] z-30 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none group-hover/scroll:pointer-events-auto"
                    >
                      <div className="w-10 h-24 sm:w-12 sm:h-32 bg-[#141414]/95 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 hover:scale-105 transition-all shadow-2xl">
                        <ChevronRight className="w-8 h-8 text-white rotate-180 opacity-70 hover:opacity-100" />
                      </div>
                    </button>

                    <div 
                      id="row-continue-watching"
                      className="flex overflow-x-auto gap-3 md:gap-4 pb-6 pt-2 snap-x snap-mandatory pr-12 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                      {continueWatchingVideos.map((vid: VideoItem) => (
                        <div key={`cw-${vid.id}-${vid.watchedAt}`} className="w-[160px] sm:w-[200px] lg:w-[240px] xl:w-[260px] snap-center shrink-0">
                          <VideoCard vid={vid} onPlay={handleVideoOpen} isHistory={true} />
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={() => scrollRow('continue-watching', 'right')}
                      className="absolute right-0 sm:right-2 top-[40%] -translate-y-[50%] z-30 opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none group-hover/scroll:pointer-events-auto"
                    >
                      <div className="w-10 h-24 sm:w-12 sm:h-32 bg-[#141414]/95 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 hover:scale-105 transition-all shadow-2xl">
                        <ChevronRight className="w-8 h-8 text-white opacity-70 hover:opacity-100" />
                      </div>
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="w-full relative py-2 mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-5 h-5 md:w-6 md:h-6 text-gray-500" />
                    <h2 className="text-xl md:text-2xl font-bold text-gray-500 tracking-tight">Continue Watching</h2>
                  </div>
                  <div className="w-full bg-[#141414]/40 border border-white/5 rounded-2xl p-6 sm:p-8 flex items-center justify-center text-center">
                    <p className="text-gray-400 font-medium">Start exploring content to build your watch history.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Gallery View for Specific Category or History */
          <div className="relative pt-8 md:pt-12 pb-24 px-6 lg:px-12 min-h-[80vh]">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 lg:mb-14"
            >
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-2xl flex items-center gap-4">
                {activeMenu === 'history' ? 'History' : categories[activeMenu]?.title}
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl font-medium">
                {activeMenu === 'history' ? 'Your recently watched content.' : categories[activeMenu]?.desc}
              </p>
            </motion.div>

            {activeMenu === 'history' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {continueWatchingVideos.length > 0 ? (
                  continueWatchingVideos.map((vid: VideoItem, idx: number) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      key={`hist-${vid.id}-${vid.watchedAt}`} 
                      className="w-full"
                    >
                      <VideoCard vid={vid} onPlay={handleVideoOpen} isHistory={true} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full w-full bg-[#141414]/40 border border-white/5 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <History className="w-12 h-12 text-gray-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">No Watch History</h3>
                    <p className="text-gray-400">Start exploring content to build your watch history.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                {categories[activeMenu]?.videos && categories[activeMenu].videos.length > 0 ? (
                  categories[activeMenu].videos.map((vid: VideoItem, idx: number) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      key={vid.id} 
                      className="w-full"
                    >
                      <VideoCard vid={vid} onPlay={handleVideoOpen} />
                    </motion.div>
                  ))
                ) : (
                  Array.from({ length: 12 }).map((_, idx) => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4, delay: idx * 0.05 }}
                      key={`placeholder-${idx}`} 
                      className="w-full"
                    >
                      <VideoCard 
                        vid={{ id: `placeholder-${idx}`, category: categories[activeMenu]?.title, duration: 'TBA' }} 
                        onPlay={handleVideoOpen} 
                      />
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </main>
      
    </div>
  );
};

export default StudOTT;
