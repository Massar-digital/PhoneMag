import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Create a custom render function that includes basic providers
const AllTheProviders = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </HashRouter>
    </QueryClientProvider>
  );
};

const customRender = (
  ui,
  options
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock API responses
export const mockApiResponse = {
  // success: (data) => ({
    // data,
    // status: 200,
    // statusText: 'OK',
  // }),
  // error: (message, status = 400) => ({
    // response: {
      // data: { message },
      // status,
      // statusText: 'Bad Request',
    // },
  // }),
};

// Mock user data
export const mockUser = {
  // id: 1,
  // username: 'testuser',
  // email: 'test@example.com',
  // role: 'admin',
  // first_name: 'Test',
  // last_name: 'User',
};

export const mockPhone = {
  // id: 1,
  // brand: 'Apple',
  // model: 'iPhone 15',
  // price: 999.99,
  // storage: '128GB',
  // ram: '8GB',
  // color: 'Black',
  // condition: 'New',
  // imei: '123456789012345',
  // description: 'Latest iPhone model',
  // purchase_price: 800.00,
};

export const mockSale = {
  // id: 1,
  // phone: mockPhone,
  // quantity: 1,
  // total_price: 999.99,
  // customer_name: 'John Doe',
  // discount_applied: 0,
  // profit_margin: 199.99,
  // invoice_number: 'INV-2025-00001',
  // sale_date: '2025-12-01T10:00:00Z',
  // payment_method: 'Cash',
};

export const mockCustomer = {
  // id: 1,
  // first_name: 'John',
  // last_name: 'Doe',
  // phone: '+1234567890',
  // email: 'john@example.com',
  // address: '123 Main St, City, State 12345',
  // created_at: '2025-12-01T10:00:00Z',
  // loyalty_points: 100,
};

// Test form data
export const validLoginData = {
  // username: 'testuser',
  // password: 'password123',
};

export const validRegisterData = {
  // username: 'newuser',
  // email: 'new@example.com',
  // password: 'password123',
  // password_confirm: 'password123',
  // first_name: 'New',
  // last_name: 'User',
};

export const validPhoneData = {
  // brand: 'Samsung',
  // model: 'Galaxy S24',
  // storage: '256GB',
  // ram: '8GB',
  // color: 'Blue',
  // purchase_price: 700,
  // price: 899.99,
  // condition: 'New',
  // imei: '987654321098765',
  // description: 'Latest Samsung flagship',
};

export const validSaleData = {
  // customer_name: 'Jane Smith',
  // phone_id: 1,
  // quantity: 1,
  // discount: 0,
  // payment_method: 'Card',
  // notes: 'Quick sale',
};

export const validCustomerData = {
  // first_name: 'Alice',
  // last_name: 'Johnson',
  // phone: '+1987654321',
  // email: 'alice@example.com',
  // address: '456 Oak Ave, Town, State 67890',
};

// Helper to wait for async operations
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

// Helper to create mock functions
export const createMockFn = () => jest.fn();

// Export custom render default
export * from '@testing-library/react';
export { customRender as render };
