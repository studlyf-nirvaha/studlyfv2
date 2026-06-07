import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Lock,
  Eye,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";

interface TermsAndConditions {
  onClose: () => void;
}

const SECTIONS = [
  {
    id: "usage",
    icon: FileText,
    title: "Acceptable Use",
    color: "from-purple-500 to-violet-600",
    bg: "bg-purple-50",
    iconColor: "text-purple-600",
    content:
      "You agree to use this platform solely for lawful purposes. You must not misuse, reverse-engineer, or exploit any part of our system in ways that violate applicable law or our community guidelines.",
  },
  {
    id: "privacy",
    icon: Lock,
    title: "Privacy & Data",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
    content:
      "We collect minimal data required for operation. Your information is encrypted end-to-end and never sold to third parties. You retain full ownership of content you create on our platform.",
  },
  {
    id: "visibility",
    icon: Eye,
    title: "Transparency",
    color: "from-cyan-500 to-teal-500",
    bg: "bg-cyan-50",
    iconColor: "text-cyan-600",
    content:
      "We are committed to clarity in how our AI systems operate. Our decision-making logic is auditable and we publish regular transparency reports to keep users informed.",
  },
  {
    id: "updates",
    icon: RefreshCw,
    title: "Policy Updates",
    color: "from-violet-500 to-purple-600",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    content:
      "We may update these terms periodically. Significant changes will be communicated via email and in-app notification at least 14 days in advance. Continued use implies acceptance.",
  },
];

