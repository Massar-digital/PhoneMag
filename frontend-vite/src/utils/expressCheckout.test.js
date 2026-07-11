import { describe, it, expect } from 'vitest';
import { canExpressCheckout } from './expressCheckout';

const baseCart = [{ phone: { id: 1 }, quantity: 1, price: 100 }];
const base = {
  cart: baseCart,
  discount: 0,
  tradeIn: { enabled: false },
  paymentMethod: 'Cash',
  customer: { name: '', phone: '', email: '' },
};

describe('canExpressCheckout', () => {
  it('allows single-item anonymous cash sale', () => {
    expect(canExpressCheckout(base)).toBe(true);
  });

  it('rejects multiple cart lines', () => {
    expect(
      canExpressCheckout({
        ...base,
        cart: [...baseCart, { phone: { id: 2 }, quantity: 1, price: 50 }],
      })
    ).toBe(false);
  });

  it('rejects quantity greater than 1', () => {
    expect(
      canExpressCheckout({
        ...base,
        cart: [{ ...baseCart[0], quantity: 2 }],
      })
    ).toBe(false);
  });

  it('rejects non-cash payment', () => {
    expect(canExpressCheckout({ ...base, paymentMethod: 'Card' })).toBe(false);
  });

  it('rejects discount and trade-in', () => {
    expect(canExpressCheckout({ ...base, discount: 10 })).toBe(false);
    expect(canExpressCheckout({ ...base, tradeIn: { enabled: true } })).toBe(false);
  });

  it('rejects when customer is identified', () => {
    expect(
      canExpressCheckout({ ...base, customer: { name: 'Ali', phone: '', email: '' } })
    ).toBe(false);
  });
});
