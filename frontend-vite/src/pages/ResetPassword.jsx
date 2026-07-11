import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { authAPI } from '../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      setErrors({ general: 'Jeton de réinitialisation manquant. Veuillez recommencer le processus.' });
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors on change
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer votre mot de passe';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!token) {
      newErrors.general = 'Jeton de réinitialisation invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      console.log('Sending password reset request with:', {
        token,
        password: formData.password,
        password_confirm: formData.confirmPassword,
      });
      
      await authAPI.resetPassword({
        token,
        password: formData.password,
        password_confirm: formData.confirmPassword,
      });

      // Success - redirect to login with success message
      navigate('/login?reset=success');
    } catch (error) {
      console.error('Password reset error:', error.response?.data);
      console.error('Full error details:', JSON.stringify(error.response?.data, null, 2));
      const apiErrors = error.response?.data;
      if (apiErrors) {
        const newErrors = {};
        Object.keys(apiErrors).forEach(key => {
          const errorMsg = Array.isArray(apiErrors[key]) ? apiErrors[key][0] : apiErrors[key];
          console.error(`${key}: ${errorMsg}`);
          newErrors[key] = errorMsg;
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: 'Échec de la réinitialisation du mot de passe. Veuillez réessayer.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Réinitialiser votre mot de passe
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Entrez votre nouveau mot de passe ci-dessous.
          </p>
        </div>
        <form className="mt-8 space-y-[var(--spacing-md)]" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="relative">
              <Input
                label="Nouveau mot de passe"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="relative">
              <Input
                label="Confirmez le nouveau mot de passe"
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          {errors.general && (
            <div className="text-red-600 text-sm text-center">{errors.general}</div>
          )}

          <div>
            <Button type="submit" loading={loading} className="w-full">
                {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
            </Button>
          </div>

          <div className="text-center">
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

