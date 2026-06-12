import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Star } from 'lucide-react';

const testimonials = [
    {
        name: "Pantham Bhavya",
        college: "Sridevi women's engineering college",
        course: "UI / UX DESIGN",
        text: "The sessions felt practical and easy to follow, and I could see my confidence grow with every project.",
        rating: 5,
        bgColor: "bg-purple-50"
    },
    {
        name: "Vadla Sudhasri",
        college: "Stanley women's college",
        course: "JAVA FULL STACK",
        text: "The guidance was consistent and the doubt-clearing support made the learning experience very smooth.",
        rating: 5,
        bgColor: "bg-indigo-50"
    },
    {
        name: "Ginuguntla Likhitha",
        college: "BVRIT",
        course: "DATA ANALYTICS",
        text: "I liked how the classes mixed concepts with hands-on work. It made every topic easy to understand.",
        rating: 5,
        bgColor: "bg-blue-50"
    },
    {
        name: "Sajja Dhruwallika",
        college: "CBIT",
        course: "CLOUD COMPUTING",
        text: "The platform and mentor support helped me stay consistent and finish projects with confidence.",
        rating: 4,
        bgColor: "bg-rose-50"
    },
    {
        name: "Modaboina Tejaswi",
        college: "Vasavi college of Engineering",
        course: "AI / ML",
        text: "The training style was simple, effective, and very motivating. I could actually apply what I learned.",
        rating: 5,
        bgColor: "bg-emerald-50"
    },
    {
        name: "Vishnu Vardhan",
        college: "Vasavi College of Engineering",
        course: "WEB DEVELOPMENT",
        text: "The training and project exposure here are top-notch. Trainer is really helpful and clearing the doubts till course end!",
        rating: 5,
        bgColor: "bg-blue-50"
    },
    {
        name: "Vivek Goud Adula",
        college: "JBIT",
        course: "AI Engineer",
        text: "Training and doubt clarification were excellent. Mic access during class would help clear doubts more effectively.",
        rating: 5,
        bgColor: "bg-blue-50"
    },
    {
        name: "Purushotham",
        course: "SERVICENOW",
        text: "Rakesh is teaching very well, patiently clearing every doubt. I also learned communication skills from him.",
        rating: 4,
        bgColor: "bg-rose-50"
    },
    {
        name: "Anusha Goud",
        course: "FULL STACK DEVELOPMENT",
        text: "The curriculum is very industry-aligned. I feel much more confident in my coding skills now.",
        rating: 5,
        bgColor: "bg-emerald-50"
    },
    {
        name: "Kiran Kumar",
        course: "CYBER SECURITY",
        text: "Excellent hands-on labs. The mentors really know their stuff and guide us through complex scenarios.",
        rating: 4,
        bgColor: "bg-amber-50"
    }
];


