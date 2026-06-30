import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    X, Upload, GraduationCap, MapPin, DollarSign, Clock, CheckCircle, 
    Plus, Trash2, Building, Link as LinkIcon, Edit, Eye, Save,
    Calendar, Users, FileText, Phone, Mail, Globe, Award, ListChecks
} from 'lucide-react';
import { API_BASE_URL, authHeaders } from '../../apiConfig';

interface PostInternshipModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    institutionId?: string;
}

const PostInternshipModal: React.FC<PostInternshipModalProps> = ({ isOpen, onClose, onSuccess, institutionId }) => {
    const [step, setStep] = useState(1);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        // 1. Internship Basic Details
        title: '',
        category: '',
        type: '',
        duration: '',
        startDate: '',
        location: '',

        // 2. Organization Details
        organizationName: '',
        aboutOrganization: '',
        websiteLink: '',
        
        // 3. Internship Description
        description: '',
        responsibilities: '',
        learningOutcomes: '',
        requiredSkills: [] as string[],
        skillInput: '',
        preferredSkills: '',
        
        // 4. Eligibility Criteria
        eligibleCourses: [] as string[],
        courseInput: '',
        branches: [] as string[],
        branchInput: '',
        minCGPA: '',
        yearOfStudy: '2nd Year',
        
        // 5. Stipend & Perks
        stipendType: 'Paid',
        stipendAmount: '',
        perks: [] as string[],
        
        // 6. Application Details
        deadline: '',
        openings: '',
        selectionProcess: '',
        
        // 7. Attachments (Mock handling)
        attachmentName: '',
        
        // 8. Recruiter Details
        contactPerson: '',
        email: '',
        phone: '',
        
        // 9. Visibility & Application Method
        visibility: 'All',
        applicationMethod: 'Platform',
        externalLink: ''
    });

    const steps = [
        { id: 1, label: 'Basic & Organization' },
        { id: 2, label: 'Description & Skills' },
        { id: 3, label: 'Eligibility & Application' },
        { id: 4, label: 'Stipend & Perks' },
        { id: 5, label: 'Recruiter & Visibility' },
        { id: 6, label: 'Review & Publish' }
    ];

    const perksOptions = ['Certificate', 'PPO Opportunity', 'Flexible Hours', 'Letter of Recommendation', 'Informal Dress Code', 'Free Snacks'];
    const courseOptions = ['B.Tech', 'M.Tech', 'MBA', 'BCA', 'MCA', 'B.Sc', 'M.Sc', 'B.Com'];
    const branchOptions = ['CSE', 'ECE', 'EEE', 'Mechanical', 'Civil', 'IT', 'Finance', 'Marketing'];
    const categoryOptions = ['IT', 'Marketing', 'Design', 'Finance', 'Operations', 'HR', 'Business Development'];

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
            if (!formData.requiredSkills.includes(formData.skillInput.trim())) {
                setFormData(prev => ({
                    ...prev,
                    requiredSkills: [...prev.requiredSkills, prev.skillInput.trim()],
                    skillInput: ''
                }));
            }
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            requiredSkills: prev.requiredSkills.filter(skill => skill !== skillToRemove)
        }));
    };

    const toggleArrayItem = (field: 'perks' | 'eligibleCourses' | 'branches', item: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: prev[field].includes(item) 
                ? prev[field].filter(i => i !== item)
                : [...prev[field], item]
        }));
    };

    const handleNext = () => {
        if (step < steps.length) setStep(step + 1);
    };

    const handlePrev = () => {
        if (step > 1) setStep(step - 1);
    };

    const handleSubmit = async (isDraft = false) => {
        if (!formData.title.trim()) {
            alert("Internship Title is required.");
            return;
        }
        setLoading(true);
        try {
            // Map the modal's fields to the opportunity schema expected by MongoDB
            const payload = {
                title: formData.title,
                organization: formData.organizationName,
                type: "Internship",
                description: JSON.stringify({
                    category: formData.category,
                    duration: formData.duration,
                    startDate: formData.startDate,
                    aboutOrganization: formData.aboutOrganization,
                    websiteLink: formData.websiteLink,
                    description: formData.description,
                    responsibilities: formData.responsibilities,
                    learningOutcomes: formData.learningOutcomes,
                    preferredSkills: formData.preferredSkills,
                    eligibleCourses: formData.eligibleCourses,
                    branches: formData.branches,
                    minCGPA: formData.minCGPA,
                    yearOfStudy: formData.yearOfStudy,
                    stipendType: formData.stipendType,
                    stipendAmount: formData.stipendAmount,
                    perks: formData.perks,
                    openings: formData.openings,
                    selectionProcess: formData.selectionProcess,
                    contactPerson: formData.contactPerson,
                    email: formData.email,
                    phone: formData.phone,
                    visibility: formData.visibility,
                    applicationMethod: formData.applicationMethod,
                    externalLink: formData.externalLink
                }),
                skills: formData.requiredSkills.join(', '),
                location: formData.location || 'Remote',
                deadline: formData.deadline ? new Date(formData.deadline).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                institution_id: institutionId || '',
                createdBy: institutionId || '',
                status: isDraft ? 'draft' : 'active'
            };

            const response = await fetch(`${API_BASE_URL}/api/opportunities/`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...authHeaders() 
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert(isDraft ? "Internship Draft Saved Successfully!" : "Internship Posted Successfully!");
                if (onSuccess) onSuccess();
                onClose();
                window.location.reload();
            } else {
                const errorData = await response.json();
                alert(`Failed to save internship: ${errorData.detail || response.statusText || 'Unknown Error'}`);
            }
        } catch (err) {
            try { console.error("Internship submit failed", err instanceof Error ? err.message : String(err)); } catch (_) {}
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
                    className="relative w-full max-w-5xl bg-[#F8FAFC] rounded-[2rem] shadow-2xl overflow-hidden flex h-[90vh] font-['Outfit']"
                >
                    {/* Sidebar */}
                    <div className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col shrink-0">
                        <div className="mb-10">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4">
                                <GraduationCap className="text-emerald-600" size={28} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 leading-tight">
                                Post an <br/><span className="text-emerald-600">Internship</span>
                            </h3>
                        </div>

                        <div className="space-y-0 relative flex-1">
                            {steps.map((s, idx) => (
                                <div key={s.id} className="flex items-start gap-4 mb-8 relative">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all ${
                                        step === s.id ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 
                                        step > s.id ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {step > s.id ? '✓' : s.id}
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <span className={`text-[10px] uppercase tracking-widest font-black ${step === s.id ? 'text-emerald-600' : 'text-slate-400'}`}>Step {s.id}</span>
                                        <span className={`text-[13px] font-bold mt-0.5 ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                                    </div>
                                    {idx < steps.length - 1 && (
                                        <div className={`absolute left-4 top-8 w-[1px] h-8 ${step > s.id ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-auto pt-8 border-t border-slate-50">
                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                Protocol v4.0.1
                            </p>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                        <button onClick={onClose} className="absolute right-8 top-8 z-20 p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-all hover:text-slate-900"><X size={20} /></button>
                        
                        {/* Progress Bar */}
                        <div className="h-1.5 bg-slate-50 w-full shrink-0 overflow-hidden">
                            <motion.div 
                                className="h-full bg-emerald-500"
                                initial={{ width: "0%" }}
                                animate={{ width: `${(step / steps.length) * 100}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            <div className="max-w-3xl mx-auto space-y-8 pb-20">
                                
                                {step === 1 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Internship Basic Details</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Internship Title *</label>
                                                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Software Developer Intern" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                            </div>
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Role Category</label>
                                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900">
                                                    <option value="" disabled>Select category</option>
                                                    {categoryOptions.map(cat => <option key={cat}>{cat}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Internship Type</label>
                                                <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900">
                                                    <option value="" disabled>Select type</option>
                                                    <option>Full-time</option>
                                                    <option>Part-time</option>
                                                    <option>Remote</option>
                                                    <option>Hybrid</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Duration (e.g. 6 Months)</label>
                                                <input type="text" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} placeholder="e.g. 2 Months" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                                                <div className="relative">
                                                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                                                <div className="relative">
                                                    <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="City, State OR Remote" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mt-12">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Organization Details</h4>
                                        </div>

                                        <div className="flex items-center gap-8 mb-6">
                                            <label className="group relative w-24 h-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer hover:bg-emerald-50 hover:border-emerald-200 transition-all overflow-hidden">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Company Logo" className="w-full h-full object-cover" />
                                                ) : (
                                                    <>
                                                        <Upload className="text-emerald-500 mb-2" size={20} />
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Logo</span>
                                                    </>
                                                )}
                                                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                                            </label>
                                            <div className="flex-1">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Organization Name</label>
                                                <input type="text" value={formData.organizationName} onChange={e => setFormData({...formData, organizationName: e.target.value})} placeholder="Institution Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-bold text-slate-900" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">About Organization</label>
                                                <textarea rows={3} value={formData.aboutOrganization} onChange={e => setFormData({...formData, aboutOrganization: e.target.value})} placeholder="Short description about your organization..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none" />
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Website Link (Optional)</label>
                                                <div className="relative">
                                                    <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="url" value={formData.websiteLink} onChange={e => setFormData({...formData, websiteLink: e.target.value})} placeholder="https://organization.com" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 2 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Internship Description</h4>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Description</label>
                                            <textarea rows={6} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Describe the role, team, and expectations..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none" />
                                            <p className="text-[10px] text-slate-400 mt-2 font-medium italic">Rich text formatting will be preserved on the platform.</p>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Roles and Responsibilities</label>
                                            <textarea rows={4} value={formData.responsibilities} onChange={e => setFormData({...formData, responsibilities: e.target.value})} placeholder="- Daily tasks&#10;- Project contributions&#10;- Collaboration goals" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none" />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Learning Outcomes</label>
                                            <textarea rows={3} value={formData.learningOutcomes} onChange={e => setFormData({...formData, learningOutcomes: e.target.value})} placeholder="What will the intern gain from this experience?" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none" />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Required Skills (Tag Input)</label>
                                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl focus-within:border-emerald-500 transition-all flex flex-wrap gap-2">
                                                {formData.requiredSkills.map(skill => (
                                                    <span key={skill} className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 shadow-sm">
                                                        {skill}
                                                        <X size={12} className="cursor-pointer text-slate-400 hover:text-red-500 transition-colors" onClick={() => removeSkill(skill)} />
                                                    </span>
                                                ))}
                                                <input 
                                                    type="text" 
                                                    value={formData.skillInput}
                                                    onChange={e => setFormData({...formData, skillInput: e.target.value})}
                                                    onKeyDown={handleAddSkill}
                                                    placeholder="e.g. React, Python (Press Enter)"
                                                    className="flex-1 min-w-[200px] p-1 bg-transparent outline-none text-sm font-medium"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Preferred Skills (Optional)</label>
                                            <input type="text" value={formData.preferredSkills} onChange={e => setFormData({...formData, preferredSkills: e.target.value})} placeholder="e.g. Experience with AWS, Figma" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 3 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Eligibility & Application</h4>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Eligible Courses</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {courseOptions.map(course => (
                                                        <button 
                                                            key={course}
                                                            onClick={() => toggleArrayItem('eligibleCourses', course)}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.eligibleCourses.includes(course) ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200'}`}
                                                        >
                                                            {course}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Branch/Stream</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {branchOptions.map(branch => (
                                                        <button 
                                                            key={branch}
                                                            onClick={() => toggleArrayItem('branches', branch)}
                                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.branches.includes(branch) ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-white text-slate-500 border-slate-100 hover:border-emerald-200'}`}
                                                        >
                                                            {branch}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Minimum CGPA (Optional)</label>
                                                    <input type="number" step="0.1" value={formData.minCGPA} onChange={e => setFormData({...formData, minCGPA: e.target.value})} placeholder="e.g. 7.5" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Year of Study</label>
                                                    <select value={formData.yearOfStudy} onChange={e => setFormData({...formData, yearOfStudy: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900">
                                                        <option>1st Year</option>
                                                        <option>2nd Year</option>
                                                        <option>3rd Year</option>
                                                        <option>4th Year</option>
                                                        <option>Final Year</option>
                                                        <option>Graduated</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mt-12">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Application Details</h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Application Deadline</label>
                                                <div className="relative">
                                                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="date" value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Number of Openings</label>
                                                <div className="relative">
                                                    <Users size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="number" min={1} value={formData.openings} onChange={e => setFormData({...formData, openings: e.target.value})} placeholder="e.g. 5" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Selection Process</label>
                                            <textarea rows={3} value={formData.selectionProcess} onChange={e => setFormData({...formData, selectionProcess: e.target.value})} placeholder="e.g. Resume Screening -> Assignment -> Interview" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900 resize-none" />
                                        </div>
                                    </motion.div>
                                )}

                                {step === 4 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Stipend & Perks</h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="col-span-2 md:col-span-1">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Stipend Type</label>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setFormData({...formData, stipendType: 'Paid'})} className={`flex-1 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${formData.stipendType === 'Paid' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Paid</button>
                                                    <button onClick={() => setFormData({...formData, stipendType: 'Unpaid'})} className={`flex-1 py-4 rounded-2xl border font-black text-xs uppercase tracking-widest transition-all ${formData.stipendType === 'Unpaid' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>Unpaid</button>
                                                </div>
                                            </div>

                                            {formData.stipendType === 'Paid' && (
                                                <div className="col-span-2 md:col-span-1">
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Stipend Amount (Monthly)</label>
                                                    <div className="relative">
                                                        <DollarSign size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                        <input type="number" value={formData.stipendAmount} onChange={e => setFormData({...formData, stipendAmount: e.target.value})} placeholder="e.g. 15000" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Perks</label>
                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                {perksOptions.map(perk => (
                                                    <button 
                                                        key={perk}
                                                        onClick={() => toggleArrayItem('perks', perk)}
                                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${formData.perks.includes(perk) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-100'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${formData.perks.includes(perk) ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-slate-50 border-slate-200'}`}>
                                                            {formData.perks.includes(perk) && <CheckCircle size={12} />}
                                                        </div>
                                                        <span className="text-[11px] font-bold">{perk}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {step === 5 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Recruiter & Visibility</h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Contact Person Name</label>
                                                <input type="text" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} placeholder="Full Name" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                                                <div className="relative">
                                                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="recruiter@org.com" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number (Optional)</label>
                                                <div className="relative">
                                                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+91 XXXXX XXXXX" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mt-12">
                                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                                            <h4 className="text-xl font-black text-slate-900">Visibility & Application Method</h4>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Who can apply</label>
                                                <select value={formData.visibility} onChange={e => setFormData({...formData, visibility: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900">
                                                    <option>All</option>
                                                    <option>Specific Colleges</option>
                                                    <option>Specific Courses</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Application Method</label>
                                                <select value={formData.applicationMethod} onChange={e => setFormData({...formData, applicationMethod: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900">
                                                    <option>Platform</option>
                                                    <option>External Link</option>
                                                </select>
                                            </div>
                                            {formData.applicationMethod === 'External Link' && (
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">External Application Link</label>
                                                    <div className="relative">
                                                        <Globe size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                                        <input type="url" value={formData.externalLink} onChange={e => setFormData({...formData, externalLink: e.target.value})} placeholder="https://external-careers.com/apply" className="w-full pl-12 p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-emerald-500 transition-all font-medium text-slate-900" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}

                                {step === 6 && (
                                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                        <div className="text-center mb-8">
                                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <Eye className="text-emerald-500" size={32} />
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-900">Review & Attachments</h4>
                                            <p className="text-slate-500 font-medium">Verify your internship details before going live.</p>
                                        </div>

                                        <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 space-y-6">
                                            <div className="flex items-center gap-6 border-b border-slate-200/50 pb-6">
                                                {logoPreview ? (
                                                    <img src={logoPreview} alt="Logo" className="w-20 h-20 rounded-[1.5rem] object-cover shadow-lg" />
                                                ) : (
                                                    <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center text-slate-300 shadow-sm"><Building size={32} /></div>
                                                )}
                                                <div>
                                                    <h2 className="text-2xl font-black text-slate-900">{formData.title || 'Untitled Internship'}</h2>
                                                    <p className="text-emerald-600 font-black uppercase tracking-widest text-[10px] mt-1">{formData.organizationName || 'Organization Name'}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-6 py-2">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Type</p>
                                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock size={14} className="text-emerald-500"/> {formData.type}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Duration</p>
                                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><Calendar size={14} className="text-emerald-500"/> {formData.duration || 'Not Set'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Stipend</p>
                                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2"><DollarSign size={14} className="text-emerald-500"/> {formData.stipendType === 'Paid' ? `₹${formData.stipendAmount}/mo` : 'Unpaid'}</p>
                                                </div>
                                            </div>

                                            <div className="pt-4 space-y-4">
                                                <h5 className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Attachments (Optional)</h5>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <label className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-emerald-200 transition-all group">
                                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-all"><FileText size={20} /></div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-slate-900">Internship PDF</p>
                                                            <p className="text-[10px] text-slate-400">Click to upload JD</p>
                                                        </div>
                                                        <input type="file" className="hidden" accept=".pdf" onChange={(e) => setFormData({...formData, attachmentName: e.target.files?.[0]?.name || ''})} />
                                                    </label>
                                                    <label className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-2xl cursor-pointer hover:border-emerald-200 transition-all group">
                                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-all"><Plus size={20} /></div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-slate-900">Additional Docs</p>
                                                            <p className="text-[10px] text-slate-400">Add other files</p>
                                                        </div>
                                                        <input type="file" className="hidden" multiple />
                                                    </label>
                                                </div>
                                                {formData.attachmentName && (
                                                    <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                                                        <div className="flex items-center gap-2">
                                                            <FileText size={16} className="text-emerald-500" />
                                                            <span className="text-xs font-bold text-emerald-700">{formData.attachmentName}</span>
                                                        </div>
                                                        <button onClick={() => setFormData({...formData, attachmentName: ''})} className="text-emerald-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>

                        {/* Footer / Navigation */}
                        <div className="border-t border-slate-100 p-8 bg-white flex justify-between items-center z-10 shrink-0">
                            <div className="flex gap-4">
                                {step > 1 && (
                                    <button onClick={handlePrev} className="px-6 py-3.5 border border-slate-100 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all">Back</button>
                                )}
                            </div>
                            
                            <div className="flex gap-4">
                                <button onClick={() => handleSubmit(true)} className="px-6 py-3.5 border border-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all flex items-center gap-2">
                                    <Save size={16} /> Save Draft
                                </button>
                                {step < steps.length ? (
                                    <button onClick={handleNext} className="px-10 py-3.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
                                        Next Step
                                    </button>
                                ) : (
                                    <button onClick={() => handleSubmit(false)} disabled={loading} className="px-10 py-3.5 bg-emerald-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200 flex items-center gap-2">
                                        {loading ? 'Publishing...' : <><CheckCircle size={18} /> Publish Internship</>}
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

export default PostInternshipModal;

