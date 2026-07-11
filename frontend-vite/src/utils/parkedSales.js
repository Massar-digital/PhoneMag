const STORAGE_KEY = 'parked_sales';

export function loadParkedSales() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveParkedSales(sales) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
}

export function createParkedSnapshot({
  cart,
  customer,
  discount,
  tradeIn,
  warrantyDuration,
  paymentMethod,
  cashReceived,
}) {
  return {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    cart: cart.map((item) => ({
      ...item,
      phone: { ...item.phone },
    })),
    customer: { ...customer },
    discount,
    tradeIn: { ...tradeIn },
    warrantyDuration,
    paymentMethod,
    cashReceived: cashReceived ?? '',
  };
}

/** Total due for a parked sale (matches POS getTotal logic). */
export function computeParkedTotal(parked) {
  const subtotal = (parked.cart || []).reduce(
    (sum, item) => sum + (item.price * item.quantity),
    0
  );
  const discountAmount = parseFloat(parked.discount || 0);
  const tradeInValue =
    parked.tradeIn?.enabled ? parseFloat(parked.tradeIn.trade_in_value || 0) : 0;
  return Math.max(0, subtotal - discountAmount - tradeInValue);
}
