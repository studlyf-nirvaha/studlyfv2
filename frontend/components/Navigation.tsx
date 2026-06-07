
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { API_BASE_URL } from '../apiConfig';
import { ShoppingCart, User, BookOpen, Briefcase, LogOut } from 'lucide-react';
import AvatarImage from './AvatarImage';

const StudlyfLogo = ({ className = "h-8 sm:h-10" }: { className?: string }) => (
  <div className={`flex items-center ${className}`}>
    <img
      src="/images/studlyf_secondary.png"
      alt="STUDLYF Logo"
      className="h-full w-auto object-contain"
    />
  </div>
);

interface BentoCardProps {
  title: string;
  desc: string;
  children?: React.ReactNode;
  className?: string;
  to?: string;
  onClick?: () => void;
}

const BentoCard = ({ title, desc, children, className = "", to = "#", onClick }: BentoCardProps) => (
  <Link
    to={to}
    onClick={onClick}
    className={`bg-white/80 backdrop-blur-sm rounded-[1.5rem] p-5 relative overflow-hidden group border border-transparent hover:border-[#7C3AED]/20 hover:shadow-xl transition-all ${className}`}
  >
    <div className="relative z-10">
      <h3 className="text-base font-bold text-[#111827] mb-1.5 tracking-tight group-hover:text-[#7C3AED] transition-colors">{title}</h3>
      <p className="text-[11px] text-[#6B7280] leading-relaxed max-w-[180px] mb-3">{desc}</p>
    </div>
    {children}
  </Link>
);

const LearnDropdown = ({ onItemClick }: { onItemClick: () => void }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
    <BentoCard onClick={onItemClick} to="/learn/courses-overview" title="Courses" desc="Role-focused tracks for elite engineering readiness." className="lg:col-span-2 lg:row-span-2 min-h-[160px] lg:min-h-[180px]">
      <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600" className="absolute bottom-0 right-0 w-1/2 h-full object-cover opacity-100 transition-all duration-700" alt="Courses" />
    </BentoCard>
    <BentoCard onClick={onItemClick} to="/learn/company-modules" title="Company Learning Modules" desc="Institutional training for corporate internal teams." className="lg:col-span-1 lg:row-span-2 min-h-[160px] lg:min-h-[180px]">
      <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-full h-1/2 object-cover opacity-100 transition-all duration-700 rounded-b-[1.5rem]" alt="Corporate" />
    </BentoCard>
    <BentoCard onClick={onItemClick} to="/studhub" title="STUDHub" desc="The central nervous system for your student growth." className="lg:col-span-1 lg:row-span-2 min-h-[160px] lg:min-h-[180px] bg-[#6C2BFF]/5 hover:border-[#6C2BFF]/30">
      <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-full h-1/2 object-cover opacity-100 transition-all duration-700 rounded-b-[1.5rem]" alt="STUDHub" />
    </BentoCard>
  </div>
);

