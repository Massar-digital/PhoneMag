import React from 'react';
import { Button } from '../common/Button';

import { 
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckBadgeIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

import { getProductEmoji } from '../../utils/productIcons';
import { getPublicUrl } from '../../services/api';

// interface PhoneTableProps {
//   phones: PhoneWithInventory[];
//   selectedPhones: string[];
//   onSelectPhone: (phoneId, selected) => void;
//   onSelectAll: (selected) => void;
//   onEdit: (phoneId) => void;
//   onView: (phoneId) => void;
//   onDelete: (phoneId) => void;
//   currencySymbol: string;
// }

export const PhoneTable = ({
  phones,
  selectedPhones,
  onSelectPhone,
  onSelectAll,
  onEdit,
  onView,
  onDelete,
  onPrint,
  currencySymbol = '$',
}) => {
  const allSelected = phones.length > 0 && selectedPhones.length === phones.length;
  const someSelected = selectedPhones.length > 0 && selectedPhones.length < phones.length;

  return (
    <div className="overflow-x-auto">
      <table className="hidden md:table w-full">
        <thead>
          <tr className="border-b border-slate-200/80 bg-slate-50/80">
            <th className="w-12 py-4 px-4">
              <button
                onClick={() => onSelectAll(!allSelected)}
                className={`
                  w-5 h-5 rounded-md border-2 transition-all duration-200
                  flex items-center justify-center
                  ${allSelected || someSelected
                    ? 'bg-primary-500 border-primary-500' 
                    : 'bg-white border-slate-300 hover:border-primary-400'
                  }
                `}
              >
                {allSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                {someSelected && !allSelected && (
                  <div className="w-2 h-2 bg-white rounded-sm"></div>
                )}
              </button>
            </th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Téléphone</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Spécifications</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fournisseur</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">État</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prix</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Stock</th>
            <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
            <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {phones.map((phone, index) => {
            const stockQuantity = phone.inventory?.stock_quantity || 0;
            const reorderLevel = phone.inventory?.reorder_level || 0;
            const isLowStock = stockQuantity <= reorderLevel;
            const isSelected = selectedPhones.includes(phone.id);
            const productEmoji = getProductEmoji(phone.product_type);

            return (
              <tr
                key={phone.id}
                className={`
                  group transition-all duration-200
                  ${isSelected 
                    ? 'bg-primary-50/80' 
                    : 'hover:bg-slate-50/80'
                  }
                `}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <td className="py-4 px-4">
                  <button
                    onClick={() => onSelectPhone(phone.id, !isSelected)}
                    className={`
                      w-5 h-5 rounded-md border-2 transition-all duration-200
                      flex items-center justify-center
                      ${isSelected 
                        ? 'bg-primary-500 border-primary-500' 
                        : 'bg-white border-slate-300 hover:border-primary-400'
                      }
                    `}
                  >
                    {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                  </button>
                </td>

                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    {/* Phone image placeholder */}
                    <div className="aspect-ratio-box aspect-ratio-1-1 w-12 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl border border-slate-200">
                      {phone.image_url ? (
                        <img
                          src={getPublicUrl(phone.image_url)}
                          alt={`${phone.brand} ${phone.model}`}
                        />
                      ) : phone.image ? (
                        <img
                          src={getPublicUrl(phone.image)}
                          alt={`${phone.brand} ${phone.model}`}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-xl">{productEmoji}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">
                        <span className="mr-2">{productEmoji}</span>
                        {phone.brand} {phone.model}
                      </div>
                      <div className="text-sm text-slate-500">
                        {phone.color}
                      </div>
                      {phone.barcode && (
                        <div className="text-[0.625rem] font-mono font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100 w-fit mt-1 shadow-sm">
                          {phone.barcode}
                        </div>
                      )}
                    </div>
                  </div>
                </td>

                <td className="py-4 px-4">
            {phone.product_type === 'Phone' || phone.product_type === 'Laptop' ? (
                    <span className="text-sm text-slate-600 font-medium">
                    {phone.storage}{(phone.product_type !== 'Phone' || phone.brand?.toLowerCase() !== 'apple') && phone.ram ? ` • ${phone.ram}` : ''}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-600 font-medium">
                      {phone.product_type}
                    </span>
                  )}
                </td>

                <td className="py-4 px-4">
                  <span className="text-sm text-slate-600 font-medium">
                    {phone.supplier_name || phone.inventory?.supplier || '---'}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <div className="flex flex-col">
                    <span className={`
                      inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full w-fit
                      ${phone.condition === 'New'
                        ? 'bg-success-100 text-success-700'
                        : phone.condition === 'Refurbished'
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-slate-100 text-slate-700'
                      }
                    `}>
                      <CheckBadgeIcon className="w-3.5 h-3.5" />
                      {phone.condition === 'New' ? 'Neuf' : phone.condition === 'Refurbished' ? 'Remis à neuf' : 'Occasion'}
                    </span>
                    {phone.battery_percentage && (
                      <div className="text-[10px] uppercase font-bold text-slate-400 mt-1.5 flex items-center gap-1">
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                        Batt. {phone.battery_percentage}%
                      </div>
                    )}
                  </div>
                </td>

                <td className="py-4 px-4">
                  <span className="text-sm font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                    {phone.price.toLocaleString()} {currencySymbol}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          stockQuantity === 0 
                            ? 'bg-danger-500' 
                            : isLowStock 
                            ? 'bg-warning-500' 
                            : 'bg-success-500'
                        }`}
                        style={{ width: `${Math.min((stockQuantity / (reorderLevel * 2)) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <span className={`text-xs font-semibold ${
                      stockQuantity === 0 ? 'text-danger-600' : isLowStock ? 'text-warning-600' : 'text-slate-600'
                    }`}>
                      {stockQuantity}
                    </span>
                  </div>
                </td>

                <td className="py-4 px-4">
                  <span className={`
                    inline-flex px-2.5 py-1 text-xs font-semibold rounded-full
                    ${stockQuantity === 0
                      ? 'bg-danger-100 text-danger-700'
                      : isLowStock
                      ? 'bg-warning-100 text-warning-700'
                      : 'bg-success-100 text-success-700'
                    }
                  `}>
                    {stockQuantity === 0 ? 'Rupture de stock' : isLowStock ? 'Stock faible' : 'En stock'}
                  </span>
                </td>

                <td className="py-4 px-4">
                  <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(phone.id)}
                      className="!p-2"
                      title="Voir"
                    >
                      <EyeIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(phone.id)}
                      className="!p-2"
                      title="Modifier"
                    >
                      <PencilSquareIcon className="w-4 h-4" />
                    </Button>
                    {onPrint && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onPrint(phone)}
                        className="!p-2 text-primary-600"
                        title="Imprimer Etiquette"
                      >
                        <PrinterIcon className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(phone.id)}
                      className="!p-2 text-danger-600 hover:bg-danger-50"
                      title="Supprimer"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4 p-4">
        {phones.map((phone) => {
          const stockQuantity = phone.inventory?.stock_quantity || 0;
          const reorderLevel = phone.inventory?.reorder_level || 0;
          const isLowStock = stockQuantity <= reorderLevel;
          const isSelected = selectedPhones.includes(phone.id);
          const productEmoji = getProductEmoji(phone.product_type);

          return (
            <div 
              key={phone.id}
              className={`p-4 rounded-2xl border transition-all duration-200 ${isSelected ? 'bg-primary-50 border-primary-200' : 'bg-white border-slate-200 shadow-sm'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-xl">
                    {productEmoji}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{phone.brand} {phone.model}</h3>
                    <p className="text-xs text-slate-500">
                      {phone.color} | {phone.storage}
                      {phone.brand?.toLowerCase() !== 'apple' && phone.ram ? ` | ${phone.ram}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">{phone.price.toLocaleString()} {currencySymbol}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Stock</p>
                  <p className={`font-bold ${isLowStock ? "text-red-500" : "text-slate-700"}`}>
                    {stockQuantity} unités
                  </p>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">État</p>
                  <p className="font-bold text-slate-700">
                    {phone.condition === 'New' ? 'Neuf' : phone.condition === 'Refurbished' ? 'Remis à neuf' : 'Occasion'}
                    {phone.battery_percentage && (
                      <span className="text-[10px] font-medium text-slate-400 ml-1">
                        ({phone.battery_percentage}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onView(phone.id)}
                  fullWidth
                >
                  <EyeIcon className="w-4 h-4 mr-1" /> Voir
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onEdit(phone.id)}
                  fullWidth
                >
                  <PencilSquareIcon className="w-4 h-4 mr-1" /> Modifier
                </Button>
                {onPrint && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPrint(phone)}
                    fullWidth
                    className="text-primary-600"
                  >
                    <PrinterIcon className="w-4 h-4 mr-1" /> Label
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(phone.id)}
                  fullWidth
                  className="text-red-500"
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
