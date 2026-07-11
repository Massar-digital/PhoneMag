import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Table } from '../components/common/Table';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Card } from '../components/common/Card';
import { useStockHistory, useStockHistoryStats } from '../hooks/useInventory';
import { authAPI, inventoryAPI } from '../services/api';
import { 
  ArrowDownTrayIcon, 
  PrinterIcon, 
  ArrowUpCircleIcon, 
  ArrowDownCircleIcon, 
  ArrowPathIcon 
} from '@heroicons/react/24/outline';

const StockHistoryPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pagination, setPagination] = useState({
    currentPage: parseInt(searchParams.get('page')) || 1,
    count: 0
  });

  // Filters from URL params or defaults
  const [startDate, setStartDate] = useState(searchParams.get('start_date') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end_date') || '');
  const [reason, setReason] = useState(searchParams.get('reason') || '');
  const [adjustmentType, setAdjustmentType] = useState(searchParams.get('adjustment_type') || '');
  const [phoneSearch, setPhoneSearch] = useState(searchParams.get('phone_search') || '');
  const [selectedUser, setSelectedUser] = useState(searchParams.get('user') || '');
  const [showStats, setShowStats] = useState(true);
  const [users, setUsers] = useState([]);
  const phoneId = searchParams.get('phone') || '';

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await authAPI.getUsers();
        setUsers(response.data.results || response.data || []);
      } catch (err) {
        console.error('Failed to fetch users', err);
        window.showToast('Échec de la récupération des utilisateurs', 'error');
      }
    };
    fetchUsers();
  }, []);

  const { data, isLoading, error } = useStockHistory({
    page: pagination.currentPage,
    start_date: startDate,
    end_date: endDate,
    reason: reason,
    adjustment_type: adjustmentType,
    search: phoneSearch,
    user: selectedUser,
    phone: phoneId
  });

  const { data: stats, isLoading: statsLoading } = useStockHistoryStats({
    start_date: startDate,
    end_date: endDate,
    reason: reason,
    adjustment_type: adjustmentType,
    search: phoneSearch,
    user: selectedUser,
    phone: phoneId
  });

  const history = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  const reasonOptions = [
    { value: '', label: 'Toutes les raisons' },
    { value: 'SALE', label: 'Vente' },
    { value: 'RETURN', label: 'Retour' },
    { value: 'DAMAGE', label: 'Dommage' },
    { value: 'RESTOCK', label: 'Réapprovisionnement' },
    { value: 'CORRECTION', label: 'Correction' },
    { value: 'INITIAL', label: 'Stock initial' },
  ];

  const adjustmentTypeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'ADD', label: 'Ajout de stock' },
    { value: 'REMOVE', label: 'Retrait de stock' },
  ];

  const handleFilter = () => {
    const newParams = { ...Object.fromEntries(searchParams.entries()), page: '1' };
    if (startDate) newParams.start_date = startDate; else delete newParams.start_date;
    if (endDate) newParams.end_date = endDate; else delete newParams.end_date;
    if (reason) newParams.reason = reason; else delete newParams.reason;
    if (adjustmentType) newParams.adjustment_type = adjustmentType; else delete newParams.adjustment_type;
    if (phoneSearch) newParams.phone_search = phoneSearch; else delete newParams.phone_search;
    if (selectedUser) newParams.user = selectedUser; else delete newParams.user;
    
    setSearchParams(newParams);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setAdjustmentType('');
    setPhoneSearch('');
    setSelectedUser('');
    setSearchParams({});
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage) => {
    setSearchParams(prev => {
        const params = Object.fromEntries(prev.entries());
        return { ...params, page: newPage.toString() };
    });
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  const handleExportCSV = async () => {
    try {
      // Get all history for export (no pagination)
      const response = await inventoryAPI.getStockHistory({
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        adjustment_type: adjustmentType,
        search: phoneSearch,
        phone: phoneId,
        page_size: 1000 // Large enough for export
      });

      const exportData = response.data.results || response.data || [];
      
      const headers = ['Date', 'Heure', 'Téléphone', 'Marque', 'Modèle', 'Type', 'Quantité', 'Raison', 'Ancien Stock', 'Nouveau Stock', 'Utilisateur', 'Notes'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(item => [
          new Date(item.created_at).toLocaleDateString('fr-FR'),
          new Date(item.created_at).toLocaleTimeString('fr-FR'),
          `"${item.phone_name}"`,
          `"${item.brand || ''}"`,
          `"${item.model_name || ''}"`,
          item.adjustment_type,
          item.quantity,
          item.reason,
          item.previous_stock,
          item.new_stock,
          `"${item.created_by_name || 'Système'}"`,
          `"${(item.notes || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `historique_stock_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      window.showToast('Échec de l\'exportation CSV', 'error');
    }
  };

  const getAdjustmentTypeColor = (type) => {
    return type === 'ADD' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getReasonColor = (reason) => {
    const colors = {
      SALE: 'text-blue-600 bg-blue-100',
      RETURN: 'text-purple-600 bg-purple-100',
      DAMAGE: 'text-red-600 bg-red-100',
      RESTOCK: 'text-green-600 bg-green-100',
      CORRECTION: 'text-yellow-600 bg-yellow-100',
      INITIAL: 'text-gray-600 bg-gray-100',
    };
    return colors[reason] || 'text-gray-600 bg-gray-100';
  };

  const columns = [
    {
      key: 'created_at',
      label: 'Date et Heure',
      render: (_, item) => (
        <div>
          <div className="text-sm font-medium text-slate-900">
            {new Date(item.created_at).toLocaleDateString('fr-FR')}
          </div>
          <div className="text-xs text-slate-500">
            {new Date(item.created_at).toLocaleTimeString('fr-FR')}
          </div>
        </div>
      ),
    },
    {
      key: 'phone_name',
      label: 'Téléphone',
      render: (_, item) => (
        <div className="flex flex-col">
          {item.phone_id ? (
            <Link to={`/phones/${item.phone_id}`} className="text-sm font-medium text-blue-600 hover:underline">
              {item.phone_name}
            </Link>
          ) : (
            <span className="text-sm font-medium text-slate-900">{item.phone_name}</span>
          )}
          {item.brand && <span className="text-xs text-slate-500">{item.brand} {item.model_name}</span>}
        </div>
      ),
    },
    {
      key: 'adjustment_type',
      label: 'Type',
      render: (_, item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getAdjustmentTypeColor(item.adjustment_type)}`}>
          {item.adjustment_type === 'ADD' ? '+' : '-'}{item.quantity}
        </span>
      ),
    },
    {
      key: 'reason',
      label: 'Raison',
      render: (_, item) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReasonColor(item.reason)}`}>
          {reasonOptions.find(o => o.value === item.reason)?.label || item.reason}
        </span>
      ),
    },
    {
      key: 'previous_stock',
      label: 'Évolution du Stock',
      render: (_, item) => (
        <div className="text-sm">
          <div className="text-slate-600">
            {item.previous_stock} → {item.new_stock}
          </div>
        </div>
      ),
    },
    {
      key: 'created_by_name',
      label: 'Utilisateur',
      render: (_, item) => (
        <div className="text-sm text-slate-900">
          {item.created_by_name || 'Système'}
        </div>
      ),
    },
    {
      key: 'notes',
      label: 'Notes',
      render: (_, item) => (
        <div className="text-sm text-slate-600 max-w-xs truncate" title={item.notes}>
          {item.notes || '-'}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-[var(--spacing-md)]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historique des Stocks</h1>
          <p className="text-slate-600">Suivez tous les mouvements d'inventaire</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <PrinterIcon className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Ajouté</p>
              <h3 className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : `+${stats?.total_added || 0}`}
              </h3>
            </div>
            <ArrowUpCircleIcon className="w-8 h-8 text-green-200" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Retiré</p>
              <h3 className="text-2xl font-bold text-red-600">
                {statsLoading ? '...' : `-${stats?.total_removed || 0}`}
              </h3>
            </div>
            <ArrowDownCircleIcon className="w-8 h-8 text-red-200" />
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Flux Net</p>
              <h3 className="text-2xl font-bold text-blue-600">
                {statsLoading ? '...' : (stats?.net_change >= 0 ? `+${stats.net_change}` : stats.net_change)}
              </h3>
            </div>
            <ArrowPathIcon className="w-8 h-8 text-blue-200" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="p-[var(--spacing-md)]">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Filtres</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de début
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date de fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Raison
              </label>
              <Select
                value={reason}
                onChange={(value) => setReason(value.toString())}
                options={reasonOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <Select
                value={adjustmentType}
                onChange={(value) => setAdjustmentType(value.toString())}
                options={adjustmentTypeOptions}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Recherche de Téléphone
              </label>
              <Input
                type="text"
                placeholder="Marque, modèle..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Utilisateur
              </label>
              <Select
                value={selectedUser}
                onChange={(value) => setSelectedUser(value.toString())}
                options={[
                  { value: '', label: 'Tous les utilisateurs' },
                  ...users.map(u => ({ value: u.id.toString(), label: u.username }))
                ]}
              />
            </div>
            <div className="flex items-end space-x-2">
              <Button onClick={handleFilter} className="flex-1">
                Filtrer
              </Button>
              <Button variant="secondary" onClick={handleClearFilters}>
                Réinitialiser
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* History Table */}
      <Card>
        <div className="p-[var(--spacing-md)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Ajustements ({totalCount})
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="text-sm text-red-800">
                {error.response?.data?.detail || error.message || "Échec du chargement de l'historique"}
              </div>
            </div>
          )}

          <Table
            columns={columns}
            data={history}
            loading={isLoading}
            emptyMessage="Aucun historique trouvé"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
              <div className="text-sm text-slate-600">
                Page <span className="font-semibold text-slate-900">{pagination.currentPage}</span> sur{' '}
                <span className="font-semibold text-slate-900">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === 1}
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                >
                  Précédent
                </Button>
                <div className="flex gap-1">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    // Only show first, last, and pages around current
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= pagination.currentPage - 1 && pageNum <= pagination.currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          variant={pagination.currentPage === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          className="w-10"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    } else if (
                      pageNum === pagination.currentPage - 2 ||
                      pageNum === pagination.currentPage + 2
                    ) {
                      return <span key={pageNum} className="px-2 self-center">...</span>;
                    }
                    return null;
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.currentPage === totalPages}
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                >
                  Suivant
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default StockHistoryPage;

