import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { normalizeRole } from './utils/rbac';

import { LoginPage } from './components/pages/LoginPage';
import { DashboardPage } from './components/pages/DashboardPage';
import { LeadsPage } from './components/pages/LeadsPage';
import { ContactsPage } from './components/pages/ContactsPage';
import { ClientsPage } from './components/pages/ClientsPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { MeetingsPage } from './components/pages/MeetingsPage';
import { ProjectsPage } from './components/pages/ProjectsPage';
import { TasksPage } from './components/pages/TasksPage';
import { DocumentsPage } from './components/pages/DocumentsPage';
import { InvoicesPage } from './components/pages/InvoicesPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { UsersPage } from './components/pages/UsersPage';
import { RolesPage } from './components/pages/RolesPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { ActivityTimelinePage } from './components/pages/ActivityTimelinePage';
import { ProposalsPage } from './components/pages/ProposalsPage';
import { ProposalGeneratorPage } from './components/pages/ProposalGeneratorPage';
import { ClientPortalPage } from './components/pages/ClientPortalPage';
import { ManagerDashboardPage } from './components/pages/ManagerDashboardPage';

// Main App Layout Wrapper
const MainLayout: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-bold text-xs gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Connecting to REST API & Validating JWT Session...</span>
      </div>
    );
  }

  if (!isAuthenticated && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && location.pathname === '/login') {
    const canonical = normalizeRole(user?.role);
    return <Navigate to={canonical === 'ROLE_CLIENT' ? '/client-portal' : '/dashboard'} replace />;
  }

  const defaultHome = normalizeRole(user?.role) === 'ROLE_CLIENT' ? '/client-portal' : '/dashboard';

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
        <Navbar />

        <div className="flex-1 overflow-y-auto">
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute routePath="/dashboard">
                  {normalizeRole(user?.role) === 'ROLE_CLIENT' ? (
                    <ClientPortalPage />
                  ) : normalizeRole(user?.role) === 'ROLE_ADMIN' ? (
                    <ManagerDashboardPage />
                  ) : (
                    <DashboardPage />
                  )}
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager-dashboard"
              element={
                <ProtectedRoute routePath="/manager-dashboard">
                  <ManagerDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/client-portal"
              element={
                <ProtectedRoute routePath="/client-portal">
                  <ClientPortalPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leads"
              element={
                <ProtectedRoute routePath="/leads">
                  <LeadsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/contacts"
              element={
                <ProtectedRoute routePath="/contacts">
                  <ContactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute routePath="/clients">
                  <ClientsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/me" element={<ProfilePage />} />
            <Route
              path="/meetings"
              element={
                <ProtectedRoute routePath="/meetings">
                  <MeetingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/projects"
              element={
                <ProtectedRoute routePath="/projects">
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute routePath="/tasks">
                  <TasksPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/documents"
              element={
                <ProtectedRoute routePath="/documents">
                  <DocumentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices"
              element={
                <ProtectedRoute routePath="/invoices">
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute routePath="/reports">
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute routePath="/users">
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/roles"
              element={
                <ProtectedRoute routePath="/roles">
                  <RolesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute routePath="/settings">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route
              path="/timeline"
              element={
                <ProtectedRoute routePath="/timeline">
                  <ActivityTimelinePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposals"
              element={
                <ProtectedRoute routePath="/proposals">
                  <ProposalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/proposal-generator"
              element={
                <ProtectedRoute routePath="/proposals">
                  <ProposalsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to={defaultHome} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
