import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';

// // Extend jsPDF type to include autoTable
// declare module 'jspdf' {
//   interface jsPDF {
//     autoTable: (options) => jsPDF;
//   }
// }

// export interface PDFReportData {
//   title;
//   subtitle;
//   dateRange;
//   summaryData: Array<{
//     label;
//     value;
//   }>;
//   tableData: {
//     headers[];
//     rows: (string | number)[][];
//     title;
//   };
//   chartData: {
//     title;
//     description;
//   };
// }

export class PDFGenerator {
  doc;
  pageWidth;
  pageHeight;
  margin;
  currentY;

  constructor() {
    this.doc = new jsPDF();
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 20;
    this.currentY = this.margin;
  }

  addHeader(title, subtitle) {
    // Company header
    this.doc.setFontSize(20);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Gestion Phone Magazine', this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY += 10;
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text('Rapports d\'activité complets', this.pageWidth / 2, this.currentY, { align: 'center' });

    this.currentY += 15;

    // Report title
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });

    if (subtitle) {
      this.currentY += 8;
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(subtitle, this.pageWidth / 2, this.currentY, { align: 'center' });
    }

    this.currentY += 15;
  }

  addDateRange(dateRange) {
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Période du rapport : ${dateRange}`, this.margin, this.currentY);
    this.currentY += 10;
  }

  addSummarySection(summaryData) {
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Résumé', this.margin, this.currentY);
    this.currentY += 10;

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'normal');

    summaryData.forEach(item => {
      // Check if we need a new page
      if (this.currentY > this.pageHeight - 30) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      this.doc.text(`${item.label}:`, this.margin, this.currentY);
      this.doc.text(item.value, this.pageWidth - this.margin, this.currentY, { align: 'right' });
      this.currentY += 8;
    });

    this.currentY += 10;
  }

  addTable(tableData) {
    if (tableData.title) {
      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(tableData.title, this.margin, this.currentY);
      this.currentY += 10;
    }

    // Check if we need a new page for the table
    if (this.currentY > this.pageHeight - 50) {
      this.doc.addPage();
      this.currentY = this.margin;
    }

    this.doc.autoTable({
      head: [tableData.headers],
      body: tableData.rows,
      startY: this.currentY,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = this.doc.lastAutoTable?.finalY + 15 || this.currentY + 15;
  }

  addFooter() {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(
        `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
        this.margin,
        this.pageHeight - 10
      );
      this.doc.text(
        `Page ${i} sur ${pageCount}`,
        this.pageWidth - this.margin,
        this.pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  generateReport(data) {
    this.addHeader(data.title, data.subtitle);
    this.addDateRange(data.dateRange);

    if (data.summaryData.length > 0) {
      this.addSummarySection(data.summaryData);
    }

    if (data.tableData) {
      this.addTable(data.tableData);
    }

    if (data.chartData) {
      // Add chart description
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(data.chartData.title, this.margin, this.currentY);
      this.currentY += 8;
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(data.chartData.description, this.margin, this.currentY);
      this.currentY += 10;
    }

    this.addFooter();
    return this.doc;
  }

  download(filename) {
    this.doc.save(filename);
  }
}

// Utility function to capture chart image and add to PDF
export const addChartToPDF = async (chartElement, pdf, x, y, width, height) => {
  try {
    const canvas = await html2canvas(chartElement, {
      // scale: 2,
      // useCORS: true,
      // allowTaint: true,
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, width, height);
  } catch (error) {
    console.error('Error capturing chart for PDF:', error);
  }
};

// Helper function to format currency
export const formatCurrency = (amount) => {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} DA`;
};

// Helper function to format currency without thousands separators
export const formatCurrencyNoSeparator = (amount) => {
  // Format as integer if whole number, otherwise show 2 decimals
  const num = Number(amount);
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
  return `${formatted} DA`;
};

// Helper function to format percentage
export const formatPercentage = (value) => {
  return `${value.toFixed(2)}%`;
};

// Helper function to get date range text
export const getDateRangeText = (period) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  switch (period) {
    case 'day':
      return `${today} au ${today}`;
    case 'week':
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return `${weekAgo.toISOString().split('T')[0]} au ${today}`;
    case 'month':
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return `${monthAgo.toISOString().split('T')[0]} au ${today}`;
    case 'quarter':
      const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      return `${quarterAgo.toISOString().split('T')[0]} au ${today}`;
    case 'year':
      const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      return `${yearAgo.toISOString().split('T')[0]} au ${today}`;
    default:
      return "Toute l'historique";
  }
};
