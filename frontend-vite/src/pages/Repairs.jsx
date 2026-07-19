import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { repairsAPI } from '../services/api';
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  intake: { label: 'Réception', color: 'bg-blue-100 text-blue-800' },
  diagnosis: { label: 'Diagnostic', color: 'bg-yellow-100 text-yellow-800' },
  waiting_parts: { label: 'Attente Pièces', color: 'bg-purple-100 text-purple-800' },
  in_repair: { label: 'En Réparation', color: 'bg-indigo-100 text-indigo-800' },
  waiting_approval: { label: 'Attente Client', color: 'bg-orange-100 text-orange-800' },
  ready: { label: 'Prêt', color: 'bg-cyan-100 text-cyan-800' },
  closed: { label: 'Livré', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800' },
};

const Repairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [newRepair, setNewRepair] = useState({
    device_model: '',
    issue_description: '',
    estimated_cost: '',
    due_date: '',
  });

  const loadRepairs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await repairsAPI.getAll();
      setRepairs(res.data.results || res.data);
    } catch (error) {
      console.error('Failed to load repairs', error);
      window.showToast?.('Échec du chargement', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRepairs();
  }, [loadRepairs]);

  const handleOpenModal = (repair = null) => {
    if (repair) {
      setEditingRepair(repair);
      setNewRepair({
        device_model: repair.device_model,
        issue_description: repair.issue_description,
        estimated_cost: repair.estimated_cost,
        due_date: repair.due_date ? repair.due_date.split('T')[0] : '',
      });
    } else {
      setEditingRepair(null);
      setNewRepair({
        device_model: '',
        issue_description: '',
        estimated_cost: '',
        due_date: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveRepair = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...newRepair,
        estimated_cost: newRepair.estimated_cost === '' ? null : newRepair.estimated_cost,
        due_date: newRepair.due_date || null,
      };
      if (editingRepair) {
        await repairsAPI.update(editingRepair.id, payload);
        window.showToast?.('Réparation modifiée', 'success');
      } else {
        await repairsAPI.create(payload);
        window.showToast?.('Réparation ajoutée', 'success');
      }
      setIsModalOpen(false);
      loadRepairs();
    } catch (error) {
      console.error('Failed to save repair', error);
      window.showToast?.(error.response?.data?.error || "Échec de l'enregistrement", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRepair = (id) => {
    setRepairToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteRepair = async () => {
    if (!repairToDelete) return;
    try {
      await repairsAPI.delete(repairToDelete);
      loadRepairs();
      window.showToast?.('Réparation supprimée', 'success');
    } catch (error) {
      console.error('Failed to delete repair', error);
      window.showToast?.('Échec de la suppression', 'error');
    } finally {
      setShowDeleteConfirm(false);
      setRepairToDelete(null);
    }
  };

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      <PageHeader
        title="Réparations"
        subtitle="Gérer les réparations de téléphones"
        actions={
          <Button onClick={() => handleOpenModal()} icon={<PlusIcon className="w-5 h-5" />}>
            Nouvelle Réparation
          </Button>
        }
      />

      <Card>
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modèle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problème</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût Est.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Échéance</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center"><Spinner /></td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">Aucune réparation trouvée</td>
                </tr>
              ) : (
                repairs.map((repair) => (
                  <tr key={repair.id} className={repair.is_overdue ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                      <Link to={`/repairs/${repair.id}`}>{repair.device_model}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{repair.issue_description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_CONFIG[repair.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_CONFIG[repair.status]?.label || repair.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{repair.estimated_cost || '-'} DA</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {repair.due_date ? new Date(repair.due_date).toLocaleDateString() : '-'}
                      {repair.is_overdue && <span className="ml-1 text-red-600 text-xs font-bold">(RETARD)</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(repair)}
                          icon={<PencilSquareIcon className="w-4 h-4" />}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          MODIFIER
                        </Button>
                        <button onClick={() => handleDeleteRepair(repair.id)} className="text-red-600 hover:text-red-900 p-2">
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {loading ? (
            <div className="p-4 text-center"><Spinner /></div>
          ) : repairs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">Aucune réparation trouvée</div>
          ) : (
            repairs.map((repair) => (
              <div key={repair.id} className="p-4 space-y-2">
                <Link to={`/repairs/${repair.id}`} className="block">
                  <h3 className="font-bold text-blue-600 hover:text-blue-800">{repair.device_model}</h3>
                </Link>
                <p className="text-sm text-gray-600 italic">"{repair.issue_description}"</p>
                <div className="flex items-center justify-between">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_CONFIG[repair.status]?.color}`}>
                    {STATUS_CONFIG[repair.status]?.label}
                  </span>
                  <span className="font-bold text-primary-600">{repair.estimated_cost || '-'} DA</span>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="secondary" size="sm" onClick={() => handleOpenModal(repair)} fullWidth icon={<PencilSquareIcon className="w-4 h-4" />}>
                    MODIFIER
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteRepair(repair.id)} className="text-red-600">
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        header={editingRepair ? "Modifier la Réparation" : "Nouvelle Réparation"}
        body={
          <form id="repair-form" onSubmit={handleSaveRepair} className="space-y-4">
            <Input
              label="Modèle de l'appareil"
              value={newRepair.device_model}
              onChange={(e) => setNewRepair({ ...newRepair, device_model: e.target.value })}
              required
              placeholder="ex: iPhone 13 Pro"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700">Description du problème</label>
              <textarea
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows="3"
                value={newRepair.issue_description}
                onChange={(e) => setNewRepair({ ...newRepair, issue_description: e.target.value })}
                required
                placeholder="Que faut-il réparer ?"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Coût Estimé (DA)"
                type="number"
                value={newRepair.estimated_cost}
                onChange={(e) => setNewRepair({ ...newRepair, estimated_cost: e.target.value })}
                placeholder="0.00"
              />
              <Input
                label="Date de remise prévue"
                type="date"
                value={newRepair.due_date}
                onChange={(e) => setNewRepair({ ...newRepair, due_date: e.target.value })}
              />
            </div>
          </form>
        }
        footer={
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="repair-form" loading={isSubmitting}>Enregistrer</Button>
          </div>
        }
      />

      <ConfirmationDialog
        open={showDeleteConfirm}
        title="Supprimer la réparation"
        message="Êtes-vous sûr de vouloir supprimer cette réparation ?"
        onConfirm={confirmDeleteRepair}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default Repairs;
