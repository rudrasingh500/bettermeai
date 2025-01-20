import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

export const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Navigation Links */}
            <div className="flex space-x-8">
              {[
                { path: '/feed', label: 'Feed' },
                { path: '/community', label: 'Community (Beta)' },
                { path: '/analysis', label: 'Analysis' }
              ].map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className="relative inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900"
                >
                  {label}
                  {location.pathname === path && (
                    <motion.div
                      layoutId="navigation-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}; 