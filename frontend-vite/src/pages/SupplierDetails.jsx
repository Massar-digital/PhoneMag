import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, ShoppingBagIcon, CurrencyDollarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { suppliersAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';

import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AddEditSupplierModal } from './AddEditSupplierModal';
import { toast } from 'react-hot-toast';

export const SupplierDetails = () => {
  const { id } = useParams();
  const { data: shopSettings } = useShopSettings();
  const [supplier, setSupplier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
    }).format(amount).replace('DZD', 'DA');
  };

  const fetchSupplier = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await suppliersAPI.get(parseInt(id));
      setSupplier(response.data);
    } catch (error) {
      console.error('Error fetching supplier:', error);
      toast.error('Échec du chargement des détails du fournisseur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplier();
  }, [id]);

  const handleSupplierUpdated = () => {
    fetchSupplier();
    setShowEditModal(false);
  };

  const calculateTotalSpent = () => {
    if (!supplier.purchase_history) return 0;
    return supplier.purchase_history.reduce((total, phone) => {
      return total + parseFloat(phone.purchase_price);
    }, 0);
  };

  const getLastPurchaseDate = () => {
    if (!supplier.purchase_history || supplier.purchase_history.length === 0) {
      return 'Aucun achat pour le moment';
    }
    const latest = supplier.purchase_history.reduce((latest, phone) => {
      return new Date(phone.created_at) > new Date(latest.created_at) ? phone : latest;
    });
    return new Date(latest.created_at).toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-[var(--spacing-md)]">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="container mx-auto p-[var(--spacing-md)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Fournisseur non trouvé</h1>
          <Link to="/suppliers">
            <Button>Retour aux fournisseurs</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="flex-responsive mb-[var(--spacing-md)]">
        <div className="flex items-center space-x-4">
          <Link to="/suppliers">
            <Button variant="secondary" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Retour aux fournisseurs
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{supplier.name}</h1>
        </div>
        <Button
          onClick={() => setShowEditModal(true)}
          className="flex items-center space-x-2"
        >
          <PencilIcon className="w-4 h-4" />
          <span>Modifier le fournisseur</span>
        </Button>
      </div>

      {/* Supplier Information Cards */}
      <div className="grid-responsive mb-[var(--spacing-md)]">
        {/* Contact Information */}
        <Card className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Informations de contact</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Nom du fournisseur</label>
              <p className="text-lg">{supplier.name}</p>
            </div>
            {supplier.contact_person && (
              <div>
                <label className="text-sm font-medium text-gray-500">Personne de contact</label>
                <p className="text-lg">{supplier.contact_person}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Téléphone</label>
              <p className="text-lg">{supplier.phone || 'Non renseigné'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">E-mail</label>
              <p className="text-lg">{supplier.email || 'Non renseigné'}</p>
            </div>
            {supplier.address && (
              <div>
                <label className="text-sm font-medium text-gray-500">Adresse</label>
                <p className="text-lg whitespace-pre-line">{supplier.address}</p>
              </div>
            )}
            {supplier.payment_terms && (
              <div>
                <label className="text-sm font-medium text-gray-500">Conditions de paiement</label>
                <p className="text-lg">{supplier.payment_terms}</p>
              </div>
            )}
            {supplier.delivery_time && (
              <div>
                <label className="text-sm font-medium text-gray-500">Délai de livraison</label>
                <p className="text-lg">{supplier.delivery_time}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Fournisseur depuis</label>
              <p className="text-lg">
                  {supplier.created_at ? new Date(supplier.created_at).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="space-y-[var(--spacing-md)]">
          <Card>
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Total dépensé</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(calculateTotalSpent())}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Produits achetés</p>
                <p className="text-2xl font-bold text-blue-600">
                  {supplier.purchase_history?.length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Balance due</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(supplier.balance || 0)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div>
              <p className="text-sm text-gray-500">Dernier achat</p>
              <p className="text-lg font-semibold">{getLastPurchaseDate()}</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Purchase History */}
      <Card>
        <h2 className="text-xl font-semibold mb-4">Historique des achats</h2>
        {supplier.purchase_history && supplier.purchase_history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date d'ajout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix d'achat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix de vente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {supplier.purchase_history.map((phone) => (
                  <tr key={phone.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(phone.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{phone.brand} {phone.model}</span>
                      {phone.storage && <span className="text-gray-500"> - {phone.storage}</span>}
                      {phone.color && <span className="text-gray-400"> ({phone.color})</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {phone.product_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(phone.purchase_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(phone.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/phones/${phone.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Voir le produit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun historique d'achat disponible</p>
          </div>
        )}
      </Card>

      {/* Edit Supplier Modal */}
      {showEditModal && (
        <AddEditSupplierModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleSupplierUpdated}
          supplier={supplier}
        />
      )}
    </div>
  );
};
