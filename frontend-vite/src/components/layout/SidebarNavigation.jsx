import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import {
  HomeIcon,
  DevicePhoneMobileIcon,
  ShoppingCartIcon,
  UsersIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  WrenchIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  XMarkIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

const menuItems = [
  {
    label: 'Tableau de bord',
    icon: HomeIcon,
    path: '/',
    color: 'from-primary-500 to-primary-600'
  },
  {
    label: 'Produits',
    icon: DevicePhoneMobileIcon,
    color: 'from-secondary-500 to-secondary-600',
    submenu: [
      { label: 'Tous les produits', path: '/phones' },
      { label: 'Ajouter un produit', path: '/phones/add' },
    ],
  },
  {
    label: 'Ventes',
    icon: ShoppingCartIcon,
    color: 'from-success-500 to-success-600',
    submenu: [
      { label: 'Toutes les ventes', path: '/sales' },
      { label: 'Nouvelle vente', path: '/sales', state: { openNewSale: true } },
      { label: 'Point de vente', path: '/pos' },
    ],
  },
  {
    label: 'Dépenses',
    icon: BanknotesIcon,
    path: '/expenses',
    color: 'from-danger-500 to-danger-600'
  },
  {
    label: 'Réparations',
    icon: WrenchIcon,
    path: '/repairs',
    color: 'from-indigo-500 to-indigo-600'
  },
  {
    label: 'Échanges',
    icon: ArrowsRightLeftIcon,
    path: '/exchange',
    color: 'from-teal-500 to-teal-600'
  },
  {
    label: 'Inventaire',
    icon: ClipboardDocumentListIcon,
    color: 'from-warning-500 to-warning-600',
    submenu: [
      { label: 'Tout l\'inventaire', path: '/inventory' },
      { label: 'Historique du stock', path: '/inventory/history' },
      { label: 'Fournisseurs', path: '/suppliers' },
    ],
  },
  { 
    label: 'Clients', 
    icon: UsersIcon, 
    path: '/customers',
    color: 'from-cyan-500 to-cyan-600'
  },
  { 
    label: 'Rapports', 
    icon: ChartBarIcon, 
    path: '/reports',
    color: 'from-pink-500 to-pink-600'
  },
  { 
    label: 'Paramètres', 
    icon: Cog6ToothIcon, 
    path: '/settings',
    color: 'from-slate-500 to-slate-600'
  },
  {
    label: 'Signaler un problème',
    icon: ChatBubbleLeftRightIcon,
    color: 'from-amber-500 to-amber-600',
    isSupport: true
  },
];

export const SidebarNavigation = ({
  open,
  onToggle,
  isMobile = false
}) => {
  const [expanded, setExpanded] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const location = useLocation();

  const isActiveRoute = (path, submenu) => {
    if (path) return location.pathname === path;
    if (submenu) return submenu.some(sub => location.pathname === sub.path);
    return false;
  };

  const isSidebarExpanded = open || (isHovered && !isMobile);

  return (
    <aside
      onMouseEnter={() => !open && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'flex flex-col bg-white/70 backdrop-blur-xl border-r border-slate-200/60 shadow-xl lg:shadow-none transition-all duration-300 ease-out z-30',
        isMobile
          ? clsx(
              'fixed left-0 top-0 h-full z-50 overflow-hidden bg-white/95',
              open ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
            )
          : 'relative',
        isSidebarExpanded ? 'w-72' : 'w-20'
      )}
    >
      {/* Mobile Close Button */}
      {isMobile && open && (
        <button
          onClick={onToggle}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors z-50"
          aria-label="Fermer le menu"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      )}

      {/* Navigation items */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" role="navigation" aria-label="Main navigation">
        <ul className="space-y-1.5" role="menubar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.path, item.submenu);
            const isExpanded = expanded === item.label;
            
            return (
              <li key={item.label} role="none">
                {item.isSupport ? (
                  <button
                    onClick={() => setIsSupportModalOpen(true)}
                    className={clsx(
                      'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
                      'text-slate-600 hover:bg-slate-100'
                    )}
                    role="menuitem"
                  >
                    <div className={clsx(
                      'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                      'bg-slate-100 group-hover:bg-gradient-to-br group-hover:' + item.color + ' group-hover:text-white'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSidebarExpanded && (
                      <span className="font-medium transition-all duration-200 whitespace-nowrap overflow-hidden text-slate-700">
                        {item.label}
                      </span>
                    )}
                  </button>
                ) : item.path ? (
                  <Link
                    to={item.path}
                    state={item.state}
                    onClick={isMobile ? onToggle : undefined}
                    className={clsx(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
                      isActive
                        ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg shadow-primary-500/20'
                        : 'text-slate-600 hover:bg-slate-100'
                    )}
                    role="menuitem"
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className={clsx(
                      'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                      isActive
                        ? 'bg-white/20'
                        : 'bg-slate-100 group-hover:bg-gradient-to-br group-hover:' + item.color + ' group-hover:text-white'
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSidebarExpanded && (
                      <span className={clsx(
                        'font-medium transition-all duration-200 whitespace-nowrap overflow-hidden',
                        isActive ? 'text-white' : 'text-slate-700'
                      )}>
                        {item.label}
                      </span>
                    )}
                  </Link>
                ) : (
                  <>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : item.label)}
                      className={clsx(
                        'group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
                        isActive
                          ? 'bg-gradient-to-r ' + item.color + ' text-white shadow-lg'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                      aria-expanded={isExpanded}
                      aria-haspopup="true"
                      role="menuitem"
                    >
                      <div className={clsx(
                        'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200',
                        isActive
                          ? 'bg-white/20'
                          : 'bg-slate-100 group-hover:bg-gradient-to-br group-hover:' + item.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {isSidebarExpanded && (
                        <>
                          <span className={clsx(
                            'flex-1 text-left font-medium transition-all duration-200 whitespace-nowrap overflow-hidden',
                            isActive ? 'text-white' : 'text-slate-700'
                          )}>
                            {item.label}
                          </span>
                          <ChevronDownIcon className={clsx(
                            'w-4 h-4 transition-transform duration-200',
                            isExpanded && 'rotate-180'
                          )} />
                        </>
                      )}
                    </button>
                    
                    {/* Submenu */}
                    {item.submenu && isSidebarExpanded && isExpanded && (
                      <ul
                        className="mt-1 ml-6 pl-6 border-l-2 border-slate-200 space-y-1 animate-slide-down"
                        role="menu"
                      >
                        {item.submenu.map((sub) => {
                          const isSubActive = location.pathname === sub.path && (
                            sub.label === 'Nouvelle vente' 
                              ? !!location.state?.openNewSale 
                              : !location.state?.openNewSale
                          );
                          const isExternal = sub.path.startsWith('mailto:') || sub.path.startsWith('https://wa.me/') || sub.path.startsWith('http');
                          
                          const linkContent = (
                            <span className={clsx(
                              'block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                              'focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2',
                              isSubActive
                                ? 'bg-primary-50 text-primary-700 border-l-2 border-primary-500 -ml-[2px]'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            )}>
                              {sub.label}
                            </span>
                          );

                          return (
                            <li key={sub.label} role="none">
                              {isExternal ? (
                                <a
                                  href={sub.path}
                                  className="block"
                                  role="menuitem"
                                >
                                  {linkContent}
                                </a>
                              ) : (
                                <Link
                                  to={sub.path}
                                  state={sub.state}
                                  onClick={isMobile ? onToggle : undefined}
                                  className="block"
                                  role="menuitem"
                                  aria-current={isSubActive ? 'page' : undefined}
                                >
                                  {linkContent}
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Collapse/Expand Toggle (Desktop only) */}
      {!isMobile && (
        <div className="p-4 border-t border-slate-100 mt-auto">
          <button
            onClick={onToggle}
            className={clsx(
              'w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all duration-300',
              'bg-slate-50 text-slate-500 hover:bg-primary-50 hover:text-primary-600 border border-slate-200/60 hover:border-primary-200',
              'group overflow-hidden'
            )}
            title={open ? "Réduire le menu" : "Agrandir le menu"}
          >
            {isSidebarExpanded ? (
              <>
                <ChevronLeftIcon className="w-5 h-5 group-hover:-translate-x-1 transition-transform flex-shrink-0" />
                <span className="font-semibold text-sm whitespace-nowrap">Réduire le menu</span>
              </>
            ) : (
              <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            )}
          </button>
        </div>
      )}

      {/* Support Modal */}
      <Modal
        open={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        title="Contacter le Support"
        size="sm"
        body={
          <div className="flex flex-col items-center text-center p-4">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
              <svg 
                className="w-12 h-12 text-emerald-600" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.067 2.877 1.215 3.076.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            
            <h4 className="text-xl font-black text-slate-900 mb-2">WhatsApp Official</h4>
            <p className="text-slate-500 mb-6">Scannez le code QR pour discuter avec nous ou utilisez le numéro ci-dessous.</p>
            
            <div className="bg-white p-4 rounded-3xl shadow-inner border border-slate-100 mb-6">
              <div className="aspect-ratio-box aspect-ratio-1-1 w-40 mx-auto">
                <img 
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://wa.me/213699284128" 
                  alt="WhatsApp QR Code"
                />
              </div>
            </div>
            
            <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-widest block mb-1">Numéro WhatsApp</span>
              <a 
                href="https://wa.me/213699284128" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-lg font-black text-primary-600 hover:text-primary-700 transition-colors"
              >
                +213 699 28 41 28
              </a>
            </div>
          </div>
        }
        footer={
          <Button
            onClick={() => setIsSupportModalOpen(false)}
            variant="ghost"
            className="w-full"
          >
            Fermer
          </Button>
        }
      />
    </aside>
  );
};
