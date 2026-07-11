import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = () => {
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
  const getDisplayName = () => {
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
  const getUserRole = () => {
    if (!user?.user_role?.role_display) return 'Utilisateur';
    return user.user_role.role_display;
  };

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Profil</h1>
          <p className="text-slate-500 font-medium mt-1">Gérez les informations de votre compte personnel</p>
        </div>
        <Link
          to="/settings"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-200 transition-all active:scale-95"
        >
          <Cog6ToothIcon className="w-5 h-5" />
          Paramètres du site
        </Link>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <div className="aspect-ratio-box aspect-ratio-1-1 w-28 rounded-2xl overflow-hidden shadow-2xl transform group-hover:scale-105 transition-transform duration-500">
                {user?.profile_picture ? (
                  <img 
                    src={user.profile_picture} 
                    alt={getDisplayName()}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 flex items-center justify-center text-white font-black text-4xl shadow-inner">
                    {getInitials()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-3">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">{getDisplayName()}</h2>
                <p className="text-lg text-slate-500 font-medium">{user?.email || 'Pas d\'email'}</p>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-bold bg-primary-50 text-primary-700 border border-primary-100 shadow-sm">
                  {getUserRole()}
                </span>
                <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-sm font-bold bg-slate-50 text-slate-600 border border-slate-200 shadow-sm">
                  ID: {user?.username || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 px-8 py-6 bg-slate-50/30">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Statut</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-sm text-green-700 font-bold">Compte Actif</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Membre depuis</p>
              <p className="text-sm text-slate-700 font-bold">
                {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
              </p>
            </div>
            <div className="hidden lg:block space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Dernière activité</p>
              <p className="text-sm text-slate-700 font-bold">Aujourd'hui</p>
            </div>
            <div className="hidden lg:block space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sécurité</p>
              <p className="text-sm text-blue-600 font-bold italic">Protégé</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
        <Link
          to="/settings"
          className="bg-white p-[var(--spacing-md)] rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-primary-200 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-600 group-hover:rotate-12 transition-all duration-300">
              <Cog6ToothIcon className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Paramètres</h3>
              <p className="text-sm text-slate-500">Gérer la boutique et les préférences</p>
            </div>
          </div>
        </Link>

        <Link
          to="/settings"
          className="bg-white p-[var(--spacing-md)] rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:rotate-12 transition-all duration-300">
              <UserCircleIcon className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Compte</h3>
              <p className="text-sm text-slate-500">Voir les détails du compte</p>
            </div>
          </div>
        </Link>

        <button 
          onClick={handleLogout}
          className="bg-white p-[var(--spacing-md)] rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-danger-200 hover:-translate-y-1 transition-all duration-300 text-left group"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-danger-100 flex items-center justify-center group-hover:bg-danger-600 group-hover:rotate-12 transition-all duration-300">
              <ArrowRightOnRectangleIcon className="w-7 h-7 text-danger-600 group-hover:text-white transition-colors" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Se déconnecter</h3>
              <p className="text-sm text-slate-500">Déconnexion de votre compte</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default Profile;
