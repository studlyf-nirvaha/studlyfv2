
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import WebImage from './WebImage';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center bg-[#0F172A] overflow-hidden pt-32 lg:pt-0">
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 z-0"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-[#1E1B4B]/80 to-[#0F172A]/40"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(124,58,237,0.12),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-grid-tech opacity-[0.15]"></div>
      </motion.div>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-16 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-32 items-center">

          {/* Left: Content - Pushed Left */}
          <motion.div style={{ y: contentY }} className="text-center lg:text-left lg:max-w-2xl lg:mr-auto">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, ease: [0.19, 1, 0.22, 1] }}
              className="inline-flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10 bg-[#7C3AED] px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl shadow-2xl shadow-[#7C3AED]/20"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
              <span className="font-mono text-[9px] sm:text-[11px] text-white font-bold tracking-[0.4em] sm:tracking-[0.5em] uppercase">Protocol_v3.0.1 // Active</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 120 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.8, ease: [0.19, 1, 0.22, 1], delay: 0.1 }}
              className="font-syne text-4xl sm:text-7xl lg:text-[6.5rem] text-white leading-[1] lg:leading-[0.95] mb-6 sm:mb-12 uppercase tracking-tighter"
            >
              Engineering <br />
              <motion.span
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 2, ease: [0.19, 1, 0.22, 1], delay: 0.3 }}
                className="text-[#7C3AED] italic font-poppins lowercase font-normal tracking-tight block"
              >
                Readiness.
              </motion.span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
              className="text-base sm:text-2xl text-gray-300 leading-relaxed max-w-xl mb-10 sm:mb-16 font-medium mx-auto lg:mx-0"
            >
              Defining technical authority in the generative era. We verify the human judgment that builds resilient systems.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 1, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start"
            >
              <motion.button
                onClick={() => navigate('/learn/courses')}
                whileHover={{ scale: 0.96 }}
                whileTap={{ scale: 0.92 }}
                className="px-10 py-5 sm:px-12 sm:py-7 bg-[#7C3AED] text-white font-bold rounded-2xl shadow-3xl shadow-[#7C3AED]/40 text-[10px] sm:text-xs tracking-[0.4em] uppercase group overflow-hidden relative"
              >
                <span className="relative z-10">Explore Standards</span>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
              </motion.button>
              <motion.button
                onClick={() => {
                  const el = document.getElementById('verification');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                whileHover={{ scale: 0.96 }}
                whileTap={{ scale: 0.92 }}
                className="px-10 py-5 sm:px-12 sm:py-7 bg-white/5 text-white font-bold rounded-2xl border border-white/20 hover:border-[#7C3AED] transition-all text-[10px] sm:text-xs tracking-[0.4em] uppercase backdrop-blur-sm"
              >
                How it works
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right: Curved Image Holder - Pushed Right */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 60 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 2, delay: 0.4, ease: [0.19, 1, 0.22, 1] }}
            className="hidden lg:block relative lg:ml-auto"
          >
            <div className="relative z-10 aspect-[4/5] w-full max-w-lg">
              <div className="absolute inset-0 bg-[#7C3AED]/20 blur-[120px] rounded-full animate-pulse" />
              <div className="relative h-full w-full rounded-[4.5rem] overflow-hidden border-8 border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.5)]">
                <WebImage
                  src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=1200"
                  alt="Engineering context"
                  aspectRatio="h-full w-full"
                  className="h-full w-full grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-1000 ease-in-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-80" />

                {/* Floating Meta Data Overlay */}
                <div className="absolute bottom-12 left-12 right-12">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-px flex-grow bg-white/30"></div>
                    <span className="font-mono text-[9px] text-white/50 tracking-[0.6em] uppercase">Audit_Ready</span>
                  </div>
                  <h4 className="text-white text-2xl font-bold uppercase tracking-tighter">Clinical Verification</h4>
                </div>
              </div>

              {/* Decorative side accent */}
              <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col gap-6">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.2, 1, 0.2] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-[#7C3AED]"
                  />
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <div className="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 hidden sm:block">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 sm:w-32 sm:h-32 border border-white/5 rounded-full flex items-center justify-center p-2"
        >
          <div className="w-full h-full border-t border-[#7C3AED]/40 rounded-full"></div>
        </motion.div>
        <div className="absolute inset-0 flex items-center justify-center font-mono text-[8px] text-white/20 tracking-widest uppercase">
          Audit Cycle
        </div>
      </div>
    </section>
  );
};

export default Hero;
