import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { Select } from '../components/common/Select';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { PageHeader } from '../components/layout/PageHeader';
import { repairsAPI, customersAPI } from '../services/api';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  BanknotesIcon,
  TrashIcon,
  UserGroupIcon,
  ViewColumnsIcon,
  ListBulletIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  intake: { label: 'Réception', color: 'bg-blue-100 text-blue-800', icon: <PlusIcon className="w-4 h-4" /> },
  diagnosis: { label: 'Diagnostic', color: 'bg-yellow-100 text-yellow-800', icon: <MagnifyingGlassIcon className="w-4 h-4" /> },
  waiting_parts: { label: 'Attente Pièces', color: 'bg-purple-100 text-purple-800', icon: <ClockIcon className="w-4 h-4" /> },
  in_repair: { label: 'En Réparation', color: 'bg-indigo-100 text-indigo-800', icon: <WrenchScrewdriverIcon className="w-4 h-4" /> },
  waiting_approval: { label: 'Attente Client', color: 'bg-orange-100 text-orange-800', icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
  ready: { label: 'Prêt', color: 'bg-cyan-100 text-cyan-800', icon: <CheckBadgeIcon className="w-4 h-4" /> },
  closed: { label: 'Livré', color: 'bg-green-100 text-green-800', icon: <CheckCircleIcon className="w-4 h-4" /> },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: <TrashIcon className="w-4 h-4" /> },
};

