import React, { useState } from 'react';
import { Button } from '../common/Button';
import AdjustStockModal from '../inventory/AdjustStockModal';

import { ExclamationTriangleIcon, ArrowPathIcon, CubeIcon } from '@heroicons/react/24/outline';

// interface LowStockAlertsProps {
//   items: LowStockItem[];
//   loading: boolean;
//   onRestock?: () => void;
// }

export const LowStockAlerts = ({ items, loading, onRestock }) => {
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleRestockClick = (item) => {
    setSelectedItem(item);
    setShowRestockModal(true);
  };

  const handleRestockSuccess = () => {
    if (onRestock) {
      onRestock();
    }
  };
  if (loading) {
    return (
      <div className="p-6">
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              </div>
              <div className="h-8 bg-slate-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success-100 flex items-center justify-center mb-4">
            <CubeIcon className="w-8 h-8 text-success-600" />
          </div>
          <p className="font-medium text-slate-900 mb-1">Niveaux de stock sains</p>
          <p className="text-sm text-slate-500">Aucun article ne nécessite de réapprovisionnement</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-3">
        {items.slice(0, 5).map((item) => {
          const stockPercentage = (item.stock_quantity / item.reorder_level) * 100;
          const isOutOfStock = item.stock_quantity === 0;
          const isCritical = stockPercentage <= 50;
          
          return (
            <div
              key={item.id}
              className={`
                flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:shadow-md
                ${isOutOfStock 
                  ? 'bg-danger-50 border-danger-200' 
                  : isCritical 
                    ? 'bg-warning-50 border-warning-200' 
                    : 'bg-amber-50 border-amber-200'
                }
              `}
            >
              {/* Status icon */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0
                ${isOutOfStock 
                  ? 'bg-danger-100' 
                  : isCritical 
                    ? 'bg-warning-100' 
                    : 'bg-amber-100'
                }
              `}>
                <ExclamationTriangleIcon className={`
                  w-6 h-6
                  ${isOutOfStock 
                    ? 'text-danger-600' 
                    : isCritical 
                      ? 'text-warning-600' 
                      : 'text-amber-600'
                  }
                `} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  {item.phone_details ? `${item.phone_details.brand} ${item.phone_details.model}` : 'Produit inconnu'}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`
                    text-xs font-medium px-2 py-0.5 rounded-full
                    ${isOutOfStock 
                      ? 'bg-danger-200 text-danger-700' 
                      : isCritical 
                        ? 'bg-warning-200 text-warning-700' 
                        : 'bg-amber-200 text-amber-700'
                    }
                  `}>
                    {isOutOfStock ? 'Rupture de stock' : `${item.stock_quantity} restant(s)`}
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    Seuil : {item.reorder_level}
                  </span>
                </div>
              </div>
              
              {/* Action */}
              <Button 
                size="sm" 
                variant={isOutOfStock ? 'danger' : 'secondary'}
                onClick={() => handleRestockClick(item)}
                className="flex-shrink-0"
              >
                <span className="hidden xs:inline">Réapprovisionner</span>
                <ArrowPathIcon className="w-5 h-5 xs:hidden" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Restock Modal */}
      <AdjustStockModal
        isOpen={showRestockModal}
        onClose={() => setShowRestockModal(false)}
        inventoryItem={selectedItem}
        onSuccess={handleRestockSuccess}
      />
    </div>
  );
};
