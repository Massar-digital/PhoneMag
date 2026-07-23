import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast, Toaster } from 'react-hot-toast';
import logo from '../assets/logo.png';

const LicenseActivation = () => {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const result = await window.electronAPI.activateLicense(data.code);

      if (result.valid) {
        localStorage.setItem('license_code', data.code);
        toast.success('License activated successfully');
        await window.electronAPI.notifyLicenseActivated(data.code);
        return;
      }

      if (result.error && result.error.toLowerCase().includes('not found')) {
        setServerError('Invalid license code. Please check and try again.');
      } else if (result.error) {
        setServerError(`This code is already in use. ${result.error}`);
      }
    } catch {
      setServerError('Could not reach the license server. Check your internet connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-950 flex items-center justify-center p-4">
      <Toaster position="top-center" toastOptions={{ style: { background: '#1e293b', color: '#fff', border: '1px solid #334155' } }} />
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-8">
          <img src={logo} alt="PhoneMag" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Activate your license</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={8}
              placeholder="Enter your license code"
              autoComplete="off"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 px-4 text-white placeholder-slate-500 font-mono text-center text-lg tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase disabled:opacity-50"
              disabled={isSubmitting}
              {...register('code', { required: true, minLength: 8, maxLength: 8 })}
              onChange={(e) => setValue('code', e.target.value.toUpperCase(), { shouldValidate: true })}
            />
          </div>

          {serverError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg" role="alert">
              <p className="text-sm text-red-400">{serverError}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Activating...
              </>
            ) : (
              'Activate'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LicenseActivation;
