import React, { useState, useEffect } from 'react';
import { 
  generateCPCLLabel, 
  getAvailablePrinters, 
  sendToPrinter 
} from '../utils/cpclPrinter';

/**
 * CPCL Printer Test Page
 * 
 * A standalone test component for debugging CPCL printing.
 * Add this to your routes temporarily for testing:
 * 
 * import CPCLTestPage from './components/CPCLTestPage';
 * <Route path="/test-cpcl" element={<CPCLTestPage />} />
 */
export default function CPCLTestPage() {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [cpclPreview, setCpclPreview] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isPrinting, setIsPrinting] = useState(false);
  
  // Test product data
  const [testData, setTestData] = useState({
    shopName: 'PHONE MAGASINE',
    productName: 'iPhone 15 Pro Max',
    specs: '256GB Black',
    barcodeData: 'PM-000123',
    price: '289000 DA',
    labelWidth: 45,
    labelHeight: 35
  });

  // Load printers on mount
  useEffect(() => {
    loadPrinters();
  }, []);

  // Update preview when data changes
  useEffect(() => {
    generatePreview();
  }, [testData]);

  const loadPrinters = async () => {
    try {
      const list = await getAvailablePrinters();
      setPrinters(list);
      
      // Auto-select XPrinter if found
      const xp = list.find(p => p.name.toLowerCase().includes('xprinter'));
      if (xp) {
        setSelectedPrinter(xp.name);
      } else if (list.length > 0) {
        setSelectedPrinter(list[0].name);
      }
      
      setStatus({ type: 'info', message: `Found ${list.length} printer(s)` });
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to load printers: ${error.message}` });
    }
  };

  const generatePreview = () => {
    const cpcl = generateCPCLLabel({
      shopName: testData.shopName,
      productName: testData.productName,
      specs: testData.specs,
      barcodeData: testData.barcodeData,
      price: testData.price,
      labelWidthMM: testData.labelWidth,
      labelHeightMM: testData.labelHeight,
      quantity: 1
    });
    setCpclPreview(cpcl);
  };

  const handlePrint = async () => {
    if (!selectedPrinter) {
      setStatus({ type: 'error', message: 'Please select a printer' });
      return;
    }

    setIsPrinting(true);
    setStatus({ type: 'info', message: 'Sending to printer...' });

    try {
      const result = await sendToPrinter(cpclPreview, { printerName: selectedPrinter });
      setStatus({ type: 'success', message: result.message || 'Print successful!' });
    } catch (error) {
      setStatus({ type: 'error', message: `Print failed: ${error.message}` });
    } finally {
      setIsPrinting(false);
    }
  };

  const downloadPRN = () => {
    const blob = new Blob([cpclPreview], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-label.prn';
    a.click();
    URL.revokeObjectURL(url);
    setStatus({ type: 'success', message: 'Downloaded test-label.prn' });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cpclPreview);
    setStatus({ type: 'success', message: 'Copied to clipboard!' });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: '20px' }}>🖨️ CPCL Printer Test</h1>
      
      {/* Status Banner */}
      {status.message && (
        <div style={{
          padding: '10px 15px',
          marginBottom: '20px',
          borderRadius: '5px',
          backgroundColor: status.type === 'error' ? '#fee' : status.type === 'success' ? '#efe' : '#eef',
          color: status.type === 'error' ? '#c00' : status.type === 'success' ? '#080' : '#008',
          border: `1px solid ${status.type === 'error' ? '#fcc' : status.type === 'success' ? '#cfc' : '#ccf'}`
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left: Configuration */}
        <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
          <h2>Configuration</h2>
          
          {/* Printer Selection */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              Printer:
            </label>
            <select 
              value={selectedPrinter}
              onChange={(e) => setSelectedPrinter(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="">Select a printer...</option>
              {printers.map(p => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name} {p.isDefault ? '(Default)' : ''}
                </option>
              ))}
            </select>
            <button 
              onClick={loadPrinters}
              style={{ marginTop: '5px', padding: '5px 10px', cursor: 'pointer' }}
            >
              🔄 Refresh
            </button>
          </div>

          {/* Label Data */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Shop Name:</label>
            <input 
              type="text" 
              value={testData.shopName}
              onChange={(e) => setTestData({...testData, shopName: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Product Name:</label>
            <input 
              type="text" 
              value={testData.productName}
              onChange={(e) => setTestData({...testData, productName: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Specs:</label>
            <input 
              type="text" 
              value={testData.specs}
              onChange={(e) => setTestData({...testData, specs: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Barcode Data:</label>
            <input 
              type="text" 
              value={testData.barcodeData}
              onChange={(e) => setTestData({...testData, barcodeData: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Price:</label>
            <input 
              type="text" 
              value={testData.price}
              onChange={(e) => setTestData({...testData, price: e.target.value})}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Width (mm):</label>
              <input 
                type="number" 
                value={testData.labelWidth}
                onChange={(e) => setTestData({...testData, labelWidth: parseInt(e.target.value) || 35})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Height (mm):</label>
              <input 
                type="number" 
                value={testData.labelHeight}
                onChange={(e) => setTestData({...testData, labelHeight: parseInt(e.target.value) || 40})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrint}
              disabled={isPrinting || !selectedPrinter}
              style={{
                padding: '12px 24px',
                backgroundColor: isPrinting ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isPrinting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isPrinting ? '⏳ Printing...' : '🖨️ Print Test Label'}
            </button>
            
            <button
              onClick={downloadPRN}
              style={{
                padding: '12px 24px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              💾 Download .PRN
            </button>

            <button
              onClick={copyToClipboard}
              style={{
                padding: '12px 24px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              📋 Copy CPCL
            </button>
          </div>
        </div>

        {/* Right: CPCL Preview */}
        <div style={{ background: '#1e1e1e', padding: '20px', borderRadius: '8px', color: '#d4d4d4' }}>
          <h2 style={{ color: '#fff', marginTop: 0 }}>CPCL Commands Preview</h2>
          <pre style={{
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            margin: 0,
            padding: '15px',
            background: '#2d2d2d',
            borderRadius: '4px',
            maxHeight: '500px',
            overflow: 'auto'
          }}>
            {cpclPreview}
          </pre>
          
          <div style={{ marginTop: '15px', fontSize: '12px', color: '#888' }}>
            <strong>Label Dimensions:</strong> {testData.labelWidth}mm × {testData.labelHeight}mm 
            = {testData.labelWidth * 8} × {testData.labelHeight * 8} dots (@ 203 DPI)
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{ marginTop: '30px', padding: '20px', background: '#fff3cd', borderRadius: '8px', border: '1px solid #ffc107' }}>
        <h3 style={{ marginTop: 0 }}>📋 Testing Instructions</h3>
        <ol style={{ lineHeight: '1.8' }}>
          <li><strong>Check printer list:</strong> Your XPrinter XP-233B should appear in the dropdown</li>
          <li><strong>If not found:</strong> Ensure the printer is connected via USB and drivers are installed</li>
          <li><strong>Test without printing:</strong> Download the .PRN file and send manually:
            <pre style={{ background: '#f8f9fa', padding: '10px', borderRadius: '4px', margin: '5px 0' }}>
              copy /b test-label.prn \\localhost\YourPrinterShareName
            </pre>
          </li>
          <li><strong>Print test:</strong> Click "Print Test Label" to send directly to printer</li>
          <li><strong>Troubleshooting:</strong> Check the console (F12) for detailed error messages</li>
        </ol>
      </div>
    </div>
  );
}
