import React, { useState } from 'react';
import { api } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const Welcome = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    // Shop info
    shop_name: '',
    shop_phone: '',
    shop_address: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (!formData.shop_name || !formData.shop_phone || !formData.shop_address) {
      toast.error('Les informations de la boutique sont obligatoires');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/setup/admin/', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name,
        // Shop info
        shop_name: formData.shop_name,
        shop_phone: formData.shop_phone,
        shop_address: formData.shop_address
      });
      
      toast.success('Compte administrateur et boutique créés !');
      onComplete();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {step === 1 ? (
          <div className="bg-slate-800 rounded-2xl p-10 shadow-2xl border border-slate-700 text-center transform transition-all">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/20">
              <span className="text-4xl text-white">✨</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-4">Bienvenue sur PhoneMAG</h1>
            <p className="text-slate-400 text-lg mb-10 leading-relaxed">
              Le système a été installé avec succès. Avant de commencer à gérer votre magasin de téléphones, 
              nous devons créer votre compte administrateur principal.
            </p>
            <button 
              onClick={() => setStep(2)}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40"
            >
              C'EST PARTI !
            </button>
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
            <div className="bg-slate-700/50 p-[var(--spacing-md)] border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">Configuration Initiale</h2>
              <p className="text-slate-400 text-sm">Configurez votre boutique et créez votre compte administrateur.</p>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-8 space-y-5">
              {/* Shop Information Section */}
              <div className="pb-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4">Informations de la Boutique</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-400">Nom de la Boutique *</label>
                    <input 
                      required name="shop_name" type="text"
                      onChange={handleChange}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: PhoneMAG Store"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-sm font-medium text-slate-400">Numéro de Téléphone *</label>
                      <input 
                        required name="shop_phone" type="tel"
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: 0550660064"
                      />
                    </div>
                    <div className="space-y-2 col-span-2 sm:col-span-1">
                      <label className="text-sm font-medium text-slate-400">Adresse *</label>
                      <input 
                        required name="shop_address" type="text"
                        onChange={handleChange}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="Ex: 123 Rue Principale, Alger"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Account Section */}
              <div className="pt-2">
                <h3 className="text-lg font-semibold text-white mb-4">Compte Administrateur</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-400">Nom Complet</label>
                  <input 
                    required name="full_name" type="text"
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: John Doe"
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-400">Nom d'utilisateur</label>
                  <input 
                    required name="username" type="text"
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="ex: admin"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Email (optionnel)</label>
                <input 
                  name="email" type="email"
                  onChange={handleChange}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin@votre-boutique.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-400">Mot de passe</label>
                  <input 
                    required name="password" type="password"
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium text-slate-400">Confirmer</label>
                  <input 
                    required name="confirmPassword" type="password"
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/40 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'CRÉATION EN COURS...' : 'TERMINER LA CONFIGURATION'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full mt-3 text-slate-500 text-sm hover:text-slate-300 transition-colors"
                >
                  Retour
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Welcome;

