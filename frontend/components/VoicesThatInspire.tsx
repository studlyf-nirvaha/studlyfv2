
import React from 'react';

const personalities = [
    {
        name: "Steve Jobs",
        role: "Co-founder, Apple Inc.",
        quote: "The only way to do great work is to love what you do. Don't settle. Keep looking.",
        image: "/images-optimized/steve-jobs.webp"
    },
    {
        name: "Elon Musk",
        role: "CEO, Tesla & SpaceX",
        quote: "Persistence is very important. You should not give up unless you are forced to give up.",
        image: "/images-optimized/elon-musk.webp"
    },
    {
        name: "Bill Gates",
        role: "Co-founder, Microsoft",
        quote: "Your most unhappy customers are your greatest source of learning. Success is a lousy teacher.",
        image: "/images-optimized/bill-gates.webp"
    },
    {
        name: "Warren Buffett",
        role: "CEO, Berkshire Hathaway",
        quote: "The most important investment you can make is in yourself. Knowledge builds up like interest.",
        image: "/images-optimized/warren-buffett.webp"
    },
    {
        name: "Sundar Pichai",
        role: "CEO, Google & Alphabet",
        quote: "Wear your failure as a badge of honor. It's the only way to truly innovate and grow.",
        image: "/images-optimized/sundar-pichai.webp"
    },
    {
        name: "Satya Nadella",
        role: "CEO, Microsoft",
        quote: "You've got to be a lifelong learner. Curiosity is your greatest asset in this era.",
        image: "https://www.entrepreneur.com/wp-content/uploads/sites/2/2026/02/Satya-Nadella-GettyImages-2256635134.jpg"
    },
    {
        name: "Mark Zuckerberg",
        role: "Founder & CEO, Meta",
        quote: "The biggest risk is not taking any risk. Move fast and break things to find what works.",
        image: "/images-optimized/mark-zuckerberg.webp"
    },
    {
        name: "Jeff Bezos",
        role: "Founder, Amazon",
        quote: "I knew that if I failed I wouldn't regret that, but I knew I might regret not trying.",
        image: "/images-optimized/jeff-bezos.webp"
    },
    {
        name: "Jensen Huang",
        role: "Founder & CEO, NVIDIA",
        quote: "Software is eating the world, but AI is going to eat software. Never stop being a student.",
        image: "/images-optimized/jensen-huang.webp"
    },
    {
        name: "Tim Cook",
        role: "CEO, Apple Inc.",
        quote: "The sidelines are not where you want to live your life. The world needs you in the arena.",
        image: "https://bsmedia.business-standard.com/_media/bs/img/article/2023-05/05/full/1683250404-5715.jpg"
    },
    {
        name: "Indra Nooyi",
        role: "Former CEO, PepsiCo",
        quote: "An important attribute of success is to be yourself. Never hide what makes you unique.",
        image: "https://tse2.mm.bing.net/th/id/OIP.XfO7bgtTIoIEHh_S_3PzUgHaJ3?w=1600&h=2131&rs=1&pid=ImgDetMain&o=7&rm=3"
    },
    {
        name: "Reid Hoffman",
        role: "Co-founder, LinkedIn",
        quote: "No matter how brilliant your mind, if you’re playing a solo game, you’ll lose to a team.",
        image: "https://facts.net/wp-content/uploads/2024/10/40-facts-about-reid-hoffman-1728495269.jpg"
    }
];

const QuoteCard = ({ person }: { person: typeof personalities[0] }) => (
    <div className="flex-shrink-0 w-[240px] sm:w-[260px] md:w-[280px] lg:w-[320px] aspect-[3/4.5] relative rounded-[1rem] overflow-hidden group transition-all duration-700 hover:-translate-y-2 cursor-pointer shadow-2xl snap-center">
        {/* Background Image - Color by default */}
        <img
            src={person.image}
            alt={person.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover brightness-95 transition-all duration-1000 group-hover:scale-105 group-hover:brightness-100"
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(person.name)}&background=6C4DFF&color=fff&size=512`;
            }}
        />

        {/* Bottom Gradient - High visibility for text */}
        <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/40 to-transparent z-10 opacity-90"></div>

        {/* Content Overlay */}
        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end z-20 text-white">
            <p className="text-sm md:text-base font-['Poppins'] font-medium mb-6 leading-relaxed text-white/95">
                "{person.quote}"
            </p>

            <div className="space-y-1">
                <h4 className="font-bold text-lg md:text-xl font-['Poppins'] tracking-tight">
                    {person.name}
                </h4>
                <p className="text-[10px] md:text-[11px] text-white/60 font-medium font-['Plus_Jakarta_Sans'] tracking-wider italic">
                    {person.role}
                </p>
            </div>

            {/* Minimal Brand Accent */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-[#6C4DFF] scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left"></div>
        </div>
    </div>
);

const VoicesThatInspire: React.FC = () => {
    // Triple for seamless loop
    const allPersonalities = [...personalities, ...personalities, ...personalities];

    return (
        <section className="bg-white pt-0 pb-12 md:pb-16 overflow-hidden relative">
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-100% / 3)); }
                }
                .scroll-container {
                    display: flex;
                    gap: 1.5rem;
                    width: max-content;
                    animation: scroll 60s linear infinite;
                }
                .scroll-container:hover {
                    animation-play-state: paused;
                }
                @media (max-width: 640px) {
                    .scroll-container {
                        gap: 1.25rem;
                        animation-duration: 40s;
                    }
                }
                @media (max-width: 768px) {
                    .scroll-container {
                        animation: none !important;
                        overflow-x: auto !important;
                        scroll-snap-type: x mandatory !important;
                        -webkit-overflow-scrolling: touch;
                        padding-left: 2rem !important;
                        padding-right: 2rem !important;
                        width: auto !important;
                        scrollbar-width: none;
                    }
                    .scroll-container::-webkit-scrollbar {
                        display: none;
                    }
                }
            ` }} />

            <div className="relative">
                {/* Refined Edge Blurring */}
                <div className="absolute inset-y-0 left-0 w-32 md:w-64 bg-gradient-to-r from-white via-white/20 to-transparent z-30 pointer-events-none"></div>
                <div className="absolute inset-y-0 right-0 w-32 md:w-64 bg-gradient-to-l from-white via-white/20 to-transparent z-30 pointer-events-none"></div>

                <div className="scroll-container py-4 px-4">
                    {allPersonalities.map((person, index) => (
                        <QuoteCard key={`${person.name}-${index}`} person={person} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default VoicesThatInspire;

