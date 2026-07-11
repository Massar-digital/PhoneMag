import React from 'react';

/**
 * PrintableExchangeReceipt – Bon d'échange (trade-in receipt)
 * Shows: old phone received, new phone sold, price breakdown.
 * Designed to look like PrintableInvoice and fit A4.
 */
const PrintableExchangeReceipt = React.forwardRef(({ exchange, shopSettings }, ref) => {
  if (!exchange) return <div ref={ref}></div>;

  const shopData = shopSettings?.data || shopSettings;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fmt = (n) =>
    parseFloat(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' DA';

  const newPhonePrice = parseFloat(exchange.new_phone_price || 0);
  const tradeInValue = parseFloat(exchange.trade_in_value || 0);
  const amountPaid = parseFloat(exchange.amount_paid_by_client || 0);

  const paymentLabels = {
    Cash: 'ESPÈCES',
    Card: 'CARTE',
    Split: 'SPLIT',
    Check: 'CHÈQUE',
    'Mobile Wallet': 'MOBILE',
    Other: 'AUTRE',
  };

  return (
    <div
      ref={ref}
      className="printable-invoice"
      style={{
        backgroundColor: 'white',
        width: '210mm',
        minHeight: '297mm',
        height: '297mm',
        margin: '0 auto',
        padding: '10mm',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        color: 'black',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <style type="text/css">
        {`
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .printable-invoice { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; padding: 10mm !important; }
            .printable-invoice { font-family: Arial, sans-serif !important; font-size: 11px !important; color: #000 !important; }
            .printable-invoice table { border-collapse: collapse !important; }
            .printable-invoice .invoice-items-table th,
            .printable-invoice .invoice-items-table td { border: 1px solid black !important; }
            .printable-invoice .invoice-items-table th { padding: 8px !important; }
            .printable-invoice .invoice-items-table td { padding: 6px !important; }
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
            {shopData?.address_line_1 || shopData?.address || 'ALGERIE'}<br/>
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
        {(shopData?.logo || shopData?.logo_url) && (
          <div className="aspect-ratio-box aspect-ratio-1-1" style={{ width: '5rem', height: '5rem' }}>
            <img 
              src={shopData.logo || shopData.logo_url} 
              alt="Logo" 
              style={{ 
                objectFit: 'contain',
                width: '100%',
                height: '100%'
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
            BON D'ÉCHANGE N°:{exchange.sale_invoice || `EXC-${exchange.id}`}
          </div>
          <div style={{ fontSize: '10px', marginTop: '4px' }}>
            Mode de paiement: <strong>{paymentLabels[exchange.payment_method] || exchange.payment_method || 'ESPÈCES'}</strong>
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div style={{ fontSize: '10px' }}>Doit:</div>
          <div style={{ fontWeight: 'bold', fontSize: '12px', textDecoration: 'underline' }}>ÉCHANGE-COMPTOIR</div>
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
        <div><strong>Client:</strong> {exchange.customer_name || 'Client de passage'}</div>
        <div><strong>Date:</strong> {formatDate(exchange.sale_date || exchange.created_at)}</div>
        {exchange.customer_phone_number && <span><strong>Tél:</strong> {exchange.customer_phone_number}</span>}
      </div>

      {/* Two-column: Old phone / New phone */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
        {/* Old phone (trade-in) */}
        <div style={{ flex: 1, border: '1px solid black', padding: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid black', paddingBottom: '4px' }}>
            Téléphone Repris (Ancien)
          </div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['Marque', exchange.brand],
                ['Modèle', exchange.model],
                ['Couleur', exchange.color],
                ['Stockage', exchange.storage],
                ['IMEI', exchange.imei],
                ['État', exchange.condition],
                ['Notes', exchange.notes],
              ].filter(([, v]) => v).map(([label, value]) => (
                <tr key={label}>
                  <td style={{ fontWeight: 'bold', width: '80px', paddingBottom: '4px' }}>{label} :</td>
                  <td style={{ paddingBottom: '4px' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ borderTop: '1px dashed black', marginTop: '5px', paddingTop: '5px', fontWeight: 'bold', textAlign: 'right' }}>
            Valeur de reprise : {fmt(tradeInValue)}
          </div>
        </div>

        {/* New phone */}
        <div style={{ flex: 1, border: '1px solid black', padding: '10px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px', borderBottom: '1px solid black', paddingBottom: '4px' }}>
            Nouveau Téléphone (Acheté)
          </div>
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ fontWeight: 'bold', width: '90px', paddingBottom: '4px' }}>Désignation :</td>
                <td style={{ paddingBottom: '4px' }}>{exchange.new_phone_name || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ borderTop: '1px dashed black', marginTop: '5px', paddingTop: '5px', fontWeight: 'bold', textAlign: 'right' }}>
            Prix catalogue : {fmt(newPhonePrice)}
          </div>
        </div>
      </div>

      {/* Totals Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div style={{ flex: 1 }}></div>

        {/* Totals box */}
        <div style={{ width: '250px' }}>
          <table className="invoice-totals-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              <tr>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>Prix nouveau téléphone</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right', width: '100px' }}>{fmt(newPhonePrice)}</td>
              </tr>
              <tr>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>Déduction reprise</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>- {fmt(tradeInValue)}</td>
              </tr>
              <tr style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>NET À PAYER</td>
                <td style={{ border: '1px solid black', padding: '5px', textAlign: 'right' }}>{fmt(amountPaid)}</td>
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
          textAlign: 'center',
          marginLeft: '15px'
        }}>
          <div>TTC le {formatDate(exchange.sale_date || exchange.created_at).split(' ')[0]}</div>
          <div style={{ marginTop: '10px', fontWeight: 'bold' }}>NET A PAYER</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{fmt(amountPaid)}</div>
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '40px' }}>
        <div style={{ textAlign: 'center', width: '200px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '40px' }}>Cachet & Signature Vendeur</div>
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

PrintableExchangeReceipt.displayName = 'PrintableExchangeReceipt';

export default PrintableExchangeReceipt;
