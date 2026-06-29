import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Upload, Briefcase, MapPin, DollarSign, Clock, CheckCircle, 
    Plus, Trash2, HelpCircle, Building, Link as LinkIcon, Edit, Eye, Save
} from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface PostJobModalProps {
    isOpen: boolean;
    onClose: () => void;
    institutionId?: string;
}

const PostJobModal: React.FC<PostJobModalProps> = ({ isOpen, onClose, institutionId }) => {
    const [step, setStep] = useState(1);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        // 1. Basic Job Info
        jobTitle: '',
        companyName: '',
        locationType: 'On-site',
        employmentType: 'Full-time',
        
        // 2. Job Description
        jobSummary: '',
        responsibilities: '',
        requirements: '',
        preferredQualifications: '',
        
        // 3. Salary & Benefits
        salaryMin: '',
        salaryMax: '',
        benefits: [] as string[],
        
        // 4. Skills
        skills: [] as string[],
        skillInput: '',
        
        // 5. Experience
        experienceLevel: 'Fresher',
        
        // 6. Application Details
        deadline: '',
        openings: 1,
        applicationMethod: 'Platform',
        externalLink: '',
        
        // 7. Screening Questions
        questions: [] as string[],
        questionInput: '',
        
        // 8. Company Details
        aboutCompany: '',
        websiteUrl: '',
        industryType: ''
    });

    const steps = [
        { id: 1, label: 'Basic Info & Description' },
        { id: 2, label: 'Salary, Skills & Experience' },
        { id: 3, label: 'Application & Company' },
        { id: 4, label: 'Review & Post' }
    ];

    const benefitsOptions = ['Health Insurance', 'Flexible Hours', 'Work From Home', 'Paid Time Off', 'Dental Insurance', 'Vision Insurance'];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAddSkill = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && formData.skillInput.trim()) {
            e.preventDefault();
            if (!formData.skills.includes(formData.skillInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    skills: [...prev.skills, prev.skillInput.trim()],
                    skillInput: ''
                }));
            }
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const toggleBenefit = (benefit: string) => {
        setFormData(prev => ({
            ...prev,
            benefits: prev.benefits.includes(benefit) 
                ? prev.benefits.filter(b => b !== benefit)
                : [...prev.benefits, benefit]
        }));
    };

    const handleAddQuestion = () => {
        if (formData.questionInput.trim()) {
            setFormData(prev => ({
                ...prev,
                questions: [...prev.questions, prev.questionInput.trim()],
                questionInput: ''
            }));
        }
    };

    const removeQuestion = (index: number) => {
        setFormData(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));
    };

    const handleNext = () => {
        if (step < steps.length) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async (isDraft = false) => {
        if (!formData.jobTitle.trim()) {
            alert("Job Title is required.");
            return;
        }
        if (!formData.companyName.trim()) {
            alert("Company Name is required.");
            return;
        }
        setLoading(true);
        try {
            // Map the modal's fields to the opportunity schema expected by MongoDB
            const payload = {
                title: formData.jobTitle,
                organization: formData.companyName,
                type: "Job",
                description: JSON.stringify({
                    summary: formData.jobSummary,
                    responsibilities: formData.responsibilities,
                    requirements: formData.requirements,
                    preferredQualifications: formData.preferredQualifications,
                    benefits: formData.benefits,
                    experienceLevel: formData.experienceLevel,
                    screeningQuestions: formData.questions,
                    aboutCompany: formData.aboutCompany,
                    industryType: formData.industryType
                }),
                skills: formData.skills.join(', '),
                location: formData.locationType,
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                institution_id: institutionId || '',
                createdBy: institutionId || '',
                status: isDraft ? 'draft' : 'active'
            };

            const response = await fetch(`${API_BASE_URL}/api/opportunities`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...authHeaders() 
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert(isDraft ? "Job Draft Saved Successfully!" : "Job Posted Successfully!");
                onClose();
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert(`Failed to save job: ${errorData.detail || response.statusText || 'Unknown Error'}`);
            }
        } catch (err) {
            try { console.error("Job submit failed", err instanceof Error ? err.message : String(err)); } catch (_) {}
            alert("Network error: Failed to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                
                <motion.div
                    initial={{ scale: 0.98, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.98, opacity: 0, y: 10 }}
                    className="relative w-full max-w-5xl bg-[#F8FAFC] rounded-[1rem] shadow-2xl overflow-hidden flex h-[90vh] font-sans"
                >
                    {/* Sidebar */}
                    <div className="w-72 bg-white border-r border-slate-200 p-8 flex flex-col shrink-0">
                        <div className="mb-10">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Briefcase className="text-[#6C3BFF]" size={24} />
                                Post a Job
                            </h3>
                        </div>

                        <div className="space-y-0 relative flex-1">
                            {steps.map((s, idx) => (
                                <div key={s.id} className="flex items-start gap-4 mb-8 relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all ${
                                        step === s.id ? 'bg-[#6C3BFF] text-white shadow-lg shadow-purple-100' : 
                                        step > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {step > s.id ? '✓' : s.id}
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <span className={`text-[13px] font-bold ${step === s.id ? 'text-[#6C3BFF]' : 'text-slate-500'}`}>Step {s.id}</span>
                                        <span className={`text-[13px] font-medium mt-0.5 ${step === s.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`absolute left-4 top-8 w-[1px] h-8 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                        <button onClick={onClose} className="absolute right-6 top-6 z-20 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-all"><X size={20} /></button>
                        <div className="h-16 bg-gradient-to-r from-[#6C3BFF] to-[#8E66FF] w-full shrink-0" />

                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            <div className="max-w-3xl mx-auto space-y-8 pb-20">
                                
                                {step === 1 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2">1. Basic Job Information</h4>
                                        
                                        <div className="flex items-center gap-8 mb-6">
                                            <label className="group relative w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-[#6C3BFF] transition-all overflow-hidden">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <Upload className="text-[#6C3BFF] mb-2" size={20} />
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Logo</span>
                                                    </>
                                                )}
                                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                            </label>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">Company Logo</p>
                                                <p className="text-xs text-slate-400 mt-1">Upload your company logo (JPG, PNG). Max 1MB.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Job Title *</label>
                                                <input type="text" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="e.g. Senior Frontend Engineer" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Company Name *</label>
                                                <input type="text" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} placeholder="e.g. Acme Corp" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Job Location Type</label>
                                                <select value={formData.locationType} onChange={e => setFormData({...formData, locationType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]">
                                                    <option>On-site</option>
                                                    <option>Remote</option>
                                                    <option>Hybrid</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Employment Type</label>
                                                <select value={formData.employmentType} onChange={e => setFormData({...formData, employmentType: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]">
                                                    <option>Full-time</option>
                                                    <option>Part-time</option>
                                                    <option>Contract</option>
                                                    <option>Temporary</option>
                                                    <option>Internship</option>
                                                </select>
                                            </div>
                                        </div>

                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2 mt-8">2. Job Description</h4>
                                        
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Job Summary</label>
                                            <textarea rows={3} value={formData.jobSummary} onChange={e => setFormData({...formData, jobSummary: e.target.value})} placeholder="Brief overview of the role..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] resize-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Responsibilities</label>
                                            <textarea rows={4} value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} placeholder="- Write clean code&#10;- Collaborate with team..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] resize-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Requirements</label>
                                            <textarea rows={3} value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} placeholder="- 3+ years experience&#10;- React proficiency..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] resize-none" />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2">3. Salary & Benefits</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Min Salary (Annual)</label>
                                                <div className="relative">
                                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input type="number" value={formData.salaryMin} onChange={e => setFormData({...formData, salaryMin: e.target.value})} placeholder="e.g. 50000" className="w-full pl-10 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Max Salary (Annual)</label>
                                                <div className="relative">
                                                    <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                                    <input type="number" value={formData.salaryMax} onChange={e => setFormData({...formData, salaryMax: e.target.value})} placeholder="e.g. 80000" className="w-full pl-10 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-4">Benefits</label>
                                            <div className="flex flex-wrap gap-3">
                                                {benefitsOptions.map(benefit => (
                                                    <button 
                                                        key={benefit} 
                                                        onClick={() => toggleBenefit(benefit)}
                                                        className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${formData.benefits.includes(benefit) ? 'bg-[#6C3BFF] text-white border-[#6C3BFF]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                                                    >
                                                        {benefit}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2 mt-8">4. Skills Required</h4>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Add Skills (Press Enter)</label>
                                            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-[#6C3BFF] flex flex-wrap gap-2">
                                                {formData.skills.map(skill => (
                                                    <span key={skill} className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-2">
                                                        {skill}
                                                        <X size={12} className="cursor-pointer text-slate-400 hover:text-red-500" onClick={() => removeSkill(skill)} />
                                                    </span>
                                                ))}
                                                <input 
                                                    type="text" 
                                                    value={formData.skillInput}
                                                    onChange={e => setFormData({...formData, skillInput: e.target.value})}
                                                    onKeyDown={handleAddSkill}
                                                    placeholder="Type a skill and press Enter"
                                                    className="flex-1 min-w-[150px] p-2 bg-transparent outline-none text-sm"
                                                />
                                            </div>
                                        </div>

                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2 mt-8">5. Experience Level</h4>
                                        <div>
                                            <select value={formData.experienceLevel} onChange={e => setFormData({...formData, experienceLevel: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]">
                                                <option>Fresher</option>
                                                <option>0–2 years</option>
                                                <option>2–5 years</option>
                                                <option>5+ years</option>
                                            </select>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2">6. Application Details</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Application Deadline</label>
                                                <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Number of Openings</label>
                                                <input type="number" min={1} value={formData.openings} onChange={e => setFormData({...formData, openings: parseInt(e.target.value) || 1})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">Application Method</label>
                                            <div className="flex gap-4 mb-4">
                                                <button onClick={() => setFormData({...formData, applicationMethod: 'Platform'})} className={`flex-1 py-3 rounded-xl border ${formData.applicationMethod === 'Platform' ? 'bg-[#6C3BFF]/10 border-[#6C3BFF] text-[#6C3BFF] font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>Apply on Platform</button>
                                                <button onClick={() => setFormData({...formData, applicationMethod: 'External'})} className={`flex-1 py-3 rounded-xl border ${formData.applicationMethod === 'External' ? 'bg-[#6C3BFF]/10 border-[#6C3BFF] text-[#6C3BFF] font-bold' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>External Link</button>
                                            </div>
                                            {formData.applicationMethod === 'External' && (
                                                <input type="url" value={formData.externalLink} onChange={e => setFormData({...formData, externalLink: e.target.value})} placeholder="https://careers.company.com" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            )}
                                        </div>

                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2 mt-8">7. Screening Questions (Optional)</h4>
                                        <div>
                                            <div className="flex gap-2 mb-4">
                                                <input type="text" value={formData.questionInput} onChange={e => setFormData({...formData, questionInput: e.target.value})} placeholder="Add a custom screening question..." className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                                <button onClick={handleAddQuestion} className="px-6 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition-all">Add</button>
                                            </div>
                                            <div className="space-y-2">
                                                {formData.questions.map((q, i) => (
                                                    <div key={i} className="flex justify-between items-center p-4 bg-white border border-slate-200 rounded-xl">
                                                        <span className="text-sm font-medium">{q}</span>
                                                        <button onClick={() => removeQuestion(i)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={16} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <h4 className="text-lg font-bold text-slate-800 border-b pb-2 mt-8">8. Company Details</h4>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-2">About Company</label>
                                            <textarea rows={4} value={formData.aboutCompany} onChange={e => setFormData({...formData, aboutCompany: e.target.value})} placeholder="Describe your company culture, mission..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF] resize-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6 mt-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Website URL</label>
                                                <input type="url" value={formData.websiteUrl} onChange={e => setFormData({...formData, websiteUrl: e.target.value})} placeholder="https://" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-2">Industry Type</label>
                                                <input type="text" value={formData.industryType} onChange={e => setFormData({...formData, industryType: e.target.value})} placeholder="e.g. Technology, Finance" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#6C3BFF]" />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 4 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="text-center mb-8">
                                            <h4 className="text-2xl font-black text-slate-800 mb-2">Review Your Job Post</h4>
                                            <p className="text-slate-500">Make sure everything looks good before publishing.</p>
                                        </div>

                                        <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 space-y-6">
                                            <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-xl object-cover" />
                                                ) : (
                                                    <div className="w-16 h-16 bg-slate-200 rounded-xl flex items-center justify-center text-slate-400"><Building size={24} /></div>
                                                )}
                                                <div>
                                                    <h2 className="text-xl font-bold text-slate-900">{formData.jobTitle || 'Job Title Not Set'}</h2>
                                                    <p className="text-slate-600 font-medium">{formData.companyName || 'Company Not Set'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Location</p>
                                                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1"><MapPin size={14}/> {formData.locationType}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Type</p>
                                                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1"><Briefcase size={14}/> {formData.employmentType}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Experience</p>
                                                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1"><Clock size={14}/> {formData.experienceLevel}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 font-bold uppercase mb-1">Salary Range</p>
                                                    <p className="text-sm font-medium text-slate-800 flex items-center gap-1"><DollarSign size={14}/> {formData.salaryMin && formData.salaryMax ? `$${formData.salaryMin} - $${formData.salaryMax}` : 'Not Specified'}</p>
                                                </div>
                                            </div>

                                            <div>
                                                <h5 className="text-sm font-bold text-slate-800 mb-2">Job Summary</h5>
                                                <p className="text-sm text-slate-600">{formData.jobSummary || 'No summary provided.'}</p>
                                            </div>
                                            
                                            {formData.skills.length > 0 && (
                                                <div>
                                                    <h5 className="text-sm font-bold text-slate-800 mb-2">Skills Required</h5>
                                                    <div className="flex gap-2 flex-wrap">
                                                        {formData.skills.map(s => <span key={s} className="px-3 py-1 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold">{s}</span>)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Navigation */}
                        <div className="border-t border-slate-200 p-6 bg-white flex justify-between items-center z-10 shrink-0">
                            {step > 1 ? (
                                <button onClick={handlePrev} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all">Back</button>
                            ) : (
                                <div></div>
                            )}
                            
                            <div className="flex gap-4">
                                <button onClick={() => handleSubmit(true)} className="px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2">
                                    <Save size={16} /> Save Draft
                                </button>
                                {step < steps.length ? (
                                    <button onClick={handleNext} className="px-8 py-3 bg-[#6C3BFF] text-white font-bold rounded-xl hover:bg-[#5B21B6] transition-all shadow-lg shadow-purple-200">
                                        Next Step
                                    </button>
                                ) : (
                                    <button onClick={() => handleSubmit()} disabled={loading} className="px-8 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2">
                                        {loading ? 'Posting...' : <><CheckCircle size={18} /> Post Job</>}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default PostJobModal;

