import React from 'react';
import { motion } from 'framer-motion';

const tracks = [
  { id: "SYS_01", title: "Backend Systems", standard: "PROTOCOL_ALPHA_2.0", desc: "Design, deploy, and defend distributed systems under real-world entropy." },
  { id: "DAT_04", title: "Data Engineering", standard: "FLUX_OMEGA_1.4", desc: "Architecting reliable intelligence pipelines and ensuring data integrity at scale." },
  { id: "ML_09", title: "ML Engineering", standard: "INFER_BETA_3.2", desc: "Operationalizing high-stakes inference models with human ownership and oversight." }
];

const TrackPreview: React.FC = () => {
  return (
    <section id="tracks" className="bg-[#7C3AED] py-40 px-6 overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-tech opacity-10"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-24 text-center lg:text-left">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="font-mono text-[10px] text-white/60 font-bold tracking-[0.5em] uppercase mb-4 underline underline-offset-8"
          >
            Standard Library
          </motion.h2>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-poppins text-7xl md:text-8xl italic text-white"
          >
            Active Tracks.
          </motion.h3>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {tracks.map((track, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="bg-white/10 backdrop-blur-3xl border border-white/20 p-12 curved-edge flex flex-col min-h-[500px] group hover:bg-white/15 transition-all duration-500 relative overflow-hidden"
            >
              {/* Subtle background placeholder branding */}
              <div className="absolute top-0 right-0 p-10 font-mono text-8xl text-white/5 font-black group-hover:text-white/10 transition-colors pointer-events-none">
                {track.id.split('_')[0]}
              </div>

              <div className="flex justify-between items-start mb-20 relative z-10">
                <span className="font-mono text-3xl text-white/40 font-bold tracking-tighter group-hover:text-white transition-colors">{track.id}</span>
                <span className="text-[9px] font-mono text-[#7C3AED] bg-white px-4 py-2 curved-edge font-bold tracking-widest shadow-xl">
                  {track.standard}
                </span>
              </div>

              <div className="flex-grow relative z-10">
                <h4 className="text-4xl font-bold text-white mb-8 tracking-tight leading-tight group-hover:translate-x-2 transition-transform">{track.title}</h4>
                <p className="text-white/70 text-lg font-medium leading-relaxed">{track.desc}</p>
              </div>

              <motion.button
                whileHover={{ scale: 0.96 }}
                whileTap={{ scale: 0.92 }}
                className="mt-12 w-full py-6 bg-white text-[#7C3AED] font-bold curved-edge shadow-2xl text-[10px] tracking-[0.4em] uppercase hover:bg-gray-50 transition-colors relative z-10"
              >
                Access Standard
              </motion.button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrackPreview;