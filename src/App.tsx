import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { SettingsLayout } from './components/layout/SettingsLayout';
import { useAuthStore } from './store/useAuthStore';
import { supabase } from './lib/supabase';
import { ChangePasswordModal } from './components/auth/ChangePasswordModal';
import { Loader2 } from 'lucide-react';

// Lazy loading all pages to dramatically reduce initial bundle size
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Pipeline = lazy(() => import('./pages/Pipeline').then(m => ({ default: m.Pipeline })));
const Tasks = lazy(() => import('./pages/Tasks').then(m => ({ default: m.Tasks })));
const Permissions = lazy(() => import('./pages/Permissions').then(m => ({ default: m.Permissions })));
const Profile = lazy(() => import('./pages/settings/Profile').then(m => ({ default: m.Profile })));
const Notifications = lazy(() => import('./pages/settings/Notifications').then(m => ({ default: m.Notifications })));
const Security = lazy(() => import('./pages/settings/Security').then(m => ({ default: m.Security })));
const Integrations = lazy(() => import('./pages/settings/Integrations').then(m => ({ default: m.Integrations })));
const Users = lazy(() => import('./pages/settings/Users').then(m => ({ default: m.Users })));
const ManagePipelines = lazy(() => import('./pages/settings/ManagePipelines').then(m => ({ default: m.ManagePipelines })));
const ManageStageChecklists = lazy(() => import('./pages/settings/ManageStageChecklists').then(m => ({ default: m.ManageStageChecklists })));
const ManageCargos = lazy(() => import('./pages/settings/ManageCargos').then(m => ({ default: m.ManageCargos })));
const ManageCategories = lazy(() => import('./pages/settings/ManageCategories').then(m => ({ default: m.ManageCategories })));
const ManageActivityCategories = lazy(() => import('./pages/settings/ManageActivityCategories').then(m => ({ default: m.ManageActivityCategories })));
const Finance = lazy(() => import('./pages/Finance').then(m => ({ default: m.Finance })));
const AIChat = lazy(() => import('./pages/AIChat').then(m => ({ default: m.AIChat })));
const Contracts = lazy(() => import('./pages/Contracts').then(m => ({ default: m.Contracts })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Marketing = lazy(() => import('./pages/Marketing').then(m => ({ default: m.Marketing })));
const Turmas = lazy(() => import('./pages/Turmas').then(m => ({ default: m.Turmas })));
const TimeClock = lazy(() => import('./pages/TimeClock').then(m => ({ default: m.TimeClock })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const PublicForm = lazy(() => import('./pages/PublicForm').then(m => ({ default: m.PublicForm })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const LeadRotationSettings = lazy(() => import('./pages/settings/LeadRotationSettings').then(m => ({ default: m.LeadRotationSettings })));
const ManageSquads = lazy(() => import('./pages/settings/ManageSquads').then(m => ({ default: m.ManageSquads })));
const AuditLogs = lazy(() => import('./pages/settings/AuditLogs').then(m => ({ default: m.AuditLogs })));

const SuspenseFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore();
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('perfis')
      .select('must_change_password')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setMustChangePassword(data?.must_change_password === true);
        setProfileChecked(true);
      });
  }, [user?.id]);

  if (!initialized || loading) {
    return <SuspenseFallback />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      {children}
      {profileChecked && mustChangePassword && (
        <ChangePasswordModal
          userId={user.id}
          onSuccess={() => setMustChangePassword(false)}
        />
      )}
    </>
  );
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Suspense fallback={<SuspenseFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/formulario" element={<PublicForm />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />

            <Route path="/finance" element={<Finance />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/products" element={<Products />} />
            <Route path="/marketing" element={<Marketing />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/ponto" element={<TimeClock />} />
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsLayout />}>
              <Route index element={<Navigate to="/settings/profile" replace />} />
              <Route path="profile" element={<Profile />} />
              <Route path="users" element={<Users />} />
              <Route path="checklists" element={<ManageStageChecklists />} />
              <Route path="turmas" element={<Navigate to="/products" replace />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="security" element={<Security />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="permissions" element={<Permissions />} />
              <Route path="cargos" element={<ManageCargos />} />
              <Route path="pipelines" element={<ManagePipelines />} />
              <Route path="categories" element={<ManageCategories />} />
              <Route path="activity-categories" element={<ManageActivityCategories />} />
              <Route path="rotation" element={<LeadRotationSettings />} />
              <Route path="squads" element={<ManageSquads />} />
              <Route path="audit" element={<AuditLogs />} />
            </Route>
            <Route path="/analytics" element={<Dashboard />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
