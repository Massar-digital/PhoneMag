import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  DevicePhoneMobileIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';

/**
 * MobileDashboard - Mobile-optimized dashboard for admin on-the-go
 * Perfect for checking store status from phone
 */
export const MobileDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    fetchDashboardData();
  }, [period]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes, inventoryRes] = await Promise.all([
        api.get('/dashboard/stats/', { params: { period } }),
        api.get('/sales/', { params: { page_size: 5, ordering: '-sale_date' } }),
        api.get('/inventory/', { params: { low_stock: true, page_size: 5 } })
      ]);

      setStats(statsRes.data);
      setRecentSales(salesRes.data.results || []);
      setLowStockItems(inventoryRes.data.results || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' DA';
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "À l'instant";
    if (diffInHours < 24) return `Il y a ${diffInHours}h`;
    return date.toLocaleDateString('fr-DZ', { month: 'short', day: 'numeric' });
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      red: 'bg-red-50 text-red-600'
    };

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
              {trend === 'up' ? <ArrowTrendingUpIcon className="w-4 h-4" /> : <ArrowTrendingDownIcon className="w-4 h-4" />}
              {trendValue}
            </div>
          )}
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-1">{value}</h3>
        <p className="text-sm text-slate-600">{title}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white p-[var(--spacing-md)] pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bonjour, {user?.first_name || 'Admin'} ! 👋</h1>
            <p className="text-primary-100 text-sm mt-1">Voici l'aperçu de votre boutique</p>
          </div>
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 bg-white/10 backdrop-blur p-1 rounded-xl">
          {[
            { key: 'today', label: "Auj." },
            { key: 'week', label: 'Sem.' },
            { key: 'month', label: 'Mois' },
            { key: 'all', label: 'Tout' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                period === key 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            title="Chiffre d'Affaires"
            value={formatCurrency(stats?.sales?.total_revenue || 0)}
            subtitle={`${stats?.sales?.total_sales || 0} ventes`}
            icon={CurrencyDollarIcon}
            color="green"
            trend="up"
            trendValue="+12%"
          />
          <StatCard
            title="Bénéfice Total"
            value={formatCurrency(stats?.sales?.total_profit || 0)}
            subtitle={`Moy: ${formatCurrency(stats?.sales?.total_profit / (stats?.sales?.total_sales || 1))}`}
            icon={ChartBarIcon}
            color="blue"
          />
          <StatCard
            title="Tél. Vendus"
            value={stats?.sales?.total_quantity_sold || 0}
            subtitle={`${stats?.sales?.total_sales || 0} transactions`}
            icon={DevicePhoneMobileIcon}
            color="purple"
          />
          <StatCard
            title="En Stock"
            value={stats?.inventory?.total_stock_quantity || 0}
            subtitle={`${stats?.inventory?.total_phones || 0} modèles`}
            icon={ShoppingBagIcon}
            color="orange"
          />
        </div>

        {/* Alerts */}
        {(stats?.inventory?.low_stock_count > 0 || stats?.inventory?.out_of_stock_count > 0) && (
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">Alertes Stock</h3>
                <p className="text-sm text-amber-800">
                  {stats?.inventory?.low_stock_count} articles en stock bas
                  {stats?.inventory?.out_of_stock_count > 0 && ` • ${stats?.inventory?.out_of_stock_count} en rupture`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recent Sales */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Ventes Récentes</h2>
            <button 
              onClick={() => navigate('/sales')}
              className="text-sm text-primary-600 font-medium"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-3">
            {recentSales.length === 0 ? (
              <p className="text-center text-slate-400 py-8">Aucune vente récente</p>
            ) : (
              recentSales.map((sale) => (
                <div 
                  key={sale.id}
                  onClick={() => navigate(`/sales/${sale.id}`)}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl active:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {sale.customer_name || 'Client de passage'}
                    </p>
                    <p className="text-sm text-slate-500 truncate">
                      {sale.phone_brand} {sale.phone_model}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-900">{formatCurrency(sale.total_price)}</p>
                    <p className="text-xs text-slate-400">{formatTime(sale.sale_date)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Alertes Stock Bas</h2>
              <button 
                onClick={() => navigate('/inventory')}
                className="text-sm text-primary-600 font-medium"
              >
                Voir tout
              </button>
            </div>
            <div className="space-y-3">
              {lowStockItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/phones/${item.phone?.id}`)}
                  className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100 active:bg-red-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {item.phone?.brand} {item.phone?.model}
                    </p>
                    <p className="text-sm text-slate-500">{item.phone?.storage} • {item.phone?.color}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-red-600">{item.stock_quantity} restants</p>
                    <p className="text-xs text-slate-400">Min: {item.reorder_level}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/pos')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center">
                <CurrencyDollarIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-900">Nouvelle Vente</span>
            </button>
            
            <button
              onClick={() => navigate('/phones')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-900">Produits</span>
            </button>
            
            <button
              onClick={() => navigate('/inventory')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center">
                <ShoppingBagIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-900">Inventaire</span>
            </button>
            
            <button
              onClick={() => navigate('/customers')}
              className="flex flex-col items-center gap-2 p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl active:scale-95 transition-transform"
            >
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-900">Clients</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Padding for Mobile Nav */}
      <div className="h-20"></div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
};

