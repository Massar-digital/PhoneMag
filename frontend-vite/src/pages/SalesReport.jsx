import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { salesAPI } from '../services/api';

import { PDFGenerator, formatCurrency, formatCurrencyNoSeparator, getDateRangeText } from '../utils/pdfGenerator';


// interface SalesReportData {
//   totalSales;
//   totalRevenue;
//   averageSaleValue;
//   // salesByDay: Array<{
//     date;
//     sales;
//     revenue;
//   }>;
//   // topCustomers: Array<{
//     customer_name;
//     total_purchases;
//     total_spent;
//   }>;
// }

const SalesReport = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sales, setSales] = useState([]);

  const generateReport = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch sales data with date filtering
      const response = await salesAPI.getAll({
        start_date: startDate,
        end_date: endDate,
        page_size: 1000 // Get more data for analysis
      });

      const salesData = response.data.results || [];
      setSales(salesData);

      // Calculate report data
      const totalSales = salesData.length;
      const totalRevenue = salesData.reduce((sum, sale) => sum + Number(sale.total_price || 0), 0);
      const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Sales by day
      const dailyMap = new Map();
      salesData.forEach((sale) => {
        const date = new Date(sale.sale_date).toISOString().split('T')[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { sales: 0, revenue: 0 });
        }
        const data = dailyMap.get(date);
        data.sales += 1;
        data.revenue += Number(sale.total_price || 0);
      });

      const salesByDay = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          sales: data.sales,
          revenue: data.revenue
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top customers
      const customerMap = new Map();
      salesData.forEach((sale) => {
        const customer = sale.customer_name || 'Invité';
        if (!customerMap.has(customer)) {
          customerMap.set(customer, { total_purchases: 0, total_spent: 0 });
        }
        const data = customerMap.get(customer);
        data.total_purchases += 1;
        data.total_spent += Number(sale.total_price || 0);
      });

      const topCustomers = Array.from(customerMap.entries())
        .map(([customer_name, data]) => ({
          customer_name,
          total_purchases: data.total_purchases,
          total_spent: data.total_spent
        }))
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 10);

      setReportData({
        totalSales,
        totalRevenue,
        averageSaleValue,
        salesByDay,
        topCustomers
      });

    } catch (error) {
      console.error('Error generating sales report:', error);
      window.showToast('Erreur lors de la génération du rapport des ventes', 'error');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const handleExportCSV = () => {
    if (!reportData || !sales.length) return;

    const csvData = sales.map(sale => {
      const phoneLabel = sale.phone_details ? 
        `${sale.phone_details.brand} ${sale.phone_details.model}` : 
        'Inconnu';
      
      return {
        'Numéro de facture': sale.invoice_number || '',
        'Date': new Date(sale.sale_date).toLocaleDateString('fr-FR'),
        'Client': sale.customer_name || 'Invité',
        'Téléphone': phoneLabel,
        'Quantité': sale.quantity || 1,
        'Prix total': sale.total_price,
        'Remise': sale.discount_applied || 0
      };
    });

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-ventes-${startDate}-au-${endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!reportData) return;

    const pdfGenerator = new PDFGenerator();

    const pdfData = {
      title: 'Rapport de ventes',
      subtitle: 'Analyses complètes des ventes',
      dateRange: `${new Date(startDate).toLocaleDateString('fr-FR')} au ${new Date(endDate).toLocaleDateString('fr-FR')}`,
      summaryData: [
        { label: 'Total des ventes', value: reportData.totalSales.toString() },
        { label: 'Chiffre d\'affaires total', value: formatCurrency(reportData.totalRevenue) },
        { label: 'Valeur moyenne des ventes', value: formatCurrency(reportData.averageSaleValue) },
      ],
      tableData: {
        title: 'Top Clients',
        headers: ['Client', 'Total des achats', 'Total dépensé'],
        rows: reportData.topCustomers.map(customer => [
          customer.customer_name,
          customer.total_purchases.toString(),
          formatCurrency(customer.total_spent)
        ])
      },
      chartData: {
        title: 'Analyses des ventes',
        description: 'Ce rapport inclut les tendances quotidiennes des ventes.'
      }
    };

    pdfGenerator.generateReport(pdfData);
    pdfGenerator.download(`rapport-ventes-${startDate}-au-${endDate}.pdf`);
  };

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Rapport de ventes</h1>
          <p className="text-slate-600 mt-1">Analyses détaillées des ventes et mesures de performance.</p>
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

      {/* Date Range Selector */}
      <Card className="p-[var(--spacing-md)]">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de début
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date de fin
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full md:w-auto">
            <Button
              onClick={generateReport}
              disabled={loading}
              className="w-full"
            >
                {loading ? 'Génération...' : 'Générer'}
            </Button>
          </div>
        </div>
      </Card>

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Génération du rapport de ventes...</p>
        </div>
      )}

      {reportData && !loading && (
        <>
          {/* Summary Stats */}
          <div className="grid-fluid">
            <Card className="p-4 sm:p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-600">{reportData.totalSales}</div>
                <div className="text-sm sm:text-base text-slate-600">Total des ventes</div>
              </div>
            </Card>
            <Card className="p-4 sm:p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-600">{formatCurrencyNoSeparator(reportData.totalRevenue)}</div>
                <div className="text-sm sm:text-base text-slate-600">Chiffre d'affaires total</div>
              </div>
            </Card>
            <Card className="p-4 sm:p-[var(--spacing-md)]">
              <div className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-600">{formatCurrency(reportData.averageSaleValue)}</div>
                <div className="text-sm sm:text-base text-slate-600">Valeur moyenne</div>
              </div>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid-fluid">
            {/* Sales by Day */}
            <Card className="p-[var(--spacing-md)]">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Ventes par jour</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reportData.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#8884d8" name="Nombre de ventes" />
                  <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Chiffre d'affaires (DA)" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top Customers */}
          <Card className="p-[var(--spacing-md)]">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Clients</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total des achats
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Total dépensé
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {reportData.topCustomers.map((customer, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {customer.customer_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {customer.total_purchases}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {formatCurrency(customer.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {!reportData && !loading && (
        <Card className="p-[var(--spacing-md)]">
          <div className="text-center py-8">
            <p className="text-slate-600">Sélectionnez une plage de dates et cliquez sur « Générer le rapport » pour consulter les analyses de ventes.</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SalesReport;

