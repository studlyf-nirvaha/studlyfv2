import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Example = () => {
  const navigate = useNavigate();

  const cards = [
    {
      id: 'company-modules',
      title: 'Company Learning Modules',
      badge: 'Learning Ecosystem',
      cta: 'Open Modules',
      route: '/learn/company-modules',
      image: '/images/b1.svg',
      color: 'purple',
      gradient: 'from-purple-500 to-indigo-500',
      badgeBg: 'bg-purple-50 text-purple-600 border-purple-100',
      btnBg: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      shadowHover: 'hover:shadow-[0_30px_60px_-15px_rgba(108,77,255,0.25)]',
      phoneAlign: 'right-[10%]',
      objectPosPhone: 'object-left-top'
    },
    {
      id: 'opportunities',
      title: 'Opportunities',
      badge: 'Career',
      cta: 'Explore Opportunities',
      route: '/opportunities',
      image: '/images/b4.svg',
      color: 'pink',
      gradient: 'from-pink-500 to-rose-500',
      badgeBg: 'bg-pink-50 text-pink-600 border-pink-100',
      btnBg: 'bg-pink-50 text-pink-600 hover:bg-pink-100',
      shadowHover: 'hover:shadow-[0_30px_60px_-15px_rgba(236,72,153,0.25)]',
      phoneAlign: 'left-[10%]',
      objectPosPhone: 'object-left-top'
    },
    {
      id: 'skill-assessments',
      title: 'Skill Assessment Modules',
      badge: 'Evaluation',
      cta: 'Take Assessment',
      route: '/learn/assessment-intro',
      image: '/images/b2.svg',
      color: 'amber',
      gradient: 'from-amber-500 to-orange-500',
      badgeBg: 'bg-amber-50 text-amber-600 border-amber-100',
      btnBg: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
      shadowHover: 'hover:shadow-[0_30px_60px_-15px_rgba(245,158,11,0.25)]',
      phoneAlign: 'left-[10%]',
      objectPosPhone: 'object-left-top'
    },
    {
      id: 'ai-tools',
      title: 'AI Tools Ecosystem',
      badge: 'AI Productivity',
      cta: 'Explore AI Tools',
      route: '/ai-tools',
      image: '/images/b3.svg',
      color: 'cyan',
      gradient: 'from-cyan-500 to-blue-500',
      badgeBg: 'bg-cyan-50 text-cyan-600 border-cyan-100',
      btnBg: 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100',
      shadowHover: 'hover:shadow-[0_30px_60px_-15px_rgba(6,182,212,0.25)]',
      phoneAlign: 'right-[10%]',
      objectPosPhone: 'object-left-top'
    }
  ];

  return (
    <section className="relative w-full overflow-hidden py-24 bg-white font-['Poppins']">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[60%] bg-[#7C3AED]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[55%] bg-[#EC4899]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full relative z-10 pl-6 sm:pl-12 lg:pl-16">
        {/* Section Header */}
        <div className="flex flex-col items-start gap-4 mb-16 pr-6 sm:pr-12 lg:pr-16 max-w-7xl mx-auto xl:mx-0">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl lg:text-6xl font-black text-black tracking-tight leading-[1.1] uppercase"
          >
            Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B]">STUDLYF Ecosystem</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-gray-500 font-medium text-lg md:text-xl max-w-2xl"
          >
            Everything you need to learn, build, connect, and grow — all inside one horizontal ecosystem.
          </motion.p>
        </div>

        {/* Horizontal Scroll Grid of 4 Cards */}
        <div className="flex gap-6 lg:gap-8 overflow-x-auto pb-12 pt-4 snap-x snap-mandatory custom-scrollbar pr-6 sm:pr-12 lg:pr-16">
          {cards.map((card, idx) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              onClick={() => navigate(card.route)}
              className={`group relative h-[480px] sm:h-[540px] w-[85vw] sm:w-[450px] lg:w-[500px] shrink-0 snap-center sm:snap-start rounded-[2.5rem] bg-[#FAFAFA] overflow-hidden cursor-pointer shadow-[0_8px_30px_rgba(0,0,0,0.03)] ${card.shadowHover} transition-all duration-700 hover:-translate-y-2 border border-black/5`}
            >
              {/* Background Hover Effect */}
              <div className="absolute inset-0 bg-[#FAFAFA] group-hover:bg-white transition-colors duration-500 z-0" />

              {/* Device Composition Layer */}
              <div className="absolute inset-0 pt-[140px] sm:pt-[150px] px-8 flex justify-center items-start overflow-hidden pointer-events-none z-10">
                {/* Laptop in background */}
                <div className="relative w-[115%] md:w-[125%] h-[320px] rounded-t-[1.5rem] bg-[#1a1a1a] shadow-2xl p-[8px] pb-0 group-hover:scale-105 transition-transform duration-700 ease-out flex-shrink-0">
                  <div className="relative w-full h-full rounded-t-[1rem] overflow-hidden bg-black">
                    <img src={card.image} alt={card.title} className="absolute inset-0 w-full h-full object-cover object-top" />
                  </div>
                </div>
                {/* Phone floating in foreground */}
                <div className={`absolute bottom-[-30px] ${card.phoneAlign} w-[130px] sm:w-[150px] h-[270px] sm:h-[300px] bg-[#1a1a1a] rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.5)] p-[8px] group-hover:-translate-y-8 group-hover:scale-110 transition-transform duration-700 delay-75 ease-out z-20`}>
                  <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-black">
                    <img src={card.image} alt="Mobile View" className={`absolute inset-0 w-full h-full object-cover ${card.objectPosPhone}`} />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-start z-20">
                <span className={`px-4 py-2 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest border w-fit mb-5 shadow-sm ${card.badgeBg}`}>
                  {card.badge}
                </span>

                <h3 className="text-2xl sm:text-3xl font-black text-gray-900 mb-8 leading-tight tracking-tight">
                  {card.title}
                </h3>

                <div className={`flex items-center gap-2 font-bold transition-all w-fit px-5 py-2.5 rounded-xl text-sm ${card.btnBg} group-hover:shadow-md mt-auto mb-auto`}>
                  {card.cta} <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Global Style for Custom Scrollbar to hide default boring ones */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.1);
          border-radius: 20px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(0,0,0,0.2);
        }
      `}</style>
    </section>
  );
};

export default Example;