const JobPrepDropdown = ({ onItemClick }: { onItemClick: () => void }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full">
    <BentoCard onClick={onItemClick} to="/job-prep/portfolio" title="Build Portfolio" desc="Showcase evidence." className="md:col-span-1 md:row-span-2 min-h-[160px] md:min-h-[180px]">
      <div className="mt-1 bg-[#0F172A] rounded-lg p-3 shadow-xl border border-white/10 group-hover:scale-[1.02] transition-transform h-full">
        <div className="flex items-center gap-1 mb-1.5">
          <div className="w-1 h-1 rounded-full bg-red-400"></div>
          <div className="w-1 h-1 rounded-full bg-yellow-400"></div>
          <div className="w-1 h-1 rounded-full bg-green-400"></div>
        </div>
        <div className="space-y-1.5"><div className="h-2 w-2/3 bg-white/10 rounded"></div><div className="h-8 w-full bg-gradient-to-tr from-[#7C3AED]/30 to-transparent rounded border border-white/5"></div></div>
      </div>
    </BentoCard>
    <BentoCard onClick={onItemClick} to="/job-prep/resume-builder" title="Resume Builder" desc="Create instant resumes." className="md:col-span-1 md:row-span-2 min-h-[160px] md:min-h-[180px]">
      <div className="mt-2 mx-auto w-3/4 h-full bg-white border border-gray-200 rounded-t-lg shadow-sm group-hover:shadow-md transition-all group-hover:scale-[1.02] group-hover:-translate-y-1 relative overflow-hidden p-2">
        <div className="flex gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex-shrink-0"></div>
          <div className="space-y-1 w-full">
            <div className="h-1.5 w-2/3 bg-gray-800 rounded-full"></div>
            <div className="h-1 w-1/2 bg-gray-400 rounded-full"></div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-0.5 w-full bg-gray-200"></div>
          <div className="flex gap-1">
            <div className="h-1 w-1/3 bg-gray-200 rounded"></div>
            <div className="h-1 w-2/3 bg-gray-100 rounded"></div>
          </div>
          <div className="flex gap-1">
            <div className="h-1 w-1/4 bg-gray-200 rounded"></div>
            <div className="h-1 w-3/4 bg-gray-100 rounded"></div>
          </div>
          <div className="h-0.5 w-full bg-gray-200 mt-1"></div>
          <div className="space-y-1 mt-1">
            <div className="h-1 w-full bg-gray-100 rounded"></div>
            <div className="h-1 w-5/6 bg-gray-100 rounded"></div>
            <div className="h-1 w-4/6 bg-gray-100 rounded"></div>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500/10 rounded-tl-xl flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
        </div>
      </div>
    </BentoCard>
    <BentoCard onClick={onItemClick} to="/learn/assessment-intro" title="Skill Assessment" desc="Find your strengths with clinical scoring." className="md:col-span-2 h-[88px]">
      <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-1/4 h-full object-cover opacity-80 group-hover:opacity-100 transition-all" alt="Assessment" />
    </BentoCard>
    <BentoCard onClick={onItemClick} to="/job-prep/mock-interview" title="Mock tests & interviews" desc="Practice clinical logic defense." className="h-[88px]" />
    <BentoCard onClick={onItemClick} to="/job-prep/projects" title="Build A Project" desc="Build and scale industry-standard projects with elite engineering teams." className="h-[88px]" />
  </div>
);



