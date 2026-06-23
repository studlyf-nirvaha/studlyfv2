import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code, BrainCircuit, Cloud, PenTool, CheckSquare, GraduationCap, 
  Music, Search, Tag, ExternalLink, ArrowLeft, Terminal, ShieldCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const discountCategories = [
  { id: 'all', label: 'All Discounts', icon: Tag },
  { id: 'software', label: 'Software & Dev', icon: Code },
  { id: 'ai', label: 'AI Tools', icon: BrainCircuit },
  { id: 'cloud', label: 'Cloud Credits', icon: Cloud },
  { id: 'design', label: 'Design & Creator', icon: PenTool },
  { id: 'productivity', label: 'Productivity', icon: CheckSquare },
  { id: 'learning', label: 'Learning', icon: GraduationCap },
  { id: 'lifestyle', label: 'Lifestyle & Hardware', icon: Music }
];

const allDiscounts = [
  // Software & Developer Tools
  {
    id: 1,
    categoryId: 'software',
    brand: 'GitHub Student Pack',
    discount: '100% OFF',
    benefit: 'Free access to premium dev tools.',
    eligibility: 'Verified university student',
    verification: '.edu email / GitHub Auth',
    link: 'https://education.github.com/pack',
    icon: Code,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 2,
    categoryId: 'software',
    brand: 'JetBrains Student Pack',
    discount: '100% FREE',
    benefit: 'Free IntelliJ, PyCharm Pro, WebStorm.',
    eligibility: 'Verified university student',
    verification: '.edu email / Student ID',
    link: 'https://www.jetbrains.com/community/education/',
    icon: Terminal,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 3,
    categoryId: 'software',
    brand: 'Termius Education',
    discount: 'FREE PRO',
    benefit: 'Free Pro SSH client for development.',
    eligibility: 'Student via GitHub Pack',
    verification: 'GitHub Auth',
    link: 'https://termius.com/education',
    icon: Terminal,
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    btnHover: 'hover:bg-indigo-50'
  },
  {
    id: 4,
    categoryId: 'software',
    brand: 'Namecheap Student',
    discount: 'FREE DOMAIN',
    benefit: 'Free .me domain and SSL for 1 year.',
    eligibility: 'Verified university student',
    verification: 'GitHub Auth',
    link: 'https://nc.me/',
    icon: ShieldCheck,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    btnHover: 'hover:bg-orange-50'
  },
  {
    id: 5,
    categoryId: 'software',
    brand: 'Bootstrap Studio',
    discount: '100% FREE',
    benefit: 'Free license for web design app.',
    eligibility: 'Student via GitHub Pack',
    verification: 'GitHub Auth',
    link: 'https://bootstrapstudio.io/student',
    icon: Code,
    color: 'text-[#6C2BFF]',
    bg: 'bg-[#6C2BFF]/10',
    btnHover: 'hover:bg-[#6C2BFF]/10'
  },

  // AI Tools
  {
    id: 6,
    categoryId: 'ai',
    brand: 'Cursor AI',
    discount: '1 YEAR FREE',
    benefit: 'Full year of Cursor Pro for free.',
    eligibility: 'Enrolled university student',
    verification: '.edu email / SheerID',
    link: 'https://cursor.com/students',
    icon: BrainCircuit,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 7,
    categoryId: 'ai',
    brand: 'Perplexity Education',
    discount: '50% OFF',
    benefit: 'Discounted student rate for Pro tier.',
    eligibility: 'University student or faculty',
    verification: '.edu email / SheerID',
    link: 'https://www.perplexity.ai/pro',
    icon: BrainCircuit,
    color: 'text-teal-600',
    bg: 'bg-teal-600/10',
    btnHover: 'hover:bg-teal-50'
  },

  // Cloud Credits
  {
    id: 8,
    categoryId: 'cloud',
    brand: 'AWS Educate',
    discount: '$100 CREDITS',
    benefit: 'Free hands-on AWS lab environments.',
    eligibility: 'Students aged 13+',
    verification: 'Student email sign-up',
    link: 'https://aws.amazon.com/education/awseducate/',
    icon: Cloud,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    btnHover: 'hover:bg-orange-50'
  },
  {
    id: 9,
    categoryId: 'cloud',
    brand: 'Azure for Students',
    discount: '$100 CREDITS',
    benefit: '$100 in credits + free cloud services.',
    eligibility: 'Enrolled in a degree program',
    verification: '.edu email verification',
    link: 'https://azure.microsoft.com/en-us/free/students/',
    icon: Cloud,
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 10,
    categoryId: 'cloud',
    brand: 'DigitalOcean',
    discount: '$200 CREDITS',
    benefit: 'Free credits to deploy student apps.',
    eligibility: 'Student via GitHub Pack',
    verification: 'GitHub Auth',
    link: 'https://education.github.com/pack',
    icon: Cloud,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 11,
    categoryId: 'cloud',
    brand: 'MongoDB Student',
    discount: '$50 CREDITS',
    benefit: 'Free Atlas credits for databases.',
    eligibility: 'Student via GitHub Pack',
    verification: 'GitHub Auth',
    link: 'https://education.github.com/pack',
    icon: Cloud,
    color: 'text-green-600',
    bg: 'bg-green-600/10',
    btnHover: 'hover:bg-green-50'
  },
  {
    id: 12,
    categoryId: 'cloud',
    brand: 'Railway Student',
    discount: 'FREE TIER',
    benefit: 'Enhanced execution limits for apps.',
    eligibility: 'University student',
    verification: 'GitHub Auth',
    link: 'https://railway.app/',
    icon: Cloud,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },

  // Design
  {
    id: 13,
    categoryId: 'design',
    brand: 'Figma Education',
    discount: 'FREE PRO',
    benefit: 'Design without limits using Figma Pro.',
    eligibility: 'Students at recognized orgs',
    verification: 'School affiliation verification',
    link: 'https://www.figma.com/education/',
    icon: PenTool,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    btnHover: 'hover:bg-orange-50'
  },
  {
    id: 14,
    categoryId: 'design',
    brand: 'Canva Pro Education',
    discount: 'FREE PRO',
    benefit: 'Access to premium design templates.',
    eligibility: 'University Student / K12',
    verification: '.edu email / GitHub',
    link: 'https://www.canva.com/education/students/',
    icon: PenTool,
    color: 'text-[#6C2BFF]',
    bg: 'bg-[#6C2BFF]/10',
    btnHover: 'hover:bg-[#6C2BFF]/10'
  },
  {
    id: 15,
    categoryId: 'design',
    brand: 'Adobe Creative Cloud',
    discount: '60% OFF',
    benefit: 'Massive discount on entire CC suite.',
    eligibility: 'Verified student or educator',
    verification: '.edu email / ID upload',
    link: 'https://www.adobe.com/creativecloud/buy/students.html',
    icon: PenTool,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    btnHover: 'hover:bg-red-50'
  },
  {
    id: 16,
    categoryId: 'design',
    brand: 'Framer Education',
    discount: '50% OFF',
    benefit: 'Build blazing-fast websites at half cost.',
    eligibility: 'Enrolled university student',
    verification: '.edu email / Student ID',
    link: 'https://www.framer.com/pricing/education/',
    icon: PenTool,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 17,
    categoryId: 'design',
    brand: 'Miro Education',
    discount: 'FREE PREMIUM',
    benefit: 'Free premium workspace for mind-maps.',
    eligibility: 'Verified student or educator',
    verification: '.edu email verification',
    link: 'https://miro.com/education/',
    icon: CheckSquare,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    btnHover: 'hover:bg-yellow-50'
  },

  // Productivity
  {
    id: 18,
    categoryId: 'productivity',
    brand: 'Notion Education Plus',
    discount: '100% FREE',
    benefit: 'Unlimited blocks and pages for life.',
    eligibility: 'Valid university email',
    verification: '.edu email address',
    link: 'https://www.notion.so/students',
    icon: CheckSquare,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 19,
    categoryId: 'productivity',
    brand: 'Microsoft Office 365',
    discount: '100% FREE',
    benefit: 'Free access to Word, Excel, Teams.',
    eligibility: 'Students at eligible institutions',
    verification: 'Institution email address',
    link: 'https://www.microsoft.com/en-us/education/products/office',
    icon: CheckSquare,
    color: 'text-red-600',
    bg: 'bg-red-600/10',
    btnHover: 'hover:bg-red-50'
  },
  {
    id: 20,
    categoryId: 'productivity',
    brand: 'Evernote Student',
    discount: '50% OFF',
    benefit: 'Discount on Professional note-taking.',
    eligibility: 'Verified college student',
    verification: 'UNiDAYS / Student Email',
    link: 'https://evernote.com/students',
    icon: CheckSquare,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    btnHover: 'hover:bg-green-50'
  },
  {
    id: 21,
    categoryId: 'productivity',
    brand: 'TickTick Education',
    discount: '25% OFF',
    benefit: 'Discounted premium task management.',
    eligibility: 'Verified student',
    verification: '.edu email verification',
    link: 'https://ticktick.com/education',
    icon: CheckSquare,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    btnHover: 'hover:bg-blue-50'
  },

  // Learning Platforms
  {
    id: 22,
    categoryId: 'learning',
    brand: 'Coursera for Campus',
    discount: 'FREE ACCESS',
    benefit: 'Free access to select guided projects.',
    eligibility: 'Student at a partnered institution',
    verification: 'University email domain',
    link: 'https://www.coursera.org/for-university-and-college-students',
    icon: GraduationCap,
    color: 'text-blue-600',
    bg: 'bg-blue-600/10',
    btnHover: 'hover:bg-blue-50'
  },
  {
    id: 23,
    categoryId: 'learning',
    brand: 'Codecademy Student',
    discount: '50% OFF',
    benefit: 'Half off Codecademy Pro.',
    eligibility: 'Verified college student',
    verification: 'SheerID verification',
    link: 'https://www.codecademy.com/student-center',
    icon: Code,
    color: 'text-[#1A1A1A]',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 24,
    categoryId: 'learning',
    brand: 'Skillshare Student',
    discount: '50% OFF',
    benefit: '50% off annual membership.',
    eligibility: 'Verified university student',
    verification: '.edu email verification',
    link: 'https://www.skillshare.com/en/scholarships',
    icon: PenTool,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    btnHover: 'hover:bg-green-50'
  },
  {
    id: 25,
    categoryId: 'learning',
    brand: 'Frontend Masters',
    discount: '6 MONTHS FREE',
    benefit: 'Access top-tier frontend courses.',
    eligibility: 'Student via GitHub Pack',
    verification: 'GitHub Auth',
    link: 'https://frontendmasters.com/welcome/students/',
    icon: GraduationCap,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    btnHover: 'hover:bg-red-50'
  },

  // Lifestyle & Hardware
  {
    id: 26,
    categoryId: 'lifestyle',
    brand: 'Spotify Premium',
    discount: '50% OFF',
    benefit: 'Half price premium + Hulu in select regions.',
    eligibility: 'Verified college student',
    verification: 'SheerID verification',
    link: 'https://www.spotify.com/us/student/',
    icon: Music,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    btnHover: 'hover:bg-green-50'
  },
  {
    id: 27,
    categoryId: 'lifestyle',
    brand: 'Apple Education',
    discount: 'DISCOUNTED',
    benefit: 'Special pricing on Macs and iPads.',
    eligibility: 'Currently enrolled student',
    verification: 'UNiDAYS / Education Store',
    link: 'https://www.apple.com/us-hed/shop',
    icon: Tag,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    btnHover: 'hover:bg-gray-200'
  },
  {
    id: 28,
    categoryId: 'lifestyle',
    brand: 'Amazon Prime Student',
    discount: '6 MO. FREE',
    benefit: '6 months free trial, then 50% off.',
    eligibility: 'Verified college student',
    verification: '.edu email verification',
    link: 'https://www.amazon.com/Amazon-Student/b?node=8875503011',
    icon: Tag,
    color: 'text-cyan-600',
    bg: 'bg-cyan-600/10',
    btnHover: 'hover:bg-cyan-50'
  }
];

