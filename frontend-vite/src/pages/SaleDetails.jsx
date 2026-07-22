import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Spinner } from '../components/common/Spinner';
import { Modal } from '../components/common/Modal';
import { PageHeader } from '../components/layout/PageHeader';
import { salesAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';
import PrintableInvoice from '../components/PrintableInvoice';
import PrintableWarranty from '../components/PrintableWarranty';
import ReturnSaleModal from './ReturnSaleModal';
import { useToast } from '../context/ToastContext';


import { 
  PrinterIcon, 
  ArrowPathIcon, 
  PencilSquareIcon,
  ShieldCheckIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  BanknotesIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const paymentMethodLabels = {
  'Cash': 'Espèces',
  'Card': 'Carte',
  'Split': 'Split',
  'Check': 'Chèque',
  'Mobile Wallet': 'Paiement Mobile',
  'Other': 'Autre'
};

const paymentStatusLabels = {
  'PAID': 'Payé',
  'PARTIAL': 'Partiel',
  'UNPAID': 'Impayé'
};

const paymentStatusColors = {
  'PAID': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'PARTIAL': 'bg-amber-100 text-amber-700 border-amber-200',
  'UNPAID': 'bg-red-100 text-red-700 border-red-200'
};

const getStatusDisplay = (sale) => {
  if (sale.returns && sale.returns.length > 0) {
    return {
      label: 'Remboursée',
      class: 'bg-slate-100 text-slate-700 border-slate-200'
    };
  }
  return {
    label: paymentStatusLabels[sale.payment_status] || sale.payment_status || 'Payé',
    class: paymentStatusColors[sale.payment_status] || 'bg-emerald-100 text-emerald-700 border-emerald-200'
  };
};

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: shopSettings } = useShopSettings();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const invoiceRef = useRef(null);
  const warrantyRef = useRef(null);

  const handlePrintInvoice = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: sale ? `Facture_${sale.invoice_number}` : 'Facture',
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

  const handlePrintWarranty = async () => {
    // Check for custom warranty PDF first if in Electron
    if (window.electron?.warranty) {
      try {
        const hasCustom = await window.electron.warranty.checkCustom();
        if (hasCustom) {
          window.focus();
          await window.electron.print({ filePath: 'custom_warranty.pdf', preview: true });
          window.focus();
          return;
        }
      } catch (error) {
        console.error("Custom warranty check failed:", error);
      }
    }
    // Fallback to default React component printing
    triggerPrintWarranty();
  };

  const triggerPrintWarranty = useReactToPrint({
    contentRef: warrantyRef,
    documentTitle: sale ? `Garantie_${sale.invoice_number}` : 'Garantie',
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

  const loadSale = useCallback(async (saleId) => {
    try {
      setLoading(true);
      const response = await salesAPI.get(saleId);
      setSale(response.data);
    } catch (error) {
      console.error('Error loading sale:', error);
      // Handle error - maybe redirect to sales list
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (id) {
      const saleId = parseInt(id, 10);
      if (!isNaN(saleId)) {
        loadSale(saleId);
      } else {
        // Invalid ID, redirect to sales list
        navigate('/sales');
      }
    }
  }, [id, loadSale, navigate]);

  const handleRefund = async () => {
    if (!sale) return;

    try {
      setRefunding(true);
      // Note: This would need a refund endpoint in the backend
      // For now, we'll show a message
      showToast('La fonctionnalité de remboursement sera implémentée lorsque le point de terminaison du backend sera disponible.', 'info');
      setShowRefundModal(false);
    } catch (error) {
      console.error('Error processing refund:', error);
      showToast('Erreur lors du traitement du remboursement. Veuillez réessayer.', 'error');
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">Vente non trouvée</p>
        <Button onClick={() => navigate('/sales')}>Retour aux ventes</Button>
      </div>
    );
  }

  const items = sale.items && sale.items.length > 0 
    ? sale.items 
    : (sale.phone_details || sale.product_name_at_sale) ? [{
        phone_details: sale.phone_details,
        product_name_at_sale: sale.product_name_at_sale,
        quantity: sale.quantity,
        unit_price: sale.phone_details ? sale.phone_details.price : (sale.total_price / (sale.quantity || 1)),
        total_price: (parseFloat(sale.total_price || 0)).toFixed(2)
      }] : [];

  const subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
  const discount = parseFloat(sale.discount_applied || 0);

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <div>
        <PageHeader
          title={`Détails de la vente - ${sale.invoice_number || 'N/A'}`}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/sales')} 
                size="sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Retour
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/sales/${id}/edit`)} 
                size="sm"
                className="hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200"
              >
                <PencilSquareIcon className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button variant="outline" onClick={handlePrintInvoice} size="sm">
                <PrinterIcon className="w-4 h-4 mr-2" />
                Facture
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white border-transparent" 
                onClick={handlePrintWarranty} 
                size="sm"
              >
                <ShieldCheckIcon className="w-4 h-4 mr-2" />
                Garantie
              </Button>
              <Button variant="danger" onClick={() => setShowRefundModal(true)} size="sm">
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Rembourser
              </Button>
            </div>
          }
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-700">
            <span className="text-primary-500 mr-1.5 font-black">#</span>
            {sale.invoice_number || 'N/A'}
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm text-xs font-bold text-slate-500">
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {new Date(sale.sale_date).toLocaleString('fr-FR', {
               day: '2-digit',
               month: '2-digit',
               year: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {/* Invoice Preview (Unified Template) */}
        <div className="lg:col-span-2 xl:col-span-3">
          <div className="bg-slate-200 p-4 sm:p-6 rounded-2xl shadow-inner overflow-hidden flex justify-center">
            <div className="w-full max-w-[800px] overflow-auto custom-scrollbar-horizontal pb-4">
              <div className="inline-block min-w-full origin-top transform scale-[0.6] xs:scale-[0.7] sm:scale-[0.8] md:scale-95 lg:scale-100 transition-transform duration-500 shadow-2xl bg-white rounded-sm">
                <PrintableInvoice 
                  sale={sale} 
                  shopSettings={shopSettings?.data || shopSettings} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info & Actions Sidebar */}
        <div className="space-y-4 lg:space-y-6">
          <Card className="p-4 sm:p-5 border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            
            <h3 className="text-base sm:text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-primary-500 rounded-full" />
              Paiement & Statut
            </h3>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">État du paiement</span>
                {(() => {
                  const status = getStatusDisplay(sale);
                  return (
                    <div className={`inline-flex items-center self-start px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-black uppercase tracking-wider ${status.class}`}>
                      <div className={`w-1.5 h-1.5 rounded-full mr-2 ${
                        sale.payment_status === 'PAID' ? 'bg-emerald-500' : 
                        sale.payment_status === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-500'
                      }`} />
                      {status.label}
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mode</span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-700">
                    <BanknotesIcon className="w-4 h-4 text-slate-400" />
                    {paymentMethodLabels[sale.payment_method] || sale.payment_method}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Garantie</span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-blue-600">
                    <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
                    {sale.warranty_duration || '12 mois'}
                  </div>
                </div>
              </div>

              {sale.payment_status === 'PARTIAL' && (
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Avance</span>
                    <span className="text-xs font-black text-amber-900">{parseFloat(sale.amount_paid || 0).toLocaleString()} DA</span>
                  </div>
                  <div className="w-full h-1.5 bg-amber-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-1000"
                      style={{ width: `${(parseFloat(sale.amount_paid || 0) / parseFloat(sale.total_price || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {sale.payment_status === 'PARTIAL' ? 'Reste à payer' : 'Montant Total'}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
                      {sale.payment_status === 'PARTIAL' 
                        ? (parseFloat(sale.total_price || 0) - parseFloat(sale.amount_paid || 0)).toLocaleString()
                        : parseFloat(sale.total_price || 0).toLocaleString()
                      }
                    </span>
                    <span className="text-sm font-bold text-primary-500">DA</span>
                  </div>
                </div>
              </div>
            </div>
            {sale.notes && (
              <div className="mt-4 pt-4 border-t">
                <span className="text-xs font-bold text-slate-400 uppercase">Notes</span>
                <p className="text-sm text-slate-600 mt-1 italic">{sale.notes}</p>
              </div>
            )}
          </Card>

          {sale.returns && sale.returns.length > 0 && (
            <Card className="p-[var(--spacing-md)] border-red-100 bg-red-50/30">
              <h3 className="text-lg font-semibold text-red-900 mb-4">Retours</h3>
              <div className="space-y-4">
                {sale.returns.map((ret, index) => (
                  <div key={index} className="text-sm border-b border-red-100 pb-2 last:border-0">
                    <p className="font-bold text-red-800">{ret.phone_details?.brand} {ret.phone_details?.model}</p>
                    <div className="flex justify-between mt-1 text-xs">
                      <span>{ret.quantity} unité(s)</span>
                      <span className="text-red-600 font-bold">-{parseFloat(ret.refund_amount).toLocaleString()} DA</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4 sm:p-[var(--spacing-md)]">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Actions</h3>
            <div className="space-y-2 sm:space-y-3">
              <Button
                onClick={handlePrintInvoice}
                size="sm"
                className="w-full bg-slate-900 hover:bg-black text-white h-10 sm:h-11"
                icon={<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>}
              >
                Imprimer Facture
              </Button>
              <Button
                onClick={handlePrintWarranty}
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 sm:h-11"
                icon={<svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
              >
                Bon de Garantie
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRefundModal(true)}
                className="w-full border-red-500 text-red-600 hover:bg-red-50 h-10 sm:h-11"
              >
                Rembourser
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Return Sale Modal */}
      <ReturnSaleModal
        isOpen={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        sale={sale}
        onSuccess={() => {
          setShowRefundModal(false);
          loadSale(id);
        }}
      />

      {/* Hidden container for printing to ensure Electron's print preview works */}
      <div style={{ position: 'fixed', opacity: 0, pointerEvents: 'none', left: '-1000px', top: '-1000px' }}>
        <PrintableInvoice 
          ref={invoiceRef} 
          sale={sale} 
          shopSettings={shopSettings?.data || shopSettings} 
        />
        <PrintableWarranty
          ref={warrantyRef}
          sale={sale}
          shopSettings={shopSettings?.data || shopSettings}
        />
      </div>
    </div>
  );
};

export default SaleDetails;

