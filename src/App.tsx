import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import { mobileService } from './lib/mobile';
import Navbar from './components/Navbar';
import Analysis from './components/Analysis/index';
import Profile from './components/Profile';
import { Community } from './components/Community/Community';
import Login from './components/Login';
import Landing from './components/Landing';
import { ViewProfile } from './pages/ViewProfile';
import Settings from './components/Settings/Settings';
import { usePrefetch } from './hooks/usePrefetch';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading, initialized } = useAuthStore();

  if (!initialized || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
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
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />
        <main className="flex-1 md:pt-4 overflow-auto pb-20 md:pb-6">
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
        </main>
      </div>
    </Router>
  );
}

export default App;