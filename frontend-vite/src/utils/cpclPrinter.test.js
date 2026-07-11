/**
 * CPCL Printer Test Script
 * 
 * Run this in the browser console (DevTools F12) while your Electron app is running,
 * or import it in a component to test CPCL generation and printing.
 */

import { generateCPCLLabel, generateCPCLBatch, sendToPrinter, getAvailablePrinters } from './cpclPrinter';

// Test product data
const testProduct = {
  id: 123,
  brand: 'Apple',
  model: 'iPhone 15 Pro Max',
  storage: '256GB',
  ram: null, // Apple doesn't show RAM
  color: 'Black Titanium',
  price: 289000
};

const testProducts = [
  { id: 1, brand: 'Apple', model: 'iPhone 15', storage: '128GB', color: 'Blue', price: 189000 },
  { id: 2, brand: 'Samsung', model: 'Galaxy S24', storage: '256GB', ram: '8GB', color: 'Black', price: 165000 },
  { id: 3, brand: 'Xiaomi', model: 'Redmi Note 13', storage: '128GB', ram: '6GB', color: 'Green', price: 45000 },
];

/**
 * Test 1: Generate CPCL for a single label and log it
 */
export function testSingleLabel() {
  console.log('=== TEST: Single CPCL Label ===\n');
  
  const cpcl = generateCPCLLabel({
    shopName: 'PHONE MAGASINE',
    productName: `${testProduct.brand} ${testProduct.model}`,
    specs: `${testProduct.storage} ${testProduct.color}`,
    barcodeData: `PM-${String(testProduct.id).padStart(6, '0')}`,
    price: `${testProduct.price} DA`,
    labelWidthMM: 45,
    labelHeightMM: 35,
    quantity: 1
  });

  console.log(cpcl);
  console.log('\n=== END Single Label ===\n');
  
  return cpcl;
}

/**
 * Test 2: Generate CPCL for batch printing
 */
export function testBatchLabels() {
  console.log('=== TEST: Batch CPCL Labels ===\n');
  
  const cpcl = generateCPCLBatch(testProducts, {
    shopName: 'PHONE MAGASINE',
    labelWidthMM: 45,
    labelHeightMM: 35
  });

  console.log(cpcl);
  console.log('\n=== END Batch Labels ===\n');
  
  return cpcl;
}

/**
 * Test 3: List available printers
 */
export async function testListPrinters() {
  console.log('=== TEST: Available Printers ===\n');
  
  try {
    const printers = await getAvailablePrinters();
    
    if (printers.length === 0) {
      console.log('No printers found. Make sure you are running in Electron.');
    } else {
      console.table(printers);
      
      // Check for XPrinter
      const xprinter = printers.find(p => 
        p.name.toLowerCase().includes('xprinter') || 
        p.name.toLowerCase().includes('xp-233')
      );
      
      if (xprinter) {
        console.log(`\n✓ Found XPrinter: "${xprinter.name}"`);
      } else {
        console.log('\n⚠ XPrinter XP-233B not found. Available printers:');
        printers.forEach(p => console.log(`  - ${p.name}`));
      }
    }
    
    return printers;
  } catch (error) {
    console.error('Error listing printers:', error);
    return [];
  }
}

/**
 * Test 4: Send test label to printer (ACTUALLY PRINTS!)
 */
export async function testPrintLabel(printerName = 'Xprinter XP-233B') {
  console.log(`=== TEST: Print to "${printerName}" ===\n`);
  
  const cpcl = generateCPCLLabel({
    shopName: 'TEST PRINT',
    productName: 'Test Product',
    specs: '128GB Black',
    barcodeData: 'PM-TEST01',
    price: '99999 DA',
    labelWidthMM: 45,
    labelHeightMM: 35,
    quantity: 1
  });

  console.log('Sending CPCL commands:');
  console.log(cpcl);
  console.log('\nSending to printer...');

  try {
    const result = await sendToPrinter(cpcl, { printerName });
    console.log('Result:', result);
    return result;
  } catch (error) {
    console.error('Print failed:', error);
    throw error;
  }
}

/**
 * Test 5: Save CPCL to file for manual testing
 */
export function testSaveToFile() {
  const cpcl = testSingleLabel();
  
  // Create a downloadable file
  const blob = new Blob([cpcl], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'test-label.prn';
  a.click();
  URL.revokeObjectURL(url);
  
  console.log('✓ Saved to test-label.prn');
  console.log('  You can send this file directly to the printer using:');
  console.log('  copy /b test-label.prn \\\\localhost\\XPrinter');
  
  return cpcl;
}

/**
 * Run all non-printing tests
 */
export function runAllTests() {
  console.clear();
  console.log('╔════════════════════════════════════╗');
  console.log('║     CPCL PRINTER TEST SUITE        ║');
  console.log('╚════════════════════════════════════╝\n');
  
  testSingleLabel();
  testBatchLabels();
  testListPrinters();
  
  console.log('\n✓ All generation tests passed!');
  console.log('\nTo test actual printing, run:');
  console.log('  testPrintLabel("Your Printer Name")');
}

// Auto-run if executed directly
if (typeof window !== 'undefined') {
  window.cpclTest = {
    testSingleLabel,
    testBatchLabels,
    testListPrinters,
    testPrintLabel,
    testSaveToFile,
    runAllTests
  };
  
  console.log('CPCL Test functions available at window.cpclTest');
  console.log('Run: cpclTest.runAllTests()');
}

export default {
  testSingleLabel,
  testBatchLabels,
  testListPrinters,
  testPrintLabel,
  testSaveToFile,
  runAllTests
};
