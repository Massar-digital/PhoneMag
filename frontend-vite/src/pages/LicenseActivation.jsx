import React, { useState, useEffect } from 'react';
import { KeyIcon, ComputerDesktopIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useToast } from '../context/ToastContext';

const LicenseActivation = () => {
  const [licenseKey, setLicenseKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [machineId, setMachineId] = useState('Chargement...');
  const { showToast } = useToast();

  useEffect(() => {
    const fetchMachineId = async () => {
      try {
        const id = await window.electron.license.getMachineId();
        setMachineId(id);
      } catch (err) {
        setMachineId('Erreur fingerprint');
      }
    };
    fetchMachineId();
  }, []);

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      showToast('Veuillez entrer une clé de licence valide.', 'error');
      return;
    }

    setIsActivating(true);
    try {
      const result = await window.electron.license.activate(licenseKey.trim());
      if (result.success) {
        showToast('Licence activée avec succès ! Redémarrage...', 'success');
        setTimeout(() => {
          if (window.electron && window.electron.versions && window.electron.versions.relaunch) {
            window.electron.versions.relaunch();
          } else {
            window.location.reload();
          }
        }, 2000);
      } else {
        showToast(result.message || "Erreur d'activation", 'error');
      }
    } catch (err) {
      showToast("Erreur de connexion au serveur de licence.", "error");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <KeyIcon className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Activation de PhoneMAG</h1>
          <p className="text-slate-400 text-sm">
            Une licence valide est requise pour utiliser cette application sur ce poste.
          </p>
        </div>

        <form onSubmit={handleActivate} className="space-y-[var(--spacing-md)]">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Clé de Licence
            </label>
            <div className="relative">
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Entrez votre clé de licence"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={isActivating}
              />
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 text-slate-400 text-xs">
              <ComputerDesktopIcon className="w-4 h-4" />
              <span className="font-mono">Fingerprint : {machineId}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isActivating || !licenseKey}
            className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
              isActivating || !licenseKey
                ? 'bg-slate-700 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 active:scale-[0.98] shadow-lg shadow-blue-500/20'
            }`}
          >
            {isActivating ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Activation en cours...
              </div>
            ) : (
              'Activer la Licence'
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-slate-500 leading-normal">
              Cette licence sera liée à ce matériel de manière permanente.
              Une connexion internet est requise uniquement lors de l'activation et de la vérification périodique.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseActivation;

