export const PRODUCT_TYPE_EMOJI = {
  Phone: '📱',
  Laptop: '💻',
  Case: '🛡️',
  Charger: '🔌',
  Cable: '🔗',
  'Screen Protector': '🪟',
  Headphones: '🎧',
  Earphones: '🎧',
  'Power Bank': '🔋',
  'Memory Card': '💾',
  Adapter: '🔌',
  Holder: '🚗',
  Other: '📦',
};

export function getProductEmoji(productType) {
  if (!productType) return '📦';
  return PRODUCT_TYPE_EMOJI[productType] || '📦';
}
