import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { API_BASE_URL, authHeaders } from '../apiConfig';

const PlayLearnEarn: React.FC = () => {
  const [features, setFeatures] = useState<any[]>([]);
  const [userGamification, setUserGamification] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/student/gamification`);
        if (res.ok) {
          const data = await res.json();
          setFeatures(data.features || []);
        }
        const token = localStorage.getItem('auth_token');
        const userId = localStorage.getItem('user_id');
        if (token && userId) {
          const uRes = await fetch(`${API_BASE_URL}/api/student/gamification/user/${userId}`, { headers: authHeaders() });
          if (uRes.ok) setUserGamification(await uRes.json());
        }
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const fallbackFeatures = [
    { title: "Daily Quizzes", xp: 500, description: "Byte-sized technical puzzles to keep your architectural mind sharp every day." },
    { title: "Skill Challenges", xp: 2000, description: "High-stakes coding arenas with real-world constraints and leaderboards." },
    { title: "Reward Points", xp: 0, description: "Unlock referral credits, hiring bounties, and direct interview access." }
  ];

  const displayFeatures = features.length > 0 ? features : fallbackFeatures;

  return (
    <div className="pt-32 pb-24 px-6 bg-[#0F172A] min-h-screen relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-grid-tech opacity-10"></div>
      <div className="max-w-7xl w-full mx-auto relative z-10">
        <header className="text-center mb-24">
          <div className="inline-block border border-white/20 px-6 py-2 rounded-full mb-10 text-[#7C3AED] font-mono text-[9px] uppercase tracking-[0.5em] font-bold">Engagement Protocol // ACTIVE</div>
          <h1 className="text-6xl sm:text-9xl font-bold text-white mb-8 tracking-tighter uppercase leading-[0.8] font-poppins">Play. Learn. <br/><span className="text-[#7C3AED]">Earn.</span></h1>
          <p className="text-xl text-white/60 max-w-xl mx-auto font-medium">Daily technical challenges to maintain elite readiness and unlock institutional reward tiers.</p>
          {userGamification && !loading && (
            <div className="mt-8 flex justify-center gap-8 text-white/80 font-mono text-sm">
              <span>XP: <strong className="text-[#7C3AED]">{userGamification.xp}</strong></span>
              <span>Level: <strong className="text-[#7C3AED]">{userGamification.level}</strong></span>
              <span>Streak: <strong className="text-[#7C3AED]">{userGamification.daily_streak} days</strong></span>
            </div>
          )}
        </header>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-white/20 border-t-[#7C3AED] rounded-full animate-spin" /></div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8">
            {displayFeatures.map((card, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
                className="bg-white/5 backdrop-blur-3xl border border-white/10 p-12 rounded-[3rem] flex flex-col group hover:border-[#7C3AED]/50 transition-all shadow-2xl"
              >
                <div className="text-6xl mb-12 group-hover:scale-110 transition-transform origin-left">
                  {['⚡', '◈', '₿'][i] || '★'}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-wide group-hover:text-[#7C3AED] transition-colors">{card.title}</h3>
                <div className="text-[#7C3AED] font-mono font-bold text-lg mb-8 tracking-widest">{card.xp > 0 ? `${card.xp} XP` : 'LEVEL UP'}</div>
                <p className="text-white/40 text-sm leading-relaxed mb-12 flex-grow">{card.description}</p>
                <button className="w-full py-5 bg-white text-[#0F172A] font-bold text-[10px] uppercase tracking-[0.3em] rounded-xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-xl">Enter Arena</button>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="mt-20 p-12 bg-white/5 border border-white/10 rounded-[3rem] flex flex-col sm:flex-row items-center justify-between gap-10"
        >
          <div className="flex items-center gap-10">
            <div className="w-20 h-20 rounded-[2rem] bg-[#7C3AED] flex items-center justify-center font-bold text-white text-3xl shadow-2xl shadow-[#7C3AED]/30">{userGamification?.level || '?'}</div>
            <div>
              <h4 className="text-white font-bold uppercase tracking-[0.3em] text-sm">Next Protocol Cycle</h4>
              <p className="text-white/30 text-xs font-mono mt-2">TIME_REMAINING: {new Date(Date.UTC(0, 0, 0, 4, 22, 18)).toISOString().slice(11, 19)}</p>
            </div>
          </div>
          <button className="px-12 py-5 bg-white text-[#0F172A] font-bold text-[10px] uppercase tracking-[0.3em] rounded-2xl hover:bg-[#7C3AED] hover:text-white transition-all shadow-xl flex items-center gap-3">VIEW REWARDS <span className="text-lg">→</span></button>
        </motion.div>
      </div>
    </div>
  );
};

export default PlayLearnEarn;
