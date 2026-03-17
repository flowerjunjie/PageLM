import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Quiz from "./pages/Quiz";
import Tools from "./pages/Tools"
import FlashCards from './pages/FlashCards'
import ExamLabs from "./pages/examlab.tsx";
import NotFound from './pages/404.tsx'
import PlannerPage from './pages/Planner'
import Debate from './pages/Debate'
import Help from './pages/Help'
import LearningProfile from './pages/LearningProfile'
import Review from './pages/Review'
import WeeklyReport from './pages/WeeklyReport'
import ParentView from './pages/ParentView'
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<Landing />} />
        <Route path="chat" element={<Chat />} />
        <Route path="quiz" element={<Quiz />} />
        <Route path="tools" element={<Tools />} />
        <Route path="planner" element={<PlannerPage />} />
        <Route path="debate" element={<Debate />} />
        <Route path="cards" element={<FlashCards />} />
        <Route path="exam" element={<ExamLabs />} />
        <Route path="help" element={<Help />} />
        <Route path="profile" element={<LearningProfile />} />
        <Route path="review" element={<Review />} />
        <Route path="report/weekly" element={<WeeklyReport />} />
        <Route path="report/share/:token" element={<ParentView />} />
        {/* Learning Mode Routes - Phase 1 */}
        <Route path="preview" element={<Chat />} />
        <Route path="notes" element={<Tools />} />
        <Route path="podcast" element={<Tools />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  </BrowserRouter>
);