import React from 'react';

interface CertificateCardProps {
  recipientName?: string;
  achievementType?: string;
  eventTitle?: string;
  eventDate?: string;
  certificateId?: string;
  verificationCode?: string;
}

export default function CertificateCard({
  recipientName = 'John Doe',
  achievementType = 'Winner',
  eventTitle = 'CodeForge 2026 - Final Submission',
  certificateId = 'CERT-0001',
  verificationCode = '7F8A9D2B',
}: CertificateCardProps) {
  return (
    <div className="flex items-center justify-center p-8 bg-slate-100 min-h-screen">
      <div className="w-[600px] h-[400px] bg-[#fdfaf5] border-[3px] border-[#d4af37] p-8 relative shadow-xl flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-0 left-0 w-0 h-0 border-t-[80px] border-t-black border-r-[80px] border-r-transparent" />
        <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[80px] border-b-black border-l-[80px] border-l-transparent" />
        <div className="absolute inset-3 border border-[#d4af37] opacity-50 pointer-events-none" />

        <div className="z-10 flex flex-col items-center text-center w-full px-12">
          <h1 className="text-4xl font-serif uppercase tracking-[0.2em] text-slate-900 mb-2">Certificate</h1>
          <p className="text-xs text-slate-600 uppercase tracking-[0.3em] mb-8 font-medium">Of Achievement</p>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">This certificate is proudly presented to</p>
          <div className="w-full border-b border-slate-300 mb-6" />
          <h2 className="font-serif text-5xl italic font-bold text-slate-800 mb-4">{recipientName}</h2>
          <div className="w-full border-b border-slate-300 mb-6" />
          <p className="text-sm font-semibold tracking-wider text-slate-700 uppercase">{achievementType}</p>
          <p className="text-xs text-slate-500 mt-2">{eventTitle}</p>
        </div>

        <div className="absolute bottom-6 right-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-white border border-slate-300 grid grid-cols-3 grid-rows-3 gap-[1px] p-[2px] shadow-sm mb-1">
            <div className="bg-slate-800" /><div /><div className="bg-slate-800" />
            <div className="bg-slate-800" /><div className="bg-slate-800" /><div />
            <div /><div className="bg-slate-800" /><div className="bg-slate-800" />
          </div>
          <span className="text-[6px] text-slate-400 font-mono">{verificationCode}</span>
        </div>

        <div className="absolute bottom-6 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-600 to-yellow-700 border-2 border-yellow-300 flex items-center justify-center shadow-md shadow-yellow-900/20">
            <div className="w-12 h-12 rounded-full border border-dashed border-yellow-200 flex items-center justify-center">
              <span className="text-[8px] text-yellow-100 font-serif font-bold uppercase tracking-tighter text-center leading-tight">Official<br/>Seal</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-12 flex flex-col items-center">
          <div className="w-32 border-b border-slate-800 mb-1">
            <div className="h-6 w-full opacity-60" style={{ backgroundImage: 'radial-gradient(circle at 10% 50%, transparent 20%, #1e293b 21%, #1e293b 34%, transparent 35%, transparent)' }} />
          </div>
          <p className="text-[8px] text-slate-500 uppercase tracking-wider">Event Organizer</p>
        </div>
      </div>
    </div>
  );
}
