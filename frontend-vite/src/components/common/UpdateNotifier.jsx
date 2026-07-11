import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { Button } from './Button';
import { Spinner } from './Spinner';
import { XMarkIcon, ArrowPathIcon, ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export const UpdateNotifier = () => {
  const { showToast } = useToast();
  const [updateInfo, setUpdateInfo] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, checking, available, downloading, downloaded, error, up-to-date
  const [progress, setProgress] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!window.electron || !window.electron.updates) return;

    const unsubscribe = window.electron.updates.onStatusChange((newStatus, data) => {
      console.log('Update Status Change:', newStatus, data);

      switch (newStatus) {
        case 'update_checking':
          setStatus('checking');
          setShowNotification(true);
          break;
        case 'update_available':
          setStatus('available');
          setUpdateInfo(data);
          setShowNotification(true);
          showToast(`Nouvelle version ${data.version} disponible! Téléchargement en cours...`, 'info', 5000);
          break;
        case 'update_not_available':
          setStatus('up-to-date');
          setUpdateInfo(data);
          setShowNotification(true);
          showToast('Vous utilisez déjà la dernière version!', 'success', 3000);
          // Auto-hide after 4 seconds
          setTimeout(() => setShowNotification(false), 4000);
          break;
        case 'update_download_progress':
          setStatus('downloading');
          setProgress(Math.round(data.percent || 0));
          setDownloadSpeed(Math.round((data.bytesPerSecond || 0) / 1024)); // KB/s
          setShowNotification(true);
          break;
        case 'update_downloaded':
          setStatus('downloaded');
          setShowNotification(true);
          showToast('Mise à jour téléchargée! Cliquez pour installer.', 'success', 8000);
          break;
        case 'update_error':
          setStatus('error');
          setErrorMessage(typeof data === 'string' ? data : data?.message || 'Erreur inconnue');
          setShowNotification(true);
          showToast('Erreur lors de la vérification des mises à jour', 'error', 5000);
          // Auto-hide error after 8 seconds
          setTimeout(() => setShowNotification(false), 8000);
          console.error('Update Error:', data);
          break;
        default:
          break;
      }
    });

    return () => unsubscribe();
  }, [showToast]);

  const handleInstall = () => {
    if (window.electron && window.electron.updates) {
      window.electron.updates.quitAndInstall();
    }
  };

  const handleClose = () => {
    setShowNotification(false);
  };

  if (!showNotification) return null;

  // Get status-specific styling
  const getStatusConfig = () => {
    switch (status) {
      case 'checking':
        return {
          bgColor: 'bg-blue-500',
          icon: <ArrowPathIcon className="w-5 h-5 animate-spin text-white" />,
          title: 'Vérification des mises à jour...',
          subtitle: 'Veuillez patienter',
        };
      case 'available':
        return {
          bgColor: 'bg-amber-500',
          icon: <ArrowDownTrayIcon className="w-5 h-5 text-white" />,
          title: `Nouvelle version ${updateInfo?.version}`,
          subtitle: 'Téléchargement démarré automatiquement',
        };
      case 'downloading':
        return {
          bgColor: 'bg-indigo-500',
          icon: <ArrowDownTrayIcon className="w-5 h-5 text-white animate-bounce" />,
          title: 'Téléchargement en cours',
          subtitle: `${progress}% • ${downloadSpeed} KB/s`,
        };
      case 'downloaded':
        return {
          bgColor: 'bg-green-500',
          icon: <CheckCircleIcon className="w-5 h-5 text-white" />,
          title: `Version ${updateInfo?.version} prête`,
          subtitle: 'Cliquez pour installer maintenant',
        };
      case 'up-to-date':
        return {
          bgColor: 'bg-emerald-500',
          icon: <CheckCircleIcon className="w-5 h-5 text-white" />,
          title: 'Vous êtes à jour!',
          subtitle: `Version ${updateInfo?.version || 'actuelle'} est la dernière`,
        };
      case 'error':
        return {
          bgColor: 'bg-red-500',
          icon: <ExclamationTriangleIcon className="w-5 h-5 text-white" />,
          title: 'Erreur de mise à jour',
          subtitle: errorMessage || 'Impossible de vérifier les mises à jour',
        };
      default:
        return null;
    }
  };

  const config = getStatusConfig();
  if (!config) return null;

  return (
    <div className="fixed top-16 right-4 z-[150] max-w-xs w-full transition-all duration-300 ease-in-out transform animate-in fade-in slide-in-from-right-5">
      <div className={`${config.bgColor} text-white rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className="p-3 flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg flex-shrink-0">
            {config.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold truncate">{config.title}</h3>
            <p className="text-xs opacity-90 truncate">{config.subtitle}</p>
          </div>
          {status !== 'downloading' && (
            <button 
              onClick={handleClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {status === 'downloading' && (
          <div className="px-3 pb-3">
            <div className="w-full bg-white/30 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Install Button */}
        {status === 'downloaded' && (
          <div className="px-3 pb-3">
            <button
              onClick={handleInstall}
              className="w-full py-2 bg-white text-green-600 font-bold rounded-lg hover:bg-green-50 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Installer et Redémarrer
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
