import Example from "../components/Example";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_BASE_URL, authHeaders } from '../apiConfig';
import {
  Zap,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Clock,
  ExternalLink,
} from 'lucide-react';

import { ScrollVelocityContainer, ScrollVelocityRow } from '../registry/magicui/scroll-based-velocity';
import { AuroraText } from '../registry/magicui/aurora-text';
import { TypewriterEffectSmooth } from '../registry/aceternity/typewriter-effect';
import { Button } from "@heroui/react";

import DashboardFooter from '../components/DashboardFooter';
import FAQCarousel from '../components/FAQCarousel';
import WhyUsSection from '../components/WhyUsSection';
import AdsCarousel from '../components/AdsCarousel';
import GetHiredSection from '../components/GetHiredSection';
import { DevHeroSection } from '../components/DevHeroSection';
import FeaturedColleges from '../components/FeaturedColleges';
import OpportunitySlider from '../components/opportunities/OpportunitySlider';
import StudlyfSteps from '../components/StudlyfSteps';
// import { NeonBackground } from '../components/NeonBackground';

// Removed DUMMY_COURSES to only show database content.

const DashboardHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeBrief, setActiveBrief] = useState<string>('Cognition');
  const [isMuted, setIsMuted] = useState(true);

  const [courses, setCourses] = useState<any[]>([]);

  const carouselRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/courses`);
        const data = await res.json();
        if (data && data.length > 0) {
          const awsRegex = /\baws\b/;
          const filteredCourses = data.filter((c: any) => {
            const title = (c.title || '').toLowerCase();
            const role = (c.role_tag || '').toLowerCase();
            const provider = (c.provider || c.organization || '').toLowerCase();
            return !(awsRegex.test(title) || awsRegex.test(role) || awsRegex.test(provider));
          });
          setCourses(filteredCourses);
        }
      } catch (error) {
        console.error('Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, []);

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [appliedIds, setAppliedIds] = useState<string[]>([]);
  const [overview, setOverview] = useState<{ upcoming: any[]; timeline: any[] } | null>(null);
  const [myEvents, setMyEvents] = useState<any[]>([]);

  useEffect(() => {
    const fetchOpps = async () => {
      try {
        const [oppRes, overviewRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/opportunities?limit=24&offset=0&t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
          user
            ? fetch(`${API_BASE_URL}/api/opportunities/me/overview?limit=8`, { headers: { ...authHeaders() } })
            : Promise.resolve({ ok: false, json: async () => ({ upcoming: [], timeline: [] }) } as Response),
        ]);
        const opps = await oppRes.json();
        const o = overviewRes.ok ? await overviewRes.json() : { upcoming: [], timeline: [] };
        setOpportunities(opps);
        setOverview(o);
        const t = Array.isArray(o?.timeline) ? o.timeline : [];
        setAppliedIds(t.map((a: any) => a.opportunity_id).filter(Boolean));
      } catch (err) {
        console.error("Fetch error:", err);
      }
    };
    fetchOpps();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/events/my-registrations`, {
          headers: { ...authHeaders() },
        });
        if (res.ok) {
          const data = await res.json();
          setMyEvents(data);
        }
      } catch (err) {
        console.error("Error fetching my events:", err);
      }
    };
    fetchEvents();
  }, [user]);

  const statusChip = (s: string | undefined) => {
    const x = (s || 'pending').toLowerCase();
    if (x === 'accepted' || x === 'shortlisted') return { text: 'Shortlisted', cls: 'bg-emerald-50 text-emerald-800 border-emerald-100' };
    if (x === 'rejected') return { text: 'Not selected', cls: 'bg-red-50 text-red-800 border-red-100' };
    return { text: 'Pending', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  const createSlug = (title: string, id: string) => {
    if (!title || !id) return '';
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${slug}--${id}`;
  };

  const briefDetails: Record<string, { title: string; headline: string; desc: React.ReactNode; image: string; video?: string; gradient: string; accent: string; icon: string }> = {
    'Cognition': {
      title: 'Cognition',
      headline: 'Deep AI-Driven Talent Matching',
      desc: 'Studlyf understands people beyond resumes. Our AI analyzes skills, experience, learning patterns, and career intent to create meaningful connections between talent and opportunity.',
      image: '/images/impact/mainpagrimages/image.png',
      gradient: 'linear-gradient(135deg, #0891B2 0%, #155E75 100%)',
      accent: '#06B6D4',
      icon: '🧠',
    },
    'Protocol': {
      title: 'Protocol',
      headline: 'Structured & Fair AI Workflows',
      desc: 'Every interaction follows a structured AI workflow — from resume analysis to hiring decisions. Automated protocols ensure fairness and consistency across skills.',
      image: '/images/protocol.png',
      gradient: 'linear-gradient(135deg, #059669 0%, #064E3B 100%)',
      accent: '#10B981',
      icon: '⚙️',
    },
    'Verification': {
      title: 'Verification',
      headline: 'Certified Trust & Validation',
      desc: 'Trust is built through verification. Studlyf validates skills, certifications, and professional experience using intelligent document parsing and contextual analysis.',
      image: '/images/impact/mainpagrimages/image copy.png',
      video: '/videos/verification.mp4',
      gradient: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
      accent: '#8B5CF6',
      icon: '✅',
    },
    'Blueprint': {
      title: 'Blueprint',
      headline: 'Actionable Career Growth Paths',
      desc: 'Studlyf transforms insights into action. Candidates receive personalized learning paths and growth plans aligned with real job requirements and organizational goals.',
      image: '/images/impact/mainpagrimages/image copy 2.png',
      gradient: 'linear-gradient(135deg, #D97706 0%, #78350F 100%)',
      accent: '#F59E0B',
      icon: '📐',
    },
    'Clinical': {
      title: 'Clinical',
      headline: 'Precision Analytics & Trends',
      desc: 'Precision matters. Advanced analytics evaluate performance trends, interview outcomes, and behavioral signals to provide measurable improvement strategies.',
      image: '/images/impact/mainpagrimages/image copy 2.png',
      gradient: 'linear-gradient(135deg, #E11D48 0%, #881337 100%)',
      accent: '#F43F5E',
      icon: '📊',
    },
    'Evidence': {
      title: 'Evidence',
      headline: 'Data-Backed Decision Making',
      desc: 'Every recommendation is explainable and data-backed. Matching scores, learning suggestions, and hiring insights are supported by transparent reasoning.',
      image: '/images/impact/mainpagrimages/image copy 3.png',
      gradient: 'linear-gradient(135deg, #4F46E5 0%, #1E1B4B 100%)',
      accent: '#6366F1',
      icon: '🔬',
    }
  };

  const typewriterWords = [
    { text: 'YOUR', className: 'text-black' },
    { text: 'GROWTH', className: 'text-black' },
    { text: 'STARTS', className: 'text-black' },
    { text: 'HERE', className: 'text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B]' },
  ];





  const scrollCarousel = (direction: 'left' | 'right') => {
    const container = carouselRef.current || document.getElementById('course-carousel');
    if (container) {
      const scrollAmount = container.clientWidth;
      const target = container.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      container.scrollTo({
        left: target,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      {/* SVG Filter for Liquid Glass Distortion */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true">
        <filter id="glass-distortion">
          <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" />
        </filter>
      </svg>

      <style>
        {`
          .liquid-glass-container {
            --bg-color: rgba(255, 255, 255, 0.1);
            --highlight: rgba(255, 255, 255, 0.5);
            position: relative;
            isolation: isolate;
          }

          .glass-filter {
            position: absolute;
            inset: 0;
            z-index: 1;
            backdrop-filter: blur(6px);
            filter: url(#glass-distortion) saturate(120%) brightness(1.1);
            border-radius: inherit;
          }

          .glass-distortion-overlay {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at 20% 30%, rgba(255,255,255,0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 70%, rgba(255,255,255,0.1) 0%, transparent 50%);
            background-size: 300% 300%;
            animation: floatDistort 15s infinite ease-in-out;
            mix-blend-mode: overlay;
            z-index: 2;
            pointer-events: none;
            border-radius: inherit;
          }

          @keyframes floatDistort {
            0% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
            100% { background-position: 0% 0%; }
          }

          .glass-overlay {
            position: absolute;
            inset: 0;
            z-index: 2;
            background: var(--bg-color);
            border-radius: inherit;
          }

          .glass-specular {
            position: absolute;
            inset: 0;
            z-index: 3;
            box-shadow: inset 1px 1px 1px var(--highlight);
            border-radius: inherit;
            border: 1px solid rgba(255,255,255,0.15);
          }

          .glass-content-inner {
            position: relative;
            z-index: 4;
            display: flex;
            width: 100%;
            height: 100%;
          }
        `}
      </style>

      <div className="min-h-screen overflow-x-hidden">
        {/* FIRST SECTION: HERO + TRUST CARD */}
        <div className="relative overflow-hidden min-h-screen">
          {/* Confined Video Background */}
          <div className="absolute inset-0 -z-20">
            <video
              src="/videos/grok-video-5d92d925-3329-4a1d-9278-b909d93b37ef (1).mp4"
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover opacity-[0.65]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/20" />
          </div>

          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-12 relative z-10 pt-32">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="mb-16 rounded-[4rem] overflow-hidden pt-12 pb-20 flex flex-col items-center justify-center gap-12 relative bg-transparent border border-white/10 shadow-2xl"
            >
              <motion.div
                animate={{ x: ['100%', '-100%'], opacity: [0, 1, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 pointer-events-none"
              />

              <div className="flex flex-col items-center gap-6 relative z-20">
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg sm:text-2xl font-black uppercase tracking-[0.2em] mb-4"
                >
                  <span className="text-black">Welcome ! </span>
                  <span className="text-[#7C3AED]">{user?.full_name || 'User'}</span>
                </motion.div>
                <div className="scale-75 sm:scale-100 origin-center">
                  <TypewriterEffectSmooth words={typewriterWords} />
                </div>
                <p className="text-[9px] sm:text-[14px] font-bold text-black uppercase tracking-[0.3em] max-w-2xl text-center leading-relaxed px-4">
                  Studlyf -- Building the student ecosystem <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B]">FOR AMBITIOUS STUDENTS</span>
                </p>
              </div>

              <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 relative z-20 mt-8 px-6 sm:px-12">
                {/* Connected With */}
                <div className="flex flex-col items-center gap-6 md:gap-8">
                  <span className="text-[10px] sm:text-[12px] font-black text-black uppercase tracking-[0.4em] leading-none text-center">Built By Poeple From</span>
                  <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                    {[
                      { src: "/images/start.png", alt: "Start" },
                      { src: "/images/tech.jpg", alt: "Tech" },
                    ].map((logo, idx) => (
                      <img
                        key={idx}
                        src={logo.src}
                        alt={logo.alt}
                        className="h-10 sm:h-12 md:h-14 w-auto max-w-[160px] object-contain rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:scale-[1.02]"
                      />
                    ))}
                  </div>
                </div>

                {/* Collaborated With */}
                <div className="flex flex-col items-center gap-6 md:gap-8">
                  <span className="text-[10px] sm:text-[12px] font-black text-black uppercase tracking-[0.4em] leading-none text-center">Collaborated with</span>
                  <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                    {[
                      { src: "/images/gogo.jpg", alt: "Gogo" },
                      { src: "/images/micr.jpg", alt: "Microsoft" },
                      { src: "/images/nvidia.webp", alt: "Nvidia" },
                      { src: "/images/zoho.webp", alt: "Zoho" },
                    ].map((logo, idx) => (
                      <img
                        key={idx}
                        src={logo.src}
                        alt={logo.alt}
                        className="h-10 sm:h-12 md:h-14 w-auto max-w-[160px] object-contain rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:scale-[1.02]"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
            </motion.div>
          </div>

          {/* SECOND SECTION: COURSES FOR EVERY ambition */}
          <section className="px-6 sm:px-16 py-12 sm:py-20 bg-white relative z-10 w-full overflow-hidden">
            <div className="max-w-[1700px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-16 items-center">
              {/* LEFT SIDE TYPOGRAPHY */}
              <div className="flex flex-col text-center lg:text-left">
                <span className="text-[#7C3AED] font-bold uppercase tracking-[0.5em] text-[10px] mb-4 block">Protocols for mastery</span>
                <h1 className="text-4xl sm:text-6xl font-extrabold leading-[0.9] mb-8 sm:mb-12 text-black uppercase tracking-tighter">
                  COURSES <br />
                  FOR <br />
                  EVERY <br />
                  <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] lowercase leading-tight block mt-2">ambition</span>
                </h1>
                {courses.length === 0 && (
                  <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Courses to be launched soon!</p>
                )}
              </div>

              {/* RIGHT SIDE COURSE CARDS */}
              <div
                ref={carouselRef}
                id="course-carousel"
                className="flex gap-8 overflow-x-scroll pb-6 pt-4 no-scrollbar"
              >
                {courses.map((course, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate(`/learn/courses/${createSlug(course.title, course._id)}`)}
                    className="min-w-[220px] sm:min-w-[260px] lg:min-w-[290px] h-[400px] lg:h-[440px] relative rounded-[2rem] overflow-hidden group hover:scale-[1.02] transition-all duration-700 cursor-pointer shadow-lg border border-black/[0.03]"
                  >
                    <img
                      src={course.image || 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&auto=format&fit=crop'}
                      alt={course.title}
                      className="h-full w-full object-contain transition-transform duration-1000 group-hover:scale-110 p-4"
                      style={{ background: '#F8F9FB' }}
                    />
                    {/* Bottom Information Block */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white rounded-[1.2rem] p-4 flex justify-between items-center shadow-xl shadow-black/5">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">
                          SCHOOL OF {course.school || course.role_tag || 'ENGINEERING'}
                        </p>
                        <h3 className="text-sm font-bold text-[#111827] leading-tight">
                          {course.title}
                        </h3>
                      </div>
                      <ChevronRight size={18} className="flex-shrink-0 text-gray-400 group-hover:text-[#7C3AED] transition-colors ml-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FULL WIDTH NAVIGATION ROW - Placed outside the grid for absolute visibility */}
            <div className="flex flex-col items-center justify-center gap-8 mt-4 w-full relative z-30">
              <div className="flex items-center gap-10">
                <button
                  onClick={() => scrollCarousel('left')}
                  className="w-16 h-16 rounded-full border border-gray-100 bg-white flex items-center justify-center cursor-pointer shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 group/nav"
                >
                  <ChevronLeft size={30} className="text-gray-400 group-hover/nav:text-[#7C3AED] transition-colors" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                  <div className="w-10 h-2.5 rounded-full bg-[#7C3AED] shadow-sm shadow-[#7C3AED]/30" />
                  <div className="w-2.5 h-2.5 rounded-full bg-gray-200" />
                </div>

                <button
                  onClick={() => scrollCarousel('right')}
                  className="w-16 h-16 rounded-full border border-gray-100 bg-white flex items-center justify-center cursor-pointer shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:bg-gray-50 transition-all hover:scale-110 active:scale-95 group/nav"
                >
                  <ChevronRight size={30} className="text-gray-400 group-hover/nav:text-[#7C3AED] transition-colors" />
                </button>
              </div>
            </div>

            {/* Trust & Certification Footer */}
<div className="mt-20 max-w-[1800px] mx-auto pt-16 border-t border-black/5 flex flex-col items-center px-6">
  <div className="flex flex-col items-center text-center gap-10">
    <span className="text-2xl md:text-3xl font-black text-black uppercase tracking-[0.3em]">
      Curriculum built by people from
    </span>

    <div className="flex items-center justify-center gap-10 md:gap-16 flex-wrap max-w-6xl">
      <img src="/images/meta.png" className="h-12 md:h-16 object-contain" alt="Meta" />
      <img src="/images/netflix.png" className="h-12 md:h-16 object-contain" alt="Netflix" />
      <img src="/images/apple.png" className="h-12 md:h-16 object-contain" alt="Apple" />
      <img src="/images/nvidia.png" className="h-12 md:h-16 object-contain" alt="Nvidia" />
      <img src="/images/virtusa.png" className="h-12 md:h-16 object-contain" alt="virtusa" />
      <img
        src="https://tse1.mm.bing.net/th/id/OIP.eBtPsy_IK1WHX15SO7OgUgHaEK?pid=Api&P=0&h=180"
        className="h-12 md:h-16 object-contain"
        alt="Deloitte"
      />
      <img
        src="https://indiancompanies.in/wp-content/uploads/2020/05/TCS-Logo-Tata-consultancy-service.png"
        className="h-12 md:h-16 object-contain"
        alt="TCS"
      />
    </div>
  </div>
</div>
          </section>
        </div>

        {/* Advertisements Section */}
        <div className="relative z-20 mb-20 px-4 sm:px-12">
          <AdsCarousel />
        </div>
      </div>



      {/* SECTION 4: REST OF CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10 pb-20">
        {/* Learner widgets */}
        {user ? (
          <>

            {myEvents.length > 0 && (
              <section className="mb-16">
                <div className="bg-white border border-purple-100 rounded-[2rem] p-6 sm:p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]" />
                  <div className="flex items-end justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Your activities</p>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mt-2">My events & opportunities</h3>
                      <p className="text-sm font-medium text-slate-500 mt-2">
                        Track your stage progress across events and opportunities.
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    {myEvents.map((ev: any) => (
                      <div
                        key={ev.event_id}
                        onClick={() => {
                          const path = ev.source === 'opportunity'
                            ? `/opportunities/${ev.event_id}`
                            : `/events/${ev.event_id}/hub`;
                          navigate(path);
                        }}
                        className="p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-purple-200 hover:bg-white transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-4 mb-3">
                          <div className="min-w-0">
                            <p className="font-black text-slate-900 truncate">{ev.event_title}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">
                              {ev.source === 'opportunity'
                                ? `${ev.type} · ${ev.status}`
                                : `${ev.current_stage || 'Registered'} · ${ev.stages_cleared}/${ev.total_stages} stages`}
                            </p>
                          </div>
                          {ev.source === 'event' && (
                            <span className="shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border bg-purple-50 text-purple-700 border-purple-200">
                              {ev.progress_pct}%
                            </span>
                          )}
                          {ev.source === 'opportunity' && (
                            <span className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${ev.status === 'accepted' || ev.status === 'shortlisted'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ev.status === 'rejected'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                              {ev.status}
                            </span>
                          )}
                        </div>
                        {ev.source === 'event' && (
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-500"
                              style={{ width: `${ev.progress_pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>) : null}

        {/* Infinite Scrolling Logo (Left to Right) */}
        <div className="mb-24 relative flex w-full flex-col items-center justify-center overflow-hidden py-10 border-b border-black/5 bg-white">
          <style>
            {`
              @keyframes slideRight {
                from { transform: translateX(-50%); }
                to { transform: translateX(0); }
              }
              .animate-slide-right {
                animation: slideRight 30s linear infinite;
              }
            `}
          </style>

          <div className="flex w-max animate-slide-right flex-nowrap">
            {/* First half */}
            <div className="flex items-center gap-10 md:gap-20 pr-10 md:pr-20 flex-shrink-0">
              {[...Array(10)].map((_, i) => (
                <img key={`first-${i}`} src="/images/studlyf1.jpg" alt="Studlyf" className="h-14 sm:h-16 md:h-20 w-auto object-contain hover:scale-105 transition-transform duration-300" />
              ))}
            </div>
            {/* Second half (Duplicate for seamless loop) */}
            <div className="flex items-center gap-10 md:gap-20 pr-10 md:pr-20 flex-shrink-0">
              {[...Array(10)].map((_, i) => (
                <img key={`second-${i}`} src="/images/studlyf1.jpg" alt="Studlyf" className="h-14 sm:h-16 md:h-20 w-auto object-contain hover:scale-105 transition-transform duration-300" />
              ))}
            </div>
          </div>
        </div>

        {/* AI Era Integration (Career Synergy) */}
        <section className="mb-24">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            style={{ clipPath: window.innerWidth > 640 ? 'polygon(0% 0%, 55% 0%, 62% 10%, 100% 10%, 100% 100%, 0% 100%)' : 'none' }}
            className="bg-gradient-to-br from-[#F5F3FF] via-[#EDE9FE] to-[#F3E8FF] rounded-[2rem] sm:rounded-[3rem] py-12 sm:py-24 px-6 sm:px-24 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16 relative overflow-hidden border border-[#7C3AED]/10 shadow-sm"
          >
            <div className="absolute top-0 right-0 w-1/2 h-full bg-[#7C3AED]/[0.02] rotate-12 translate-x-1/4 pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#7C3AED]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-6 h-6 bg-[#7C3AED]/10 rotate-45 rounded-sm border border-[#7C3AED]/20 blur-[1px]" />

            <div className="flex flex-col lg:flex-row items-center justify-between w-full relative z-10 gap-10 lg:gap-16">
              <div className="flex flex-col gap-4 sm:gap-6 lg:w-1/2 text-center lg:text-left">
                <span className="text-[10px] font-black text-black/40 uppercase tracking-[0.4em]">Career Synergy</span>
                <h2 className="text-3xl sm:text-6xl font-black text-black tracking-tighter leading-tight">
                  Streamline Your Career <br /> in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B]">AI Era</span>.
                </h2>
              </div>
              <div className="lg:w-1/2 flex flex-col items-center lg:items-end justify-center gap-0 pt-4 lg:pt-8">
                <h2 className="text-2xl sm:text-5xl font-bold tracking-tighter text-center lg:text-right lowercase flex flex-col items-center lg:items-end">
                  <span className="text-black lg:mr-12 sm:lg:mr-20">i am</span>
                  <AuroraText className="bg-gradient-to-r from-[#84CC16] via-[#06B6D4] to-[#10B981] lg:translate-x-2 sm:lg:translate-x-4 mt-2">career dreamer</AuroraText>
                </h2>
                <Link
                  to="/learn/career-onboarding"
                  className="px-10 sm:px-14 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all shadow-xl lg:mr-12 sm:lg:mr-20 mt-8 glow-btn glow-btn-blue"
                >
                  <span className="glow-orb glow-orb-1" />
                  <span className="glow-orb glow-orb-2" />
                  <span className="glow-orb glow-orb-3" />
                  <span className="glow-label">Start</span>
                </Link>
              </div>
            </div>
          </motion.div>
        </section >





        {/* Explore STUDLYF Ecosystem Section */}
        <Example />



      </div>

      <div className="mb-20">
        <StudlyfSteps />
      </div>

      <div className="mb-20">
        <GetHiredSection />
      </div>

      <FeaturedColleges />
      <WhyUsSection />
      <FAQCarousel />
      <DashboardFooter />
    </>
  );
};

export default DashboardHome;
