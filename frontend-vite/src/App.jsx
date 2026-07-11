import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { AppLayout } from './components/layout/AppLayout';
import TitleBar from './components/layout/TitleBar';
import { PageTransition } from './components/common/PageTransition';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import PhonesList from './pages/PhonesList';
import AddPhone from './pages/AddPhone';
import EditPhone from './pages/EditPhone';
import PhoneDetails from './pages/PhoneDetails';
import SalesList from './pages/SalesList';
import SaleDetails from './pages/SaleDetails';
import EditSale from './pages/EditSale';
import POS from './pages/POS';
import InventoryList from './pages/InventoryList';
import StockHistory from './pages/StockHistory';
import { CustomersList } from './pages/CustomersList';
import { CustomerDetails } from './pages/CustomerDetails';
import { SuppliersList } from './pages/SuppliersList';
import Reports from './pages/Reports';
import SalesReport from './pages/SalesReport';
import InventoryReport from './pages/InventoryReport';
import ProfitReport from './pages/ProfitReport';
import Expenses from './pages/Expenses';
import Repairs from './pages/Repairs';
import RepairDetail from './pages/RepairDetail';
import Exchange from './pages/Exchange';
import EmployeePerformance from './pages/EmployeePerformance';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import { MobileDashboard } from './pages/MobileDashboard';
import Welcome from './pages/Welcome';
import CPCLTestPage from './components/CPCLTestPage'; // CPCL Printer Test
import LicenseActivation from './pages/LicenseActivation';
import axios from 'axios';
import { api } from './services/api';

// Global toast function for API interceptors
// declare global {
//   interface Window {
//     showToast: (message, type: 'success' | 'error' | 'warning' | 'info', duration) => void;
//   }
// }

const AppContent = () => {
  const { showToast } = useToast();
  const [isInitialized, setIsInitialized] = React.useState(null);
  const [licenseStatus, setLicenseStatus] = React.useState({ loading: true, valid: false, reason: null, message: null });

  // Check license and setup status
  React.useEffect(() => {
    const checkStatus = async () => {
      try {
        // Validation de sécurité pour éviter le crash hors-Electron
        if (!window.electron || !window.electron.license) {
          console.warn("Environnement Electron non détecté.");
          setLicenseStatus({ loading: false, valid: false, reason: 'NO_ELECTRON', message: null });
          return;
        }

        // 1. Check License first
        const license = await window.electron.license.check();
        console.log("App.jsx: Résultat check licence:", license);
        setLicenseStatus({ loading: false, valid: license.success, reason: license.reason || null, message: license.message || null });

        if (license.success) {
          // 2. Only check backend if license is valid
          // Retry logic for initial connection
          let retries = 5;
          let success = false;
          while (retries > 0 && !success) {
            try {
              const response = await api.get('/auth/setup/status/');
              setIsInitialized(response.data.initialized);
              success = true;
            } catch (err) {
              console.log(`Backend not ready, retrying... (${retries} left)`);
              retries -= 1;
              if (retries === 0) throw err;
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        } else {
          setIsInitialized(true); 
        }
      } catch (error) {
        console.error('Erreur lors du check de statut:', error);
        // If we really can't connect after retries, then we might be in a broken state
        // and defaulting to true (login page) is safer than a white screen, 
        // but for a new install we want the welcome screen.
        // However, if it's a real connection error, we'll keep it as null to show loading
        // or set a state to show "Backend is starting..."
        setIsInitialized(null); 
        setLicenseStatus(prev => ({ ...prev, loading: false }));
      }
    };
    checkStatus();
  }, []);

  // Make showToast globally available for API interceptors
  React.useEffect(() => {
    window.showToast = showToast;
    return () => {
      window.showToast = undefined;
    };
  }, [showToast]);

  if (licenseStatus.loading || isInitialized === null) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TitleBar />
        <div className="flex-1 bg-slate-900 flex items-center justify-center text-white overflow-y-auto">Vérification de la licence...</div>
      </div>
    );
  }

  if (!licenseStatus.valid) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TitleBar />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {licenseStatus.reason === 'REVOKED' ? (
            <div className="min-h-full bg-slate-950 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-slate-900 border border-red-800 rounded-2xl shadow-2xl overflow-hidden p-8 text-center">
                <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                  <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Licence Révoquée</h1>
                <p className="text-slate-400 text-sm mb-6">
                  {licenseStatus.message || 'Votre licence a été révoquée. Veuillez contacter le support pour plus d\'informations.'}
                </p>
                <a href="mailto:support@phonemag.app" className="inline-block bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all">
                  Contacter le Support
                </a>
              </div>
            </div>
          ) : (
            <LicenseActivation />
          )}
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden">
        <TitleBar />
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <Welcome onComplete={() => setIsInitialized(true)} />
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="h-screen flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
        <TitleBar />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <Routes>
            {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/test-cpcl" element={<CPCLTestPage />} /> {/* Printer Test */}

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Dashboard />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        {/* Mobile Dashboard - Optimized for phone viewing */}
        <Route path="/mobile" element={
          <ProtectedRoute>
            <PageTransition>
              <MobileDashboard />
            </PageTransition>
          </ProtectedRoute>
        } />

        <Route path="/phones" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <PhonesList />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/phones/add" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <AddPhone />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/phones/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <PhoneDetails />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/phones/:id/edit" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <EditPhone />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/sales" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <SalesList />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/sales/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <SaleDetails />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/sales/:id/edit" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <EditSale />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/expenses" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Expenses />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/repairs" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Repairs />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/repairs/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <RepairDetail />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/exchange" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Exchange />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/pos" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <POS />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/inventory" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <InventoryList />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/inventory/history" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <StockHistory />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/suppliers" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <SuppliersList />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/customers" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <CustomersList />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/customers/:id" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <CustomerDetails />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Reports />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/sales" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <SalesReport />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/inventory" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <InventoryReport />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/profit" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <ProfitReport />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/reports/employee" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <EmployeePerformance />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/settings" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Settings />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <AppLayout>
              <PageTransition>
                <Profile />
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <PageTransition>
                <div className="container mx-auto p-6">
                  <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
                  <p className="text-slate-600">Admin only content</p>
                </div>
              </PageTransition>
            </AppLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  </div>
</Router>
  );
};

const App = () => {
  const queryClient = new QueryClient();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
