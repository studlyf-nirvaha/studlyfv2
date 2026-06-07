
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import WebImage from './WebImage';

const ProblemSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], [-50, 50]);

  return (
    <section ref={containerRef} className="bg-[#FAF9FF] py-32 px-6 border-y border-[#7C3AED]/5 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-20 items-center">
          <motion.div
            style={{ y }}
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1"
          >
            <WebImage
              src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=1200"
              alt="Corporate Tech Building"
              aspectRatio="aspect-[4/3]"
              className="rounded-[3rem] shadow-2xl border-4 border-white"
            />
          </motion.div>

          <div className="order-1 lg:order-2 text-left">
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm font-bold text-[#7C3AED] uppercase tracking-[0.4em] mb-6 font-sans"
            >
              The Trust Gap
            </motion.h2>
            <motion.h3
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-poppins text-5xl md:text-6xl text-[#0F172A] italic mb-8 leading-tight"
            >
              Capability is rare. <br />
              <span className="text-[#7C3AED] not-italic font-sans font-bold tracking-tighter uppercase text-4xl">Claims are everywhere.</span>
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="text-lg text-[#475569] mb-12 leading-relaxed font-medium"
            >
              Resumes and certificates have lost their signaling power. In a world of generative noise, elite engineering teams require proof of system ownership, not just line production.
            </motion.p>

            <div className="space-y-4">
              {[
                { title: "Verifiable Autonomy", desc: "Prove you can steer the ship, not just follow the map." },
                { title: "Judgment Verification", desc: "Testing the tradeoffs humans make between prompts." }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="p-6 bg-white rounded-2xl shadow-sm border border-[#7C3AED]/5 flex items-center gap-6 group hover:border-[#7C3AED]/30 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-[#F5F3FF] text-[#7C3AED] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#7C3AED] group-hover:text-white transition-colors">
                    0{i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0F172A] text-sm uppercase tracking-widest">{item.title}</h4>
                    <p className="text-xs text-[#64748B]">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
