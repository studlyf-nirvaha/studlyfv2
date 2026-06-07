
import React from 'react';
import { motion } from 'framer-motion';
import WebImage from './WebImage';

const AIReality: React.FC = () => {
  const beforeItems = [
    "Syntax Memorization",
    "Boilerplate Generation",
    "Manual Unit Testing",
    "Standard CRUD Logic",
    "Legacy Conversions"
  ];

  const afterItems = [
    "System Governance",
    "Architectural Safety",
    "Resilience Auditing",
    "Complex Context Edge",
    "Clinical Verification"
  ];

  return (
    <section className="relative py-20 sm:py-32 px-6 overflow-hidden bg-[#F5F3FF]">
      {/* Section Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=2000"
          className="w-full h-full object-cover opacity-[0.03] grayscale"
          alt="Technical Background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F3FF] via-transparent to-[#F5F3FF]"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-16 sm:mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-poppins text-4xl sm:text-6xl italic text-[#0F172A] leading-none mb-4"
          >
            The Era of <br className="hidden sm:block" /><span className="not-italic font-sans font-black tracking-tighter uppercase text-[#7C3AED]">Human Authority.</span>
          </motion.h2>
        </div>

        <div className="relative flex flex-col lg:flex-row items-center justify-between min-h-[400px] lg:min-h-[500px]">

          {/* Box 01: BEFORE (Square - Far Left) */}
          <motion.div
            initial={{ opacity: 0, x: -60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
            className="bg-[#7C3AED] w-full lg:w-[360px] xl:w-[400px] aspect-square rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col border border-white/10"
          >
            <div className="mb-6 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Before</span>
            </div>
            <div className="flex flex-col gap-2 w-full flex-grow justify-center">
              {beforeItems.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: 8, backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl group transition-all cursor-default"
                >
                  <span className="text-xs font-bold tracking-tight text-white/80 group-hover:text-white transition-colors">{item}</span>
                  <div className="opacity-20 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Central Image Placeholder (Perfectly Centered) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: 0.2 }}
            className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
          >
            <div className="w-36 h-36 xl:w-44 xl:h-44 rounded-[2.5rem] border-[8px] border-white shadow-3xl overflow-hidden bg-white rotate-6 hover:rotate-0 transition-transform duration-700 group ring-1 ring-[#7C3AED]/10">
              <WebImage
                src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=600"
                alt="Verification Anchor"
                aspectRatio="h-full w-full"
                className="grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
              />
            </div>
          </motion.div>

          {/* Box 02: AFTER (Square - Far Right) */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
            className="bg-[#0F172A] w-full lg:w-[360px] xl:w-[400px] aspect-square rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden flex flex-col border border-[#7C3AED]/20"
          >
            <div className="mb-6 text-center">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[#7C3AED]">After</span>
            </div>
            <div className="flex flex-col gap-2 w-full flex-grow justify-center">
              {afterItems.map((item, i) => (
                <motion.div
                  key={i}
                  whileHover={{ x: -8, backgroundColor: "rgba(124, 58, 237, 0.15)" }}
                  className="w-full flex items-center justify-between px-5 py-3.5 bg-white/5 border border-white/5 rounded-xl group transition-all cursor-default hover:border-[#7C3AED]/40"
                >
                  <span className="text-xs font-bold tracking-tight text-white/90 group-hover:text-white transition-colors">{item}</span>
                  <div className="w-5 h-5 rounded-full border border-[#7C3AED]/30 flex items-center justify-center text-[#7C3AED] group-hover:bg-[#7C3AED] group-hover:text-white transition-all">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-16 text-center opacity-30"
        >
          <p className="text-[#0F172A] font-mono text-[9px] uppercase tracking-[0.5em] font-bold">Resilience Protocols Active</p>
        </motion.div>
      </div>
    </section>
  );
};

export default AIReality;