const TermsAndConditions: React.FC<TermsAndConditions> = ({ onClose }) => {
  const [accepted, setAccepted] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: "rgba(10, 5, 30, 0.75)", backdropFilter: "blur(12px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 24 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-6xl max-h-[95vh] overflow-hidden rounded-[2rem] shadow-2xl flex flex-col lg:flex-row"
        style={{
          background: "linear-gradient(135deg, #fafbff 0%, #f3f0ff 40%, #eaf6ff 100%)",
        }}
      >
        {/* ── Ambient orbs ── */}
        <div
          className="pointer-events-none absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)", filter: "blur(60px)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-24 w-80 h-80 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #67e8f9 0%, transparent 70%)", filter: "blur(50px)" }}
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 65%)", filter: "blur(80px)" }}
        />

        {/* ── Close button ── */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute top-5 right-5 z-30 p-2 rounded-xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-md text-gray-500 hover:text-gray-800"
        >
          <X size={18} />
        </motion.button>

        {/* ══════════════════════════════
            LEFT PANEL
        ══════════════════════════════ */}
        <div className="relative z-10 flex flex-col justify-between w-full lg:w-[52%] px-7 py-8 sm:px-10 sm:py-10 overflow-y-auto"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: "#c4b5fd #f5f3ff",
          }}
        >
          {/* Back button */}
          <motion.button
            onClick={onClose}
            whileHover={{ x: -3 }}
            className="flex items-center gap-2 text-sm text-purple-600 font-medium mb-8 w-fit group"
          >
            <span className="p-1.5 rounded-lg bg-purple-100 group-hover:bg-purple-200 transition-colors">
              <ArrowLeft size={14} />
            </span>
            Back to app
          </motion.button>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-5 w-fit"
            style={{
              background: "linear-gradient(90deg, #ede9fe, #dbeafe)",
              color: "#5b21b6",
              border: "1px solid #c4b5fd",
            }}
          >
            <ShieldCheck size={13} />
            SECURE · TRUSTED · TRANSPARENT
          </motion.div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-5"
          >
            <h1
              className="text-5xl sm:text-6xl font-black leading-[1.05] tracking-tight text-gray-900"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Terms &<br />
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(135deg, #7c3aed, #3b82f6, #06b6d4)" }}
              >
                Conditions
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-gray-500 text-[15px] leading-relaxed mb-8 max-w-md"
          >
            Before using our AI platform, please review our commitments to you.
            These terms govern how we protect your data, your rights, and your experience.
          </motion.p>

          {/* Sections */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-3 mb-8"
          >
            {SECTIONS.map((section, i) => {
              const Icon = section.icon;
              const isOpen = activeSection === section.id;
              return (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.07 }}
                  onClick={() => setActiveSection(isOpen ? null : section.id)}
                  className="cursor-pointer rounded-2xl border bg-white/70 backdrop-blur-sm overflow-hidden group transition-all duration-200 hover:shadow-md hover:border-purple-200"
                  style={{ border: isOpen ? "1px solid #c4b5fd" : "1px solid #e9e7f5" }}
                >
                  <div className="flex items-center gap-3.5 p-4">
                    <div className={`p-2.5 rounded-xl ${section.bg} ${section.iconColor} flex-shrink-0`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">{section.title}</p>
                      {!isOpen && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{section.content.substring(0, 55)}…</p>
                      )}
                    </div>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      className="text-gray-400 flex-shrink-0 text-xs"
                    >
                      ▾
                    </motion.span>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="px-4 pb-4 text-[13px] text-gray-500 leading-relaxed border-t border-purple-100 pt-3">
                          {section.content}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Accept checkbox */}
          <motion.label
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="flex items-start gap-3 cursor-pointer mb-7 group"
          >
            <div
              onClick={() => setAccepted(!accepted)}
              className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 border-2 flex items-center justify-center transition-all duration-200 ${
                accepted
                  ? "bg-purple-600 border-purple-600"
                  : "border-gray-300 bg-white group-hover:border-purple-400"
              }`}
            >
              {accepted && <CheckCircle2 size={13} className="text-white" />}
            </div>
            <span className="text-sm text-gray-500 leading-snug">
              I have read and agree to the{" "}
              <span className="text-purple-600 font-medium underline underline-offset-2 cursor-pointer">
                Terms & Conditions
              </span>{" "}
              and{" "}
              <span className="text-purple-600 font-medium underline underline-offset-2 cursor-pointer">
                Privacy Policy
              </span>
            </span>
          </motion.label>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-wrap gap-3"
          >
            <motion.button
              whileHover={{ scale: accepted ? 1.03 : 1, y: accepted ? -1 : 0 }}
              whileTap={{ scale: accepted ? 0.97 : 1 }}
              disabled={!accepted}
              className="px-7 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg transition-all duration-200"
              style={{
                background: accepted
                  ? "linear-gradient(135deg, #7c3aed, #3b82f6)"
                  : "#d1d5db",
                boxShadow: accepted ? "0 8px 24px -4px rgba(124,58,237,0.4)" : "none",
                cursor: accepted ? "pointer" : "not-allowed",
              }}
            >
              {accepted ? "✓ Accept & Continue" : "Accept Terms"}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className="px-7 py-3 rounded-2xl text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 transition-colors"
            >
              Read Full Policy
            </motion.button>
          </motion.div>
        </div>

        {/* ══════════════════════════════
            RIGHT PANEL — abstract visual
        ══════════════════════════════ */}
        <div className="hidden lg:flex relative w-[48%] items-center justify-center overflow-hidden">
          {/* Rich gradient backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(145deg, #6d28d9 0%, #4f46e5 35%, #0ea5e9 70%, #06b6d4 100%)",
            }}
          />

          {/* Mesh-like grid overlay */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Floating blobs */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 7, repeat: Infinity }}
            className="absolute top-[-60px] right-[-60px] w-72 h-72 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(167,139,250,0.6), transparent 70%)" }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.45, 0.2] }}
            transition={{ duration: 9, repeat: Infinity, delay: 2 }}
            className="absolute bottom-[-40px] left-[-40px] w-64 h-64 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(103,232,249,0.55), transparent 70%)" }}
          />

          {/* ─── Central glass orb ─── */}
          <div className="relative flex items-center justify-center">
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute w-72 h-72 rounded-full"
              style={{
                border: "1px dashed rgba(255,255,255,0.25)",
              }}
            />
            {/* Second ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute w-52 h-52 rounded-full"
              style={{
                border: "1px dashed rgba(255,255,255,0.2)",
              }}
            />

            {/* Main glass card */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="relative w-48 h-48 rounded-[36px] flex flex-col items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.35)",
                boxShadow: "0 32px 64px rgba(0,0,0,0.2), inset 0 1px 1px rgba(255,255,255,0.4)",
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
                style={{
                  background: "rgba(255,255,255,0.25)",
                  border: "1px solid rgba(255,255,255,0.4)",
                }}
              >
                <ShieldCheck size={32} className="text-white" />
              </div>
              <p className="text-white font-bold text-base tracking-tight">Secure Access</p>
              <div className="mt-2 flex gap-1.5">
                <div className="w-8 h-1.5 rounded-full bg-white/40" />
                <div className="w-5 h-1.5 rounded-full bg-white/25" />
              </div>
            </motion.div>

            {/* Orbiting dot 1 */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute w-72 h-72"
              style={{ transformOrigin: "center" }}
            >
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-cyan-300 shadow-lg"
                style={{ boxShadow: "0 0 12px rgba(103,232,249,0.8)" }}
              />
            </motion.div>

            {/* Orbiting dot 2 */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
              className="absolute w-52 h-52"
              style={{ transformOrigin: "center" }}
            >
              <div
                className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-violet-300"
                style={{ boxShadow: "0 0 10px rgba(196,167,255,0.8)" }}
              />
            </motion.div>
          </div>

          {/* ─── Floating mini-cards ─── */}
          {/* Top-left card */}
          <motion.div
            animate={{ y: [0, -12, 0], x: [0, 4, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-16 left-10 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-cyan-200" />
              <span className="text-white text-xs font-semibold tracking-wide">AES-256 Encrypted</span>
            </div>
            <div className="mt-2 flex gap-1">
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.18 }}
                  className="w-1.5 h-4 rounded-sm bg-cyan-300/60"
                />
              ))}
            </div>
          </motion.div>

          {/* Bottom-right card */}
          <motion.div
            animate={{ y: [0, 10, 0], x: [0, -4, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-20 right-10 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <CheckCircle2 size={14} className="text-green-300" />
              <span className="text-white text-xs font-semibold">Compliance Ready</span>
            </div>
            <div className="flex gap-1.5">
              {["GDPR", "SOC2", "ISO"].map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                  style={{ background: "rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.9)" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Top-right small dot cluster */}
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute top-10 right-16 flex flex-col gap-1.5"
          >
            {[3, 5, 3].map((count, row) => (
              <div key={row} className="flex gap-1.5">
                {[...Array(count)].map((_, col) => (
                  <div
                    key={col}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.4)" }}
                  />
                ))}
              </div>
            ))}
          </motion.div>

          {/* Bottom-left stat pill */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-12 left-12 flex items-center gap-2.5 px-4 py-2.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white text-xs font-semibold tracking-wide">99.9% Uptime SLA</span>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default TermsAndConditions;