const Navigation: React.FC = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.user_id) return;
    fetch(`${API_BASE_URL}/api/user/${user.user_id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profilePhoto) setProfilePhoto(data.profilePhoto);
      })
      .catch(() => {});
  }, [user?.user_id]);

  const courseRoutePrefixes = [
    '/learn/course',
    '/course-detail',
    '/course-player',
    '/cart',
    '/learn/cart'
  ];
  const isCoursePage = courseRoutePrefixes.some(prefix => pathname.startsWith(prefix));

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMobileOverlay, setActiveMobileOverlay] = useState<string | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const timeoutRef = useRef<number | null>(null);
  const userDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMouseEnter = (menu: string) => {
    if (window.innerWidth < 1024) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    if (window.innerWidth < 1024) return;
    timeoutRef.current = window.setTimeout(() => setActiveMenu(null), 200);
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <>
      <nav className="fixed top-0 z-[100] w-full px-2 py-2.5 sm:px-6 sm:py-4 lg:px-12">
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative z-[110] h-12 sm:h-16 bg-[#7C3AED]/95 backdrop-blur-xl rounded-[1.1rem] sm:rounded-[1.75rem] px-4 sm:px-7 lg:px-10 flex items-center justify-between shadow-[0_18px_40px_rgba(124,58,237,0.26)] border border-white/15"
          >
            <div className="flex items-center lg:w-[250px] gap-4">
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden text-white p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>

              <Link to="/" className="flex items-center group transition-transform hover:scale-105 active:scale-95">
                <StudlyfLogo />
              </Link>
            </div>

            <div className="flex-grow flex justify-center h-full">
              <div className="hidden lg:flex items-center space-x-16 h-full">
                {['learn', 'jobprep'].map((id) => (
                  <button
                    key={id}
                    onMouseEnter={() => handleMouseEnter(id)}
                    className={`flex items-center space-x-2 transition-all h-full uppercase tracking-[0.22em] font-bold text-[10px] ${activeMenu === id ? 'text-white' : 'text-white/80'} hover:text-white`}
                  >
                    <span>{id === 'jobprep' ? 'Job Prep' : id.charAt(0).toUpperCase() + id.slice(1)}</span>
                    <motion.svg animate={{ rotate: activeMenu === id ? 180 : 0 }} className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></motion.svg>
                  </button>
                ))}
                <Link
                  to="/studott"
                  className="flex items-center transition-all h-full uppercase tracking-[0.22em] font-bold text-[10px] text-white/80 hover:text-white"
                >
                  STUDOTT
                </Link>
                <Link
                  to="/opportunities"
                  className="flex items-center transition-all h-full uppercase tracking-[0.22em] font-bold text-[10px] text-white/80 hover:text-white"
                >
                  OPPORTUNITIES
                </Link>
              </div>
            </div>

            <div className="flex items-center lg:w-[250px] justify-end shrink-0 gap-6">
              {user ? (
                <div className="flex items-center gap-5">
                  {isCoursePage && (
                    <Link
                      to="/learn/cart"
                      className="relative p-2 hover:bg-white/10 rounded-lg transition-colors group"
                      title="View Cart"
                    >
                      <ShoppingCart className="w-5 h-5 text-white" />
                    </Link>
                  )}

                  {(role === 'admin' || role === 'super_admin') && (
                    <Link
                      to="/admin"
                      className="hidden sm:flex px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl items-center gap-2 group/admin transition-all"
                    >
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Matrix Access</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </Link>
                  )}

                  <div className="relative hidden sm:block" ref={userDropdownRef}>
                    <button
                      onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 border border-white/30 hover:bg-white/30 transition-all mr-2 group/profile cursor-pointer outline-none overflow-hidden"
                    >
                      {profilePhoto ? (
                        <AvatarImage src={profilePhoto} alt="" className="w-full h-full" />
                      ) : (
                        <User className="w-5 h-5 text-white group-hover/profile:text-[#A78BFA] transition-colors" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {isUserDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 15, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute right-0 mt-4 w-[320px] bg-white/95 backdrop-blur-2xl border border-white/40 rounded-[1.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.05)] overflow-hidden z-[150] text-left"
                        >
                          {/* Top Profile Header */}
                          <div className="p-5 flex items-center gap-4 bg-gradient-to-br from-[#F8F7FF] to-white border-b border-slate-100">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[#7C3AED]/20 ring-4 ring-white shrink-0 overflow-hidden">
                              {profilePhoto ? (
                                <AvatarImage src={profilePhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                user?.full_name?.split(' ').map((n: string) => n[0]).join('') || 'U'
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate leading-tight">{user?.full_name || 'User'}</h4>
                              <p className="text-[11px] font-medium text-slate-500 truncate mt-1">{user?.email}</p>
                            </div>
                          </div>

                          {/* Core User Actions */}
                          <div className="p-3">
                            <div className="space-y-1">
                              <span className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#7C3AED]/60 mb-2 block">
                                Member Center
                              </span>
                              
                              <Link
                                to="/dashboard/profile"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all text-sm font-semibold group"
                              >
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-sm text-slate-400 group-hover:text-[#7C3AED] transition-all">
                                  <User className="w-4 h-4" />
                                </span>
                                My Profile
                              </Link>

                              <Link
                                to="/dashboard/my-courses"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all text-sm font-semibold group"
                              >
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-sm text-slate-400 group-hover:text-[#7C3AED] transition-all">
                                  <BookOpen className="w-4 h-4" />
                                </span>
                                My Courses
                              </Link>

                              <Link
                                to="/opportunities/my-applications"
                                onClick={() => setIsUserDropdownOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:text-[#7C3AED] hover:bg-[#7C3AED]/5 transition-all text-sm font-semibold group"
                              >
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-white group-hover:shadow-sm text-slate-400 group-hover:text-[#7C3AED] transition-all">
                                  <Briefcase className="w-4 h-4" />
                                </span>
                                My Applications
                              </Link>
                            </div>
                          </div>

                          {/* Bottom Section */}
                          <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                            <button
                              onClick={() => {
                                setIsUserDropdownOpen(false);
                                logout();
                              }}
                              className="flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition-all text-sm font-semibold group cursor-pointer outline-none"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100/50 group-hover:bg-red-100 text-red-500 transition-all">
                                  <LogOut className="w-4 h-4" />
                                </span>
                                Sign Out
                              </div>
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 sm:gap-4">
                  <button
                    onClick={() => navigate('/login')}
                    className="hidden sm:block text-white/80 text-[10px] font-bold uppercase tracking-[0.25em] hover:text-white px-4"
                  >
                    Login
                  </button>
                  <motion.button
                    onClick={() => navigate('/signup')}
                    whileHover={{ scale: 0.96, backgroundColor: '#f9fafb' }}
                    className="bg-white text-[#7C3AED] px-4 py-2 sm:px-10 sm:py-2.5 rounded-lg sm:rounded-xl font-bold text-[8px] sm:text-[9px] uppercase tracking-[0.15em] sm:tracking-[0.25em] shadow-xl whitespace-nowrap"
                  >
                    Get Started
                  </motion.button>
                </div>
              )}
            </div>

          </motion.div>

          <AnimatePresence>
            {activeMobileOverlay && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveMobileOverlay(null)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] lg:hidden"
                />
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="absolute top-[calc(100%+8px)] left-0 right-0 z-[90] lg:hidden px-2 sm:px-0"
                >
                  <div className="bg-[#0B0B0F]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl p-6 sm:p-8 overflow-y-auto max-h-[80vh] no-scrollbar shadow-purple-500/10">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-black text-white uppercase tracking-[0.2em]">
                        {activeMobileOverlay === 'learn' ? 'Learn' : 'Job Prep'}
                      </h2>
                      <button
                        onClick={() => setActiveMobileOverlay(null)}
                        className="p-2 text-white/60 hover:text-white rounded-full bg-white/5"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {activeMobileOverlay === 'learn' ? (
                        <>
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/learn/courses-overview" title="Courses" desc="Role-focused tracks for elite engineering readiness." className="min-h-[140px] bg-white/5 border-white/10">
                            <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-1/3 h-full object-cover opacity-20" alt="Courses" />
                          </BentoCard>
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/learn/company-modules" title="Company Learning Modules" desc="Institutional training for corporate internal teams." className="min-h-[140px] bg-white/5 border-white/10">
                            <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-1/3 h-full object-cover opacity-20" alt="Corporate" />
                          </BentoCard>
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/studhub" title="STUDHub" desc="The central nervous system for your student growth." className="min-h-[140px] bg-[#6C2BFF]/5 border-white/10 hover:border-[#6C2BFF]/30">
                            <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-1/3 h-full object-cover opacity-20" alt="STUDHub" />
                          </BentoCard>
                        </>
                      ) : (
                        <>
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/job-prep/portfolio" title="Build Portfolio" desc="Showcase evidence." className="min-h-[140px] bg-white/5 border-white/10" />
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/job-prep/resume-builder" title="Resume Builder" desc="Create instant resumes." className="min-h-[140px] bg-white/5 border-white/10" />
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/learn/assessment-intro" title="Skill Assessment" desc="Find your strengths with clinical scoring." className="min-h-[140px] bg-white/5 border-white/10">
                            <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400" className="absolute bottom-0 right-0 w-1/4 h-full object-cover opacity-20" alt="Assessment" />
                          </BentoCard>
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/job-prep/mock-interview" title="Mock tests & interviews" desc="Practice clinical logic defense." className="min-h-[140px] bg-white/5 border-white/10" />
                          <BentoCard onClick={() => setActiveMobileOverlay(null)} to="/job-prep/projects" title="Build A Project" desc="Build and scale industry-standard projects." className="min-h-[140px] bg-white/5 border-white/10" />
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeMenu && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/10 backdrop-blur-md z-[80] pointer-events-none" />
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.98 }}
                  className="hidden lg:block absolute top-[calc(100%+12px)] left-0 right-0 bg-[#F5F3FF] border border-[#7C3AED]/10 py-10 px-10 z-[90] shadow-[0_40px_80px_rgba(124,58,237,0.15)] rounded-[3rem]"
                  onMouseEnter={() => handleMouseEnter(activeMenu)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="w-full">
                    {activeMenu === 'learn' && <LearnDropdown onItemClick={() => setActiveMenu(null)} />}
                    {activeMenu === 'jobprep' && <JobPrepDropdown onItemClick={() => setActiveMenu(null)} />}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {mobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMobileMenuOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[115] lg:hidden"
                />
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="lg:hidden fixed top-0 left-0 bottom-0 w-[280px] sm:w-[320px] bg-[#0B0B0F] z-[120] shadow-2xl flex flex-col border-r border-white/10"
                >
                  <div className="p-6 flex items-center justify-between border-b border-white/5">
                    <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                      <StudlyfLogo />
                    </Link>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="text-white/60 hover:text-white p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="flex-grow overflow-y-auto p-6 space-y-8">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-[#7C3AED] uppercase tracking-[0.4em]">Curated Tracks</p>
                      <div className="grid gap-3">
                        <button
                          onClick={() => { setActiveMobileOverlay('learn'); setMobileMenuOpen(false); }}
                          className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#7C3AED]/30 transition-all hover:bg-[#7C3AED]/10 group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#A78BFA]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">Learn</p>
                            <p className="text-[10px] text-white/40">Courses & Modules</p>
                          </div>
                        </button>

                        <button
                          onClick={() => { setActiveMobileOverlay('jobprep'); setMobileMenuOpen(false); }}
                          className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#7C3AED]/30 transition-all hover:bg-[#7C3AED]/10 group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#A78BFA]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">Job Prep</p>
                            <p className="text-[10px] text-white/40">Portfolio & Career Tools</p>
                          </div>
                        </button>

                        <Link
                          to="/studott"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-[#7C3AED]/30 transition-all hover:bg-[#7C3AED]/10 group text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center text-[#A78BFA]">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white uppercase tracking-wider">STUDOTT</p>
                            <p className="text-[10px] text-white/40">Student Streaming Platform</p>
                          </div>
                        </Link>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em]">Member Center</p>
                      <div className="space-y-2">
                        {user ? (
                          <div className="grid gap-2">
                            <Link
                              to="/dashboard/learner"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block w-full text-left px-5 py-4 bg-white/5 rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10"
                            >
                              Hub Home
                            </Link>
                            <Link
                              to="/dashboard/profile"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block w-full text-left px-5 py-4 bg-white/5 rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10"
                            >
                              My Profile
                            </Link>
                            <Link
                              to="/dashboard/my-courses"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block w-full text-left px-5 py-4 bg-white/5 rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10"
                            >
                              My Courses
                            </Link>
                            <Link
                              to="/opportunities/my-applications"
                              onClick={() => setMobileMenuOpen(false)}
                              className="block w-full text-left px-5 py-4 bg-white/5 rounded-xl text-xs font-bold text-white uppercase tracking-widest hover:bg-white/10"
                            >
                              My Applications
                            </Link>
                            <button
                              onClick={() => { logout(); setMobileMenuOpen(false); }}
                              className="w-full py-4 bg-red-500/10 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold uppercase tracking-[0.25em] hover:bg-red-500 hover:text-white transition-colors cursor-pointer outline-none"
                            >
                              Sign Out
                            </button>
                          </div>
                        ) : (
                          <div className="grid gap-2">
                            <button
                              onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}
                              className="w-full py-4 bg-[#7C3AED] text-white rounded-xl text-xs font-bold uppercase tracking-[0.25em] shadow-lg shadow-[#7C3AED]/20"
                            >
                              Login
                            </button>
                            <button
                              onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}
                              className="w-full py-4 bg-white/5 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-[0.25em]"
                            >
                              Get Started
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border-t border-white/5">
                    <p className="text-[9px] text-center text-white/30 uppercase tracking-[0.3em]">Studlyf Engineering &copy; 2026</p>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div >
      </nav >
    </>
  );
};

export default Navigation;
