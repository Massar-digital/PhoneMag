import React, { useState } from 'react';
import { Modal } from '../components/common/Modal';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { returnsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const ReturnSaleModal = ({ isOpen, onClose, sale, onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    // Reason is optional; proceed even if empty

    setLoading(true);
    try {
      // Prepare payload for the new ProductReturn architecture (Header/Items)
      const payload = {
        sale: sale.id,
        // Include reason only if provided
        ...(reason && { reason }),
        items: []
      };

      // Apportion global discount across items for refund
      let totalItemsPrice = 0;
      if (sale.items && sale.items.length > 0) {
        totalItemsPrice = sale.items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
      } else if (sale.phone) {
        totalItemsPrice = parseFloat(sale.total_price || 0) + parseFloat(sale.discount_applied || 0); // rough estimate if legacy
      }
      
      const globalDiscount = parseFloat(sale.discount_applied || 0);

      if (sale.items && sale.items.length > 0) {
        // Multi-item sale
        payload.items = sale.items.map(item => {
          const itemTotal = parseFloat(item.total_price || 0);
          // Calculate proportional discount for this item
          const proportion = totalItemsPrice > 0 ? (itemTotal / totalItemsPrice) : 0;
          const itemDiscount = globalDiscount * proportion;
          const refundAmount = itemTotal - itemDiscount;
          
          return {
            sale_item: item.id,
            product: (item.phone && typeof item.phone === 'object') ? item.phone.id : (item.phone_id || item.phone),
            quantity: item.quantity,
            refund_amount: refundAmount
          };
        });
      } else if (sale.phone) {
        // Legacy single-item sale
        payload.items = [{
          sale_item: null,
          product: (sale.phone && typeof sale.phone === 'object') ? sale.phone.id : (sale.phone_id || sale.phone),
          quantity: sale.quantity || 1,
          refund_amount: parseFloat(sale.total_price || 0) // for single item, total_price is already the net paid
        }];
      }

      // Single API call for the entire return
      await returnsAPI.create(payload);
      
      showToast('Remboursement et retour de stock effectués avec succès.', 'success');
      onSuccess();
    } catch (error) {
      console.error('Error processing refund API Data:', error.response?.data);
      console.error('Full error:', error);
      const errorMsg = error.response?.data?.error || 
                       (error.response?.data?.details ? JSON.stringify(error.response.data.details) : null) ||
                       (error.response?.data?.items ? JSON.stringify(error.response.data.items) : null) ||
                       error.response?.data?.non_field_errors?.join(', ') ||
                       error.response?.data?.detail || 
                       'Erreur lors du traitement du remboursement.';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      header={`Remboursement Total - Facture #${sale?.invoice_number}`}
      size="md"
      body={
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-700 font-medium text-center">
              Cette action va annuler la vente, rembourser le montant total de <span className="font-bold">{parseFloat(sale?.total_price || 0).toLocaleString()} DA</span> et remettre tous les articles en stock.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="refund-reason" className="block text-sm font-semibold text-slate-700">
              Motif du remboursement
            </label>
            <textarea
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 min-h-[100px] resize-none transition-all"
              placeholder="Ex: Client a changé d'avis, Article défectueux..."
              autoFocus
              disabled={loading}
            />
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 w-full">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button variant="danger" onClick={handleSubmit} loading={loading}>
            Confirmer le remboursement
          </Button>
        </div>
      }
    />
  );
};

export default ReturnSaleModal;

