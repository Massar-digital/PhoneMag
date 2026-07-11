import React from 'react';

const ReceiptPreview = ({ cart, customer, discount, tradeIn, paymentMethod, cashReceived, warrantyDuration, shopSettings, getSubtotal, getTotal, changeDue }) => {
  if (!cart || cart.length === 0) return null;

  const shopData = shopSettings?.data || shopSettings;
  const currency = shopData?.currency_symbol || 'DA';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
      <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">Aperçu du reçu</span>
      </div>

      <div className="p-3 space-y-2 text-[11px] font-medium text-slate-700">
        {/* Shop Header */}
        <div className="text-center pb-2 border-b border-dashed border-slate-200">
          <div className="font-black text-sm text-slate-900 uppercase">{shopData?.name || 'PHONE MAGASINE'}</div>
          <div className="text-[9px] text-slate-500 mt-0.5">{shopData?.address_line_1 || ''}</div>
        </div>

        {/* Customer & Meta */}
        <div className="flex justify-between text-[10px] text-slate-600">
          <span><span className="font-bold">Client:</span> {customer.name || 'Client de passage'}</span>
          <span><span className="font-bold">Garantie:</span> {warrantyDuration}</span>
        </div>
        {customer.phone && (
          <div className="text-[10px] text-slate-600"><span className="font-bold">Tél:</span> {customer.phone}</div>
        )}

        {/* Items Table */}
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[9px] font-black text-slate-500 uppercase">
              <th className="text-left py-1 pr-1">Article</th>
              <th className="text-center py-1 px-1 w-8">Qte</th>
              <th className="text-right py-1 px-1 w-16">P.U</th>
              <th className="text-right py-1 pl-1 w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={item.phone.id} className="border-b border-slate-100">
                <td className="py-1 pr-1 truncate max-w-[130px]">
                  <span className="font-bold text-slate-800">{item.phone.brand} {item.phone.model}</span>
                  <span className="text-slate-400 ml-1">{item.phone.storage} • {item.phone.color}</span>
                </td>
                <td className="text-center py-1 px-1 font-bold">{item.quantity}</td>
                <td className="text-right py-1 px-1 font-semibold">{Number(item.price).toLocaleString()}</td>
                <td className="text-right py-1 pl-1 font-bold text-slate-800">{(item.price * item.quantity).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t border-slate-200 pt-2 space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Sous-total</span>
            <span>{getSubtotal().toLocaleString()} {currency}</span>
          </div>
          {parseFloat(discount || 0) > 0 && (
            <div className="flex justify-between text-red-500">
              <span>Remise</span>
              <span>-{parseFloat(discount).toLocaleString()} {currency}</span>
            </div>
          )}
          {tradeIn?.enabled && parseFloat(tradeIn.trade_in_value || 0) > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Reprise</span>
              <span>-{parseFloat(tradeIn.trade_in_value).toLocaleString()} {currency}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black text-primary-600 border-t border-dashed border-slate-200 pt-1.5 mt-1">
            <span>Net à payer</span>
            <span>{getTotal().toLocaleString()} {currency}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="border-t border-dashed border-slate-200 pt-2 space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="font-bold text-slate-500">Paiement</span>
            <span className="font-bold text-slate-800">{paymentMethod === 'Cash' ? 'Espèces' : paymentMethod === 'Card' ? 'Carte' : 'Split'}</span>
          </div>
          {paymentMethod === 'Cash' && parseFloat(cashReceived || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Reçu</span>
              <span className="font-semibold text-slate-800">{parseFloat(cashReceived).toLocaleString()} {currency}</span>
            </div>
          )}
          {paymentMethod === 'Cash' && parseFloat(cashReceived || 0) > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-500">Monnaie</span>
              <span className="font-bold text-success-600">{changeDue.toLocaleString()} {currency}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceiptPreview;
