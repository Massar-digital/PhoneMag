import React from 'react';
import Barcode from 'react-barcode';

/**
 * BarcodeLabel component for printing product labels
 * Optimized for small thermal printers (e.g., 35x40mm or 50x30mm)
 * Each label prints on a separate page using explicit page wrapper
 * Supports single product or bulk array of products
 */
export const BarcodeLabel = React.forwardRef(({ phone, products = [], quantity = 1, shopSettings }, ref) => {
  // Extract shop info
  const shopData = shopSettings?.data || shopSettings;
  const shopName = shopData?.name || 'PHONE MAGASINE';

  // Barcode dimensions from shop settings or defaults
  const labelWidth = shopData?.barcode_label_width || 45;
  const labelHeight = shopData?.barcode_label_height || 35;
  const orientation = shopData?.barcode_orientation || 'landscape';
  const isLandscape = orientation === 'landscape';

  // Prepare the list of items to print
  // Each item in products can be an inventory item (with .phone) or a direct phone object
  const itemsToPrint = (products && products.length > 0) 
    ? products 
    : (phone ? [{ phone, quantity }] : []);

  if (itemsToPrint.length === 0) return <div ref={ref}></div>;

  return (
    <div ref={ref} id="barcode-print-root" style={{ backgroundColor: 'white', margin: 0, padding: 0 }}>
      {/* 
          IMPORTANT: These styles are injected specifically for the Electron print window.
          We use absolute dimensions and force page breaks.
      */}
      <style type="text/css">
        {`
          @page { 
            size: ${labelWidth}mm ${labelHeight}mm; 
            margin: 0mm !important; 
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body { 
            margin: 0 !important; 
            padding: 0 !important;
            width: ${labelWidth}mm !important;
            height: ${labelHeight}mm !important;
            background: white !important;
            overflow: hidden !important;
          }
          #barcode-print-root {
            display: block !important;
            width: ${labelWidth}mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .label-page {
            width: ${labelWidth}mm !important;
            height: ${labelHeight}mm !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
            background: white !important;
            overflow: visible !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            transform-origin: center center;
          }
          .label-content {
            width: ${labelHeight}mm;
            height: ${labelWidth}mm;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: ${isLandscape ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)'};
            transform-origin: center center;
          }
          /* Prevent blank page at the end */
          .label-page:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
          }
        `}
      </style>
      
      {itemsToPrint.flatMap((item, pIndex) => {
        // Handle both inventory items (item.phone) and direct phone objects (item)
        const currentPhone = item.phone || item;
        // If we're in bulk mode, we usually want 1 label per selected item, 
        // unless item specifies its own quantity
        const qty = item.quantity || (products && products.length > 0 ? 1 : quantity);
        const qtyNum = Math.max(1, parseInt(qty) || 1);
        
        return Array.from({ length: qtyNum }).map((_, qIndex) => (
          <div key={`${pIndex}-${qIndex}`} className="label-page">
            <div className="label-content" style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: '1mm'
            }}>
              <div style={{
                fontSize: '10px',
                fontWeight: '900',
                textTransform: 'uppercase',
                marginBottom: '0.8mm',
                borderBottom: '0.5px solid black',
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                paddingBottom: '0.5mm'
              }}>
                {shopName}
              </div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: 'bold', 
                width: '100%',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                marginBottom: '0.8mm',
                lineHeight: '1.2'
              }}>
                {currentPhone.brand} {currentPhone.model}
              </div>
              
              <div style={{ fontSize: '11px', marginBottom: '0.8mm', whiteSpace: 'nowrap', overflow: 'hidden', fontWeight: '600' }}>
                {currentPhone.storage}{currentPhone.ram && `/${currentPhone.ram}${currentPhone.product_type === 'Laptop' && !currentPhone.ram.toString().toLowerCase().includes('gb') ? 'GB' : ''}`} {currentPhone.product_type !== 'Laptop' && currentPhone.color} {currentPhone.battery_percentage && `${currentPhone.battery_percentage}%`}
              </div>

              {currentPhone.product_type === 'Laptop' && (
                <div style={{ fontSize: '9px', marginBottom: '0.8mm', whiteSpace: 'nowrap', overflow: 'hidden', fontWeight: 'bold' }}>
                  {currentPhone.screen_size && `${currentPhone.screen_size}"`} {currentPhone.battery_cycle && `Cy:${currentPhone.battery_cycle}`}
                </div>
              )}

              <div style={{ margin: '0.8mm 0', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Barcode 
                  value={`PM-${currentPhone.id?.toString().padStart(6, '0')}`}
                  width={0.85}
                  height={21}
                  fontSize={9}
                  margin={0}
                  displayValue={true}
                />
              </div>

              <div style={{ 
                fontSize: '13px', 
                fontWeight: '900', 
                marginTop: '1mm',
                letterSpacing: '0.3px'
              }}>
                {currentPhone.price} DA
              </div>
            </div>
          </div>
        ));
      })}
    </div>
  );
});

BarcodeLabel.displayName = 'BarcodeLabel';

export default BarcodeLabel;
