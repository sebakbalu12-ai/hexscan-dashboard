import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Skeleton } from '../ui/Controls';
import { useAuth } from '../../context/AuthContext';

/** Authenticated layout: sidebar + topbar + routed content. */
export function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center gap-4">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {mobileNav && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileNav(false)} aria-hidden="true" />
          <div className="relative z-10 animate-fade-in">
            <Sidebar onNavigate={() => setMobileNav(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileNav(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
          <div className="mx-auto w-full max-w-[1180px] animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
