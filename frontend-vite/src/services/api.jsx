import axios from 'axios';


/**
 * Base API URL configuration
 * Automatically detects the current host IP and uses it for the backend
 */
const getApiUrl = () => {
  // If explicitly set in environment, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Otherwise, use the current hostname (default to localhost for Electron production)
  const hostname = window.location.hostname || 'localhost';
  
  // If we are on localhost or an IP, assume port 8000
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    return `http://${hostname}:8000/api`;
  }
  
  // For production domains, we usually don't want a port
  return `https://${hostname}/api`;
};

const API_URL = getApiUrl();

/**
 * Utility to format and normalize URLs, especially for images.
 * If a URL is pointing to localhost but the app is being accessed via an IP,
 * it replaces localhost with the correct IP.
 */
export const getPublicUrl = (url) => {
  if (!url) return url;
  
  // If it's a relative path starting with /media or /static, prepend API_URL (without /api)
  if (url.startsWith('/media/') || url.startsWith('/static/')) {
    const base = API_URL.replace('/api', '');
    return `${base}${url}`;
  }

  // If it's an absolute URL pointing to localhost/127.0.0.1, 
  // but we're connecting to a remote IP, replace localhost with that IP
  if (url.startsWith('http://localhost:8000') || url.startsWith('http://127.0.0.1:8000')) {
    const currentBase = API_URL.replace('/api', '');
    return url.replace(/^http:\/\/(localhost|127\.0\.0\.1):8000/, currentBase);
  }

  return url;
};

// Helper to safely get token from localStorage
const getToken = (key) => {
  const token = localStorage.getItem(key);
  return token && token !== 'null' && token !== 'undefined' ? token : null;
};

let authToken = getToken('access_token');
let refreshTokenValue = getToken('refresh_token');
let isRefreshing = false;
let refreshSubscribers = [];

export const setAuthTokens = (access, refresh) => {
  authToken = access && access !== 'null' && access !== 'undefined' ? access : null;
  refreshTokenValue = refresh && refresh !== 'null' && refresh !== 'undefined' ? refresh : null;
  
  // With httpOnly cookies, we don't store tokens in localStorage anymore
  // But we might still want to know if we're "logged in" for UI purposes
  if (authToken) localStorage.setItem('is_logged_in', 'true');
  else localStorage.removeItem('is_logged_in');
  
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
};

/**
 * Axios instance configured for the Phone Magazine Management API
 * Includes interceptors for authentication and error handling
 */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  }
});

// Helper to get CSRF token from cookies
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// Add request interceptor to include auth token and CSRF
api.interceptors.request.use(
  (config) => {
    // Add CSRF token for non-GET requests
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase())) {
      const csrfToken = getCookie('csrftoken');
      if (csrfToken) {
        config.headers = config.headers || {};
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }

    // Skip adding auth token for public endpoints or if we're using cookies
    // Our backend CookieJWTAuthentication will check for BOTH header and cookie.
    // If we have an access token in localStorage (migration period or session storage), we use it.
    // Otherwise, the browser sends the cookie automatically because withCredentials: true.
    
    return config;
  },
  (error) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Helper function to subscribe to token refresh
const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

// Helper function to notify all subscribers when token is refreshed
const onTokenRefreshed = (error, token) => {
  refreshSubscribers.map(cb => cb(error, token));
  refreshSubscribers = [];
};