const StudentDiscounts: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDiscounts = useMemo(() => {
    return allDiscounts.filter(d => {
      const matchesCategory = activeCategory === 'all' || d.categoryId === activeCategory;
      const matchesSearch = d.brand.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            d.benefit.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const handleLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-800 pt-28 font-sans selection:bg-[#6C2BFF]/20 flex flex-col">
      <div className="max-w-7xl mx-auto px-6 pb-24 flex-grow w-full relative z-10">
        
        {/* Navigation */}
        <Link 
          to="/studhub" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-[#1A1A1A] hover:border-gray-300 hover:shadow-sm transition-all mb-10 font-bold text-sm group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to STUDHub
        </Link>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl h-[250px] bg-[#6C2BFF]/10 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="inline-flex items-center gap-2 bg-[#6C2BFF]/10 text-[#6C2BFF] px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6 border border-[#6C2BFF]/20 relative z-10 shadow-sm">
            <Tag className="w-4 h-4" /> Real Leverage
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight text-[#1A1A1A] relative z-10 leading-[1.1]">
            Student <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6C2BFF] to-[#EC4899]">Discounts</span>
          </h1>
          <p className="text-lg text-gray-500 font-medium relative z-10">
            Your `.edu` email is powerful. Unlock thousands of dollars in premium software, AI tools, and cloud credits for free.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="relative mb-8">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search discounts, brands, or benefits..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-full py-4 pl-14 pr-6 text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C2BFF]/20 focus:border-[#6C2BFF]/50 transition-all shadow-sm text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {discountCategories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
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
        </div>

        {/* Discounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 min-h-[300px]">
          <AnimatePresence mode="wait">
            {filteredDiscounts.map((discount) => (
              <motion.div 
                key={discount.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => handleLinkClick(discount.link)}
                className="bg-white border border-gray-200 rounded-[2rem] p-6 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)] hover:-translate-y-1 hover:border-[#6C2BFF]/30 transition-all duration-300 group flex flex-col h-full cursor-pointer relative"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${discount.bg} group-hover:scale-110 transition-transform duration-300 shrink-0 shadow-sm`}>
                    <discount.icon className={`w-6 h-6 ${discount.color}`} />
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${discount.color} ${discount.bg} border border-transparent group-hover:border-current transition-colors`}>
                    {discount.discount}
                  </div>
                </div>

                <div className="mb-6 flex-grow">
                  <h3 className="text-xl font-black text-[#1A1A1A] group-hover:text-[#6C2BFF] transition-colors leading-tight mb-2">{discount.brand}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">{discount.benefit}</p>
                </div>

                <div className="bg-[#F8F9FC] rounded-2xl p-4 border border-gray-100 mb-6">
                  <div className="mb-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-0.5">Eligibility</span>
                    <p className="text-xs text-gray-700 font-semibold truncate">{discount.eligibility}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-0.5">Verification</span>
                    <p className="text-xs text-[#6C2BFF] font-bold truncate">{discount.verification}</p>
                  </div>
                </div>

                <button className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border border-transparent ${discount.bg} ${discount.color} ${discount.btnHover}`}>
                  Claim Discount <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </button>
              </motion.div>
            ))}
            
            {filteredDiscounts.length === 0 && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-4 text-center py-24 bg-white rounded-[2rem] border border-gray-200 border-dashed flex flex-col items-center justify-center"
               >
                  <Search className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-xl font-black text-gray-800 mb-2">No discounts found</h3>
                  <p className="text-gray-500 text-sm font-medium">Try adjusting your search or selecting a different category.</p>
               </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default StudentDiscounts;

