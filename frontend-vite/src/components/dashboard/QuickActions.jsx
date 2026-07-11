import React from 'react';
import { 
  ShoppingCartIcon, 
  PlusCircleIcon, 
  ChartBarIcon
} from '@heroicons/react/24/outline';

// interface QuickActionsProps {
//   onNewSale: () => void;
//   onAddPhone: () => void;
//   onViewReports: () => void;
// }

const quickActions = [
  {
    label: 'Nouvelle vente',
    description: 'Créer une nouvelle vente',
    icon: ShoppingCartIcon,
    color: 'from-success-500 to-success-600',
    bgColor: 'bg-success-50',
    textColor: 'text-success-600',
    shadowColor: 'shadow-success-500/20',
    action: 'onNewSale',
  },
  {
    label: 'Ajouter un produit',
    description: 'Ajouter au stock',
    icon: PlusCircleIcon,
    color: 'from-primary-500 to-primary-600',
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-600',
    shadowColor: 'shadow-primary-500/20',
    action: 'onAddPhone',
  },
  {
    label: 'Voir les rapports',
    description: 'Analyses et aperçus',
    icon: ChartBarIcon,
    color: 'from-secondary-500 to-secondary-600',
    bgColor: 'bg-secondary-50',
    textColor: 'text-secondary-600',
    shadowColor: 'shadow-secondary-500/20',
    action: 'onViewReports',
  },
];

export const QuickActions = ({
  onNewSale,
  onAddPhone,
  onViewReports
}) => {
  const handlers = {
    onNewSale,
    onAddPhone,
    onViewReports,
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={handlers[action.action]}
              className="group relative flex flex-col items-center p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-transparent hover:bg-gradient-to-br hover:from-white hover:to-slate-50 transition-all duration-300 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            >
              {/* Icon container */}
              <div className={`w-14 h-14 rounded-2xl ${action.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-7 h-7 ${action.textColor}`} />
              </div>
              
              {/* Label */}
              <span className="font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                {action.label}
              </span>
              
              {/* Description */}
              <span className="text-xs text-slate-500 mt-1">
                {action.description}
              </span>

              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            </button>
          );
        })}
      </div>
    </div>
  );
};
