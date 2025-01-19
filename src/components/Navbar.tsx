import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Camera, Users, User, LogOut, Settings } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { NotificationsPopover } from './NotificationsPopover';

const Navbar = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Don't show navbar on landing page
  if (location.pathname === '/') return null;

  // Don't show full navbar on login page
  if (location.pathname === '/login') {
    return (
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Camera className="w-6 h-6" />
              <span className="hidden sm:inline">BetterMe.ai</span>
              <span className="sm:hidden">AI</span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const NavLinks = () => (
    <>
      <Link
        to="/analysis"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        onClick={() => setIsMenuOpen(false)}
      >
        <Camera className="w-5 h-5" />
        <span>Analysis</span>
      </Link>
      
      <Link
        to="/community"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        onClick={() => setIsMenuOpen(false)}
      >
        <Users className="w-5 h-5" />
        <span>Community</span>
      </Link>
      
      <Link
        to="/profile"
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        onClick={() => setIsMenuOpen(false)}
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </Link>

      <NotificationsPopover />

      <button
        onClick={() => {
          setIsMenuOpen(false);
          handleSignOut();
        }}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <LogOut className="w-5 h-5" />
        <span>Sign Out</span>
      </button>
    </>
  );

  const MobileNavLinks = () => {
    const isActive = (path: string) => location.pathname === path;
    
    return (
      <>
        <Link
          to="/analysis"
          className={`flex flex-col items-center gap-1 ${
            isActive('/analysis') 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setIsMenuOpen(false)}
        >
          <Camera className="w-6 h-6" />
          <span className="text-xs">Analysis</span>
        </Link>
        
        <Link
          to="/community"
          className={`flex flex-col items-center gap-1 ${
            isActive('/community') 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setIsMenuOpen(false)}
        >
          <Users className="w-6 h-6" />
          <span className="text-xs">Community</span>
        </Link>
        
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-1 ${
            isActive('/profile') 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setIsMenuOpen(false)}
        >
          <User className="w-6 h-6" />
          <span className="text-xs">Profile</span>
        </Link>

        <Link
          to="/settings"
          className={`flex flex-col items-center gap-1 ${
            isActive('/settings') 
              ? 'text-blue-600' 
              : 'text-gray-600 hover:text-blue-600'
          }`}
          onClick={() => setIsMenuOpen(false)}
        >
          <Settings className="w-6 h-6" />
          <span className="text-xs">Settings</span>
        </Link>
      </>
    );
  };

  return (
    <>
      {/* Top Bar (both mobile and desktop) */}
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Camera className="w-6 h-6" />
              <span className="hidden sm:inline">BetterMe.ai</span>
              <span className="sm:hidden">AI</span>
            </Link>
            
            {user && (
              <>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                  <NavLinks />
                </div>

                {/* Mobile Notifications */}
                <div className="md:hidden">
                  <NotificationsPopover />
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Navigation - Bottom */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
          <div className="flex justify-around items-center h-14 px-4">
            <MobileNavLinks />
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;