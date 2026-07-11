import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import React from 'react';
import POS from './POS';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock react-to-print
vi.mock('react-to-print', () => ({
  useReactToPrint: () => vi.fn(),
}));

// Mock APIs
vi.mock('../services/api', () => ({
  phonesAPI: {
    search: vi.fn(() => Promise.resolve({ data: { results: [] } })),
    get: vi.fn(),
    getByIMEI: vi.fn(),
    getByBarcode: vi.fn(),
  },
  salesAPI: {
    create: vi.fn(() => Promise.resolve({ data: { invoice_number: 'INV-TEST' } })),
  },
}));

// Mock shop hook
vi.mock('../hooks/useShop', () => ({
  useShopSettings: () => ({
    data: {
      currency_symbol: 'DA',
    },
  }),
}));

// Mock Electron window objects
window.showToast = vi.fn();

describe('POS Keyboard Shortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders POS and handles F2 shortcut for new sale', async () => {
    render(<POS />);

    // F2 should show toast for starting a new sale
    fireEvent.keyDown(document, { key: 'F2' });

    expect(window.showToast).toHaveBeenCalledWith('Nouvelle vente commencée', 'info');
  });

  it('handles F4 shortcut to focus discount field when cart is not empty', async () => {
    // To test F4, we need items in the cart so discount field is rendered
    // In POS component, addToCart can be triggered by searching and selecting a phone.
    // Let's mock a product and render the component.
    const mockPhone = {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 15',
      price: 120000,
      storage: '128GB',
      ram: '8GB',
      color: 'Black',
      condition: 'New',
      inventory: { stock_quantity: 5 },
    };

    const { phonesAPI } = await import('../services/api');
    phonesAPI.search.mockResolvedValueOnce({
      data: {
        results: [mockPhone],
      },
    });

    render(<POS />);

    // Type in search bar to find product
    const searchInput = screen.getByPlaceholderText(/Rechercher par marque/i);
    fireEvent.change(searchInput, { target: { value: 'iPhone' } });

    // Wait for the product list to show the phone
    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    });

    // Click to add to cart
    fireEvent.click(screen.getByText('Apple iPhone 15'));

    // Check that cart now has the product
    expect(screen.getByText('Panier actif')).toBeInTheDocument();
    expect(screen.getByText('Remise globale')).toBeInTheDocument();

    // Now press F4 to focus discount input
    fireEvent.keyDown(document, { key: 'F4' });

    // The discount input should be focused
    const discountInput = screen.getByPlaceholderText('0');
    expect(document.activeElement).toBe(discountInput);
  });

  it('selects card payment with key 2 while scanner is enabled', async () => {
    const mockPhone = {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 15',
      price: 120000,
      storage: '128GB',
      ram: '8GB',
      color: 'Black',
      condition: 'New',
      inventory: { stock_quantity: 5 },
    };

    const { phonesAPI } = await import('../services/api');
    phonesAPI.search.mockResolvedValueOnce({
      data: { results: [mockPhone] },
    });

    render(<POS />);

    const searchInput = screen.getByPlaceholderText(/Rechercher par marque/i);
    fireEvent.change(searchInput, { target: { value: 'iPhone' } });
    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText(/iPhone 15/)[0]);
    expect(document.activeElement.classList.contains('barcode-input')).toBe(false);

    fireEvent.keyDown(document, { key: '2' });

    expect(screen.getByText(/\[F8\] Finaliser la Vente/)).toBeInTheDocument();
    expect(screen.queryByText(/vente rapide/i)).not.toBeInTheDocument();
  });

  it('completes express cash sale with a single F8 press', async () => {
    const mockPhone = {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 15',
      price: 120000,
      storage: '128GB',
      ram: '8GB',
      color: 'Black',
      condition: 'New',
      inventory: { stock_quantity: 5 },
    };

    const { phonesAPI, salesAPI } = await import('../services/api');
    phonesAPI.search.mockResolvedValueOnce({
      data: { results: [mockPhone] },
    });

    render(<POS />);

    const searchInput = screen.getByPlaceholderText(/Rechercher par marque/i);
    fireEvent.change(searchInput, { target: { value: 'iPhone' } });
    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Apple iPhone 15'));

    fireEvent.keyDown(document, { key: 'F8' });

    await waitFor(() => {
      expect(salesAPI.create).toHaveBeenCalled();
    });
    expect(screen.queryByText('Confirmer la Vente')).not.toBeInTheDocument();
  });

  it('requires confirmation step for multi-item sales', async () => {
    const phones = [
      {
        id: 1,
        brand: 'Apple',
        model: 'iPhone 15',
        price: 120000,
        storage: '128GB',
        ram: '8GB',
        color: 'Black',
        condition: 'New',
        inventory: { stock_quantity: 5 },
      },
      {
        id: 2,
        brand: 'Samsung',
        model: 'Galaxy S24',
        price: 90000,
        storage: '256GB',
        ram: '8GB',
        color: 'Blue',
        condition: 'New',
        inventory: { stock_quantity: 3 },
      },
    ];

    const { phonesAPI, salesAPI } = await import('../services/api');
    phonesAPI.search.mockResolvedValue({ data: { results: phones } });

    render(<POS />);

    const searchInput = screen.getByPlaceholderText(/Rechercher par marque/i);
    fireEvent.change(searchInput, { target: { value: 'phone' } });
    await waitFor(() => {
      expect(screen.getByText('Samsung Galaxy S24')).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText(/iPhone 15/)[0]);
    fireEvent.click(screen.getAllByText(/Galaxy S24/)[0]);

    fireEvent.keyDown(document, { key: 'F8' });
    await waitFor(() => {
      expect(screen.getByText('Confirmer la Vente')).toBeInTheDocument();
    });
    expect(salesAPI.create).not.toHaveBeenCalled();

    fireEvent.keyDown(document, { key: 'F8' });
    await waitFor(() => {
      expect(salesAPI.create).toHaveBeenCalled();
    });
  });

  it('handles Escape shortcut to cancel payment confirmation', async () => {
    const mockPhone = {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 15',
      price: 120000,
      storage: '128GB',
      ram: '8GB',
      color: 'Black',
      condition: 'New',
      inventory: { stock_quantity: 5 },
    };

    const { phonesAPI } = await import('../services/api');
    phonesAPI.search.mockResolvedValueOnce({
      data: {
        results: [mockPhone],
      },
    });

    render(<POS />);

    // Search and add to cart
    const searchInput = screen.getByPlaceholderText(/Rechercher par marque/i);
    fireEvent.change(searchInput, { target: { value: 'iPhone' } });
    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Apple iPhone 15'));
    fireEvent.change(screen.getByPlaceholderText('Ahmed Ben...'), {
      target: { value: 'Client test' },
    });

    fireEvent.keyDown(document, { key: 'F8' });
    await waitFor(() => {
      expect(screen.getByText('Confirmer la Vente')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    // The confirmation panel should be closed
    expect(screen.queryByText('Confirmer la Vente')).not.toBeInTheDocument();
  });

  it('parks sale with F3 and restores from held drawer', async () => {
    const mockPhone = {
      id: 1,
      brand: 'Apple',
      model: 'iPhone 15',
      price: 120000,
      storage: '128GB',
      ram: '8GB',
      color: 'Black',
      condition: 'New',
      inventory: { stock_quantity: 5 },
    };

    const { phonesAPI } = await import('../services/api');
    phonesAPI.search.mockResolvedValueOnce({
      data: { results: [mockPhone] },
    });

    render(<POS />);

    const searchInput = screen.getByPlaceholderText(/Rechercher par marque/i);
    fireEvent.change(searchInput, { target: { value: 'iPhone' } });
    await waitFor(() => {
      expect(screen.getByText('Apple iPhone 15')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Apple iPhone 15'));

    fireEvent.keyDown(document, { key: 'F3' });

    expect(window.showToast).toHaveBeenCalledWith('Vente mise en attente.', 'success');
    expect(JSON.parse(localStorage.getItem('parked_sales') || '[]')).toHaveLength(1);

    await waitFor(() => {
      expect(screen.getByText('En attente (1)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('En attente (1)'));
    fireEvent.click(screen.getByText('Ouvrir'));

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('parked_sales') || '[]')).toHaveLength(0);
    });
    expect(window.showToast).toHaveBeenCalledWith('Vente en attente récupérée.', 'success');
    expect(screen.getAllByText(/Apple iPhone 15/).length).toBeGreaterThanOrEqual(1);
  });

  it('auto-focuses scanner input on page load and adds product to cart on barcode scan', async () => {
    const mockPhone = {
      id: 2,
      brand: 'Samsung',
      model: 'Galaxy S24',
      price: 90000,
      storage: '256GB',
      ram: '8GB',
      color: 'Blue',
      condition: 'New',
      inventory: { stock_quantity: 3 },
    };

    const { phonesAPI } = await import('../services/api');
    phonesAPI.getByBarcode.mockResolvedValueOnce({
      data: mockPhone,
    });

    render(<POS />);

    // Verify barcode input field is rendered and auto-focused
    const barcodeInput = screen.getByPlaceholderText('Scannez un code-barres ici...');
    expect(barcodeInput).toBeInTheDocument();
    expect(document.activeElement).toBe(barcodeInput);

    // Simulate scanning a barcode
    fireEvent.change(barcodeInput, { target: { value: '987654321' } });
    fireEvent.keyDown(barcodeInput, { key: 'Enter' });

    // Wait for the product to be added to the cart (may appear in cart + receipt preview)
    await waitFor(() => {
      expect(screen.getAllByText(/Samsung Galaxy S24/).length).toBeGreaterThanOrEqual(1);
    });
  });
});
