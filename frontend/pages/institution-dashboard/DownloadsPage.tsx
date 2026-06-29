import React, { useState } from 'react';
import { 
    Download, 
    FileText, 
    Users, 
    Trophy, 
    ArrowRight, 
    CheckCircle, 
    Loader2 
} from 'lucide-react';
import { API_BASE_URL } from '../../apiConfig';

interface DownloadsPageProps {
    onNavigate: (tab: string) => void;
    institutionId?: string;
}

const DownloadsPage: React.FC<DownloadsPageProps> = ({ onNavigate }) => {
    const [loading, setLoading] = useState<string | null>(null);

    const downloadFiles = [
        {
            id: 'executive-summary',
            title: 'Executive Summary',
            description: 'Comprehensive overview of all event metrics, participation, and key outcomes.',
            format: 'CSV',
            icon: <FileText className="w-6 h-6 text-blue-500" />,
            endpoint: '/api/v1/institution/export-summary'
        },
        {
            id: 'final-standings',
            title: 'Final Standings',
            description: 'Official ranking of all participants and teams with detailed score breakdown.',
            format: 'PDF',
            icon: <Trophy className="w-6 h-6 text-yellow-500" />,
            endpoint: '/api/v1/institution/leaderboard/ALL/export-pdf' // Assuming a bulk export endpoint
        },
        {
            id: 'participant-roster',
            title: 'Participant Roster',
            description: 'Complete list of all registered participants, their teams, and registration details.',
            format: 'CSV',
            icon: <Users className="w-6 h-6 text-green-500" />,
            endpoint: '/api/v1/institution/export-participants'
        }
    ];

    const handleDownload = async (file: typeof downloadFiles[0]) => {
        setLoading(file.id);
        try {
            // Simulate/Trigger download
            window.open(`${API_BASE_URL}${file.endpoint}`, '_blank');
            // We use window.open for simplicity in this demo, but typically would be a fetch blob
        } catch (error) {
            try { console.error("Download failed", error instanceof Error ? error.message : String(error)); } catch (_) {}
        } finally {
            setTimeout(() => setLoading(null), 2000);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Report Downloads</h1>
                    <p className="text-slate-500 mt-2">Export your institutional data into professional formats for offline analysis.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {downloadFiles.map((file) => (
                    <div 
                        key={file.id} 
                        className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            {file.icon}
                        </div>
                        
                        <h3 className="text-xl font-bold text-slate-900 mb-3">{file.title}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8 h-12 overflow-hidden">
                            {file.description}
                        </p>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 uppercase tracking-wider">
                                {file.format}
                            </span>
                            
                            <button 
                                onClick={() => handleDownload(file)}
                                disabled={loading === file.id}
                                className={`flex items-center gap-2 font-bold text-sm transition-all ${
                                    loading === file.id ? 'text-green-500' : 'text-blue-600 hover:gap-3'
                                }`}
                            >
                                {loading === file.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Preparing...
                                    </>
                                ) : (
                                    <>
                                        Download <Download className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Export Tips */}
            <div className="bg-slate-900 rounded-[2rem] p-10 text-white overflow-hidden relative">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="max-w-xl">
                        <h2 className="text-2xl font-bold mb-4">Need Custom Reports?</h2>
                        <p className="text-slate-400 leading-relaxed">
                            Our integration engine can generate custom data exports for specific events, time ranges, or departments. Use the Reports tab to filter your data before exporting.
                        </p>
                    </div>
                    <button 
                        onClick={() => onNavigate('analytics')}
                        className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold hover:bg-blue-500 hover:text-white transition-all flex items-center gap-3 group whitespace-nowrap"
                    >
                        Go to Analytics <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
            </div>
        </div>
    );
};

export default DownloadsPage;

