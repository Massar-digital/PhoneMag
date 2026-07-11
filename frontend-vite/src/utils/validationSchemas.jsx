import * as yup from 'yup';

// Common validation patterns
const passwordValidation = yup
  .string();

const phoneValidation = yup
  .string()
  .matches(/^(\+?[\d]{10,15}|0[\d]{9})$/, 'Veuillez entrer un numéro de téléphone valide (10 chiffres ou format international)');

const emailValidation = yup
  .string()
  .email('Veuillez entrer une adresse email valide');

// Authentication Schemas
export const loginSchema = yup.object().shape({
  username: yup.string().required('L\'email ou le nom d\'utilisateur est obligatoire'),
  password: yup.string().required('Le mot de passe est obligatoire'),
  rememberMe: yup.boolean().default(false),
});

export const registerSchema = yup.object().shape({
  username: yup
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur doit contenir moins de 30 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, des chiffres, des underscores et des traits d\'union')
    .required('Le nom d\'utilisateur est obligatoire'),
  email: emailValidation.required('L\'email est obligatoire'),
  password: passwordValidation.required('Le mot de passe est obligatoire'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Les mots de passe doivent correspondre')
    .required('Veuillez confirmer votre mot de passe'),
  first_name: yup.string().max(30, 'Le prénom doit contenir moins de 30 caractères'),
  last_name: yup.string().max(30, 'Le nom doit contenir moins de 30 caractères'),
});

export const forgotPasswordSchema = yup.object().shape({
  email: emailValidation.required('L\'email est obligatoire'),
});

export const resetPasswordSchema = yup.object().shape({
  password: passwordValidation.required('Le mot de passe est obligatoire'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Les mots de passe doivent correspondre')
    .required('Veuillez confirmer votre mot de passe'),
});

export const changePasswordSchema = yup.object().shape({
  current_password: yup.string().required('Le mot de passe actuel est obligatoire'),
  new_password: passwordValidation.required('Le nouveau mot de passe est obligatoire'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('new_password')], 'Les mots de passe doivent correspondre')
    .required('Veuillez confirmer votre nouveau mot de passe'),
});

// Phone Management Schemas
export const phoneSchema = yup.object().shape({
  product_type: yup.string().required('Le type de produit est obligatoire'),
  brand: yup.string().required('La marque est obligatoire'),
  model: yup.string().required('Le modèle est obligatoire'),
  storage: yup.string().when('product_type', {
    is: (value) => value === 'Phone' || value === 'Laptop',
    then: (schema) => schema.required('Le stockage est obligatoire pour les téléphones et les ordinateurs portables'),
    otherwise: (schema) => schema.notRequired(),
  }),
  ram: yup
    .string()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .notRequired(),
  color: yup.string().required('La couleur est obligatoire'),
  custom_color: yup.string().when('color', {
    is: 'Autre',
    then: (schema) => schema.required('Veuillez préciser la couleur'),
    otherwise: (schema) => schema.notRequired(),
  }),
  purchase_price: yup
    .number()
    .positive('Le prix d\'achat doit être positif')
    .required('Le prix d\'achat est obligatoire'),
  price: yup
    .number()
    .positive('Le prix de vente doit être positif')
    .min(yup.ref('purchase_price'), 'Le prix de vente doit être au moins égal au prix d\'achat')
    .required('Le prix de vente est obligatoire'),
  condition: yup
    .string()
    .oneOf(['New', 'Refurbished', 'Used'], 'État invalide')
    .required('L\'état est obligatoire'),
  quantity: yup
    .number()
    .integer('La quantité doit être un nombre entier')
    .min(0, 'La quantité ne peut pas être négative')
    .default(0),
  battery_cycle: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .nullable()
    .min(0, 'Le nombre de cycles doit être positif'),
  screen_size: yup
    .string()
    .nullable()
    .notRequired(),
  battery_percentage: yup
    .number()
    .transform((value) => (isNaN(value) ? undefined : value))
    .nullable()
    .min(0, "La batterie doit être d'au moins 0%")
    .max(100, "La batterie ne peut pas dépasser 100%"),
  IMEI: yup
    .string()
    .test('is-imei-or-empty', 'L\'IMEI doit contenir exactement 15 chiffres', (value) => {
      if (!value || value.length === 0) return true;
      return /^\d{15}$/.test(value) || value.length > 5; // Allow shorter serials too if not strictly IMEI
    }),
  description: yup.string().max(500, 'La description doit contenir moins de 500 caractères'),
  supplier_id: yup.string().nullable().notRequired(),
  reorder_level: yup.number().integer().min(0).notRequired().default(10),
});

