import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, PencilIcon, ShoppingBagIcon, CurrencyDollarIcon, StarIcon } from '@heroicons/react/24/outline';
import { customersAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';

import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AddEditCustomerModal } from './AddEditCustomerModal';
import { toast } from 'react-hot-toast';

// interface CustomerWithHistory extends Customer {
//   purchase_history: Array<{
//     id;
//     // phone: {
//       id;
//       brand;
//       model;
//       price;
//     };
//     quantity;
//     total_price;
//     sale_date;
//   }>;
// }

export const CustomerDetails = () => {
  const { id } = useParams();
  const { data: shopSettings } = useShopSettings();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
      style: 'currency',
      currency: 'DZD',
    }).format(amount).replace('DZD', 'DA');
  };

  const fetchCustomer = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const response = await customersAPI.get(parseInt(id));
      setCustomer(response.data);
    } catch (error) {
      console.error('Error fetching customer:', error);
      toast.error('Échec du chargement des détails du client');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const handleCustomerUpdated = () => {
    fetchCustomer();
    setShowEditModal(false);
  };

  const calculateTotalSpent = () => {
    if (!customer.purchase_history) return 0;
    return customer.purchase_history.reduce((total, sale) => {
      return total + parseFloat(sale.total_price);
    }, 0);
  };

  const getLastPurchaseDate = () => {
    if (!customer.purchase_history || customer.purchase_history.length === 0) {
      return 'Aucun achat pour le moment';
    }
    const latestSale = customer.purchase_history.reduce((latest, sale) => {
      return new Date(sale.sale_date) > new Date(latest.sale_date) ? sale : latest;
    });
    return new Date(latestSale.sale_date).toLocaleDateString('fr-FR');
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

  if (!customer) {
    return (
      <div className="container mx-auto p-[var(--spacing-md)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Client non trouvé</h1>
          <Link to="/customers">
            <Button>Retour aux clients</Button>
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
          <Link to="/customers">
            <Button variant="secondary" size="sm">
              <ArrowLeftIcon className="w-4 h-4 mr-2" />
              Retour aux clients
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
        </div>
        <Button
          onClick={() => setShowEditModal(true)}
          className="flex items-center space-x-2"
        >
          <PencilIcon className="w-4 h-4" />
          <span>Modifier le client</span>
        </Button>
      </div>

      {/* Customer Information Cards */}
      <div className="grid-responsive mb-[var(--spacing-md)]">
        {/* Contact Information */}
        <Card className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Informations de contact</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Nom</label>
              <p className="text-lg">{customer.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Téléphone</label>
              <p className="text-lg">{customer.phone}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">E-mail</label>
              <p className="text-lg">{customer.email}</p>
            </div>
            {customer.address && (
              <div>
                <label className="text-sm font-medium text-gray-500">Adresse</label>
                <p className="text-lg whitespace-pre-line">{customer.address}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-500">Client depuis</label>
              <p className="text-lg">
                  {customer.created_at ? new Date(customer.created_at).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="space-y-[var(--spacing-md)]">
          <Card>
            <div className="flex items-center space-x-3">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total dépensé</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculateTotalSpent())}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Nombre d'achats</p>
                <p className="text-2xl font-bold text-blue-600">
                  {customer.purchase_history.length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center space-x-3">
              <StarIcon className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-500">Points de fidélité</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {customer.loyalty_points || 0}
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
        {customer.purchase_history && customer.purchase_history.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Téléphone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customer.purchase_history.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.sale_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.phone.brand} {sale.phone.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(sale.total_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/sales/${sale.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Voir la vente
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

      {/* Edit Customer Modal */}
      {showEditModal && (
        <AddEditCustomerModal
          customer={customer}
          onClose={() => setShowEditModal(false)}
          onSaved={handleCustomerUpdated}
        />
      )}
    </div>
  );
};

