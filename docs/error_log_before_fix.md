# Error Log — Before Fix

**Total TypeScript Errors:** 214  
**Files with Errors:** 37  
**Backend Issues:** 2 critical  

## TypeScript Errors by File

| File | Error Count | Error Type |
|---|---|---|
| `pages/opportunities/OpportunityDetails.tsx` | 12 | user.name, CalendarX, void as ReactNode |
| `pages/institution-dashboard/CertificatesPage.tsx` | 10 | rule_config type, Lucide title prop, wrong component props |
| `pages/institution-dashboard/AchievementRegistry.tsx` | 8 | rule_config type, Lucide title prop |
| `pages/CoursePlayer.tsx` | 6 | missing modules/courseCurriculum state, CSS property |
| `pages/events/EventHub.tsx` | 7 | undeclared variables (needsTeam, minTeam etc.) |
| `pages/MyProfile.tsx` | 5 | wrong state types, missing navigate |
| `pages/institution-dashboard/SettingsPage.tsx` | 5 | rule_config type |
| `pages/institution-dashboard/SubmissionList.tsx` | 4 | filteredSubmissions before declaration |
| `pages/SDLProjectDetail.tsx` | 3 | user.displayName |
| `pages/institution-dashboard/EventDetails.tsx` | 3 | wrong LeaderboardPage props |
| `contexts/InstitutionDataContext.tsx` | 2 | missing createContext |
| `components/institution/PostOpportunityModal.tsx` | 2 | missing fields in setFormData |
| `pages/institution-dashboard/EventsManagement.tsx` | 2 | visibility type, onViewEvent args |
| `pages/institution-dashboard/JudgeDashboard.tsx` | 2 | user.name, arithmetic on unknown |
| `pages/SDLProjectCreate.tsx` | 2 | user.displayName, user.photoURL |
| Other 22 files | 1 each | Various (imports, props, types) |

## Backend Issues

| Issue | Severity | File |
|---|---|---|
| Email verification check commented out | 🔴 Critical | `main.py` line 6754 |
| profilePhoto missing from login response | 🟡 Medium | `main.py` login endpoint |
