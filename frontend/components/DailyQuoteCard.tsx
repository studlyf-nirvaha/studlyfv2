import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Sparkles, RefreshCw, Copy, Check, Flame, Star } from 'lucide-react';

interface QuoteItem {
  id: number;
  text: string;
  author: string;
  title: string;
  category: 'Mindset' | 'Innovation' | 'Perseverance' | 'Mastery' | 'Leadership' | 'Creativity';
  theme: {
    gradient: string;
    accent: string;
    badgeBg: string;
    badgeText: string;
    glow: string;
  };
}

const QUOTES_DATABASE: QuoteItem[] = [
  {
    id: 1,
    text: "The future belongs to those who learn more skills and combine them in creative ways.",
    author: "Robert Greene",
    title: "Author & Strategist",
    category: "Mastery",
    theme: {
      gradient: "from-[#0F172A] via-[#1E1B4B] to-[#311042]",
      accent: "#6C2BFF",
      badgeBg: "bg-purple-500/20",
      badgeText: "text-purple-300 border-purple-500/30",
      glow: "from-purple-600/30 to-pink-600/30"
    }
  },
  {
    id: 2,
    text: "Stay hungry, stay foolish. Continuous learning is the key to unlocking potential.",
    author: "Steve Jobs",
    title: "Co-Founder, Apple",
    category: "Innovation",
    theme: {
      gradient: "from-[#090D16] via-[#0F172A] to-[#1E293B]",
      accent: "#3B82F6",
      badgeBg: "bg-blue-500/20",
      badgeText: "text-blue-300 border-blue-500/30",
      glow: "from-blue-600/30 to-indigo-600/30"
    }
  },
  {
    id: 3,
    text: "Live as if you were to die tomorrow. Learn as if you were to live forever.",
    author: "Mahatma Gandhi",
    title: "Visionary & Leader",
    category: "Mindset",
    theme: {
      gradient: "from-[#14532D] via-[#064E3B] to-[#022C22]",
      accent: "#10B981",
      badgeBg: "bg-emerald-500/20",
      badgeText: "text-emerald-300 border-emerald-500/30",
      glow: "from-emerald-600/30 to-teal-600/30"
    }
  },
  {
    id: 4,
    text: "The expert in anything was once a beginner. Keep pressing forward every day.",
    author: "Helen Hayes",
    title: "Acclaimed Artist",
    category: "Perseverance",
    theme: {
      gradient: "from-[#4C0519] via-[#831843] to-[#500724]",
      accent: "#EC4899",
      badgeBg: "bg-pink-500/20",
      badgeText: "text-pink-300 border-pink-500/30",
      glow: "from-pink-600/30 to-rose-600/30"
    }
  },
  {
    id: 5,
    text: "Code is like humor. When you have to explain it, it’s bad. Strive for elegant simplicity.",
    author: "Cory House",
    title: "Software Architect",
    category: "Mastery",
    theme: {
      gradient: "from-[#1E1B4B] via-[#312E81] to-[#1E1B4B]",
      accent: "#8B5CF6",
      badgeBg: "bg-indigo-500/20",
      badgeText: "text-indigo-300 border-indigo-500/30",
      glow: "from-indigo-600/30 to-purple-600/30"
    }
  },
  {
    id: 6,
    text: "It’s not that I’m so smart, it’s just that I stay with problems longer.",
    author: "Albert Einstein",
    title: "Theoretical Physicist",
    category: "Perseverance",
    theme: {
      gradient: "from-[#1E293B] via-[#0F172A] to-[#020617]",
      accent: "#F59E0B",
      badgeBg: "bg-amber-500/20",
      badgeText: "text-amber-300 border-amber-500/30",
      glow: "from-amber-600/30 to-orange-600/30"
    }
  },
  {
    id: 7,
    text: "The only limit to our realization of tomorrow will be our doubts of today.",
    author: "Franklin D. Roosevelt",
    title: "32nd U.S. President",
    category: "Mindset",
    theme: {
      gradient: "from-[#0F172A] via-[#164E63] to-[#083344]",
      accent: "#06B6D4",
      badgeBg: "bg-cyan-500/20",
      badgeText: "text-cyan-300 border-cyan-500/30",
      glow: "from-cyan-600/30 to-blue-600/30"
    }
  },
  {
    id: 8,
    text: "Creativity is intelligence having fun. Push boundary limits every single day.",
    author: "Albert Einstein",
    title: "Theoretical Physicist",
    category: "Creativity",
    theme: {
      gradient: "from-[#311042] via-[#5B21B6] to-[#2E1065]",
      accent: "#A855F7",
      badgeBg: "bg-purple-500/20",
      badgeText: "text-purple-300 border-purple-500/30",
      glow: "from-purple-600/30 to-fuchsia-600/30"
    }
  },
  {
    id: 9,
    text: "Do what you can, with what you have, where you are. Action breeds confidence.",
    author: "Theodore Roosevelt",
    title: "26th U.S. President",
    category: "Leadership",
    theme: {
      gradient: "from-[#451A03] via-[#78350F] to-[#292524]",
      accent: "#F97316",
      badgeBg: "bg-orange-500/20",
      badgeText: "text-orange-300 border-orange-500/30",
      glow: "from-orange-600/30 to-amber-600/30"
    }
  },
  {
    id: 10,
    text: "Small, daily, seemingly insignificant improvements lead to stunning results over time.",
    author: "Robin Sharma",
    title: "Leadership Specialist",
    category: "Mastery",
    theme: {
      gradient: "from-[#111827] via-[#1F2937] to-[#1E1B4B]",
      accent: "#6366F1",
      badgeBg: "bg-indigo-500/20",
      badgeText: "text-indigo-300 border-indigo-500/30",
      glow: "from-indigo-600/30 to-violet-600/30"
    }
  }
];

