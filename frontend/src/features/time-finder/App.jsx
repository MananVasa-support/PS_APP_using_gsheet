import { Route, Routes, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import FirstPage from './components/FirstPage.jsx';
import AddRoutine from './components/AddRoutine.jsx';
import AssessmentForm from './components/AssessmentForm.jsx';
import SelectRoutines from './components/SelectRoutines.jsx';
import RecurrencePage from './components/RecurrencePage.jsx';
import AlignRoutines from './components/AlignRoutines.jsx';
import PreviousAssessment from './components/PreviousAssessment.jsx';
import AssessmentDetail from './components/AssessmentDetail.jsx';
import EditAssessment from './components/EditAssessment.jsx';
import NextStep from './components/NextStep.jsx';
import SavingTime from './components/SavingTime.jsx';
import AssessmentPage from './components/AssessmentPage.jsx';
import FirstSession from './components/FirstSession.jsx';
import RoutineAdjustment from './components/RoutineAdjustment.jsx';
import EditableTable from './components/EditableTable.jsx';
import Dashboard from './components/Dashboard.jsx';

/**
 * Time Finder feature root. The shell owns the router and mounts this subtree at
 * /time-finder/*, so route paths are RELATIVE (no leading slash).
 */
export default function TimeFinderApp() {
  return (
    <Routes>
      {/* All pages share the left sidebar layout */}
      <Route element={<Layout />}>
        {/* Home — the Time Finder routine-selection flow */}
        <Route path="" element={<SelectRoutines />} />
        <Route path="first" element={<FirstPage />} />
        {/* New assessment flow: form -> routine checklist */}
        <Route path="add-routine" element={<AddRoutine />} />
        <Route path="new-assessment" element={<AssessmentForm />} />
        <Route path="select-routines" element={<SelectRoutines />} />
        <Route path="recurrence" element={<RecurrencePage />} />
        <Route path="align-routines" element={<AlignRoutines />} />
        <Route path="previous-assessment" element={<PreviousAssessment />} />
        <Route path="assessment/:id" element={<AssessmentDetail />} />
        <Route path="edit-assessment" element={<EditAssessment />} />
        <Route path="next-step" element={<NextStep />} />
        <Route path="saving-time" element={<SavingTime />} />
        <Route path="assessment" element={<AssessmentPage />} />
        {/* Existing multi-step flow */}
        <Route path="session" element={<FirstSession />} />
        <Route path="adjust" element={<RoutineAdjustment />} />
        <Route path="table" element={<EditableTable />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/time-finder" replace />} />
      </Route>
    </Routes>
  );
}
