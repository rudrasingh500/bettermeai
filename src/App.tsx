import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './lib/store';
import Navbar from './components/Navbar';
import Analysis from './components/Analysis/index';
import Profile from './components/Profile';
import { Community } from './components/Community/Community';
import Login from './components/Login';
import Landing from './components/Landing';
import { ViewProfile } from './pages/ViewProfile';
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

  if (!initialized || isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
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
          <Route path="/profile/:username" element={<ViewProfile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;