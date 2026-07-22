import React from 'react';

/**
 * PrintableInvoice component - Professional "Bon de Livraison" style invoice
 * Based on X PHONE template design
 */
const PrintableInvoice = React.forwardRef(({ sale, shopSettings }, ref) => {
  if (!sale) return <div ref={ref}></div>;

  // Extract shop settings properly
  const shopData = shopSettings?.data || shopSettings;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const items = sale.items && sale.items.length > 0
    ? sale.items
    : (sale.phone_details || sale.product_name_at_sale) ? [{
        phone_details: sale.phone_details,
        product_name_at_sale: sale.product_name_at_sale,
        quantity: sale.quantity || 1,
        unit_price: sale.unit_price || (sale.phone_details ? sale.phone_details.price : 0),
        total_price: parseFloat(sale.total_price || 0)
      }] : [];

  const totalRefunded = sale.returns && sale.returns.length > 0
    ? sale.returns.reduce((acc, ret) => acc + (ret.items ? ret.items.reduce((iAcc, item) => iAcc + parseFloat(item.refund_amount || 0), 0) : 0), 0)
    : 0;

  const isRefunded = totalRefunded > 0;

  // Calculate totals
  const totalTTC = items.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * (item.quantity || 1)), 0);
  const itemDiscounts = items.reduce((sum, item) => sum + parseFloat(item.discount_applied || item.discount || 0), 0);
  const globalDiscount = parseFloat(sale.discount_amount || sale.discount_applied || 0);
  const totalRemises = globalDiscount + itemDiscounts;
  const netBeforeRefund = parseFloat(sale.final_amount || sale.total_price || 0);
  const netAPayer = netBeforeRefund - totalRefunded;
  const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Convert number to French words (simplified)
  const numberToFrenchWords = (num) => {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
    
    if (num === 0) return 'zéro';
    if (num >= 1000000) return `${numberToFrenchWords(Math.floor(num / 1000000))} million${Math.floor(num / 1000000) > 1 ? 's' : ''} ${numberToFrenchWords(num % 1000000)}`.trim();
    if (num >= 1000) return `${numberToFrenchWords(Math.floor(num / 1000))} mille ${numberToFrenchWords(num % 1000)}`.trim();
    if (num >= 100) return `${units[Math.floor(num / 100)]} cent${Math.floor(num / 100) > 1 && num % 100 === 0 ? 's' : ''} ${numberToFrenchWords(num % 100)}`.trim();
    if (num >= 20) {
      const t = Math.floor(num / 10);
      const u = num % 10;
      if (t === 7 || t === 9) return `${tens[t - 1]}${u === 1 && t !== 9 ? ' et ' : '-'}${teens[u]}`;
      return `${tens[t]}${u === 1 && t < 8 ? ' et ' : u > 0 ? '-' : ''}${units[u]}`.trim();
    }
    if (num >= 10) return teens[num - 10];
    return units[num];
  };

  const amountInWords = `${numberToFrenchWords(Math.floor(netAPayer))} dinars algériens`;

  const paymentMethods = {
    'Cash': 'ESPECE',
    'Card': 'CARTE',
    'Split': 'SPLIT',
    'Check': 'CHEQUE',
    'Mobile Wallet': 'MOBILE',
    'Other': 'AUTRE'
  };

  return (
    <div ref={ref} className="printable-invoice" style={{
      backgroundColor: 'white',
      width: '210mm',
      minHeight: '297mm',
      height: '297mm',
      margin: '0 auto',
      padding: '10mm',
      fontFamily: '"Helvetica Neue", Helvetica, Arial, "DejaVu Sans", "Liberation Sans", sans-serif',
      fontSize: '11px',
      color: 'black',
      boxSizing: 'border-box',
      position: 'relative',
    }}>
      <style type="text/css">
        {`
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .printable-invoice { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; padding: 10mm !important; }
            .printable-invoice { font-family: "Helvetica Neue", Helvetica, Arial, "DejaVu Sans", "Liberation Sans", sans-serif !important; font-size: 11px !important; color: #000 !important; }
            .printable-invoice table { border-collapse: collapse !important; }
            .printable-invoice .invoice-items-table th,
            .printable-invoice .invoice-items-table td { border: 1px solid black !important; }
            .printable-invoice .invoice-items-table th { padding: 8px !important; }
            .printable-invoice .invoice-items-table td { padding: 6px !important; }
            .printable-invoice .invoice-items-table th:nth-child(1),
            .printable-invoice .invoice-items-table td:nth-child(1) { text-align: center !important; }
            .printable-invoice .invoice-items-table th:nth-child(2),
            .printable-invoice .invoice-items-table td:nth-child(2) { text-align: left !important; }
            .printable-invoice .invoice-items-table th:nth-child(3),
            .printable-invoice .invoice-items-table td:nth-child(3) { text-align: center !important; }
            .printable-invoice .invoice-items-table th:nth-child(4),
            .printable-invoice .invoice-items-table td:nth-child(4),
            .printable-invoice .invoice-items-table th:nth-child(5),
            .printable-invoice .invoice-items-table td:nth-child(5) { text-align: right !important; }
            .printable-invoice .invoice-totals-table td { border: 1px solid black !important; padding: 5px !important; text-align: right !important; }
          }
          * { box-sizing: border-box; }
        `}
      </style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
        {/* Left: Shop Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: '900', color: 'black', marginBottom: '2px', textTransform: 'uppercase' }}>
            {shopData?.name || 'PHONE MAGASINE'}
          </div>
          <div style={{ fontSize: '10px', lineHeight: '1.4', fontWeight: 'bold' }}>
            VENTE & REPARATION TELEPHONE<br/>
            {shopData?.address_line_1 || 'ALGERIE'}<br/>
            {shopData?.phone || ''}
            {shopData?.instagram_handle && (
              <>
                <br/>
                Instagram: <strong>{shopData.instagram_handle}</strong>
              </>
            )}
          </div>
        </div>
        
        {/* Right: Logo (only if exists) */}
        {shopData?.logo && (
          <div className="aspect-ratio-box aspect-ratio-1-1" style={{ width: '5rem', height: '5rem' }}>
            <img 
              src={shopData.logo} 
              alt="Logo" 
              style={{ 
                objectFit: 'contain' 
              }} 
            />
          </div>
        )}
      </div>

      {/* Invoice Title Bar */}
      <div style={{ 
        display: 'flex', 
        borderTop: '2px solid black', 
        borderBottom: '1px solid black',
        padding: '8px 0',
        marginBottom: '10px'
      }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
            {isRefunded ? 'BON DE REMBOURSEMENT' : 'BON DE LIVRAISON'} N°:{sale.invoice_number?.replace('INV-', '') || 'N/A'}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            Mode de paiement: <strong>{paymentMethods[sale.payment_method] || sale.payment_method}</strong>
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            Garantie: <strong>{sale.warranty_duration || '12 mois'}</strong>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: '10px' }}>Doit:</div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline' }}>VENTE-COMPTOIR</div>
          <div style={{ fontSize: '9px', marginTop: '2px' }}>Adresse:</div>
        </div>
        <div style={{ flex: 1, borderLeft: '1px solid black', paddingLeft: '10px', fontSize: '9px', lineHeight: '1.5' }}>
          <div>N.I.N:</div>
          <div>N.R.C:</div>
          <div>N.T.F:</div>
          <div>N.I.S:</div>
          <div>N.A.I:</div>
        </div>
      </div>

      {/* Client Info */}
      <div style={{ marginBottom: '10px', padding: '5px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
        <div><strong>Client:</strong> {sale.customer_name || 'Client de passage'}</div>
        <div><strong>Date:</strong> {formatDate(sale.sale_date)}</div>
        {sale.customer_phone && <span><strong>Tél:</strong> {sale.customer_phone}</span>}
      </div>

      {/* Items Table */}
      <table className="invoice-items-table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f0f0f0' }}>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '40px' }}>N°</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'left' }}>DESIGNATION</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'center', width: '50px' }}>QTE</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'right', width: '120px' }}>Prix Unitaire</th>
            <th style={{ border: '1px solid black', padding: '8px', textAlign: 'right', width: '120px' }}>Montant</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const unitPrice = parseFloat(item.unit_price);
            const qty = item.quantity;
            const montant = unitPrice * qty;
            const designation = item.phone_details 
              ? `${item.phone_details.brand} ${item.phone_details.model}${item.phone_details.IMEI ? ' - IMEI: ' + item.phone_details.IMEI : ''}`
              : item.product_name_at_sale || item.accessory_details?.name || 'Article';

            return (
              <tr key={index}>
                <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{index + 1}</td>
                <td style={{ border: '1px solid black', padding: '6px', textAlign: 'left' }}>{designation}</td>
                <td style={{ border: '1px solid black', padding: '6px', textAlign: 'center' }}>{qty}</td>
                <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>{unitPrice.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA</td>
                <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>{montant.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        {/* Left: Product count */}
        <div style={{ fontSize: '11px' }}>
          <strong>Nombre de produit: {items.length}, total quantité: {totalQuantity}</strong>
        </div>

        {/* Right: Totals box */}
        <div style={{ width: '250px' }}>
          <table className="invoice-totals-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>Total TTC</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right', width: '100px' }}>{totalTTC.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>Total Remises</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right', color: totalRemises > 0 ? 'red' : 'black' }}>{totalRemises.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
              </tr>
              {isRefunded && (
                <tr>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>Déjà Remboursé</td>
                  <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right', color: 'red' }}>-{totalRefunded.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
                </tr>
              )}
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>{isRefunded ? 'Net Restant' : 'Total TTC'}</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>{netAPayer.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Stamp area */}
        <div style={{ 
          width: '120px', 
          height: '80px', 
          border: '2px solid black', 
          borderRadius: '5px', 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '10px',
          textAlign: 'center'
        }}>
          <div>TTC le {formatDate(sale.sale_date)}</div>
          <div style={{ marginTop: '10px', fontWeight: 'bold' }}>NET A PAYER</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{netAPayer.toLocaleString('fr-FR')} DA</div>
        </div>
      </div>

      {/* Amount in words */}
      <div style={{ 
        borderTop: '1px solid black', 
        paddingTop: '10px', 
        marginBottom: '30px',
        fontSize: '11px'
      }}>
        Arrêté le présent bon de livraison à la somme de: <strong>{amountInWords}</strong>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px' }}>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '40px' }}>Cachet & Signature</div>
          <div style={{ borderTop: '1px solid black' }}></div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        position: 'absolute', 
        bottom: '10mm', 
        left: '10mm', 
        right: '10mm', 
        textAlign: 'center', 
        fontSize: '9px', 
        color: '#666',
        borderTop: '1px solid #ccc',
        paddingTop: '5px'
      }}>
        {shopData?.invoice_footer || `Merci de votre confiance chez ${shopData?.name || 'PHONE MAGASINE'} - Les marchandises vendues ne sont ni reprises ni échangées`}
      </div>
    </div>
  );
});

PrintableInvoice.displayName = 'PrintableInvoice';

export default PrintableInvoice;
