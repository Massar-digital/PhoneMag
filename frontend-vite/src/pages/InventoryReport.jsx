import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { inventoryAPI, salesAPI } from '../services/api';

import { PDFGenerator, formatCurrency } from '../utils/pdfGenerator';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const InventoryReport = () => {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deadStockDays, setDeadStockDays] = useState(90);

  const generateReport = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch inventory data with a large page size to avoid truncation
      const inventoryResponse = await inventoryAPI.getAll({
        page_size: 1000 
      });
      // Handle both paginated and non-paginated responses
      const inventoryItems = Array.isArray(inventoryResponse.data) 
        ? inventoryResponse.data 
        : (inventoryResponse.data.results || []);

      // Fetch sales data to determine last sale dates
      const salesResponse = await salesAPI.getAll({
        page_size: 1000,
        ordering: '-sale_date'
      });
      // Handle both paginated and non-paginated responses
      const salesData = Array.isArray(salesResponse.data) 
        ? salesResponse.data 
        : (salesResponse.data.results || []);

      // Calculate report data
      let totalStockValue = 0;
      const brandMap = new Map();
      const lastSaleMap = new Map();

      // Process sales data to get last sale dates
      salesData.forEach(sale => {
        if (sale && sale.phone && sale.phone.id) {
          const phoneId = sale.phone.id;
          if (!lastSaleMap.has(phoneId)) {
            lastSaleMap.set(phoneId, sale.sale_date);
          }
        } else if (sale && sale.items && Array.isArray(sale.items)) {
          // Check multi-item sales
          sale.items.forEach(item => {
            if (item && item.phone && !lastSaleMap.has(item.phone)) {
                lastSaleMap.set(item.phone, sale.sale_date);
            }
          });
        }
      });

      // Process inventory data
      const lowStockItems = [];
      const deadStockItems = [];
      const detailedItems = [];

      inventoryItems.forEach(item => {
        if (!item || !item.phone_details) {
            // If phone_details is missing, skip or use phone ID
            if (!item || !item.phone) return;
        }

        const phoneInfo = item.phone_details || item.phone;
        const brand = phoneInfo.brand || 'Inconnu';
        const purchasePrice = Number(phoneInfo.purchase_price) || 0;
        const stockQuantity = Number(item.stock_quantity) || 0;
        const reorderLevel = Number(item.reorder_level) || 0;

        const stockValue = stockQuantity * purchasePrice;
        totalStockValue += stockValue;

        // Group by brand
        if (!brandMap.has(brand)) {
          brandMap.set(brand, { itemCount: 0, totalValue: 0, totalStock: 0 });
        }
        const brandData = brandMap.get(brand);
        if (brandData) {
          brandData.itemCount += 1;
          brandData.totalValue += stockValue;
          brandData.totalStock += stockQuantity;
        }

        // Check for low stock
        if (stockQuantity <= reorderLevel) {
          lowStockItems.push(item);
        }

        // Check for dead stock
        const lastSaleDate = lastSaleMap.get(phoneInfo.id);
        if (lastSaleDate) {
          const daysSinceLastSale = Math.floor(
            (new Date().getTime() - new Date(lastSaleDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceLastSale >= deadStockDays) {
            deadStockItems.push({
              phone: phoneInfo,
              stock_quantity: stockQuantity,
              last_sale_date: lastSaleDate,
              days_since_last_sale: daysSinceLastSale,
              stock_value: stockValue
            });
          }
        } else {
          // No sales ever - consider dead stock if it's been in stock for a while
          // For simplicity, we just count them as dead stock here
          deadStockItems.push({
            phone: phoneInfo,
            stock_quantity: stockQuantity,
            days_since_last_sale: -1, // Never sold
            stock_value: stockValue
          });
        }
      });

      const stockByBrand = Array.from(brandMap.entries()).map(([brand, data]) => ({
        brand,
        itemCount: data.itemCount,
        totalValue: data.totalValue,
        totalStock: data.totalStock
      }));

      setReportData({
        totalStockValue,
        totalItems: inventoryItems.length,
        lowStockItems,
        stockByBrand,
        deadStockItems
      });

    } catch (error) {
      console.error('Error generating inventory report:', error);
    } finally {
      setLoading(false);
    }
  }, [deadStockDays]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleExportCSV = () => {
    if (!reportData) return;

    // Export inventory summary
    const inventoryData = reportData.stockByBrand.map(brand => ({
      'Marque': brand.brand,
      'Nombre d\'articles': brand.itemCount,
      'Stock Total': brand.totalStock,
      'Valeur du Stock': brand.totalValue.toFixed(2)
    }));

    const csvString = [
      Object.keys(inventoryData[0]).join(','),
      ...inventoryData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-stock-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    const pdfGenerator = new PDFGenerator();

    const pdfData = {
      title: 'Rapport d\'Inventaire',
      subtitle: `Seuil de stock dormant : ${deadStockDays} jours`,
      dateRange: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      summaryData: [
        { label: 'Articles Uniques', value: reportData.totalItems.toString() },
        { label: 'Valeur Totale du Stock', value: formatCurrency(reportData.totalStockValue) },
        { label: 'Articles en Stock Faible', value: reportData.lowStockItems.length.toString() },
        { label: 'Articles en Stock Dormant', value: reportData.deadStockItems.length.toString() },
      ],
      tableData: {
        title: 'Stock par Marque',
        headers: ['Marque', 'Articles', 'Stock Total', 'Valeur du Stock'],
        rows: reportData.stockByBrand.map(brand => [
          brand.brand,
          brand.itemCount.toString(),
          brand.totalStock.toString(),
          formatCurrency(brand.totalValue)
        ])
      },
      chartData: {
        title: 'Analyses d\'Inventaire',
        description: 'Ce rapport comprend la valeur du stock par marque et une analyse de la distribution des stocks.'
      }
    };

    const pdf = pdfGenerator.generateReport(pdfData);
    pdfGenerator.download(`rapport-stock-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const showLoading = loading;
  const showReport = reportData && !loading;
  const showNoReport = !reportData && !loading;

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Rapport d'Inventaire</h1>
          <p className="text-slate-600 mt-1">Analyse approfondie pour une meilleure gestion des stocks.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (window.electron && window.electron.print) {
                window.electron.print();
              } else {
                window.print();
              }
            }}
            disabled={!reportData}
            size="sm"
          >
            Imprimer
          </Button>
        </div>
      </div>

      {/* Dead Stock Days Setting */}
      <Card className="p-[var(--spacing-md)]">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Seuil de Stock Dormant (jours depuis la dernière vente)
            </label>
            <input
              type="number"
              value={deadStockDays}
              onChange={(e) => setDeadStockDays(parseInt(e.target.value) || 0)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 border"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Button
              onClick={generateReport}
              disabled={loading}
              className="w-full"
            >
                {loading ? 'Calcul...' : 'Recalculer'}
            </Button>
          </div>
        </div>
      </Card>

      {showLoading ?
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Génération du rapport d'inventaire...</p>
        </div>
      : null}

      {showReport ?
        <div className="space-y-[var(--spacing-md)]">
          {/* Summary Cards */}
          <div className="grid-fluid">
            <Card className="p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{reportData.totalStockValue.toLocaleString()} DA</div>
                <div className="text-slate-600">Valeur Totale du Stock</div>
              </div>
            </Card>
            <Card className="p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{reportData.totalItems}</div>
                <div className="text-slate-600">Articles Uniques</div>
              </div>
            </Card>
            <Card className="p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">{reportData.lowStockItems.length}</div>
                <div className="text-slate-600">Stock Faible</div>
              </div>
            </Card>
            <Card className="p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{reportData.deadStockItems.length}</div>
                <div className="text-slate-600">Stock Dormant</div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid-fluid">
            <Card className="p-[var(--spacing-md)]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Valeur du Stock par Marque</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={reportData.stockByBrand}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="brand" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value.toLocaleString()} DA`, 'Valeur']} />
                  <Legend />
                  <Bar dataKey="totalValue" fill="#0088FE" name="Valeur (DA)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-[var(--spacing-md)]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution du Stock</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={reportData.stockByBrand}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="totalStock"
                  >
                    {reportData.stockByBrand.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Tables Row */}
          <div className="grid grid-cols-1 gap-[var(--spacing-md)]">
            {/* Low Stock Table */}
            <Card className="p-[var(--spacing-md)]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Alertes de Stock Bas</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Stock Actuel</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Point de Commande</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {reportData.lowStockItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {item.phone.brand} {item.phone.model}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {item.stock_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {item.reorder_level}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            item.stock_quantity === 0 ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                          }`}>
                            {item.stock_quantity === 0 ? 'Rupture' : 'Stock Bas'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {reportData.lowStockItems.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">
                          Tous les produits sont suffisamment approvisionnés.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Dead Stock Table */}
            <Card className="p-[var(--spacing-md)]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Stock Dormant (Aucune vente depuis {deadStockDays} Jours)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Produit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qté Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Dernière Vente</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Valeur du Stock</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {reportData.deadStockItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {item.phone.brand} {item.phone.model}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {item.stock_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {item.days_since_last_sale === -1 ? 'Jamais vendu' : `Il y a ${item.days_since_last_sale} jours`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-medium">
                          {item.stock_value.toLocaleString()} DA
                        </td>
                      </tr>
                    ))}
                    {reportData.deadStockItems.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">
                          Aucun stock dormant identifié.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      : null}

      {showNoReport ?
        <Card className="p-[var(--spacing-md)]">
          <div className="text-center py-8">
            <p className="text-slate-600">Cliquez sur "Mettre à jour" pour générer l'analyse de l'inventaire.</p>
          </div>
        </Card>
      : null}
    </div>
  );
};

export default InventoryReport;

