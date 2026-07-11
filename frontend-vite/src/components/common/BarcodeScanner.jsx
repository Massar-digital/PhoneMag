import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { XMarkIcon, CameraIcon, PencilIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';
import { Modal } from './Modal';
import { Input } from './Input';

/**
 * BarcodeScanner Component
 * Provides barcode/QR code scanning functionality using device camera
 * 
 * @param {boolean} isOpen - Whether the scanner modal is open
 * @param {function} onClose - Callback when scanner is closed
 * @param {function} onScan - Callback when a code is successfully scanned (receives decoded text)
 * @param {string} scanMode - 'barcode' for product lookup, 'imei' for IMEI scanning
 */
export const BarcodeScanner = ({ isOpen, onClose, onScan, scanMode = 'barcode' }) => {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const [cameraId, setCameraId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  useEffect(() => {
    if (isOpen && !html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode('barcode-scanner');
    }

    return () => {
      if (html5QrCodeRef.current && isScanning) {
        stopScanning();
      }
    };
  }, [isOpen]);

  const startScanning = async () => {
    if (!html5QrCodeRef.current || isScanning) return;

    try {
      setError(null);
      setIsScanning(true);
      setScanAttempts(0);
      setLastScannedCode(null);

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const selectedCameraId = cameraId || devices[0].id;
        
        // Configuration for barcode scanning
        // Use larger scanning area for better barcode detection
        const viewportWidth = window.innerWidth || 640;
        const viewportHeight = window.innerHeight || 480;
        const qrboxSize = Math.min(viewportWidth * 0.8, viewportHeight * 0.5, 400);
        
        const config = {
          fps: 10, // Frames per second
          qrbox: { width: qrboxSize, height: qrboxSize }, // Larger scanning box for barcodes
          aspectRatio: 1.0,
          // Enable barcode detector if browser supports it (for Code 128, Code 39, etc.)
          useBarCodeDetectorIfSupported: true,
          // Try both QR and barcode detection
          verbose: false, // Set to true for debugging
        };

        // Log browser barcode support
        if (typeof BarcodeDetector !== 'undefined') {
          console.log('Browser supports native BarcodeDetector API');
        } else {
          console.log('Browser does not support native BarcodeDetector - using fallback');
        }
        
        await html5QrCodeRef.current.start(
          selectedCameraId,
          config,
          (decodedText, decodedResult) => {
            // Successfully scanned
            console.log('Scanned code:', decodedText, 'Format:', decodedResult?.result?.format);
            setLastScannedCode(decodedText);
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Scanning error (usually just means no code detected yet)
            // Don't show these as errors, they're normal during scanning
            // Track scan attempts for debugging
            setScanAttempts(prev => prev + 1);
            // Log errors that might indicate configuration issues
            if (errorMessage) {
              const isNotFound = errorMessage.includes('NotFoundException') || 
                                 errorMessage.includes('No MultiFormat Readers');
              if (!isNotFound) {
                // Log non-standard errors that might indicate barcode format issues
                console.debug('Scanning attempt:', errorMessage.substring(0, 100));
              }
            }
          }
        );
      } else {
        throw new Error('No camera found. Please ensure your device has a camera.');
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Failed to start camera. Please check permissions.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
      setIsScanning(false);
    }
  };

  const handleScanSuccess = (decodedText) => {
    // Clean the scanned text (remove whitespace, special characters if needed)
    const cleanedText = decodedText.trim();
    
    // Stop scanning after successful scan
    stopScanning();
    
    // Call the onScan callback with the decoded text
    if (onScan && cleanedText) {
      onScan(cleanedText);
    }
    
    // Close the scanner
    onClose();
  };

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      handleScanSuccess(manualInput.trim());
      setManualInput('');
      setShowManualInput(false);
    }
  };

  const handleClose = async () => {
    await stopScanning();
    setError(null);
    setLastScannedCode(null);
    setScanAttempts(0);
    onClose();
  };

  const handleStartClick = () => {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      header={
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {scanMode === 'imei' ? 'Scan IMEI' : 'Scan Barcode'}
          </h3>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
      }
      body={
        <div className="space-y-4">
          {/* Scanner View */}
          <div className="relative">
            <div
              id="barcode-scanner"
              ref={scannerRef}
              className="w-full rounded-lg overflow-hidden bg-slate-900"
              style={{ minHeight: '300px' }}
            />
            
            {/* Overlay Instructions */}
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-opacity-75 rounded-lg">
                <div className="text-center text-white p-6">
                  <CameraIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">Ready to Scan</p>
                  <p className="text-sm opacity-75">
                    {scanMode === 'imei' 
                      ? 'Click "Start Scanner" to scan IMEI from device or barcode'
                      : 'Click "Start Scanner" to scan product barcode'}
                  </p>
                </div>
              </div>
            )}

            {/* Scanning Indicator */}
            {isScanning && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                Scanning... {scanAttempts > 0 && <span className="text-xs opacity-75">({scanAttempts} attempts)</span>}
              </div>
            )}

            {/* Last Scanned Code Display (for debugging) */}
            {lastScannedCode && !isScanning && (
              <div className="absolute bottom-4 left-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg text-sm">
                <p className="font-medium">Last scanned: {lastScannedCode}</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Manual Input Option */}
          {!showManualInput ? (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualInput(true)}
                icon={<PencilIcon className="w-4 h-4" />}
              >
                Can't scan? Enter manually
              </Button>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">Manual Entry</p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder={scanMode === 'imei' ? 'Enter IMEI manually' : 'Enter barcode manually'}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSubmit();
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleManualSubmit}
                  disabled={!manualInput.trim()}
                >
                  Use
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowManualInput(false);
                    setManualInput('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Tips:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>Ensure good lighting for better scanning</li>
              <li>Hold the barcode steady in front of the camera</li>
              <li>Allow camera permissions when prompted</li>
              {scanMode === 'imei' && (
                <>
                  <li>You can scan IMEI from device settings or barcode labels</li>
                  <li>IMEI barcodes are typically Code 128 or Code 39 format</li>
                  <li>If scanning fails, try manual entry or check barcode quality</li>
                </>
              )}
            </ul>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartClick}
            disabled={!!error}
            className="flex-1"
          >
            {isScanning ? 'Stop Scanner' : 'Start Scanner'}
          </Button>
        </div>
      }
    />
  );
};

