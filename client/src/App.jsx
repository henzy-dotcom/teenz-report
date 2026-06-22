import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import PeriodManage from './pages/PeriodManage.jsx';
import ReportEdit from './pages/ReportEdit.jsx';
import ParentView from './pages/ParentView.jsx';

export const ToastContext = React.createContext(null);

function AppInner() {
  const location = useLocation();
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isParent = location.pathname.startsWith('/report/') || location.pathname.startsWith('/r/');

  return (
    <ToastContext.Provider value={showToast}>
      <div className={isParent ? 'parent-view' : ''} style={isParent ? { minHeight: '100vh', background: 'var(--color-deep-navy)' } : {}}>
        {!isParent && <NavBar />}
        <Routes>
          <Route path="/"                             element={<Dashboard />} />
          <Route path="/students"                     element={<Students />} />
          <Route path="/periods"                      element={<PeriodManage />} />
          <Route path="/reports/:periodId/:studentId" element={<ReportEdit />} />
          <Route path="/report/:token"                element={<ParentView />} />
          <Route path="/r/:shareCode"                 element={<ParentView />} />
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
