import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Pipeline } from './pages/Pipeline';
import { Leads } from './pages/Leads';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { Permissions } from './pages/Permissions';
import { Profile } from './pages/settings/Profile';
import { Notifications } from './pages/settings/Notifications';
import { Security } from './pages/settings/Security';
import { Integrations } from './pages/settings/Integrations';
import { Users } from './pages/settings/Users';
import { Finance } from './pages/Finance';
import { AIChat } from './pages/AIChat';
import { Contracts } from './pages/Contracts';
import { Products } from './pages/Products';
import { Marketing } from './pages/Marketing';
import { Login } from './pages/Login';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { useAuthStore } from './store/useAuthStore';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore();

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Dashboard />} />
          <Route path="/pipeline" element={<Pipeline />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/ai-chat" element={<AIChat />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/products" element={<Products />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/permissions" element={<Permissions />} />
          <Route path="/settings/profile" element={<Profile />} />
          <Route path="/settings/users" element={<Users />} />
          <Route path="/settings/notifications" element={<Notifications />} />
          <Route path="/settings/security" element={<Security />} />
          <Route path="/settings/integrations" element={<Integrations />} />
          <Route path="/analytics" element={<Dashboard />} /> {/* Placeholder */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