const Repairs = () => {
  const [repairs, setRepairs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'table'
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRepair, setEditingRepair] = useState(null);
  const [newRepair, setNewRepair] = useState({
    customer: '',
    device_model: '',
    imei: '',
    issue_description: '',
    status: 'intake',
    estimated_cost: '',
    due_date: '',
    customer_approved: false,
    notes: '',
  });

  const loadRepairs = useCallback(async () => {
    try {
      setLoading(true);
      const [repairsRes, customersRes] = await Promise.all([
        repairsAPI.getAll(),
        customersAPI.getAll()
      ]);
      setRepairs(repairsRes.data.results || repairsRes.data);
      setCustomers(customersRes.data.results || customersRes.data);
    } catch (error) {
      console.error('Failed to load repairs or customers', error);
      window.showToast?.('Échec du chargement des données', 'error');
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
        customer: repair.customer,
        device_model: repair.device_model,
        imei: repair.imei || '',
        issue_description: repair.issue_description,
        status: repair.status,
        estimated_cost: repair.estimated_cost,
        due_date: repair.due_date ? repair.due_date.split('T')[0] : '',
        customer_approved: repair.customer_approved || false,
        notes: repair.notes || '',
      });
    } else {
      setEditingRepair(null);
      setNewRepair({
        customer: '',
        device_model: '',
        imei: '',
        issue_description: '',
        status: 'intake',
        estimated_cost: '',
        due_date: '',
        customer_approved: false,
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleAddRepair = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        ...newRepair,
        customer: newRepair.customer || null,
        estimated_cost: newRepair.estimated_cost === '' ? null : newRepair.estimated_cost,
        due_date: newRepair.due_date || null,
      };
      if (editingRepair) {
        await repairsAPI.update(editingRepair.id, payload);
        window.showToast?.('Réparation modifiée avec succès', 'success');
      } else {
        await repairsAPI.create(payload);
        window.showToast?.('Réparation ajoutée avec succès', 'success');
      }
      setIsModalOpen(false);
      loadRepairs();
    } catch (error) {
      console.error('Failed to save repair', error);
      const errorMsg = error.response?.data?.error || "Échec de l'enregistrement";
      window.showToast?.(errorMsg, 'error');
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

  const filteredRepairs = repairs.filter(r => statusFilter === 'all' || r.status === statusFilter);

  const repairsByStatus = Object.keys(STATUS_CONFIG).reduce((acc, status) => {
    acc[status] = repairs.filter(r => r.status === status);
    return acc;
  }, {});

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      <PageHeader 
        title="Réparations" 
        subtitle="Gérer les réparations de téléphones"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 p-1 rounded-lg mr-2">
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Vue Tableau (Kanban)"
              >
                <ViewColumnsIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                title="Vue Liste"
              >
                <ListBulletIcon className="w-5 h-5" />
              </button>
            </div>
            <Button 
              onClick={() => handleOpenModal()}
              icon={<PlusIcon className="w-5 h-5" />}
            >
              Nouvelle Réparation
            </Button>
          </div>
        }
      />

      {viewMode === 'table' ? (
        <Card>
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrer par statut:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border-gray-300 text-sm focus:ring-primary-500 focus:border-primary-500 transition-colors"
            >
              <option value="all">Tous les statuts</option>
              {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modèle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IMEI</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coût Est.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center">
                      <Spinner />
                    </td>
                  </tr>
                ) : filteredRepairs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                      Aucune réparation trouvée
                    </td>
                  </tr>
                ) : (
                  filteredRepairs.map((repair) => (
                    <tr key={repair.id} className={repair.is_overdue ? 'bg-red-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 hover:text-blue-800">
                        <Link to={`/repairs/${repair.id}`}>
                          {repair.customer_name || 'Client inconnu'}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        <div className="flex flex-col">
                          <span>{repair.device_model}</span>
                          {repair.is_overdue && (
                            <span className="text-[10px] text-red-600 font-bold uppercase tracking-tighter">
                              ⚠ En retard de {repair.days_overdue} jours
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {repair.imei || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_CONFIG[repair.status]?.color || 'bg-gray-100 text-gray-800'}`}>
                            {STATUS_CONFIG[repair.status]?.label || repair.status}
                          </span>
                          {repair.status === 'waiting_approval' && (
                            <span className={`px-2 inline-flex text-[10px] leading-4 font-bold rounded-full border ${repair.customer_approved ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700 animate-pulse'}`}>
                              {repair.customer_approved ? 'APPROUVÉ ✓' : 'À APPROUVER !'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        {repair.estimated_cost} DA
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(repair.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(repair)}
                          icon={<PencilSquareIcon className="w-4 h-4" />}
                          className="text-blue-600 hover:bg-blue-50"
                        >
                          MODIFIER
                        </Button>
                        <button
                          onClick={() => handleDeleteRepair(repair.id)}
                          className="text-red-600 hover:text-red-900 p-2"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-200">
            {loading ? (
              <div className="p-4 text-center"><Spinner /></div>
            ) : filteredRepairs.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Aucune réparation trouvée</div>
            ) : (
              filteredRepairs.map((repair) => (
                <div key={repair.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Link to={`/repairs/${repair.id}`}>
                      <h3 className="font-bold text-blue-600 hover:text-blue-800">{repair.device_model}</h3>
                      <p className="text-sm text-gray-600 font-medium">{repair.customer_name}</p>
                      <p className="text-xs text-gray-500">{new Date(repair.created_at).toLocaleDateString()}</p>
                    </Link>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">{repair.estimated_cost} DA</p>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${STATUS_CONFIG[repair.status]?.color}`}>
                        {STATUS_CONFIG[repair.status]?.label}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 italic">
                    "{repair.issue_description}"
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenModal(repair)}
                      fullWidth
                      icon={<PencilSquareIcon className="w-4 h-4" />}
                    >
                      MODIFIER
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRepair(repair.id)}
                      className="text-red-600"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      ) : (
        /* Kanban Board View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <div key={status} className="w-72 flex-shrink-0 flex flex-col gap-3">
                <div className={`p-3 rounded-lg flex items-center justify-between font-semibold shadow-sm ${config.color.replace(' text-', ' border-').replace('bg-', 'bg-opacity-50 border-')}`}>
                  <div className="flex items-center gap-2">
                    {config.icon}
                    <span>{config.label}</span>
                  </div>
                  <span className="bg-white bg-opacity-50 px-2 py-0.5 rounded text-xs">
                    {repairsByStatus[status]?.length || 0}
                  </span>
                </div>
                
                <div className="flex flex-col gap-3 min-h-[50vh] bg-gray-50 rounded-lg p-2 border-2 border-dashed border-gray-200">
                  {loading ? (
                    <div className="py-10 flex justify-center"><Spinner /></div>
                  ) : repairsByStatus[status]?.length === 0 ? (
                    <div className="py-10 text-center text-gray-400 text-xs italic">Vide</div>
                  ) : (
                    repairsByStatus[status].map((repair) => (
                      <div 
                        key={repair.id} 
                        className={`bg-white p-3 rounded-lg shadow-sm border hover:shadow-md transition-all cursor-pointer group ${repair.is_overdue ? 'border-red-300 bg-red-50/30' : 'border-gray-100 hover:border-primary-300'}`}
                        onClick={() => handleOpenModal(repair)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {repair.device_model}
                            {repair.is_overdue && (
                              <span className="ml-1 text-[10px] text-red-600 font-black animate-pulse">!</span>
                            )}
                          </h4>
                          <span className="text-xs font-bold text-primary-600">{repair.estimated_cost} DA</span>
                        </div>
                        {repair.is_overdue && (
                          <div className="mb-2">
                            <span className="px-2 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded-sm uppercase tracking-wider">
                              RETARD: {repair.days_overdue}J
                            </span>
                          </div>
                        )}
                        {repair.status === 'waiting_approval' && (
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mb-2 inline-block ${repair.customer_approved ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700 animate-pulse'}`}>
                            {repair.customer_approved ? 'APPROUVÉ ✓' : '⚠ ATTENTE APPROBATION'}
                          </div>
                        )}
                        <p className="text-xs text-gray-600 mb-2 truncate font-medium">{repair.customer_name}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2 italic bg-gray-50 p-1.5 rounded mb-2 border border-gray-100">
                          "{repair.issue_description}"
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3" />
                            {new Date(repair.created_at).toLocaleDateString()}
                          </span>
                          {repair.imei && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                              {repair.imei}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        header={editingRepair ? "Modifier la Réparation" : "Intake Réparation"}
        body={
          <form id="repair-form" onSubmit={handleAddRepair} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Client (optionnel - laisser vide pour un passager)"
                value={newRepair.customer}
                onChange={(value) => setNewRepair({ ...newRepair, customer: value })}
                options={customers.map(c => ({ label: `${c.name} (${c.phone})`, value: c.id }))}
                placeholder="Rechercher un client ou laisser vide..."
                searchable
              />
              <Select
                label="Statut"
                value={newRepair.status}
                onChange={(value) => setNewRepair({ ...newRepair, status: value })}
                options={Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ label, value }))}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Modèle de l'appareil"
                value={newRepair.device_model}
                onChange={(e) => setNewRepair({ ...newRepair, device_model: e.target.value })}
                required
                placeholder="ex: iPhone 13 Pro"
              />
              <Input
                label="IMEI (optionnel)"
                value={newRepair.imei}
                onChange={(e) => setNewRepair({ ...newRepair, imei: e.target.value })}
                placeholder="IMEI du téléphone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description du problème</label>
              <textarea
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows="3"
                value={newRepair.issue_description}
                onChange={(e) => setNewRepair({ ...newRepair, issue_description: e.target.value })}
                required
                placeholder="Que faut-il réparer ?"
              ></textarea>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Coût Estimé (DA)"
                type="number"
                value={newRepair.estimated_cost}
                onChange={(e) => setNewRepair({ ...newRepair, estimated_cost: e.target.value })}
                required
                placeholder="0.00"
              />
              <Input
                label="Date de remise prévue"
                type="date"
                value={newRepair.due_date}
                onChange={(e) => setNewRepair({ ...newRepair, due_date: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="customer_approved"
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                checked={newRepair.customer_approved}
                onChange={(e) => setNewRepair({ ...newRepair, customer_approved: e.target.checked })}
              />
              <label htmlFor="customer_approved" className="text-sm font-bold text-blue-800 cursor-pointer">
                Client a approuvé le devis / la réparation
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes internes</label>
              <textarea
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                rows="2"
                value={newRepair.notes}
                onChange={(e) => setNewRepair({ ...newRepair, notes: e.target.value })}
                placeholder="Notes additionnelles..."
              ></textarea>
            </div>
          </form>
        }
        footer={
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="repair-form" loading={isSubmitting}>
              Enregistrer
            </Button>
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

