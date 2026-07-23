import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { suppliersAPI } from '../services/api';

import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Table } from '../components/common/Table';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import { AddEditSupplierModal } from './AddEditSupplierModal';
import { toast } from 'react-hot-toast';

export const SuppliersList = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await suppliersAPI.getAll({ search: searchTerm || undefined });
      setSuppliers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Échec du chargement des fournisseurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [searchTerm]);

  const handleDelete = async (supplier) => {
    try {
      await suppliersAPI.delete(supplier.id);
      toast.success('Fournisseur supprimé avec succès');
      fetchSuppliers();
      setDeletingSupplier(null);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Échec de la suppression du fournisseur');
    }
  };

  const handleSupplierSaved = () => {
    fetchSuppliers();
    setShowAddModal(false);
    setEditingSupplier(null);
  };

  const columns = [
    {
      key: 'name',
      label: 'Nom du fournisseur',
      render: (value, supplier) => (
        <Link to={`/suppliers/${supplier.id}`} className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
          {value}
        </Link>
      ),
    },
    {
      key: 'contact_person',
      label: 'Personne de contact',
    },
    {
      key: 'phone',
      label: 'Téléphone',
    },
    {
      key: 'email',
      label: 'E-mail',
    },
    {
      key: 'payment_terms',
      label: 'Conditions de paiement',
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value, supplier) => (
        <div className="flex space-x-2">
          <Link
            to={`/suppliers/${supplier.id}`}
            className="p-1 text-green-600 hover:bg-green-50 rounded"
            title="Voir les détails"
          >
            <EyeIcon className="w-5 h-5" />
          </Link>
          <button
            onClick={() => setEditingSupplier(supplier)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="Modifier"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDeletingSupplier(supplier)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Supprimer"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      <div className="flex-responsive">
        <h1 className="text-slate-900">Annuaire des fournisseurs</h1>
        <Button
          onClick={() => setShowAddModal(true)}
          icon={<PlusIcon className="w-5 h-5" />}
        >
          Ajouter un fournisseur
        </Button>
      </div>

      <Card variant="glass" className="p-[var(--spacing-sm)]">
        <div className="w-full md:max-w-md">
          <Input
            type="text"
            placeholder="Rechercher des fournisseurs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />}
          />
        </div>
      </Card>

      <Card variant="glass" className="overflow-hidden">
        <Table
          columns={columns}
          data={suppliers}
          loading={loading}
          emptyMessage="Aucun fournisseur trouvé."
        />
      </Card>

      {/* Add/Edit Modal */}
      <AddEditSupplierModal
        isOpen={showAddModal || !!editingSupplier}
        onClose={() => {
          setShowAddModal(false);
          setEditingSupplier(null);
        }}
        onSave={handleSupplierSaved}
        supplier={editingSupplier}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingSupplier}
        onClose={() => setDeletingSupplier(null)}
        header="Confirmer la suppression"
        body={
          <div className="space-y-4">
            <p className="text-gray-600">
              Êtes-vous sûr de vouloir supprimer le fournisseur <span className="font-bold">{deletingSupplier?.name}</span> ?
              Cette action ne peut pas être annulée.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setDeletingSupplier(null)}>
                Annuler
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deletingSupplier)}>
                Supprimer
              </Button>
            </div>
          </div>
        }
      />
    </div>
  );
};

