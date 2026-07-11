import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { expensesAPI } from '../services/api';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    category: '',
    date: '',
  });
  const [newExpense, setNewExpense] = useState({
    category: 'Other',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const categoryOptions = [
    { value: '', label: 'Toutes les catégories' },
    { value: 'Rent', label: 'Loyer' },
    { value: 'Electricity', label: 'Électricité' },
    { value: 'Water', label: 'Eau' },
    { value: 'Internet', label: 'Internet' },
    { value: 'Salaries', label: 'Salaires' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Supplies', label: 'Fournitures' },
    { value: 'Maintenance', label: 'Entretien' },
    { value: 'Tax', label: 'Taxes' },
    { value: 'Other', label: 'Autre' },
  ];

  const loadExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      const response = await expensesAPI.getAll(params);
      setExpenses(response.data.results || response.data);
    } catch (error) {
      console.error('Failed to load expenses', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleOpenModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setNewExpense({
        category: expense.category,
        amount: expense.amount,
        description: expense.description || '',
        date: expense.date,
      });
    } else {
      setEditingExpense(null);
      setNewExpense({
        category: 'Other',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setIsModalOpen(true);
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingExpense) {
        await expensesAPI.update(editingExpense.id, newExpense);
        window.showToast?.('Dépense modifiée avec succès', 'success');
      } else {
        await expensesAPI.create(newExpense);
        window.showToast?.('Dépense ajoutée avec succès', 'success');
      }
      setIsModalOpen(false);
      loadExpenses();
    } catch (error) {
      console.error('Failed to save expense', error);
      window.showToast?.("Échec de l'enregistrement", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = (id) => {
    setExpenseToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await expensesAPI.delete(expenseToDelete);
      loadExpenses();
      window.showToast?.('Dépense supprimée', 'success');
    } catch (error) {
      console.error('Failed to delete expense', error);
      window.showToast?.('Échec de la suppression', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setExpenseToDelete(null);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

  return (
    <div className="min-h-screen bg-slate-50/50">
      <PageHeader
        title="Suivi des Dépenses"
        subtitle="Gérez les coûts de la boutique et les frais généraux"
        actions={
          <Button
            onClick={() => handleOpenModal()}
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Ajouter une dépense
          </Button>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)] mb-8">
          <Card className="p-[var(--spacing-md)] bg-white border-slate-200/60">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-danger-50 rounded-xl">
                <BanknotesIcon className="w-6 h-6 text-danger-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total des dépenses (vue actuelle)</p>
                <p className="text-2xl font-bold text-slate-900">{totalExpenses.toFixed(2)} DA</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-8 p-4 bg-white border-slate-200/60">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              value={filters.category}
              onChange={(val) => setFilters({ ...filters, category: val })}
              options={categoryOptions}
              placeholder="Filtrer par catégorie"
            />
            <Input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              leftIcon={<CalendarDaysIcon className="w-5 h-5" />}
            />
            <Button
              variant="secondary"
              onClick={() => setFilters({ category: '', date: '' })}
            >
              Réinitialiser
            </Button>
          </div>
        </Card>

        {/* Expenses View */}
        <Card className="overflow-hidden bg-white border-slate-200/60">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-12">
              <BanknotesIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune dépense trouvée</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="hidden md:table w-full text-left border-collapse">
                  <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60">
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">Date</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">Catégorie</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">Description</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">Montant</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700">Enregistré par</th>
                    <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                          {categoryOptions.find(o => o.value === expense.category)?.label || expense.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{expense.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-bold text-danger-600">{parseFloat(expense.amount).toFixed(2)} DA</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{expense.user_name}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(expense)}
                          className="text-blue-600 hover:bg-blue-50"
                          icon={<PencilSquareIcon className="w-4 h-4" />}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="text-danger-600 hover:bg-danger-50"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-200/60">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-slate-100 text-slate-600">
                        {categoryOptions.find(o => o.value === expense.category)?.label || expense.category}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(expense.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-danger-600">
                        {parseFloat(expense.amount).toFixed(2)} DA
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">par {expense.user_name}</p>
                    </div>
                  </div>
                  {expense.description && (
                    <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg italic border-l-2 border-danger-200">
                      "{expense.description}"
                    </p>
                  )}
                  <div className="flex justify-end pt-1 gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenModal(expense)}
                      className="text-blue-600"
                      icon={<PencilSquareIcon className="w-4 h-4" />}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="text-danger-600"
                      icon={<TrashIcon className="w-4 h-4" />}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
      </div>

      {/* Add Expense Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExpense ? "Modifier la Dépense" : "Ajouter une Dépense"}
        body={
          <form id="expense-form" onSubmit={handleAddExpense} className="space-y-4">
            <Select
              label="Catégorie"
              value={newExpense.category}
              onChange={(val) => setNewExpense({ ...newExpense, category: val })}
              options={categoryOptions.filter(o => o.value !== '')}
              required
            />
            <Input
              label="Montant"
              type="number"
              step="0.01"
              value={newExpense.amount}
              onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              placeholder="0.00"
              required
            />
            <Input
              label="Date"
              type="date"
              value={newExpense.date}
              onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
              required
            />
            <Input
              label="Description"
              value={newExpense.description}
              onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
              placeholder="Détails optionnels"
            />
          </form>
        }
        footer={
          <div className="flex gap-3 justify-end w-full">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="expense-form" loading={isSubmitting}>
              Enregistrer
            </Button>
          </div>
        }
      />

      <ConfirmationDialog
        open={showDeleteConfirm}
        title="Supprimer la dépense"
        message="Êtes-vous sûr de vouloir supprimer cette dépense ?"
        onConfirm={confirmDeleteExpense}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default Expenses;

