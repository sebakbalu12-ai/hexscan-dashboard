import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import { Skeleton } from './components/ui/Controls';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Pins from './pages/Pins';
import PinDetail from './pages/PinDetail';
import Detections from './pages/Detections';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Support from './pages/Support';
import NotFound from './pages/NotFound';

function AdminOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!user || user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/dashboard" element={<AppShell />}>
        <Route index element={<Overview />} />
        <Route path="pins" element={<Pins />} />
        <Route path="pins/:code" element={<PinDetail />} />
        <Route path="detections" element={<Detections />} />
        <Route path="settings" element={<Settings />} />
        <Route path="support" element={<Support />} />
        <Route
          path="admin"
          element={
            <AdminOnly>
              <Admin />
            </AdminOnly>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
