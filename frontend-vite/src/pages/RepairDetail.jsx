import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeftIcon, 
  UserIcon, 
  DevicePhoneMobileIcon, 
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleBottomCenterTextIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { PageHeader } from '../components/layout/PageHeader';
import { Spinner } from '../components/common/Spinner';

const STATUS_CONFIG = {
  intake: { label: 'Réception', color: 'bg-blue-100 text-blue-800', icon: <PlusIcon className="w-5 h-5" /> },
  diagnosis: { label: 'Diagnostic', color: 'bg-purple-100 text-purple-800', icon: <WrenchScrewdriverIcon className="w-5 h-5" /> },
  waiting_parts: { label: 'Attente Pièces', color: 'bg-yellow-100 text-yellow-800', icon: <ClockIcon className="w-5 h-5" /> },
  in_repair: { label: 'En Réparation', color: 'bg-orange-100 text-orange-800', icon: <WrenchScrewdriverIcon className="w-5 h-5" /> },
  waiting_approval: { label: 'Attente Client', color: 'bg-cyan-100 text-cyan-800', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5" /> },
  ready: { label: 'Prêt', color: 'bg-green-100 text-green-800', icon: <CheckCircleIcon className="w-5 h-5" /> },
  closed: { label: 'Terminé', color: 'bg-gray-100 text-gray-800', icon: <ClipboardDocumentCheckIcon className="w-5 h-5" /> },
  cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: <ExclamationTriangleIcon className="w-5 h-5" /> },
};

const RepairDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  
  const [statusForm, setStatusForm] = useState({
    new_status: '',
    note: ''
  });
  
  const [partForm, setPartForm] = useState({
    part_name: '',
    quantity: 1,
    unit_cost: 0
  });

  useEffect(() => {
    loadRepair();
    loadTechnicians();
  }, [id]);

  const loadRepair = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/sales/repairs/${id}/`);
      setRepair(response.data);
      setStatusForm(prev => ({ ...prev, new_status: response.data.status }));
    } catch (error) {
      showToast('Erreur lors du chargement de la réparation', 'error');
      navigate('/repairs');
    } finally {
      setLoading(false);
    }
  };

  const loadTechnicians = async () => {
    try {
      const response = await api.get('/authentication/users/');
      setTechnicians(response.data);
    } catch (error) {
      console.error('Erreur chargement techniciens:', error);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/sales/repairs/${id}/status/`, { 
        status: statusForm.new_status,
        note: statusForm.note
      });
      showToast('Statut mis à jour', 'success');
      setShowStatusModal(false);
      loadRepair();
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la mise à jour';
      showToast(errorMsg, 'error');
    }
  };

  const handleToggleApproval = async () => {
    try {
      await api.patch(`/sales/repairs/${id}/`, { 
        customer_approved: !repair.customer_approved 
      });
      showToast(repair.customer_approved ? 'Approbation retirée' : 'Approbation client enregistrée', 'success');
      loadRepair();
    } catch (error) {
      showToast('Erreur lors de la modification de l\'approbation', 'error');
    }
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    try {
      // Logic for adding parts - we might need a separate endpoint or patch repair
      // Assuming backend allows nested parts update or has separate endpoint
      await api.post(`/sales/repairs/${id}/add_part/`, partForm);
      showToast('Pièce ajoutée', 'success');
      setShowPartModal(false);
      setPartForm({ part_name: '', quantity: 1, unit_cost: 0 });
      loadRepair();
    } catch (error) {
      showToast('Erreur lors de l\'ajout de la pièce', 'error');
    }
  };

  const handleRemovePart = async (partId) => {
    if (!window.confirm('Supprimer cette pièce ?')) return;
    try {
      await api.delete(`/sales/repairs/${id}/remove_part/${partId}/`);
      showToast('Pièce supprimée', 'success');
      loadRepair();
    } catch (error) {
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const handleAssignTechnician = async (userId) => {
    try {
      await api.patch(`/sales/repairs/${id}/`, { technician: userId });
      showToast('Technicien assigné', 'success');
      loadRepair();
    } catch (error) {
      showToast('Erreur lors de l\'assignation', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!repair) return null;

  return (
    <div className="app-container space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to="/repairs" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
        </Link>
        <PageHeader 
          title={`Réparation #${repair.id}`} 
          subtitle={repair.device_model}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info & Status */}
        <div className="lg:col-span-2 space-y-6">
          {repair.is_overdue && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-center gap-3 animate-pulse">
              <ExclamationCircleIcon className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm font-black text-red-800 uppercase tracking-tighter">Réparation en retard !</p>
                <p className="text-xs text-red-700">Cette réparation a dépassé sa date limite de <strong>{repair.days_overdue} jours</strong>. Priorité haute requise.</p>
              </div>
            </div>
          )}

          {repair.status === 'waiting_approval' && !repair.customer_approved && (
            <div className="bg-cyan-50 border-l-4 border-cyan-400 p-4 rounded-lg flex items-center gap-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-cyan-500" />
              <div>
                <p className="text-sm font-bold text-cyan-800">En attente d'approbation client</p>
                <p className="text-xs text-cyan-700">La progression du ticket est bloquée jusqu'à ce que le client approuve le devis.</p>
              </div>
              <button 
                onClick={handleToggleApproval}
                className="ml-auto bg-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-cyan-700 transition-colors"
              >
                Approuver maintenant
              </button>
            </div>
          )}

          <Card>
            <div className="flex justify-between items-start mb-6 border-b pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-primary-500" />
                  Détails de l'appareil
                </h3>
              </div>
              <span className={`px-3 py-1 rounded-full font-bold text-sm ${STATUS_CONFIG[repair.status].color}`}>
                {STATUS_CONFIG[repair.status].label}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Modèle</label>
                  <p className="text-base font-semibold text-gray-900">{repair.device_model}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">IMEI / Numéro de Série</label>
                  <p className="text-base font-medium text-gray-900">{repair.imei || 'Non renseigné'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Problème signalé</label>
                  <div className="mt-1 bg-red-50 p-3 rounded-lg border border-red-100">
                    <p className="text-sm text-red-700 italic">"{repair.issue_description}"</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Coût Stimé</label>
                  <p className="text-xl font-bold text-primary-600">{repair.estimated_cost} DA</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Date limite (Échéance)</label>
                  <p className={`text-base font-bold ${repair.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {repair.due_date ? new Date(repair.due_date).toLocaleDateString() : 'Non définie'}
                    {repair.is_overdue && <span className="ml-2 text-xs">(DÉPASSÉE)</span>}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold tracking-wider">Note Interne</label>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{repair.notes || '-'}</p>
                </div>
                <div className="pt-4 border-t">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div 
                      onClick={handleToggleApproval}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        repair.customer_approved 
                          ? 'bg-green-500 border-green-500' 
                          : 'bg-white border-gray-300 group-hover:border-primary-500'
                      }`}
                    >
                      {repair.customer_approved && <CheckCircleIcon className="w-5 h-5 text-white" />}
                    </div>
                    <span className={`text-sm font-bold ${repair.customer_approved ? 'text-green-700' : 'text-gray-600'}`}>
                      Approbation Client {repair.customer_approved ? 'Confirmée' : 'En attente'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              <Button onClick={() => setShowStatusModal(true)} variant="primary">
                Changer le statut
              </Button>
              <Button onClick={() => navigate(`/repairs?edit=${repair.id}`)} variant="secondary">
                Modifier infos
              </Button>
            </div>
          </Card>

          {/* Parts Section */}
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <WrenchScrewdriverIcon className="w-5 h-5 text-orange-500" />
                Pièces Utilisées
              </h3>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowPartModal(true)}
                icon={<PlusIcon className="w-4 h-4" />}
              >
                Ajouter une pièce
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Désignation</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qté</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Prix Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {repair.parts && repair.parts.length > 0 ? (
                    repair.parts.map((part) => (
                      <tr key={part.id}>
                        <td className="px-4 py-3 text-gray-900 font-medium">{part.part_name}</td>
                        <td className="px-4 py-3 text-center">{part.quantity}</td>
                        <td className="px-4 py-3 text-right">{part.unit_cost} DA</td>
                        <td className="px-4 py-3 text-right font-bold">{(part.quantity * part.unit_cost).toFixed(2)} DA</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => handleRemovePart(part.id)} className="text-red-500 hover:text-red-700">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-4 text-center text-gray-400 italic">Aucune pièce enregistrée</td>
                    </tr>
                  )}
                </tbody>
                {repair.parts && repair.parts.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan="3" className="px-4 py-3 text-right font-bold text-gray-900">Total Pièces:</td>
                      <td className="px-4 py-3 text-right font-bold text-primary-600 bg-primary-50">
                        {repair.parts.reduce((sum, part) => sum + (part.quantity * part.unit_cost), 0).toFixed(2)} DA
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </div>

        {/* Right Column: Customer & Logs */}
        <div className="space-y-6">
          {/* Customer Card */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <UserIcon className="w-5 h-5 text-blue-500" />
              Client
            </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div>
                    {repair.customer ? (
                      <Link to={`/customers/${repair.customer}`} className="text-base font-bold text-gray-900 hover:text-primary-600">
                        {repair.customer_name}
                      </Link>
                    ) : (
                      <span className="text-base font-bold text-gray-900">
                        {repair.customer_name || 'Passager (sans client)'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-4 border-t space-y-2">
                  <p className="text-sm text-gray-600 flex items-center justify-between">
                    <span>ID Client:</span>
                    <span className="font-medium text-gray-900">#{repair.customer}</span>
                  </p>
                  {repair.customer && (
                    <div className="mt-4">
                      <Button variant="outline" size="sm" fullWidth onClick={() => navigate(`/customers/${repair.customer}`)}>
                        Profil du client
                      </Button>
                    </div>
                  )}
                </div>
              </div>
          </Card>

          {/* Technician Card */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <WrenchScrewdriverIcon className="w-5 h-5 text-purple-500" />
              Technicien
            </h3>
            <Select
              label="Assigner à"
              value={repair.technician || ''}
              onChange={(val) => handleAssignTechnician(val)}
              options={[
                { label: '-- Non assigné --', value: '' },
                ...technicians.map(t => ({ label: t.username, value: t.id }))
              ]}
            />
          </Card>

          {/* History / Logs */}
          <Card>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              <ClockIcon className="w-5 h-5 text-gray-500" />
              Historique
            </h3>
            <div className="flow-root">
              <ul className="-mb-8">
                {repair.logs && repair.logs.length > 0 ? (
                  repair.logs.map((log, idx) => (
                    <li key={log.id}>
                      <div className="relative pb-8">
                        {idx !== repair.logs.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${STATUS_CONFIG[log.new_status]?.color || 'bg-gray-100 text-gray-500'}`}>
                              {STATUS_CONFIG[log.new_status]?.icon || <ClockIcon className="w-5 h-5" />}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-sm text-gray-900">
                                <span className="font-bold">{STATUS_CONFIG[log.new_status]?.label}</span>
                                {log.note && <span className="block mt-1 text-xs text-gray-500 italic">"{log.note}"</span>}
                              </p>
                            </div>
                            <div className="text-right text-xs whitespace-nowrap text-gray-500">
                              <p>{new Date(log.changed_at).toLocaleDateString()}</p>
                              <p>{new Date(log.changed_at).toLocaleTimeString()}</p>
                              <p className="font-medium text-primary-600 mt-1">{log.changed_by_name}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))
                ) : (
                  <p className="text-sm text-gray-400 italic">Aucun historique disponible</p>
                )}
              </ul>
            </div>
          </Card>
        </div>
      </div>

      {/* Status Modal */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Changer le statut du ticket"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Annuler</Button>
            <Button variant="primary" form="status-form" type="submit">Enregistrer</Button>
          </div>
        }
        body={
          <form id="status-form" onSubmit={handleUpdateStatus} className="space-y-4">
            <Select
              label="Nouveau Statut"
              value={statusForm.new_status}
              onChange={(val) => setStatusForm({ ...statusForm, new_status: val })}
              options={Object.entries(STATUS_CONFIG).map(([val, cfg]) => ({ label: cfg.label, value: val }))}
              required
            />
            <Input
              label="Note / Commentaire"
              value={statusForm.note}
              onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
              placeholder="Ex: Écran changé, en attente de test final..."
              textarea
            />
          </form>
        }
      />

      {/* Part Modal */}
      <Modal
        isOpen={showPartModal}
        onClose={() => setShowPartModal(false)}
        title="Ajouter une pièce de rechange"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowPartModal(false)}>Annuler</Button>
            <Button variant="primary" form="part-form" type="submit">Ajouter</Button>
          </div>
        }
        body={
          <form id="part-form" onSubmit={handleAddPart} className="space-y-4">
            <Input
              label="Désignation"
              value={partForm.part_name}
              onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Quantité"
                type="number"
                value={partForm.quantity}
                onChange={(e) => setPartForm({ ...partForm, quantity: parseInt(e.target.value) })}
                required
              />
              <Input
                label="Prix Unitaire (DA)"
                type="number"
                value={partForm.unit_cost}
                onChange={(e) => setPartForm({ ...partForm, unit_cost: parseFloat(e.target.value) })}
                required
              />
            </div>
          </form>
        }
      />
    </div>
  );
};

export default RepairDetail;
