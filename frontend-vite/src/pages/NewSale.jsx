import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { Input, Select, Textarea } from '../components/forms/FormFields';
import { phonesAPI, salesAPI, customersAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';
import PrintableInvoice from '../components/PrintableInvoice';
import { getProductEmoji } from '../utils/productIcons';
import { formatDRFError } from '../utils/errorUtils';
import { KeyboardBarcodeScanner, useKeyboardBarcodeScanner } from '../components/common/KeyboardBarcodeScanner';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

const NewSaleModal = ({ isOpen, onClose, onSuccess }) => {
  const { data: shopSettings } = useShopSettings();
  const [phones, setPhones] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerMode, setCustomerMode] = useState('none');
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [createdSale, setCreatedSale] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const invoiceRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: createdSale ? `Facture_${createdSale.invoice_number}` : 'Facture',
    print: async (printIframe) => {
      if (window.electron && window.electron.print) {
        window.focus();
        const html = printIframe.contentDocument.documentElement.outerHTML;
        await window.electron.print({ html, preview: true });
        window.focus();
      } else {
        printIframe.contentWindow.print();
      }
    }
  });

  // Form state
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    payment_method: 'Cash',
    warranty_duration: '',
    notes: '',
  });

  // Items state - array of { phone_id, quantity, unit_price, discount }
  const [items, setItems] = useState([]);
  
  // Current item being added
  const [currentItem, setCurrentItem] = useState({
    phone_id: '',
    quantity: 1,
    discount: 0,
  });

  // Active section for adding items (null, 'phones', or 'accessories')
  const [activeSection, setActiveSection] = useState(null);
  const [productSearch, setProductSearch] = useState('');

  // Barcode scanner hook
  const barcodeScanner = useKeyboardBarcodeScanner({
    defaultEnabled: false,
    onBarcodeScanned: (barcode) => {
      console.log('NewSale: Barcode scanned:', barcode);
      handleBarcodeScanned(barcode);
    }
  });

  // Load all in-stock products
  const loadAllProducts = async () => {
    try {
      const response = await phonesAPI.getAll({ in_stock: 'true' });
      const phoneData = response.data.results || response.data;
      setPhones(Array.isArray(phoneData) ? phoneData : []);
    } catch (error) {
      console.error('Error loading products:', error);
      setPhones([]);
    }
  };

  // Search products with debouncing
  useEffect(() => {
    if (productSearch.length >= 2) {
      const handler = setTimeout(() => {
        searchProducts(productSearch);
      }, 300);
      return () => clearTimeout(handler);
    } else if (productSearch.length < 2) {
      loadAllProducts();
    }
  }, [productSearch]);

  const searchProducts = async (query) => {
    try {
      const response = await phonesAPI.search(query, { in_stock: 'true' });
      setPhones(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  // Load customers
  const loadCustomers = useCallback(async () => {
    try {
      // Load more customers for the selection dropdown
      const response = await customersAPI.getAll({ page_size: 1000 });
      setCustomers(response.data.results || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      window.showToast('Erreur lors du chargement des clients', 'error');
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadCustomers();
      loadAllProducts();
      setCustomerMode('none');
      setShowSuccessDialog(false);
      setCreatedSale(null);
      setItems([]);
      setCurrentItem({ phone_id: '', quantity: 1, discount: 0 });
      setActiveSection(null);
      setFormData({
        customer_id: '',
        customer_name: '',
        customer_phone: '',
        customer_email: '',
        payment_method: 'Cash',
        warranty_duration: '',
        notes: '',
      });
      setError(null);
      setProductSearch('');
    }
  }, [isOpen, loadCustomers]);

  // Add item to list
  const handleAddItem = () => {
    if (!currentItem.phone_id) {
      setError('Veuillez sélectionner un produit');
      return;
    }

    const phone = phones.find(p => p.id === parseInt(currentItem.phone_id));
    if (!phone) return;

    // Check if item already exists
    const existingIndex = items.findIndex(item => item.phone_id === currentItem.phone_id);
    
    if (existingIndex >= 0) {
      // Update existing item
      const newItems = [...items];
      newItems[existingIndex] = {
        phone_id: currentItem.phone_id,
        phone: phone,
        quantity: currentItem.quantity,
        unit_price: parseFloat(phone.price),
        discount: currentItem.discount || 0,
      };
      setItems(newItems);
    } else {
      // Add new item
      setItems([...items, {
        phone_id: currentItem.phone_id,
        phone: phone,
        quantity: currentItem.quantity,
        unit_price: parseFloat(phone.price),
        discount: currentItem.discount || 0,
      }]);
    }

    // Reset current item
    setCurrentItem({ phone_id: '', quantity: 1, discount: 0 });
    setError(null);
  };

  // Remove item from list
  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Handle barcode scanning
  const handleBarcodeScanned = async (barcode) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    setIsSubmitting(true);
    try {
      let foundPhone = null;

      // 1. Try IMEI lookup
      try {
        const response = await phonesAPI.getByIMEI(cleanBarcode);
        if (response.data) foundPhone = response.data;
      } catch (e) {}

      // 2. Try Barcode lookup
      if (!foundPhone) {
        try {
          const response = await phonesAPI.getByBarcode(cleanBarcode);
          if (response.data) foundPhone = response.data;
        } catch (e) {}
      }

      // 3. Fallback to ID
      if (!foundPhone && !isNaN(cleanBarcode)) {
        try {
          const response = await phonesAPI.get(parseInt(cleanBarcode));
          if (response.data) foundPhone = response.data;
        } catch (e) {}
      }

      if (foundPhone) {
        // Check if already in items
        const existingIndex = items.findIndex(item => item.phone_id === foundPhone.id);
        if (existingIndex >= 0) {
          // Update quantity
          const updatedItems = [...items];
          updatedItems[existingIndex].quantity += 1;
          setItems(updatedItems);
        } else {
          // Add new item
          setItems([...items, {
            phone_id: foundPhone.id,
            phone: foundPhone,
            quantity: 1,
            unit_price: parseFloat(foundPhone.price),
            discount: 0,
          }]);
        }
        window.showToast?.(`${foundPhone.brand} ${foundPhone.model} ajouté à la vente`, 'success');
      } else {
        // If not found, try searching in the product list
        setProductSearch(cleanBarcode);
        window.showToast?.('Produit non trouvé. Recherche élargie...', 'info');
      }
    } catch (error) {
      console.error('Scan processing error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;

    items.forEach(item => {
      const itemSubtotal = item.unit_price * item.quantity;
      subtotal += itemSubtotal;
      totalDiscount += item.discount || 0;
    });

    const total = subtotal - totalDiscount;
    return { subtotal, totalDiscount, total };
  };

  const { subtotal, totalDiscount, total } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (items.length === 0) {
      setError('Veuillez ajouter au moins un article');
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare sale data
      const saleData = {
        total_price: total.toFixed(2),
        discount_applied: "0.00", // Item-level discounts are handled in the items array
        payment_method: formData.payment_method || 'Cash',
        warranty_duration: formData.warranty_duration || '',
        notes: formData.notes || '',
        items: items.map(item => ({
          phone: item.phone_id,
          quantity: item.quantity,
          unit_price: item.unit_price.toFixed(2),
          discount_applied: (item.discount || 0).toFixed(2),
        })),
      };

      if (customerMode === 'existing' && formData.customer_id) {
        const selectedCustomer = customers.find(c => c.id.toString() === formData.customer_id);
        saleData.customer = parseInt(formData.customer_id);
        if (selectedCustomer) {
          saleData.customer_name = selectedCustomer.name;
          saleData.customer_phone = selectedCustomer.phone;
        }
      }

      if (customerMode === 'new') {
        saleData.customer_name = formData.customer_name || null;
        saleData.customer_phone = formData.customer_phone || null;
      }

      const response = await salesAPI.create(saleData);
      setCreatedSale(response.data);
      setShowSuccessDialog(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      const errorMessage = formatDRFError(error.response?.data) || 'Échec de la création de la vente';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter phones based on active section AND stock > 0
  const filteredPhones = (activeSection === 'phones' 
    ? phones.filter(phone => phone.product_type === 'Phone' && (phone.inventory?.stock_quantity || 0) > 0)
    : activeSection === 'laptops'
    ? phones.filter(phone => phone.product_type === 'Laptop' && (phone.inventory?.stock_quantity || 0) > 0)
    : activeSection === 'accessories'
    ? phones.filter(phone => !['Phone', 'Laptop'].includes(phone.product_type) && (phone.inventory?.stock_quantity || 0) > 0)
    : phones.filter(phone => (phone.inventory?.stock_quantity || 0) > 0));

  // Phone options for select
  const phoneOptions = filteredPhones.map(phone => ({
    value: phone.id.toString(),
    label: `${getProductEmoji(phone.product_type)} ${phone.brand} ${phone.model} ${phone.product_type !== 'Phone' ? `(${phone.product_type})` : ''} - ${parseFloat(phone.price || 0).toFixed(2)} DA (Stock: ${phone.inventory?.stock_quantity || 0})`,
  }));

  // Customer options for select
  const customerOptions = customers.map(customer => ({
    value: customer.id.toString(),
    label: `${customer.name} - ${customer.phone}`,
  }));

  // Payment method options
  const paymentMethodOptions = [
    { value: 'Cash', label: 'Espèces' },
    { value: 'Card', label: 'Carte' },
    { value: 'Split', label: 'Split' },
    { value: 'Check', label: 'Chèque' },
    { value: 'Other', label: 'Autre' },
  ];

  // Print invoice function
  const handlePrintInvoice = () => {
    if (!createdSale) return;
    handlePrint();
  };

  // Handle success dialog actions
  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onClose();
  };

  return (
    <>
      <Modal
        open={isOpen && !showSuccessDialog}
        onClose={onClose}
        size="5xl"
        header={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-xl shadow-inner">
              🛍️
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-none">Nouvelle vente</h2>
              <p className="text-[0.625rem] text-slate-500 mt-0.5 uppercase tracking-wider font-semibold">Point de vente (POS)</p>
            </div>
          </div>
        }
        body={
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[0.75rem] font-bold text-slate-700 uppercase tracking-widest px-1">Choix du Client</label>
                <div className="grid-fluid-xs">
                  {[
                    { id: 'none', label: 'Pas de client', icon: '👤', desc: 'Vente rapide' },
                    { id: 'existing', label: 'Existant', icon: '🔍', desc: 'Rechercher' },
                    { id: 'new', label: 'Nouveau', icon: '✨', desc: 'Créer' }
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setCustomerMode(mode.id);
                        if (mode.id === 'none') {
                          setFormData({ ...formData, customer_id: '', customer_name: '', customer_phone: '', customer_email: '' });
                        } else if (mode.id === 'existing') {
                          setFormData({ ...formData, customer_id: '', customer_name: '', customer_phone: '', customer_email: '' });
                        } else {
                          setFormData({ ...formData, customer_id: '' });
                        }
                      }}
                      className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-300 ${
                        customerMode === mode.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-slate-100 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-xl mb-1">{mode.icon}</span>
                      <span className={`font-bold text-xs ${customerMode === mode.id ? 'text-indigo-700' : 'text-slate-700'}`}>
                        {mode.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {customerMode === 'none' ? (
                <div className="flex bg-amber-50 border-l-4 border-amber-400 p-2 rounded-r-lg shadow-sm">
                  <p className="text-xs text-amber-800 self-center font-medium">
                    Vente rapide sans détails client.
                  </p>
                </div>
              ) : customerMode === 'existing' ? (
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 shadow-inner">
                  <Select
                    value={formData.customer_id}
                    onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                    options={[{ value: '', label: 'Sélectionner un client' }, ...customerOptions]}
                    placeholder="Choisir un client..."
                  />
                </div>
              ) : (
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-lg grid-fluid-sm">
                  <Input
                    label="Nom"
                    placeholder="Nom complet"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    label="Téléphone"
                    placeholder="05 / 06 / 07..."
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="exemple@mail.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    className="text-xs"
                  />
                </div>
              )}
            </div>

            {/* Items Section */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">Articles</h3>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                    {items.length}
                  </span>
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    {items.length === 1 ? 'article' : 'articles'}
                  </span>
                </div>
              </div>
              
              {/* Selection Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(activeSection === 'phones' ? null : 'phones');
                    setProductSearch('');
                    setCurrentItem({ phone_id: '', quantity: 1, discount: 0 });
                  }}
                  className={`group relative overflow-hidden rounded-xl p-3 transition-all duration-300 ${
                    activeSection === 'phones'
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md'
                      : 'bg-white text-slate-700 border-2 border-slate-50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                      activeSection === 'phones' ? 'bg-white/20' : 'bg-indigo-50'
                    }`}>
                      📱
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">Téléphones</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(activeSection === 'laptops' ? null : 'laptops');
                    setProductSearch('');
                    setCurrentItem({ phone_id: '', quantity: 1, discount: 0 });
                  }}
                  className={`group relative overflow-hidden rounded-xl p-3 transition-all duration-300 ${
                    activeSection === 'laptops'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md'
                      : 'bg-white text-slate-700 border-2 border-slate-50 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                      activeSection === 'laptops' ? 'bg-white/20' : 'bg-emerald-50'
                    }`}>
                      💻
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">Laptops</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSection(activeSection === 'accessories' ? null : 'accessories');
                    setProductSearch('');
                    setCurrentItem({ phone_id: '', quantity: 1, discount: 0 });
                  }}
                  className={`group relative overflow-hidden rounded-xl p-3 transition-all duration-300 ${
                    activeSection === 'accessories'
                      ? 'bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-md'
                      : 'border-2 border-slate-50 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-transform ${
                      activeSection === 'accessories' ? 'bg-white/20' : 'bg-purple-50'
                    }`}>
                      🎧
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-tight">Accessoires</span>
                  </div>
                </button>
              </div>

              {/* Add Item Form - Only show when a section is active */}
              {activeSection && (
                <div className={`relative overflow-hidden rounded-2xl border shadow-xl transition-all duration-300 mb-6 ${
                  activeSection === 'phones' ? 'border-indigo-100 bg-white' : 
                  activeSection === 'laptops' ? 'border-emerald-100 bg-white' : 'border-purple-100 bg-white'
                }`}>
                  <div className="p-4 space-y-4">
                    {/* Search bar inside section */}
                    <div className="flex gap-2">
                      <div className="relative group flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder={`Rechercher un ${activeSection === 'phones' ? 'téléphone' : activeSection === 'laptops' ? 'laptop' : 'accessoire'}...`}
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className={`block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl leading-5 bg-slate-50 text-sm placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
                            activeSection === 'phones' ? 'focus:ring-indigo-500 focus:border-indigo-500' :
                            activeSection === 'laptops' ? 'focus:ring-emerald-500 focus:border-emerald-500' : 'focus:ring-purple-500 focus:border-purple-500'
                          }`}
                        />
                      </div>
                      <Button
                        onClick={barcodeScanner.toggleScanner}
                        variant={barcodeScanner.enabled ? "primary" : "secondary"}
                        size="sm"
                        className="flex items-center gap-2 whitespace-nowrap"
                      >
                        📱 {barcodeScanner.enabled ? 'Scanner ON' : 'Scanner OFF'}
                      </Button>
                    </div>
                    <KeyboardBarcodeScanner
                      enabled={barcodeScanner.enabled}
                      onBarcodeScanned={barcodeScanner.onBarcodeScanned}
                      preventManualTyping={false}
                      placeholder="Scannez un code-barres..."
                    />

                    {/* Product Selection area - Scrollable Buttons */}
                    <div className="grid-fluid-xs max-h-52 overflow-y-auto pr-2 custom-scrollbar p-1">
                      {filteredPhones.map((phone) => (
                        <button
                          key={phone.id}
                          type="button"
                          onClick={() => setCurrentItem({ ...currentItem, phone_id: phone.id.toString() })}
                          className={`flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-200 group relative ${
                            currentItem.phone_id === phone.id.toString()
                              ? activeSection === 'phones' 
                                ? 'bg-indigo-50 border-indigo-500 shadow-sm' 
                                : activeSection === 'laptops'
                                ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                                : 'bg-purple-50 border-purple-500 shadow-sm'
                              : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-xl mb-1 group-hover:scale-110 transition-transform">{getProductEmoji(phone.product_type)}</div>
                          <div className={`text-[10px] font-bold text-center leading-tight line-clamp-2 h-6 w-full ${
                             currentItem.phone_id === phone.id.toString() ? 'text-slate-900' : 'text-slate-600'
                          }`}>
                            {phone.brand} {phone.model}
                          </div>
                          <div className={`text-[10px] font-black mt-1 ${
                            activeSection === 'phones' ? 'text-indigo-600' : 
                            activeSection === 'laptops' ? 'text-emerald-600' : 'text-purple-600'
                          }`}>
                            {parseFloat(phone.price || 0).toLocaleString()} DA
                          </div>
                          <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                             (phone.inventory?.stock_quantity || 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            Stk: {phone.inventory?.stock_quantity || 0}
                          </div>
                          {currentItem.phone_id === phone.id.toString() && (
                            <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white shadow-sm ring-2 ring-white ${
                               activeSection === 'phones' ? 'bg-indigo-500' : 
                               activeSection === 'laptops' ? 'bg-emerald-500' : 'bg-purple-500'
                            }`}>
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                      {filteredPhones.length === 0 && (
                        <div className="col-span-full py-10 text-center">
                          <div className="text-3xl mb-2 grayscale opacity-30">📦</div>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Aucun produit trouvé</p>
                        </div>
                      )}
                    </div>

                    {/* Footer part with Qté and Remise */}
                    <div className="grid-fluid-sm pt-3 border-t border-slate-100">
                      <div>
                        <Input
                          label="Quantité"
                          type="number"
                          min="1"
                          placeholder="1"
                          value={currentItem.quantity}
                          onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                          className="text-xs"
                        />
                      </div>
                      <div>
                        <Input
                          label="Remise (DA)"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={currentItem.discount === 0 ? '' : currentItem.discount}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCurrentItem({ ...currentItem, discount: val === '' ? 0 : parseFloat(val) || 0 });
                          }}
                          className="text-xs"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          onClick={handleAddItem}
                          disabled={!currentItem.phone_id}
                          className={`w-full py-2.5 rounded-xl shadow-lg font-black text-xs transition-all active:scale-95 ${
                            activeSection === 'phones' 
                              ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' 
                              : activeSection === 'laptops'
                              ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                              : 'bg-purple-600 hover:bg-purple-700 shadow-purple-100'
                          }`}
                        >
                          <PlusIcon className="w-4 h-4 mr-2" />
                          AJOUTER AU PANIER
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List */}
              {items.length > 0 ? (
                <div className="border-2 border-slate-200 rounded-xl overflow-hidden shadow-md">
                  {/* Mobile cards */}
                  <div className="md:hidden bg-slate-50/70 p-4 space-y-3">
                    {items.map((item, index) => {
                      const itemSubtotal = item.unit_price * item.quantity;
                      const itemTotal = itemSubtotal - (item.discount || 0);
                      const isPhone = item.phone.product_type === 'Phone';
                      const productEmoji = getProductEmoji(item.phone.product_type);

                      return (
                        <div key={index} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0 ${
                                isPhone ? 'bg-indigo-100' : 'bg-purple-100'
                              }`}>
                                {productEmoji}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">
                                  {item.phone.brand} {item.phone.model}
                                </div>
                                <div className={`text-xs font-medium ${isPhone ? 'text-indigo-600' : 'text-purple-600'}`}>
                                  {item.phone.product_type}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-600 hover:text-white hover:bg-red-600 transition-all duration-200"
                              aria-label="Remove item"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="mt-3 grid-fluid-xs text-sm">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="text-xs text-slate-500">Prix</div>
                              <div className="font-semibold text-slate-900">
                                {item.unit_price.toFixed(2)} DA
                              </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="text-xs text-slate-500">Quantité</div>
                              <div className="font-semibold text-slate-900">{item.quantity}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="text-xs text-slate-500">Sous-total</div>
                              <div className="font-semibold text-slate-900">
                                {itemSubtotal.toFixed(2)} DA
                              </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                              <div className="text-xs text-slate-500">Remise</div>
                              <div className="font-semibold text-slate-900">
                                {item.discount > 0
                                  ? `-${(item.discount || 0).toFixed(2)} DA`
                                  : '-'
                                }
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg px-4 py-3">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-lg">
                              {itemTotal.toFixed(2)} DA
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
                    <table className="min-w-full divide-y divide-slate-100">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-3 text-left text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Produit</th>
                          <th className="px-4 py-3 text-right text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Prix</th>
                          <th className="px-4 py-3 text-center text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Qté</th>
                          <th className="px-4 py-3 text-right text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Remise</th>
                          <th className="px-4 py-3 text-right text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Total</th>
                          <th className="px-4 py-3 text-center text-[0.625rem] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {items.map((item, index) => {
                          const itemSubtotal = item.unit_price * item.quantity;
                          const itemTotal = itemSubtotal - (item.discount || 0);
                          const isPhone = item.phone.product_type === 'Phone';
                          const productEmoji = getProductEmoji(item.phone.product_type);
                          return (
                            <tr key={index} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2">
                                <div className="flex items-center">
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl mr-3 shadow-sm ${
                                    isPhone ? 'bg-indigo-100' : 'bg-purple-100'
                                  }`}>
                                    {productEmoji}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-900">
                                      {item.phone.brand} {item.phone.model}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                        isPhone ? 'bg-indigo-50 text-indigo-600' : 'bg-purple-50 text-purple-600'
                                      }`}>
                                        {item.phone.product_type}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-[11px] text-slate-600">
                                {item.unit_price.toLocaleString()} DA
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right">
                                {item.discount > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-red-600 border border-red-100">
                                    -{(item.discount || 0).toLocaleString()} DA
                                  </span>
                                ) : (
                                  <span className="text-slate-300 text-[10px]">---</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right text-xs font-black text-slate-900">
                                {itemTotal.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">DA</span>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(index)}
                                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center"
                                  aria-label="Remove item"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                  <div className="text-3xl mb-2">🛒</div>
                  <p className="text-slate-600 font-bold text-sm">Panier vide</p>
                  <p className="text-xs text-slate-400">Ajoutez des articles pour continuer la vente</p>
                </div>
              )}
            </div>

            {/* Payment, Warranty & Notes */}
            <div className="grid-fluid-sm border-t pt-4">
              <Select
                label="Mode de paiement"
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                options={paymentMethodOptions}
                required
                className="text-xs"
              />
              <Input
                label="Durée de garantie"
                placeholder="Ex: 12 mois"
                value={formData.warranty_duration}
                onChange={(e) => setFormData({ ...formData, warranty_duration: e.target.value })}
                className="text-xs"
              />
              <Textarea
                label="Remarques"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                placeholder="Notes..."
                className="text-xs"
              />
            </div>

            {/* Price Summary */}
            {items.length > 0 && (
              <div className="bg-slate-900 text-white p-[var(--spacing-md)] rounded-2xl shadow-lg relative overflow-hidden mt-4">
                <div className="relative z-10">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Sous-total</span>
                      <span className="font-mono">{subtotal.toLocaleString()} DA</span>
                    </div>
                    
                    {totalDiscount > 0 && (
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-red-400 font-bold italic">Total Remises</span>
                        <span className="font-mono text-red-400">-{totalDiscount.toLocaleString()} DA</span>
                      </div>
                    )}
                    
                    <div className="h-px bg-white/10 my-3"></div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-indigo-400 text-xs font-black uppercase tracking-widest">TOTAL À PAYER</span>
                      <div className="text-2xl font-black tracking-tight text-white">
                        {total.toLocaleString()} <span className="text-xs font-normal text-slate-500">DA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-600 text-[11px] text-center bg-red-50 p-2 rounded border border-red-100 font-bold">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={isSubmitting}
                size="sm"
                className="text-xs font-bold text-slate-500"
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || items.length === 0}
                size="sm"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="xs" className="mr-2" />
                    Chargement...
                  </>
                ) : (
                  'Confirmer la vente'
                )}
              </Button>
            </div>
          </form>
        }
        footer={null}
      />

      {/* Success Dialog */}
      <Modal
        open={showSuccessDialog && createdSale !== null}
        onClose={handleSuccessClose}
        size="md"
        header={<h2 className="text-xl font-semibold text-green-600">Vente créée avec succès !</h2>}
        body={
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-slate-600">
                La vente a été créée avec succès avec le numéro de facture{' '}
                <span className="font-semibold text-slate-900">
                  {createdSale?.invoice_number || 'N/A'}
                </span>
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium text-slate-900 mb-2">Résumé de la vente</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Client :</span>
                  <span className="font-medium">
                    {(createdSale?.customer
                      ? customers.find(c => c.id === createdSale.customer)?.name
                      : null) || createdSale?.customer_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Articles :</span>
                  <span className="font-medium">{items.length} article(s)</span>
                </div>
                <div className="flex justify-between">
                  <span>Total :</span>
                  <span className="font-medium">{Number(createdSale?.total_price)?.toFixed(2) || '0.00'} DA</span>
                </div>
                <div className="flex justify-between">
                  <span>Paiement :</span>
                  <span className="font-medium">{createdSale?.payment_method || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button
              onClick={handlePrintInvoice}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimer la facture
            </Button>
            <Button
              variant="outline"
              onClick={handleSuccessClose}
              className="w-full sm:w-auto"
            >
              Fermer
            </Button>
          </div>
        }
      />

      {/* Hidden container for printing to ensure Electron's print preview works */}
      <div style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', left: '-1000px', top: '-1000px' }}>
        <PrintableInvoice 
          ref={invoiceRef} 
          sale={createdSale} 
          shopSettings={shopSettings?.data} 
        />
      </div>
    </>
  );
};

export default NewSaleModal;
