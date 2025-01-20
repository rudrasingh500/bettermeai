import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { mobileService } from './lib/mobile';
import { Navbar } from './components/layout/Navbar';
import { usePrefetch } from './hooks/usePrefetch';

// Lazy load components
const Analysis = React.lazy(() => import('./components/Analysis'));
const Profile = React.lazy(() => import('./components/UserProfile/UserProfile').then(m => ({ default: m.UserProfile })));
const Community = React.lazy(() => import('./components/Community/Community').then(m => ({ default: m.Community })));
const Login = React.lazy(() => import('./components/auth/Login'));
const Landing = React.lazy(() => import('./components/auth/Landing'));
const ViewProfile = React.lazy(() => import('./pages/ViewProfile').then(m => ({ default: m.ViewProfile })));
const Settings = React.lazy(() => import('./components/Settings/Settings'));

// Loading component
const PageLoader = () => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, initialized } = useAuthStore();

  if (!initialized || isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

function App() {
  const { user, isLoading, initialized } = useAuthStore();

  // Start prefetching data
  usePrefetch();

  // Initialize mobile features
  useEffect(() => {
    mobileService.initialize().catch(console.error);
  }, []);

  if (!initialized || isLoading) {
    return <PageLoader />;
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 md:pt-4 overflow-auto pb-20 md:pb-6">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route 
                path="/" 
                element={
                  user ? (
                    <Navigate to="/analysis" replace />
                  ) : (
                    <Landing />
                  )
                } 
              />
              <Route 
                path="/login" 
                element={
                  user ? (
                    <Navigate to="/analysis" replace />
                  ) : (
                    <Login />
                  )
                } 
              />
              <Route
                path="/analysis"
                element={
                  <ProtectedRoute>
                    <Analysis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/community"
                element={
                  <ProtectedRoute>
                    <Community />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route path="/profile/:username" element={<ViewProfile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </Router>
  );
}

export default App;