import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from './Button';
import { Input } from './Input';

/** POS payment shortcuts (handled in POS.jsx when barcode field is not focused). */
export const POS_PAYMENT_SHORTCUT_KEYS = ['1', '2', '3'];

/**
 * KeyboardBarcodeScanner Component
 * Provides barcode scanning support for USB HID keyboard wedge scanners
 *
 * Features:
 * - Treats scanner as keyboard input device
 * - Automatically focuses input when scan mode enabled
 * - Captures full barcode string when ENTER received
 * - Optional prevention of manual typing in scan mode
 * - Clears input after successful scan
 * - Timing-based detection of scanner vs human input
 * - Toggle to enable/disable scan mode
 *
 * @param {boolean} enabled - Whether scan mode is enabled
 * @param {function} onBarcodeScanned - Callback when barcode is scanned (receives barcode string)
 * @param {boolean} preventManualTyping - Whether to prevent manual typing when scan mode enabled
 * @param {number} scannerThreshold - Time threshold in ms to detect scanner input (default: 50ms)
 * @param {string} placeholder - Placeholder text for the input field
 * @param {string} className - Additional CSS classes
 */
export const KeyboardBarcodeScanner = forwardRef(({
  enabled = false,
  onBarcodeScanned,
  preventManualTyping = false,
  scannerThreshold = 50,
  placeholder = "Scan barcode...",
  className = ""
}, ref) => {
  const inputRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [scanBuffer, setScanBuffer] = useState('');
  const scanTimeoutRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    blur: () => {
      inputRef.current?.blur();
    },
    select: () => {
      inputRef.current?.select();
    },
  }));

  // Focus input when scan mode is enabled
  useEffect(() => {
    if (enabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [enabled]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Ignore non-character keys (except Enter)
    if (event.key.length > 1 && event.key !== 'Enter') return;

    const currentTime = Date.now();
    const timeDiff = currentTime - lastKeyTime;

    // Detect scanner input: very fast keystrokes (within threshold)
    // We treat the first character as a potential start if lastKeyTime is 0 or it's been long
    const isScannerInput = timeDiff < scannerThreshold && lastKeyTime > 0;

    if (isScannerInput || isScanning) {
      if (event.key !== 'Enter') {
        event.preventDefault();
      }

      if (!isScanning) {
        setIsScanning(true);
        // If this is the start of a scan, we need to include the PREVIOUS key
        // which was slow but was actually the first character of the scan.
        // Wait, if it was slow, maybe it wasn't a scan? 
        // Actually, most scanners send characters very fast.
      }

      if (event.key === 'Enter') {
        // Scanner finished - process the barcode
        const barcode = scanBuffer.trim();
        if (barcode && onBarcodeScanned) {
          onBarcodeScanned(barcode);
        }
        setScanBuffer('');
        setInputValue('');
        setIsScanning(false);
      } else {
        // Add character to buffer
        setScanBuffer(prev => prev + event.key);
        setInputValue(prev => prev + event.key);
      }

      // Reset timeout for scanner detection
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        // If no input for a while, consider scanning finished
        if (isScanning && scanBuffer.trim()) {
          const barcode = scanBuffer.trim();
          if (onBarcodeScanned) {
            onBarcodeScanned(barcode);
          }
          setScanBuffer('');
          setInputValue('');
          setIsScanning(false);
        }
      }, scannerThreshold * 2);

    } else {
      // Manual typing or first character of scan
      if (event.key === 'Enter') {
        // Process manual entry on Enter too if we have value
        if (inputValue.trim() && onBarcodeScanned) {
          onBarcodeScanned(inputValue.trim());
          setInputValue('');
          setScanBuffer('');
        }
      } else if (preventManualTyping) {
        event.preventDefault();
      } else {
        // Regular manual typing in the dedicated barcode field
        // We update the buffer just in case the NEXT key is fast
        setScanBuffer(event.key);
      }
    }

    setLastKeyTime(currentTime);
  }, [enabled, isScanning, lastKeyTime, scanBuffer, scannerThreshold, onBarcodeScanned, preventManualTyping, inputValue]);

  // Handle manual input changes (for display purposes)
  const handleInputChange = useCallback((e) => {
    if (!preventManualTyping || !enabled) {
      setInputValue(e.target.value);
    }
  }, [preventManualTyping, enabled]);

  // Set up global keyboard listener
  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
      };
    }
  }, [enabled, handleKeyDown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <div className={`keyboard-barcode-scanner ${className}`}>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        readOnly={preventManualTyping}
        className={`barcode-input ${isScanning ? 'scanning' : ''}`}
        style={{
          backgroundColor: isScanning ? '#e6f7ff' : undefined,
          borderColor: isScanning ? '#1890ff' : undefined
        }}
      />
      {isScanning && (
        <div className="text-sm text-blue-600 mt-1">
          Scanning... Press Enter to complete
        </div>
      )}
    </div>
  );
});

/**
 * Hook for using keyboard barcode scanner
 * @param {Object} options - Scanner options
 * @returns {Object} - Scanner state and controls
 */
export const useKeyboardBarcodeScanner = (options = {}) => {
  const [enabled, setEnabled] = useState(options.defaultEnabled || false);
  const [lastScanned, setLastScanned] = useState(null);

  const handleBarcodeScanned = useCallback((barcode) => {
    setLastScanned({
      barcode,
      timestamp: Date.now()
    });
    if (options.onBarcodeScanned) {
      options.onBarcodeScanned(barcode);
    }
  }, [options]);

  const toggleScanner = useCallback(() => {
    setEnabled(prev => !prev);
  }, []);

  const enableScanner = useCallback(() => setEnabled(true), []);
  const disableScanner = useCallback(() => setEnabled(false), []);

  return {
    enabled,
    lastScanned,
    toggleScanner,
    enableScanner,
    disableScanner,
    onBarcodeScanned: handleBarcodeScanned
  };
};