// Add response interceptor to handle token refresh and errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors - but skip if this is a public endpoint or already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Skip token refresh for public endpoints
      const publicEndpoints = ['/auth/setup/status/', '/auth/token/', '/auth/register/', '/auth/password/reset/'];
      const isPublicEndpoint = publicEndpoints.some(endpoint => originalRequest.url?.includes(endpoint));
      
      if (isPublicEndpoint) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      // If already refreshing, wait for the refresh to complete
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((error, token) => {
            if (error) {
              reject(error);
            } else {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            }
          });
        });
      }

      // Start refresh process
      // With cookies, we check the is_logged_in flag instead of refresh_token existence
      const isLoggedIn = localStorage.getItem('is_logged_in') === 'true';
      if (isLoggedIn) {
        isRefreshing = true;
        
        try {
          console.log('Token expired, attempting refresh...');
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {}, {
            timeout: 10000, // Prevent hanging connections
            withCredentials: true // Send cookies
          });

          const { access } = response.data;
          authToken = access;
          
          // Notify all waiting requests
          onTokenRefreshed(null, access);
          isRefreshing = false;

          // Update headers for the retry
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access}`;
          }
          
          console.log('Token refreshed successfully, retrying request');
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          onTokenRefreshed(refreshError, null);
          isRefreshing = false;
          
          // Refresh failed, clear markers and redirect to login
          authToken = null;
          refreshTokenValue = null;
          localStorage.removeItem('is_logged_in');
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          
          // Only redirect if we're not already on the login page
          if (!window.location.hash.includes('/login')) {
            window.location.hash = '#/login';
          }
          
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token available, clear everything and redirect
        authToken = null;
        refreshTokenValue = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        if (!window.location.hash.includes('/login')) {
          window.location.hash = '#/login';
        }
      }
    }

    // Handle other error statuses
    if (error.response?.status === 403) {
      console.warn('Access forbidden (403)');
      if (window.showToast) {
        window.showToast('You do not have permission to perform this action.', 'error');
      }
    } else if (error.response?.status === 500) {
      console.error('Server error (500)');
      if (window.showToast) {
        window.showToast('Server error occurred. Please try again later.', 'error');
      }
    } else if (!error.response) {
      console.error('Network error (no response)');
      if (window.showToast) {
        window.showToast('Network error. Please check your connection.', 'error');
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
/**
 * Authentication API endpoints for user login, registration, password management, and user profile operations.
 */
export const authAPI = {
  login: (data) => api.post('/auth/token/', data),
  register: (data) => api.post('/auth/register/', data),
  forgotPassword: (data) => api.post('/auth/password/reset/', data),
  resetPassword: (data) => api.post('/auth/password/reset/confirm/', data),
  refresh: (data) => api.post('/auth/token/refresh/', data),
  logout: () => api.post('/auth/logout/'),
  getUser: () => api.get('/auth/users/current/'),
  getUserWithToken: (token) => api.get('/auth/users/current/', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  updateProfile: (data) => api.patch('/auth/users/current/', data),
  changePassword: (data) => api.post('/auth/users/change-password/', data),
  uploadProfilePicture: (file) => {
    const formData = new FormData();
    formData.append('profile_picture', file);
    return api.post('/auth/users/current/upload-picture/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // User management (admin only)
  getUsers: (params) => api.get('/auth/users/', { params }),
  getUserById: (id) => api.get(`/auth/users/${id}/`),
  createUser: (data) => api.post('/auth/users/', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}/`),
};

// Phones API
/**
 * Phone management API endpoints for CRUD operations on phone inventory.
 */
export const phonesAPI = {
  getAll: (params) => api.get('/phones/', { params }),
  get: (id) => api.get(`/phones/${id}/`),
  search: (query, params = {}) => api.get('/products/search/', { params: { q: query, ...params } }),
  getByIMEI: (imei) => api.get(`/products/imei/${imei}/`),
  getByBarcode: (code) => api.get(`/products/barcode/${code}/`),
  create: (data) => {
    const isFormData = data instanceof FormData;
    // When using FormData, let axios set the Content-Type automatically with the boundary
    return api.post('/phones/', data, {
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    });
  },
  update: (id, data) => {
    const isFormData = data instanceof FormData;
    // When using FormData, let axios set the Content-Type automatically with the boundary
    return api.patch(`/phones/${id}/`, data, {
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
    });
  },
  delete: (id) => api.delete(`/phones/${id}/`),
};

// Sales API
/**
 * Sales management API endpoints for CRUD operations on sales transactions.
 */
export const salesAPI = {
  getAll: (params) => api.get('/sales/', { params }),
  get: (id) => api.get(`/sales/${id}/`),
  create: (data) => api.post('/sales/', data),
  update: (id, data) => api.patch(`/sales/${id}/`, data),
  delete: (id) => api.delete(`/sales/${id}/`),
  getEmployeePerformance: (params) => api.get('/sales/employee_performance/', { params }),
  getDailyReport: (params) => api.get('/sales/daily_report/', { params }),
};

