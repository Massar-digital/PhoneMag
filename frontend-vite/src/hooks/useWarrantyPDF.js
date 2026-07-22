import jsPDF from 'jspdf';
import { getPublicUrl } from '../services/api';

function loadImageAsBase64(url) {
  return fetch(url, { credentials: 'include' })
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
}

function formatDate(dateString) {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('fr-FR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function useWarrantyPDF() {
  async function generateWarranty(sale, shopData) {
    const shop = shopData?.data || shopData || {};
    const doc = new jsPDF('p', 'mm', 'a4');
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 15;
    let y = m;

    const usable = pw - 2 * m;

    const black = '#1a1a1a';
    const gray = '#6b7280';

    doc.setFont('helvetica', 'normal');

    let logoBase64 = null;
    if (shop.logo) {
      try {
        const url = getPublicUrl(shop.logo);
        logoBase64 = await loadImageAsBase64(url);
      } catch (e) {
        console.warn('useWarrantyPDF: logo fetch failed', e);
      }
    }

    const logoW = 40;
    const logoH = 40;
    const logoX = m;
    const logoY = y;

    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', logoX, logoY, logoW, logoH);
    }

    const headerX = logoBase64 ? m + logoW + 6 : m;

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text(shop.name || 'PHONE MAGASINE', headerX, y + 8);

    y += 12;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray);
    const addrLines = [
      shop.address_line_1,
      shop.address_line_2,
      shop.city,
    ].filter(Boolean).join(', ');
    if (addrLines) doc.text(addrLines, headerX, y);
    y += 5;
    if (shop.phone) doc.text(`Tel: ${shop.phone}`, headerX, y);
    y += 5;
    if (shop.email) doc.text(`Email: ${shop.email}`, headerX, y);

    y = Math.max(y + 6, logoY + logoH + 6);

    doc.setDrawColor('#e5e7eb');
    doc.line(m, y, pw - m, y);
    y += 8;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('WARRANTY - ورقة الضمان', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray);
    doc.text(`N° ${sale.invoice_number || 'N/A'}  —  ${formatDate(sale.sale_date)}`, pw / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor('#e5e7eb');
    doc.line(m, y, pw - m, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('CLIENT', m, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray);
    const customerInfo = [
      `Nom: ${sale.customer_name || 'Vente comptoir'}`,
      `Tél: ${sale.customer_phone || '—'}`,
    ];
    customerInfo.forEach((line) => {
      doc.text(line, m, y);
      y += 4.5;
    });
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('PRODUIT', m, y);
    y += 6;

    const items = sale.items && sale.items.length > 0
      ? sale.items
      : sale.phone_details
        ? [{ phone_details: sale.phone_details, quantity: sale.quantity || 1 }]
        : [];

    const mainItem = items[0] || {};
    const phone = mainItem.phone_details || {};

    const tableHeaders = ['Marque', 'Modèle', 'IMEI / Code', 'État', 'Couleur', 'Garantie'];
    const headerWidths = [28, 36, 40, 22, 24, 30];
    let tableX = m;
    const rowH = 7;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#ffffff');
    doc.setFillColor('#1d4ed8');
    headerWidths.forEach((w, i) => {
      doc.rect(tableX, y, w, rowH, 'F');
      doc.text(tableHeaders[i], tableX + w / 2, y + 4.5, { align: 'center' });
      tableX += w;
    });
    y += rowH;

    const row = [
      phone.brand || '—',
      phone.model || mainItem.product_name_at_sale || '—',
      phone.IMEI || phone.barcode || '—',
      phone.condition || 'Nouveau',
      phone.color || '—',
      sale.warranty_duration || '12 mois',
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(black);
    tableX = m;
    doc.setFillColor('#f9fafb');
    doc.rect(m, y, usable, rowH, 'F');
    row.forEach((val, i) => {
      doc.text(val, tableX + headerWidths[i] / 2, y + 4.5, { align: 'center' });
      tableX += headerWidths[i];
    });
    y += rowH;

    doc.setDrawColor('#d1d5db');
    doc.rect(m, y - rowH, usable, rowH);
    doc.rect(m, y - rowH, usable, 0);
    y += 4;

    y = Math.max(y, 120);

    const borderColor = '#e5e7eb';
    doc.setDrawColor(borderColor);
    doc.line(m, y, pw - m, y);
    y += 6;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('CASES NOT COVERED BY WARRANTY / الحالات غير المشمولة بالضمان', pw / 2, y, { align: 'center' });
    y += 8;

    if (y > ph - 100) {
      doc.addPage();
      y = m + 10;
    }

    const colW = (usable - 10) / 2;
    const enX = m + 4;
    const arX = pw / 2 + 9;
    const dividerX = pw / 2 + 4;

    doc.setDrawColor('#d1d5db');
    doc.line(dividerX, y - 4, dividerX, y + 100);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('CASES NOT COVERED BY WARRANTY :', enX, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#374151');
    const enIntro = doc.splitTextToSize(
      'The document states that the warranty does not cover damages resulting from abnormal or improper use of the device, specifically including:',
      colW
    );
    doc.text(enIntro, enX, y + 4);

    const enItems = [
      'Poor maintenance or visible negligence of the device.',
      'Broken or damaged screen or touch panel.',
      'Damage caused by water or moisture.',
      'Any modification or unauthorized use not approved by the company.',
      'Use of non-original or incompatible accessories or parts.',
      'Excessive or improper use, or opening the device by the user.',
      'Unauthorized repair: If the device has been repaired by a non-authorized technician.',
      'Software/Hardware Tampering: Use of a non-original charger or tampering with the device\'s software, such as changing the Baseband.',
    ];

    let bulletY = y + 4 + enIntro.length * 3.5 + 3;
    enItems.forEach((item) => {
      const lines = doc.splitTextToSize(`- ${item}`, colW - 4);
      doc.text(lines, enX + 2, bulletY);
      bulletY += lines.length * 3.5 + 1.5;
    });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    const arTitle = '⚠️ الحالات غير المشمولة بالضمان';
    doc.text(arTitle, pw - m - 4, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#374151');
    const arIntro = 'الضمان لا يشمل الأعطال الناتجة عن الاستخدام غير الطبيعي للجهاز، وتشمل الحالات التالية:';
    const arIntroLines = doc.splitTextToSize(arIntro, colW);
    doc.text(arIntroLines, pw - m - 4, y + 4, { align: 'right' });

    const arItems = [
      'سوء الصيانة أو الإهمال الواضح للجهاز.',
      'كسر أو تلف الشاشة أو اللمس.',
      'التلف الناتج عن الماء أو الرطوبة.',
      'أي تعديل أو استخدام خاص غير مصرح به من طرف الشركة.',
      'استخدام ملحقات أو قطع غيار غير أصلية أو غير متوافقة.',
      'الاستخدام المفرط أو خارج المعايير المعتمدة، أو فتح الجهاز من قبل المستخدم.',
      'في حال تم تسليم الجهاز لمصلح آخر غير معتمد.',
      'استخدام شاحن غير أصلي أو التلاعب في برنامج الشحن أو الـ Baseband.',
    ];

    let arBulletY = y + 4 + arIntroLines.length * 3.5 + 3;
    arItems.forEach((item) => {
      const lines = doc.splitTextToSize(item, colW - 4);
      doc.text(lines, pw - m - 6, arBulletY, { align: 'right' });
      arBulletY += lines.length * 3.5 + 1.5;
    });

    y = Math.max(bulletY, arBulletY) + 6;

    if (y > ph - 40) {
      doc.addPage();
      y = m + 10;
    }

    doc.setDrawColor(borderColor);
    doc.line(m, y, pw - m, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(black);
    doc.text('SIGNATURE', pw / 2, y, { align: 'center' });
    y += 12;

    const sigY = y;
    const halfWidth = usable / 2 - 10;

    doc.line(m, sigY, m + halfWidth, sigY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray);
    doc.text('Signature du client / توقيع الزبون', m + halfWidth / 2, sigY + 5, { align: 'center' });

    const shopSigX = pw / 2 + 8;
    doc.line(shopSigX, sigY, shopSigX + halfWidth, sigY);
    doc.text('Cachet et signature du magasin / ختم المحل', shopSigX + halfWidth / 2, sigY + 5, { align: 'center' });

    y = sigY + 14;

    const now = new Date();
    const footerText = `Document généré le ${formatDate(now)} à ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    doc.setFontSize(7);
    doc.setTextColor('#9ca3af');
    doc.text(footerText, pw / 2, ph - 10, { align: 'center' });

    return doc;
  }

  return { generateWarranty };
}
