import React, { useState, useEffect } from 'react';
import { SidebarNavigation } from './SidebarNavigation';
import { Header } from './Header';

// interface AppLayoutProps {
//   children: React.ReactNode;
// }

export const AppLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-primary-50/20">
      {/* Decorative background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-72 h-72 bg-secondary-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-success-200/10 rounded-full blur-3xl" />
      </div>

      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="skip-link"
      >
        Passer au contenu principal
      </a>

      {/* Header */}
      <Header 
        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} 
        sidebarOpen={sidebarOpen}
      />

      {/* Main layout container */}
      <div className="flex flex-1 relative">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Sidebar */}
        <div className="z-30 h-full flex items-stretch">
          <SidebarNavigation
            open={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            isMobile={isMobile}
          />
        </div>

        {/* Main content area */}
        <main 
          id="main-content" 
          className={`
            flex-1 p-0 overflow-hidden h-full min-h-0
            transition-all duration-300 ease-out z-10
          `}
        >
          <div className="h-full w-full overflow-y-auto animate-fade-in shadow-inner bg-slate-50/50 p-[var(--container-padding)]">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="relative bg-white/80 backdrop-blur-md border-t border-slate-200/60 py-4 text-center">
        <p className="text-sm text-slate-500">
          &copy; {new Date().getFullYear()}{' '}
          <span className="font-semibold text-gradient">PhoneMag</span>
          {' '}— Système de Gestion de Magasin de Téléphones
        </p>
      </footer>
    </div>
  );
};
