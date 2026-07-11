import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    pin: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    }
    if (!formData.pin.trim()) {
      newErrors.pin = "Le code PIN est requis";
    } else if (formData.pin.length !== 6) {
      newErrors.pin = "Le code PIN doit comporter 6 chiffres";
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
      const response = await authAPI.forgotPassword({
        username: formData.username.trim(),
        pin: formData.pin.trim(),
      });
      
      // Navigate to reset password page with the token
      navigate(`/reset-password?token=${response.data.token}`);
    } catch (error) {
      console.error("Erreur réinitialisation:", error);
      console.error("Détails erreur:", error.response?.data);
      
      const apiErrors = error.response?.data;
      const newErrors = {};
      
      if (apiErrors) {
        // Gérer les erreurs de champs spécifiques
        if (apiErrors.username) {
          newErrors.username = Array.isArray(apiErrors.username) ? apiErrors.username[0] : apiErrors.username;
        }
        if (apiErrors.pin) {
          newErrors.pin = Array.isArray(apiErrors.pin) ? apiErrors.pin[0] : apiErrors.pin;
        }
        // Si pas d'erreur de champs, utiliser le message général
        if (Object.keys(newErrors).length === 0) {
          if (apiErrors.detail) {
            newErrors.general = apiErrors.detail;
          } else if (typeof apiErrors === 'string') {
            newErrors.general = apiErrors;
          } else {
            newErrors.general = "Échec de la validation. Vérifiez vos informations.";
          }
        }
      } else if (error.message) {
        newErrors.general = `Erreur réseau : ${error.message}`;
      } else {
        newErrors.general = "Erreur inconnue lors de la réinitialisation.";
      }
      
      setErrors(newErrors);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Récupération de compte
          </h2>
        </div>
        <form className="mt-8 space-y-[var(--spacing-md)]" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Nom d'utilisateur"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              required
              placeholder="Entrez votre nom d'utilisateur"
            />
            
            <Input
              label="Code PIN Développeur"
              name="pin"
              type="password"
              maxLength={6}
              value={formData.pin}
              onChange={handleChange}
              error={errors.pin}
              required
              placeholder="Entrez les 6 chiffres"
            />
          </div>

          {errors.general && (
            <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-2 rounded">
              {errors.general}
            </div>
          )}

          <div>
            <Button type="submit" loading={loading} className="w-full">
              {loading ? 'Validation en cours...' : 'Valider'}
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

export default ForgotPassword;

