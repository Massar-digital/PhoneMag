import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form } from '../components/forms/Form';
import { Input, Checkbox } from '../components/forms/FormFields';
import { Button } from '../components/common/Button';
import { authAPI } from '../services/api';
import { useFormSubmission } from '../hooks/useFormSubmission';
import { registerSchema } from '../utils/validationSchemas';

// interface RegisterFormData {
//   username;
//   email;
//   password;
//   confirmPassword;
//   first_name;
//   last_name;
// }

const Register = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { isSubmitting, error, submit } = useFormSubmission({
    // successMessage: 'Compte créé avec succès ! Veuillez vous connecter.',
    // errorMessage: 'L\'inscription a échoué. Veuillez réessayer.',
    // onSuccess: () => {
      // Redirect to login after successful registration
      // setTimeout(() => navigate('/login'), 2000);
    // },
  });

  const handleSubmit = async (data) => {
    if (!acceptTerms) {
      throw new Error('Vous devez accepter les conditions générales');
    }

    return submit(async () => {
      await authAPI.register({
        // username: data.username,
        // email: data.email,
        // password: data.password,
        // first_name: data.first_name,
        // last_name: data.last_name,
      });
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Créer votre compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Ou{' '}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>

        <Form
          schema={registerSchema}
          onSubmit={handleSubmit}
          className="mt-8 space-y-[var(--spacing-md)]"
        >
          {({ register, formState: { errors } }) => (
            <>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Prénom"
                    type="text"
                    {...register('first_name')}
                    error={errors.first_name}
                  />
                  <Input
                    label="Nom"
                    type="text"
                    {...register('last_name')}
                    error={errors.last_name}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  {...register('email')}
                  error={errors.email}
                  required
                />

                <Input
                  label="Nom d'utilisateur"
                  type="text"
                  {...register('username')}
                  error={errors.username}
                  required
                />

                <div className="relative">
                  <Input
                    label="Mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    error={errors.password}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Confirmer le mot de passe"
                    type={showConfirmPassword ? 'text' : 'password'}
                    {...register('confirmPassword')}
                    error={errors.confirmPassword}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? 'Masquer' : 'Afficher'}
                  </button>
                </div>
              </div>

              <Checkbox
                label={
                  <>
                    J'accepte les{' '}
                    <span className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                      Conditions Générales d'Utilisation
                    </span>
                  </>
                }
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
              />

              {error && (
                <div className="text-red-600 text-sm text-center dark:text-red-400">{error}</div>
              )}

              <div>
                <Button type="submit" disabled={isSubmitting || !acceptTerms} className="w-full">
                  {isSubmitting ? 'Création du compte...' : 'Créer un compte'}
                </Button>
              </div>
            </>
          )}
        </Form>
      </div>
    </div>
  );
};

export default Register;

