/**
 * CPCL Command Generator for XPrinter XP-233B
 * 
 * CPCL (Comtec Printer Control Language) is page-based, unlike ESC/POS.
 * This ensures each label prints as a discrete unit without splitting.
 * 
 * Printer: XPrinter XP-233B
 * Resolution: 203 DPI (using 200 in commands for compatibility)
 * Label Size: 45mm × 35mm (360 × 280 dots)
 * Barcode: CODE128
 */

// Constants for 203 DPI (≈ 8 dots per mm)
const DPI = 203;
const DOTS_PER_MM = 8;

// Default label dimensions (45mm × 35mm)
const DEFAULT_LABEL_WIDTH_MM = 45;
const DEFAULT_LABEL_HEIGHT_MM = 35;

/**
 * Convert millimeters to dots at 203 DPI
 * @param {number} mm - Dimension in millimeters
 * @returns {number} - Dimension in dots
 */
export const mmToDots = (mm) => Math.round(mm * DOTS_PER_MM);

/**
 * Generate CPCL commands for a single product barcode label
 * 
 * @param {Object} options - Label configuration
 * @param {string} options.shopName - Shop name for header
 * @param {string} options.productName - Product name (brand + model)
 * @param {string} options.specs - Product specifications (storage, RAM, color)
 * @param {string} options.barcodeData - Barcode value (e.g., "PM-000001")
 * @param {string} options.price - Price with currency (e.g., "189000 DA")
 * @param {number} [options.labelWidthMM=35] - Label width in mm
 * @param {number} [options.labelHeightMM=40] - Label height in mm
 * @param {number} [options.quantity=1] - Number of labels to print
 * @returns {string} - Complete CPCL command string
 */
export function generateCPCLLabel({
  shopName = 'PHONE MAGASINE',
  productName,
  specs,
  barcodeData,
  price,
  labelWidthMM = DEFAULT_LABEL_WIDTH_MM,
  labelHeightMM = DEFAULT_LABEL_HEIGHT_MM,
  quantity = 1
}) {
  // Convert dimensions to dots
  const labelWidthDots = mmToDots(labelWidthMM);
  const labelHeightDots = mmToDots(labelHeightMM);
  
  // Calculate positions (all in dots)
  // Label: 45mm x 35mm = 360 x 280 dots
  const layout = {
    // Shop name at top with small margin
    shopNameY: 12,
    // Product name below shop name
    productNameY: 38,
    // Specs below product name
    specsY: 60,
    // Barcode positioned in middle area (wider label allows larger barcode)
    barcodeX: Math.round((labelWidthDots - 280) / 2), // Center the ~280-dot wide barcode
    barcodeY: 80,
    barcodeHeight: 45,
    // Human-readable barcode text below barcode
    barcodeTextY: 132,
    // Price at bottom with inverted background
    priceBoxX: 60,
    priceBoxY: 150,
    priceBoxWidth: labelWidthDots - 120, // Leave margins on both sides
    priceBoxHeight: 32,
    priceTextX: 70,
    priceTextY: 154,
  };

  // Truncate text if too long for label width
  const maxProductNameLength = 20;
  const maxSpecsLength = 22;
  const truncatedProductName = productName?.length > maxProductNameLength 
    ? productName.substring(0, maxProductNameLength - 1) + '.'
    : productName || '';
  const truncatedSpecs = specs?.length > maxSpecsLength
    ? specs.substring(0, maxSpecsLength - 1) + '.'
    : specs || '';

  // Build CPCL command string
  // IMPORTANT: Use \r\n (CRLF) line endings for thermal printers
  const cpclCommands = [
    // Session header: ! offset h-dpi v-dpi label-height quantity
    `! 0 200 200 ${labelHeightDots} ${quantity}`,
    
    // Set label width
    `PAGE-WIDTH ${labelWidthDots}`,
    
    // Use gap sensor for label stock with gaps between labels
    'GAP-SENSE',
    
    // Center alignment for header text
    'CENTER',
    
    // Shop name (font 4 = 24-dot height, bold appearance)
    `TEXT 4 0 0 ${layout.shopNameY} ${shopName.toUpperCase()}`,
    
    // Product name (font 2 = 16-dot height)
    `TEXT 2 0 0 ${layout.productNameY} ${truncatedProductName}`,
    
    // Specifications (font 1 = 8-dot height, smallest)
    `TEXT 1 0 0 ${layout.specsY} ${truncatedSpecs}`,
    
    // Left alignment for barcode (needs precise X positioning)
    'LEFT',
    
    // CODE128 Barcode
    // BARCODE 128 narrow-width ratio height x y data
    `BARCODE 128 1 1 ${layout.barcodeHeight} ${layout.barcodeX} ${layout.barcodeY} ${barcodeData}`,
    
    // Human-readable barcode text (centered below barcode)
    'CENTER',
    `TEXT 1 0 0 ${layout.barcodeTextY} ${barcodeData}`,
    
    // Price with inverted (white on black) background
    // INVERSE-LINE creates a filled rectangle
    `INVERSE-LINE ${layout.priceBoxX} ${layout.priceBoxY} ${layout.priceBoxWidth} ${layout.priceBoxHeight}`,
    
    // Price text inside the inverted area
    `TEXT 4 0 ${layout.priceTextX} ${layout.priceTextY} ${price}`,
    
    // Form feed - advance to next label boundary
    'FORM',
    
    // Execute print - outputs exactly one complete label
    'PRINT',
  ];

  // Join with CRLF (\r\n) which is required by most thermal printers
  return cpclCommands.join('\r\n') + '\r\n'; // Add final CRLF
}

