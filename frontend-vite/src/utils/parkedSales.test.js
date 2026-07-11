import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadParkedSales,
  saveParkedSales,
  createParkedSnapshot,
  computeParkedTotal,
} from './parkedSales';

describe('parkedSales', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads empty array when storage is missing', () => {
    expect(loadParkedSales()).toEqual([]);
  });

  it('persists and loads parked sales', () => {
    const sales = [{ id: 1, cart: [] }];
    saveParkedSales(sales);
    expect(loadParkedSales()).toEqual(sales);
  });

  it('creates a deep snapshot of cart items', () => {
    const phone = { id: 1, brand: 'Apple', model: 'iPhone', price: 100 };
    const snapshot = createParkedSnapshot({
      cart: [{ phone, quantity: 1, price: 100 }],
      customer: { name: 'Ali', phone: '0555', email: '' },
      discount: 10,
      tradeIn: { enabled: true, trade_in_value: 5 },
      warrantyDuration: '12 mois',
      paymentMethod: 'Cash',
      cashReceived: '200',
    });
    snapshot.cart[0].phone.brand = 'Changed';
    expect(phone.brand).toBe('Apple');
    expect(snapshot.cashReceived).toBe('200');
  });

  it('computes total with discount and trade-in', () => {
    const parked = {
      cart: [{ price: 100, quantity: 2 }],
      discount: 20,
      tradeIn: { enabled: true, trade_in_value: 30 },
    };
    expect(computeParkedTotal(parked)).toBe(150);
  });
});
