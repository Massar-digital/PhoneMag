import React from 'react';

const PrintableWarranty = React.forwardRef(({ sale, shopSettings }, ref) => {
  if (!sale) return <div ref={ref}></div>;

  // Extract shop settings properly
  const shopData = shopSettings?.data || shopSettings;

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const items = sale.items && sale.items.length > 0
    ? sale.items
    : sale.phone_details ? [{
        phone_details: sale.phone_details,
        quantity: sale.quantity || 1,
      }] : [];

  // Focused on the first item if multiple, as typical warranty is per device
  const mainItem = items[0];

  return (
    <div ref={ref} className="bg-white p-0 w-[210mm] mx-auto text-black font-sans printable-warranty overflow-hidden box-border bg-white"
         style={{ height: '297mm', minHeight: '297mm', position: 'relative', padding: '15mm' }}>
      <style type="text/css">
        {`
          @media print {
            @page { size: A4; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .printable-warranty { width: 210mm !important; min-height: 297mm !important; height: 297mm !important; padding: 15mm !important; }
            .printable-warranty .flex { display: flex !important; }
            .printable-warranty .grid { display: grid !important; }
            .printable-warranty .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          }
          .printable-warranty {
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
          }
          .arabic-text {
            font-family: 'Amiri', 'Traditional Arabic', serif;
            direction: rtl;
          }
        `}
      </style>
      
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
        <div className="text-left">
          <div className="text-3xl font-black uppercase mb-1">{shopData?.name || 'PHONE MAGASINE'}</div>
          <h1 className="text-xl font-bold uppercase tracking-tighter text-gray-700">WARRANTY - ورقة الضمان</h1>
          <p className="text-sm font-bold">Telephone: {shopData?.phone || '0781971455'}</p>
          <p className="text-sm font-bold">{shopData?.address_line_1 || 'Alger, Birkhadem'}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-black">DATE : {formatDate(sale.sale_date)}</div>
          <div className="text-lg font-bold">Client : {sale.customer_name || 'Vente Comptoir'}</div>
          {sale.invoice_number && <div className="text-sm">N° : {sale.invoice_number}</div>}
        </div>
      </div>

      {/* Device Info List (Supports multiple items) */}
      <div className="mb-6">
        <table className="w-full border-collapse border-2 border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left text-xs uppercase font-bold">Désignation / الجهاز</th>
              <th className="border border-black p-2 text-left text-xs uppercase font-bold">IMEI / الرقم المتسلسل</th>
              <th className="border border-black p-2 text-center text-xs uppercase font-bold">Condition</th>
              <th className="border border-black p-2 text-center text-xs uppercase font-bold">Garantie</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="border border-black p-2 font-black uppercase text-sm">
                  {item.phone_details?.brand} {item.phone_details?.model}
                  {item.product_name_at_sale && !item.phone_details && item.product_name_at_sale}
                </td>
                <td className="border border-black p-2 font-mono font-bold text-blue-700">
                  {item.phone_details?.IMEI || '________________'}
                </td>
                <td className="border border-black p-2 text-center font-bold text-xs uppercase">
                  {item.phone_details?.condition || 'New'}
                </td>
                <td className="border border-black p-2 text-center font-black text-blue-700">
                  {sale.warranty_duration || '12 mois'}
                </td>
              </tr>
            ))}
            {/* If no phones were found but somehow there is a sale */}
            {items.length === 0 && (
              <tr>
                <td className="border border-black p-4 text-center text-gray-400 font-italic" colSpan="4">
                  Aucun appareil compatible garantie trouvé
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Warranty Conditions (Matching the PDF) */}
      <div className="grid grid-cols-2 gap-8 mb-8 mt-12">
        {/* English Section */}
        <div className="text-[11px] leading-tight">
          <h3 className="font-black text-sm mb-3 uppercase border-b border-black pb-1">CASES NOT COVERED BY WARRANTY :</h3>
          <p className="mb-2 italic font-semibold">The document states that the warranty does not cover damages resulting from abnormal or improper use of the device, specifically including:</p>
          <ul className="list-disc pl-4 space-y-1 font-medium text-gray-800">
            <li>Poor maintenance or visible negligence of the device.</li>
            <li>Broken or damaged screen or touch panel.</li>
            <li>Damage caused by water or moisture.</li>
            <li>Any modification or unauthorized use not approved by the company.</li>
            <li>Use of non-original or incompatible accessories or parts.</li>
            <li>Excessive or improper use, or opening the device by the user.</li>
            <li>Unauthorized repair: If the device has been repaired by a non-authorized technician.</li>
            <li>Software/Hardware Tampering: Use of a non-original charger or tampering with the device's software, such as changing the Baseband.</li>
          </ul>
        </div>

        {/* Arabic Section */}
        <div className="text-[13px] leading-tight arabic-text text-right px-4 border-l border-gray-200">
          <h3 className="font-black text-lg mb-3 border-b border-black pb-1">⚠️ الحالات غير المشمولة بالضمان</h3>
          <p className="mb-2 italic font-semibold">الضمان لا يشمل الأعطال الناتجة عن الاستخدام غير الطبيعي للجهاز، وتشمل الحالات التالية:</p>
          <ul className="list-disc pr-4 space-y-1 font-medium text-gray-800">
            <li>سوء الصيانة أو الإهمال الواضح للجهاز.</li>
            <li>كسر أو تلف الشاشة أو اللمس.</li>
            <li>التلف الناتج عن الماء أو الرطوبة.</li>
            <li>أي تعديل أو استخدام خاص غير مصرح به من طرف الشركة.</li>
            <li>استخدام ملحقات أو قطع غيار غير أصلية أو غير متوافقة.</li>
            <li>الاستخدام المفرط أو خارج المعايير المعتمدة، أو فتح الجهاز من قبل المستخدم.</li>
            <li>في حال تم تسليم الجهاز لمصلح آخر غير معتمد.</li>
            <li>استخدام شاحن غير أصلي أو التلاعب في برنامج الشحن أو الـ Baseband.</li>
          </ul>
        </div>
      </div>

      {/* Footer / Signature Area */}
      <div className="mt-auto flex justify-between items-end pb-12">
        <div className="text-center w-64">
          <p className="text-xs font-bold uppercase mb-12">Customer Signature / توقيع الزبون</p>
          <div className="border-t border-black w-full"></div>
        </div>
        
        <div className="text-center bg-gray-50 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-base font-black arabic-text mb-8">ختم و توقيع</p>
          <p className="text-xs font-bold uppercase text-gray-400">Shop Stamp / ختم المحل</p>
        </div>
      </div>

      {/* Company Name Placeholder background effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] rotate-[-45deg] pointer-events-none select-none">
         <h1 className="text-9xl font-black uppercase whitespace-nowrap">{shopData?.name || 'PHONE MAGAZINE'}</h1>
      </div>
    </div>
  );
});

export default PrintableWarranty;
