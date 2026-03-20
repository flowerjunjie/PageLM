import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import "./index.css"

const Landing = lazy(() => import("./pages/Landing"));
const Chat = lazy(() => import("./pages/Chat"));
const Quiz = lazy(() => import("./pages/Quiz"));
const Tools = lazy(() => import("./pages/Tools"));
const FlashCards = lazy(() => import("./pages/FlashCards"));
const ExamLabs = lazy(() => import("./pages/examlab"));
const NotFound = lazy(() => import("./pages/404"));
const PlannerPage = lazy(() => import("./pages/Planner"));
const Debate = lazy(() => import("./pages/Debate"));
const Help = lazy(() => import("./pages/Help"));
const LearningProfile = lazy(() => import("./pages/LearningProfile"));
const Review = lazy(() => import("./pages/Review"));
const WeeklyReport = lazy(() => import("./pages/WeeklyReport"));
const ParentView = lazy(() => import("./pages/ParentView"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Suspense fallback={<div>Loading...</div>}><Landing /></Suspense>} />
        <Route path="chat" element={<Suspense fallback={<div>Loading...</div>}><Chat /></Suspense>} />
        <Route path="quiz" element={<Suspense fallback={<div>Loading...</div>}><Quiz /></Suspense>} />
        <Route path="tools" element={<Suspense fallback={<div>Loading...</div>}><Tools /></Suspense>} />
        <Route path="planner" element={<Suspense fallback={<div>Loading...</div>}><PlannerPage /></Suspense>} />
        <Route path="debate" element={<Suspense fallback={<div>Loading...</div>}><Debate /></Suspense>} />
        <Route path="cards" element={<Suspense fallback={<div>Loading...</div>}><FlashCards /></Suspense>} />
        <Route path="exam" element={<Suspense fallback={<div>Loading...</div>}><ExamLabs /></Suspense>} />
        <Route path="help" element={<Suspense fallback={<div>Loading...</div>}><Help /></Suspense>} />
        <Route path="profile" element={<Suspense fallback={<div>Loading...</div>}><LearningProfile /></Suspense>} />
        <Route path="review" element={<Suspense fallback={<div>Loading...</div>}><Review /></Suspense>} />
        <Route path="report/weekly" element={<Suspense fallback={<div>Loading...</div>}><WeeklyReport /></Suspense>} />
        <Route path="report/share/:token" element={<Suspense fallback={<div>Loading...</div>}><ParentView /></Suspense>} />
        {/* Learning Mode Routes - Phase 1 */}
        <Route path="preview" element={<Suspense fallback={<div>Loading...</div>}><Chat /></Suspense>} />
        <Route path="notes" element={<Suspense fallback={<div>Loading...</div>}><Tools /></Suspense>} />
        <Route path="podcast" element={<Suspense fallback={<div>Loading...</div>}><Tools /></Suspense>} />
        <Route path="*" element={<Suspense fallback={<div>Loading...</div>}><NotFound /></Suspense>} />
      </Route>
    </Routes>
  </BrowserRouter>
);
