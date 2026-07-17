import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PrinterIcon,
  PlusIcon,
  XMarkIcon,
  PencilSquareIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  InboxIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { inventoryAPI } from '../services/api';

import { PageHeader } from '../components/layout/PageHeader';
import AdjustStockModal from '../components/inventory/AdjustStockModal';
import { Table } from '../components/common/Table';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Modal } from '../components/common/Modal';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { useShopSettings } from '../hooks/useShop';
import { toast } from 'react-hot-toast';

const InventoryList = () => {
  const navigate = useNavigate();
  const { data: shopSettings } = useShopSettings();
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedInventoryItem, setSelectedInventoryItem] = useState(null);
  const [activePrintProduct, setActivePrintProduct] = useState(null);
  const [activePrintBulk, setActivePrintBulk] = useState(null); // Updated state for bulk print
  const [selectedItems, setSelectedItems] = useState([]); // Added state for selection
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [showEditInventoryModal, setShowEditInventoryModal] = useState(false);
  
  // Search debouncing state
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef(null);

  const printRef = useRef();
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      setActivePrintProduct(null);
      setActivePrintBulk(null);
    },
  });

  const handlePrintLabel = (product) => {
    setActivePrintBulk(null);
    setActivePrintProduct(product);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  const handlePrintSelectedLabels = async () => {
    if (selectedItems.length === 0) {
      toast.error('Veuillez sélectionner au moins un produit');
      return;
    }
    
    // Print each item separately with its quantity
    for (let i = 0; i < selectedItems.length; i++) {
      setActivePrintProduct(null);
      setActivePrintBulk(null);
      
      // Wait a bit before setting the next item
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setActivePrintProduct(selectedItems[i]);
      
      // Wait for render then print
      await new Promise(resolve => setTimeout(resolve, 200));
      handlePrint();
      
      // Wait between print jobs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Clear after all prints
    setActivePrintProduct(null);
  };

  const handleRowSelect = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.filter(i => i.id !== item.id);
      }
      return [...prev, item];
    });
  };

  const isRowSelected = (item) => {
    return selectedItems.some(i => i.id === item.id);
  };

  const handleSelectAll = (selected) => {
    if (selected) {
      // Add all items in current view to selection (avoid duplicates)
      const newItems = inventory.filter(item => !isRowSelected(item));
      setSelectedItems(prev => [...prev, ...newItems]);
    } else {
      // Remove all items in current view from selection
      const inventoryIds = inventory.map(item => item.id);
      setSelectedItems(prev => prev.filter(item => !inventoryIds.includes(item.id)));
    }
  };

  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    currentPage: 1,
  });
  const [editingItem, setEditingItem] = useState({
    reorder_level: '',
  });
  const [filters, setFilters] = useState({
    stock_status: 'all',
    search: '',
  });

  useEffect(() => {
    loadInventory(1);
  }, [filters]);

  const loadInventory = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
      };

      // Add search parameter
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await inventoryAPI.getAll(params);
      const data = response.data;
      let items = data.results || data;

      // Filter by stock status on frontend since backend might not have this filter
      if (filters.stock_status !== 'all') {
        items = items.filter((item) => {
          switch (filters.stock_status) {
            case 'low_stock':
              return item.is_low_stock;
            case 'out_of_stock':
              return item.stock_quantity === 0;
            case 'in_stock':
              return item.stock_quantity > item.reorder_level;
            default:
              return true;
          }
        });
      }

      setInventory(items);
      setPagination({
        count: data.count || items.length,
        next: data.next,
        previous: data.previous,
        currentPage: page,
      });
      setError(null);
    } catch (err) {
      console.error('Error loading inventory:', err);
      setError('Échec du chargement des données d\'inventaire');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadInventory(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getStockStatusColor = (item) => {
    if (item.stock_quantity === 0) {
      return 'bg-red-100 text-red-800'; // Rupture de stock - rouge
    } else if (item.is_low_stock) {
      return 'bg-yellow-100 text-yellow-800'; // Stock faible - jaune
    } else {
      return 'bg-green-100 text-green-800'; // En stock - vert
    }
  };

  const getStockStatusText = (item) => {
    if (item.stock_quantity === 0) {
      return 'Rupture de stock';
    } else if (item.is_low_stock) {
      return 'Stock faible';
    } else {
      return 'En stock';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns = [
    {
      key: 'phone',
      label: 'Produit',
      render: (value, item) => {
        const product = item.phone_details || item.phone;
        return (
          <div className="min-w-0 py-1">
            <div className="font-bold text-slate-900 truncate flex items-center gap-2">
              <div className="w-1.5 h-4 bg-primary-500 rounded-full"></div>
              {product?.brand} {product?.model}
            </div>
            <div className="flex flex-col ml-3.5 mt-0.5">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                {product?.storage} {product?.ram && `• ${product?.ram}`}
              </div>
              {product?.barcode && (
                <div className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 w-fit px-1.5 py-0.5 rounded mt-1 border border-slate-200">
                  {product.barcode}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'stock_quantity',
      label: 'Stock',
      render: (value, item) => (
        <div className="flex flex-col gap-1.5 min-w-[100px]">
          <div className="flex justify-between items-center px-0.5">
            <span className={`text-sm font-bold tabular-nums ${
              item.stock_quantity === 0 ? 'text-red-600' : item.is_low_stock ? 'text-amber-600' : 'text-emerald-600'
            }`}>
              {item.stock_quantity === 1 && ['Phone', 'Laptop'].includes(item.phone_details?.product_type)
                ? 'Dernier'
                : item.stock_quantity}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Unités</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                item.stock_quantity === 0 ? 'bg-red-500' : item.is_low_stock ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min((item.stock_quantity / (item.reorder_level * 2 || 20)) * 100, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'reorder_level',
      label: 'Alerte',
      render: (value, item) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-600 tabular-nums">{item.reorder_level}</span>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Seuil min.</span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (value, item) => {
        const text = getStockStatusText(item);
        const colorClass = getStockStatusColor(item);
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border shadow-sm ${colorClass} border-current/10`}>
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              item.stock_quantity === 0 ? 'bg-red-500' : item.is_low_stock ? 'bg-amber-500' : 'bg-emerald-500'
            }`} />
            {text}
          </span>
        );
      },
    },
    {
      key: 'last_restocked',
      label: 'Réappro.',
      render: (value, item) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-700">{formatDate(item.last_restocked)}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Dernier flux</span>
        </div>
      ),
    },
    {
      key: 'supplier',
      label: 'Fournisseur',
      render: (value, item) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-slate-400">
              {(item.supplier_details?.name || 'N').charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-600 truncate max-w-[100px]">
            {item.supplier_details?.name || 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value, item) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAdjustStock(item)}
            className="text-primary-600 hover:bg-primary-50 h-8 font-bold text-[11px] uppercase tracking-wider"
          >
            Ajuster
          </Button>
          <div className="w-px h-4 bg-slate-200 mx-1"></div>
          <div className="flex items-center">
            <button
              onClick={() => handleEditInventory(item)}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <PencilSquareIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePrintLabel(item.phone_details || item.phone)}
              className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Étiquette"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleViewHistory(item)}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Historique"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ),
    },
  ];

  const handleAdjustStock = (item) => {
    setSelectedInventoryItem(item);
    setShowAdjustStockModal(true);
  };

  const handleEditInventory = (item) => {
    setSelectedInventoryItem(item);
    setEditingItem({
      reorder_level: item.reorder_level,
    });
    setShowEditInventoryModal(true);
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    try {
      await inventoryAPI.update(selectedInventoryItem.id, {
        ...editingItem,
        phone: selectedInventoryItem.phone_details?.id || selectedInventoryItem.phone?.id || selectedInventoryItem.phone,
      });
      setShowEditInventoryModal(false);
      loadInventory();
      toast.success('Inventaire mis à jour');
    } catch (err) {
      console.error('Error saving inventory:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleViewHistory = (item) => {
    // Navigate to stock history page with phone filter
    navigate(`/inventory/history?phone=${item.phone.id}`);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value.toString(),
    }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout to update filters after 500ms
    searchTimeoutRef.current = setTimeout(() => {
      handleFilterChange('search', value);
    }, 500);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-[var(--spacing-md)]">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-[var(--spacing-md)]">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <Button onClick={loadInventory} variant="secondary" size="sm">
                  Réessayer
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      <PageHeader
        title="Gestion de l'inventaire"
        actions={
          <div className="flex-responsive items-center gap-[var(--spacing-sm)]">
            {selectedItems.length > 0 && (
              <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full border border-primary-100 shadow-sm transition-all animate-in fade-in zoom-in duration-200">
                <span className="text-sm font-medium text-primary-700">
                  {selectedItems.length}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedItems([])}
                  className="text-primary-600 hover:text-primary-800 p-1 h-auto min-w-0"
                  title="Effacer la sélection"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
                <div className="w-px h-4 bg-primary-200 mx-1"></div>
                <Button 
                  variant="primary"
                  size="sm"
                  onClick={handlePrintSelectedLabels}
                  className="flex items-center gap-2 h-8 py-0 px-3"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span className="hidden xs:inline">Imprimer</span>
                </Button>
              </div>
            )}
            <Link to="/inventory/history" className="w-full sm:w-auto">
              <Button variant="secondary" className="w-full sm:w-auto">
                Historique
              </Button>
            </Link>
            <Link to="/phones/add" className="w-full sm:w-auto">
              <Button variant="primary" className="w-full sm:w-auto">
                <PlusIcon className="w-4 h-4 mr-2 hidden sm:inline" />
                Ajouter
              </Button>
            </Link>
          </div>
        }
      />

      {/* Filters */}
      <Card variant="glass" className="p-[var(--spacing-md)]">
        <div className="flex-responsive gap-[var(--spacing-md)]">
          <div className="w-full md:w-1/3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <FunnelIcon className="w-3.5 h-3.5" />
              Statut du stock
            </label>
            <Select
              value={filters.stock_status}
              onChange={(value) => handleFilterChange('stock_status', value)}
              options={[
                { value: 'all', label: 'Tous les articles' },
                { value: 'in_stock', label: 'En stock' },
                { value: 'low_stock', label: 'Stock faible' },
                { value: 'out_of_stock', label: 'Rupture de stock' },
              ]}
              className="!mb-0"
            />
          </div>

          <div className="flex-1">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              <MagnifyingGlassIcon className="w-3.5 h-3.5" />
              Rechercher par produit
            </label>
            <Input
              type="search"
              placeholder="Ex: iPhone 15, Samsung, Coque..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="!mb-0"
              leftIcon={<MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />}
            />
          </div>
        </div>
      </Card>

      {/* Inventory Table Container */}
      <Card variant="glass" className="overflow-hidden border-slate-200/60 shadow-xl">
        <Table
          columns={columns}
          data={inventory}
          emptyMessage="Aucun article d'inventaire trouvé"
          selectableRows={true}
          selectedRows={isRowSelected}
          onRowSelect={handleRowSelect}
          onSelectAll={handleSelectAll}
        />
        
        {/* Pagination UI */}
        {Math.ceil(pagination.count / 20) > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">
              Page <span className="font-semibold text-slate-700">{pagination.currentPage}</span> sur{' '}
              <span className="font-semibold text-slate-700">{Math.ceil(pagination.count / 20)}</span>
            </p>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!pagination.previous}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                Précédent
              </Button>

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
      </Card>

      {/* Summary Stats */}
      <div className="grid-fluid-sm">
        <Card variant="stats" className="group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:scale-110 transition-transform">
              <PlusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Articles Totaux</div>
              <div className="text-2xl font-black text-slate-800 tabular-nums">{pagination.count}</div>
            </div>
          </div>
        </Card>

        <Card variant="stats" className="group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">En Stock</div>
              <div className="text-2xl font-black text-emerald-600 tabular-nums">
                {inventory.filter(item => item.stock_quantity > item.reorder_level).length}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="stats" className="group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <ExclamationTriangleIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Stock Faible</div>
              <div className="text-2xl font-black text-amber-600 tabular-nums">
                {inventory.filter(item => item.is_low_stock && item.stock_quantity > 0).length}
              </div>
            </div>
          </div>
        </Card>

        <Card variant="stats" className="group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform">
              <InboxIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rupture</div>
              <div className="text-2xl font-black text-red-600 tabular-nums">
                {inventory.filter(item => item.stock_quantity === 0).length}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={showAdjustStockModal}
        onClose={() => setShowAdjustStockModal(false)}
        inventoryItem={selectedInventoryItem}
        onSuccess={loadInventory}
      />

      <Modal
        open={showEditInventoryModal}
        onClose={() => setShowEditInventoryModal(false)}
        header="Modifier l'inventaire"
        body={
          <form id="edit-inventory-form" onSubmit={handleSaveInventory} className="space-y-4">
            <Input
              label="Niveau d'alerte"
              type="number"
              value={editingItem.reorder_level}
              onChange={(e) => setEditingItem({ ...editingItem, reorder_level: e.target.value })}
              required
            />
          </form>
        }
        footer={
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditInventoryModal(false)}>
              Annuler
            </Button>
            <Button type="submit" form="edit-inventory-form">
              Enregistrer
            </Button>
          </div>
        }
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Hidden printable label */}
      <div className="hidden">
        <div ref={printRef}>
          {activePrintProduct && (
            <BarcodeLabel 
              phone={activePrintProduct} 
              shopSettings={shopSettings} 
            />
          )}
          {activePrintBulk && (
            <BarcodeLabel 
              products={activePrintBulk} 
              shopSettings={shopSettings} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryList;

