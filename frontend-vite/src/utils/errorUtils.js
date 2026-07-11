/**
 * Formats Django Rest Framework validation errors into a human-readable string.
 * Handles single field errors, non-field errors, and nested object errors (like in Sale items).
 */
export const formatDRFError = (data) => {
  if (!data) return null;
  
  if (typeof data === 'string') return data;
  
  if (data.message) return data.message;
  if (data.detail) return data.detail;
  
  const errors = [];
  
  // Recursively extract errors from objects/arrays
  const extractErrors = (obj, prefix = '') => {
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'string') {
          errors.push(prefix ? `${prefix}: ${item}` : item);
        } else if (typeof item === 'object' && item !== null) {
          extractErrors(item, prefix); // Carry over prefix for array items
        }
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const currentKey = key === 'non_field_errors' ? '' : key;
        const fullKey = prefix && currentKey 
          ? `${prefix} (${currentKey})` 
          : (currentKey || prefix);
          
        if (typeof value === 'string') {
          errors.push(fullKey ? `${fullKey}: ${value}` : value);
        } else {
          extractErrors(value, fullKey);
        }
      });
    }
  };
  
  extractErrors(data);
  
  if (errors.length === 0) return null;
  
  // Clean up and join
  return errors
    .map(err => err.charAt(0).toUpperCase() + err.slice(1))
    .join(' | ');
};
