import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../apiConfig';
import { BookOpen, Clock, ArrowRight, Plus } from 'lucide-react';
import WebImage from '../components/WebImage';
import { useAuth } from '../AuthContext';

interface Course {
  _id: string;
  title: string;
  description: string;
  role_tag: string;
  difficulty: string;
  image?: string;
  price?: number;
  rating?: number;
  duration?: string;
  thumbnail_url?: string;
}

interface EnrolledCourse extends Course {
  progress?: number;
  last_accessed_module?: string;
  enrollment_details?: {
    progress: number;
    last_accessed?: string;
  };
}

const MyCourses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'applied' | 'available'>('applied');

  const userId = user?.uid || 'test-user';

  const filterAwsCourses = (courses: Course[]) => {
    const awsRegex = /\baws\b/;
    return courses.filter((course) => {
      const title = (course.title || '').toLowerCase();
      const role = (course.role_tag || '').toLowerCase();
      const description = (course.description || '').toLowerCase();
      return !(awsRegex.test(title) || awsRegex.test(role) || awsRegex.test(description));
    });
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/user-courses/${userId}`);
        const data = await res.json();
        const enrolled = filterAwsCourses(data.enrolled || []);
        const available = filterAwsCourses(data.available || []);


        setEnrolledCourses(enrolled);
        setAvailableCourses(available);
      } catch (err) {
        try { console.error('Error fetching courses:', err instanceof Error ? err.message : String(err)); } catch (_) {}
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [userId]);

  const handleContinueLearning = (courseId: string) => {
    navigate(`/learn/course-player/${courseId}`);
  };

  const handleViewCourse = (courseId: string) => {
    navigate(`/learn/course-player/${courseId}`);
  };

    if (loading) {
        return (
            <div className="pt-40 pb-32 px-6 bg-[#F8FAFC] min-h-screen">
                <div className="max-w-7xl mx-auto space-y-8">
                    <div className="w-64 h-12 bg-slate-200 rounded-xl animate-pulse"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-80 bg-white rounded-3xl border border-slate-100 animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

  return (
    <div className="pt-28 sm:pt-40 pb-32 px-6 bg-white min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-tech opacity-[0.03] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-[#7C3AED]/5 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.header className="mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl sm:text-7xl font-black text-[#111827] tracking-tighter uppercase mb-4">
              My <span className="text-[#7C3AED]">Courses</span>
            </h1>
            <p className="text-lg text-[#6B7280] font-medium">
              {enrolledCourses.length} enrolled, {availableCourses.length} available
            </p>
          </motion.div>
        </motion.header>

        {/* Tab Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-12 border-b border-gray-100 pb-6"
        >
          <button
            onClick={() => setActiveTab('applied')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border relative ${activeTab === 'applied'
              ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xl shadow-[#7C3AED]/20'
              : 'bg-white text-gray-400 border-gray-100 hover:border-[#7C3AED]/30'
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              <BookOpen className="w-4 h-4" />
              Applied
            </span>
            {enrolledCourses.length > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 bg-green-500 text-white text-[8px] font-black rounded-full shadow-lg">
                {enrolledCourses.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all border relative ${activeTab === 'available'
              ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-xl shadow-[#7C3AED]/20'
              : 'bg-white text-gray-400 border-gray-100 hover:border-[#7C3AED]/30'
              }`}
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Available
            </span>
            {availableCourses.length > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 bg-[#7C3AED] text-white text-[8px] font-black rounded-full shadow-lg">
                {availableCourses.length}
              </span>
            )}
          </button>
        </motion.div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'applied' ? (
            <motion.div
              key="applied"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {enrolledCourses.length === 0 ? (
                <motion.div className="text-center py-20 border border-dashed border-gray-300 rounded-2xl">
                  <div className="text-6xl mb-4">📚</div>
                  <h2 className="text-2xl font-black text-[#111827] mb-2">No Enrolled Courses Yet</h2>
                  <p className="text-gray-600 mb-8">Start your learning journey by enrolling in a course</p>
                  <button
                    onClick={() => navigate('/learn/courses')}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#7C3AED] text-white font-black text-sm uppercase tracking-[0.2em] rounded-xl hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/30"
                  >
                    Browse All Courses
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence>
                    {enrolledCourses.map((course, idx) => {
                      const progress = course.enrollment_details?.progress || 0;
                      const displayImage = course.image || course.thumbnail_url || 'https://miro.medium.com/max/938/0*lbtSAeYRtmUMAWeY.png';

                      return (
                        <motion.div
                          key={course._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-2xl transition-all group"
                        >
                          <div className="h-40 relative overflow-hidden">
                            <img
                              src={displayImage}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                            {/* Progress Badge */}
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-lg px-3 py-2">
                              <p className="text-[10px] font-black text-[#6B7280] uppercase tracking-widest">Progress</p>
                              <p className="text-xl font-black text-[#111827]">{Math.round(progress)}%</p>
                            </div>

                            {/* Progress Bar */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200">
                              <div
                                className="h-full bg-gradient-to-r from-[#7C3AED] to-[#6D28D9] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-[8px] font-black text-[#7C3AED] uppercase tracking-[0.3em]">
                                  {course.role_tag}
                                </span>
                                <h3 className="text-lg font-black text-[#111827] mt-1 leading-tight">{course.title}</h3>
                              </div>
                            </div>

                            <p className="text-sm text-[#6B7280] mb-4 line-clamp-2">{course.description}</p>

                            {/* Last Accessed */}
                            {course.enrollment_details?.last_accessed && (
                              <div className="mb-4 pb-4 border-b border-gray-100 text-[10px] text-[#6B7280] uppercase tracking-widest">
                                Last accessed: {new Date(course.enrollment_details.last_accessed).toLocaleDateString()}
                              </div>
                            )}

                            <button
                              onClick={() => handleContinueLearning(course._id)}
                              className="w-full py-3 bg-[#7C3AED] text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-lg hover:bg-[#6D28D9] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-2"
                            >
                              <BookOpen className="w-4 h-4" />
                              Continue Learning
                            </button>

                            <button
                              onClick={() => {
                                if (window.confirm(`Unenroll from ${course.title}? You can re-enroll later.`)) {
                                  fetch(`${API_BASE_URL}/api/enrollment/${user?.uid}/${course._id}`, {
                                    method: 'DELETE'
                                  }).then(() => {
                                    setEnrolledCourses(enrolledCourses.filter(c => c._id !== course._id));
                                  }).catch(err => { try { console.error('Unenroll failed:', err instanceof Error ? err.message : String(err)); } catch (_) {} });
                                }
                              }}
                              className="w-full py-3 bg-red-50 text-red-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-lg hover:bg-red-100 active:scale-[0.98] transition-all border border-red-200"
                            >
                              Unenroll
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="available"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {availableCourses.length === 0 ? (
                <motion.div className="text-center py-20 border border-dashed border-gray-300 rounded-2xl">
                  <div className="text-6xl mb-4">✨</div>
                  <h2 className="text-2xl font-black text-[#111827] mb-2">All Courses Enrolled!</h2>
                  <p className="text-gray-600 mb-8">You're enrolled in all available courses. Keep learning!</p>
                  <button
                    onClick={() => setActiveTab('applied')}
                    className="inline-flex items-center gap-2 px-8 py-4 bg-[#7C3AED] text-white font-black text-sm uppercase tracking-[0.2em] rounded-xl hover:bg-[#6D28D9] transition-all shadow-lg shadow-[#7C3AED]/30"
                  >
                    View My Courses
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <AnimatePresence>
                    {availableCourses.map((course, idx) => {
                      const displayImage = course.image || course.thumbnail_url || 'https://miro.medium.com/max/938/0*lbtSAeYRtmUMAWeY.png';

                      return (
                        <motion.div
                          key={course._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-2xl transition-all group"
                        >
                          <div className="h-40 relative overflow-hidden">
                            <img
                              src={displayImage}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                            {/* Price Badge */}
                            {course.price && course.price > 0 && (
                              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md rounded-lg px-3 py-2">
                                <p className="text-xl font-black text-[#7C3AED]">${course.price.toFixed(2)}</p>
                              </div>
                            )}
                          </div>

                          <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <span className="text-[8px] font-black text-[#7C3AED] uppercase tracking-[0.3em]">
                                  {course.role_tag}
                                </span>
                                <h3 className="text-lg font-black text-[#111827] mt-1 leading-tight">{course.title}</h3>
                              </div>
                            </div>

                            <p className="text-sm text-[#6B7280] mb-4 line-clamp-2">{course.description}</p>

                            {/* Course Meta */}
                            <div className="flex items-center gap-4 text-xs text-[#6B7280] mb-4 pb-4 border-b border-gray-100 uppercase tracking-widest">
                              {course.rating && (
                                <span>⭐ {course.rating.toFixed(1)}</span>
                              )}
                              {course.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {course.duration}
                                </span>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate('/learn/courses')}
                                className="flex-1 py-3 bg-gray-100 text-[#111827] font-black text-[10px] uppercase tracking-[0.2em] rounded-lg hover:bg-gray-200 transition-all"
                              >
                                View
                              </button>
                              <button
                                onClick={() => navigate('/learn/courses')}
                                className="flex-1 py-3 bg-[#7C3AED] text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-lg hover:bg-[#6D28D9] transition-all flex items-center justify-center gap-2"
                              >
                                <Plus className="w-4 h-4" />
                                Cart
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyCourses;

