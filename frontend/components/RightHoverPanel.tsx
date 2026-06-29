import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const items = [
  { key: 'home', label: 'Home', route: '/', icon: '🏠' },
  { key: 'learn', label: 'Learn', route: '/learn/courses-overview', icon: '📚' },
  { key: 'jobs', label: 'Jobs', route: '/opportunities', icon: '💼' },
  { key: 'sign-in', label: 'Sign In', route: '/login', icon: '🔐' },
  { key: 'get', label: 'Get Studlyf', route: '/signup', icon: '✨' },
  { key: 'blog', label: 'Blog', route: '/blog', icon: '📝' },
  { key: 'about', label: 'About', route: '/about', icon: 'ℹ️' },
  { key: 'ai', label: 'AI', route: '/ai-tools', icon: '🤖' },
];

const RightHoverPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [rotation, setRotation] = useState(0); // degrees
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const navigate = useNavigate();
  const handleRef = React.useRef<HTMLButtonElement | null>(null);

  const positions = useMemo(() => {
    const radius = 96; // distance from center
    const angleStep = (Math.PI * 2) / items.length;
    return items.map((_, i) => {
      const angle = -Math.PI / 2 + i * angleStep; // start at top
      return {
        left: Math.round(Math.cos(angle) * radius),
        top: Math.round(Math.sin(angle) * radius),
      };
    });
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop || document.body.scrollTop || 0;
      const scrollHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight;
      const progress = scrollHeight > 0 ? Math.min(1, Math.max(0, scrollTop / scrollHeight)) : 0;

      // rotation in degrees: map progress 0..1 to 0..360
      const deg = progress * 360;
      setRotation(deg);

      // determine active index based on progress
      const idx = Math.min(items.length - 1, Math.floor(progress * items.length));
      setActiveIdx(idx);
    };

    // Run once to initialize
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
  }, [open]);

  const openGuide = () => {
    if (menuMounted) return;
    setOpen(true);
    setMenuMounted(true);
    setMenuClosing(true);
    window.requestAnimationFrame(() => setMenuClosing(false));
  };

  const closeGuide = (callback?: () => void) => {
    if (!menuMounted) return;
    setMenuClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setMenuMounted(false);
      setMenuClosing(false);
      handleRef.current?.focus();
      callback?.();
    }, 220);
  };

  return (
    <div className="relative w-full pointer-events-auto">
      {/* Always-visible fixed handle for the guide when closed */}
      {!open && (
        <button
          ref={handleRef}
          aria-label="Open guide"
          className={`fixed right-4 bottom-5 z-[99999] flex items-center justify-center w-12 h-28 rounded-full bg-gradient-to-b from-purple-700 to-indigo-600 shadow-2xl text-white transition-all duration-500 ease-out cursor-pointer ${menuMounted ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100 pointer-events-auto hover:scale-105'}`}
        >
          <div className="rotate-90 tracking-wide text-sm">GUIDE</div>
        </button>
      )}

      {/* Expanded menu as fixed overlay when open (ensures it appears where user clicked) */}
      {menuMounted && (
        <>
          {/* backdrop to capture outside clicks and close the menu */}
          <div
            className={`fixed inset-0 z-[9998] bg-black/10 transition-opacity duration-500 ease-out ${menuClosing ? 'opacity-0' : 'opacity-100'}`}
            aria-hidden
          />
          <div className={`fixed right-4 bottom-5 z-[9999] transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)] ${menuClosing ? 'opacity-0 scale-90 translate-y-8' : 'opacity-100 scale-100 translate-y-0'}`}>
          <style>{`
        @keyframes floatBob { 0% { transform: translateY(0);} 50% { transform: translateY(-6px);} 100% { transform: translateY(0);} }
        @keyframes pulseRing { 0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.6);} 70% { box-shadow: 0 0 0 18px rgba(124,58,237,0);} 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0);} }
      `}</style>
          {/* Expanded circular menu */}
          <div className="relative w-[260px] h-[260px]">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#5b21b6]/90 to-[#7c3aed]/80 shadow-2xl backdrop-blur-md flex items-center justify-center">
              <div className="relative flex flex-col items-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(.16,1,.3,1)]">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-xl font-semibold"
                  style={{ animation: 'floatBob 3s ease-in-out infinite' }}
                >
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-2xl">🤖</div>
                </div>

                <div className="absolute -inset-1 rounded-full" style={{ animation: 'pulseRing 2.8s ease-out infinite' }} />

                <div className="mt-4 px-3 py-1 bg-white/10 text-white text-xs rounded-xl">PICK A PAGE</div>
              </div>
            </div>

            {/* close button placed outside decorative layer so it receives clicks */}
            <button
              aria-label="Close guide"
              title="Close"
              className="absolute z-50 flex items-center justify-center w-9 h-9 rounded-full bg-pink-500 text-white shadow-lg transition-transform duration-300 hover:scale-110"
              style={{ top: 8, right: 8 }}
            >
              <span style={{ lineHeight: 0 }}>×</span>
            </button>

            {/* Items around with staggered transitions */}
            <div
              className="absolute inset-0 pointer-events-auto"
              style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 120ms linear' }}
            >
              {items.map((it, idx) => {
                const isActive = activeIdx === idx;
                return (
                  <button
                      key={it.key}
                      onClick={(e) => {
                          e.stopPropagation();
                          // Close the circle immediately so the bar returns
                          closeGuide(() => {
                            if (it.route && it.route !== '#') navigate(it.route);
                          });
                          // Navigate after a short delay so the user sees the bar
                        }}
                    style={{
                      left: `calc(50% + ${positions[idx].left}px)` ,
                      top: `calc(50% + ${positions[idx].top}px)`,
                      transform: 'translate(-50%, -50%)',
                      transition: `transform 520ms cubic-bezier(.16,1,.3,1) ${idx * 55}ms, opacity 360ms ${idx * 35}ms`,
                      opacity: menuClosing ? 0 : 1,
                    }}
                    className={`absolute w-12 h-12 rounded-full bg-white/10 text-white backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-110 focus:outline-none cursor-pointer z-50 ${isActive ? 'ring-2 ring-white/60 scale-110' : ''}`}
                    title={it.label}
                  >
                    <span className="text-lg leading-none">{it.icon}</span>
                    <span className="sr-only">{it.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </>
      )}
      <div style={{ position: 'sticky', top: 160 }} className="flex justify-end pr-6 z-50" />
    </div>
  );
};

export default RightHoverPanel;

