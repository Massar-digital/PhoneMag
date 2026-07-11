import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { salesAPI } from '../services/api';
import { formatCurrency } from '../utils/pdfGenerator';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const EmployeePerformance = () => {
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [performanceData, setPerformanceData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPerformance = useCallback(async () => {
    try {
      setLoading(true);
      const response = await salesAPI.getEmployeePerformance({
        start_date: startDate,
        end_date: endDate
      });
      setPerformanceData(response.data);
    } catch (error) {
      console.error('Error fetching employee performance:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Performance des Employés</h1>
          <p className="text-slate-600">Suivez les ventes et les revenus par employé.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Du :</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-slate-700">Au :</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
          </div>
          <Button onClick={fetchPerformance} disabled={loading}>
            {loading ? 'Chargement...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[var(--spacing-md)]">
        <Card className="p-[var(--spacing-md)]">
          <h3 className="text-lg font-semibold mb-4">Chiffre d'Affaires par Employé</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user__username" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="total_revenue" name="C.A. Total" fill="#3b82f6">
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-[var(--spacing-md)]">
          <h3 className="text-lg font-semibold mb-4">Nombre de Ventes par Employé</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="user__username" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="total_sales" name="Total Ventes" fill="#10b981">
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Employé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Total Ventes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Articles</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">C.A. Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Profit Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Panier Moyen</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {performanceData.map((item) => (
                <tr key={item.user__id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900">
                      {item.user__first_name || item.user__username} {item.user__last_name || ''}
                    </div>
                    <div className="text-sm text-slate-500">@{item.user__username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {item.total_sales}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {item.total_items || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">
                    {formatCurrency(item.total_revenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-600 font-semibold">
                    {formatCurrency(item.total_profit)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatCurrency(item.total_revenue / item.total_sales)}
                  </td>
                </tr>
              ))}
              {performanceData.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-10 text-center text-slate-500">
                    Aucune donnée de performance trouvée pour la période sélectionnée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default EmployeePerformance;

