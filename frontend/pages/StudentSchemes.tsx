import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Landmark, Rocket, ArrowLeft, Target, Briefcase, ExternalLink, Code, Lightbulb, Users, Cloud } from 'lucide-react';
import { Link } from 'react-router-dom';

const schemeCategories = [
  { id: 'all', label: 'All Schemes', icon: Target },
  { id: 'scholarships', label: 'Scholarships', icon: GraduationCap },
  { id: 'internships', label: 'Internships', icon: Briefcase },
  { id: 'support', label: 'Education Support', icon: Landmark },
  { id: 'skills', label: 'Skill Development', icon: Lightbulb },
  { id: 'funding', label: 'Startup Funding', icon: Rocket },
  { id: 'tech', label: 'Tech Programs', icon: Code }
];

const allSchemes = [
  {
    id: 1,
    categoryId: 'scholarships',
    name: 'AICTE Pragati Scholarship',
    explanation: 'Scholarship for girl students pursuing technical education in India.',
    eligibility: 'Female students in AICTE-approved institutions.',
    benefit: 'Financial support of ₹50,000/year for education expenses.',
    provider: 'AICTE / Govt. of India',
    link: 'https://scholarships.gov.in/',
    icon: GraduationCap,
    color: 'text-[#EC4899]',
    bg: 'bg-[#EC4899]/10',
    btnHover: 'hover:bg-[#EC4899]/20'
  },
  {
    id: 2,
    categoryId: 'scholarships',
    name: 'National Scholarship Portal (NSP)',
    explanation: 'Centralized portal for all state and national government scholarships.',
    eligibility: 'Indian students meeting specific merit & income criteria.',
    benefit: 'Direct access to dozens of state and central scholarship funds.',
    provider: 'Govt. of India',
    link: 'https://scholarships.gov.in/',
    icon: Landmark,
    color: 'text-[#6C2BFF]',
    bg: 'bg-[#6C2BFF]/10',
    btnHover: 'hover:bg-[#6C2BFF]/20'
  },
  {
    id: 3,
    categoryId: 'scholarships',
    name: 'INSPIRE Scholarship',
    explanation: 'Scholarship for Higher Education (SHE) for science students.',
    eligibility: 'Top 1% students in 12th board pursuing Basic & Natural Sciences.',
    benefit: '₹80,000 per year for B.Sc/M.Sc programs.',
    provider: 'Dept. of Science & Technology',
    link: 'https://online-inspire.gov.in/',
    icon: Lightbulb,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    btnHover: 'hover:bg-orange-50'
  },
  {
    id: 4,
    categoryId: 'support',
    name: 'Vidya Lakshmi Portal',
    explanation: 'Single window portal for students to apply for educational loans.',
    eligibility: 'Any Indian student seeking educational loans for higher studies.',
    benefit: 'Apply to multiple banks through a single centralized application.',
    provider: 'NSDL e-Gov',
    link: 'https://www.vidyalakshmi.co.in/',
    icon: Landmark,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 5,
    categoryId: 'funding',
    name: 'Startup India Seed Fund',
    explanation: 'Financial assistance for early-stage student startups.',
    eligibility: 'DPIIT-recognized startups with a viable product prototype.',
    benefit: 'Funding up to ₹20 Lakhs for proof of concept & prototype.',
    provider: 'Startup India',
    link: 'https://seedfund.startupindia.gov.in/',
    icon: Rocket,
    color: 'text-[#EC4899]',
    bg: 'bg-[#EC4899]/10',
    btnHover: 'hover:bg-[#EC4899]/20'
  },
  {
    id: 6,
    categoryId: 'internships',
    name: 'NITI Aayog Internship',
    explanation: 'Prestigious government internship for policy and strategy.',
    eligibility: 'Undergrad/Postgrad students from recognized universities.',
    benefit: 'Hands-on experience with Government policy-making & networking.',
    provider: 'NITI Aayog',
    link: 'https://niti.gov.in/internship',
    icon: Briefcase,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 7,
    categoryId: 'internships',
    name: 'Digital India Internship',
    explanation: 'Technical internship under the Ministry of Electronics & IT.',
    eligibility: 'B.E/B.Tech/M.E/M.Tech/MCA/M.Sc students.',
    benefit: '₹10,000 per month stipend and an official government certificate.',
    provider: 'MeitY',
    link: 'https://meity.gov.in/internship-scheme',
    icon: Code,
    color: 'text-[#6C2BFF]',
    bg: 'bg-[#6C2BFF]/10',
    btnHover: 'hover:bg-[#6C2BFF]/20'
  },
  {
    id: 8,
    categoryId: 'skills',
    name: 'SWAYAM Learning Platform',
    explanation: 'Free online courses created by top professors from IITs and IIMs.',
    eligibility: 'Open to all Indian students looking to upgrade their skills.',
    benefit: 'Free high-quality education with optional paid certification.',
    provider: 'Ministry of Education',
    link: 'https://swayam.gov.in/',
    icon: GraduationCap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 9,
    categoryId: 'tech',
    name: 'AWS Educate',
    explanation: 'Comprehensive resources for building cloud computing skills.',
    eligibility: 'Students aged 13+ enrolled in a recognized institution.',
    benefit: 'Free cloud computing curriculum and hands-on AWS lab environments.',
    provider: 'Amazon Web Services',
    link: 'https://aws.amazon.com/education/awseducate/',
    icon: Cloud,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    btnHover: 'hover:bg-orange-50'
  },
  {
    id: 10,
    categoryId: 'tech',
    name: 'GitHub Student Developer Pack',
    explanation: 'The best developer tools, free for students.',
    eligibility: 'Must have a valid university email (.edu or equivalent).',
    benefit: 'Free access to premium developer tools, cloud credits, and domains.',
    provider: 'GitHub',
    link: 'https://education.github.com/pack',
    icon: Code,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 11,
    categoryId: 'internships',
    name: 'Google Student Careers',
    explanation: 'Internships and development programs at Google.',
    eligibility: 'University students in tech, business, and design.',
    benefit: 'Access to Google internships, STEP programs, and scholarships.',
    provider: 'Google',
    link: 'https://buildyourfuture.withgoogle.com/',
    icon: Users,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  }
];

