import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Form } from '../components/forms/Form';
import { Input } from '../components/forms/FormFields';
import { Button } from '../components/common/Button';
import { authAPI } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { useFormSubmission } from '../hooks/useFormSubmission';
import { loginSchema } from '../utils/validationSchemas';
import { EyeIcon, EyeSlashIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import logo from '../assets/logo.png';

// interface LoginFormData {
//   username;
//   password;
// }

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const { isSubmitting, error, submit } = useFormSubmission({
    // successMessage: 'Login successful',
    // errorMessage: 'Login failed',
  });

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleSubmit = async (data) => {
    const result = await submit(async () => {
      const response = await authAPI.login({
        username: data.username,
        password: data.password,
      });
      const { access, refresh } = response.data;

      const userResponse = await authAPI.getUserWithToken(access);
      const user = userResponse.data;

      login(access, refresh, user, data.rememberMe);

      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    });

    return result;
  };

  return (
    <div className="min-h-full flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-primary-500 via-primary-600 to-secondary-600 relative overflow-hidden">
        {/* Background patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-secondary-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-primary-400/20 rounded-full blur-2xl" />
        </div>
        
        {/* Floating elements */}
        <div className="absolute top-1/4 left-1/4 w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-sm animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-16 h-16 bg-white/10 rounded-xl backdrop-blur-sm animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-12 h-12 bg-white/10 rounded-lg backdrop-blur-sm animate-float" style={{ animationDelay: '2s' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <div className="mb-8">
            <div className="aspect-ratio-box aspect-ratio-1-1 w-20 bg-white shadow-xl rounded-2xl flex items-center justify-center mb-6">
              <img src={logo} alt="Logo" className="w-[80%] h-[80%] object-contain mx-auto my-auto" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
              PhoneMAG
            </h1>
            <p className="text-xl text-white/80 max-w-md">
              La solution complète de gestion de magasin de téléphones. Suivez le stock, gérez les ventes et développez votre activité.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-4 mt-8">
            {[
              'Suivi du stock en temps réel',
              'Analyses complètes des ventes',
              'Gestion de la relation client',
              'Rapports financiers détaillés',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/90">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-[var(--spacing-md)] sm:p-12 bg-gradient-to-br from-slate-50 to-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="aspect-ratio-box aspect-ratio-1-1 w-16 bg-white shadow-md rounded-2xl flex items-center justify-center mx-auto mb-4">
              <img src={logo} alt="Logo" className="w-[75%] h-[75%] object-contain mx-auto my-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gradient">PhoneMag</h1>
          </div>

          {/* Form header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
              Bon retour
            </h2>
            <p className="text-slate-500">
              Entrez vos identifiants pour accéder à votre compte
            </p>
          </div>

          {/* Login form */}
          <Form
            schema={loginSchema}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {({ register, formState: { errors } }) => (
              <>
                <Input
                  label="Email ou nom d'utilisateur"
                  type="text"
                  placeholder="Entrez votre email ou nom d'utilisateur"
                  {...register('username')}
                  error={errors.username}
                  required
                />

                <div className="relative">
                  <Input
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Entrez votre mot de passe"
                    {...register('password')}
                    error={errors.password}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-[38px] text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-400 rounded p-1"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-primary-600 bg-white border-2 border-slate-300 rounded focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
                      {...register('rememberMe')}
                    />
                    <span className="text-sm text-slate-600 group-hover:text-slate-900">
                      Se souvenir de moi
                    </span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400 rounded px-1"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>

                {error && (
                  <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl" role="alert">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-danger-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-danger-800">Échec de la connexion</p>
                        <p className="text-sm text-danger-600">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  fullWidth 
                  size="lg"
                  className="mt-2"
                >
                  {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
                </Button>
              </>
            )}
          </Form>

          {/* Footer */}
          <p className="text-center text-xs text-slate-400 mt-8">
            &copy; {new Date().getFullYear()} PhoneMag. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

