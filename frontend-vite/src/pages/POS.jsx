import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Modal } from '../components/common/Modal';
import {
  KeyboardBarcodeScanner,
  useKeyboardBarcodeScanner,
  POS_PAYMENT_SHORTCUT_KEYS,
} from '../components/common/KeyboardBarcodeScanner';
import { PageHeader } from '../components/layout/PageHeader';
import { phonesAPI, salesAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';
import {
  DevicePhoneMobileIcon, 
  ShoppingCartIcon,
  TrashIcon,
  UserPlusIcon,
  TicketIcon,
  ArrowRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { MobileBottomNav } from '../components/layout/MobileBottomNav';
import PrintableInvoice from '../components/PrintableInvoice';
import PrintableWarranty from '../components/PrintableWarranty';
import ReceiptPreview from '../components/ReceiptPreview';
import { formatDRFError } from '../utils/errorUtils';
import {
  loadParkedSales,
  saveParkedSales,
  createParkedSnapshot,
  computeParkedTotal,
} from '../utils/parkedSales';
import { canExpressCheckout } from '../utils/expressCheckout';

const PAYMENT_BY_SHORTCUT_KEY = {
  '1': 'Cash',
  '2': 'Card',
  '3': 'Split',
};

const POS = () => {
  const navigate = useNavigate();
  const { data: shopSettings } = useShopSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [phones, setPhones] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdSale, setCreatedSale] = useState(null);
  const [warrantyDuration, setWarrantyDuration] = useState('12 mois');
  const [activeTab, setActiveTab] = useState('products'); // 'products' or 'cart' for mobile view
  const [tradeIn, setTradeIn] = useState({
    enabled: false,
    brand: '',
    model: '',
    imei: '',
    condition: 'Used',
    trade_in_value: 0,
    notes: ''
  });

  // Additional states for single-screen checkout UX
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [confirmPending, setConfirmPending] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [showParkedDrawer, setShowParkedDrawer] = useState(false);
  const [parkedSales, setParkedSales] = useState(loadParkedSales);

  // Refs for element focusing
  const searchRef = useRef(null);
  const discountRef = useRef(null);
  const invoiceRef = useRef(null);
  const warrantyRef = useRef(null);
  const barcodeScannerRef = useRef(null);

  // Barcode scanner hook
  const barcodeScanner = useKeyboardBarcodeScanner({
    defaultEnabled: true,
    onBarcodeScanned: (barcode) => {
      console.log('Barcode scanned:', barcode);
      handleBarcodeScanned(barcode);
    }
  });

  // Printing configurations
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: createdSale ? `Facture_${createdSale.invoice_number}` : 'Facture',
    print: async (printIframe) => {
      try {
        if (window.electron && window.electron.print) {
          window.focus();
          const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
          if (!doc) throw new Error('Print iframe document not available');
          const html = doc.documentElement?.outerHTML || doc.body?.innerHTML || '';
          if (!html) throw new Error('Print content is empty');
          await window.electron.print({ html, preview: true });
          window.focus();
        } else {
          printIframe.contentWindow.print();
        }
      } catch (error) {
        console.error('Print error:', error);
        window.showToast?.('Erreur lors de l\'impression', 'error');
      }
    }
  });

  const triggerPrintWarranty = useReactToPrint({
    contentRef: warrantyRef,
    documentTitle: createdSale ? `Garantie_${createdSale.invoice_number}` : 'Garantie',
    print: async (printIframe) => {
      try {
        if (window.electron && window.electron.print) {
          window.focus();
          const doc = printIframe.contentDocument || printIframe.contentWindow?.document;
          if (!doc) throw new Error('Print iframe document not available');
          const html = doc.documentElement?.outerHTML || doc.body?.innerHTML || '';
          if (!html) throw new Error('Print content is empty');
          await window.electron.print({ html, preview: true });
          window.focus();
        } else {
          printIframe.contentWindow.print();
        }
      } catch (error) {
        console.error('Print error:', error);
        window.showToast?.('Erreur lors de l\'impression', 'error');
      }
    }
  });

  const handlePrintWarranty = async () => {
    if (window.electron?.warranty) {
      try {
        const hasCustom = await window.electron.warranty.checkCustom();
        if (hasCustom) {
          window.focus();
          await window.electron.print({ filePath: 'custom_warranty.pdf', preview: true });
          window.focus();
          return;
        } else {
          const hasDefault = await window.electron.warranty.checkDefault();
          if (hasDefault) {
            window.focus();
            await window.electron.print({ filePath: 'warranty.pdf', preview: true });
            window.focus();
            return;
          }
        }
      } catch (error) {
        console.error("Warranty check failed:", error);
      }
    }
    triggerPrintWarranty();
  };

  const handlePrintReceipt = async (sale) => {
    if (!sale) return;
    try {
      await handlePrint();
    } catch (error) {
      console.error('Print failed:', error);
      window.showToast?.('Échec de l\'impression', 'error');
    }
  };

  // Load all in-stock products on mount
  useEffect(() => {
    loadAllProducts();
  }, []);

  // Search-as-you-type debounced
  useEffect(() => {
    if (searchTerm.length >= 2) {
      const handler = setTimeout(() => {
        searchProducts(searchTerm);
      }, 300);
      return () => clearTimeout(handler);
    } else if (searchTerm.length < 2) {
      // When search is cleared or < 2 chars, show all products again
      loadAllProducts();
    }
  }, [searchTerm]);

  const loadAllProducts = async () => {
    try {
      const response = await phonesAPI.getAll({ in_stock: 'true' });
      const phoneData = response.data.results || response.data;
      setPhones(Array.isArray(phoneData) ? phoneData : []);
    } catch (error) {
      console.error('Failed to load products:', error);
      setPhones([]);
    }
  };

  const searchProducts = async (query) => {
    try {
      const response = await phonesAPI.search(query, { in_stock: 'true' });
      const phoneData = response.data.results || response.data;
      setPhones(Array.isArray(phoneData) ? phoneData : []);
    } catch (error) {
      console.error('Failed to search phones:', error);
      setPhones([]);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  const handleBarcodeScanned = (barcode) => {
    console.log('Processing barcode:', barcode);
    handleScanResult(barcode);
  };

  const handleScanResult = async (scannedCode) => {
    const cleanScannedCode = scannedCode.trim();
    if (!cleanScannedCode) return;

    setIsProcessing(true);
    try {
      const looksLikeImei = /^\d{15}$/.test(cleanScannedCode);
      const looksLikeBarcode = /^PM-\d{6}/i.test(cleanScannedCode);

      // 1. Try IMEI lookup (only when the scanned value is a 15-digit IMEI)
      if (looksLikeImei) {
        try {
          const response = await phonesAPI.getByIMEI(cleanScannedCode);
          if (response.data) {
            addToCart(response.data);
            window.showToast?.(`${response.data.brand} ${response.data.model} ajouté au panier`, 'success');
            return;
          }
        } catch (e) { /* Not found by IMEI */ }
      }

      // 2. Try Barcode lookup (only when the scanned value matches the PM- barcode format)
      if (looksLikeBarcode) {
        try {
          const response = await phonesAPI.getByBarcode(cleanScannedCode);
          if (response.data) {
            addToCart(response.data);
            window.showToast?.(`${response.data.brand} ${response.data.model} ajouté au panier`, 'success');
            return;
          }
        } catch (e) { /* Not found by barcode */ }
      }

      // 3. Fallback to specialized ID barcode format: PM-000XXX-YYY
      if (cleanScannedCode.startsWith('PM-')) {
        const parts = cleanScannedCode.split('-');
        if (parts.length >= 2) {
          const phoneId = parseInt(parts[1]);
          try {
            const response = await phonesAPI.get(phoneId);
            if (response.data) {
              addToCart(response.data);
              window.showToast?.(`${response.data.brand} ${response.data.model} ajouté au panier`, 'success');
              return;
            }
          } catch (e) { /* Not found by ID */ }
        }
      }

      // 4. If still not found, set search term to show results to user
      setSearchTerm(cleanScannedCode);
      window.showToast?.('Produit non trouvé. Recherche élargie...', 'info');
    } catch (error) {
      console.error('Scan processing error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPhones = useMemo(() => {
    return phones.filter(phone => (phone.inventory?.stock_quantity || 0) > 0);
  }, [phones]);

  // Adjust focused search index
  useEffect(() => {
    if (filteredPhones.length > 0) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  }, [filteredPhones]);

  // Auto-focus scan field when enabled and cart is empty (keeps payment keys 1–3 free after add)
  useEffect(() => {
    if (cart.length > 0) return;
    if (barcodeScanner.enabled) {
      barcodeScannerRef.current?.focus();
    } else {
      searchRef.current?.focus();
    }
  }, [barcodeScanner.enabled, cart.length]);

  const addToCart = (phone) => {
    const existingItem = cart.find(item => item.phone.id === phone.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.phone.id === phone.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { phone, quantity: 1, price: Number(phone.price) || 0, discount: 0 }]);
    }
    setActiveTab('cart');
    if (barcodeScanner.enabled) {
      barcodeScannerRef.current?.blur();
    }
    console.log(`${phone.brand} ${phone.model} added to cart`);
  };

  const removeFromCart = (phoneId) => {
    setCart(cart.filter(item => item.phone.id !== phoneId));
  };

  const updateQuantity = (phoneId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(phoneId);
      return;
    }
    setCart(cart.map(item =>
      item.phone.id === phoneId
        ? { ...item, quantity }
        : item
    ));
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    const discountAmount = parseFloat(discount || 0);
    const tradeInValue = tradeIn.enabled ? parseFloat(tradeIn.trade_in_value || 0) : 0;
    return Math.max(0, subtotal - discountAmount - tradeInValue);
  };

  // Real-time change due computation
  const changeDue = useMemo(() => {
    const received = parseFloat(cashReceived) || 0;
    const total = getTotal();
    return Math.max(0, received - total);
  }, [cashReceived, cart, discount, tradeIn]);

  const isExpressSale = useMemo(
    () =>
      canExpressCheckout({
        cart,
        discount,
        tradeIn,
        paymentMethod,
        customer,
      }),
    [cart, discount, tradeIn, paymentMethod, customer]
  );

  const isCashSufficient = useMemo(() => {
    if (paymentMethod !== 'Cash') return true;
    const received = parseFloat(cashReceived) || 0;
    return received >= getTotal();
  }, [paymentMethod, cashReceived, cart, discount, tradeIn]);

  const persistParkedSales = (updated) => {
    setParkedSales(updated);
    saveParkedSales(updated);
  };

  const buildParkedSnapshot = () =>
    createParkedSnapshot({
      cart,
      customer,
      discount,
      tradeIn,
      warrantyDuration,
      paymentMethod,
      cashReceived,
    });

  // Park & Hold Sales
  const handleParkSale = () => {
    if (cart.length === 0) {
      window.showToast?.('Le panier est vide. Impossible de mettre en attente.', 'warning');
      return;
    }
    const updated = [buildParkedSnapshot(), ...parkedSales];
    persistParkedSales(updated);
    handleResetAndNewSale();
    window.showToast?.('Vente mise en attente.', 'success');
  };

  const handleRestoreParkedSale = (parked) => {
    if (cart.length > 0) {
      const updated = [
        buildParkedSnapshot(),
        ...parkedSales.filter((p) => p.id !== parked.id),
      ];
      persistParkedSales(updated);
      window.showToast?.('Vente active mise en attente, vente précédente chargée.', 'info');
    } else {
      const updated = parkedSales.filter((p) => p.id !== parked.id);
      persistParkedSales(updated);
      window.showToast?.('Vente en attente récupérée.', 'success');
    }

    setCart(parked.cart || []);
    setCustomer(parked.customer || { name: '', phone: '', email: '' });
    setDiscount(parked.discount || 0);
    setTradeIn(
      parked.tradeIn || {
        enabled: false,
        brand: '',
        model: '',
        imei: '',
        condition: 'Used',
        trade_in_value: 0,
        notes: '',
      }
    );
    setWarrantyDuration(parked.warrantyDuration || '12 mois');
    setPaymentMethod(parked.paymentMethod || 'Cash');
    setCashReceived(parked.cashReceived ?? '');
    setShowParkedDrawer(false);
    setActiveTab('cart');
  };

  const handleDeleteParkedSale = (id) => {
    const updated = parkedSales.filter((p) => p.id !== id);
    persistParkedSales(updated);
    window.showToast?.('Vente en attente supprimée', 'success');
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      console.error('Cart is empty');
      return;
    }

    setIsProcessing(true);
    try {
      const saleData = {
        customer_name: customer.name.trim() || null,
        customer_phone: customer.phone || null,
        payment_method: paymentMethod,
        discount_applied: parseFloat(discount || 0).toFixed(2),
        total_price: getTotal().toFixed(2),
        trade_in_value: tradeIn.enabled ? parseFloat(tradeIn.trade_in_value || 0).toFixed(2) : "0.00",
        warranty_duration: warrantyDuration,
        notes: '',
        items: cart.map(item => {
            const cartSubtotal = getSubtotal();
            const itemOriginalPrice = item.price * item.quantity;
            const proportion = cartSubtotal > 0 ? (itemOriginalPrice / cartSubtotal) : 0;
            const itemDiscount = parseFloat(discount || 0) * proportion;

            return {
              phone: item.phone.id,
              quantity: item.quantity,
              unit_price: item.phone.price,
              discount_applied: itemDiscount.toFixed(2)
            };
        })
      };

      if (tradeIn.enabled) {
        saleData.trade_in = {
          brand: tradeIn.brand,
          model: tradeIn.model,
          imei: tradeIn.imei,
          condition: tradeIn.condition,
          trade_in_value: parseFloat(tradeIn.trade_in_value || 0).toFixed(2),
          notes: tradeIn.notes
        };
      }
      
      const response = await salesAPI.create(saleData);

      console.log('Sale completed successfully!');
      setCreatedSale(response.data);
      setSaleComplete(true);
      setConfirmPending(false);
      window.showToast?.('Vente terminée avec succès !', 'success');
    } catch (error) {
      console.error('Failed to complete sale', error);
      const errorMessage = formatDRFError(error.response?.data) || 
                          'Échec de la vente. Veuillez vérifier le stock et les détails.';
      window.showToast?.(errorMessage, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const startCheckout = () => {
    if (cart.length === 0) return;
    if (!isCashSufficient) {
      window.showToast?.('Le montant reçu doit être supérieur ou égal au total.', 'warning');
      return;
    }
    if (isExpressSale) {
      handleCompleteSale();
    } else {
      setConfirmPending(true);
    }
  };

  const handleResetAndNewSale = () => {
    setCart([]);
    setCustomer({ name: '', phone: '', email: '' });
    setDiscount(0);
    setWarrantyDuration('12 mois');
    setTradeIn({
      enabled: false,
      brand: '',
      model: '',
      imei: '',
      condition: 'Used',
      trade_in_value: 0,
      notes: ''
    });
    setCreatedSale(null);
    setSaleComplete(false);
    setConfirmPending(false);
    setPaymentMethod('Cash');
    setCashReceived('');
    setSearchTerm('');
    setFocusedIndex(-1);
    loadAllProducts();
    setTimeout(() => {
      if (!barcodeScanner.enabled) {
        searchRef.current?.focus();
      }
    }, 50);
  };

  // Keyboard shortcut event listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const active = document.activeElement;
      const isTyping = active && (
        active.tagName.toLowerCase() === 'input' || 
        active.tagName.toLowerCase() === 'textarea' ||
        active.tagName.toLowerCase() === 'select' ||
        active.hasAttribute('contenteditable')
      );

      // F2 - New Sale
      if (e.key === 'F2') {
        e.preventDefault();
        handleResetAndNewSale();
        window.showToast?.('Nouvelle vente commencée', 'info');
        return;
      }

      // F3 - Hold / Park current sale
      if (e.key === 'F3') {
        e.preventDefault();
        if (cart.length > 0) {
          handleParkSale();
        } else if (parkedSales.length > 0) {
          setShowParkedDrawer(true);
          window.showToast?.('Ouvrez une vente en attente', 'info');
        }
        return;
      }

      // F4 - Focus Discount
      if (e.key === 'F4') {
        e.preventDefault();
        discountRef.current?.focus();
        discountRef.current?.select();
        return;
      }

      // F8 - Express encaissement or confirm + pay
      if (e.key === 'F8') {
        e.preventDefault();
        if (cart.length === 0) return;
        if (saleComplete) return;

        if (confirmPending) {
          handleCompleteSale();
        } else {
          startCheckout();
        }
        return;
      }

      // Escape - Cancel Confirm / Close Drawer / Blur inputs
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showParkedDrawer) {
          setShowParkedDrawer(false);
        } else if (confirmPending) {
          setConfirmPending(false);
        } else if (active) {
          active.blur();
        }
        return;
      }

      // 1-3 payment quick-select — only when NOT typing inside an editable field
      const isEditingField = active && (
        active.tagName.toLowerCase() === 'input' ||
        active.tagName.toLowerCase() === 'textarea' ||
        active.tagName.toLowerCase() === 'select' ||
        active.hasAttribute('contenteditable')
      );
      const canUsePaymentShortcut =
        POS_PAYMENT_SHORTCUT_KEYS.includes(e.key) && !isEditingField;

      if (canUsePaymentShortcut && PAYMENT_BY_SHORTCUT_KEY[e.key]) {
        e.preventDefault();
        e.stopPropagation();
        setPaymentMethod(PAYMENT_BY_SHORTCUT_KEY[e.key]);
        return;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [
    cart,
    confirmPending,
    saleComplete,
    createdSale,
    paymentMethod,
    discount,
    tradeIn,
    warrantyDuration,
    customer,
    parkedSales,
    cashReceived,
    isExpressSale,
    barcodeScanner.enabled,
    showParkedDrawer
  ]);

  // Product List arrow navigation keydown
  const handleSearchKeyDown = (e) => {
    if (filteredPhones.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex(prev => (prev + 1) % filteredPhones.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex(prev => (prev - 1 + filteredPhones.length) % filteredPhones.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < filteredPhones.length) {
        addToCart(filteredPhones[focusedIndex]);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    }
  };

  return (
    <div className="w-full h-full lg:h-[calc(100vh-10.5rem)] min-h-0 flex flex-col gap-4">
      {/* Page Header */}
      <div className="shrink-0">
        <PageHeader
          title="Point de Vente (POS)"
          actions={
            <Button
              variant="secondary"
              onClick={() => navigate('/sales')}
              className="font-bold text-xs"
            >
              Retour aux ventes
            </Button>
          }
        />
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden mb-4 bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${
              activeTab === 'products' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600'
            }`}
          >
            <DevicePhoneMobileIcon className="w-5 h-5" />
            Produits
          </button>
          <button
            onClick={() => setActiveTab('cart')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all relative ${
              activeTab === 'cart' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600'
            }`}
          >
            <ShoppingCartIcon className="w-5 h-5" />
            Panier
            {cart.length > 0 && (
              <span className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] border-2 border-white transition-all ${
                activeTab === 'cart' ? 'bg-white text-primary-600' : 'bg-red-500 text-white'
              }`}>
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
            {parkedSales.length > 0 && cart.length === 0 && (
              <span className="absolute top-2 left-2 min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center text-[9px] font-bold bg-amber-500 text-white border-2 border-white">
                {parkedSales.length}
              </span>
            )}
          </button>
        </div>

        {/* Split Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 h-full min-h-0">
          
          {/* LEFT PANEL: Search & Catalogue */}
          <div className={`h-full min-h-0 relative ${activeTab !== 'products' ? 'hidden lg:flex' : 'flex'} flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden`}>
            
            {/* Header controls inside Card */}
            <div className="p-4 border-b border-slate-100 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">Catalogue & Recherche</h3>
                  {parkedSales.length > 0 && (
                    <button
                      onClick={() => setShowParkedDrawer(true)}
                      className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold transition-colors shadow-sm animate-pulse"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      En attente ({parkedSales.length})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => navigate('/phones/add')}
                    variant="secondary"
                    size="sm"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    Ajouter un produit
                  </Button>
                  <Button
                    onClick={barcodeScanner.toggleScanner}
                    variant={barcodeScanner.enabled ? "primary" : "secondary"}
                    size="sm"
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5"
                  >
                    <DevicePhoneMobileIcon className="w-3.5 h-3.5" />
                    {barcodeScanner.enabled ? 'Scanner ON' : 'Scanner OFF'}
                  </Button>
                </div>
              </div>

              {/* Main Search Input */}
              <input
                ref={searchRef}
                type="text"
                placeholder="Rechercher par marque, modèle ou IMEI..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full px-4 py-2 border-2 border-slate-200 hover:border-slate-300 focus:border-primary-400 focus:ring-4 focus:ring-primary-100 rounded-xl text-sm transition-all focus:outline-none placeholder:text-slate-400 font-medium"
              />

              {/* Keyboard Barcode Scanner input box if scanner is enabled */}
              <KeyboardBarcodeScanner
                ref={barcodeScannerRef}
                enabled={barcodeScanner.enabled}
                onBarcodeScanned={barcodeScanner.onBarcodeScanned}
                preventManualTyping={false}
                placeholder="Scannez un code-barres ici..."
                className="mb-0"
              />
            </div>

            {/* Scanner Mode active banner */}
            {barcodeScanner.enabled && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  Mode Scanner Actif — Prêt à recevoir des codes-barres
                </div>
              </div>
            )}

            {/* Catalogue List Results */}
            {filteredPhones.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/30">
                <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                  {searchTerm.length >= 2 ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {searchTerm.length >= 2 ? "Aucun produit en stock trouvé" : "Recherche de produits"}
                </p>
                <p className="text-xs text-slate-500 max-w-xs mt-1">
                  {searchTerm.length >= 2
                    ? "Essayez d'ajuster votre recherche ou vérifiez l'état du stock."
                    : "Recherchez par marque, modèle, IMEI ou scannez un code-barres."}
                </p>
                {searchTerm.length >= 2 && (
                  <Button
                    onClick={() => navigate('/phones/add')}
                    variant="primary"
                    size="sm"
                    className="flex items-center gap-1.5 mt-3"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Ajouter un produit
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100 min-h-0 bg-slate-50/10">
                {filteredPhones.map((phone, idx) => (
                  <div
                    key={phone.id}
                    className={`flex items-center justify-between p-2.5 border-b border-slate-100 hover:bg-primary-50/30 cursor-pointer transition-all duration-150 ${
                      idx === focusedIndex ? 'bg-primary-50/70 border-l-4 border-l-primary-500 pl-1.5' : ''
                    }`}
                    onClick={() => addToCart(phone)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-white border border-slate-200/80 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                        {phone.image_url || phone.image ? (
                          <img
                            src={phone.image_url || phone.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DevicePhoneMobileIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-slate-800 truncate">
                            {phone.brand} {phone.model}
                          </span>
                          {phone.product_type === 'Laptop' && (
                            <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded border border-indigo-100 uppercase tracking-wider">
                              Laptop
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {phone.storage}{phone.brand?.toLowerCase() !== 'apple' && phone.ram ? ` • ${phone.ram}` : ''} • {phone.color}
                          {phone.imei && <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1 py-0.2 rounded ml-2">IMEI: {phone.imei}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <span className="font-bold text-sm text-success-600 block">
                          {phone.price.toLocaleString()} {shopSettings?.currency_symbol || 'DA'}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-tight ${
                          phone.inventory?.stock_quantity > 0 
                            ? 'bg-blue-50 text-blue-600' 
                            : 'bg-red-50 text-red-600'
                        }`}>
                          Stock: {phone.inventory?.stock_quantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sliding Drawer/Overlay for Parked Sales */}
            {showParkedDrawer && (
              <div className="absolute inset-0 bg-white z-20 flex flex-col rounded-2xl animate-in slide-in-from-left duration-250">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    <h3 className="font-extrabold text-slate-800 text-sm">Ventes en attente (Mise en attente)</h3>
                  </div>
                  <button
                    onClick={() => setShowParkedDrawer(false)}
                    className="text-slate-400 hover:text-slate-600 font-bold text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm"
                  >
                    Fermer [Esc]
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {parkedSales.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">Aucune vente en attente</p>
                  ) : (
                    parkedSales.map((parked) => {
                      const total = computeParkedTotal(parked);
                      return (
                        <div
                          key={parked.id}
                          className="border border-slate-200/80 rounded-xl p-3 hover:border-primary-300 hover:bg-primary-50/10 transition-all flex items-center justify-between shadow-sm bg-white"
                        >
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-800">
                                {parked.customer?.name || 'Client anonyme'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                                {new Date(parked.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate mt-1">
                              {parked.cart.map(item => `${item.phone.brand} ${item.phone.model} (x${item.quantity})`).join(', ')}
                            </p>
                            {parked.tradeIn?.enabled && (
                              <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-wider mt-1.5 inline-block">
                                Reprise incluse
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="font-black text-sm text-primary-600 block">
                                {total.toLocaleString()} {shopSettings?.currency_symbol || 'DA'}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {parked.cart.length} articles
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleRestoreParkedSale(parked)}
                                className="bg-primary-500 hover:bg-primary-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-colors"
                              >
                                Ouvrir
                              </button>
                              <button
                                onClick={() => handleDeleteParkedSale(parked.id)}
                                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL: Cart & Checkout Info */}
          <div className={`h-full min-h-0 flex flex-col gap-4 ${activeTab !== 'cart' ? 'hidden lg:flex' : 'flex'}`}>
            
            {/* Active Cart Section */}
            <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Panier actif</h3>
                  {cart.length > 0 && (
                    <span className="bg-primary-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {cart.length > 0 && (
                    <>
                      <button
                        onClick={handleParkSale}
                        title="Mettre en attente (F3)"
                        className="text-xs font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                      >
                        En attente <span className="text-[9px] opacity-70">[F3]</span>
                      </button>
                      <button 
                        onClick={() => setCart([])}
                        className="text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Vider
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Cart List Items */}
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200/50 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
                    <ShoppingCartIcon className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Le panier est vide</p>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    Recherchez des articles et cliquez dessus pour les ajouter.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0 divide-y divide-slate-100">
                  {cart.map((item) => (
                    <div key={item.phone.id} className="flex items-center gap-3 py-2 border-b border-slate-100">
                      <div className="w-10 h-10 bg-white border border-slate-200/80 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                        {item.phone.image_url || item.phone.image ? (
                          <img
                            src={item.phone.image_url || item.phone.image}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <DevicePhoneMobileIcon className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm text-slate-800 block truncate">
                          {item.phone.brand} {item.phone.model}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 block truncate">
                          {item.phone.storage} • {item.phone.color}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200/50">
                        <button
                          onClick={() => updateQuantity(item.phone.id, item.quantity - 1)}
                          className="w-5.5 h-5.5 rounded bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 transition-colors shadow-sm"
                        >
                          -
                        </button>
                        <span className="w-5 text-center text-xs font-black text-slate-850">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.phone.id, item.quantity + 1)}
                          className="w-5.5 h-5.5 rounded bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 transition-colors shadow-sm"
                        >
                          +
                        </button>
                      </div>
                      <div className="w-20 text-right flex-shrink-0 pl-1">
                        <span className="font-bold text-sm text-slate-900 block">
                          {(item.price * item.quantity).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block uppercase">
                          {shopSettings?.currency_symbol || 'DA'}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.phone.id)}
                        className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-all flex-shrink-0"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {!saleComplete && !confirmPending && (
                    <div className="p-2">
                      <ReceiptPreview
                        cart={cart}
                        customer={customer}
                        discount={discount}
                        tradeIn={tradeIn}
                        paymentMethod={paymentMethod}
                        cashReceived={cashReceived}
                        warrantyDuration={warrantyDuration}
                        shopSettings={shopSettings}
                        getSubtotal={getSubtotal}
                        getTotal={getTotal}
                        changeDue={changeDue}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Running Totals inside Cart Card */}
              {cart.length > 0 && (
                <div className="mt-auto pt-3 border-t border-slate-100 space-y-2 shrink-0">
                  <div className="flex justify-between text-xs text-slate-600 font-bold">
                    <span>Sous-total:</span>
                    <span className="text-slate-900 font-extrabold">{getSubtotal().toLocaleString()} {shopSettings?.currency_symbol || 'DA'}</span>
                  </div>
                  {parseFloat(discount || 0) > 0 && (
                    <div className="flex justify-between text-xs text-red-600 font-bold">
                      <span>Remise:</span>
                      <span className="font-extrabold">-{parseFloat(discount).toLocaleString()} {shopSettings?.currency_symbol || 'DA'}</span>
                    </div>
                  )}
                  
                  {/* Trade-in deduction line */}
                  {tradeIn.enabled && parseFloat(tradeIn.trade_in_value || 0) > 0 && (
                    <div className="flex justify-between text-xs text-orange-600 font-bold">
                      <span>Reprise (trade-in):</span>
                      <span className="font-extrabold">-{parseFloat(tradeIn.trade_in_value).toLocaleString()} {shopSettings?.currency_symbol || 'DA'}</span>
                    </div>
                  )}

                  {/* Net Total Display */}
                  <div className="flex justify-between items-center py-2.5 border-y border-dashed border-slate-200 mt-1">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-wide">Total Net</span>
                    <span className="text-xl font-black text-primary-600">
                      {getTotal().toLocaleString()} {shopSettings?.currency_symbol || 'DA'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Customer Details Card (Compact) */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white shrink-0 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-5 h-5 rounded bg-primary-50 text-primary-600 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Informations Client</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Nom complet</label>
                  <input
                    type="text"
                    placeholder="Ahmed Ben..."
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Téléphone</label>
                  <input
                    type="text"
                    placeholder="0555..."
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Accordion for Trade-in Device */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setTradeIn(prev => ({ ...prev, enabled: !prev.enabled }))}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-black text-[10px] border border-orange-200">
                    R
                  </span>
                  <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Reprise d'appareil (Trade-in)</span>
                </div>
                <div className="flex items-center gap-2">
                  {tradeIn.enabled && (
                    <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                      -{tradeIn.trade_in_value.toLocaleString()} DA
                    </span>
                  )}
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${tradeIn.enabled ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {tradeIn.enabled && (
                <div className="p-3 border-t border-slate-200 bg-white space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase">Marque</label>
                      <input
                        type="text"
                        placeholder="ex: Apple"
                        value={tradeIn.brand}
                        onChange={(e) => setTradeIn({ ...tradeIn, brand: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase">Modèle</label>
                      <input
                        type="text"
                        placeholder="ex: iPhone 12"
                        value={tradeIn.model}
                        onChange={(e) => setTradeIn({ ...tradeIn, model: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase">IMEI (15 chiffres)</label>
                    <input
                      type="text"
                      placeholder="IMEI"
                      value={tradeIn.imei}
                      onChange={(e) => setTradeIn({ ...tradeIn, imei: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase">État</label>
                      <select
                        value={tradeIn.condition}
                        onChange={(e) => setTradeIn({ ...tradeIn, condition: e.target.value })}
                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="New">Neuf</option>
                        <option value="Refurbished">Remis à neuf</option>
                        <option value="Used">Occasion</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-black text-slate-500 uppercase">Valeur reprise (DA)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={tradeIn.trade_in_value || ''}
                        onChange={(e) => setTradeIn({ ...tradeIn, trade_in_value: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-primary-500 focus:outline-none text-right"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Validation & Payment Area - State Controller */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white mt-auto shrink-0 shadow-sm">
              
              {/* STATE 1: Success State */}
              {saleComplete ? (
                <div className="bg-success-950/40 border border-success-800/60 rounded-xl p-3 shadow-inner animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-5 h-5 rounded-full bg-success-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 animate-bounce">
                      ✓
                    </div>
                    <span className="font-extrabold text-xs text-success-500 uppercase tracking-wider">Vente Terminée !</span>
                  </div>
                  <div className="text-xs text-slate-300 mb-3 bg-white/5 p-2 rounded-lg border border-slate-200/10 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">N° Facture:</span>
                      <span className="font-black text-slate-800 dark:text-white">
                        {createdSale?.invoice_number || '---'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-semibold">Mode Paiement:</span>
                      <span className="font-bold text-slate-800 dark:text-white">
                        {createdSale?.payment_method || paymentMethod}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handlePrintReceipt(createdSale)}
                      className="bg-slate-900 hover:bg-slate-850 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm border border-slate-800"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Imprimer Facture A4
                    </button>
                    <button
                      onClick={handlePrintWarranty}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Bon de Garantie
                    </button>
                    <button
                      onClick={handleResetAndNewSale}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold py-2 px-3 rounded-lg text-xs transition-all mt-1"
                    >
                      [F2] Nouvelle Vente
                    </button>
                  </div>
                </div>
              ) : confirmPending ? (

                /* STATE 2: Inline Confirmation Panel */
                <div className="bg-slate-900 text-white rounded-xl p-3 shadow-lg animate-in fade-in slide-in-from-bottom-1 duration-200">
                  <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-1.5">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-primary-400">Confirmer la Vente</h3>
                    <button 
                      onClick={() => setConfirmPending(false)}
                      className="text-slate-400 hover:text-white font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="space-y-2 text-[11px] text-slate-350 mb-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Client:</span>
                      <span className="font-bold text-white">{customer.name || 'Client anonyme'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paiement:</span>
                      <span className="font-bold text-white">{paymentMethod}</span>
                    </div>
                    {paymentMethod === 'Cash' && cashReceived && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Reçu:</span>
                          <span className="font-bold text-white">{(parseFloat(cashReceived) || 0).toLocaleString()} DA</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Monnaie à rendre:</span>
                          <span className="font-bold text-success-400">{changeDue.toLocaleString()} DA</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 text-xs">
                      <span className="font-bold text-slate-400 uppercase tracking-wide">Net à payer:</span>
                      <span className="font-black text-white text-sm">{getTotal().toLocaleString()} DA</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setConfirmPending(false)}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-3 rounded-lg text-[11px] transition-colors"
                    >
                      [Esc] Annuler
                    </button>
                    <button
                      onClick={handleCompleteSale}
                      disabled={isProcessing}
                      className="bg-primary-500 hover:bg-primary-600 disabled:bg-slate-750 text-white font-extrabold py-2 px-3 rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1"
                    >
                      {isProcessing ? (
                        <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                      ) : (
                        <span>[F8] Confirmer</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (

                /* STATE 3: Standard Payment Action Box */
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* Payment Method Quick-Select */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wide">Mode de Paiement</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { id: 'Cash', label: 'Espèces', key: '1' },
                        { id: 'Card', label: 'Carte', key: '2' },
                        { id: 'Split', label: 'Split', key: '3' },
                      ].map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          className={`py-2 px-1 rounded-xl font-extrabold text-xs border text-center transition-all duration-200 ${
                            paymentMethod === method.id
                              ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/10 scale-105'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="opacity-60">[{method.key}]</span> {method.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cash Received calculation widget */}
                  {paymentMethod === 'Cash' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100 animate-in slide-in-from-top-1 duration-150">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-black text-slate-500 uppercase">Espèces reçues (DA)</label>
                          <input
                            type="number"
                            placeholder="0.00"
                            value={cashReceived}
                            onChange={(e) => setCashReceived(e.target.value)}
                            className="w-full px-3 py-1 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                          />
                        </div>
                        <div className="flex flex-col justify-center pl-2">
                          <span className="text-[9px] font-black text-slate-500 uppercase">Monnaie à rendre</span>
                          <span className="text-base font-black text-success-600 truncate">
                            {changeDue.toLocaleString()} {shopSettings?.currency_symbol || 'DA'}
                          </span>
                        </div>
                      </div>
                      {!isCashSufficient && (
                        <p className="text-[10px] font-bold text-red-500 text-center">
                          Le montant reçu doit être supérieur ou égal au total ({getTotal().toLocaleString()} {shopSettings?.currency_symbol || 'DA'})
                        </p>
                      )}
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-100">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Remise (DA)</label>
                        <input
                          ref={discountRef}
                          type="number"
                          min="0"
                          placeholder="0"
                          value={discount || ''}
                          onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                          className="w-24 text-center font-extrabold text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Bottom Warranty Duration & Confirm Button Row */}
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-black text-slate-500 mb-1 uppercase tracking-wide">Garantie</label>
                      <input
                        type="text"
                        value={warrantyDuration}
                        onChange={(e) => setWarrantyDuration(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                        placeholder="12 mois"
                      />
                    </div>
                    <div className="col-span-2">
                      <button
                        onClick={startCheckout}
                        disabled={cart.length === 0 || isProcessing || !isCashSufficient}
                        className={`w-full py-2 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1 ${
                          isExpressSale
                            ? 'bg-success-600 hover:bg-success-700 shadow-success-600/20'
                            : 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/10'
                        }`}
                      >
                        {isProcessing ? (
                          <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : isExpressSale ? (
                          <span>[F8] Encaisser — vente rapide</span>
                        ) : (
                          <>
                            <span>[F8] Finaliser la Vente</span>
                            <ArrowRightIcon className="w-4 h-4" />
                          </>
                        )}
                      </button>
                      {isExpressSale && (
                        <p className="text-[10px] text-success-700 font-semibold text-center mt-1.5">
                          1 article · espèces · F8 encaisse sans confirmation
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Hidden container for printing to ensure Electron's print preview works */}
      <div style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', left: '-1000px', top: '-1000px' }}>
        <PrintableInvoice 
          ref={invoiceRef} 
          sale={createdSale} 
          shopSettings={shopSettings?.data || shopSettings} 
        />
        <PrintableWarranty
          ref={warrantyRef}
          sale={createdSale}
          shopSettings={shopSettings?.data || shopSettings}
        />
      </div>
    </div>
  );
};

export default POS;