/**
 * Generate CPCL commands for multiple products (batch printing)
 * Each product generates a separate complete CPCL job to ensure
 * each label prints independently.
 * 
 * @param {Array} products - Array of product objects
 * @param {Object} options - Common options
 * @param {string} options.shopName - Shop name for all labels
 * @param {number} [options.labelWidthMM=35] - Label width in mm
 * @param {number} [options.labelHeightMM=40] - Label height in mm
 * @returns {string} - Combined CPCL commands for all products
 */
export function generateCPCLBatch(products, options = {}) {
  const { 
    shopName = 'PHONE MAGASINE',
    labelWidthMM = DEFAULT_LABEL_WIDTH_MM,
    labelHeightMM = DEFAULT_LABEL_HEIGHT_MM 
  } = options;

  const allCommands = products.flatMap((item) => {
    const phone = item.phone || item;
    const quantity = Math.max(1, parseInt(item.quantity) || 1);
    
    // Format product details
    const productName = `${phone.brand || ''} ${phone.model || ''}`.trim();
    
    // Build specs string
    let storageRam = phone.storage || '';
    if (phone.ram) {
      const ramStr = phone.product_type === 'Laptop' && !phone.ram.toString().toLowerCase().includes('gb') 
        ? `${phone.ram}GB` 
        : phone.ram;
      storageRam = `${storageRam}/${ramStr}`;
    }
    
    const specParts = [storageRam];
    if (phone.color && phone.product_type !== 'Laptop') {
      specParts.push(phone.color);
    }
    if (phone.battery_percentage) {
      specParts.push(`${phone.battery_percentage}%`);
    }
    if (phone.product_type === 'Laptop') {
      if (phone.screen_size) specParts.push(`${phone.screen_size}"`);
      if (phone.battery_cycle) specParts.push(`Cy:${phone.battery_cycle}`);
    }
    const specs = specParts.filter(Boolean).join(' ');
    
    // Generate barcode ID
    const barcodeData = `PM-${String(phone.id || 0).padStart(6, '0')}`;
    
    // Format price
    const price = `${phone.price || 0} DA`;

    // Generate CPCL for this product
    return generateCPCLLabel({
      shopName,
      productName,
      specs,
      barcodeData,
      price,
      labelWidthMM,
      labelHeightMM,
      quantity
    });
  });

  return allCommands.join('\r\n');
}

/**
 * Send CPCL commands to the printer via USB
 * Uses Electron's IPC to communicate with main process for raw printing
 * 
 * @param {string} cpclData - CPCL command string
 * @param {Object} printerConfig - Printer configuration
 * @param {string} [printerConfig.printerName] - Name of the printer (default: 'XPrinter XP-233B')
 * @returns {Promise<{success: boolean, message: string}>} - Result of the print operation
 */
export async function sendToPrinter(cpclData, printerConfig = {}) {
  const { printerName = 'Xprinter XP-233B' } = printerConfig;

  // Debug: Log CPCL commands being sent
  console.log('=== CPCL Commands Being Sent ===');
  console.log(cpclData);
  console.log('=== End CPCL Commands ===');
  console.log(`Data length: ${cpclData.length} bytes`);
  console.log(`Target printer: ${printerName}`);

  // For Electron app, use IPC to communicate with main process
  if (window.electron?.labelPrinter?.sendCPCL) {
    try {
      const result = await window.electron.labelPrinter.sendCPCL(cpclData, printerName);
      console.log('CPCL Print Result:', result);
      return result;
    } catch (error) {
      console.error('CPCL Print Error:', error);
      throw error;
    }
  }

  // Fallback for browser development: log the commands
  console.log('=== CPCL Commands (Development Mode) ===');
  console.log(cpclData);
  console.log('=== End CPCL Commands ===');
  console.warn('Not running in Electron. CPCL commands logged to console.');
  
  return { success: false, message: 'Not running in Electron environment' };
}

/**
 * Get list of available printers
 * @returns {Promise<Array<{name: string, displayName: string, isDefault: boolean}>>}
 */
export async function getAvailablePrinters() {
  if (window.electron?.labelPrinter?.getPrinters) {
    try {
      return await window.electron.labelPrinter.getPrinters();
    } catch (error) {
      console.error('Error getting printers:', error);
      return [];
    }
  }
  return [];
}

/**
 * Print barcode labels using CPCL
 * Main entry point for the printing functionality
 * 
 * @param {Object|Array} productData - Single product or array of products
 * @param {Object} options - Print options
 * @param {string} [options.shopName] - Shop name for labels
 * @param {string} [options.printerName] - Target printer name
 * @param {number} [options.labelWidthMM] - Label width in mm
 * @param {number} [options.labelHeightMM] - Label height in mm
 * @returns {Promise<{success: boolean, message: string}>} - Result of print operation
 */
export async function printBarcodeLabels(productData, options = {}) {
  const products = Array.isArray(productData) ? productData : [productData];
  
  if (products.length === 0) {
    throw new Error('No products to print');
  }

  // Generate CPCL commands
  const cpclCommands = generateCPCLBatch(products, options);
  
  // Send to printer
  return sendToPrinter(cpclCommands, { printerName: options.printerName });
}

// Export default for convenience
export default {
  generateCPCLLabel,
  generateCPCLBatch,
  sendToPrinter,
  printBarcodeLabels,
  getAvailablePrinters,
  mmToDots,
};