// Sales Schemas
export const saleSchema = yup.object().shape({
  customer_id: yup.string().nullable(),
  customer_name: yup.string().nullable(),
  customer_phone: yup.string().nullable(),
  customer_email: yup.string().nullable(),
  phone_id: yup.number().required('Veuillez sélectionner un téléphone').positive('Veuillez sélectionner un téléphone'),
  quantity: yup
    .number()
    .integer('La quantité doit être un nombre entier')
    .min(1, 'La quantité doit être d\'au moins 1')
    .required('La quantité est obligatoire'),
  discount_type: yup.string().oneOf(['percentage', 'fixed']).default('percentage'),
  discount_value: yup
    .number()
    .min(0, 'La remise ne peut pas être négative')
    .default(0),
  payment_method: yup
    .string()
    .oneOf(['Cash', 'Card', 'Split', 'Check', 'Mobile Wallet', 'Other'], 'Mode de paiement invalide')
    .required('Le mode de paiement est obligatoire'),
  notes: yup.string().max(500, 'Les notes doivent contenir moins de 500 caractères').nullable(),
});

// Customer Schemas
export const customerSchema = yup.object().shape({
  first_name: yup.string().required('Le prénom est obligatoire'),
  last_name: yup.string().optional(),
  phone: yup.string().optional(),
  email: yup.string().email('Veuillez entrer une adresse email valide').optional(),
  address: yup.string().optional(),
});

// Inventory Schemas
export const inventoryAdjustmentSchema = yup.object().shape({
  adjustment_type: yup
    .string()
    .oneOf(['ADD', 'REMOVE'], 'Type d\'ajustement invalide')
    .required('Le type d\'ajustement est obligatoire'),
  quantity: yup
    .number()
    .integer('La quantité doit être un nombre entier')
    .min(1, 'La quantité doit être d\'au moins 1')
    .required('La quantité est obligatoire'),
  reason: yup
    .string()
    .oneOf(['SALE', 'RETURN', 'DAMAGE', 'RESTOCK', 'CORRECTION'], 'Raison invalide')
    .required('La raison est obligatoire'),
  notes: yup.string().max(500, 'Les notes doivent contenir moins de 500 caractères'),
});

// Shop Settings Schemas
export const shopSettingsSchema = yup.object().shape({
  name: yup.string().required('Le nom de la boutique est obligatoire'),
  email: emailValidation,
  phone: phoneValidation.required('Le numéro de téléphone est obligatoire'),
  address_line_1: yup.string().required('L\'adresse est obligatoire'),
  address_line_2: yup.string(),
  city: yup.string().required('La ville est obligatoire'),
  state: yup.string(),
  postal_code: yup.string(),
  country: yup.string().required('Le pays est obligatoire'),
  currency_symbol: yup
    .string()
    .max(5, 'Le symbole de la devise est trop long')
    .required('Le symbole de la devise est obligatoire'),

  website: yup.string().url('Veuillez entrer une URL valide'),
  instagram_handle: yup.string(),
  invoice_footer: yup.string().max(500, 'Le pied de page de la facture doit contenir moins de 500 caractères'),
});

// User Management Schemas
export const userCreateSchema = yup.object().shape({
  username: yup
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur doit contenir moins de 30 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, des chiffres, des underscores et des traits d\'union')
    .required('Le nom d\'utilisateur est obligatoire'),
  email: emailValidation,
  password: passwordValidation.required('Le mot de passe est obligatoire'),
  first_name: yup.string().max(30, 'Le prénom doit contenir moins de 30 caractères'),
  last_name: yup.string().max(30, 'Le nom doit contenir moins de 30 caractères'),
  role: yup
    .string()
    .oneOf(['admin', 'manager', 'salesperson'], 'Rôle invalide')
    .required('Le rôle est obligatoire'),
});

export const userUpdateSchema = yup.object().shape({
  username: yup
    .string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur doit contenir moins de 30 caractères')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, des chiffres, des underscores et des traits d\'union')
    .required('Le nom d\'utilisateur est obligatoire'),
  email: emailValidation,
  first_name: yup.string().max(30, 'Le prénom doit contenir moins de 30 caractères'),
  last_name: yup.string().max(30, 'Le nom doit contenir moins de 30 caractères'),
  role: yup
    .string()
    .oneOf(['admin', 'manager', 'salesperson'], 'Rôle invalide')
    .required('Le rôle est obligatoire'),
});

// Preferences Schema
export const preferencesSchema = yup.object().shape({
  theme: yup
    .string()
    .oneOf(['light', 'dark', 'system'], 'Thème invalide')
    .required('Le thème est obligatoire'),
  language: yup
    .string()
    .oneOf(['en', 'fr'], 'Langue invalide')
    .required('La langue est obligatoire'),
  default_page_size: yup
    .number()
    .oneOf([10, 25, 50, 100], 'Taille de page invalide')
    .required('La taille de page par défaut est obligatoire'),
  notifications: yup.object().shape({
    email_new_sales: yup.boolean(),
    low_stock_alerts: yup.boolean(),
    weekly_summary: yup.boolean(),
  }),
});