// Returns API
/**
 * Returns management API endpoints for processing and listing sale returns.
 */
export const returnsAPI = {
  getAll: (params) => api.get('/returns/', { params }),
  get: (id) => api.get(`/returns/${id}/`),
  create: (data) => api.post('/returns/', data),
  delete: (id) => api.delete(`/returns/${id}/`),
};

// Customers API
/**
 * Customer management API endpoints for CRUD operations on customer records.
 */
export const customersAPI = {
  getAll: (params) => api.get('/customers/', { params }),
  get: (id) => api.get(`/customers/${id}/`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.patch(`/customers/${id}/`, data),
  delete: (id) => api.delete(`/customers/${id}/`),
};

// Expenses API
/**
 * Expense management API endpoints for CRUD operations on shop expenses.
 */
export const expensesAPI = {
  getAll: (params) => api.get('/expenses/', { params }),
  get: (id) => api.get(`/expenses/${id}/`),
  create: (data) => api.post('/expenses/', data),
  update: (id, data) => api.patch(`/expenses/${id}/`, data),
  delete: (id) => api.delete(`/expenses/${id}/`),
  getStats: (params) => api.get('/expenses/stats/', { params }),
};

// Repairs API
export const repairsAPI = {
  getAll: (params) => api.get('/repairs/', { params }),
  getById: (id) => api.get(`/repairs/${id}/`),
  create: (data) => api.post('/repairs/', data),
  update: (id, data) => api.put(`/repairs/${id}/`, data),
  delete: (id) => api.delete(`/repairs/${id}/`),
  markAsPaid: (id) => api.post(`/repairs/${id}/mark_as_paid/`),
};

// Exchange (Trade-in) API
/**
 * Exchange / Trade-in API – create and list exchange transactions.
 */
export const exchangeAPI = {
  getAll: (params) => api.get('/exchanges/', { params }),
  get: (id) => api.get(`/exchanges/${id}/`),
  create: (data) => api.post('/exchanges/', data),
  getStats: () => api.get('/exchanges/stats/'),
};

// Inventory API
/**
 * Inventory management API endpoints for stock tracking and inventory operations.
 */
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory/', { params }),
  get: (id) => api.get(`/inventory/${id}/`),
  create: (data) => api.post('/inventory/', data),
  update: (id, data) => api.put(`/inventory/${id}/`, data),
  delete: (id) => api.delete(`/inventory/${id}/`),
  adjustStock: (id, data) => api.post(`/inventory/${id}/adjust_stock/`, data),
  getHistory: (id, params) => api.get(`/inventory/${id}/history/`, { params }),
  getStockHistory: (params) => api.get('/stock-history/', { params }),
  getStockHistoryStats: (params) => api.get('/stock-history/stats/', { params }),
};

// Suppliers API
/**
 * Supplier management API endpoints for CRUD operations on supplier records.
 */
export const suppliersAPI = {
  getAll: (params) => api.get('/suppliers/', { params }),
  get: (id) => api.get(`/suppliers/${id}/`),
  create: (data) => api.post('/suppliers/', data),
  update: (id, data) => api.put(`/suppliers/${id}/`, data),
  delete: (id) => api.delete(`/suppliers/${id}/`),
};

// Dashboard API
/**
 * Dashboard API endpoints for retrieving business statistics and analytics.
 */
export const dashboardAPI = {
  getStats: (period) => api.get('/dashboard/stats/', { params: { period } }),
};

// Shop API
/**
 * Shop configuration API endpoints for managing shop settings and branding.
 */
export const shopAPI = {
  get: () => api.get('/shop/'),
  create: (data) => api.post('/shop/', data),
  update: (data) => api.put('/shop/', data),
  partialUpdate: (data) => api.patch('/shop/', data),
  uploadLogo: (formData) => api.post('/shop/upload_logo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteLogo: () => api.delete('/shop/delete_logo/'),
};

// Preferences API
/**
 * User preferences API endpoints for managing user-specific settings.
 */
export const preferencesAPI = {
  get: () => api.get('/auth/preferences/'),
  create: (data) => api.post('/auth/preferences/', data),
  update: (data) => api.put('/auth/preferences/', data),
  partialUpdate: (data) => api.patch('/auth/preferences/', data),
};
