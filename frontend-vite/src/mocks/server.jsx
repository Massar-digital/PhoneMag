import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { mockUser, mockPhone, mockSale, mockCustomer } from './test-utils';

// Create MSW server
export const server = setupServer(
  // Auth endpoints
  rest.post('/api/auth/token/', (req, res, ctx) => {
    return res(ctx.json({
      // access: 'mock-access-token',
      // refresh: 'mock-refresh-token',
    }));
  }),

  rest.post('/api/auth/register/', (req, res, ctx) => {
    return res(ctx.json({
      // user: mockUser,
      // access: 'mock-access-token',
      // refresh: 'mock-refresh-token',
    }));
  }),

  rest.get('/api/auth/users/current/', (req, res, ctx) => {
    return res(ctx.json(mockUser));
  }),

  // Phone endpoints
  rest.get('/api/phones/', (req, res, ctx) => {
    return res(ctx.json({
      // results: [mockPhone],
      // count: 1,
      // next: null,
      // previous: null,
    }));
  }),

  rest.post('/api/phones/', (req, res, ctx) => {
    return res(ctx.json(mockPhone));
  }),

  rest.get('/api/phones/:id/', (req, res, ctx) => {
    return res(ctx.json(mockPhone));
  }),

  rest.put('/api/phones/:id/', (req, res, ctx) => {
    return res(ctx.json(mockPhone));
  }),

  rest.delete('/api/phones/:id/', (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // Sales endpoints
  rest.get('/api/sales/', (req, res, ctx) => {
    return res(ctx.json({
      // results: [mockSale],
      // count: 1,
      // next: null,
      // previous: null,
    }));
  }),

  rest.post('/api/sales/', (req, res, ctx) => {
    return res(ctx.json(mockSale));
  }),

  rest.get('/api/sales/:id/', (req, res, ctx) => {
    return res(ctx.json(mockSale));
  }),

  rest.put('/api/sales/:id/', (req, res, ctx) => {
    return res(ctx.json(mockSale));
  }),

  // Inventory endpoints
  rest.get('/api/inventory/', (req, res, ctx) => {
    return res(ctx.json({
      // results: [{
        // id: 1,
        // phone: mockPhone,
        // stock_quantity: 10,
        // reorder_level: 5,
        // location: 'Shelf A1',
      }],
      // count: 1,
      // next: null,
      // previous: null,
    }));
  }),

  rest.put('/api/inventory/:id/adjust/', (req, res, ctx) => {
    return res(ctx.json({
      // id: 1,
      // phone: mockPhone,
      // stock_quantity: 15,
      // reorder_level: 5,
      // location: 'Shelf A1',
    }));
  }),

  // Customer endpoints
  rest.get('/api/customers/', (req, res, ctx) => {
    return res(ctx.json({
      // results: [mockCustomer],
      // count: 1,
      // next: null,
      // previous: null,
    }));
  }),

  rest.post('/api/customers/', (req, res, ctx) => {
    return res(ctx.json(mockCustomer));
  }),

  rest.get('/api/customers/:id/', (req, res, ctx) => {
    return res(ctx.json(mockCustomer));
  }),

  rest.put('/api/customers/:id/', (req, res, ctx) => {
    return res(ctx.json(mockCustomer));
  }),

  rest.delete('/api/customers/:id/', (req, res, ctx) => {
    return res(ctx.status(204));
  }),

  // Dashboard stats
  rest.get('/api/dashboard/stats/', (req, res, ctx) => {
    return res(ctx.json({
      // total_revenue: 50000,
      // total_sales: 150,
      // total_products: 25,
      // low_stock_items: 3,
    }));
  }),
);

// Establish API mocking before all tests
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after all tests are done
afterAll(() => server.close());
