import React, { useState, useEffect } from 'react';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { suppliersAPI } from '../services/api';
import { toast } from 'react-hot-toast';

export const AddEditSupplierModal = ({ isOpen, onClose, onSave, supplier = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    payment_terms: '',
    delivery_time: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErrors({});
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        contact_person: supplier.contact_person || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        address: supplier.address || '',
        payment_terms: supplier.payment_terms || '',
        delivery_time: supplier.delivery_time || '',
      });
    } else {
      setFormData({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        payment_terms: '',
        delivery_time: '',
      });
    }
  }, [supplier, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Le nom est obligatoire';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'e-mail invalide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      if (supplier) {
        await suppliersAPI.update(supplier.id, formData);
        toast.success('Fournisseur mis à jour avec succès');
      } else {
        await suppliersAPI.create(formData);
        toast.success('Fournisseur ajouté avec succès');
      }
      onSave();
    } catch (error) {
      console.error('Error saving supplier:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
        const firstError = Object.values(error.response.data)[0];
        toast.error(Array.isArray(firstError) ? firstError[0] : (typeof firstError === 'string' ? firstError : "Échec de l'enregistrement"));
      } else {
        toast.error("Échec de l'enregistrement du fournisseur");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      header={supplier ? 'Modifier le fournisseur' : 'Ajouter un nouveau fournisseur'}
      body={
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom du fournisseur"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="ex: Apple Inc."
            error={errors.name}
          />
          <div className="grid-fluid-sm">
            <Input
              label="Personne de contact"
              name="contact_person"
              value={formData.contact_person}
              onChange={handleChange}
              placeholder="ex: Jean Dupont"
              error={errors.contact_person}
            />
            <Input
              label="Téléphone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="ex: +33 1 23 45 67 89"
              error={errors.phone}
            />
          </div>
          <Input
            label="E-mail"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="ex: contact@fournisseur.com"
            error={errors.email}
          />
          <Input
            label="Adresse"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Adresse complète"
            error={errors.address}
          />
          <div className="grid-fluid-sm">
            <Input
              label="Conditions de paiement"
              name="payment_terms"
              value={formData.payment_terms}
              onChange={handleChange}
              placeholder="ex: Net 30 jours"
              error={errors.payment_terms}
            />
            <Input
              label="Délai de livraison"
              name="delivery_time"
              value={formData.delivery_time}
              onChange={handleChange}
              placeholder="ex: 3-5 jours ouvrables"
              error={errors.delivery_time}
            />
          </div>
          <div className="flex justify-end space-x-3 mt-6">
            <Button type="button" variant="secondary" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" loading={loading} disabled={loading}>
              {supplier ? 'Mettre à jour' : 'Ajouter'}
            </Button>
          </div>
        </form>
      }
    />
  );
};

