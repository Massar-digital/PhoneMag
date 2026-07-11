import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserCircleIcon, 
  Bars3Icon, 
  XMarkIcon,
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';
import { SyncStatusIndicator } from '../common/SyncStatusIndicator';
import logo from '../../assets/logo.png';

// interface HeaderProps {
//   onSidebarToggle: () => void;
//   sidebarOpen: boolean;
// }

export const Header = ({ onSidebarToggle, sidebarOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = (user) => {
    if (!user) return 'U';
    const firstName = user.first_name || '';
    const lastName = user.last_name || '';
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    } else if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    } else if (user.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get display name
  const getDisplayName = (user) => {
    if (!user) return 'Utilisateur';
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.username) {
      return user.username;
    }
    return 'Utilisateur';
  };

  // Get user role
  const getUserRole = (user) => {
    const roleLabels = {
      'admin': 'Administrateur',
      'manager': 'Gestionnaire',
      'salesperson': 'Vendeur'
    };
    
    const role = user?.user_role?.role_display?.toLowerCase() || 'utilisateur';
    return roleLabels[role] || user?.user_role?.role_display || 'Utilisateur';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="px-4 py-2 sm:py-2.5 md:px-6">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Logo and menu button */}
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button - Modern animated version */}
            <button
              className="group relative p-2 rounded-lg text-slate-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-300 focus:outline-none border border-slate-200/60 hover:border-primary-200 shadow-sm active:scale-95"
              onClick={onSidebarToggle}
              aria-label={sidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={sidebarOpen}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Bars3Icon 
                  className={`absolute w-5 h-5 transition-all duration-500 ease-in-out transform ${
                    sidebarOpen ? 'opacity-0 rotate-180 scale-50' : 'opacity-100 rotate-0 scale-100'
                  }`} 
                />
                <XMarkIcon 
                  className={`absolute w-5 h-5 transition-all duration-500 ease-in-out transform ${
                    sidebarOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-180 scale-50'
                  }`} 
                />
              </div>
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="aspect-ratio-box aspect-ratio-1-1 w-9">
                <img src={logo} alt="Logo" className="object-contain" />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold text-slate-900 group-hover:text-primary-600 transition-colors">PhoneMAG</span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-medium italic">Management Suite</span>
              </div>
            </Link>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Sync Status Indicator - Disabled as Cloud DB is removed */}
            {/* <SyncStatusIndicator /> */}

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400"
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
                aria-haspopup="true"
                aria-expanded={showUserMenu}
              >
                <div className="aspect-ratio-box aspect-ratio-1-1 w-8 rounded-lg overflow-hidden shadow-md">
                  {user?.profile_picture ? (
                    <img 
                      src={user.profile_picture} 
                      alt={getDisplayName(user)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 flex items-center justify-center text-white font-semibold text-sm">
                      {getInitials(user)}
                    </div>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-700">{getDisplayName(user)}</p>
                  <p className="text-xs text-slate-400">{getUserRole(user)}</p>
                </div>
                <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowUserMenu(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-slate-200/80 shadow-xl shadow-slate-200/50 overflow-hidden z-50 animate-scale-in origin-top-right">
                    <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
                      <p className="font-semibold text-slate-900">{getDisplayName(user)}</p>
                      <p className="text-sm text-slate-500">{user?.email || 'Pas d\'email'}</p>
                    </div>
                    <div className="py-2">
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <UserCircleIcon className="w-5 h-5 text-slate-400" />
                        Profil
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <Cog6ToothIcon className="w-5 h-5 text-slate-400" />
                        Paramètres
                      </Link>
                    </div>
                    <div className="py-2 border-t border-slate-100">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-danger-600 hover:bg-danger-50 transition-colors w-full"
                      >
                        <ArrowRightOnRectangleIcon className="w-5 h-5" />
                        Déconnexion
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
