import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import WebImage from '../components/WebImage';
import { useAuth } from '../AuthContext';

interface Course {
  _id: string;
  title: string;
  description: string;
  role_tag: string;
  difficulty: string;
  // UI helper fields
  skills?: string[];
  duration?: string;
  image?: string;
  standard?: string;
  category?: string;
  price?: number;
  rating?: number;
  total_reviews?: number;
  total_hours?: number | string;
  level?: string;
  key_topics?: string[];
  last_updated?: string;
  instructor?: string;
  is_bestseller?: boolean;
  is_premium?: boolean;
  user_state?: 'NOT_PURCHASED' | 'IN_CART' | 'ENROLLED';
}

/* ─────────────────────────── mock fallback data ─────────────────────────── */
 // Removed MOCK_COURSES to only show database content.

const CourseCard = ({
  _id,
  title,
  description,
  role_tag,
  difficulty,
  skills,
  duration,
  image,
  standard,
  rating = 4.5,
  price = 0,
  is_bestseller = false,
  is_premium = false,
  user_state = 'NOT_PURCHASED',
  onCardClick,
}: Course & { onCardClick: (course: Course) => void }) => {
  // Default values for missing UI fields from DB
  const displaySkills = skills || ["System Design", "Scalability", "Security"];
  const displayDuration = duration || "12 Weeks";
  const displayImage = image || "https://miro.medium.com/max/938/0*lbtSAeYRtmUMAWeY.png";
  const displayStandard = standard || "PROTOCOL_X";

  const handleClick = () => {
    onCardClick({ _id, title, description, role_tag, difficulty, skills, duration, image, standard, rating, price, is_bestseller, is_premium, user_state } as Course);
  };

  return (
    <motion.div
      layout
      whileHover={{ y: -12 }}
      className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-3xl transition-all flex flex-col group relative cursor-pointer"
      onClick={handleClick}
    >
      <div className="h-64 relative overflow-hidden">
        <WebImage src={displayImage} alt={title} aspectRatio="aspect-video" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        <div className="absolute top-6 left-6 flex gap-2">
          <span className="bg-white/90 backdrop-blur-md text-[#7C3AED] text-[8px] font-black px-4 py-2 uppercase tracking-widest rounded-full shadow-lg">{displayDuration}</span>
          <span className="bg-[#7C3AED] text-white text-[8px] font-black px-4 py-2 uppercase tracking-widest rounded-full shadow-lg">{difficulty}</span>
          {is_bestseller && (
            <span className="bg-yellow-500 text-white text-[8px] font-black px-4 py-2 uppercase tracking-widest rounded-full shadow-lg">Bestseller</span>
          )}
          {is_premium && (
            <span className="bg-purple-600 text-white text-[8px] font-black px-4 py-2 uppercase tracking-widest rounded-full shadow-lg">Premium</span>
          )}
        </div>

        <div className="absolute top-6 right-6">
          <span className="font-mono text-[7px] font-bold text-white/80 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-md border border-white/20 uppercase tracking-[0.2em]">{displayStandard}</span>
        </div>

        <div className="absolute bottom-6 left-10 right-10">
          <h3 className="text-2xl font-black text-white mb-2 font-sans leading-tight uppercase tracking-tighter">{title}</h3>
          <div className="h-1 w-12 bg-[#7C3AED] rounded-full group-hover:w-full transition-all duration-500" />
        </div>
      </div>

      <div className="p-10 flex-grow flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[9px] font-black text-[#7C3AED] uppercase tracking-[0.3em]">{role_tag}</span>
          {rating && (
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${i < Math.floor(rating) ? 'bg-yellow-400' : 'bg-gray-200'
                      }`}
                  />
                ))}
              </div>
              <span className="text-[8px] font-bold text-gray-600">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-[#6B7280] mb-8 leading-relaxed font-medium line-clamp-2">{description}</p>

        <div className="flex flex-wrap gap-2 mb-10">
          {displaySkills.map((s: string) => (
            <span key={s} className="text-[9px] font-bold uppercase tracking-widest text-[#6B7280] bg-[#F9FAFB] px-4 py-2 rounded-xl border border-gray-100 group-hover:bg-[#F5F3FF] group-hover:border-[#7C3AED]/10 transition-colors">{s}</span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-100">
          <div>
            {price && price > 0 ? (
              <div className="text-2xl font-black text-[#111827]">₹{Number(price).toLocaleString('en-IN')}</div>
            ) : (
              <div className="text-lg font-black text-[#7C3AED]">FREE</div>
            )}
          </div>

          <div className="text-xs font-black uppercase tracking-[0.2em] text-[#6B7280]">
            {user_state === 'ENROLLED' && '✓ Enrolled'}
            {user_state === 'IN_CART' && '🛒 In Cart'}
            {user_state === 'NOT_PURCHASED' && 'Tap to preview'}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Courses: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [userStates, setUserStates] = useState<{ [key: string]: string }>({});

  const userId = user?.uid || 'test-user';

  const createSlug = (title: string, id: string) => {
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    // Append full ID for reliable extraction
    return `${slug}--${id}`;
  };

  const handleCourseClick = (course: Course) => {
    // Navigate to course detail page with slug
    const slug = createSlug(course.title, course._id);
    navigate(`/learn/courses/${slug}`);
  };

  // Fetch courses and user state
  useEffect(() => {
    const fetchData = async () => {
      console.log('🔵 Starting course fetch from:', `${API_BASE_URL}/api/courses`);
      try {
        setLoading(true);
        // Get all courses - REQUIRED
        console.log('📡 Fetching courses...');
        const coursesRes = await fetch(`${API_BASE_URL}/api/courses`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📥 Response status:', coursesRes.status);
        
        if (!coursesRes.ok) {
          console.error('❌ Courses API error:', coursesRes.status, coursesRes.statusText);
          const errText = await coursesRes.text();
          console.error('Error body:', errText);
          setCourses([]);
          return;
        }
        
        const coursesData = await coursesRes.json();
        console.log('✅ Courses data received:', coursesData);
        console.log('📊 Total courses:', coursesData?.length || 0);
        
        const allCourses = coursesData && Array.isArray(coursesData) ? coursesData : [];


        if (allCourses.length > 0) {
          setCourses(allCourses);
          console.log('✓ Courses set in state');
        } else {
          console.warn('⚠️ No courses in response or invalid format');
          setCourses([]);
        }
      } catch (err) {
        try { console.error('💥 Error fetching courses:', err instanceof Error ? err.message : String(err)); } catch (_) {}
        setCourses([]);
      } finally {
        setLoading(false);
        console.log('🏁 Loading finished');
      }

      // Get user course states - OPTIONAL (doesn't block course display)
      if (userId) {
        try {
          const stateRes = await fetch(`${API_BASE_URL}/api/user-courses/${userId}`);
          if (!stateRes.ok) {
            console.warn('User-courses API error:', stateRes.status);
            return;
          }
          const stateData = await stateRes.json();

          const states: { [key: string]: string } = {};
          stateData.enrolled?.forEach((c: Course) => {
            states[c._id] = 'ENROLLED';
          });
          stateData.in_cart?.forEach((c: Course) => {
            states[c._id] = 'IN_CART';
          });
          stateData.available?.forEach((c: Course) => {
            states[c._id] = 'NOT_PURCHASED';
          });

          setUserStates(states);
          console.log('User states fetched');
        } catch (err) {
          console.warn('Error fetching user-courses:', err);
          // Silently fail - don't break course display
        }
      }
    };

    fetchData();
  }, [userId]);

  const dynamicCategories = useMemo(() => {
    const predefined = ['All', 'Backend', 'Frontend', 'Software Engineering', 'Data', 'AI', 'Cyber'];
    const cats = new Set(predefined);
    if (courses && courses.length > 0) {
      courses.forEach(c => {
        if (c.role_tag) cats.add(c.role_tag);
      });
    }
    return Array.from(cats);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (activeCategory === 'All') return courses;
    return courses.filter(c => c.role_tag === activeCategory);
  }, [activeCategory, courses]);

  if (loading) return (
    <div className="min-h-screen bg-white px-6 py-32 flex items-start justify-center">
      <div className="w-full max-w-5xl rounded-[2.5rem] border border-gray-100 bg-white shadow-sm p-8 sm:p-10">
        <div className="flex items-center gap-3 mb-6 text-[#7C3AED] font-black text-[10px] uppercase tracking-[0.3em]">
          <div className="w-4 h-4 rounded-full border-2 border-[#7C3AED]/20 border-t-[#7C3AED] animate-spin" />
          Loading courses
        </div>
        <div className="h-10 w-80 max-w-full rounded-full bg-gray-100 animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="h-4 w-full rounded-full bg-gray-100 animate-pulse" />
          <div className="h-4 w-5/6 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-4 w-2/3 rounded-full bg-gray-100 animate-pulse" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-40 pb-32 px-6 bg-white min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-tech opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#7C3AED]/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <header className="mb-12 sm:mb-24 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-block bg-[#F5F3FF] border border-[#7C3AED]/10 px-4 sm:px-6 py-2 rounded-full mb-6 sm:mb-8"
          >
            <span className="text-[8px] sm:text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.4em]">Proprietary Curriculum</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-6xl md:text-8xl font-black text-[#111827] mb-6 sm:mb-8 tracking-tighter uppercase leading-[0.9]"
          >
            Engineering <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] inline-block">READINESS.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-lg text-[#6B7280] max-w-2xl mx-auto font-medium leading-relaxed px-4"
          >
            Access tracks designed by elite architects. We don't teach theory; we build clinical competence through high-entropy simulation.
          </motion.p>
        </header>

        {/* Scrollable Categories on Mobile */}
        <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto sm:overflow-x-visible no-scrollbar justify-start sm:justify-center gap-2 mb-12 sm:mb-20 border-b border-gray-100 pb-8 sm:pb-12 -mx-4 px-4 sm:mx-0 sm:px-0">
          {dynamicCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all border whitespace-nowrap ${activeCategory === cat
                ? 'bg-[#111827] text-white border-[#111827] shadow-xl shadow-black/10 scale-105'
                : 'bg-white text-gray-400 border-gray-100 hover:border-[#7C3AED]/30 hover:text-gray-600'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Debug Info */}
        <div className="mb-8 text-xs text-gray-500 font-mono bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div>API: {API_BASE_URL}/api/courses</div>
          <div>Total courses: {courses.length}</div>
          <div>Filtered courses: {filteredCourses.length}</div>
          <div>User ID: {userId}</div>
          <div>Category: {activeCategory}</div>
        </div>

        {/* Course Grid or Empty State */}
        {filteredCourses.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-2xl font-black text-gray-400 mb-4">No Courses Found</div>
            {courses.length === 0 && (
              <div className="text-sm text-gray-500">
                Courses not loading from API. Check browser console for errors.
              </div>
            )}
            {courses.length > 0 && activeCategory !== 'All' && (
              <div className="text-sm text-gray-500">
                No courses in {activeCategory} category.
              </div>
            )}
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            <AnimatePresence>
              {filteredCourses.map((course) => (
                <motion.div key={course._id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <CourseCard
                    {...course}
                    user_state={(userStates[course._id] || 'NOT_PURCHASED') as any}
                    onCardClick={handleCourseClick}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Courses;

