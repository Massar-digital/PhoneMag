import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { Form } from '../components/forms/Form';
import { Input, FormInput, Textarea, Select, RadioGroup, FormActions } from '../components/forms/FormFields';
import { authAPI, getPublicUrl } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useShopSettings, useUpdateShopSettings, useUploadShopLogo, useDeleteShopLogo } from '../hooks/useShop';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUsers';

import { shopSettingsSchema, userCreateSchema, userUpdateSchema } from '../utils/validationSchemas';
import { useFormSubmission } from '../hooks/useFormSubmission';
// import { AccessibilitySettings } from '../components/accessibility/AccessibilitySettings';

import { 
  UserCircleIcon, 
  KeyIcon, 
  BuildingStorefrontIcon, 
  UsersIcon,
  CpuChipIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import packageJson from '../../package.json';

const Settings = () => {
  const { user, updateUser } = useAuth();
  const { setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  
  const [hasCustomWarranty, setHasCustomWarranty] = useState(false);

  // Check if user has admin/manager role for user management access
  const canManageUsers = user?.user_role?.is_admin || user?.user_role?.is_manager || user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (window.electron && window.electron.warranty) {
      window.electron.warranty.checkCustom().then(setHasCustomWarranty);
    }
  }, []);

  // Profile form state
  const [profileData, setProfileData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Profile picture state
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Shop settings state
  const [shopData, setShopData] = useState({
    name: '',
    email: '',
    phone: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    currency_symbol: '',
    tax_rate: 0,
    invoice_footer: '',
    website: '',
    instagram_handle: '',
  });
  const [shopLogo, setShopLogo] = useState(null);
  const [shopLogoPreview, setShopLogoPreview] = useState(null);

  // Shop hooks
  const { data: shopSettings, isLoading: shopLoading } = useShopSettings();
  const updateShopMutation = useUpdateShopSettings();
  const uploadLogoMutation = useUploadShopLogo();
  const deleteLogoMutation = useDeleteShopLogo();

  // User management state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showResetWarrantyConfirm, setShowResetWarrantyConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'salesperson',
  });

  // User management hooks - only load if user has permission
  const { data: usersData, isLoading: usersLoading } = useUsers(canManageUsers ? {} : undefined);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  useEffect(() => {
    if (shopSettings) {
      setShopData({
        name: shopSettings.data?.name || '',
        email: shopSettings.data?.email || '',
        phone: shopSettings.data?.phone || '',
        address_line_1: shopSettings.data?.address_line_1 || '',
        address_line_2: shopSettings.data?.address_line_2 || '',
        city: shopSettings.data?.city || '',
        state: shopSettings.data?.state || '',
        postal_code: shopSettings.data?.postal_code || '',
        country: shopSettings.data?.country || '',
        currency_symbol: shopSettings.data?.currency_symbol || '',
        tax_rate: shopSettings.data?.tax_rate || 0,
        invoice_footer: shopSettings.data?.invoice_footer || '',
        website: shopSettings.data?.website || '',
        instagram_handle: shopSettings.data?.instagram_handle || '',
      });
      if (shopSettings.data?.logo) {
        setShopLogoPreview(getPublicUrl(shopSettings.data.logo));
      }
    }
  }, [shopSettings]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await authAPI.updateProfile(profileData);
      updateUser(response.data);
      setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
    } catch (error) {
      console.error('Profile update error:', error.response?.data);
      let errorMsg = 'Échec de la mise à jour du profil';
      if (error.response?.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          errorMsg = Object.entries(data)
            .map(([field, errors]) => {
              const errorList = Array.isArray(errors) ? errors.join(', ') : errors;
              return `${field}: ${errorList}`;
            })
            .join('; ');
        } else if (typeof data === 'string') {
          errorMsg = data;
        }
      }
      setMessage({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: 'Les nouveaux mots de passe ne correspondent pas' });
      setLoading(false);
      return;
    }

    try {
      await authAPI.changePassword({
        old_password: passwordData.current_password,
        new_password: passwordData.new_password,
        new_password_confirm: passwordData.confirm_password,
      });

      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });

      setMessage({ type: 'success', text: 'Mot de passe changé avec succès !' });
    } catch (error) {
      console.error('Password change error:', error.response?.data);
      const errorMsg = error.response?.data?.old_password?.[0] || 
                      error.response?.data?.new_password?.[0] || 
                      error.response?.data?.new_password_confirm?.[0] ||
                      error.response?.data?.message || 
                      'Échec du changement de mot de passe';
      setMessage({
        type: 'error',
        text: errorMsg
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicturePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfilePictureUpload = async () => {
    if (!profilePicture) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await authAPI.uploadProfilePicture(profilePicture);
      
      // Update the user data in AuthContext
      if (updateUser) {
        const updatedUserResponse = await authAPI.getUser();
        updateUser(updatedUserResponse.data);
      }
      
      setProfilePicture(null);
      setProfilePicturePreview(null);
      setMessage({ 
        type: 'success', 
        text: 'Photo de profil téléchargée avec succès !' 
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Échec du téléchargement de la photo de profil'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShopSettingsUpdate = async (data) => {
    try {
      await updateShopMutation.mutateAsync(data);
      setMessage({ type: 'success', text: 'Paramètres de la boutique mis à jour !' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Échec de la mise à jour des paramètres' });
    }
  };

  const handleShopLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setShopLogo(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setShopLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleShopLogoUpload = async () => {
    if (!shopLogo) return;

    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('logo', shopLogo);
      await uploadLogoMutation.mutateAsync(formData);
      setShopLogo(null);
      setMessage({ type: 'success', text: 'Logo de la boutique téléchargé avec succès !' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Échec du téléchargement du logo'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleShopLogoDelete = async () => {
    if (!shopSettings.data.logo) return;

    setLoading(true);
    setMessage(null);

    try {
      await deleteLogoMutation.mutateAsync();
      setShopLogoPreview(null);
      setMessage({ type: 'success', text: 'Logo supprimé avec succès !' });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Échec de la suppression du logo'
      });
    } finally {
      setLoading(false);
    }
  };

  // User management functions
  const handleAddUser = () => {
    setUserFormData({
      // username: '',
      // email: '',
      // password: '',
      // first_name: '',
      // last_name: '',
      // role: 'salesperson',
    });
    setEditingUser(null);
    setShowAddUserModal(true);
  };

  const handleEditUser = (user) => {
    setUserFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.user_role?.role || 'salesperson',
    });
    setEditingUser(user);
    setShowAddUserModal(true);
  };

  const handleDeleteUser = (userId) => {
    setUserToDelete(userId);
    setShowDeleteUserConfirm(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
      setShowDeleteUserConfirm(false);
      setUserToDelete(null);
    }
  };

  const handleUserFormSubmit = async (data) => {
    try {
      if (editingUser) {
        await updateUserMutation.mutateAsync({ id: editingUser.id, data });
      } else {
        await createUserMutation.mutateAsync(data);
      }
      setShowAddUserModal(false);
      setMessage({ type: 'success', text: `Utilisateur ${editingUser ? 'mis à jour' : 'ajouté'} avec succès` });
    } catch (error) {
      setMessage({ type: 'error', text: "Échec de l'opération sur l'utilisateur" });
    }
  };

  const handleUserFormChange = (field, value) => {
    setUserFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImportWarranty = async () => {
    if (!window.electron || !window.electron.warranty) return;
    
    setLoading(true);
    const result = await window.electron.warranty.importPDF();
    setLoading(false);
    
    if (result.success) {
      setHasCustomWarranty(true);
      setMessage({ type: 'success', text: 'Modèle de garantie personnalisé importé avec succès' });
    } else if (result.message !== 'Annulé') {
      setMessage({ type: 'error', text: 'Échec de l\'importation: ' + result.message });
    }
  };

  const handleOpenWarranty = async () => {
    if (!window.electron || !window.electron.warranty) {
      setMessage({ type: 'error', text: 'Fonctionnalité disponible uniquement sur la version bureau.' });
      return;
    }
    
    try {
      setMessage({ type: 'info', text: 'Ouverture du document...' });
      const result = await window.electron.warranty.openCustom();
      if (!result.success) {
        setMessage({ type: 'error', text: result.message });
      } else {
        // Clear info message after a delay
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Impossible d\'ouvrir le fichier.' });
    }
  };

  const handleResetWarranty = async () => {
    if (!window.electron || !window.electron.warranty) return;
    setShowResetWarrantyConfirm(true);
  };

  const confirmResetWarranty = async () => {
    setShowResetWarrantyConfirm(false);
    setLoading(true);
    const result = await window.electron.warranty.resetToDefault();
    setLoading(false);
    
    if (result.success) {
      setHasCustomWarranty(false);
      setMessage({ type: 'success', text: 'Retour au modèle par défaut effectué' });
    }
  };

  const handleBackup = async () => {
    if (!window.electron) {
      setMessage({ type: 'error', text: "La sauvegarde n'est disponible que sur la version de bureau." });
      return;
    }
    setLoading(true);
    try {
      const result = await window.electron.database.backup();
      if (result.success) {
        setMessage({ type: 'success', text: "Sauvegarde effectuée avec succès (db.sqlite3.bak)" });
      } else {
        setMessage({ type: 'error', text: `Erreur: ${result.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erreur lors de la sauvegarde." });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!window.electron) return;
    setLoading(true);
    try {
      const result = await window.electron.database.restore();
      if (result.success) {
        setMessage({ type: 'success', text: "Restauration réussie. Redémarrage..." });
        setTimeout(() => {
          window.electron.versions.relaunch();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: `Erreur: ${result.message}` });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Erreur lors de la restauration." });
    } finally {
      setLoading(false);
      setShowRestoreConfirm(false);
    }
  };

  const roleLabels = {
    'admin': 'Administrateur',
    'manager': 'Gestionnaire',
    'salesperson': 'Vendeur'
  };

  const tabs = [
    { id: 'profile', label: 'Paramètres du Profil', icon: '👤' },
    { id: 'password', label: 'Changer le Mot de Passe', icon: '🔒' },
    { id: 'picture', label: 'Photo de Profil', icon: '📷' },
    // { id: 'accessibility', label: 'Accessibilité', icon: '♿' },
    { id: 'shop', label: 'Paramètres de la Boutique', icon: '🏪' },
    { id: 'system', label: 'Système', icon: '⚙️' },
  ];

  return (
    <div className="app-container space-y-[var(--spacing-md)]">
      {/* Header */}
      <div className="flex-responsive">
        <div>
          <h1 className="text-slate-900">Paramètres</h1>
          <p className="text-slate-600">Gérez les paramètres de votre compte et vos préférences</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-success-50 text-success-800 border border-success-200' : 'bg-danger-50 text-danger-800 border border-danger-200'}`}>
          {message.text}
        </div>
      )}

      {/* Settings Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-none md:flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-[var(--spacing-md)]">
        {/* Profile Settings */}
        {activeTab === 'profile' && (
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-bold mb-6">Informations du Profil</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-[var(--spacing-sm)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'utilisateur
                </label>
                <Input
                  type="text"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                  placeholder="Entrez votre nom d'utilisateur"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom
                  </label>
                  <Input
                    type="text"
                    value={profileData.first_name}
                    onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                    placeholder="Entrez votre prénom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom
                  </label>
                  <Input
                    type="text"
                    value={profileData.last_name}
                    onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                    placeholder="Entrez votre nom"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse E-mail
                </label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="Entrez votre adresse e-mail"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Mise à jour...' : 'Mettre à jour le profil'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Change Password */}
        {activeTab === 'password' && (
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-bold mb-6">Changer le Mot de Passe</h2>
            <form onSubmit={handlePasswordChange} className="space-y-[var(--spacing-sm)]">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe actuel
                </label>
                <Input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Entrez votre mot de passe actuel"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe
                </label>
                <Input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Entrez votre nouveau mot de passe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <Input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirmez votre nouveau mot de passe"
                  required
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Modification...' : 'Changer le mot de passe'}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Profile Picture */}
        {activeTab === 'picture' && (
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-bold mb-6">Photo de Profil</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-6">
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  {profilePicturePreview ? (
                    <img
                      src={profilePicturePreview}
                      alt="Aperçu du profil"
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl text-gray-500">
                      {user.first_name?.[0] || user.username?.[0] || 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                    className="hidden"
                    id="profile-picture"
                  />
                  <label
                    htmlFor="profile-picture"
                    className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Choisir un fichier
                  </label>
                  {profilePicture && (
                    <p className="mt-2 text-sm text-gray-600">
                      Sélectionné : {profilePicture.name}
                    </p>
                  )}
                </div>
              </div>

              {profilePicture && (
                <div className="flex justify-end">
                  <Button onClick={handleProfilePictureUpload} disabled={loading}>
                    {loading ? 'Téléchargement...' : "Télécharger l'image"}
                  </Button>
                </div>
              )}

              <div className="text-sm text-gray-600">
                <p>Recommandé : Image carrée, au moins 200x200 pixels</p>
                <p>Formats supportés : JPG, PNG, GIF (max 5 Mo)</p>
              </div>
            </div>
          </Card>
        )}

        {/* Accessibility Settings */}
        {/* {activeTab === 'accessibility' && (
          <Card className="p-[var(--spacing-md)]">
            <AccessibilitySettings />
          </Card>
        )} */}

        {/* Preferences removed */}

        {/* Shop Settings */}
        {activeTab === 'shop' && (
          <div className="space-y-[var(--spacing-md)]">
            {/* Shop Logo */}
            <Card className="p-[var(--spacing-md)]">
              <h2 className="text-xl font-bold mb-6">Logo de la Boutique</h2>
              <div className="space-y-[var(--spacing-md)]">
                <div className="flex-responsive items-center gap-[var(--spacing-md)]">
                  <div className="w-24 h-24 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-inner">
                    {shopLogoPreview ? (
                      <img
                        src={shopLogoPreview}
                        alt="Aperçu du logo"
                        className="w-24 h-24 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="text-2xl text-gray-500">🏪</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleShopLogoChange}
                      className="hidden"
                      id="shop-logo"
                    />
                    <label
                      htmlFor="shop-logo"
                      className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Choisir le fichier du logo
                    </label>
                    {shopLogo && (
                      <p className="mt-2 text-sm text-gray-600">
                        Sélectionné : {shopLogo.name}
                      </p>
                    )}
                    {shopSettings?.data?.logo && !shopLogo && (
                      <p className="mt-2 text-sm text-green-600">
                        Logo actuel chargé
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex space-x-4">
                  {shopLogo && (
                    <Button onClick={handleShopLogoUpload} disabled={loading || uploadLogoMutation.isPending}>
                      {loading || uploadLogoMutation.isPending ? 'Téléchargement...' : 'Télécharger le logo'}
                    </Button>
                  )}
                  {shopSettings?.data?.logo && (
                    <Button
                      variant="danger"
                      onClick={handleShopLogoDelete}
                      disabled={loading || deleteLogoMutation.isPending}
                    >
                      {loading || deleteLogoMutation.isPending ? 'Suppression...' : 'Supprimer le logo'}
                    </Button>
                  )}
                </div>

                <div className="text-sm text-gray-600">
                  <p>Recommandé : Image carrée, au moins 200x200 pixels</p>
                  <p>Formats supportés : JPG, PNG, GIF (max 5 Mo)</p>
                </div>
              </div>
            </Card>

            {/* Warranty Template Management */}
            {window.electron && (
              <Card className="p-[var(--spacing-md)]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Modèle de Garantie</h2>
                    <p className="text-sm text-gray-500">Personnalisez le document de garantie imprimé pour vos clients</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-[var(--spacing-md)] border border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="font-medium text-gray-900">
                        État : {hasCustomWarranty ? (
                          <span className="text-green-600 flex items-center gap-1 inline-flex">
                            <CheckCircleIcon className="w-4 h-4" /> Personnalisé (actif)
                          </span>
                        ) : (
                          <span className="text-blue-600 flex items-center gap-1 inline-flex">
                            <InformationCircleIcon className="w-4 h-4" /> Par défaut logiciel
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-600">
                        {hasCustomWarranty 
                          ? "L'application utilise votre fichier PDF personnalisé pour l'impression des garanties."
                          : "L'application utilise le modèle standard intégré au logiciel."}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      <Button 
                        variant="secondary" 
                        onClick={handleImportWarranty}
                        disabled={loading}
                      >
                        {hasCustomWarranty ? "Remplacer le PDF" : "Importer un PDF personnalisé"}
                      </Button>
                      
                      {hasCustomWarranty && (
                        <>
                          <Button 
                            variant="outline" 
                            onClick={handleOpenWarranty}
                            disabled={loading}
                            icon={<EyeIcon className="w-4 h-4" />}
                          >
                            Visualiser le fichier
                          </Button>
                          <Button 
                            variant="danger" 
                            onClick={handleResetWarranty}
                            disabled={loading}
                          >
                            Réinitialiser par défaut
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-800 space-y-1">
                      <p className="font-bold uppercase">Note importante :</p>
                      <p>Si vous utilisez un PDF personnalisé, assurez-vous qu'il s'agit d'un document au format A4.</p>
                      <p>Le bouton "Garantie" dans le point de vente imprimera directement ce fichier.</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Shop Information */}
            <Card className="p-[var(--spacing-md)]">
              <h2 className="text-xl font-semibold mb-4">Informations de la Boutique</h2>
              {shopLoading ? (
                <div className="text-center py-8">Chargement des paramètres...</div>
              ) : (
                <Form
                  schema={shopSettingsSchema}
                  onSubmit={handleShopSettingsUpdate}
                  defaultValues={{
                    name: shopData?.name || '',
                    email: shopData?.email || '',
                    phone: shopData?.phone || '',
                    address_line_1: shopData?.address_line_1 || '',
                    address_line_2: shopData?.address_line_2 || '',
                    city: shopData?.city || '',
                    state: shopData?.state || '',
                    postal_code: shopData?.postal_code || '',
                    country: shopData?.country || '',
                    currency_symbol: shopData?.currency_symbol || '',
                    website: shopData?.website || '',
                    instagram_handle: shopData?.instagram_handle || '',
                    invoice_footer: shopData?.invoice_footer || '',
                  }}
                >
                  {({ register, formState: { errors, isSubmitting } }) => (
                    <div className="space-y-[var(--spacing-md)]">
                      {/* Basic Information */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                          <FormInput
                            {...register('name')}
                            label="Nom de la Boutique"
                            error={errors.name}
                            required
                          />
                        </div>
                        <FormInput
                          {...register('email')}
                          label="Adresse E-mail"
                          type="email"
                          error={errors.email}
                        />
                        <FormInput
                          {...register('phone')}
                          label="Numéro de Téléphone"
                          type="tel"
                          error={errors.phone}
                          required
                        />
                      </div>

                      {/* Address Information */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Adresse</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="md:col-span-2">
                            <FormInput
                              {...register('address_line_1')}
                              label="Adresse Ligne 1"
                              error={errors.address_line_1}
                              required
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormInput
                              {...register('address_line_2')}
                              label="Adresse Ligne 2"
                              error={errors.address_line_2}
                            />
                          </div>
                          <FormInput
                            {...register('city')}
                            label="Ville"
                            error={errors.city}
                            required
                          />
                          <FormInput
                            {...register('state')}
                            label="Wilaya / État"
                            error={errors.state}
                          />
                          <FormInput
                            {...register('postal_code')}
                            label="Code Postal"
                            error={errors.postal_code}
                          />
                          <FormInput
                            {...register('country')}
                            label="Pays"
                            error={errors.country}
                            required
                          />
                        </div>
                      </div>

                      {/* Business Settings */}
                      <div>
                        <h3 className="text-lg font-medium mb-3">Paramètres Commerciaux</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormInput
                            {...register('currency_symbol')}
                            label="Symbole de la Devise"
                            error={errors.currency_symbol}
                            required
                            maxLength={3}
                          />
                          <div className="md:col-span-2">
                            <FormInput
                              {...register('website')}
                              label="Site Web"
                              type="url"
                              error={errors.website}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormInput
                              {...register('instagram_handle')}
                              label="Page Instagram"
                              placeholder="@votre_boutique"
                              error={errors.instagram_handle}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Invoice Footer */}
                      <Textarea
                        {...register('invoice_footer')}
                        label="Pied de Page de la Facture"
                        error={errors.invoice_footer}
                        rows={3}
                      />

                      <FormActions
                        isSubmitting={isSubmitting || updateShopMutation.isPending}
                        submitLabel="Mettre à jour les paramètres"
                      />
                    </div>
                  )}
                </Form>
              )}
            </Card>
          </div>
        )}

        {/* System */}
        {activeTab === 'system' && (
          <Card className="p-[var(--spacing-md)]">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-slate-900">
              <CpuChipIcon className="w-8 h-8 text-primary-600" />
              Système
            </h2>

            <div className="space-y-[var(--spacing-md)]">
              {/* Version Information */}
              <div className="grid-responsive md:grid-cols-2">
                <div className="p-[var(--spacing-sm)] bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Version</h3>
                  <p className="text-2xl font-black text-slate-900">{packageJson.version}</p>
                </div>
                <div className="p-[var(--spacing-sm)] bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Environnement</h3>
                  <p className="text-2xl font-black text-slate-900">Production</p>
                </div>
              </div>

              {/* Diagnostic Info */}
              <div className="pt-[var(--spacing-md)] border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-4">Diagnostic</h3>
                <div className="space-y-1">
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Plateforme</span>
                    <span className="text-sm font-medium text-slate-900">{window.navigator.platform}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">Moteur Chrome</span>
                    <span className="text-sm font-medium text-slate-900">{window.electron?.versions?.chrome || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-50">
                    <span className="text-sm text-slate-500">NodeJS</span>
                    <span className="text-sm font-medium text-slate-900">{window.electron?.versions?.node || 'N/A'}</span>
                  </div>
                </div>
              </div>


            </div>
          </Card>
        )}
      </div>

      {/* User Management Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? "Modifier l'Utilisateur" : 'Ajouter un Utilisateur'}
              </h3>
              <Form
                schema={editingUser ? userUpdateSchema : userCreateSchema}
                onSubmit={handleUserFormSubmit}
                defaultValues={{
                  username: userFormData?.username || '',
                  email: userFormData?.email || '',
                  password: userFormData?.password || '',
                  first_name: userFormData?.first_name || '',
                  last_name: userFormData?.last_name || '',
                  role: userFormData?.role || 'salesperson',
                }}
              >
                {({ register, formState: { errors, isSubmitting } }) => (
                  <div className="space-y-4">
                    <FormInput
                      {...register('username')}
                      label="Nom d'utilisateur"
                      error={errors.username}
                      required
                    />

                    <FormInput
                      {...register('email')}
                      label="E-mail"
                      type="email"
                      error={errors.email}
                      required
                    />

                    {!editingUser && (
                      <FormInput
                        {...register('password')}
                        label="Mot de passe"
                        type="password"
                        error={errors.password}
                        required
                      />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormInput
                        {...register('first_name')}
                        label="Prénom"
                        error={errors.first_name}
                      />
                      <FormInput
                        {...register('last_name')}
                        label="Nom"
                        error={errors.last_name}
                      />
                    </div>

                    <Select
                      {...register('role')}
                      label="Rôle"
                      options={[
                        { value: 'salesperson', label: 'Vendeur' },
                        { value: 'manager', label: 'Gestionnaire' },
                        { value: 'admin', label: 'Administrateur' },
                      ]}
                      error={errors.role}
                      required
                    />

                    <FormActions
                      isSubmitting={isSubmitting || createUserMutation.isPending || updateUserMutation.isPending}
                      submitLabel={editingUser ? 'Modifier' : 'Créer'}
                      onCancel={() => setShowAddUserModal(false)}
                    />
                  </div>
                )}
              </Form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={showRestoreConfirm}
        title="Restaurer la base de données"
        message="Attention : Cette opération remplacera toutes vos données actuelles par celles de la dernière sauvegarde. L'application redémarrera après la restauration. Voulez-vous continuer ?"
        onConfirm={handleRestore}
        onCancel={() => setShowRestoreConfirm(false)}
        variant="danger"
        confirmLabel="Restaurer et redémarrer"
      />

      <ConfirmationDialog
        open={showDeleteUserConfirm}
        title="Désactiver l'utilisateur"
        message="Êtes-vous sûr de vouloir désactiver cet utilisateur ?"
        onConfirm={confirmDeleteUser}
        onCancel={() => setShowDeleteUserConfirm(false)}
      />

      <ConfirmationDialog
        open={showResetWarrantyConfirm}
        title="Réinitialiser la garantie"
        message="Voulez-vous vraiment revenir au modèle de garantie par défaut ?"
        onConfirm={confirmResetWarranty}
        onCancel={() => setShowResetWarrantyConfirm(false)}
      />
    </div>
  );
};

export default Settings;

