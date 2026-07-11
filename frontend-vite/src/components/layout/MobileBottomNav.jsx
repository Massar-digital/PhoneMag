import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  DevicePhoneMobileIcon as DevicePhoneMobileIconSolid,
  ShoppingBagIcon as ShoppingBagIconSolid,
  CurrencyDollarIcon as CurrencyDollarIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/react/24/solid';

/**
 * MobileBottomNav - Sticky bottom navigation for mobile devices
 * Only shown on mobile viewports
 */
export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      name: 'Accueil',
      path: '/mobile',
      icon: HomeIcon,
      iconSolid: HomeIconSolid
    },
    {
      name: 'Produits',
      path: '/phones',
      icon: DevicePhoneMobileIcon,
      iconSolid: DevicePhoneMobileIconSolid
    },
    {
      name: 'Vente',
      path: '/pos',
      icon: CurrencyDollarIcon,
      iconSolid: CurrencyDollarIconSolid,
      highlight: true
    },
    {
      name: 'Stock',
      path: '/inventory',
      icon: ShoppingBagIcon,
      iconSolid: ShoppingBagIconSolid
    },
    {
      name: 'Rapports',
      path: '/reports',
      icon: ChartBarIcon,
      iconSolid: ChartBarIconSolid
    }
  ];

  const isActive = (path) => {
    if (path === '/mobile') {
      return location.pathname === '/' || location.pathname === '/mobile';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-50 safe-area-inset-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = active ? item.iconSolid : item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 relative transition-all active:scale-95 ${
                active ? 'text-primary-600' : 'text-slate-400'
              } ${item.highlight ? 'transform -translate-y-2' : ''}`}
            >
              {item.highlight && (
                <div className="absolute -top-6 w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center shadow-lg">
                  <Icon className="w-7 h-7 text-white" />
                </div>
              )}
              
              {!item.highlight && (
                <>
                  <Icon className={`w-6 h-6 ${active ? 'scale-110' : ''} transition-transform`} />
                  <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                    {item.name}
                  </span>
                  {active && (
                    <div className="absolute bottom-0 w-12 h-1 bg-primary-600 rounded-t-full" />
                  )}
                </>
              )}
              
              {item.highlight && !active && (
                <span className="text-xs font-medium mt-1">POS</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
