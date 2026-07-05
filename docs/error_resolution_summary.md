# Bug Fix Summary — Studlyf v2

**Author:** Gudala Sai Nitesh  
**Branch:** `fix/bugs-and-optimizations`  
**Date:** June 29, 2026  
**Total Files Fixed:** 42 (37 frontend + 2 backend + 3 types/utils)  
**TypeScript Errors:** 214 → 0  

---

## Backend Fixes

### 1. Email Verification Bypass (Critical Security Bug)
**File:** `backend/main.py`  
**Issue:** The email verification check on login was commented out, allowing unverified accounts to log in freely.  
**Fix:** Re-enabled the check so unverified users get a `403` error with message `"Please verify your email before signing in"`.

```python
# Before (broken)
# if not bool(user.get("email_verified")):
#     raise HTTPException(status_code=403, ...)

# After (fixed)
if not bool(user.get("email_verified")):
    raise HTTPException(status_code=403, detail="Please verify your email before signing in")
```

### 2. Missing profilePhoto in Login Response
**File:** `backend/main.py`  
**Issue:** The login API response was missing the `profilePhoto` field, causing undefined reference errors across multiple frontend pages (SDLProjectCreate, SDLProjectDetail etc.).  
**Fix:** Added `profilePhoto` to the returned user object, checking multiple possible field names.

---

## Frontend Fixes

### 3. InstitutionDataContext — Missing createContext (Runtime Crash)
**File:** `frontend/contexts/InstitutionDataContext.tsx`  
**Issue:** `createContext` call was missing — the context was `undefined` at runtime, breaking the entire institution dashboard data layer.  
**Fix:** Added proper `createContext<InstitutionData | null>(null)` call and fixed initial state to include the `refresh` function.

### 4. User Type Mismatches (8+ Files)
**Files:** `Topbar.tsx`, `JudgeSidebar.tsx`, `JudgeDashboard.tsx`, `ResumeBuilder.tsx`, `SDLProjectCreate.tsx`, `SDLProjectDetail.tsx`, `ParticipantPortal.tsx`, `OpportunityDetails.tsx`  
**Issue:** Multiple components referenced `user.displayName`, `user.name`, `user.photoURL`, `user._id` — none of these exist on the `User` type.  
**Fix:** Replaced with correct fields: `user.full_name`, `user.profilePhoto`, `user.user_id`.

### 5. Missing navigate Declaration (MyProfile)
**File:** `frontend/pages/MyProfile.tsx`  
**Issue:** `useNavigate` was imported but `const navigate = useNavigate()` was never called, causing a runtime crash when navigating back from the profile page.  
**Fix:** Added `const navigate = useNavigate()` inside the component.

### 6. Wrong State Types (MyProfile)
**File:** `frontend/pages/MyProfile.tsx`  
**Issue:** `sectionStatus` typed as `Record<string, 'saving' | 'saved' | 'error' | null>` but used as `{ section, type, message }` object. Same for `copyFeedback` typed as `string | null`.  
**Fix:** Corrected both state types to match their actual usage.

### 7. Missing Variables in EventHub (Runtime Crash)
**File:** `frontend/pages/events/EventHub.tsx`  
**Issue:** Seven variables (`needsTeam`, `teamMeetsSize`, `minTeam`, `maxTeam`, `memberCount`, `hasDynamicFields`, `dynamicFields`) were used in JSX but never declared — left behind from a refactor.  
**Fix:** Injected all derived variables computed from `event` and `team` state.

### 8. CoursePlayer — Missing State Variables
**File:** `frontend/pages/CoursePlayer.tsx`  
**Issue:** `modules`, `setModules`, `courseCurriculum` referenced but never declared. `updateModules` destructured from hook but hook didn't export it.  
**Fix:** Added local state for all three, created `updateModules` as a local wrapper.

### 9. SubmissionList — Variable Used Before Declaration
**File:** `frontend/pages/institution-dashboard/submissions/SubmissionList.tsx`  
**Issue:** `filteredSubmissions` referenced inside a `useEffect` at line 82 but only declared at line 342.  
**Fix:** Changed the `useEffect` to reference `submissions.all` directly instead.

### 10. Missing handleNotifyTeam Implementation
**File:** `frontend/pages/institution-dashboard/TeamsManagement.tsx`  
**Issue:** `handleNotifyTeam(teamId)` called on button click but function was never defined — would crash on click.  
**Fix:** Implemented the function with a POST request to the notify endpoint.

