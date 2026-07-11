import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsGrid } from '../components/dashboard/StatsGrid';
import { TopProductsChart } from '../components/dashboard/TopProductsChart';
import { RecentSalesTable } from '../components/dashboard/RecentSalesTable';
import { LowStockAlerts } from '../components/dashboard/LowStockAlerts';
import { QuickActions } from '../components/dashboard/QuickActions';
import { Button } from '../components/common/Button';
import { dashboardAPI, salesAPI, inventoryAPI } from '../services/api';

import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const statsResponse = await dashboardAPI.getStats(period);
      setStats(statsResponse.data);

      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Fetch only today's sales
      const salesResponse = await salesAPI.getAll({
        start_date: todayStr,
        end_date: todayStr,
        ordering: '-sale_date',
        page_size: 5
      });
      setRecentSales(salesResponse.data.results || []);

      const inventoryResponse = await inventoryAPI.getAll({
        low_stock: true,
        page_size: 5
      });
      setLowStockItems(inventoryResponse.data.results || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  const handleNewSale = () => {
    navigate('/sales', { state: { openNewSale: true } });
  };

  const handleAddPhone = () => {
    navigate('/phones/add');
  };

  const handleViewReports = () => {
    navigate('/reports');
  };

  const periodOptions = [
    { key: 'today', label: 'Aujourd\'hui', icon: '📅' },
    { key: 'week', label: 'Cette semaine', icon: '📊' },
    { key: 'month', label: 'Ce mois-ci', icon: '📈' },
    { key: 'all', label: 'Tout le temps', icon: '🏆' }
  ];

  return (
    <div className="app-container space-y-[var(--spacing-md)] animate-fade-in">
      {/* Header Section */}
      <div className="flex-responsive">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-slate-900">Tableau de bord</h1>
          </div>
          <p className="text-slate-500">
            Bon retour ! Voici ce qui se passe dans votre boutique.
          </p>
        </div>

        {/* Period selector and refresh */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
          {/* Period buttons */}
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar max-w-full">
            {periodOptions.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePeriodChange(key)}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap
                  ${period === key 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
          
          {/* Refresh button */}
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="md"
              onClick={loadDashboardData}
              disabled={loading}
              className="flex-1 sm:flex-initial"
              icon={<ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            >
              Actualiser
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <StatsGrid stats={stats} loading={loading} />

      {/* Charts and Tables Row */}
      <div className="grid-responsive md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Produits les plus vendus</h3>
            <span className="text-xs px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full font-medium">
              {stats?.period || 'Chargement...'}
            </span>
          </div>
          <div className="p-[var(--container-padding)]">
            <TopProductsChart data={stats?.top_products || []} loading={loading} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">Ventes récentes</h3>
              <span className="text-xs px-2.5 py-1 bg-primary-50 text-primary-600 rounded-full font-medium">
                Aujourd'hui
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
              Voir tout
            </Button>
          </div>
          <RecentSalesTable sales={recentSales} loading={loading} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid-responsive md:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">Alertes de stock faible</h3>
              {lowStockItems.length > 0 && (
                <span className="w-6 h-6 rounded-full bg-danger-100 text-danger-600 text-xs font-bold flex items-center justify-center">
                  {lowStockItems.length}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')}>
              Voir tout
            </Button>
          </div>
          <LowStockAlerts items={lowStockItems} loading={loading} onRestock={loadDashboardData} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Actions rapides</h3>
          </div>
          <QuickActions
            onNewSale={handleNewSale}
            onAddPhone={handleAddPhone}
            onViewReports={handleViewReports}
          />
        </div>
      </div>
    </div>
  );
};


export default Dashboard;

