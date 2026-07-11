import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '../services/api';

// Query keys
export const customerKeys = {
  // all: ['customers'] const,
  // lists: () => [...customerKeys.all, 'list'] const,
  // list: (filters: Record<string, any>) => [...customerKeys.lists(), filters] const,
  // details: () => [...customerKeys.all, 'detail'] const,
  // detail: (id) => [...customerKeys.details(), id] const,
};

// Get all customers with optional filters
export const useCustomers = (filters: Record<string, any>) => {
  return useQuery({
    // queryKeyKeys.list(filters || {}),
    // queryFn: () => customersAPI.getAll(filters),
  });
};

// Get single customer by ID
export const useCustomer = (id) => {
  return useQuery({
    // queryKeyKeys.detail(id),
    // queryFn: () => customersAPI.get(id),
    // enabled: !!id,
  });
};

// Create customer mutation
export const useCreateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFnsAPI.create,
    // onSuccess: () => {
      queryClient.invalidateQueries({ queryKeyKeys.all });
    },
  });
};

// Update customer mutation
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: ({ id, data }: { id; data }) => customersAPI.update(id, data),
    // onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKeyKeys.all });
      queryClient.invalidateQueries({ queryKeyKeys.detail(id) });
    },
  });
};

// Delete customer mutation
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFnsAPI.delete,
    // onSuccess: () => {
      queryClient.invalidateQueries({ queryKeyKeys.all });
    },
  });
};
