
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Zap, Layers, Clock, CheckCircle } from 'lucide-react';

const faqData = [
  {
    question: "What is STUDLYF and how is it different?",
    answer: "STUDLYF is a student-first ecosystem built to help ambitious students learn, build, network, and grow through real opportunities. Unlike traditional communities focused only on events or certificates, STUDLYF focuses on mentorship, projects, innovation, collaborations, startup exposure, and long-term career growth."
  },
  {
    question: "What kind of opportunities does STUDLYF provide?",
    answer: "Students get access to workshops, hackathons, mentorship, startup exposure, collaborations, networking events, leadership roles, innovation initiatives, and real project opportunities designed to help them grow beyond classrooms."
  },
  {
    question: "Is STUDLYF only for tech students?",
    answer: "No. STUDLYF is built for ambitious students from different domains who want to learn, collaborate, innovate, build meaningful networks, and gain practical exposure beyond academics."
  },
  {
    question: "How can students grow through STUDLYF?",
    answer: "Students can participate in communities, collaborate on projects, attend events, connect with mentors, build leadership skills, explore startups, and gain exposure to real-world innovation ecosystems."
  },
  {
    question: "How can I join the STUDLYF ecosystem?",
    answer: "You can join by becoming part of the community, attending events, participating in initiatives, collaborating on projects, and staying active within the STUDLYF ecosystem as opportunities open up."
  }
];

interface FAQItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  toggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, toggle }) => {
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={toggle}
        className="w-full py-5 sm:py-6 flex items-center justify-between text-left group"
      >
        <span className={`text-base sm:text-lg font-bold transition-colors duration-300 ${isOpen ? 'text-[#7C3AED]' : 'text-[#0F172A] group-hover:text-[#7C3AED]'}`}>
          {question}
        </span>
        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${isOpen ? 'bg-[#7C3AED] border-[#7C3AED] text-white rotate-45' : 'border-gray-200 text-gray-400 group-hover:border-[#7C3AED] group-hover:text-[#7C3AED]'}`}>
          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v12M6 12h12" /></svg>
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-6 pr-8 sm:pr-12">
              <p className="text-[#475569] leading-relaxed text-sm sm:text-base max-w-2xl">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const left = faqData.slice(0, Math.ceil(faqData.length / 2));
  const right = faqData.slice(Math.ceil(faqData.length / 2));

  const iconMap: any = [HelpCircle, Zap, Layers, Clock, CheckCircle];

  return (
    <section className="bg-white py-12 sm:py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <motion.h2 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.4em] mb-3">FAQ</motion.h2>
          <motion.h3 initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="font-poppins text-3xl sm:text-4xl italic text-[#0F172A]">Everything you need to know.</motion.h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[left, right].map((col, colIdx) => (
            <div key={colIdx} className="space-y-4">
              {col.map((item, i) => {
                const globalIdx = colIdx === 0 ? i : left.length + i;
                const Icon = iconMap[globalIdx % iconMap.length];
                const isOpen = openIndex === globalIdx;
                return (
                  <div key={globalIdx} className="rounded-2xl border border-gray-100 shadow-sm bg-white overflow-hidden">
                    <button onClick={() => setOpenIndex(isOpen ? null : globalIdx)} className={`w-full flex items-center gap-4 p-4 md:p-5 text-left ${isOpen ? 'bg-white' : 'hover:bg-gray-50'} transition` }>
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#06B6D4] text-white flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className={`font-bold text-sm md:text-base ${isOpen ? 'text-[#111827]' : 'text-[#0F172A]'}`}>{item.question}</div>
                        <div className="text-[12px] text-[#6B7280] mt-1 hidden md:block">{item.answer.slice(0, 80)}...</div>
                      </div>
                      <div className={`text-[#7C3AED] font-black`}>{isOpen ? '−' : '+'}</div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }} className="p-4 pt-0">
                          <p className="text-sm text-[#475569] leading-relaxed">{item.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-8 text-center">
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Still have questions? <a href="#" className="text-[#7C3AED] hover:underline">Connect with the STUDLYF team.</a></p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQ;