export const DailyQuoteCard: React.FC = () => {
  // Deterministic daily index based on current date
  const getDailyIndex = () => {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
      hash = dateString.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % QUOTES_DATABASE.length;
  };

  const [quoteIndex, setQuoteIndex] = useState<number>(getDailyIndex());
  const [copied, setCopied] = useState<boolean>(false);

  const currentQuote = QUOTES_DATABASE[quoteIndex];

  const handleNextQuote = () => {
    setQuoteIndex((prev) => (prev + 1) % QUOTES_DATABASE.length);
    setCopied(false);
  };

  const handleCopy = () => {
    const textToCopy = `"${currentQuote.text}" — ${currentQuote.author}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2);
  };

  return (
    <div className="w-full relative group rounded-3xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-500">
      {/* Dynamic Animated Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentQuote.theme.gradient} transition-all duration-700`} />
      
      {/* Ambient Radial Glow Effect */}
      <div className={`absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br ${currentQuote.theme.glow} rounded-full blur-[80px] opacity-70 pointer-events-none transition-all duration-700`} />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-[60px] pointer-events-none" />

      {/* Decorative Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} 
      />

      {/* Main Content Container */}
      <div className="relative z-10 p-6 sm:p-8 flex flex-col justify-between min-h-[320px] sm:min-h-[340px]">
        
        {/* Header Bar: Category Tag & Controls (Copy, Shuffle) */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${currentQuote.theme.badgeBg} ${currentQuote.theme.badgeText}`}>
              <Sparkles className="w-3.5 h-3.5" />
              {currentQuote.category}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold text-white/50 bg-white/5 border border-white/10">
              <Flame className="w-3 h-3 text-amber-400" /> Daily Insight
            </span>
          </div>

          {/* Clean Controls: Copy & Shuffle only */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-black/30 backdrop-blur-xl p-1.5 rounded-2xl border border-white/10">
            <button
              onClick={handleCopy}
              title="Copy Quote"
              className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors relative"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleNextQuote}
              title="Next Quote"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all hover:rotate-180 duration-500 active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quote Content with Animated AnimatePresence */}
        <div className="my-auto py-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuote.id}
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="relative"
            >
              {/* Giant Stylized Decorative Quote Mark */}
              <Quote className="absolute -top-5 -left-3 w-12 h-12 text-white/10 pointer-events-none select-none" />
              
              <blockquote className="text-lg sm:text-2xl font-bold text-white leading-relaxed tracking-tight pl-4 sm:pl-6 border-l-2 border-white/20 my-2">
                "{currentQuote.text}"
              </blockquote>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer: Author Info & Date Badge */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-4">
          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuote.id + '-author'}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm text-white shadow-lg border border-white/20"
                style={{ backgroundColor: currentQuote.theme.accent }}
              >
                {getInitials(currentQuote.author)}
              </div>
              <div>
                <h4 className="text-sm font-black text-white leading-tight flex items-center gap-1.5">
                  {currentQuote.author}
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400 inline" />
                </h4>
                <p className="text-xs font-medium text-white/60">{currentQuote.title}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest block">
              StudLyf Daily
            </span>
            <span className="text-xs font-bold text-white/80">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>

      </div>

      {/* Copy Toast Notification */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl z-20 flex items-center gap-2"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Quote copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DailyQuoteCard;
