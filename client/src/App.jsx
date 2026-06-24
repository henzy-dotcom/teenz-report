import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import PeriodManage from './pages/PeriodManage.jsx';
import ReportEdit from './pages/ReportEdit.jsx';
import ParentView from './pages/ParentView.jsx';
import ConsultPublic from './pages/ConsultPublic.jsx';
import ConsultAdmin from './pages/ConsultAdmin.jsx';
import ConsultDetail from './pages/ConsultDetail.jsx';
import ConsultAnswers from './pages/ConsultAnswers.jsx';
import KakaoTemplates from './pages/KakaoTemplates.jsx';
import Attendance from './pages/Attendance.jsx';
import MonthlyReportList from './pages/MonthlyReportList.jsx';
import MonthlyReportDetail from './pages/MonthlyReportDetail.jsx';
import MonthlyReportStats from './pages/MonthlyReportStats.jsx';

export const ToastContext = React.createContext(null);

function AppInner() {
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isParent = location.pathname.startsWith('/report/') || location.pathname.startsWith('/r/');
  const isConsultPublic = location.pathname === '/start' || location.pathname === '/consult';

  return (
    <ToastContext.Provider value={showToast}>
      <div className={isParent ? 'parent-view' : ''} style={isParent ? { minHeight: '100vh', background: 'var(--color-deep-navy)' } : {}}>
        {!isParent && !isConsultPublic && <NavBar />}
        <Routes>
          <Route path="/"                             element={<Dashboard />} />
          <Route path="/students"                     element={<Students />} />
          <Route path="/periods"                      element={<PeriodManage />} />
          <Route path="/reports/:periodId/:studentId" element={<ReportEdit />} />
          <Route path="/report/:token"                element={<ParentView />} />
          <Route path="/r/:shareCode"                 element={<ParentView />} />
          <Route path="/start"                        element={<ConsultPublic />} />
          <Route path="/consult"                      element={<ConsultPublic />} />
          <Route path="/admin/consult"                element={<ConsultAdmin />} />
          <Route path="/admin/consult/answers"        element={<ConsultAnswers />} />
          <Route path="/admin/consult/:id"            element={<ConsultDetail />} />
          <Route path="/kakao-templates"              element={<KakaoTemplates />} />
          <Route path="/attendance"                   element={<Attendance />} />
          <Route path="/monthly-reports"             element={<MonthlyReportList />} />
          <Route path="/monthly-reports/stats"       element={<MonthlyReportStats />} />
          <Route path="/monthly-reports/:id"         element={<MonthlyReportDetail />} />
          <Route path="*"                             element={<Navigate to="/" replace />} />
        </Routes>
        {toast && (
          <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export default function App() {
  return <AppInner />;
}
