import React, { useState, useEffect } from 'react';
import { customersAPI } from '../services/api';

import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Form } from '../components/forms/Form';
import { Input, Textarea, FormActions } from '../components/forms/FormFields';
import { customerSchema } from '../utils/validationSchemas';
import { useCreateForm, useUpdateForm } from '../hooks/useFormSubmission';

// interface AddEditCustomerModalProps {
//   customer: object | null;
//   onClose: () => void;
//   onSaved: () => void;
// }

export const AddEditCustomerModal = ({
  customer,
  onClose,
  onSaved,
}) => {
  const isEditing = !!customer;
  const createForm = useCreateForm({
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });
  const updateForm = useUpdateForm({
    onSuccess: () => {
      onSaved();
      onClose();
    },
  });

  const defaultValues = {
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    address: '',
  };

  const getInitialValues = () => {
    if (customer) {
      // Split name into first and last name if editing
      const nameParts = (customer.name || '').split(' ');
      const first_name = nameParts[0] || '';
      const last_name = nameParts.slice(1).join(' ') || '';

      return {
        first_name,
        last_name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
      };
    }
    return defaultValues;
  };

  const handleSubmit = async (data) => {
    const submitData = {
      name: `${data.first_name} ${data.last_name}`.trim(),
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
    };

    if (isEditing && customer) {
      await updateForm.submit(() => customersAPI.update(customer.id, submitData));
    } else {
      await createForm.submit(() => customersAPI.create(submitData));
    }
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="md"
      header={<h2 className="text-lg font-semibold">{isEditing ? 'Modifier le client' : 'Ajouter un nouveau client'}</h2>}
      body={
        <Form
          schema={customerSchema}
          onSubmit={handleSubmit}
          defaultValues={getInitialValues()}
        >
          {({ register, formState: { errors, isSubmitting } }) => (
            <div className="space-y-4">
              {/* Name Fields */}
              <div className="grid-fluid-sm">
                <Input
                  {...register('first_name')}
                  label="Prénom"
                  error={errors.first_name}
                  required
                  placeholder="ex: Ahmed"
                />
                <Input
                  {...register('last_name')}
                  label="Nom (Optionnel)"
                  error={errors.last_name}
                  placeholder="ex: Benali"
                />
              </div>

              {/* Contact Information */}
              <div className="grid-fluid-sm">
                <Input
                  {...register('phone')}
                  label="Téléphone (Optionnel)"
                  type="tel"
                  error={errors.phone}
                  placeholder="ex: 0550 12 34 56"
                />
                <Input
                  {...register('email')}
                  label="E-mail (Optionnel)"
                  type="email"
                  error={errors.email}
                  placeholder="ex: ahmed@mail.com"
                />
              </div>

              {/* Address Information */}
              <Input
                {...register('address')}
                label="Adresse (Optionnel)"
                error={errors.address}
                placeholder="ex: Alger, Algérie"
              />

              <FormActions
                isSubmitting={isSubmitting || createForm.isSubmitting || updateForm.isSubmitting}
                submitLabel={isEditing ? 'Mettre à jour' : 'Ajouter'}
                onCancel={onClose}
              />
            </div>
          )}
        </Form>
      }
    />
  );
};

