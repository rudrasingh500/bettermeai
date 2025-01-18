import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Camera, Users, User, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../lib/store';

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
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <Camera className="w-6 h-6" />
              <span className="hidden sm:inline">LooksMaxx AI</span>
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

  return (
    <nav className="bg-white shadow-md relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Camera className="w-6 h-6" />
            <span className="hidden sm:inline">LooksMaxx AI</span>
            <span className="sm:hidden">AI</span>
          </Link>
          
          {user && (
            <>
              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-6">
                <NavLinks />
              </div>

              {/* Mobile Navigation */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden text-gray-600 hover:text-gray-900"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && user && (
        <div className="fixed inset-0 top-16 bg-white md:hidden">
          <div className="container mx-auto px-4 py-4 flex flex-col gap-6">
            <NavLinks />
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;