const TestimonialCard = ({ testimonial, index }: { testimonial: typeof testimonials[0], index: number }) => {
    const x = useSpring(0, { stiffness: 300, damping: 30 });
    const y = useSpring(0, { stiffness: 300, damping: 30 });

    const rotateX = useTransform(y, [-100, 100], [10, -10]);
    const rotateY = useTransform(x, [-100, 100], [-10, 10]);

    function handleMouse(event: React.MouseEvent<HTMLDivElement>) {
        const rect = event.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set(event.clientX - centerX);
        y.set(event.clientY - centerY);
    }

    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }

    const bgColors = [
        "bg-[#6C3BFF]", // Purple
        "bg-[#9D7CFF]", // Violet
        "bg-[#C5B6FF]"  // Light
    ];

    return (
        <motion.div
            className="relative group cursor-pointer perspective-1000 shrink-0"
            style={{ zIndex: 10 }}
            whileHover={{
                scale: 1.05,
                zIndex: 100,
                transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
            onMouseMove={handleMouse}
            onMouseLeave={handleMouseLeave}
        >
            {/* Pop-out Background Card 1 (Always visible, expands on hover) */}
            <motion.div
                className={`absolute inset-0 ${bgColors[index % 3]} rounded-[2rem] opacity-20 transition-all duration-500`}
                initial={{ rotate: -8, x: -15, scale: 0.95 }}
                whileHover={{
                    rotate: -15,
                    x: -30,
                    scale: 0.98,
                    opacity: 0.4,
                    transition: { type: "spring", stiffness: 200, damping: 15 }
                }}
            />
            {/* Pop-out Background Card 2 (Always visible, expands on hover) */}
            <motion.div
                className={`absolute inset-0 ${bgColors[(index + 1) % 3]} rounded-[2rem] opacity-15 transition-all duration-500`}
                initial={{ rotate: 8, x: 15, scale: 0.95 }}
                whileHover={{
                    rotate: 15,
                    x: 30,
                    scale: 0.98,
                    opacity: 0.3,
                    transition: { type: "spring", stiffness: 200, damping: 15 }
                }}
            />

            <motion.div
                className={`relative w-[280px] sm:w-80 md:w-96 min-h-[320px] md:min-h-[380px] flex flex-col p-6 md:p-8 rounded-[2rem] ${testimonial.bgColor || 'bg-white'} border border-gray-100 backdrop-blur-xl overflow-hidden shadow-2xl`}
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d"
                }}
            >
                {/* Glow Border */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[#9D7CFF]/50 rounded-[2rem] transition-colors duration-500 pointer-events-none" />

                {/* Rating */}
                <div className="flex justify-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            size={18}
                            className={`${i < testimonial.rating ? 'text-[#111827]' : 'text-gray-200'} group-hover:text-[#9D7CFF] transition-colors duration-300 drop-shadow-[0_0_8px_rgba(157,124,255,0)] group-hover:drop-shadow-[0_0_8px_rgba(157,124,255,0.8)] fill-current`}
                        />
                    ))}
                </div>

                {/* Text Content */}
                <div className="text-center space-y-6 flex-grow flex flex-col justify-center">
                    <p className="text-[#4B5563] font-poppins font-normal md:font-medium text-lg leading-relaxed">
                        "{testimonial.text}"
                    </p>
                </div>

                <div className="pt-4 text-center mt-auto">
                    <h4 className="text-[#111827] font-poppins font-semibold text-xl">
                        {testimonial.name}
                    </h4>
                    <p className="text-[#6C3BFF] font-poppins font-medium text-sm tracking-widest uppercase mt-1">
                        {testimonial.course}
                    </p>
                </div>

                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#6C3BFF]/5 via-transparent to-transparent pointer-events-none" />
            </motion.div>
        </motion.div>
    );
};

const Testimonials: React.FC = () => {
    const sectionRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    const translateY = useTransform(scrollYProgress, [0, 0.2], [30, 0]);
    const opacity = useTransform(scrollYProgress, [0, 0.2], [0, 1]);

    // Double for marquee
    const marqueeData = [...testimonials, ...testimonials];

    return (
        <section
            ref={sectionRef}
            className="w-full bg-white py-12 px-4 overflow-hidden relative"
            id="testimonials"
        >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#6C3BFF]/5 rounded-full blur-[150px] pointer-events-none" />

            <div className="max-w-[1600px] mx-auto flex flex-col items-center">
                {/* Heading */}
                <motion.div
                    style={{ translateY, opacity }}
                    className="text-center mb-12"
                >
                    <h2 className="text-xl md:text-2xl lg:text-4xl font-bold text-[#111827] font-poppins max-w-5xl leading-[1.2] mx-auto">
                        <motion.span
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            transition={{ staggerChildren: 0.05 }}
                            className="block"
                        >
                            {"See how learners like you ".split(" ").map((word, i) => (
                                <motion.span key={i} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="inline-block mr-[0.2em]">{word}</motion.span>
                            ))}
                            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B]">landed</motion.span>
                        </motion.span>

                        <motion.span
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            transition={{ staggerChildren: 0.05, delayChildren: 0.4 }}
                            className="block"
                        >
                            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-[#6C4DFF] via-[#EC4899] to-[#FF5B5B] mr-[0.2em]">jobs,</motion.span>
                            {"built skills, and changed their ".split(" ").map((word, i) => (
                                <motion.span key={i} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="inline-block mr-[0.2em]">{word}</motion.span>
                            ))}
                        </motion.span>

                        <motion.span
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            transition={{ staggerChildren: 0.05, delayChildren: 0.8 }}
                            className="block"
                        >
                            <motion.span variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="inline-block">lives.</motion.span>
                        </motion.span>
                    </h2>
                </motion.div>

                {/* Marquee Container */}
                <div className="w-full relative py-10 overflow-hidden">
                    <motion.div
                        className="flex gap-4 md:gap-8"
                        animate={{ x: ["0%", "-50%"] }}
                        transition={{
                            duration: 45,
                            repeat: Infinity,
                            ease: "linear",
                            repeatType: "loop"
                        }}
                        style={{ width: "fit-content" }}
                    >
                        {marqueeData.map((test, idx) => (
                            <TestimonialCard
                                key={idx}
                                testimonial={test}
                                index={idx % 5}
                            />
                        ))}
                    </motion.div>

                    {/* Faded edges for better premium look */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-20 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-20 pointer-events-none" />
                </div>
            </div>

            <style>{`
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </section>
    );
};

export default Testimonials;

