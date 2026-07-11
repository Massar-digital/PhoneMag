import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { salesAPI, inventoryAPI, expensesAPI } from '../services/api';
import { PDFGenerator, formatCurrency, getDateRangeText } from '../utils/pdfGenerator';

// interface ProfitData {
//   totalRevenue;
//   totalCost;
//   grossProfit;
//   profitMargin;
//   // profitByProduct: Array<{
//     phone;
//     brand;
//     revenue;
//     cost;
//     profit;
//     margin;
//     quantity;
//   }>;
//   // profitByBrand: Array<{
//     brand;
//     revenue;
//     cost;
//     profit;
//     margin;
//   }>;
//   // profitTrend: Array<{
//     date;
//     revenue;
//     cost;
//     profit;
//   }>;
// }

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const ProfitReport = () => {
  const [profitData, setProfitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('month');

  useEffect(() => {
    fetchProfitData();
  }, [dateRange]);

  const fetchProfitData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch sales, inventory and expenses data
      const [salesResponse, inventoryResponse, expensesResponse] = await Promise.all([
        salesAPI.getAll(),
        inventoryAPI.getAll(),
        expensesAPI.getAll()
      ]);

      const sales = salesResponse.data.results || salesResponse.data;
      const inventory = inventoryResponse.data.results || inventoryResponse.data;
      const expenses = expensesResponse.data.results || expensesResponse.data;

      // Calculate profit metrics
      const profitMetrics = calculateProfitMetrics(sales, inventory, expenses);
      setProfitData(profitMetrics);
    } catch (err) {
      console.error('Error fetching profit data:', err);
      setError('Échec du chargement des données de profit. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const calculateProfitMetrics = (sales, inventory, expenses) => {
    // Filter data by date range
    const now = new Date();
    let startDate = new Date();
    
    if (dateRange === 'day') {
      startDate.setHours(0, 0, 0, 0);
    } else if (dateRange === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (dateRange === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (dateRange === 'quarter') {
      startDate.setMonth(now.getMonth() - 3);
    } else if (dateRange === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      startDate = new Date(0); // All time
    }

    const filteredSales = sales.filter(sale => new Date(sale.sale_date) >= startDate);
    const filteredExpenses = expenses.filter(expense => new Date(expense.date) >= startDate);

    // Create inventory map for quick lookup
    const inventoryMap = new Map();
    inventory.forEach(item => {
      if (item && item.phone && item.phone.id) {
        inventoryMap.set(item.phone.id, item);
      }
    });

    // Calculate profit by product
    const productProfitMap = new Map();
    const brandProfitMap = new Map();
    const dateProfitMap = new Map();

    filteredSales.forEach(sale => {
      const phone = sale.phone;
      if (!phone || !phone.id) return; // Skip sales with missing phone data

      const inventoryItem = inventoryMap.get(phone.id);
      const purchasePrice = Number(inventoryItem?.phone?.purchase_price || 0);
      const revenue = Number(sale.total_price || 0);
      const sellingPrice = revenue / sale.quantity;
      const profit = sellingPrice - purchasePrice;
      const cost = purchasePrice * sale.quantity;

      // Product profit
      const productKey = `${phone.brand} ${phone.model}`;
      if (!productProfitMap.has(productKey)) {
        productProfitMap.set(productKey, {
          phone: productKey,
          brand: phone.brand,
          revenue: 0,
          cost: 0,
          profit: 0,
          quantity: 0
        });
      }
      const productData = productProfitMap.get(productKey);
      productData.revenue += revenue;
      productData.cost += cost;
      productData.profit += profit * sale.quantity;
      productData.quantity += sale.quantity;

      // Brand profit
      if (!brandProfitMap.has(phone.brand)) {
        brandProfitMap.set(phone.brand, {
          brand: phone.brand,
          revenue: 0,
          cost: 0,
          profit: 0
        });
      }
      const brandData = brandProfitMap.get(phone.brand);
      brandData.revenue += revenue;
      brandData.cost += cost;
      brandData.profit += profit * sale.quantity;

      // Date profit (group by day)
      const saleDate = new Date(sale.sale_date).toISOString().split('T')[0];
      if (!dateProfitMap.has(saleDate)) {
        dateProfitMap.set(saleDate, {
          date: saleDate,
          revenue: 0,
          cost: 0,
          profit: 0
        });
      }
      const dateData = dateProfitMap.get(saleDate);
      dateData.revenue += revenue;
      dateData.cost += cost;
      dateData.profit += profit * sale.quantity;
    });

    // Calculate totals
    let totalRevenue = 0;
    let totalCost = 0;
    let totalGrossProfit = 0;

    filteredSales.forEach(sale => {
      const phone = sale.phone;
      const inventoryItem = inventoryMap.get(phone.id);
      const purchasePrice = inventoryItem?.phone?.purchase_price || 0;
      const cost = purchasePrice * sale.quantity;

      totalRevenue += Number(sale.total_price || 0);
      totalCost += cost;
      totalGrossProfit += (Number(sale.total_price || 0) - cost);
    });

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount || 0), 0);
    const netProfit = totalGrossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Convert maps to arrays and calculate margins
    const profitByProduct = Array.from(productProfitMap.values()).map(product => ({
      ...product,
      margin: product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit);

    const profitByBrand = Array.from(brandProfitMap.values()).map(brand => ({
      ...brand,
      margin: brand.revenue > 0 ? (brand.profit / brand.revenue) * 100 : 0
    })).sort((a, b) => b.profit - a.profit);

    const profitTrend = Array.from(dateProfitMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Last 30 days

    return {
      totalRevenue,
      totalCost,
      grossProfit: totalGrossProfit,
      totalExpenses,
      netProfit,
      profitMargin,
      profitByProduct,
      profitByBrand,
      profitTrend
    };
  };

  const exportToCSV = () => {
    if (!profitData) return;

    const csvData = [
      ['Résumé du Rapport de Profit'],
      ['Chiffre d\'affaires total', profitData.totalRevenue.toFixed(2)],
      ['Coût total', profitData.totalCost.toFixed(2)],
      ['Bénéfice brut', profitData.grossProfit.toFixed(2)],
      ['Marge bénéficiaire', `${profitData.profitMargin.toFixed(2)}%`],
      [''],
      ['Bénéfice par produit'],
      ['Produit', 'Marque', 'Revenu', 'Coût', 'Bénéfice', 'Marge %', 'Quantité'],
      ...profitData.profitByProduct.map(product => [
        product.phone,
        product.brand,
        product.revenue.toFixed(2),
        product.cost.toFixed(2),
        product.profit.toFixed(2),
        product.margin.toFixed(2),
        product.quantity
      ]),
      [''],
      ['Bénéfice par Marque'],
      ['Marque', 'Revenu', 'Coût', 'Bénéfice', 'Marge %'],
      ...profitData.profitByBrand.map(brand => [
        brand.brand,
        brand.revenue.toFixed(2),
        brand.cost.toFixed(2),
        brand.profit.toFixed(2),
        brand.margin.toFixed(2)
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `rapport_profit_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToPDF = () => {
    if (!profitData) return;

    const pdfGenerator = new PDFGenerator();

    const pdfData = {
      title: 'Rapport de Profit',
      subtitle: 'Analyse complète des bénéfices',
      dateRange: dateRange === 'custom' 
        ? `${customStartDate} à ${customEndDate}` 
        : getDateRangeText(dateRange),
      summaryData: [
        { label: 'Chiffre d\'affaires total', value: formatCurrency(profitData.totalRevenue) },
        { label: 'Coût total', value: formatCurrency(profitData.totalCost) },
        { label: 'Bénéfice brut', value: formatCurrency(profitData.grossProfit) },
        { label: 'Bénéfice net', value: formatCurrency(profitData.netProfit) },
        { label: 'Marge bénéficiaire', value: `${profitData.profitMargin.toFixed(2)}%` },
      ],
      tableData: {
        title: 'Produits les plus rentables',
        headers: ['Produit', 'Marque', 'Revenu', 'Coût', 'Bénéfice', 'Marge %', 'Quantité'],
        rows: profitData.profitByProduct.slice(0, 10).map(product => [
          product.phone,
          product.brand,
          formatCurrency(product.revenue),
          formatCurrency(product.cost),
          formatCurrency(product.profit),
          `${product.margin.toFixed(2)}%`,
          product.quantity.toString()
        ])
      },
      chartData: {
        title: 'Analyse de Profit',
        description: 'Ce rapport comprend une analyse des bénéfices par marque, la performance des produits et l\'évolution des bénéfices au fil du temps.'
      }
    };
    pdfGenerator.generateReport(pdfData);
    pdfGenerator.download(`rapport-profit-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchProfitData}>Réessayer</Button>
      </div>
    );
  }

  if (!profitData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Aucune donnée de profit disponible.</p>
      </div>
    );
  }

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Rapport de Profit</h1>
          <p className="text-gray-600 mt-1">Analyse approfondie du profit et perspectives</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-10"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">La semaine dernière</option>
            <option value="month">Le mois dernier</option>
            <option value="quarter">Le dernier trimestre</option>
            <option value="year">L'année dernière</option>
            <option value="all">Tout l'historique</option>
          </select>
          <Button
            onClick={() => {
              if (window.electron && window.electron.print) {
                window.electron.print();
              } else {
                window.print();
              }
            }}
            variant="secondary"
            size="sm"
          >
            Imprimer
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-fluid">
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-sm font-medium text-gray-500">Chiffre d'affaires total</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(profitData.totalRevenue)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-sm font-medium text-gray-500">Coût total (Stock)</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(profitData.totalCost)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-sm font-medium text-gray-500">Bénéfice brut</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(profitData.grossProfit)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-sm font-medium text-gray-500">Dépenses totales (Frais)</h3>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(profitData.totalExpenses)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-sm font-medium text-gray-500">Bénéfice net</h3>
            <p className="text-2xl font-bold text-indigo-600">{formatCurrency(profitData.netProfit)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-sm font-medium text-gray-500">Marge bénéficiaire nette</h3>
            <p className="text-2xl font-bold text-purple-600">{profitData.profitMargin.toFixed(2)}%</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid-fluid">
        {/* Profit by Brand */}
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-lg font-semibold mb-4">Bénéfice par Marque</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={profitData.profitByBrand}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="brand" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value.toLocaleString()} DA`, 'Bénéfice']} />
                <Bar dataKey="profit" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Profit Margin by Brand */}
        <Card>
          <div className="p-[var(--spacing-md)]">
            <h3 className="text-lg font-semibold mb-4">Marge bénéficiaire par Marque</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={profitData.profitByBrand}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="margin"
                  nameKey="brand"
                >
                  {profitData.profitByBrand.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toFixed(2)}%`, 'Marge']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Profit Trend */}
      <Card>
        <div className="p-[var(--spacing-md)]">
          <h3 className="text-lg font-semibold mb-4">Évolution du Bénéfice (30 derniers jours)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={profitData.profitTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value.toLocaleString()} DA`, '']} />
              <Line type="monotone" dataKey="revenue" stroke="#00C49F" name="Revenu" />
              <Line type="monotone" dataKey="cost" stroke="#FF8042" name="Coût" />
              <Line type="monotone" dataKey="profit" stroke="#8884d8" name="Bénéfice" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Profit by Product Table */}
      <Card>
        <div className="p-[var(--spacing-md)]">
          <h3 className="text-lg font-semibold mb-4">Bénéfice par Produit</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marque
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenu
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Coût
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bénéfice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Marge %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {profitData.profitByProduct.map((product, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.brand}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.revenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      {formatCurrency(product.profit)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.margin.toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProfitReport;

