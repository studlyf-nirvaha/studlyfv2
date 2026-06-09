// Studlyf Engineering Protocol - Core Routing Engine
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { HashRouter as Router, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';

// Core components
import Navigation from './components/Navigation';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded components (code-split)
const Footer = lazy(() => import('./components/Footer'));
const EnquiryForm = lazy(() => import('./components/EnquiryForm'));
const ResourceCenter = lazy(() => import('./components/ResourceCenter'));
const Testimonials = lazy(() => import('./components/Testimonials'));
const Impact = lazy(() => import('./components/Impact'));
const RightHoverPanel = lazy(() => import('./components/RightHoverPanel'));
const SplashScreen = lazy(() => import('./components/SplashScreen'));
const RoleFixer = lazy(() => import('./RoleFixer'));

import { AuthProvider, useAuth } from './AuthContext';
import { DashboardDataProvider } from './contexts/DashboardDataContext';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';
import { HeroUIProvider } from "@heroui/react";

// Lazy-loaded pages (code-split per route)
const Home = lazy(() => import('./pages/Home'));
const CourseDetail = lazy(() => import('./pages/CourseDetail'));
const CareerFit = lazy(() => import('./pages/CareerFit'));
const Assessment = lazy(() => import('./pages/Assessment'));
const AssessmentIntro = lazy(() => import('./pages/AssessmentIntro'));
const JobSimulation = lazy(() => import('./pages/JobSimulation'));
const PortfolioBuilder = lazy(() => import('./pages/PortfolioBuilder'));
const SystemDeconstructionLab = lazy(() => import('./pages/SystemDeconstructionLab'));
const SDLProjectCreate = lazy(() => import('./pages/SDLProjectCreate'));
const SDLProjectDetail = lazy(() => import('./pages/SDLProjectDetail'));
const MockInterview = lazy(() => import('./pages/MockInterview'));
const SkillAssessment = lazy(() => import('./pages/SkillAssessment'));
const SkillAssessmentHistory = lazy(() => import('./pages/SkillAssessmentHistory'));
const GroupDiscussion = lazy(() => import('./pages/GroupDiscussion'));
const PlayLearnEarn = lazy(() => import('./pages/PlayLearnEarn'));
const GoalSelector = lazy(() => import('./pages/GoalSelector'));
const About = lazy(() => import('./pages/About'));
const UnifiedAuth = lazy(() => import('./pages/UnifiedAuth'));
const JudgeInvitation = lazy(() => import('./pages/JudgeInvitation'));
const LearnerDashboard = lazy(() => import('./pages/LearnerDashboard'));
const JoinTeamPage = lazy(() => import('./pages/events/JoinTeam'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const Blog = lazy(() => import('./pages/Blog'));
const CompanyModules = lazy(() => import('./pages/CompanyModules'));
const ResumeBuilder = lazy(() => import('./pages/ResumeBuilder'));
const CoursePlayer = lazy(() => import('./pages/CoursePlayer'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const MyCourses = lazy(() => import('./pages/MyCourses'));
const CareerOnboarding = lazy(() => import('./pages/CareerOnboarding'));
const CoursesOverview = lazy(() => import('./pages/CoursesOverview'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const TrackDetail = lazy(() => import('./pages/TrackDetail'));
const EnrollmentFlow = lazy(() => import('./pages/EnrollmentFlow'));
const StackPage = lazy(() => import('./pages/StackPage'));
const QueuePage = lazy(() => import('./pages/QueuePage'));
const LinkedListPage = lazy(() => import('./pages/LinkedListPage'));
const BSTPage = lazy(() => import('./pages/BSTPage'));
const HashTablePage = lazy(() => import('./pages/HashTablePage'));
const AITools = lazy(() => import('./pages/AITools'));
const StudOTT = lazy(() => import('./pages/StudOTT'));
const StudHub = lazy(() => import('./pages/StudHub'));
const StudentDiscounts = lazy(() => import('./pages/StudentDiscounts'));
const StudentSchemes = lazy(() => import('./pages/StudentSchemes'));
const FeaturePreview = lazy(() => import('./pages/FeaturePreview'));
const InstitutionDashboard = lazy(() => import('./pages/institution-dashboard/InstitutionDashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const RoadmapClone = lazy(() => import('./pages/RoadmapClone'));
const OpportunitiesList = lazy(() => import('./pages/opportunities/OpportunitiesList'));
const OpportunityDetails = lazy(() => import('./pages/opportunities/OpportunityDetails'));
const ResultsPage = lazy(() => import('./pages/opportunities/ResultsPage'));
const MyApplications = lazy(() => import('./pages/opportunities/MyApplications'));
const EventHub = lazy(() => import('./pages/events/EventHub'));
const EventPackagePage = lazy(() => import('./pages/events/EventPackagePage'));
const EventQuizPage = lazy(() => import('./pages/events/EventQuizPage'));
const ParticipantCardPage = lazy(() => import('./pages/events/ParticipantCardPage'));
const ParticipantPortal = lazy(() => import('./pages/events/ParticipantPortal'));
const JudgePortalLayout = lazy(() => import('./pages/judge/JudgePortalLayout'));
const EvaluationPage = lazy(() => import('./pages/EvaluationPage'));
const AdminLayout = lazy(() => import('./pages/admin/layout/AdminLayout'));
const AdminDashboardOverview = lazy(() => import('./pages/admin/dashboard/Overview'));
const AdminStudentManagement = lazy(() => import('./pages/admin/students/StudentManagement'));
const AdminCourseManagement = lazy(() => import('./pages/admin/courses/CourseManagement'));
const AdminAssessmentManagement = lazy(() => import('./pages/admin/assessments/AssessmentManagement'));
const AdminAnalytics = lazy(() => import('./pages/admin/analytics/Analytics'));
const AdminSDLManagement = lazy(() => import('./pages/admin/sdl/SDLManagement'));
const AdminProtectedRoute = lazy(() => import('./AdminProtectedRoute'));
const AdsManagement = lazy(() => import('./pages/admin/ads/AdsManagement'));
const AdminMentorManagement = lazy(() => import('./pages/admin/mentors/MentorManagement'));
const AdminCompanyManagement = lazy(() => import('./pages/admin/companies/CompanyManagement'));
const AdminPaymentManagement = lazy(() => import('./pages/admin/payments/PaymentManagement'));
const AdminResumeManagement = lazy(() => import('./pages/admin/resumes/ResumeManagement'));
const AdminAuditLogs = lazy(() => import('./pages/admin/audit/AuditLogs'));

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const CertificateVerification = lazy(
  () => import('./pages/CertificateVerification')
);

const App: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const { user, role, loading } = useAuth();



  const isLoginPage =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/verify-email';

  const isDashboard = pathname.startsWith('/dashboard');
  const isAdmin = pathname.startsWith('/admin');
  const isPlayer = pathname.startsWith('/learn/course-player');
  const isCheckout = pathname === '/learn/checkout';
  const isHome = pathname === '/';
  const isResume = pathname === '/job-prep/resume-builder';

  const isVisualizer =
    pathname.startsWith('/learn/visualizer') ||
    ['/stack', '/queue', '/linked-list', '/bst', '/hash-table'].includes(
      pathname
    );

  const isCareerOnboarding =
    pathname === '/learn/career-onboarding';

  const isCompanyModules =
    pathname === '/learn/company-modules';

  // Global Redirect Logic
  useEffect(() => {
    if (loading) return;
    if (!pathname) return;

    console.log('[AuthDebug] Role:', role, 'Path:', pathname);

    // Allow evaluation pages
    if (pathname.startsWith('/evaluate/')) {
      console.log(
        '[EvaluationAccess] Public evaluation route:',
        pathname
      );
      return;
    }

    // Admin Redirect
    if (
      user?.email?.toLowerCase() ===
      (import.meta.env.VITE_ADMIN_EMAIL || 'admin@studlyf.com')
    ) {
      if (!pathname.startsWith('/admin')) {
        navigate('/admin', { replace: true });
      }
      return;
    }

    if (user && role) {
      // Institution Redirect
      if (role === 'institution') {
        if (
          !pathname.startsWith('/institution-dashboard') &&
          (pathname.startsWith('/dashboard') || pathname === '/')
        ) {
          navigate('/institution-dashboard', { replace: true });
        }
      }

      // Judge Redirect
      else if (role === 'judge') {
        const isAllowedPath =
          pathname.startsWith('/judge-portal') ||
          pathname.startsWith('/institution-dashboard') ||
          pathname.startsWith('/evaluate/');

        if (!isAllowedPath || pathname.startsWith('/dashboard')) {
          navigate('/judge-portal', { replace: true });
          return;
        }
      }

      // Student Redirects
      if (role === 'student') {
        if (pathname === '/') {
          navigate('/dashboard/learner', {
            replace: true,
          });
          return;
        }

        if (
          pathname.startsWith('/institution-dashboard') ||
          pathname.startsWith('/judge-portal')
        ) {
          navigate('/dashboard/learner', {
            replace: true,
          });
          return;
        }

        if (pathname === '/dashboard') {
          navigate('/dashboard/learner', {
            replace: true,
          });
          return;
        }
      }

      // Judge Access
      if (
        user?.email &&
        (
          localStorage.getItem('wasJudgeInvited') === 'true' ||
          localStorage.getItem('pendingJudgeRole') === 'true' ||
          pathname.startsWith('/judge-portal')
        )
      ) {
        return;
      }
    }
  }, [user, role, pathname, loading, navigate]);

  return (
    <div
      className={`relative min-h-screen flex flex-col selection:bg-[#7C3AED] selection:text-white ${
        isDashboard || isAdmin || isCompanyModules
          ? 'bg-transparent'
          : 'bg-white'
      }`}
    >

      {(() => {
        const isOpportunityDetail =
          pathname.startsWith('/opportunities/') &&
          pathname !== '/opportunities' &&
          pathname !== '/opportunities/my-applications';

        const showNav =
          !isLoginPage &&
          !isPlayer &&
          !isCheckout &&
          !isAdmin &&
          !isHome &&
          !isResume &&
          !isVisualizer &&
          !isCareerOnboarding &&
          !isOpportunityDetail &&
          !pathname.startsWith('/evaluate/') &&
          !pathname.startsWith('/institution-dashboard') &&
          !pathname.startsWith('/judge-portal');

        return showNav && <Navigation />;
      })()}

      <main className="flex-grow">
        <Suspense
          fallback={
            <div className="h-screen flex items-center justify-center font-mono text-xs tracking-widest uppercase text-[#7C3AED]">
              Synchronizing Protocol...
            </div>
          }
        >
          <ErrorBoundary>
            <Routes>
              <Route
                path="/"
                element={
                  <PublicRoute>
                    <Home />
                  </PublicRoute>
                }
              />

            <Route path="/events/join-team" element={<PublicRoute><JoinTeamPage /></PublicRoute>} />

            {/* Learning */}
            <Route
              path="/learn/courses-overview"
              element={
                <ProtectedRoute>
                  <CoursesOverview />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/track/:trackId"
              element={
                <ProtectedRoute>
                  <TrackDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/enroll/:trackId"
              element={
                <ProtectedRoute>
                  <EnrollmentFlow />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/courses"
              element={
                <Navigate
                  to="/learn/courses-overview"
                  replace
                />
              }
            />

            <Route
              path="/learn/courses/:courseId"
              element={
                <ProtectedRoute>
                  <CourseDetail />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/course-player/:courseId"
              element={
                <ProtectedRoute>
                  <CoursePlayer />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/career-fit"
              element={
                <ProtectedRoute>
                  <CareerFit />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/assessment-intro"
              element={
                <ProtectedRoute>
                  <AssessmentIntro />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/assessment"
              element={
                <ProtectedRoute>
                  <Assessment />
                </ProtectedRoute>
              }
            />

            <Route
              path="/learn/company-modules"
              element={
                <ProtectedRoute>
                  <CompanyModules />
                </ProtectedRoute>
              }
            />

            {/* Visualizers */}
            <Route path="/stack" element={<ProtectedRoute><StackPage /></ProtectedRoute>} />
            <Route path="/queue" element={<ProtectedRoute><QueuePage /></ProtectedRoute>} />
            <Route path="/linked-list" element={<ProtectedRoute><LinkedListPage /></ProtectedRoute>} />
            <Route path="/bst" element={<ProtectedRoute><BSTPage /></ProtectedRoute>} />
            <Route path="/hash-table" element={<ProtectedRoute><HashTablePage /></ProtectedRoute>} />

            {/* Resume + Job Prep */}
            <Route path="/job-prep/resume-builder" element={<ProtectedRoute><ResumeBuilder /></ProtectedRoute>} />
            <Route path="/job-prep/job-simulation" element={<ProtectedRoute><JobSimulation /></ProtectedRoute>} />
            <Route path="/job-prep/portfolio" element={<ProtectedRoute><PortfolioBuilder /></ProtectedRoute>} />
            <Route path="/job-prep/projects" element={<ProtectedRoute><SystemDeconstructionLab /></ProtectedRoute>} />
            <Route path="/job-prep/projects/create" element={<ProtectedRoute><SDLProjectCreate /></ProtectedRoute>} />
            <Route path="/job-prep/projects/:projectId" element={<ProtectedRoute><SDLProjectDetail /></ProtectedRoute>} />
            <Route path="/job-prep/mock-interview" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
            <Route path="/skill-assessment" element={<ProtectedRoute><SkillAssessment /></ProtectedRoute>} />
            <Route path="/skill-assessment/history" element={<ProtectedRoute><SkillAssessmentHistory /></ProtectedRoute>} />
            <Route path="/job-prep/group-discussion" element={<ProtectedRoute><GroupDiscussion /></ProtectedRoute>} />
            <Route path="/job-prep/play-learn-earn" element={<ProtectedRoute><PlayLearnEarn /></ProtectedRoute>} />

            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  {role === 'institution' ? (
                    <Navigate
                      to="/institution-dashboard"
                      replace
                    />
                  ) : (
                    <Navigate
                      to="/dashboard/learner"
                      replace
                    />
                  )}
                </ProtectedRoute>
              }
            />


            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/feature-preview/:id" element={<PublicRoute><FeaturePreview /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><UnifiedAuth /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><UnifiedAuth /></PublicRoute>} />
            <Route path="/judge-invitation" element={<JudgeInvitation />} />
            <Route path="/ai-tools" element={<AITools />} />
            <Route path="/studott" element={<StudOTT />} />
            <Route path="/studhub" element={<StudHub />} />
            <Route path="/student-discounts" element={<StudentDiscounts />} />
            <Route path="/student-schemes" element={<StudentSchemes />} />
            <Route path="/verify/:id" element={<CertificateVerification />} />
            <Route path="/fix-role" element={<RoleFixer />} />
            <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
            <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
            <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />
            <Route path="/dashboard/learner" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
            <Route path="/dashboard/profile" element={<ProtectedRoute><LearnerDashboard /></ProtectedRoute>} />
            <Route path="/profile/:userId" element={<PublicProfile />} />
            <Route path="/dashboard/partner" element={<ProtectedRoute><PartnerDashboard /></ProtectedRoute>} />
            <Route path="/dashboard/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />

            {/* Opportunities */}
            <Route path="/opportunities" element={<ProtectedRoute><OpportunitiesList /></ProtectedRoute>} />
            <Route path="/opportunities/my-applications" element={<ProtectedRoute><MyApplications /></ProtectedRoute>} />
            <Route path="/notifications" element={<Navigate to="/opportunities/my-applications" replace />} />
            <Route path="/opportunities/:id" element={<ProtectedRoute><OpportunityDetails /></ProtectedRoute>} />
            <Route path="/opportunities/:id/results" element={<PublicRoute><ResultsPage /></PublicRoute>} />

            {/* Events */}
            <Route path="/events/:eventId" element={<ProtectedRoute><EventHub /></ProtectedRoute>} />
            <Route path="/events/:eventId/hub" element={<ProtectedRoute><EventHub /></ProtectedRoute>} />
            <Route path="/events/:eventId/package" element={<ProtectedRoute><EventPackagePage /></ProtectedRoute>} />
            <Route path="/events/:eventId/package/card" element={<ProtectedRoute><ParticipantCardPage /></ProtectedRoute>} />
            <Route path="/events/:eventId/portal" element={<ProtectedRoute><ParticipantPortal /></ProtectedRoute>} />
            <Route path="/events/:eventId/card" element={<ProtectedRoute><ParticipantCardPage /></ProtectedRoute>} />
            <Route path="/events/:eventId/quiz/:quizId" element={<ProtectedRoute><EventQuizPage /></ProtectedRoute>} />

            {/* Institution */}
            <Route path="/institution-dashboard/*" element={<ProtectedRoute><InstitutionDashboard /></ProtectedRoute>} />

            {/* Judge */}
            <Route path="/judge-portal/*" element={<ProtectedRoute><JudgePortalLayout /></ProtectedRoute>} />

            {/* Evaluation */}
            <Route path="/evaluate/:token" element={<EvaluationPage />} />

            {/* Misc */}
            <Route path="/roadmaps" element={<RoadmapClone />} />
            <Route path="/roadmaps/:roleId" element={<RoadmapClone />} />
            <Route path="/goal-selector" element={<ProtectedRoute><GoalSelector /></ProtectedRoute>} />
            <Route path="/learn/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/learn/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="/learn/career-onboarding" element={<ProtectedRoute><CareerOnboarding /></ProtectedRoute>} />

            {/* Lazy */}
            <Route path="/verify/:id" element={<CertificateVerification />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <Navigate
                    to="/admin/dashboard"
                    replace
                  />
                }
              />

              <Route path="dashboard" element={<AdminDashboardOverview />} />
              <Route path="students" element={<AdminStudentManagement />} />
              <Route path="courses" element={<AdminCourseManagement />} />
              <Route path="assessments" element={<AdminAssessmentManagement />} />
              <Route path="sdl-projects" element={<AdminSDLManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="mentors" element={<AdminMentorManagement />} />
              <Route path="companies" element={<AdminCompanyManagement />} />
              <Route path="payments" element={<AdminPaymentManagement />} />
              <Route path="resumes" element={<AdminResumeManagement />} />
              <Route path="ads" element={<AdsManagement />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />

              <Route
                path="settings"
                element={
                  <div className="p-8">
                    <h1>System Settings Coming Soon</h1>
                  </div>
                }
              />
            </Route>
          </Routes>
        </ErrorBoundary>
        </Suspense>
      </main>

      <RightHoverPanel />

      {isHome && (
        <>
          <Impact />
          <Testimonials />
          <ResourceCenter />
          <EnquiryForm />
          <Footer />
        </>
      )}
    </div>
  );
};

const AppWrapper: React.FC = () => {
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('studlyf_splash_shown') !== '1';
    } catch (e) {
      return true;
    }
  });

  const handleSplashFinish = () => {
    try { sessionStorage.setItem('studlyf_splash_shown', '1'); } catch (e) {}
    setShowSplash(false);
  };

  return (
    <HeroUIProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <DashboardDataProvider>
            <ScrollToTop />
            {showSplash ? (
              <SplashScreen duration={2000} onFinish={handleSplashFinish} />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                <App />
              </motion.div>
            )}
          </DashboardDataProvider>
        </AuthProvider>
      </Router>
    </HeroUIProvider>
  );
};

export default AppWrapper;

