import React, { useState, useEffect } from 'react';
import { CloudArrowUpIcon, WifiIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

/**
 * SyncStatusIndicator - Shows database sync status in navbar
 * Displays: Online/Offline status, pending operations, manual sync button
 */
export const SyncStatusIndicator = () => {
  const { showToast } = useToast();
  const [syncStatus, setSyncStatus] = useState({
    online: false,
    cloud_available: false,
    pending_operations: 0,
    message: 'Vérification...'
  });
  const [syncing, setSyncing] = useState(false);

  // Check sync status every 30 seconds
  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchSyncStatus = async () => {
    try {
      const response = await api.get('/system/sync/status/');
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/system/sync/trigger/');
      if (response.data.success) {
        showToast('Base de données synchronisée avec succès !', 'success');
        fetchSyncStatus();
      } else {
        showToast('Certaines opérations n\'ont pas pu être synchronisées', 'warning');
      }
    } catch (error) {
      showToast('Échec de la synchronisation : ' + (error.response?.data?.message || 'Pas de connexion Internet'), 'error');
    } finally {
      setSyncing(false);
    }
  };

  const getStatusColor = () => {
    if (syncStatus.online && syncStatus.cloud_available) return 'text-green-600';
    if (syncStatus.online) return 'text-yellow-600';
    return 'text-gray-400';
  };

  const getStatusIcon = () => {
    if (!syncStatus.online) {
      return <WifiIcon className="w-5 h-5" />;
    }
    if (syncStatus.pending_operations > 0) {
      return <ExclamationTriangleIcon className="w-5 h-5" />;
    }
    return <CloudArrowUpIcon className="w-5 h-5" />;
  };

  return (
    <div className="relative group">
      <button
        className={`p-2 rounded-xl ${getStatusColor()} hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-400`}
        title={syncStatus.message}
      >
        {getStatusIcon()}
        {syncStatus.pending_operations > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-yellow-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {syncStatus.pending_operations}
          </span>
        )}
      </button>

      {/* Hover tooltip */}
      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
        <div className="p-4">
          <h3 className="font-semibold text-slate-900 mb-3">État de la synchronisation</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Internet :</span>
              <span className={syncStatus.online ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {syncStatus.online ? '🟢 En ligne' : '🔴 Hors ligne'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-600">BD Cloud :</span>
              <span className={syncStatus.cloud_available ? 'text-green-600 font-medium' : 'text-gray-600 font-medium'}>
                {syncStatus.cloud_available ? '✅ Connecté' : '⚠️ Non configuré'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600">Opér. en attente :</span>
              <span className={syncStatus.pending_operations > 0 ? 'text-yellow-600 font-medium' : 'text-gray-600'}>
                {syncStatus.pending_operations}
              </span>
            </div>
          </div>

          {syncStatus.online && syncStatus.pending_operations > 0 && (
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="mt-4 w-full px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
            </button>
          )}

          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              {syncStatus.pending_operations > 0 
                ? `${syncStatus.pending_operations} opérations seront synchronisées quand internet sera disponible`
                : 'Toutes les opérations sont synchronisées ✅'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
