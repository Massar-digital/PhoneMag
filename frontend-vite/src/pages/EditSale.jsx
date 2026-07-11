import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import { Spinner } from '../components/common/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import { phonesAPI, salesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { TrashIcon, PlusIcon, CubeIcon } from '@heroicons/react/24/outline';
import { getProductEmoji } from '../utils/productIcons';

const EditSale = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sale, setSale] = useState(null);
  const [phones, setPhones] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payment_method: 'Cash',
    notes: '',
    discount_applied: 0, // Global sale discount
    warranty_duration: '12 mois',
  });

  // Items state
  const [items, setItems] = useState([]);
  
  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    phone_id: '',
    quantity: 1,
    unit_price: '',
    discount_applied: 0,
  });

  const [errors, setErrors] = useState({});

  const paymentMethodOptions = [
    { value: 'Cash', label: 'Espèces' },
    { value: 'Card', label: 'Carte' },
    { value: 'Split', label: 'Split' },
    { value: 'Check', label: 'Chèque' },
    { value: 'Mobile Wallet', label: 'Paiement Mobile' },
    { value: 'Other', label: 'Autre' },
  ];

  const loadPhones = useCallback(async () => {
    try {
      const response = await phonesAPI.getAll();
      setPhones(response.data.results || []);
    } catch (error) {
      console.error('Error loading phones:', error);
    }
  }, []);

  const fetchSale = useCallback(async () => {
    try {
      setLoading(true);
      const response = await salesAPI.get(parseInt(id));
      const saleData = response.data;
      setSale(saleData);
      
      setFormData({
        customer_name: saleData.customer_name || '',
        customer_phone: saleData.customer_phone || '',
        customer_email: saleData.customer_email || '',
        payment_method: saleData.payment_method || 'Cash',
        notes: saleData.notes || '',
        discount_applied: parseFloat(saleData.discount_applied || 0),
        warranty_duration: saleData.warranty_duration || '12 mois',
      });

      // Prepare items for editing
      const initialItems = (saleData.items || []).map(item => ({
        id: item.id, // Keep the original ID for updates
        phone_id: item.phone,
        phone: item.phone_details,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        discount_applied: parseFloat(item.discount_applied || 0),
        total_price: parseFloat(item.total_price),
      }));

      // If no items (legacy sale), add the single phone as an item
      if (initialItems.length === 0 && saleData.phone) {
        initialItems.push({
          phone_id: saleData.phone,
          phone: saleData.phone_details,
          quantity: saleData.quantity || 1,
          unit_price: parseFloat(saleData.total_price / (saleData.quantity || 1)),
          discount_applied: parseFloat(saleData.discount_applied || 0),
          total_price: parseFloat(saleData.total_price),
        });
      }

      setItems(initialItems);
    } catch (error) {
      console.error('Error fetching sale:', error);
      showToast('Erreur lors du chargement de la vente', 'error');
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, showToast]);

  useEffect(() => {
    fetchSale();
    loadPhones();
  }, [fetchSale, loadPhones]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAddItem = () => {
    if (!currentItem.phone_id) return;

    const phone = phones.find(p => p.id === parseInt(currentItem.phone_id));
    if (!phone) return;

    const unitPrice = currentItem.unit_price ? parseFloat(currentItem.unit_price) : parseFloat(phone.price);
    
    setItems([...items, {
      phone_id: phone.id,
      phone: phone,
      quantity: parseInt(currentItem.quantity),
      unit_price: unitPrice,
      discount_applied: parseFloat(currentItem.discount_applied || 0),
      total_price: (unitPrice * parseInt(currentItem.quantity)) - parseFloat(currentItem.discount_applied || 0)
    }]);

    setCurrentItem({ phone_id: '', quantity: 1, unit_price: '', discount_applied: 0 });
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateItemQuantity = (index, newQty) => {
    const newItems = [...items];
    const item = newItems[index];
    item.quantity = parseInt(newQty) || 1;
    item.total_price = item.unit_price * item.quantity - (item.discount_applied || 0);
    setItems(newItems);
  };

  const handleUpdateItemPrice = (index, newPrice) => {
    const newItems = [...items];
    const item = newItems[index];
    item.unit_price = parseFloat(newPrice) || 0;
    item.total_price = (item.unit_price * item.quantity) - (item.discount_applied || 0);
    setItems(newItems);
  };

  const handleUpdateItemDiscount = (index, newDiscount) => {
    const newItems = [...items];
    const item = newItems[index];
    item.discount_applied = parseFloat(newDiscount) || 0;
    item.total_price = (item.unit_price * item.quantity) - item.discount_applied;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const itemDiscounts = items.reduce((sum, item) => sum + (item.discount_applied || 0), 0);
    const globalDiscount = parseFloat(formData.discount_applied || 0);
    const total = subtotal - itemDiscounts - globalDiscount;
    return { subtotal, itemDiscounts, globalDiscount, total };
  };

  const { subtotal, itemDiscounts, globalDiscount, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      showToast('Veuillez ajouter au moins un produit', 'error');
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        total_price: total,
        items: items.map(item => ({
          id: item.id, // Only present for existing items
          phone: item.phone_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_applied: item.discount_applied || 0,
        })),
      };

      await salesAPI.update(id, payload);
      showToast('Vente mise à jour avec succès', 'success');
      navigate(`/sales/${id}`);
    } catch (error) {
      console.error('Error updating sale:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        showToast('Une erreur est survenue lors de la mise à jour', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <PageHeader 
          title={`Modifier la vente #${sale?.invoice_number}`}
          backTo={`/sales/${id}`}
        />

        <div className="mt-4 mb-6 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-sm">
          Modifiez les articles, ajustez les remises et mettez à jour les informations client. Les changements seront reflétés dans le stock.
        </div>
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Items and Customer info */}
        <div className="lg:col-span-2 space-y-[var(--spacing-md)]">
          <Card className="p-[var(--spacing-md)] shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <CubeIcon className="w-5 h-5 text-indigo-500" />
                Articles de la vente
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {items.length} article{items.length > 1 ? 's' : ''}
              </span>
            </div>

            {/* Add Item Row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div className="md:col-span-6">
                <Select
                  label="Rechercher un produit"
                  placeholder="Sélectionner un produit"
                  value={currentItem.phone_id}
                  onChange={(val) => {
                    const phone = phones.find(p => p.id === parseInt(val));
                    setCurrentItem(prev => ({
                      ...prev,
                      phone_id: val,
                      unit_price: phone ? phone.price : ''
                    }));
                  }}
                  options={phones.map(p => ({
                    value: p.id.toString(),
                    label: `${getProductEmoji(p.product_type)} ${p.brand} ${p.model} - ${parseFloat(p.price).toLocaleString()} DA`
                  }))}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Qté"
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, quantity: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Prix Unit. (DA)"
                  type="number"
                  value={currentItem.unit_price}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, unit_price: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Remise (DA)"
                  type="number"
                  value={currentItem.discount_applied}
                  onChange={(e) => setCurrentItem(prev => ({ ...prev, discount_applied: e.target.value }))}
                />
              </div>
              <div className="md:col-span-1 pt-6">
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddItem}
                  className="w-full h-10 flex items-center justify-center p-0"
                  disabled={!currentItem.phone_id}
                >
                  <PlusIcon className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Items List */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs uppercase text-slate-500 font-bold border-b border-slate-100">
                    <th className="pb-3 px-2">Produit</th>
                    <th className="pb-3 px-2 text-center">Qté</th>
                    <th className="pb-3 px-2 text-right">Prix Unit.</th>
                    <th className="pb-3 px-2 text-right">Remise</th>
                    <th className="pb-3 px-2 text-right">Total</th>
                    <th className="pb-3 px-2 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-2">
                        <div className="font-medium text-slate-900">
                          {getProductEmoji(item.phone?.product_type)} {item.phone?.brand} {item.phone?.model}
                        </div>
                        <div className="text-xs text-slate-500 font-mono">
                          {item.phone?.product_type === 'Phone' ? item.phone?.IMEI : 'Accessoire'}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateItemQuantity(index, e.target.value)}
                          className="w-16 mx-auto text-center border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-4 px-2">
                        <input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => handleUpdateItemPrice(index, e.target.value)}
                          className="w-20 ml-auto text-right border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-4 px-2">
                        <input
                          type="number"
                          value={item.discount_applied}
                          onChange={(e) => handleUpdateItemDiscount(index, e.target.value)}
                          className="w-20 ml-auto text-right border-slate-200 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500 text-red-500"
                        />
                      </td>
                      <td className="py-4 px-2 text-right font-semibold text-slate-900">
                        {item.total_price.toLocaleString()} DA
                      </td>
                      <td className="py-4 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 italic">
                        Aucun article ajouté à cette vente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-[var(--spacing-md)] shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Informations Client</h3>
              <span className="text-xs text-slate-400">Contact & identité</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nom du client"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                error={errors.customer_name}
                placeholder="Ex: Mohamed Amine"
              />
              <Input
                label="Téléphone"
                name="customer_phone"
                value={formData.customer_phone}
                onChange={handleChange}
                error={errors.customer_phone}
                placeholder="05 XX XX XX XX"
              />
              <div className="md:col-span-2">
                <Input
                  label="Email (Optionnel)"
                  name="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  error={errors.customer_email}
                  placeholder="client@email.com"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Totals and Payment */}
        <div className="space-y-[var(--spacing-md)] lg:sticky lg:top-24 h-fit">
          <Card className="p-[var(--spacing-md)] shadow-sm border border-slate-200/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Récapitulatif</h3>
              <span className="text-xs text-slate-400">Totaux & paiement</span>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-slate-600">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between text-red-400 text-sm">
                <span>Remises articles</span>
                <span>-{itemDiscounts.toLocaleString()} DA</span>
              </div>
              <div className="flex justify-between items-center gap-4">
                <span className="text-slate-600">Remise globale</span>
                <div className="w-32">
                  <Input
                    type="number"
                    size="sm"
                    value={formData.discount_applied}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_applied: e.target.value }))}
                    className="text-right text-red-600 font-bold"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-end">
                <span className="font-bold text-slate-900">Total à payer</span>
                <span className="text-2xl font-black text-indigo-600">{total.toLocaleString()} DA</span>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <Select
                label="Mode de paiement"
                name="payment_method"
                value={formData.payment_method}
                onChange={(val) => handleChange({ target: { name: 'payment_method', value: val } })}
                options={paymentMethodOptions}
                error={errors.payment_method}
              />
              
              <Input
                label="Durée de garantie"
                name="warranty_duration"
                value={formData.warranty_duration}
                onChange={handleChange}
                placeholder="Ex: 12 mois"
                error={errors.warranty_duration}
              />
              
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                error={errors.notes}
                rows={3}
                placeholder="Notes internes sur la vente..."
              />
            </div>

            <div className="mt-8 space-y-3">
              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={isSubmitting}
                disabled={isSubmitting}
                className="h-12 text-lg font-bold shadow-lg shadow-indigo-200"
              >
                Enregistrer les modifications
              </Button>
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => navigate(`/sales/${id}`)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
            </div>
          </Card>
          
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
            <div className="text-xl">⚠️</div>
            <div className="text-xs text-amber-800 leading-relaxed">
              <strong>Note sur l'inventaire :</strong> Les modifications apportées aux articles (ajout, suppression ou changement de quantité) seront automatiquement répercutées sur le stock du magasin.
            </div>
          </div>
        </div>
        </form>
      </div>
    </div>
  );
};

export default EditSale;


