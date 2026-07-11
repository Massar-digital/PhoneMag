import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { PhoneCard } from '../components/phones/PhoneCard';
import { PhoneTable } from '../components/phones/PhoneTable';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { phonesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useShopSettings } from '../hooks/useShop';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  Squares2X2Icon,
  ListBulletIcon,
  FunnelIcon,
  TrashIcon,
  DevicePhoneMobileIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { Modal } from '../components/common/Modal';

const PhonesList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: shopSettings } = useShopSettings();
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedPhones, setSelectedPhones] = useState([]);
  const [activePrintProduct, setActivePrintProduct] = useState(null);
  const [activePrintBulk, setActivePrintBulk] = useState(null);
  
  // Modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteData, setDeleteData] = useState({ id: null, multiple: false });
  const [isDeleting, setIsDeleting] = useState(false);
  
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
    if (selectedPhones.length === 0) return;
    const itemsToPrint = phones.filter(p => selectedPhones.includes(p.id));
    
    // Print each item separately
    for (let i = 0; i < itemsToPrint.length; i++) {
      setActivePrintProduct(null);
      setActivePrintBulk(null);
      
      // Wait a bit before setting the next item
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setActivePrintProduct(itemsToPrint[i]);
      
      // Wait for render then print
      await new Promise(resolve => setTimeout(resolve, 200));
      handlePrint();
      
      // Wait between print jobs
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Clear after all prints
    setActivePrintProduct(null);
  };
  
  // Check if user has permission to manage phones
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const [pagination, setPagination] = useState({
    // count: 0,
    // next: null string | null,
    // previous: null string | null,
    // currentPage: 1,
  });

  // Filter states
  const [filters, setFilters] = useState({
    // brand: '',
    // min_price: undefined,
    // max_price: undefined,
    // storage: '',
    // condition: '',
    // search: '',
    // ordering: '-created_at',
  });

  // Filter options
  const brandOptions = [
    { value: '', label: 'Toutes les marques' },
    { value: 'Apple', label: 'Apple' },
    { value: 'Samsung', label: 'Samsung' },
    { value: 'Xiaomi', label: 'Xiaomi' },
    { value: 'OnePlus', label: 'OnePlus' },
    { value: 'Google', label: 'Google' },
    { value: 'Huawei', label: 'Huawei' },
    { value: 'Other', label: 'Autre' },
  ];

  const storageOptions = [
    { value: '', label: 'Tout le stockage' },
    { value: '64GB', label: '64 Go' },
    { value: '128GB', label: '128 Go' },
    { value: '256GB', label: '256 Go' },
    { value: '512GB', label: '512 Go' },
    { value: '1TB', label: '1 To' },
  ];

  const conditionOptions = [
    { value: '', label: 'Tous les états' },
    { value: 'New', label: 'Neuf' },
    { value: 'Refurbished', label: 'Reconditionné' },
    { value: 'Used', label: 'Occasion' },
  ];

  const orderingOptions = [
    { value: '-created_at', label: 'Plus récents' },
    { value: 'created_at', label: 'Plus anciens' },
    { value: 'price', label: 'Prix : croissant' },
    { value: '-price', label: 'Prix : décroissant' },
    { value: 'brand', label: 'Marque A-Z' },
    { value: '-brand', label: 'Marque Z-A' },
  ];

  // Load phones with filters
  const loadPhones = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        // page_size: 12,
        ...filters,
      };

      // Remove empty filters
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value === '' || value === undefined) {
          delete params[key];
        }
      });

      const response = await phonesAPI.getAll(params);
      const data = response.data;

      setPhones(data.results);
      setPagination({
        count: data.count,
        next: data.next,
        previous: data.previous,
        currentPage: page,
      });
    } catch (error) {
      console.error('Error loading phones:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadPhones();
  }, [loadPhones]);

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setSelectedPhones([]); // Clear selection when filters change
  };

  // Handle search
  const handleSearch = (value) => {
    handleFilterChange('search', value);
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedPhones.length === 0) return;
    setDeleteData({ id: null, multiple: true });
    setIsDeleteModalOpen(true);
  };

  // Handle phone selection
  const handlePhoneSelect = (phoneId, selected) => {
    setSelectedPhones(prev =>
      selected
        ? [...prev, phoneId]
        : prev.filter(id => id !== phoneId)
    );
  };

  const handleSelectAll = (selected) => {
    setSelectedPhones(selected ? phones.map(p => p.id) : []);
  };

  // Navigation handlers
  const handleAddPhone = () => {
    navigate('/phones/add');
  };

  const handleEditPhone = (phoneId) => {
    navigate(`/phones/${phoneId}/edit`);
  };

  const handleViewPhone = (phoneId) => {
    navigate(`/phones/${phoneId}`);
  };

  const handleDeletePhone = (phoneId) => {
    setDeleteData({ id: phoneId, multiple: false });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      if (deleteData.multiple) {
        await Promise.all(
          selectedPhones.map(id => phonesAPI.delete(id))
        );
        setSelectedPhones([]);
      } else {
        await phonesAPI.delete(deleteData.id);
      }
      setIsDeleteModalOpen(false);
      loadPhones(pagination.currentPage);
    } catch (error) {
      console.error('Error deleting phones:', error);
      window.showToast('Erreur lors de la suppression. Veuillez réessayer.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(pagination.count / 20);
  const handlePageChange = (page) => {
    loadPhones(page);
  };

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <PageHeader
        title="Tous les produits"
        subtitle={`Gérez vos ${pagination.count} produits en stock`}
        actions={
          <div className="flex-responsive">
            {selectedPhones.length > 0 && (
              <div className="flex items-center gap-2 bg-primary-50 px-3 py-1 rounded-full border border-primary-100">
                <span className="text-sm font-medium text-primary-700">
                  {selectedPhones.length} sélectionné(s)
                </span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSelectedPhones([])}
                  className="text-primary-600 hover:text-primary-800 p-1 h-auto"
                >
                  Effacer
                </Button>
                <div className="w-px h-4 bg-primary-200 mx-1"></div>
                <Button 
                  variant="primary"
                  size="sm"
                  onClick={handlePrintSelectedLabels}
                  className="flex items-center gap-2 shadow-sm"
                >
                  <PrinterIcon className="w-4 h-4" />
                  Imprimer
                </Button>
              </div>
            )}
            {isAdminOrManager && (
              <Button onClick={handleAddPhone} icon={<PlusIcon className="w-5 h-5" />} className="w-full sm:w-auto">
                Ajouter un produit
              </Button>
            )}
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
                placeholder="Rechercher par marque, modèle ou spécifications..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="w-5 h-5" />}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => setFilters({})}
                icon={<FunnelIcon className="w-4 h-4" />}
                className="w-full lg:w-auto"
              >
                Réinitialiser
              </Button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid-responsive md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
            <Select              value={filters.product_type || ''}
              onChange={(value) => handleFilterChange('product_type', value)}
              options={[
                { value: '', label: 'Tous les types' },
                { value: 'Phone', label: 'Téléphones' },
                { value: 'Laptop', label: 'Ordinateurs portables' },
                { value: 'Case', label: 'Coques' },
                { value: 'Charger', label: 'Chargeurs' },
                { value: 'Cable', label: 'Câbles' },
                { value: 'Screen Protector', label: 'Protège-écrans' },
                { value: 'Headphones', label: 'Casques' },
                { value: 'Earphones', label: 'Écouteurs' },
                { value: 'Power Bank', label: 'Batteries externes' },
                { value: 'Other', label: 'Autre' },
              ]}
              placeholder="Type de produit"
            />

            <Select              value={filters.brand || ''}
              onChange={(value) => handleFilterChange('brand', value)}
              options={brandOptions}
              placeholder="Marque"
            />

            <Select
              value={filters.storage || ''}
              onChange={(value) => handleFilterChange('storage', value)}
              options={storageOptions}
              placeholder="Stockage"
            />

            <Select
              value={filters.condition || ''}
              onChange={(value) => handleFilterChange('condition', value)}
              options={conditionOptions}
              placeholder="État"
            />

            <Input
              type="number"
              placeholder="Prix min"
              value={filters.min_price || ''}
                onChange={(e) => handleFilterChange('min_price', e.target.value ? parseFloat(e.target.value) : undefined)}
            />

            <Input
              type="number"
              placeholder="Prix max"
              value={filters.max_price || ''}
                onChange={(e) => handleFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : undefined)}
            />

            <Select
              value={filters.ordering || '-created_at'}
              onChange={(value) => handleFilterChange('ordering', value)}
              options={orderingOptions}
              placeholder="Trier par"
            />
          </div>

          {/* Results Info & View Toggle */}
          <div className="flex-responsive items-center pt-[var(--spacing-md)] border-t border-slate-200/60">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">
                <span className="text-primary-600 font-bold">{pagination.count}</span> produits trouvés
              </span>

              {/* View toggle */}
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                      ${viewMode === 'grid'
                        ? 'bg-white text-primary-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                      }
                  `}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`
                    p-2 rounded-lg transition-all duration-200
                    ${viewMode === 'list'
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                    }
                  `}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bulk actions */}
            {selectedPhones.length > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 bg-danger-50 rounded-xl border border-danger-200">
                <span className="text-sm font-semibold text-danger-700">
                  {selectedPhones.length} sélectionné(s)
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  icon={<TrashIcon className="w-4 h-4" />}
                >
                  Supprimer
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Phones Display */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white/30 backdrop-blur-md rounded-3xl border border-white/50">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-500 font-medium">Analyse de l'inventaire...</p>
        </div>
      ) : phones.length === 0 ? (
        <Card variant="glass" className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-slate-50 flex items-center justify-center mb-6 shadow-inner">
              <DevicePhoneMobileIcon className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">Aucun téléphone trouvé</h3>
            <p className="text-slate-500 mb-8 max-w-md">
                {filters.search || filters.brand || filters.condition
                  ? "Essayez d'ajuster vos filtres pour trouver ce que vous cherchez"
                  : "Commencez par ajouter votre premier téléphone à l'inventaire"
                }
            </p>
            <Button onClick={handleAddPhone} size="lg" className="rounded-2xl shadow-xl shadow-primary-500/20" icon={<PlusIcon className="w-6 h-6" />}>
              Ajouter votre premier téléphone
            </Button>
          </div>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid-fluid">
          {phones.map((phone, index) => (
            <div
              key={phone.id}
              className="animate-in fade-in zoom-in-95 duration-500"
              style={{ animationDelay: `${index * 40}ms`, animationFillMode: 'both' }}
            >
              <PhoneCard
                phone={phone}
                selected={selectedPhones.includes(phone.id)}
                onSelect={handlePhoneSelect}
                onEdit={handleEditPhone}
                onView={handleViewPhone}
                onDelete={handleDeletePhone}
                onPrint={handlePrintLabel}
                currencySymbol="DA"
              />
            </div>
          ))}
        </div>
      ) : (
        <Card variant="glass" className="overflow-hidden">
          <PhoneTable
            phones={phones}
            selectedPhones={selectedPhones}
            onSelectPhone={handlePhoneSelect}
            onSelectAll={handleSelectAll}
            onEdit={handleEditPhone}
            onView={handleViewPhone}
            onDelete={handleDeletePhone}
            onPrint={handlePrintLabel}
            currencySymbol="DA"
          />
        </Card>
      )}

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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <p className="text-sm text-slate-500">
            Page <span className="font-semibold text-slate-700">{pagination.currentPage}</span> sur{' '}
            <span className="font-semibold text-slate-700">{totalPages}</span>
          </p>
          
          <div className="flex items-center gap-2">
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
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                
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
              })}
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

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Delete Confirmation Modal */}
      <Modal
        open={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        size="md"
        className="rounded-3xl shadow-2xl"
        body={
          <div className="p-8 text-center">
            <div className="mx-auto w-20 h-20 bg-danger-50 rounded-2xl flex items-center justify-center mb-6 animate-bounce">
              <ExclamationTriangleIcon className="w-10 h-10 text-danger-600" />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-3">
              Confirmer la suppression
            </h3>
            
            <p className="text-slate-600 mb-8 leading-relaxed">
              {deleteData.multiple 
                ? `Êtes-vous certain de vouloir supprimer définitivement ces ${selectedPhones.length} produits ? Cette action est irréversible.`
                : "Voulez-vous vraiment supprimer ce produit de votre inventaire ? Cette opération ne peut pas être annulée."
              }
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                disabled={isDeleting}
                onClick={confirmDelete}
                className={`
                  flex-1 px-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50
                  ${isDeleting ? 'bg-danger-400' : 'bg-danger-600 hover:bg-danger-700 shadow-danger-200'}
                  flex items-center justify-center gap-2
                `}
              >
                {isDeleting ? (
                  <>
                    <Spinner size="sm" className="text-white" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <TrashIcon className="w-5 h-5" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        }
      />
    </div>
  );
};

export default PhonesList;

