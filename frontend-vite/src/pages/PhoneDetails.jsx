import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { phonesAPI, salesAPI } from '../services/api';


// interface PhoneWithInventory extends Phone {
//   inventory: {
//     stock_quantity;
//     reorder_level;
//     location;
//     supplier;
//     last_restocked;
//   };
// }

const PhoneDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(null);
  const [salesHistory, setSalesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesLoading, setSalesLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const fetchPhoneDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await phonesAPI.get(parseInt(id));
      setPhone(response.data);
    } catch (error) {
      console.error('Error fetching phone details:', error);
      window.showToast('Erreur lors du chargement des détails du téléphone. Veuillez réessayer.', 'error');
      navigate('/phones');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchSalesHistory = useCallback(async () => {
    try {
      setSalesLoading(true);
      // Fetch sales for this specific phone
      const response = await salesAPI.getAll({ phone: id });
      setSalesHistory(response.data.results || []);
    } catch (error) {
      console.error('Error fetching sales history:', error);
      // Don't show error for sales history, just leave it empty
    } finally {
      setSalesLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchPhoneDetails();
      fetchSalesHistory();
    }
  }, [id, fetchPhoneDetails, fetchSalesHistory]);

  const handleEdit = () => {
    navigate(`/phones/${id}/edit`);
  };

  const handleDelete = async () => {
    try {
      await phonesAPI.delete(parseInt(id));
      navigate('/phones');
    } catch (error) {
      console.error('Error deleting phone:', error);
      window.showToast('Erreur lors de la suppression du téléphone. Veuillez réessayer.', 'error');
    }
  };

  const getStockStatus = () => {
    if (!phone.inventory) return { status: 'Pas d\'info stock', color: 'text-slate-500' };

    const { stock_quantity, reorder_level } = phone.inventory;
    if (stock_quantity === 0) return { status: 'Rupture de stock', color: 'text-red-600' };
    if (stock_quantity <= reorder_level) return { status: 'Stock faible', color: 'text-amber-600' };
    return { status: 'En stock', color: 'text-green-600' };
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-DZ', {
        style: 'currency',
        currency: 'DZD',
    }).format(amount).replace('DZD', 'DA');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-[var(--spacing-md)]">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!phone) {
    return (
      <div className="max-w-6xl mx-auto p-[var(--spacing-md)]">
        <Card className="p-12 text-center">
          <p className="text-slate-500 mb-4">Téléphone non trouvé</p>
          <Button onClick={() => navigate('/phones')}>Retour aux téléphones</Button>
        </Card>
      </div>
    );
  }

  const stockStatus = getStockStatus();
  const profitMargin = phone.price - phone.purchase_price;

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <PageHeader
        title={`${phone.brand} ${phone.model}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/phones')} size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Retour
            </Button>
            <Button variant="outline" onClick={handleEdit} size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifier
            </Button>
            <Button variant="danger" onClick={() => setShowDeleteDialog(true)} size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[var(--spacing-md)]">
        {/* Main Image and Basic Info */}
        <div className="lg:col-span-2 space-y-[var(--spacing-md)]">
          {/* Image */}
          <Card className="p-4 sm:p-[var(--spacing-md)]">
            <div className="w-full h-64 sm:h-96 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
              {(phone.image_url || phone.image) ? (
                <img
                  src={phone.image_url || phone.image}
                  alt={`${phone.brand} ${phone.model}`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.target;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <svg class="w-24 h-24 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      `;
                    }
                  }}
                />
              ) : (
                <svg className="w-24 h-24 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              )}
            </div>
          </Card>

          {/* Specifications */}
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Spécifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600">Type de produit</label>
                <p className="text-slate-900 font-medium">{phone.product_type || 'Téléphone'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Marque</label>
                <p className="text-slate-900">{phone.brand}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Modèle</label>
                <p className="text-slate-900">{phone.model}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">Stockage</label>
                <p className="text-slate-900">{phone.storage}</p>
              </div>
              {phone.brand?.toLowerCase() !== 'apple' && phone.ram && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">RAM</label>
                  <p className="text-slate-900">{phone.ram}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-600">Couleur</label>
                <p className="text-slate-900">{phone.color}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600">État</label>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  phone.condition === 'New'
                    ? 'bg-green-100 text-green-800'
                    : phone.condition === 'Refurbished'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-100 text-slate-800'
                }`}>
                  {phone.condition === 'New' ? 'Neuf' : phone.condition === 'Refurbished' ? 'Remis à neuf' : 'Occasion'}
                </span>
              </div>
              {phone.battery_percentage && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">État de la batterie</label>
                  <p className="text-slate-900">{phone.battery_percentage}%</p>
                </div>
              )}
              {(phone.supplier_name || phone.inventory?.supplier) && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">Fournisseur</label>
                  <p className="text-slate-900 font-medium">{phone.supplier_name || phone.inventory.supplier}</p>
                </div>
              )}
              {phone.IMEI && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">IMEI / N° de série</label>
                  <p className="text-slate-900 font-mono">{phone.IMEI}</p>
                </div>
              )}
              {phone.barcode && (
                <div>
                  <label className="block text-sm font-medium text-slate-600">Code à Barres</label>
                  <p className="text-slate-900 font-mono">{phone.barcode}</p>
                </div>
              )}
            </div>
            {phone.description && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-600 mb-2">Description</label>
                <p className="text-slate-900 whitespace-pre-wrap">{phone.description}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Pricing and Stock Info */}
        <div className="space-y-[var(--spacing-md)]">
          {/* Pricing */}
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Prix</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600">Prix d'achat:</span>
                <span className="font-medium">{formatCurrency(phone.purchase_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Prix de vente:</span>
                <span className="font-medium text-lg">{formatCurrency(phone.price)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Marge bénéficiaire :</span>
                    <span className={`font-medium ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(profitMargin)}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                    ({profitMargin >= 0 ? '+' : ''}{((profitMargin / phone.purchase_price) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          </Card>

          {/* Stock Information */}
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Informations sur les stocks</h2>
            {phone.inventory ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-600">Stock actuel :</span>
                  <span className="font-medium">{phone.inventory.stock_quantity} unités</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Seuil de réapprovisionnement :</span>
                  <span className="font-medium">{phone.inventory.reorder_level} unités</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Statut :</span>
                  <span className={`font-medium ${stockStatus.color}`}>{stockStatus.status}</span>
                </div>
                {(phone.supplier_name || phone.inventory.supplier) && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Fournisseur :</span>
                    <span className="font-medium">{phone.supplier_name || phone.inventory.supplier}</span>
                  </div>
                )}
                {phone.inventory.last_restocked && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dernier réapprovisionnement :</span>
                    <span className="font-medium text-sm">
                      {new Date(phone.inventory.last_restocked).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">Aucune information sur l'inventaire disponible</p>
            )}
          </Card>
        </div>
      </div>

      {/* Sales History */}
      <Card className="p-[var(--spacing-md)]">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Historique des ventes</h2>
        {salesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : salesHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Date</th>
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Facture</th>
                  <th className="text-left py-2 px-4 font-medium text-slate-700">Client</th>
                  <th className="text-right py-2 px-4 font-medium text-slate-700">Quantité</th>
                  <th className="text-right py-2 px-4 font-medium text-slate-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{formatDate(sale.sale_date || '')}</td>
                    <td className="py-3 px-4 font-medium">{sale.invoice_number || `INV-${sale.id}`}</td>
                    <td className="py-3 px-4">{sale.customer_name}</td>
                    <td className="py-3 px-4 text-right">{sale.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(sale.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Aucun historique de vente disponible pour ce téléphone</p>
        )}
      </Card>

      <ConfirmationDialog
        open={showDeleteDialog}
        title="Supprimer le téléphone"
        message="Êtes-vous sûr de vouloir supprimer ce téléphone ? Cette action ne peut pas être annulée et supprimera également tout l'historique des ventes associé."
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default PhoneDetails;

