import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit, Gift, Landmark, Map, ArrowRight, PlayCircle, Users, CheckCircle, TrendingUp, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardFooter from '../components/DashboardFooter';
import DailyQuoteCard from '../components/DailyQuoteCard';

const StudHub: React.FC = () => {
  const navigate = useNavigate();

  const resources = [
    {
      title: "AI Tools",
      description: "Access the best AI tools and platforms to boost productivity, learning, and execution.",
      cta: "Explore AI Tools",
      route: "/ai-tools",
      icon: BrainCircuit,
      color: "text-[#6C2BFF]",
      bg: "bg-[#6C2BFF]/10",
      border: "hover:border-[#6C2BFF]/30",
      shadow: "hover:shadow-[0_15px_30px_rgba(108,43,255,0.15)]"
    },
    {
      title: "Student Schemes",
      description: "Discover scholarships, government programs, and career-focused schemes for students.",
      cta: "Explore Schemes",
      route: "/student-schemes",
      icon: Landmark,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      border: "hover:border-blue-500/30",
      shadow: "hover:shadow-[0_15px_30px_rgba(59,130,246,0.15)]"
    },
    {
      title: "Student Discounts",
      description: "Unlock exclusive discounts on software, subscriptions, tools, and student services.",
      cta: "Explore Discounts",
      route: "/student-discounts",
      icon: Gift,
      color: "text-[#EC4899]",
      bg: "bg-[#EC4899]/10",
      border: "hover:border-[#EC4899]/30",
      shadow: "hover:shadow-[0_15px_30px_rgba(236,72,153,0.15)]"
    },
    {
      title: "Career Roadmaps",
      description: "Follow structured role-based roadmaps to build real skills in the correct order.",
      cta: "Explore Roadmaps",
      route: "/roadmaps",
      icon: Map,
      color: "text-[#1A1A1A]",
      bg: "bg-gray-100",
      border: "hover:border-gray-300",
      shadow: "hover:shadow-[0_15px_30px_rgba(0,0,0,0.1)]"
    },
    {
      title: "Scholarships",
      description: "Explore 20+ verified national and international scholarships to fund your higher education.",
      cta: "Explore Scholarships",
      route: "/scholarships",
      icon: GraduationCap,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "hover:border-emerald-500/30",
      shadow: "hover:shadow-[0_15px_30px_rgba(16,185,129,0.15)]"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-800 pt-28 font-sans selection:bg-[#6C2BFF]/20 flex flex-col">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-24 flex-grow w-full">

        {/* HERO SECTION (Two-column layout) */}
        <div className="flex flex-col lg:flex-row items-center gap-16 mb-24">

          {/* LEFT SIDE: Typography */}
          <div className="flex-1 relative">
            <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-gradient-to-r from-[#6C2BFF]/10 to-[#EC4899]/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[5rem] font-black mb-6 tracking-tight text-[#1A1A1A] leading-[1.05]">
                Everything You Need.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">All In One Place.</span>
              </h1>

              <p className="text-xl text-gray-500 font-medium mb-10 max-w-xl leading-relaxed">
                Your student ecosystem for learning, career growth, discounts, schemes, opportunities, and smarter progress.<br /><br />
                <span className="font-bold text-[#1A1A1A]">Explore. Learn. Save. Grow.</span>
              </p>

              {/* STUDLYF-themed mini stats */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#6C2BFF]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#6C2BFF]" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">5K+ Students Growing</span>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-[#EC4899]/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-4 h-4 text-[#EC4899]" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">10+ Student Resources</span>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-sm font-bold text-gray-700">Career-First Ecosystem</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Video Section */}
          <div className="flex-1 w-full max-w-xl lg:max-w-none relative mt-10 lg:mt-0">
            <div className="bg-white p-4 sm:p-8 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-gray-100 relative z-10">
              <div className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">
                Daily Motivation
              </div>
              <h3 className="text-xl sm:text-3xl font-black text-[#1A1A1A] tracking-tight mb-2">Keep Learning,<br />Keep Growing.</h3>
              <p className="text-sm text-gray-500 font-medium mb-8">Small progress today creates big success tomorrow.</p>

              <DailyQuoteCard />
            </div>

            {/* Decoration */}
            <div className="absolute -bottom-8 -right-8 w-full h-full bg-gradient-to-br from-[#6C2BFF]/15 to-[#EC4899]/15 rounded-[3rem] -z-10 blur-2xl" />
          </div>
        </div>

        {/* CORE FEATURES SECTION */}
        <div className="mb-24 text-center max-w-4xl mx-auto pt-10 border-t border-gray-200">
          <h2 className="text-xl sm:text-3xl md:text-4xl font-black text-[#1A1A1A] tracking-tight mb-4">Everything that powers your student journey</h2>
          <p className="text-lg text-gray-500 font-medium">Handpicked tools and systems to help students grow smarter and faster.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 mb-24 text-left">
          {resources.map((res, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -6 }}
              onClick={() => navigate(res.route)}
              className={`bg-white border border-gray-200 rounded-[2rem] p-4 sm:p-8 cursor-pointer transition-all duration-300 group flex flex-col ${res.border} ${res.shadow}`}
            >
              <div className={`w-14 h-14 ${res.bg} rounded-[1.25rem] flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-300 shrink-0 shadow-sm`}>
                <res.icon className={`w-7 h-7 ${res.color}`} />
              </div>

              <h3 className="text-xl font-black text-[#1A1A1A] mb-3 group-hover:text-[#6C2BFF] transition-colors">{res.title}</h3>
              <p className="text-sm text-gray-500 font-medium mb-10 flex-grow leading-relaxed">{res.description}</p>

              <div className={`text-sm font-black flex items-center gap-2 mt-auto ${res.color}`}>
                {res.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* MID VISUAL SECTION */}
        <div className="mb-24 relative rounded-[3rem] overflow-hidden border border-gray-200 bg-white shadow-sm h-[300px] md:h-[500px] flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FC] via-transparent to-transparent z-10" />
          <img
            src="/student-growth-ecosystem.png"
            alt="Student Growth Ecosystem"
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute bottom-10 left-10 z-20 hidden md:block">
            <div className="inline-flex items-center gap-3 bg-white/90 backdrop-blur-md px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest text-[#1A1A1A] shadow-xl border border-white/50">
              <BrainCircuit className="w-5 h-5 text-[#6C2BFF]" /> The STUDLYF Ecosystem
            </div>
          </div>
        </div>

        {/* STATS SECTION */}
        <div className="bg-white border border-gray-200 rounded-[2rem] p-6 sm:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.03)] max-w-5xl mx-auto flex flex-wrap justify-center md:justify-between items-center gap-6 sm:gap-10">
          <div className="flex-1 text-center min-w-[150px]">
            <h4 className="text-3xl sm:text-4xl font-black text-[#1A1A1A] mb-2 tracking-tight">5k+</h4>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Students</p>
          </div>
          <div className="hidden md:block w-px h-16 bg-gray-100" />
          <div className="flex-1 text-center min-w-[150px]">
            <h4 className="text-3xl sm:text-4xl font-black text-[#6C2BFF] mb-2 tracking-tight">30+</h4>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Resources</p>
          </div>
          <div className="hidden md:block w-px h-16 bg-gray-100" />
          <div className="flex-1 text-center min-w-[150px]">
            <h4 className="text-3xl sm:text-4xl font-black text-[#EC4899] mb-2 tracking-tight">20+</h4>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Schemes</p>
          </div>
          <div className="hidden md:block w-px h-16 bg-gray-100" />
          <div className="flex-1 text-center min-w-[150px]">
            <h4 className="text-3xl sm:text-4xl font-black text-blue-500 mb-2 tracking-tight">25+</h4>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Discounts</p>
          </div>
        </div>

      </div>
      <DashboardFooter />
    </div>
  );
};

export default StudHub;

