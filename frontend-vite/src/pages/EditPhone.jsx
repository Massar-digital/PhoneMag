import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Select } from '../components/common/Select';
import { Textarea } from '../components/common/Textarea';
import { PageHeader } from '../components/layout/PageHeader';
import { ConfirmationDialog } from '../components/common/ConfirmationDialog';
import { phonesAPI, suppliersAPI, getPublicUrl } from '../services/api';

const EditPhone = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    product_type: 'Phone',
    brand: '',
    model: '',
    storage: '',
    ram: '',
    color: '',
    purchase_price: 0,
    price: 0,
    condition: 'New',
    IMEI: '',
    battery_percentage: '',
    battery_cycle: '',
    screen_size: '',
    description: '',
    quantity: 0,
    reorder_level: 10,
    supplier_id: '',
    image: null,
    image_url: '',
  });
  const [currentImage, setCurrentImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [suppliers, setSuppliers] = useState([]);

  const brandOptions = [
    { value: '', label: 'Sélectionner une marque' },
    { value: 'Apple', label: 'Apple' },
    { value: 'Samsung', label: 'Samsung' },
    { value: 'Xiaomi', label: 'Xiaomi' },
    { value: 'OnePlus', label: 'OnePlus' },
    { value: 'Google', label: 'Google' },
    { value: 'Huawei', label: 'Huawei' },
    { value: 'Anker', label: 'Anker' },
    { value: 'Belkin', label: 'Belkin' },
    { value: 'Spigen', label: 'Spigen' },
    { value: 'OtterBox', label: 'OtterBox' },
    { value: 'Generic', label: 'Générique' },
    { value: 'Other', label: 'Autre' },
  ];

  const productTypeOptions = [
    { value: 'Phone', label: 'Téléphone' },
    { value: 'Laptop', label: 'Ordinateur portable' },
    { value: 'Case', label: 'Coque' },
    { value: 'Charger', label: 'Chargeur' },
    { value: 'Cable', label: 'Câble' },
    { value: 'Screen Protector', label: 'Protège-écran' },
    { value: 'Headphones', label: 'Casque' },
    { value: 'Earphones', label: 'Écouteurs' },
    { value: 'Power Bank', label: 'Batterie externe' },
    { value: 'Memory Card', label: 'Carte mémoire' },
    { value: 'Adapter', label: 'Adaptateur' },
    { value: 'Holder', label: 'Support téléphone' },
    { value: 'Other', label: 'Autre accessoire' },
  ];

  const storageOptions = [
    { value: '', label: 'Sélectionner le stockage' },
    { value: '64GB', label: '64 Go' },
    { value: '128GB', label: '128 Go' },
    { value: '256GB', label: '256 Go' },
    { value: '512GB', label: '512 Go' },
    { value: '1TB', label: '1 To' },
  ];

  const ramOptions = [
    { value: '', label: 'Sélectionner la RAM' },
    { value: '4GB', label: '4 Go' },
    { value: '6GB', label: '6 Go' },
    { value: '8GB', label: '8 Go' },
    { value: '12GB', label: '12 Go' },
    { value: '16GB', label: '16 Go' },
  ];

  const conditionOptions = [
    { value: 'New', label: 'Neuf' },
    { value: 'Refurbished', label: 'Remis à neuf' },
    { value: 'Used', label: 'Occasion' },
    { value: 'Defective', label: 'Défectueux' },
  ];

  const colorOptions = [
    { value: '', label: 'Sélectionner une couleur' },
    { value: 'Noir', label: 'Noir' },
    { value: 'Blanc', label: 'Blanc' },
    { value: 'Argent', label: 'Argent' },
    { value: 'Or', label: 'Or' },
    { value: 'Gris Sidéral', label: 'Gris Sidéral' },
    { value: 'Bleu', label: 'Bleu' },
    { value: 'Rouge', label: 'Rouge' },
    { value: 'Vert', label: 'Vert' },
    { value: 'Rose', label: 'Rose' },
    { value: 'Violet', label: 'Violet' },
    { value: 'Jaune', label: 'Jaune' },
    { value: 'Minuit', label: 'Minuit' },
    { value: 'Lumière Stellaire', label: 'Lumière Stellaire' },
    { value: 'Titane Naturel', label: 'Titane Naturel' },
    { value: 'Titane Noir', label: 'Titane Noir' },
    { value: 'Titane Blanc', label: 'Titane Blanc' },
    { value: 'Autre', label: 'Autre' },
  ];

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await suppliersAPI.getAll();
      const supplierData = response.data.results || response.data;
      setSuppliers(supplierData.map(s => ({
        value: String(s.id),
        label: s.name
      })));
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  }, []);

  const fetchPhone = useCallback(async () => {
    try {
      setFetchLoading(true);
      const response = await phonesAPI.get(parseInt(id));
      const phone = response.data;

      setFormData({
        product_type: phone.product_type || 'Phone',
        brand: phone.brand,
        model: phone.model,
        storage: phone.storage || '',
        ram: phone.ram || '',
        color: colorOptions.find(o => o.value === phone.color) ? phone.color : (phone.color ? 'Autre' : ''),
        custom_color: colorOptions.find(o => o.value === phone.color) ? '' : (phone.color || ''),
        purchase_price: phone.purchase_price,
        price: phone.price,
        condition: phone.condition,
        IMEI: phone.IMEI || '',
        barcode: phone.barcode || '',
        battery_percentage: phone.battery_percentage || '',
        battery_cycle: phone.battery_cycle || '',
        screen_size: phone.screen_size || '',
        description: phone.description || '',
        quantity: phone.inventory?.stock_quantity || 0,
        reorder_level: phone.inventory?.reorder_level || 10,
        supplier_id: phone.inventory?.supplier_id ? phone.inventory.supplier_id.toString() : '',
        image: null,
        image_url: phone.image_url || '',
      });
      setCurrentImage(getPublicUrl(phone.image_url || phone.image || null));
    } catch (error) {
      console.error('Error fetching phone:', error);
      window.showToast('Erreur lors du chargement des données du téléphone. Veuillez réessayer.', 'error');
      navigate('/phones');
    } finally {
      setFetchLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchSuppliers();
    if (id) {
      fetchPhone();
    }
  }, [id, fetchPhone, fetchSuppliers]);

  // Fix quantity to 1 when IMEI is provided
  useEffect(() => {
    if (formData.IMEI && formData.IMEI.trim().length > 0) {
      setFormData(prev => ({ ...prev, quantity: 1 }));
    }
  }, [formData.IMEI]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const normalizedValue = name === 'supplier_id'
      ? (value === null || value === undefined ? '' : String(value))
      : value;
    
    // Auto-fill "iPhone " when Apple is selected for Phones
    const updatedData = { [name]: normalizedValue };
    if (name === 'brand' && normalizedValue?.toLowerCase() === 'apple' && formData.product_type === 'Phone' && !formData.model) {
      updatedData.model = 'iPhone ';
    }
    
    // If IMEI is being set and has a value, fix quantity to 1
    if (name === 'IMEI' && normalizedValue && normalizedValue.trim().length > 0) {
      updatedData.quantity = 1;
    }
    
    setFormData(prev => ({ ...prev, ...updatedData }));
    
    if (name === 'image_url') {
      // If image_url is provided, it takes priority for preview
      // Otherwise, we keep the original image (if any)
      setCurrentImage(value || null);
    }

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0] || null;
    setFormData(prev => ({ ...prev, image: file }));
    if (file) {
      setCurrentImage(URL.createObjectURL(file));
    }
    if (errors.image) {
      setErrors(prev => ({ ...prev, image: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.brand.trim()) newErrors.brand = 'La marque est requise';
    if (!formData.model.trim()) newErrors.model = 'Le modèle est requis';
    
    // Storage only required for phones
    const isPhone = formData.product_type === 'Phone';
    const isLaptop = formData.product_type === 'Laptop';
    if ((isPhone || isLaptop) && !formData.storage) newErrors.storage = 'Le stockage est requis pour les ordinateurs portables et les téléphones';
    
    if (!formData.color.trim()) newErrors.color = 'La couleur est requise';
    if (formData.purchase_price <= 0) newErrors.purchase_price = 'Le prix d\'achat doit être supérieur à 0';
    if (formData.price <= 0) newErrors.price = 'Le prix de vente doit être supérieur à 0';
    if (Number(formData.price) < Number(formData.purchase_price)) newErrors.price = 'Le prix de vente doit être au moins égal au prix d\'achat';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      let submitData;
      const isFile = formData.image instanceof File;

      if (isFile) {
        submitData = new FormData();
        // Log FormData keys
        submitData.append('product_type', formData.product_type || 'Phone');
        submitData.append('brand', formData.brand || '');
        submitData.append('model', formData.model || '');
        
        const finalColor = formData.color === 'Autre' ? formData.custom_color : formData.color;
        submitData.append('color', finalColor || '');
        
        submitData.append('condition', formData.condition || 'New');
        
        // Use uniform numeric conversion
        const pPrice = parseFloat(formData.purchase_price) || 0;
        const sPrice = parseFloat(formData.price) || 0;
        submitData.append('purchase_price', pPrice.toString());
        submitData.append('price', sPrice.toString());
        
        // If IMEI is provided, quantity must be 1
        const finalQty = (formData.IMEI && formData.IMEI.trim()) ? 1 : (parseInt(formData.quantity) || 0);
        const rvl = parseInt(formData.reorder_level) || 0;
        submitData.append('quantity', finalQty.toString());
        submitData.append('reorder_level', rvl.toString());
        
        // Only append supplier if it has a value to avoid validation errors with empty strings in multipart/form-data
        if (formData.supplier_id) {
          submitData.append('supplier', formData.supplier_id);
        }

        if (formData.storage) submitData.append('storage', formData.storage);
        if (formData.ram && formData.ram.trim()) submitData.append('ram', formData.ram);
        if (formData.product_type === 'Laptop' && formData.battery_cycle !== '' && formData.battery_cycle !== null && formData.battery_cycle !== undefined) {
          submitData.append('battery_cycle', formData.battery_cycle.toString());
        }
        if (formData.product_type === 'Laptop' && formData.screen_size) submitData.append('screen_size', formData.screen_size);
        if (formData.IMEI) submitData.append('IMEI', formData.IMEI);
        if (formData.barcode) submitData.append('barcode', formData.barcode);
        
        if (formData.battery_percentage !== '' && formData.battery_percentage !== null) {
          submitData.append('battery_percentage', formData.battery_percentage.toString());
        }
        
        if (formData.description && formData.description.trim()) {
          submitData.append('description', formData.description);
        }
        
        // Always append image_url if it exists in state to allow updates/clearing
        if (formData.image_url !== undefined) {
          submitData.append('image_url', formData.image_url || '');
        }

        if (formData.image) {
          submitData.append('image', formData.image);
        }
      } else {
        // Use regular object for non-file data
        submitData = {
          product_type: formData.product_type || 'Phone',
          brand: formData.brand || '',
          model: formData.model || '',
          color: formData.color === 'Autre' ? formData.custom_color : (formData.color || ''),
          purchase_price: parseFloat(formData.purchase_price) || 0,
          price: parseFloat(formData.price) || 0,
          condition: formData.condition || 'New',
          IMEI: formData.IMEI || '',
          barcode: formData.barcode || '',
          battery_percentage: (formData.battery_percentage !== '' && formData.battery_percentage !== null) 
            ? parseInt(formData.battery_percentage) 
            : null,
          // If IMEI is provided, quantity must be 1
          quantity: (formData.IMEI && formData.IMEI.trim()) ? 1 : (parseInt(formData.quantity) || 0),
          reorder_level: parseInt(formData.reorder_level) || 0,
          supplier: formData.supplier_id ? parseInt(formData.supplier_id) : null,
          image_url: formData.image_url !== undefined ? (formData.image_url || '') : '',
        };
        
        if (formData.storage) submitData.storage = formData.storage;
        if (formData.ram && formData.ram.trim()) submitData.ram = formData.ram;
        if (formData.product_type === 'Laptop' && formData.battery_cycle !== '' && formData.battery_cycle !== null && formData.battery_cycle !== undefined) {
          submitData.battery_cycle = parseInt(formData.battery_cycle, 10);
        }
        if (formData.product_type === 'Laptop' && formData.screen_size) submitData.screen_size = formData.screen_size;
        if (formData.description && formData.description.trim()) {
          submitData.description = formData.description;
        }
      }

      await phonesAPI.update(parseInt(id), submitData);
      navigate('/phones');
    } catch (error) {
      console.error('Error updating phone:', error);
      
      // Extract detailed error info
      const errorData = error.response?.data;
      console.error('Server response error data:', errorData);

      if (errorData) {
        if (typeof errorData === 'object' && !errorData.detail) {
          // DRF returns field errors { field: [errors] }
          const fieldErrors = {};
          Object.entries(errorData).forEach(([field, errors]) => {
            const errorList = Array.isArray(errors) ? errors.join(', ') : errors;
            fieldErrors[field.toLowerCase()] = errorList;
          });
          setErrors(fieldErrors);
          
          // Also show a general alert for visibility
          const errorMsg = Object.entries(fieldErrors)
            .map(([field, msg]) => `${field}: ${msg}`)
            .join('\n');
          window.showToast(`Erreur de validation :\n${errorMsg}`, 'error');
        } else {
          const msg = errorData.detail || 'Échec de la mise à jour du téléphone';
          setErrors({ general: msg });
          window.showToast(`Erreur : ${msg}`, 'error');
        }
      } else {
        setErrors({ general: 'Échec de la mise à jour du téléphone' });
        window.showToast('Erreur lors de la mise à jour du téléphone. Veuillez vérifier votre connexion.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await phonesAPI.delete(parseInt(id));
      navigate('/phones');
    } catch (error) {
      console.error('Error deleting phone:', error);
      window.showToast('Erreur lors de la suppression du téléphone. Veuillez réessayer.', 'error');
    }
  };

  if (fetchLoading) {
    return (
      <div className="max-w-4xl mx-auto p-[var(--spacing-md)]">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-[var(--spacing-md)]">
      <PageHeader title="Modifier le produit" />
      <Card className="p-[var(--spacing-md)]">
        <form onSubmit={handleSubmit} className="space-y-[var(--spacing-md)]">
          {/* Product Type */}
          <div>
            <Select
              label="Type de produit"
              name="product_type"
              value={formData.product_type}
              onChange={(value) => handleInputChange({ target: { name: 'product_type', value } })}
              options={productTypeOptions}
              required
            />
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <Select
              label="Marque"
              name="brand"
              value={formData.brand}
              onChange={(value) => handleInputChange({ target: { name: 'brand', value } })}
              options={brandOptions}
              error={errors.brand}
              required
            />

            <Input
              label="Modèle"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
              error={errors.model}
              required
            />

            <Select
              label="Fournisseur"
              name="supplier_id"
              value={formData.supplier_id}
              onChange={(value) => handleInputChange({ target: { name: 'supplier_id', value } })}
              options={[{ value: '', label: 'Aucun fournisseur' }, ...suppliers]}
              error={errors.supplier_id}
            />
          </div>

          {/* Specifications - Only for Phones */}
          {(formData.product_type === 'Phone' || formData.product_type === 'Laptop') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--spacing-md)]">
              <Select
                label="Stockage"
                name="storage"
                value={formData.storage}
                onChange={(value) => handleInputChange({ target: { name: 'storage', value } })}
                options={storageOptions}
                error={errors.storage}
                required
              />

              {(formData.product_type !== 'Phone' || formData.brand?.toLowerCase() !== 'apple') && (
                <Select
                  label="RAM"
                  name="ram"
                  value={formData.ram}
                  onChange={(value) => handleInputChange({ target: { name: 'ram', value } })}
                  options={ramOptions}
                  error={errors.ram}
                />
              )}

              <div className="space-y-4">
                <Select
                  label="Couleur"
                  name="color"
                  value={formData.color}
                  onChange={(value) => handleInputChange({ target: { name: 'color', value } })}
                  options={colorOptions}
                  error={errors.color}
                  required
                />
                {formData.color === 'Autre' && (
                  <Input
                    label="Préciser la couleur"
                    name="custom_color"
                    value={formData.custom_color}
                    onChange={handleInputChange}
                    error={errors.custom_color}
                    placeholder="Ex: Rose Gold"
                    required
                  />
                )}
              </div>

              {formData.product_type === 'Phone' && (
                <>
                  <Input
                    label="IMEI / N° de série"
                    name="IMEI"
                    value={formData.IMEI}
                    onChange={handleInputChange}
                    error={errors.IMEI}
                    placeholder="Ex: 351234567890123"
                  />

                  <Input
                    label="Code à Barres"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleInputChange}
                    error={errors.barcode}
                    placeholder="Scanner ou saisir le code à barres"
                  />

                  {['apple', 'samsung', 'oneplus'].includes(formData.brand?.toLowerCase()) && (
                    <div className="md:col-span-3">
                      <Input
                        label="État de la batterie %"
                        name="battery_percentage"
                        type="number"
                        value={formData.battery_percentage}
                        onChange={handleInputChange}
                        error={errors.battery_percentage}
                        placeholder="ex: 95"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {formData.product_type === 'Laptop' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
              <Input
                label="Cycles de batterie"
                name="battery_cycle"
                type="number"
                value={formData.battery_cycle || ''}
                onChange={handleInputChange}
                error={errors.battery_cycle}
                placeholder="ex: 300"
              />
              <Input
                label="Taille d'écran (pouces)"
                name="screen_size"
                value={formData.screen_size || ''}
                onChange={handleInputChange}
                error={errors.screen_size}
                placeholder="ex: 13.3"
              />
            </div>
          )}

          {/* Color for Accessories */}
          {formData.product_type !== 'Phone' && formData.product_type !== 'Laptop' && (
            <div className="space-y-4">
              <Select
                label="Couleur"
                name="color"
                value={formData.color}
                onChange={(value) => handleInputChange({ target: { name: 'color', value } })}
                options={colorOptions}
                error={errors.color}
                required
              />
              {formData.color === 'Autre' && (
                <Input
                  label="Préciser la couleur"
                  name="custom_color"
                  value={formData.custom_color}
                  onChange={handleInputChange}
                  error={errors.custom_color}
                  placeholder="Ex: Rose Gold"
                  required
                />
              )}
            </div>
          )}

          {/* Pricing and Condition */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
            <Input
              label="Prix d'achat (DA)"
              name="purchase_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.purchase_price || ''}
              onChange={handleInputChange}
              error={errors.purchase_price}
              required
            />

            <Input
              label="Prix de vente (DA)"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price || ''}
              onChange={handleInputChange}
              error={errors.price}
              required
            />

            <Select
              label="État"
              name="condition"
              value={formData.condition}
              onChange={(value) => handleInputChange({ target: { name: 'condition', value } })}
              options={conditionOptions}
              required
            />

            <Input
              label="URL de l'image (Optionnel)"
              name="image_url"
              value={formData.image_url || ''}
              onChange={handleInputChange}
              error={errors.image_url}
              placeholder="https://exemple.com/image.jpg"
              helperText="Utilisez cette option pour afficher une photo depuis internet sans l'enregistrer sur le serveur."
            />

            <div className="md:col-span-2">
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-slate-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Ou télécharger un fichier</span>
                </div>
              </div>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                Charger l'image
              </label>
              {currentImage && (
                <div className="mb-3">
                  <img
                    src={currentImage}
                    alt="Téléphone actuel"
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                  <p className="text-sm text-slate-500 mt-1">Image actuelle</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-slate-500 mt-1">Laissez vide pour conserver l'image actuelle</p>
              {errors.image && <p className="mt-1 text-sm text-red-600">{errors.image}</p>}
            </div>

            <div className="md:col-span-2 space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 border-b pb-2">Gestion du stock</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--spacing-md)]">
                <Input
                  label="Quantité en stock"
                  name="quantity"
                  type="number"
                  min="0"
                  max={formData.IMEI && formData.IMEI.trim() ? "1" : undefined}
                  value={formData.quantity}
                  onChange={handleInputChange}
                  error={errors.quantity}
                  required
                  disabled={formData.IMEI && formData.IMEI.trim().length > 0}
                  helperText={formData.IMEI && formData.IMEI.trim() ? "La quantité est fixée à 1 car un IMEI est renseigné" : undefined}
                />
                <Input
                  label="Seuil d'alerte (Stock faible)"
                  name="reorder_level"
                  type="number"
                  min="0"
                  value={formData.reorder_level}
                  onChange={handleInputChange}
                  error={errors.reorder_level}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <Textarea
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Entrez la description du téléphone..."
                rows={4}
              />
            </div>
          </div>

          {errors.general && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
              {errors.general}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="danger"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full sm:w-auto order-3 sm:order-1"
            >
              Supprimer
            </Button>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto order-1 sm:order-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/phones')}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto order-1 sm:order-2"
              >
                  {loading ? 'Mise à jour...' : 'Mettre à jour'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      <ConfirmationDialog
        open={showDeleteDialog}
        title="Supprimer le téléphone"
        message="Êtes-vous sûr de vouloir supprimer ce téléphone ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
};

export default EditPhone;

