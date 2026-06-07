import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const FinalCTA: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-white py-20 sm:py-32 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative bg-[#0F172A] rounded-[2.5rem] sm:rounded-[4rem] overflow-hidden py-24 sm:py-40 px-6 sm:px-10 text-center shadow-3xl shadow-[#7C3AED]/20"
        >
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000"
              className="w-full h-full object-cover opacity-20 grayscale mix-blend-screen"
              alt="Interconnected Systems"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0F172A] via-transparent to-[#0F172A]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent)]"></div>
          </div>

          <div className="relative z-10 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-block border border-white/20 px-6 py-2 sm:px-8 sm:py-3 rounded-xl mb-8 sm:mb-12 backdrop-blur-md"
            >
              <span className="font-mono text-[9px] sm:text-[10px] tracking-[0.4em] sm:tracking-[0.6em] text-[#7C3AED] font-bold uppercase">Ready for Assessment?</span>
            </motion.div>

            <h2 className="font-poppins text-5xl sm:text-7xl lg:text-[9rem] italic text-white mb-8 sm:mb-12 tracking-tight">
              Verify <br /><span className="text-[#7C3AED] not-italic font-sans font-bold tracking-tighter uppercase text-4xl sm:text-6xl lg:text-[7rem] block mt-2 sm:mt-0">Your Limit.</span>
            </h2>

            <p className="text-base sm:text-xl lg:text-2xl text-gray-400 mb-12 sm:mb-20 font-medium max-w-2xl mx-auto leading-relaxed">
              Resumes and prompts make claims. We provide the proof. Join the institutional standard for engineering readiness.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8">
              <button
                onClick={() => navigate('/learn/assessment')}
                className="glow-btn glow-btn-purple px-10 py-5 sm:px-16 sm:py-8 rounded-2xl text-[10px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.4em] uppercase"
              >
                <span className="glow-orb glow-orb-1" />
                <span className="glow-orb glow-orb-2" />
                <span className="glow-orb glow-orb-3" />
                <span className="glow-label">Start Assessment</span>
              </button>
              <motion.button
                onClick={() => navigate('/about')}
                whileHover={{ scale: 0.96 }}
                whileTap={{ scale: 0.92 }}
                className="px-10 py-5 sm:px-16 sm:py-8 bg-white/5 text-white font-bold rounded-2xl border border-white/20 hover:border-[#7C3AED] transition-all text-[10px] sm:text-[11px] tracking-[0.3em] sm:tracking-[0.4em] uppercase backdrop-blur-sm"
              >
                Learn More
              </motion.button>
            </div>
          </div>

          <div className="absolute top-0 left-0 p-8 sm:p-12 hidden sm:block">
            <div className="w-8 h-8 sm:w-12 sm:h-12 border-t-2 border-l-2 border-white/10 rounded-tl-2xl sm:rounded-tl-3xl"></div>
          </div>
          <div className="absolute bottom-0 right-0 p-8 sm:p-12 hidden sm:block">
            <div className="w-8 h-8 sm:w-12 sm:h-12 border-b-2 border-r-2 border-white/10 rounded-br-2xl sm:rounded-br-3xl"></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;