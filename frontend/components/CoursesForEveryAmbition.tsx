import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import { getCourseImageUrl } from '../utils/assetUtils';

/* ─────────────────────── types ─────────────────────── */
interface Course {
  _id: string;
  title: string;
  description?: string;
  school?: string;
  role_tag?: string;
  image?: string;
  difficulty?: string;
  enrolled_count?: number;
  price?: number;
}

/* ─────────────────────── fallback data ─────────────────────── */
const FALLBACK_COURSES: Course[] = [
  {
    _id: 'fb-1',
    title: 'Software Engineering',
    school: 'Engineering',
    role_tag: 'SWE',
    image: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop',
    difficulty: 'Advanced',
    enrolled_count: 1240,
  },
  {
    _id: 'fb-2',
    title: 'Artificial Intelligence',
    school: 'Intelligence',
    role_tag: 'AI',
    image: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&auto=format&fit=crop',
    difficulty: 'Intermediate',
    enrolled_count: 980,
  },
  {
    _id: 'fb-3',
    title: 'Product Management',
    school: 'Management',
    role_tag: 'PM',
    image: 'https://images.unsplash.com/photo-1542626991-cbc4e32524cc?w=800&auto=format&fit=crop',
    difficulty: 'Intermediate',
    enrolled_count: 760,
  },
  {
    _id: 'fb-4',
    title: 'Data Engineering',
    school: 'Engineering',
    role_tag: 'DATA',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop',
    difficulty: 'Advanced',
    enrolled_count: 640,
  },
  {
    _id: 'fb-5',
    title: 'Cyber Security',
    school: 'Security',
    role_tag: 'CYBER',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop',
    difficulty: 'Advanced',
    enrolled_count: 520,
  },
];

/* ─────────────────────── helpers ─────────────────────── */
const createSlug = (title: string, id: string) => {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${slug}--${id}`;
};

/* stable enrolled seed so cards don't flicker on re-render */
const ENROLLED_SEEDS = [1240, 980, 760, 640, 520, 430, 390, 310];

/* ─────────────────────── component ─────────────────────── */
const CoursesForEveryAmbition: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [loading, setLoading] = useState(true);
  const animating = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/courses`);
        if (!res.ok) throw new Error();
        const data: Course[] = await res.json();
        setCourses(data.length > 0 ? data : FALLBACK_COURSES);
      } catch {
        setCourses(FALLBACK_COURSES);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const [visibleCount, setVisibleCount] = useState(3);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) setVisibleCount(1);
      else if (window.innerWidth < 1024) setVisibleCount(2);
      else setVisibleCount(3);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const total = courses.length;
  const maxIdx = Math.max(0, total - visibleCount);

  const step = (d: 1 | -1) => {
    if (animating.current) return;
    animating.current = true;
    setTimeout(() => { animating.current = false; }, 420);
    setDir(d);
    setIdx(i => Math.min(maxIdx, Math.max(0, i + d)));
  };

  const visible = courses.slice(idx, idx + visibleCount);

  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-10">

        {/* ── layout: left heading | right cards ── */}
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-12 items-center">

          {/* ── LEFT: text panel ── */}
          <div className="flex-shrink-0 lg:w-[230px] xl:w-[260px] flex flex-col gap-5">
            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[2.6rem] sm:text-5xl xl:text-[3.2rem] font-black text-[#111827] leading-[0.88] tracking-[-0.03em] uppercase"
            >
              COURSES<br />FOR<br />EVERY
            </motion.h2>

            <motion.h2
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.07 }}
              className="text-[2.6rem] sm:text-5xl xl:text-[3.2rem] font-black italic text-gray-400 leading-[0.88] tracking-[-0.02em] -mt-3"
            >
              ambition
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.12 }}
              className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400 leading-relaxed mt-1"
            >
              Global Training For<br />Role-Ready Excellence.
            </motion.p>
          </div>

          {/* ── RIGHT: cards ── */}
          <div className="flex-1 min-w-0 flex flex-col gap-7">
            {/* card row */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-[380px] rounded-[1.5rem] bg-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: dir * 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {visible.map((course, i) => (
                  <CourseCard
                    key={course._id}
                    course={course}
                    enrolledSeed={ENROLLED_SEEDS[(idx + i) % ENROLLED_SEEDS.length]}
                    onClick={() => navigate(`/learn/courses/${createSlug(course.title, course._id)}`)}
                  />
                ))}
              </motion.div>
            )}

            {/* ── arrows: centered below cards ── */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => step(-1)}
                disabled={idx === 0}
                aria-label="Previous"
                className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:border-gray-500 hover:shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => step(1)}
                disabled={idx >= maxIdx}
                aria-label="Next"
                className="w-10 h-10 rounded-full border border-gray-300 bg-white flex items-center justify-center hover:border-gray-500 hover:shadow-md transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────── card sub-component ─────────────────────── */
interface CardProps {
  course: Course;
  enrolledSeed: number;
  onClick: () => void;
}

const CourseCard: React.FC<CardProps> = ({ course, enrolledSeed, onClick }) => {
  const school = (course.school || 'Engineering').toUpperCase();
  const enrolled = course.enrolled_count ?? enrolledSeed;
  const image = getCourseImageUrl(course.title, course.school || course.role_tag, course.image);

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.22 } }}
      onClick={onClick}
      className="relative rounded-[1.5rem] overflow-hidden cursor-pointer select-none bg-white"
      style={{ boxShadow: '0 6px 32px -6px rgba(0,0,0,0.14)' }}
    >
      {/* ── photo area (tall) ── */}
      <div className="relative h-[260px] overflow-hidden">
        <img
          src={image}
          alt={course.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      </div>

      {/* ── white info panel (overlaid at bottom, visually floating) ── */}
      <div className="bg-white px-5 py-4">
        {/* school label */}
        <p className="text-[7.5px] font-black uppercase tracking-[0.38em] text-gray-400 mb-1 truncate">
          SCHOOL OF {school}
        </p>

        {/* course title */}
        <h3 className="text-[1.05rem] font-black text-[#111827] tracking-tight leading-snug mb-3 truncate">
          {course.title}
        </h3>

        {/* bottom row: badge + enrolled + arrow */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <span className="text-[7px] font-black uppercase tracking-[0.3em] text-gray-400">
              ELITE TRACK
            </span>
            <span className="text-[7px] font-bold text-gray-400 uppercase tracking-widest">
              Enrolled {enrolled.toLocaleString()}+
            </span>
          </div>

          {/* dark square arrow button */}
          <div className="w-9 h-9 rounded-xl bg-[#1a1a2e] flex items-center justify-center flex-shrink-0 hover:bg-[#7C3AED] transition-colors duration-200">
            <ChevronRight className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CoursesForEveryAmbition;

