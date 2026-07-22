import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { Controller } from 'react-hook-form';
import CreatableSelect from 'react-select/creatable';
import BarcodeLabel from '../components/BarcodeLabel';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { PageHeader } from '../components/layout/PageHeader';
import { Form } from '../components/forms/Form';
import { Input, Select, Textarea } from '../components/forms/FormFields';
import { phonesAPI, suppliersAPI } from '../services/api';
import { useShopSettings } from '../hooks/useShop';
import { useFormSubmission } from '../hooks/useFormSubmission';
import { usePhoneModels } from '../hooks/usePhoneModels';
import { phoneSchema } from '../utils/validationSchemas';
import { PhoneImagePicker } from '../components/phones/PhoneImagePicker';

// interface PhoneFormData {
//   brand;
//   model;
//   storage;
//   ram;
//   color;
//   purchase_price;
//   price;
//   condition;
//   description;
//   image: File;
// }

const colourStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'white',
    borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
    boxShadow: state.isFocused ? '0 0 0 2px #bfdbfe' : 'none',
    '&:hover': { borderColor: state.isFocused ? '#3b82f6' : '#9ca3af' },
    minHeight: '38px',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  }),
  valueContainer: (base) => ({ ...base, padding: '2px 8px' }),
  input: (base) => ({ ...base, color: '#374151' }),
  singleValue: (base) => ({ ...base, color: '#374151' }),
  placeholder: (base) => ({ ...base, color: '#9ca3af', fontSize: '0.875rem' }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    zIndex: 50,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#3b82f6'
      : state.isFocused
        ? '#eff6ff'
        : 'white',
    color: state.isSelected ? 'white' : '#374151',
    fontSize: '0.875rem',
    padding: '8px 12px',
    cursor: 'pointer',
    '&:active': { backgroundColor: state.isSelected ? '#2563eb' : '#dbeafe' },
  }),
  menuList: (base) => ({ ...base, maxHeight: '200px' }),
  noOptionsMessage: (base) => ({ ...base, color: '#6b7280', fontSize: '0.875rem' }),
  indicatorSeparator: (base) => ({ ...base, backgroundColor: '#d1d5db' }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? '#3b82f6' : '#9ca3af',
    '&:hover': { color: '#3b82f6' },
  }),
  clearIndicator: (base) => ({
    ...base, color: '#9ca3af', '&:hover': { color: '#ef4444' },
  }),
  loadingIndicator: (base) => ({ ...base, color: '#3b82f6' }),
};

