import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { SalesTable } from '../components/sales/SalesTable';
import { salesAPI, returnsAPI } from '../services/api';

import NewSaleModal from './NewSale';
import ReturnSaleModal from './ReturnSaleModal';
import { useToast } from '../context/ToastContext';
import { 
  PlusIcon, 
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShoppingCartIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline';

// interface SalesFilters {
//   start_date;
//   end_date;
//   customer;
//   payment_method;
//   search;
//   ordering;
// }
const SalesList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSales, setSelectedSales] = useState([]);
  const [showNewSaleModal, setShowNewSaleModal] = useState(false);

  useEffect(() => {
    if (location.state?.openNewSale) {
      setShowNewSaleModal(true);
      // Clear state to prevent modal from reopening on back/forward
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedSaleForReturn, setSelectedSaleForReturn] = useState(null);
  const [showBulkRefundModal, setShowBulkRefundModal] = useState(false);
  const [bulkRefundReason, setBulkRefundReason] = useState('');
  const [bulkRefundLoading, setBulkRefundLoading] = useState(false);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });


  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const todayStr = getTodayStr();

  // Filter states
  const [filters, setFilters] = useState({
    start_date: todayStr,
    end_date: todayStr,
    search: '',
    ordering: '-sale_date',
  });

  // Filter options
  const paymentMethodOptions = [
    { value: '', label: 'Tous les modes de paiement' },
    { value: 'Cash', label: 'Espèces' },
    { value: 'Card', label: 'Carte' },
    { value: 'Split', label: 'Split' },
    { value: 'Check', label: 'Chèque' },
    { value: 'Mobile Wallet', label: 'Paiement Mobile' },
    { value: 'Other', label: 'Autre' },
  ];

  const orderingOptions = [
    { value: '-sale_date', label: 'Plus récents d\'abord' },
    { value: 'sale_date', label: 'Plus anciens d\'abord' },
    { value: '-total_price', label: 'Prix le plus élevé' },
    { value: 'total_price', label: 'Prix le plus bas' },
    { value: 'customer_name', label: 'Client A-Z' },
    { value: '-customer_name', label: 'Client Z-A' },
  ];

  // Load sales with filters
  const loadSales = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        // page_size: 20,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value === '' || value === undefined) {
          delete params[key];
        }
      });

      const response = await salesAPI.getAll(params);
      const data = response.data;

      setSales(data.results);
      setPagination({
        count: data.count,
        next: data.next,
        previous: data.previous,
        currentPage: page,
      });
    } catch (error) {
      console.error('Error loading sales:', error);
      window.showToast('Erreur lors du chargement des ventes', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedSales([]); // Clear selection when filters change
    loadSales(1); // Reset to first page when filters change
  };

  // Handle search with debounce
  const handleSearch = useCallback((value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setSelectedSales([]);
    loadSales(1);
  }, [loadSales]);

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      start_date: todayStr,
      end_date: todayStr,
      ordering: '-sale_date'
    });
    setSelectedSales([]);
  };

  // Handle bulk refund
  const handleBulkDelete = async () => {
    console.log('handleBulkDelete called, selectedSales:', selectedSales);
    
    if (selectedSales.length === 0) {
      console.log('No sales selected');
      return;
    }

    // Open modal instead of using prompt
    setShowBulkRefundModal(true);
  };

  // Execute bulk refund after modal confirmation
  const executeBulkRefund = async () => {
    console.log('executeBulkRefund called');
    
    if (!bulkRefundReason || !bulkRefundReason.trim()) {
      if (window.showToast) {
        window.showToast('Veuillez indiquer le motif du remboursement.', 'warning');
      }
      return;
    }

    setBulkRefundLoading(true);

    try {
      const salesToRefund = sales.filter(sale => selectedSales.includes(sale.id) && (!sale.returns || sale.returns.length === 0));
      const skippedCount = selectedSales.length - salesToRefund.length;
      console.log('Sales to refund:', salesToRefund, `(${skippedCount} skipped - already refunded)`);
      
      // Process refunds sequentially instead of in parallel to avoid "Database is locked" error with SQLite
      let completedCount = 0;
      for (const sale of salesToRefund) {
        const payload = {
          sale: sale.id,
          reason: bulkRefundReason.trim(),
          items: []
        };

        if (sale.items && sale.items.length > 0) {
          payload.items = sale.items.map(item => {
            // Handle case where phone might be null (was deleted)
            let productId = null;
            if (item.phone) {
              productId = typeof item.phone === 'object' ? item.phone.id : (item.phone_id || item.phone);
            } else if (item.phone_id) {
              productId = item.phone_id;
            }
            
            return {
              sale_item: item.id,
              product: productId,
              quantity: item.quantity,
              refund_amount: item.total_price
            };
          }).filter(item => item.sale_item); // Only include items with valid sale_item
        } else if (sale.phone) {
          const productId = typeof sale.phone === 'object' ? sale.phone.id : (sale.phone_id || sale.phone);
          payload.items = [{
            sale_item: null,
            product: productId,
            quantity: sale.quantity || 1,
            refund_amount: sale.total_price
          }];
        }

        console.log(`Processing refund for sale ${sale.id} (${completedCount + 1}/${salesToRefund.length})...`);
        await returnsAPI.create(payload);
        completedCount++;
      }
      
      console.log('All refunds completed successfully');
      
      setSelectedSales([]);
      setBulkRefundReason('');
      setShowBulkRefundModal(false);
      loadSales(pagination.currentPage);
      
      if (window.showToast) {
        const msg = `${completedCount} vente(s) remboursée(s) avec succès.${skippedCount > 0 ? ` ${skippedCount} vente(s) déjà remboursée(s) ignorée(s).` : ''}`;
        window.showToast(msg, 'success');
      }
    } catch (error) {
      console.error('Error refunding sales:', error);
      console.error('Error response:', error.response);
      console.error('Error data:', error.response?.data);
      
      // Log detailed error information for items
      if (error.response?.data?.items) {
        console.error('Item errors:', JSON.stringify(error.response.data.items, null, 2));
      }
      
      const errorData = error.response?.data;
      let errorMsg = 'Erreur lors du remboursement des ventes.';
      
      if (errorData?.items && Array.isArray(errorData.items)) {
        // Format item-specific errors
        const itemErrors = errorData.items.map((itemError, index) => {
          if (itemError) {
            const errors = Object.entries(itemError).map(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [messages];
              return `${field}: ${msgArray.join(', ')}`;
            }).join('; ');
            return `Article ${index + 1}: ${errors}`;
          }
          return null;
        }).filter(Boolean);
        
        if (itemErrors.length > 0) {
          errorMsg = `Erreurs de validation:\n${itemErrors.join('\n')}`;
        }
      } else {
        // Handle structured error from backend
        if (errorData?.type === 'validation_error') {
          errorMsg = `Erreur de validation: ${JSON.stringify(errorData.details)}`;
        } else if (errorData?.type === 'system_error') {
          errorMsg = `${errorData.error}: ${errorData.details}`;
          if (errorData.help) {
            errorMsg += `\n\n${errorData.help}`;
          }
        } else {
          errorMsg = errorData?.error ||
                     errorData?.detail ||
                     errorData?.non_field_errors?.[0] ||
                     'Erreur lors du remboursement des ventes.';
        }
      }

      showToast(errorMsg, 'error');
    } finally {
      setBulkRefundLoading(false);
    }
  };

  // Handle sale selection
  const handleSaleSelect = (saleId, selected) => {
    setSelectedSales(prev =>
      selected ?
        [...prev, saleId]
        : prev.filter(id => id !== saleId)
    );
  };

  const handleSelectAll = (selected) => {
    setSelectedSales(selected ? sales.map(s => s.id) : []);
  };

  // Navigation handlers
  const handleNewSale = () => {
    setShowNewSaleModal(true);
  };

  const handleViewSale = (saleId) => {
    navigate(`/sales/${saleId}`);
  };

  const handleEditSale = (saleId) => {
    navigate(`/sales/${saleId}/edit`);
  };

  const handleRefundSale = (saleId) => {
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
      setSelectedSaleForReturn(sale);
      setShowReturnModal(true);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    // Create CSV content
    const headers = ['Numéro de facture', 'Date et Heure', 'Nom du client', 'Produit', 'Quantité', 'Prix total', 'Mode de paiement'];
    const csvContent = [
      headers.join(','),
      ...sales.map(sale => [
        sale.invoice_number || '',
        new Date(sale.sale_date).toLocaleString(),
        `"${sale.customer_name}"`,
          `"${sale.phone_details ? `${sale.phone_details.brand} ${sale.phone_details.model}` : (sale.product_name_at_sale || sale.items?.[0]?.product_name_at_sale || 'Produit inconnu')}"`,
        sale.quantity,
        sale.total_price,
        sale.payment_method,
      ].join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    // For now, just show a message. PDF export would require a library like jsPDF
    showToast('La fonctionnalité d\'export PDF sera implémentée dans la prochaine phase.', 'info');
  };

  // Pagination
  const totalPages = Math.ceil(pagination.count / 20);
  const handlePageChange = (page) => {
    loadSales(page);
  };

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <PageHeader
        title="Gestion des Ventes"
        subtitle={`Suivez et gérez ${pagination.count} transactions de vente`}
        actions={
          <div className="flex-responsive">
            <Button variant="outline" onClick={handleExportCSV} icon={<DocumentArrowDownIcon className="w-4 h-4" />} className="w-full sm:w-auto">
              Exporter CSV
            </Button>
            <Button onClick={handleNewSale} icon={<PlusIcon className="w-5 h-5" />} className="w-full sm:w-auto">
              Nouvelle Vente
            </Button>
          </div>
        }
      />

      {/* Filters and Search */}
      <Card variant="glass" className="overflow-visible">
        <div className="p-[var(--container-padding)] space-y-[var(--spacing-md)]">
          {/* Search Bar */}
          <div className="flex-responsive gap-[var(--spacing-sm)]">
            <div className="flex-1">
              <Input
                placeholder="Rechercher par facture, produit (Marque, Modèle, IMEI)..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
              />
            </div>
            {(filters.search || filters.start_date || filters.end_date) && (
              <Button 
                variant="outline" 
                onClick={handleClearFilters}
                icon={<FunnelIcon className="w-4 h-4" />}
                className="w-full lg:w-auto"
              >
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Filter Row */}
          <div className="grid-responsive md:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Input
                label="Du"
                type="date"
                placeholder="Date de début"
                value={filters.start_date || ''}
                onChange={(e) => handleFilterChange('start_date', e.target.value)}
                max={filters.end_date || undefined}
                leftIcon={<CalendarDaysIcon className="w-5 h-4" />}
                className="!mb-0"
              />
            </div>

            <div className="relative">
              <Input
                label="Au"
                type="date"
                placeholder="Date de fin"
                value={filters.end_date || ''}
                onChange={(e) => handleFilterChange('end_date', e.target.value)}
                min={filters.start_date || undefined}
                leftIcon={<CalendarDaysIcon className="w-5 h-4" />}
                className="!mb-0"
              />
            </div>

            <Select
              label="Tri"
              value={filters.ordering || '-sale_date'}
              onChange={(value) => handleFilterChange('ordering', value)}
              options={orderingOptions}
              placeholder="Trier par"
              className="!mb-0"
            />
          </div>

          {/* Results Info */}
          <div className="flex-responsive items-center pt-[var(--spacing-md)] border-t border-slate-200/60">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">
                <span className="text-primary-600 font-bold">{pagination.count}</span> ventes trouvées
              </span>
            </div>

            {/* Bulk actions */}
            {selectedSales.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-danger-50 rounded-xl border border-danger-200 w-full sm:w-auto justify-between">
                <span className="text-sm font-semibold text-danger-700">
                  {selectedSales.length} sélectionnés
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  icon={<TrashIcon className="w-4 h-4" />}
                >
                  Rembourser
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Sales Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-500">Chargement des ventes...</p>
        </div>
      ) : sales.length === 0 ? (
        <Card variant="glass" className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center mb-6">
              <ShoppingCartIcon className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Aucune vente trouvée</h3>
            <p className="text-slate-500 mb-6 max-w-md">
                {filters.search || filters.start_date || filters.end_date || filters.payment_method
                  ? "Essayez d'ajuster vos filtres pour trouver ce que vous cherchez"
                  : "Commencez par créer votre première transaction de vente"
                }
            </p>
            <Button onClick={handleNewSale} icon={<PlusIcon className="w-5 h-5" />}>
              Créer votre première vente
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="glass" className="overflow-hidden">
          <SalesTable
            sales={sales}
            selectedSales={selectedSales}
            onSelectSale={handleSaleSelect}
            onSelectAll={handleSelectAll}
            onView={handleViewSale}
            onEdit={handleEditSale}
            onRefund={handleRefundSale}
          />
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
          <p className="text-sm text-slate-500 order-2 sm:order-1">
            Page <span className="font-semibold text-slate-700">{pagination.currentPage}</span> sur{' '}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>
          
          <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.previous}
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              icon={<ChevronLeftIcon className="w-4 h-4" />}
            >
              Précédent
            </Button>

            <div className="hidden sm:flex items-center gap-1">
              {(() => {
                const delta = 2;
                const range = [];
                const rangeWithDots = [];

                for (
                  let i = Math.max(2, pagination.currentPage - delta);
                  i <= Math.min(totalPages - 1, pagination.currentPage + delta);
                  i++
                ) {
                  range.push(i);
                }

                if (pagination.currentPage - delta > 2) {
                  rangeWithDots.push(1, '...');
                } else {
                  rangeWithDots.push(1);
                }

                rangeWithDots.push(...range);

                if (pagination.currentPage + delta < totalPages - 1) {
                  rangeWithDots.push('...', totalPages);
                } else if (totalPages > 1) {
                  rangeWithDots.push(totalPages);
                }

                return rangeWithDots.map((page, index) => {
                  if (page === '...') {
                    return (
                      <span key={`dots-${index}`} className="px-2 py-1 text-slate-400">
                        •••
                      </span>
                    );
                  }

                  const pageNum = page;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`
                        w-10 h-10 rounded-xl text-sm font-semibold transition-all duration-200
                        ${pageNum === pagination.currentPage
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }
                      `}
                    >
                      {pageNum}
                    </button>
                  );
                });
              })()}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.next}
              onClick={() => handlePageChange(pagination.currentPage + 1)}
            >
              Suivant
              <ChevronRightIcon className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* New Sale Modal */}
      <NewSaleModal
        isOpen={showNewSaleModal}
        onClose={() => setShowNewSaleModal(false)}
        onSuccess={() => {
          setShowNewSaleModal(false);
          loadSales(pagination.currentPage);
        }}
      />

      {/* Return Sale Modal */}
      {selectedSaleForReturn && (
        <ReturnSaleModal
          isOpen={showReturnModal}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedSaleForReturn(null);
          }}
          sale={selectedSaleForReturn}
          onSuccess={() => {
            setShowReturnModal(false);
            setSelectedSaleForReturn(null);
            loadSales(pagination.currentPage);
          }}
        />
      )}

      {/* Bulk Refund Modal */}
      {showBulkRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">
                Remboursement en masse
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {selectedSales.length} vente(s) sélectionnée(s)
              </p>
            </div>

            <div className="p-[var(--spacing-md)] space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800">
                  ⚠️ Cette action remboursera toutes les ventes sélectionnées et remettra les articles en stock.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="bulk-refund-reason" className="block text-sm font-semibold text-slate-700">
                  Motif du remboursement
                </label>
                <textarea
                  id="bulk-refund-reason"
                  value={bulkRefundReason}
                  onChange={(e) => setBulkRefundReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 min-h-[100px] resize-none transition-all"
                  placeholder="Ex: Client a changé d'avis, Article défectueux..."
                  autoFocus
                  disabled={bulkRefundLoading}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowBulkRefundModal(false);
                  setBulkRefundReason('');
                }}
                disabled={bulkRefundLoading}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={executeBulkRefund}
                loading={bulkRefundLoading}
                disabled={!bulkRefundReason.trim()}
              >
                Confirmer le remboursement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesList;

