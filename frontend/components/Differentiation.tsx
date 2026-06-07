
import React from 'react';
import { motion } from 'framer-motion';
import WebImage from './WebImage';

const items = [
  {
    title: "AI Is Expected",
    content: "We assume you are using state-of-the-art tools. Our verification focuses on the decisions made between prompts.",
    src: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Live Audits",
    content: "Systems are tested against real-world entropy. We verify performance, not just completion.",
    src: "https://images.unsplash.com/photo-1558494949-ef010cbdcc51?auto=format&fit=crop&q=80&w=800"
  },
  {
    title: "Institutional Weight",
    content: "Verification is used by elite technical teams to skip the guesswork of hiring.",
    src: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800"
  }
];

const Differentiation: React.FC = () => {
  return (
    <section className="bg-white py-32 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-xl"
          >
            <h2 className="text-sm font-bold text-[#7C3AED] uppercase tracking-[0.4em] mb-4">Market Distinction</h2>
            <h3 className="font-poppins text-5xl text-[#0F172A] italic">A standard built for those who ship.</h3>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {items.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col group"
            >
              <div className="rounded-2xl overflow-hidden mb-10 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                <WebImage src={item.src} alt={item.title} aspectRatio="aspect-video" />
              </div>
              <h4 className="text-2xl font-bold text-[#0F172A] mb-4 tracking-tight group-hover:text-[#7C3AED] transition-colors">{item.title}</h4>
              <p className="text-[#475569] leading-relaxed opacity-90">{item.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Differentiation;
