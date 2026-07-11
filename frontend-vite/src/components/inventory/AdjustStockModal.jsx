import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Form } from '../forms/Form';
import { Input, Select, Textarea, FormActions } from '../forms/FormFields';
import { inventoryAPI } from '../../services/api';

import { inventoryAdjustmentSchema } from '../../utils/validationSchemas';
import { useFormSubmission } from '../../hooks/useFormSubmission';

// interface AdjustStockModalProps {
//   isOpen;
//   onClose: () => void;
//   inventoryItem: object | null;
//   onSuccess: () => void;
// }

const AdjustStockModal = ({
  isOpen,
  onClose,
  inventoryItem,
  onSuccess,
}) => {
  const formSubmission = useFormSubmission({
    successMessage: 'Stock ajusté avec succès',
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  const reasonOptions = [
    { value: 'SALE', label: 'Vente' },
    { value: 'RETURN', label: 'Retour' },
    { value: 'DAMAGE', label: 'Dommage' },
    { value: 'RESTOCK', label: 'Réapprovisionnement' },
    { value: 'CORRECTION', label: 'Correction' },
  ];

  const adjustmentTypeOptions = [
    { value: 'ADD', label: 'Ajouter du stock' },
    { value: 'REMOVE', label: 'Retirer du stock' },
  ];

  const handleSubmit = async (data) => {
    if (!inventoryItem) return;

    // Data already has uppercase values from options
    const submitData = {
      adjustment_type: data.adjustment_type,
      quantity: parseInt(data.quantity),
      reason: data.reason,
      notes: data.notes || '',
    };

    await formSubmission.submit(() => inventoryAPI.adjustStock(inventoryItem.id, submitData));
  };

  const getNewStockQuantity = (adjustmentType, quantity) => {
    if (!inventoryItem) return 0;
    if (!quantity) return inventoryItem.stock_quantity;

    return adjustmentType.toLowerCase() === 'add'
      ? inventoryItem.stock_quantity + quantity
      : inventoryItem.stock_quantity - quantity;
  };

  if (!inventoryItem) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      header={<h2 className="text-lg font-semibold text-slate-900">Ajuster le Stock</h2>}
      body={
        <Form
          schema={inventoryAdjustmentSchema}
          onSubmit={handleSubmit}
          defaultValues={{
            adjustment_type: 'ADD',
            quantity: '',
            reason: '',
            notes: '',
          }}
        >
          {({ register, watch, formState: { errors, isSubmitting } }) => {
            const watchedAdjustmentType = watch('adjustment_type');
            const watchedQuantity = watch('quantity');

            return (
              <div className="space-y-6">
                {/* Current Stock Display */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">
                        {inventoryItem.phone.brand} {inventoryItem.phone.model}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {inventoryItem.phone.storage}{inventoryItem.phone.brand?.toLowerCase() !== 'apple' && inventoryItem.phone.ram ? ` • ${inventoryItem.phone.ram}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Stock actuel</div>
                      <div className="text-lg font-semibold text-slate-900">
                        {inventoryItem.stock_quantity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Adjustment Type */}
                <Select
                  {...register('adjustment_type')}
                  label="Type d'ajustement"
                  options={adjustmentTypeOptions}
                  error={errors.adjustment_type}
                  required
                />

                {/* Quantity Input */}
                <Input
                  {...register('quantity')}
                  label="Quantité"
                  type="number"
                  min="1"
                  error={errors.quantity}
                  required
                />

                {/* New Stock Preview */}
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">Nouvelle quantité de stock :</span>
                    <span className="text-lg font-semibold text-blue-900">
                      {getNewStockQuantity(watchedAdjustmentType || 'ADD', parseInt(watchedQuantity) || 0)}
                    </span>
                  </div>
                </div>

                {/* Reason Dropdown */}
                <Select
                  {...register('reason')}
                  label="Raison"
                  options={reasonOptions}
                  placeholder="Sélectionnez la raison de l'ajustement"
                  error={errors.reason}
                  required
                />

                {/* Notes Field */}
                <Textarea
                  {...register('notes')}
                  label="Notes (Optionnel)"
                  error={errors.notes}
                  rows={3}
                />

                <FormActions
                  isSubmitting={isSubmitting || formSubmission.isSubmitting}
                  submitLabel={watchedAdjustmentType?.toLowerCase() === 'add' ? 'Ajouter du stock' : 'Retirer du stock'}
                  onCancel={onClose}
                />
              </div>
            );
          }}
        </Form>
      }
    />
  );
};

export default AdjustStockModal;
