import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { customersAPI } from '../services/api';

import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Table } from '../components/common/Table';
import { Modal } from '../components/common/Modal';
import { AddEditCustomerModal } from './AddEditCustomerModal';
import { toast } from 'react-hot-toast';

export const CustomersList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await customersAPI.getAll({ search: searchTerm || undefined });
      setCustomers(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Échec du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchTerm]);

  const handleDelete = async (customer) => {
    try {
      await customersAPI.delete(customer.id);
      toast.success('Client supprimé avec succès');
      fetchCustomers();
      setDeletingCustomer(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Échec de la suppression du client');
    }
  };

  const handleCustomerSaved = () => {
    fetchCustomers();
    setShowAddModal(false);
    setEditingCustomer(null);
  };

  const columns = [
    {
      key: 'name',
      label: 'Nom',
      render: (value, customer) => (
        <Link
          to={`/customers/${customer.id}`}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {customer.name}
        </Link>
      ),
    },
    {
      key: 'phone',
      label: 'Téléphone',
      render: (value, customer) => customer.phone,
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (value, customer) => customer.email,
    },
    {
      key: 'total_purchases',
      label: 'Total Achats',
      render: (value, customer) => (
        <span className="font-medium">{customer.total_purchases || 0}</span>
      ),
    },
    {
      key: 'last_purchase_date',
      label: 'Dernier Achat',
      render: (value, customer) => (
        <span className={customer.last_purchase_date ? '' : 'text-gray-500'}>
          {customer.last_purchase_date
            ? new Date(customer.last_purchase_date).toLocaleDateString('fr-FR')
            : 'Aucun achat'
          }
        </span>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      render: (value, customer) => (
        <div className="flex space-x-2">
          <Link
            to={`/customers/${customer.id}`}
            className="text-blue-600 hover:text-blue-800 p-1"
            title="Voir les détails"
          >
            <EyeIcon className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setEditingCustomer(customer)}
            className="text-yellow-600 hover:text-yellow-800 p-1"
            title="Modifier"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeletingCustomer(customer)}
            className="text-red-600 hover:text-red-800 p-1"
            title="Supprimer"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      <div className="flex-responsive items-center">
        <h1 className="text-slate-900">Clients</h1>
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Ajouter un client</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="max-w-md">
        <Input
          type="text"
          placeholder="Rechercher des clients..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          leftIcon={<MagnifyingGlassIcon className="w-5 h-5 text-slate-400" />}
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-soft-sm overflow-hidden">
        <Table
          columns={columns}
          data={customers}
          loading={loading}
          emptyMessage="Aucun client trouvé"
        />
      </div>

      {/* Add/Edit Customer Modal */}
      {(showAddModal || editingCustomer) && (
        <AddEditCustomerModal
          customer={editingCustomer}
          onClose={() => {
            setShowAddModal(false);
            setEditingCustomer(null);
          }}
          onSaved={handleCustomerSaved}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingCustomer && (
        <Modal
          open={true}
          onClose={() => setDeletingCustomer(null)}
          header={<h2 className="text-lg font-semibold">Supprimer le client</h2>}
          body={
            <p className="mb-4">
              Êtes-vous sûr de vouloir supprimer <strong>{deletingCustomer.name}</strong> ? 
              Cette action est irréversible.
            </p>
          }
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setDeletingCustomer(null)}
              >
                Annuler
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deletingCustomer)}
              >
                Supprimer
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
};

