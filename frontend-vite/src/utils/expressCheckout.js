/**
 * Express checkout: single-item, cash, no discount/trade-in/customer fields.
 * Skips the confirmation step (scan → F8 → done = 2 actions).
 */
export function canExpressCheckout({
  cart,
  discount = 0,
  tradeIn,
  paymentMethod,
  customer,
}) {
  if (paymentMethod !== 'Cash') return false;
  if (tradeIn?.enabled) return false;
  if (parseFloat(discount || 0) > 0) return false;
  if (customer?.name?.trim() || customer?.phone?.trim()) return false;
  if (!cart?.length || cart.length !== 1) return false;
  const line = cart[0];
  return line.quantity === 1;
}
