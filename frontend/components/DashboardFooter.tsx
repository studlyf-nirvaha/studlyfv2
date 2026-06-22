import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
    Mail,
    MessageCircle,
    Instagram
} from 'lucide-react';

interface DashboardFooterProps {
    variant?: 'student' | 'institution';
}

const DashboardFooter: React.FC<DashboardFooterProps> = ({ variant = 'student' }) => {

    const isInstitution = variant === 'institution';

    const institutionLinks = {
        col2: [
            { name: 'Events Management', to: '/institution-dashboard' },
            { name: 'Participants', to: '/institution-dashboard?tab=participants' },
            { name: 'Teams', to: '/institution-dashboard?tab=teams' },
            { name: 'Certificates', to: '/institution-dashboard?tab=certificates' },
            { name: 'Reports', to: '/institution-dashboard?tab=reports' },
        ],
        col3: [
            { name: 'Evaluation', to: '/institution-dashboard?tab=evaluation' },
            { name: 'Judging Panel', to: '/institution-dashboard?tab=judging' },
            { name: 'Leaderboard', to: '/institution-dashboard?tab=leaderboard' },
            { name: 'Submissions', to: '/institution-dashboard?tab=submissions' },
            { name: 'Stages', to: '/institution-dashboard?tab=stages' },
        ],
        col4: [
            { name: 'Institution Settings', to: '/institution-dashboard?tab=settings' },
            { name: 'Branding', to: '/institution-dashboard?tab=branding' },
            { name: 'Team Members', to: '/institution-dashboard?tab=team' },
            { name: 'Notifications', to: '/institution-dashboard?tab=notifications' },
        ],
        col5: [
            { name: 'Documentation', to: '/docs/institution' },
            { name: 'API Access', to: '/institution-dashboard?tab=api' },
            { name: 'Support', to: 'mailto:support@studlyf.com' },
            { name: 'Help Center', to: '/help' },
        ],
    };

    const studentLinks = {
        col2: [
            { name: 'Courses', to: '/learn/courses-overview' },
            { name: 'Company Modules', to: '/learn/company-modules' },
            { name: 'Blogs', to: '/blog' },
        ],
        col3: [
            { name: 'Portfolio', to: '/job-prep/portfolio' },
            { name: 'Resume', to: '/job-prep/resume-builder' },
            { name: 'Skills Assignment', to: '/learn/assessment-intro' },
            { name: 'Interviews', to: '/job-prep/mock-interview' },
            { name: 'Project', to: '/job-prep/projects' },
        ],
        col4: [
            { name: 'AI Tools', to: '/ai-tools' },
        ],
        col5: [
            { name: 'About Application', to: '/about' },
            { name: 'Contact Us', to: 'mailto:saieshwarerelli10@gmail.com' },
            { name: 'Resources', to: '/' },
        ],
    };

    const links = isInstitution ? institutionLinks : studentLinks;

    return (
        <section className="relative w-full bg-[#0B0B0F] py-12 px-4 md:px-10 font-poppins font-medium overflow-hidden">
            {/* Animated Purple Gradient Overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-none opacity-40"
                animate={{
                    background: [
                        "radial-gradient(circle at 20% 20%, #6C3BFF 0%, transparent 60%)",
                        "radial-gradient(circle at 80% 80%, #6C3BFF 0%, transparent 60%)",
                        "radial-gradient(circle at 20% 20%, #6C3BFF 0%, transparent 60%)"
                    ]
                }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />

            {/* Subtle Floating Particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(15)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-[#9D7CFF] rounded-full opacity-30"
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: Math.random() * 100 + "%",
                            scale: Math.random() * 0.5 + 0.5
                        }}
                        animate={{
                            y: [null, "-25vh"],
                            opacity: [0, 0.6, 0],
                        }}
                        transition={{
                            duration: Math.random() * 6 + 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </div>

            <div className="max-w-7xl mx-auto relative z-10">

                {/* CONTACT CARD */}
                <motion.div
                    id="contact-us"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.15 }}
                    className="relative backdrop-blur-3xl bg-white/[0.04] border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.5),0_0_50px_rgba(108,59,255,0.1)] overflow-hidden"
                >
                    {/* Glowing Top Border Line */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#9D7CFF]/50 to-transparent" />

                    <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 relative z-10">
                        <div className="flex flex-col items-center">
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-white/[0.04] rounded-3xl border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl group">
                                <img
                                    src="/images-optimized/Eshwar.webp"
                                    alt="Founder"
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>
                            <span className="mt-3 text-[10px] font-black text-[#CFCFEA] uppercase tracking-widest font-poppins opacity-60">
                                Connect with founder
                            </span>
                        </div>

                        {/* RIGHT SECTION: CONTACT US */}
                        <div className="flex-1 w-full lg:max-w-lg">
                            <div className="flex flex-col items-center lg:items-end text-center lg:text-right space-y-6">
                                <h3 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter font-poppins drop-shadow-md">
                                    CONTACT US
                                </h3>

                                <motion.div
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: {
                                            opacity: 1,
                                            transition: {
                                                staggerChildren: 0.2
                                            }
                                        }
                                    }}
                                    initial="hidden"
                                    whileInView="show"
                                    viewport={{ once: true }}
                                    className="flex items-center justify-center lg:justify-end gap-8 md:gap-12 py-2"
                                >
                                    {/* Email Icon */}
                                    <motion.a
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            show: { opacity: 1, y: 0 }
                                        }}
                                        whileHover={{
                                            scale: 1.15,
                                            y: -5,
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        href="mailto: saieshwarerelli10@gmail.com"
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 shadow-xl flex items-center justify-center text-white group-hover:bg-[#6C3BFF] group-hover:text-white group-hover:border-[#6C3BFF] transition-all duration-300">
                                            <Mail size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-[#CFCFEA] uppercase tracking-widest font-poppins opacity-50">email</span>
                                    </motion.a>

                                    {/* WhatsApp Icon */}
                                    <motion.a
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            show: { opacity: 1, y: 0 }
                                        }}
                                        whileHover={{
                                            scale: 1.15,
                                            y: -5,
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        href="https://whatsapp.com/channel/0029VbCHsjAHVvTRqLfOau24/113"
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 shadow-xl flex items-center justify-center text-[#25D366] group-hover:bg-[#25D366] group-hover:text-white group-hover:border-[#25D366] transition-all duration-300">
                                            <MessageCircle size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-[#CFCFEA] uppercase tracking-widest font-poppins opacity-50">whatsapp</span>
                                    </motion.a>

                                    {/* Instagram Icon */}
                                    <motion.a
                                        variants={{
                                            hidden: { opacity: 0, y: 20 },
                                            show: { opacity: 1, y: 0 }
                                        }}
                                        whileHover={{
                                            scale: 1.15,
                                            y: -5,
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                        href="https://www.instagram.com/stuudent.lyf?igsh=bDIwYzIxaDFyeWd3"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex flex-col items-center gap-2 group"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/10 shadow-xl flex items-center justify-center text-[#E4405F] group-hover:bg-[#E4405F] group-hover:text-white group-hover:border-[#E4405F] transition-all duration-300">
                                            <Instagram size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold text-[#CFCFEA] uppercase tracking-widest font-poppins opacity-50">instagram</span>
                                    </motion.a>
                                </motion.div>

                                <p className="text-[#CFCFEA]/60 font-black uppercase tracking-wider text-[9px] md:text-[10px] font-poppins lg:mr-8">
                                    Contact us anytime, we are here to help.
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 5-COLUMN FOOTER LINKS SECTION */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10 pt-10 mt-10 border-t border-white/[0.08]"
                >
                    {/* Column 1: Logo & Slogan */}
                    <div className="col-span-2 lg:col-span-1 flex flex-col items-start space-y-6">
                        <Link to="/" className="relative group/logo block">
                            <div className="absolute inset-0 bg-[#7C3AED]/20 blur-2xl rounded-3xl opacity-50 group-hover/logo:opacity-100 transition-opacity duration-500" />
                            <div className="relative bg-white px-6 py-3 rounded-2xl shadow-2xl transition-all duration-500 hover:scale-[1.03] w-fit overflow-hidden">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.02)_0%,_transparent_75%)]" />
                                <img 
                                    src="/images-optimized/studlyf.webp" 
                                    alt="Studlyf" 
                                    className="h-10 md:h-14 w-auto object-contain relative z-10"
                                />
                            </div>
                        </Link>
                        <p className="text-[#CFCFEA]/80 text-sm md:text-base font-poppins leading-relaxed font-semibold opacity-60">
                            {isInstitution
                                ? 'Empowering institutions with AI-driven tools to manage events, participants, and certifications seamlessly.'
                                : 'Empowering the next generation of engineers with AI-driven career tools and resources.'
                            }
                        </p>
                    </div>

                    {/* Column 2 */}
                    <div className="flex flex-col space-y-5 lg:ml-8">
                        {links.col2.map((item) => (
                            item.name === 'Contact Us' || item.name === 'Support' ? (
                                <a key={item.name} href={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </a>
                            ) : (
                                <Link key={item.name} to={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </Link>
                            )
                        ))}
                    </div>

                    {/* Column 3 */}
                    <div className="flex flex-col space-y-5">
                        {links.col3.map((item) => (
                            item.name === 'Contact Us' || item.name === 'Support' ? (
                                <a key={item.name} href={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </a>
                            ) : (
                                <Link key={item.name} to={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </Link>
                            )
                        ))}
                    </div>

                    {/* Column 4 */}
                    <div className="flex flex-col space-y-5">
                        {links.col4.map((item) => (
                            item.name === 'Contact Us' || item.name === 'Support' ? (
                                <a key={item.name} href={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </a>
                            ) : (
                                <Link key={item.name} to={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </Link>
                            )
                        ))}
                    </div>

                    {/* Column 5 */}
                    <div className="flex flex-col space-y-5">
                        {links.col5.map((item) => (
                            item.name === 'Contact Us' || item.name === 'Support' ? (
                                <a key={item.name} href={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </a>
                            ) : (
                                <Link key={item.name} to={item.to} className="text-white/80 hover:text-[#9D7CFF] transition-all duration-200 uppercase tracking-wider text-sm md:text-base font-medium font-poppins hover:translate-x-1 w-fit">
                                    {item.name}
                                </Link>
                            )
                        ))}
                    </div>
                </motion.div>

                <div className="text-center pt-16 pb-8">
                    <p className="text-[11px] md:text-[12px] text-[#CFCFEA]/40 font-poppins font-bold uppercase tracking-[0.3em]">
                        &copy; {new Date().getFullYear()} Studlyf • All Rights Reserved
                    </p>
                </div>

            </div>
        </section>
    );
};

export default DashboardFooter;

