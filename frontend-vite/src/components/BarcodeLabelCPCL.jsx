import React, { useState, useCallback } from 'react';
import { printBarcodeLabels, getAvailablePrinters, generateCPCLLabel } from '../utils/cpclPrinter';

/**
 * BarcodeLabelCPCL - CPCL-based label printing component
 * 
 * Uses CPCL (Comtec Printer Control Language) instead of ESC/POS or HTML printing.
 * CPCL is page-based, ensuring each label prints as a discrete unit without splitting.
 * 
 * Printer: XPrinter XP-233B (203 DPI)
 * Label Size: 45mm × 35mm (configurable)
 */
export function BarcodeLabelCPCL({ 
  phone, 
  products = [], 
  quantity = 1, 
  shopSettings,
  printerName = 'Xprinter XP-233B',
  labelWidthMM = 45,
  labelHeightMM = 35,
  onPrintStart,
  onPrintComplete,
  onPrintError 
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(printerName);

  // Extract shop info
  const shopData = shopSettings?.data || shopSettings;
  const shopName = shopData?.name || 'PHONE MAGASINE';

  // Prepare the list of items to print
  const itemsToPrint = (products && products.length > 0) 
    ? products 
    : (phone ? [{ phone, quantity }] : []);

  // Load available printers
  const loadPrinters = useCallback(async () => {
    try {
      const printerList = await getAvailablePrinters();
      setPrinters(printerList);
      
      // Select shop default printer or auto-detect XPrinter
      const shopDefaultPrinter = shopData?.barcode_printer_name;
      const targetPrinter = printerList.find(p => 
        (shopDefaultPrinter && p.name === shopDefaultPrinter) ||
        p.name.toLowerCase().includes('xprinter') || 
        p.name.toLowerCase().includes('xp-233')
      );
      
      if (targetPrinter) {
        setSelectedPrinter(targetPrinter.name);
      }
    } catch (error) {
      console.error('Failed to load printers:', error);
    }
  }, [shopData?.barcode_printer_name]);

  // Print using CPCL
  const handlePrint = useCallback(async () => {
    if (itemsToPrint.length === 0) {
      onPrintError?.(new Error('No items to print'));
      return;
    }

    setIsPrinting(true);
    onPrintStart?.();

    try {
      const result = await printBarcodeLabels(itemsToPrint, {
        shopName,
        printerName: selectedPrinter,
        labelWidthMM: shopData?.barcode_label_width || labelWidthMM,
        labelHeightMM: shopData?.barcode_label_height || labelHeightMM
      });

      onPrintComplete?.(result);
    } catch (error) {
      console.error('Print failed:', error);
      onPrintError?.(error);
    } finally {
      setIsPrinting(false);
    }
  }, [itemsToPrint, shopName, selectedPrinter, labelWidthMM, labelHeightMM, shopData, onPrintStart, onPrintComplete, onPrintError]);

  // Generate preview of CPCL commands (for debugging)
  const getPreview = useCallback(() => {
    if (itemsToPrint.length === 0) return '';
    
    const firstItem = itemsToPrint[0];
    const phoneData = firstItem.phone || firstItem;
    
    const productName = `${phoneData.brand || ''} ${phoneData.model || ''}`.trim();
    
    let storageRam = phoneData.storage || '';
    if (phoneData.ram) {
      const ramStr = phoneData.product_type === 'Laptop' && !phoneData.ram.toString().toLowerCase().includes('gb') 
        ? `${phoneData.ram}GB` 
        : phoneData.ram;
      storageRam = `${storageRam}/${ramStr}`;
    }
    
    const specParts = [storageRam];
    if (phoneData.color && phoneData.product_type !== 'Laptop') {
      specParts.push(phoneData.color);
    }
    if (phoneData.battery_percentage) {
      specParts.push(`${phoneData.battery_percentage}%`);
    }
    if (phoneData.product_type === 'Laptop') {
      if (phoneData.screen_size) specParts.push(`${phoneData.screen_size}"`);
      if (phoneData.battery_cycle) specParts.push(`Cy:${phoneData.battery_cycle}`);
    }
    const specs = specParts.filter(Boolean).join(' ');
    const barcodeData = `PM-${String(phoneData.id || 0).padStart(6, '0')}`;
    const price = `${phoneData.price || 0} DA`;

    return generateCPCLLabel({
      shopName,
      productName,
      specs,
      barcodeData,
      price,
      labelWidthMM,
      labelHeightMM,
      quantity: 1
    });
  }, [itemsToPrint, shopName, labelWidthMM, labelHeightMM]);

  return {
    // State
    isPrinting,
    printers,
    selectedPrinter,
    itemsToPrint,
    
    // Actions
    print: handlePrint,
    loadPrinters,
    setSelectedPrinter,
    getPreview,
    
    // Computed
    canPrint: itemsToPrint.length > 0 && !isPrinting
  };
}

/**
 * PrintButton component - UI wrapper for CPCL printing
 */
export function CPCLPrintButton({
  phone,
  products = [],
  quantity = 1,
  shopSettings,
  printerName,
  className = '',
  children = 'Print Labels',
  showPrinterSelect = false
}) {
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const printer = BarcodeLabelCPCL({
    phone,
    products,
    quantity,
    shopSettings,
    printerName,
    onPrintStart: () => {
      setError(null);
      setSuccess(false);
    },
    onPrintComplete: () => {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
    onPrintError: (err) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    }
  });

  // Load printers on mount if showing selector
  React.useEffect(() => {
    if (showPrinterSelect) {
      printer.loadPrinters();
    }
  }, [showPrinterSelect]);

  return (
    <div className={`cpcl-print-wrapper ${className}`}>
      {showPrinterSelect && printer.printers.length > 0 && (
        <select
          value={printer.selectedPrinter}
          onChange={(e) => printer.setSelectedPrinter(e.target.value)}
          className="printer-select mb-2 p-2 border rounded w-full"
          disabled={printer.isPrinting}
        >
          {printer.printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName} {p.isDefault ? '(Default)' : ''}
            </option>
          ))}
        </select>
      )}
      
      <button
        onClick={printer.print}
        disabled={!printer.canPrint}
        className={`print-button ${printer.isPrinting ? 'printing' : ''} ${success ? 'success' : ''} ${error ? 'error' : ''}`}
      >
        {printer.isPrinting ? 'Printing...' : success ? '✓ Printed!' : children}
      </button>

      {error && (
        <div className="print-error text-red-500 text-sm mt-1">
          {error}
        </div>
      )}

      {/* Debug: Show item count */}
      {printer.itemsToPrint.length > 0 && (
        <div className="text-gray-500 text-xs mt-1">
          {printer.itemsToPrint.length} label(s) ready
        </div>
      )}
    </div>
  );
}

/**
 * Hook for using CPCL printing in any component
 */
export function useCPCLPrinter(options = {}) {
  const [state, setState] = useState({
    isPrinting: false,
    lastError: null,
    lastResult: null,
    printers: []
  });

  const print = useCallback(async (productData, printOptions = {}) => {
    setState(prev => ({ ...prev, isPrinting: true, lastError: null }));

    try {
      const result = await printBarcodeLabels(productData, {
        ...options,
        ...printOptions
      });
      setState(prev => ({ ...prev, isPrinting: false, lastResult: result }));
      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isPrinting: false, lastError: error }));
      throw error;
    }
  }, [options]);

  const loadPrinters = useCallback(async () => {
    const printers = await getAvailablePrinters();
    setState(prev => ({ ...prev, printers }));
    return printers;
  }, []);

  return {
    ...state,
    print,
    loadPrinters
  };
}

export default BarcodeLabelCPCL;
