import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KeyboardBarcodeScanner, useKeyboardBarcodeScanner } from './KeyboardBarcodeScanner';
import { vi } from 'vitest';

// Mock window.showToast
window.showToast = vi.fn();

const mockOnBarcodeScanned = vi.fn();

describe('KeyboardBarcodeScanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when enabled', () => {
    render(
      <KeyboardBarcodeScanner
        enabled={true}
        onBarcodeScanned={mockOnBarcodeScanned}
      />
    );

    expect(screen.getByPlaceholderText('Scan barcode...')).toBeInTheDocument();
  });

  it('does not render when disabled', () => {
    const { container } = render(
      <KeyboardBarcodeScanner
        enabled={false}
        onBarcodeScanned={mockOnBarcodeScanned}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('handles barcode scanning simulation', async () => {
    render(
      <KeyboardBarcodeScanner
        enabled={true}
        onBarcodeScanned={mockOnBarcodeScanned}
      />
    );

    const input = screen.getByPlaceholderText('Scan barcode...');

    // Simulate fast typing (scanner input)
    fireEvent.keyDown(input, { key: '1', timeStamp: 100 });
    fireEvent.keyDown(input, { key: '2', timeStamp: 101 });
    fireEvent.keyDown(input, { key: '3', timeStamp: 102 });
    fireEvent.keyDown(input, { key: 'Enter', timeStamp: 103 });

    await waitFor(() => {
      expect(mockOnBarcodeScanned).toHaveBeenCalledWith('123');
    });
  });

  it('shows scanning indicator when actively scanning', async () => {
    render(
      <KeyboardBarcodeScanner
        enabled={true}
        onBarcodeScanned={mockOnBarcodeScanned}
      />
    );

    const input = screen.getByPlaceholderText('Scan barcode...');

    // Start scanning (requires two fast keystrokes to trigger timing threshold)
    fireEvent.keyDown(input, { key: 'A' });
    fireEvent.keyDown(input, { key: 'B' });

    await waitFor(() => {
      expect(screen.getByText('Scanning... Press Enter to complete')).toBeInTheDocument();
    });

    // Complete scan
    fireEvent.keyDown(input, { key: 'Enter', timeStamp: 101 });

    await waitFor(() => {
      expect(screen.queryByText('Scanning... Press Enter to complete')).not.toBeInTheDocument();
    });
  });
});

describe('useKeyboardBarcodeScanner', () => {
  it('provides scanner controls', () => {
    const TestComponent = () => {
      const scanner = useKeyboardBarcodeScanner({
        onBarcodeScanned: mockOnBarcodeScanned
      });

      return (
        <div>
          <button onClick={scanner.toggleScanner}>
            Toggle Scanner
          </button>
          <span>Enabled: {scanner.enabled ? 'Yes' : 'No'}</span>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Enabled: No')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Toggle Scanner'));

    expect(screen.getByText('Enabled: Yes')).toBeInTheDocument();
  });
});