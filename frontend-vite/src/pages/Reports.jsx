import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsGrid } from '../components/dashboard/StatsGrid';
import { TopProductsChart } from '../components/dashboard/TopProductsChart';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { dashboardAPI } from '../services/api';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import { formatCurrency } from '../utils/pdfGenerator';


const Reports = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');

  const loadReportsData = useCallback(async () => {
    try {
      setLoading(true);
      const statsResponse = await dashboardAPI.getStats(period);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Error loading reports data:', error);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };


  const handleExportReport = (reportType) => {
    if (!stats) return;

    let csvContent = "";
    let fileName = "";

    if (reportType === 'sales') {
      csvContent = "Rapport,Valeur\n" +
        `Ventes Totales,${stats.sales.total_sales}\n` +
        `Chiffre d'Affaires,${stats.sales.total_revenue}\n` +
        `Valeur Moyenne des Ventes,${stats.sales.average_sale_value}\n` +
        `Bénéfice Total,${stats.sales.total_profit}\n` +
        `Unités Vendues,${stats.sales.total_quantity_sold}`;
      fileName = `resume_ventes_${period}.csv`;
    } else if (reportType === 'inventory') {
      csvContent = "Rapport,Valeur\n" +
        `Total Téléphones,${stats.inventory.total_phones}\n` +
        `Quantité Totale en Stock,${stats.inventory.total_stock_quantity}\n` +
        `Valeur Totale de l'Inventaire,${stats.inventory.total_inventory_value}\n` +
        `Articles en Stock Faible,${stats.inventory.low_stock_count}\n` +
        `Articles en Rupture de Stock,${stats.inventory.out_of_stock_count}`;
      fileName = `resume_inventaire_${period}.csv`;
    } else if (reportType === 'profit') {
      const margin = stats.sales.total_revenue ? 
        ((stats.sales.total_profit / stats.sales.total_revenue) * 100).toFixed(2) : "0";
      csvContent = "Rapport,Valeur\n" +
        `Chiffre d'Affaires,${stats.sales.total_revenue}\n` +
        `Bénéfice Total,${stats.sales.total_profit}\n` +
        `Marge Bénéficiaire %,${margin}\n` +
        `Unités Vendues,${stats.sales.total_quantity_sold}`;
      fileName = `resume_profit_${period}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <div className="flex-responsive">
        <div>
          <h1 className="text-slate-900">Rapports</h1>
          <p className="text-slate-600">Aperçu complet de la performance de votre entreprise.</p>
        </div>

        {/* Period selector */}
        <div className="flex bg-slate-100 rounded-xl p-1 gap-1 overflow-x-auto no-scrollbar max-w-full">
          {[
            { key: 'day', label: "Aujourd'hui" },
            { key: 'week', label: 'Cette semaine' },
            { key: 'month', label: 'Ce mois-ci' },
            { key: 'quarter', label: 'Ce trimestre' },
            { key: 'year', label: 'Cette année' },
            { key: 'all', label: 'Tout le temps' }
          ].map(({ key, label }) => (
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
      </div>

      {/* Quick Stats Summary */}
      <StatsGrid stats={stats} loading={loading} />

      {/* Report Sections */}
      <div className="grid-responsive">
        {/* Sales Report Card */}
        <Card className="p-[var(--spacing-md)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Rapport des ventes</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/reports/sales')}
              >
                Voir détails
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Total des ventes :</span>
              <span className="font-medium">{stats?.sales?.total_sales || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Revenu :</span>
              <span className="font-medium">{stats?.sales?.total_revenue?.toLocaleString() || '0.00'} DA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Vente moy. :</span>
              <span className="font-medium">{stats?.sales?.average_sale_value?.toLocaleString() || '0.00'} DA</span>
            </div>
          </div>
        </Card>

        {/* Inventory Report Card */}
        <Card className="p-[var(--spacing-md)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Rapport d'inventaire</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/reports/inventory')}
              >
                Voir détails
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Total téléphones :</span>
              <span className="font-medium">{stats?.inventory?.total_phones || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Valeur du stock :</span>
              <span className="font-medium">{stats?.inventory?.total_inventory_value?.toLocaleString() || '0.00'} DA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Stock faible :</span>
              <span className="font-medium text-orange-600">{stats?.inventory?.low_stock_count || 0}</span>
            </div>
          </div>
        </Card>

        {/* Profit Report Card */}
        <Card className="p-[var(--spacing-md)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Rapport de profit</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/reports/profit')}
              >
                Voir détails
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Bénéfice total :</span>
              <span className="font-medium text-green-600">{stats?.sales?.total_profit?.toLocaleString() || '0.00'} DA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Marge bénéficiaire :</span>
              <span className="font-medium">
                  {stats?.sales?.total_revenue
                    ? ((stats?.sales?.total_profit / stats?.sales?.total_revenue) * 100).toFixed(1) : '0.0'}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Unités vendues :</span>
              <span className="font-medium">{stats?.sales?.total_quantity_sold || 0}</span>
            </div>
          </div>
        </Card>

      </div>

      {/* Top Products Chart */}
      <div className="grid-responsive">
        <Card className="p-[var(--spacing-md)]">
          <h3 className="font-semibold text-slate-900 mb-4">Produits les plus vendus</h3>
          <TopProductsChart data={stats?.top_products || []} loading={loading} />
        </Card>
      </div>
      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

export default Reports;