### 11. @/config Import Alias Not Configured
**File:** `frontend/components/AdminRegistrationsDashboard.tsx`  
**Issue:** `import { API_BASE_URL } from '@/config'` — the `@` path alias was never set up in `tsconfig.json`.  
**Fix:** Changed to relative import `../apiConfig`.

### 12. Wrong CertificateTemplateBuilder Props
**File:** `frontend/pages/institution-dashboard/CertificatesPage.tsx`  
**Issue:** Component called with `templates`, `onSelect`, `onUpdate`, `onSave`, `onDelete`, `selectedTemplate` props — none of which the component accepts.  
**Fix:** Simplified call to only pass `institutionId` which the component actually accepts.

### 13. rule_config Type Too Narrow (3 Files)
**Files:** `CertificatesPage.tsx`, `AchievementRegistry.tsx`, `SettingsPage.tsx`  
**Issue:** `rule_config` state typed as `{ top_n: number }` but used to store many different config shapes.  
**Fix:** Changed to `Record<string, any>` across all three files.

### 14. Lucide Icons — Invalid title Prop (2 Files)
**Files:** `CertificatesPage.tsx`, `AchievementRegistry.tsx`  
**Issue:** Lucide icon components don't accept a `title` prop — TypeScript error.  
**Fix:** Wrapped icons in `<span title="...">` elements instead.

### 15. LeaderboardPage — Wrong Export Name
**File:** `frontend/pages/institution-dashboard/EventDetails.tsx`  
**Issue:** Imported as `LeaderboardPage` but the component exports as `LiveResultsDashboard`. Also called with invalid props.  
**Fix:** Fixed import alias and removed invalid props from the call.

### 16. IEvent / IStage Type Gaps
**File:** `frontend/types/event.ts`  
**Issue:** `IStage` missing `can_access`, `is_completed`, `is_current` fields injected by backend. `IStageConfig` missing `description`. `IEvent` missing `participationType`.  
**Fix:** Added all missing fields with optional typing.

### 17. Other Smaller Fixes
| File | Fix |
|---|---|
| `AuthCard.tsx` | Added missing `compact` prop |
| `MentorCredibility.tsx` | `fetchpriority` → `fetchPriority` (React casing) |
| `ResourcesTab.tsx` | `JSX.Element` → `React.ReactElement` |
| `CourseManagement.tsx` | Removed stray `z` attribute on `<button>` |
| `FeaturePreview.tsx` | Added missing `useState`, `useEffect` imports |
| `DSAVisualizer3D.tsx` | Replaced `<line>` JSX with `<primitive>` to avoid SVG conflict |
| `SkillAssessment.tsx` | Added `CODING` to `QuestionType` union and `typeColors` record |
| `PostJobModal.tsx` | Wrapped `handleSubmit` in arrow function to fix `MouseEvent` conflict |
| `PostOpportunityModal.tsx` | Added missing fields to reset `setFormData` call |
| `PostSelectionModal.tsx` | Typed arrays explicitly to allow `hasSub` property |
| `OpportunitiesList.tsx` | Added missing `Plus` import from lucide-react |
| `OpportunityDetails.tsx` | Fixed `CalendarX` → `Calendar`; removed `console.log` from JSX |
| `EventsManagement.tsx` | Added `Unknown` to visibility union; fixed `onViewEvent` to accept 3rd arg |
| `OpportunitiesManagement.tsx` | Cast `Set` spread to `string[]` |
| `curriculumUtils.ts` | Cast topic type to `Topic['type']` |
| `ParticipantCardPage.tsx` | Fixed `user._id` → `user.user_id` |
| `StageBuilder.tsx` | Added missing `IStage` import |
| `DownloadsPage.tsx` | Added `institutionId?` prop |
| `ContactConsultationDrawer.tsx` | Added `institutionId?` prop |
| `JudgeDashboard.tsx` | Fixed arithmetic on `Object.values` reduce result |

---

## Summary

The fixes covered every layer of the stack:
- **Security**: Re-enabled email verification on login
- **Runtime crashes**: Fixed missing context, missing state variables, missing function declarations
- **Type safety**: Corrected state types, prop types, interface definitions
- **API contract**: Fixed login response to include all fields the frontend expects
