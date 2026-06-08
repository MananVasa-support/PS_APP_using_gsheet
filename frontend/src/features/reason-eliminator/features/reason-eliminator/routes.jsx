import { Route } from 'react-router-dom';
import HomePage from './pages/HomePage.jsx';
import NewAssessmentPage from './pages/NewAssessmentPage.jsx';
import ViewReasonsPage from './pages/ViewReasonsPage.jsx';
import ReasonsMasterPage from './pages/ReasonsMasterPage.jsx';
import PowerWordMasterPage from './pages/PowerWordMasterPage.jsx';
import PowerWordMissingPage from './pages/PowerWordMissingPage.jsx';
import AssessmentPage from './pages/AssessmentPage.jsx';
import PowerWordPage from './pages/PowerWordPage.jsx';
import SummaryPage from './pages/SummaryPage.jsx';
import PreviousAssessmentsPage from './pages/PreviousAssessmentsPage.jsx';
import PreviousAssessmentDetailPage from './pages/PreviousAssessmentDetailPage.jsx';
import GripTestPage from './pages/GripTestPage.jsx';
import GripHistoryPage from './pages/GripHistoryPage.jsx';
import GripHistoryDetailPage from './pages/GripHistoryDetailPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DeepReviewPage from './pages/DeepReviewPage.jsx';

const reasonEliminatorRoutes = [
  <Route key="home" path="" element={<HomePage />} />,
  <Route key="new" path="new" element={<NewAssessmentPage />} />,
  <Route key="reasons" path="reasons" element={<ViewReasonsPage />} />,
  <Route key="reasons-master" path="reasons-master" element={<ReasonsMasterPage />} />,
  <Route key="power-word-master" path="power-word-master" element={<PowerWordMasterPage />} />,
  <Route key="power-word-missing" path="power-word-missing" element={<PowerWordMissingPage />} />,
  <Route key="assess" path="assess" element={<AssessmentPage />} />,
  <Route key="power-word" path="power-word" element={<PowerWordPage />} />,
  <Route key="summary" path="summary" element={<SummaryPage />} />,
  <Route key="previous" path="previous" element={<PreviousAssessmentsPage />} />,
  <Route key="grip-test" path="grip-test" element={<GripTestPage />} />,
  <Route key="grip-history" path="grip-history" element={<GripHistoryPage />} />,
  <Route
    key="grip-history-detail"
    path="grip-history/:id"
    element={<GripHistoryDetailPage />}
  />,
  <Route key="dashboard" path="dashboard" element={<DashboardPage />} />,
  <Route key="deep-review" path="deep-review" element={<DeepReviewPage />} />,
  <Route
    key="previous-detail"
    path="previous/:id"
    element={<PreviousAssessmentDetailPage />}
  />,
];

export default reasonEliminatorRoutes;