const AddPhone = () => {
  const navigate = useNavigate();
  const { data: shopSettings } = useShopSettings();
  const [addAnother, setAddAnother] = useState(false);
  
  const [printAfterCreate, setPrintAfterCreate] = useState(true);
  const [lastCreatedPhone, setLastCreatedPhone] = useState(null);
  const [lastQuantity, setLastQuantity] = useState(1);
  const [suppliers, setSuppliers] = useState([]);
  const printRef = useRef();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    print: async (printIframe) => {
      if (window.electron && window.electron.print) {
        const html = printIframe.contentDocument.documentElement.outerHTML;
        window.electron.print({ 
          html, 
          preview: true,
          isLabelPrint: true,
          labelCount: lastQuantity,
          phoneData: lastCreatedPhone,
          pageSize: 'A4'
        });
      } else {
        printIframe.contentWindow.print();
      }
    },
    onAfterPrint: () => {
      if (!addAnother) {
        navigate('/phones');
      }
      setLastCreatedPhone(null);
    }
  });

  const { isSubmitting, error, submit } = useFormSubmission({
    successMessage: 'Produit créé avec succès !',
    errorMessage: 'Échec de la création du produit. Veuillez réessayer.',
    onSuccess: (result) => {
      if (printAfterCreate && result?.data) {
        setLastCreatedPhone(result.data);
      } else if (!addAnother) {
        navigate('/phones');
      }
    },
  });

  const Watcher = ({ watch, setValue }) => {
    const watchedProductType = watch('product_type') || 'Phone';
    const watchedBrand = watch('brand');
    const watchedModel = watch('model');
    const watchedIMEI = watch('IMEI');
    
    const isPhone = watchedProductType === 'Phone';
    const hasIMEI = watchedIMEI && watchedIMEI.trim().length > 0;
    const prevBrand = useRef(watchedBrand);

    // Reset model when brand changes
    useEffect(() => {
      if (prevBrand.current !== watchedBrand) {
        prevBrand.current = watchedBrand;
        setValue('model', '');
      }
    }, [watchedBrand, setValue]);

    // Auto-fill "iPhone " when Apple is selected and model is empty
    useEffect(() => {
      if (isPhone && watchedBrand?.toLowerCase() === 'apple' && !watchedModel) {
        setValue('model', 'iPhone ');
      }
    }, [isPhone, watchedBrand, watchedModel, setValue]);

    // Fix quantity to 1 when IMEI is provided
    useEffect(() => {
      if (hasIMEI) {
        setValue('quantity', 1);
      }
    }, [hasIMEI, setValue]);

    return null;
  };

  // Effect to trigger print after state update
  useEffect(() => {
    if (lastCreatedPhone) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [lastCreatedPhone, handlePrint]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await suppliersAPI.getAll();
        setSuppliers(response.data.results || response.data);
      } catch (err) {
        console.error('Error fetching suppliers:', err);
      }
    };
    fetchSuppliers();
  }, []);

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
    { value: 'Refurbished', label: 'Reconditionné' },
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

  const handleSubmit = async (data, methods) => {
    setLastQuantity(data.quantity || 1);
    const result = await submit(async () => {
      let submitData;

      if (data.image) {
        // Use FormData for file uploads
        submitData = new FormData();
        submitData.append('product_type', data.product_type || 'Phone');
        submitData.append('brand', data.brand);
        submitData.append('model', data.model);
        if (data.storage) submitData.append('storage', data.storage);
        // Only include RAM if it has a value (not empty string)
        if (data.ram && data.ram.trim()) submitData.append('ram', data.ram);
        if (data.product_type === 'Laptop' && data.battery_cycle !== undefined && data.battery_cycle !== null && data.battery_cycle !== '') {
          submitData.append('battery_cycle', data.battery_cycle.toString());
        }
        if (data.product_type === 'Laptop' && data.screen_size) submitData.append('screen_size', data.screen_size);
        
        const finalColor = data.color === 'Autre' ? data.custom_color : data.color;
        submitData.append('color', finalColor);
        
        submitData.append('purchase_price', data.purchase_price.toString());
        submitData.append('price', data.price.toString());
        submitData.append('condition', data.condition);
        // If IMEI is provided, quantity must be 1
        const finalQuantity = data.IMEI && data.IMEI.trim() ? 1 : (data.quantity || 0);
        submitData.append('quantity', finalQuantity.toString());
        if (data.reorder_level) submitData.append('reorder_level', data.reorder_level.toString());
        if (data.IMEI) submitData.append('IMEI', data.IMEI);
        if (data.battery_percentage) submitData.append('battery_percentage', data.battery_percentage.toString());
        
        // Only append supplier if a value is selected to avoid validation errors with empty strings in multipart/form-data
        if (data.supplier_id) {
          submitData.append('supplier', data.supplier_id);
        }

        if (data.description) submitData.append('description', data.description);
        submitData.append('image', data.image);
        if (data.image_url !== undefined) {
          submitData.append('image_url', data.image_url || '');
        }
      } else {
        // Use regular object for non-file data
        submitData = {
          product_type: data.product_type || 'Phone',
          brand: data.brand,
          model: data.model,
          color: data.color === 'Autre' ? data.custom_color : data.color,
          purchase_price: data.purchase_price,
          price: data.price,
          condition: data.condition,
          // If IMEI is provided, quantity must be 1
          quantity: (data.IMEI && data.IMEI.trim()) ? 1 : (data.quantity || 0),
          reorder_level: data.reorder_level || 10,
          IMEI: data.IMEI || '',
          battery_percentage: data.battery_percentage || null,
          supplier: data.supplier_id || null,
          image_url: data.image_url || '',
        };
        // Only add storage and RAM for phones
        if (data.storage) submitData.storage = data.storage;
        // Only include RAM if it has a value (not empty string)
        if (data.ram && data.ram.trim()) submitData.ram = data.ram;
        if (data.product_type === 'Laptop' && data.battery_cycle !== undefined && data.battery_cycle !== null && data.battery_cycle !== '') {
          submitData.battery_cycle = parseInt(data.battery_cycle, 10);
        }
        if (data.product_type === 'Laptop' && data.screen_size) submitData.screen_size = data.screen_size;
        // Only include description if provided
        if (data.description && data.description.trim()) {
          submitData.description = data.description;
        }
      }

      const result = await phonesAPI.create(submitData);
      
      return result;
    });

    if (result && addAnother) {
      methods.reset();
    }
  };

  const handleCancel = () => {
    navigate('/phones');
  };

  return (
    <div className="max-w-4xl mx-auto p-[var(--spacing-md)] min-h-0 h-full overflow-y-auto container-responsive">
      <PageHeader title="Ajouter un produit" />
      <Card className="p-[var(--spacing-md)] overflow-visible">
        <Form
          schema={phoneSchema}
          onSubmit={handleSubmit}
          className="space-y-[var(--spacing-md)]"
          defaultValues={{
            product_type: 'Phone',
            condition: 'New',
            supplier_id: '',
            quantity: 1,
            reorder_level: 10
          }}
        >
          {({ register, control, formState: { errors }, setValue, watch }) => {
            const watchedImage = watch('image');
            const watchedProductType = watch('product_type') || 'Phone';
            const watchedBrand = watch('brand');
            const watchedIMEI = watch('IMEI');
            const isPhone = watchedProductType === 'Phone';
            const isLaptop = watchedProductType === 'Laptop';
            const isPhoneLike = isPhone || isLaptop;
            const isIPhone = isPhone && watchedBrand?.toLowerCase() === 'apple';
            const hasIMEI = watchedIMEI && watchedIMEI.trim().length > 0;
            const { data: apiModels = [], isLoading: modelsLoading } = usePhoneModels(watchedBrand);

            return (
              <>
                <Watcher watch={watch} setValue={setValue} />
                {/* Product Type */}
                <div>
                  <Select
                    label="Type de produit"
                    {...register('product_type')}
                    options={productTypeOptions}
                    error={errors.product_type}
                    required
                  />
                </div>

                {/* Basic Information */}
                <div className="grid-fluid-sm">
                  <Select
                    label="Marque"
                    {...register('brand')}
                    options={brandOptions}
                    error={errors.brand}
                    required
                  />

                  <Controller
                    name="model"
                    control={control}
                    render={({ field: { onChange, value, ref } }) => {
                      const options = useMemo(
                        () => apiModels.map((m) => ({ value: m, label: m })),
                        [apiModels]
                      );
                      return (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Modèle<span className="text-red-500 ml-1">*</span>
                          </label>
                          <CreatableSelect
                            inputRef={ref}
                            options={options}
                            value={value ? { value, label: value } : null}
                            onChange={(option) => onChange(option ? option.value : '')}
                            isLoading={modelsLoading}
                            placeholder="Saisir le modèle..."
                            isClearable
                            formatCreateLabel={(v) => `Ajouter: "${v}"`}
                            styles={colourStyles}
                            classNamePrefix="react-select"
                          />
                          {errors.model && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.model.message}</p>
                          )}
                        </div>
                      );
                    }}
                  />

                  {(() => {
                    const supplierField = register('supplier_id');
                    const supplierValue = watch('supplier_id') ?? '';
                    return (
                      <Select
                        label="Fournisseur"
                        {...supplierField}
                        value={supplierValue}
                        onChange={(e) => supplierField.onChange(e)}
                        options={[
                          { value: '', label: 'Sélectionner un fournisseur' },
                          ...suppliers.map(s => ({ value: String(s.id), label: s.name }))
                        ]}
                        error={errors.supplier_id}
                      />
                    );
                  })()}
                </div>

                {/* Specs for phones and laptops */}
                {isPhoneLike && (
                  <div className="grid-fluid-sm">
                    <Select
                      label="Stockage"
                      {...register('storage')}
                      options={storageOptions}
                      error={errors.storage}
                      required
                    />

                    {!isIPhone && (
                      <Select
                        label="Mémoire RAM"
                        {...register('ram')}
                        options={ramOptions}
                        error={errors.ram}
                      />
                    )}

                    <div className="space-y-4">
                      <Select
                        label="Couleur"
                        {...register('color')}
                        options={colorOptions}
                        error={errors.color}
                        required
                      />
                      {watch('color') === 'Autre' && (
                        <Input
                          label="Préciser la couleur"
                          {...register('custom_color')}
                          error={errors.custom_color}
                          placeholder="Ex: Rose Gold"
                          required
                        />
                      )}
                    </div>

                    {isPhone && (
                      <Input
                        label="IMEI / N° de série"
                        {...register('IMEI')}
                        error={errors.IMEI}
                        placeholder="Ex: 351234567890123"
                      />
                    )}

                    {isPhone && ['apple', 'samsung', 'oneplus'].includes(watch('brand')?.toLowerCase()) && (
                      <Input
                        label="État de la batterie %"
                        type="number"
                        {...register('battery_percentage')}
                        error={errors.battery_percentage}
                        placeholder="ex: 95"
                      />
                    )}
                  </div>
                )}

                {isLaptop && (
                  <div className="grid-fluid-sm">
                    <Input
                      label="État de la batterie %"
                      type="number"
                      {...register('battery_percentage')}
                      error={errors.battery_percentage}
                      placeholder="ex: 95"
                    />
                    <Input
                      label="Cycles de batterie"
                      type="number"
                      {...register('battery_cycle')}
                      error={errors.battery_cycle}
                      placeholder="ex: 300"
                    />
                    <Input
                      label="Taille d'écran (pouces)"
                      {...register('screen_size')}
                      error={errors.screen_size}
                      placeholder="ex: 13.3"
                    />
                  </div>
                )}

                {/* Color for Accessories */}
                {!isPhoneLike && (
                  <div className="space-y-4">
                    <Select
                      label="Couleur"
                      {...register('color')}
                      options={colorOptions}
                      error={errors.color}
                      required
                    />
                    {watch('color') === 'Autre' && (
                      <Input
                        label="Préciser la couleur"
                        {...register('custom_color')}
                        error={errors.custom_color}
                        placeholder="Ex: Rose Gold"
                        required
                      />
                    )}
                  </div>
                )}

                {/* Pricing */}
                <div className="grid-fluid-sm">
                  <Input
                    label="Prix d'achat (DA)"
                    type="number"
                    {...register('purchase_price', { valueAsNumber: true })}
                    error={errors.purchase_price}
                    min="0"
                    step="0.01"
                    required
                  />

                  <Input
                    label="Prix de vente (DA)"
                    type="number"
                    {...register('price', { valueAsNumber: true })}
                    error={errors.price}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Quantity and Condition */}
                <div className="grid-fluid-sm">
                  <Input
                    label="Quantité de stock initiale"
                    type="number"
                    {...register('quantity', { valueAsNumber: true })}
                    error={errors.quantity}
                    min="0"
                    max={hasIMEI ? "1" : undefined}
                    placeholder="0"
                    disabled={hasIMEI}
                    helperText={hasIMEI ? "La quantité est fixée à 1 car un IMEI est renseigné" : undefined}
                  />

                  <Select
                    label="État"
                    {...register('condition')}
                    options={conditionOptions}
                    required
                  />
                </div>

                {/* Description */}
                <Textarea
                  label="Description (Optionnel)"
                  {...register('description')}
                  error={errors.description}
                  rows={3}
                  placeholder={isPhone ? "Détails supplémentaires sur le téléphone..." : "Détails supplémentaires sur le produit..."}
                />

                <Input
                  label="URL de l'image (Optionnel)"
                  {...register('image_url')}
                  error={errors.image_url}
                  placeholder="https://exemple.com/image.jpg"
                  helperText="Utilisez cette option pour afficher une photo depuis internet sans l'enregistrer sur le serveur."
                />

                <PhoneImagePicker watch={watch} setValue={setValue} imageUrl={watch('image_url')} />

                {/* Alternative: Image Upload */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Ou télécharger un fichier</span>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-[var(--spacing-md)]">
                  <div className="text-center">
                    <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="mt-4">
                      <label htmlFor="image-upload" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-slate-900">
                            {watchedImage ? watchedImage.name : 'Charger l\'image du téléphone'}
                        </span>
                        <span className="mt-1 block text-xs text-slate-500">
                          PNG, JPG, WebP jusqu'à 5 Mo
                        </span>
                      </label>
                      <input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files[0];
                          if (file) {
                            setValue('image', file);
                          }
                        }}
                        className="sr-only"
                      />
                    </div>
                    {watchedImage && (
                      <div className="mt-4">
                        <img
                          src={URL.createObjectURL(watchedImage)}
                          alt="Aperçu"
                          className="mx-auto h-32 w-32 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => setValue('image', undefined)}
                          className="mt-2 text-sm text-red-600 hover:text-red-800"
                        >
                          Supprimer l'image
                        </button>
                      </div>
                    )}
                    {!watchedImage && watch('image_url') && (
                      <div className="mt-4">
                        <img
                          src={watch('image_url')}
                          alt="Aperçu URL"
                          className="mx-auto h-32 w-32 object-cover rounded-lg border"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150?text=Image+Invalide';
                          }}
                        />
                        <p className="mt-1 text-xs text-slate-500">Aperçu de l'URL</p>
                      </div>
                    )}                  </div>
                  {errors.image && <p className="mt-2 text-sm text-red-600">{errors.image.message}</p>}
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
                    {error}
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-[var(--spacing-md)] pt-6 border-t border-slate-200">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center">
                      <input
                        id="add-another"
                        type="checkbox"
                        checked={addAnother}
                        onChange={(e) => setAddAnother(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="add-another" className="ml-2 text-sm text-slate-600">
                        Ajouter un autre après l'enregistrement
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="print-label"
                        type="checkbox"
                        checked={printAfterCreate}
                        onChange={(e) => setPrintAfterCreate(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="print-label" className="ml-2 text-sm text-slate-600">
                        Imprimer l'étiquette automatiquement
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {isSubmitting ? 'Création...' : 'Créer le produit'}
                    </Button>
                  </div>
                </div>
              </>
            );
          }}
        </Form>
      </Card>

      {/* Hidden Barcode Label for Printing */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <BarcodeLabel 
          ref={printRef} 
          phone={lastCreatedPhone} 
          quantity={lastQuantity} 
          shopSettings={shopSettings}
        />
      </div>
    </div>
  );
};

export default AddPhone;