const StudentSchemes: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredSchemes = activeCategory === 'all' 
    ? allSchemes 
    : allSchemes.filter(s => s.categoryId === activeCategory);

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-800 pt-28 font-sans selection:bg-[#EC4899]/20 flex flex-col">
      
      <div className="max-w-7xl mx-auto px-6 pb-24 flex-grow w-full relative z-10">
        
        {/* Navigation */}
        <Link 
          to="/studhub" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#1A1A1A] hover:border-gray-300 hover:shadow-sm transition-all mb-10 font-bold text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to STUDHub
        </Link>

        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl h-[250px] bg-[#EC4899]/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 bg-[#EC4899]/10 text-[#EC4899] px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-[#EC4899]/20 relative z-10 shadow-sm">
            <Landmark className="w-4 h-4" /> Government & Private Funding
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-[#1A1A1A] relative z-10 leading-[1.1]">
            Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#EC4899] to-[#6C2BFF]">Schemes</span>
          </h1>
          <p className="text-lg text-gray-500 font-medium relative z-10">
            Discover verified scholarships, government grants, internships, and funding programs tailored specifically for ambitious students.
          </p>
        </div>

        {/* Categories Tab */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          {schemeCategories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all border ${
                  isActive 
                    ? 'bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md' 
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:shadow-sm hover:text-gray-800'
                }`}
              >
                <cat.icon className="w-4 h-4" /> {cat.label}
              </button>
            )
          })}
        </div>

        {/* Schemes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            {filteredSchemes.map((scheme) => (
              <motion.div 
                key={scheme.id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleLinkClick(scheme.link)}
                className="bg-white border border-gray-200 rounded-[2rem] p-8 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-[#EC4899]/30 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden"
              >
                {/* Category Badge */}
                <div className="absolute top-6 right-6">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-gray-100 ${scheme.color} ${scheme.bg}`}>
                    {schemeCategories.find(c => c.id === scheme.categoryId)?.label}
                  </span>
                </div>

                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${scheme.bg} group-hover:scale-110 transition-transform duration-300 mb-6 shrink-0 shadow-sm`}>
                  <scheme.icon className={`w-7 h-7 ${scheme.color}`} />
                </div>
                
                <div className="mb-6">
                  <h3 className="text-xl font-black text-[#1A1A1A] group-hover:text-[#EC4899] transition-colors leading-tight mb-2 pr-12">{scheme.name}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">{scheme.explanation}</p>
                </div>

                <div className="space-y-4 mb-8 bg-[#F8F9FC] rounded-2xl p-5 border border-gray-100 flex-grow">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Eligibility</span>
                    <p className="text-sm text-gray-700 font-semibold leading-snug">{scheme.eligibility}</p>
                  </div>
                  <div className="w-full h-px bg-gray-200" />
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block mb-1">Benefit</span>
                    <p className="text-sm text-[#1A1A1A] font-bold leading-snug">{scheme.benefit}</p>
                  </div>
                </div>

                <div className="mt-auto">
                   <div className="flex items-center justify-between">
                     <div>
                       <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">Provided By</span>
                       <span className="text-sm font-black text-gray-800">{scheme.provider}</span>
                     </div>
                     <button 
                       className={`flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all border border-transparent ${scheme.bg} ${scheme.color} ${scheme.btnHover}`}
                     >
                       View Scheme <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                     </button>
                   </div>
                </div>
              </motion.div>
            ))}
            
            {filteredSchemes.length === 0 && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-24 bg-white rounded-[2rem] border border-gray-200 border-dashed flex flex-col items-center justify-center"
               >
                  <Target className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-black text-gray-800 mb-2">More schemes coming soon</h3>
                  <p className="text-gray-500 text-sm font-medium">We are verifying new opportunities for this category.</p>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default StudentSchemes;

