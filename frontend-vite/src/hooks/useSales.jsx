import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesAPI } from '../services/api';

// Query keys
export const saleKeys = {
  // all: ['sales'] const,
  // lists: () => [...saleKeys.all, 'list'] const,
  // list: (filters: Record<string, any>) => [...saleKeys.lists(), filters] const,
  // details: () => [...saleKeys.all, 'detail'] const,
  // detail: (id) => [...saleKeys.details(), id] const,
};

// Get all sales with optional filters
export const useSales = (filters: Record<string, any>) => {
  return useQuery({
    // queryKey: saleKeys.list(filters || {}),
    // queryFn: () => salesAPI.getAll(filters),
  });
};

// Get single sale by ID
export const useSale = (id) => {
  return useQuery({
    // queryKey: saleKeys.detail(id),
    // queryFn: () => salesAPI.get(id),
    // enabled: !!id,
  });
};

// Create sale mutation
export const useCreateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: salesAPI.create,
    // onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      // Also invalidate inventory and dashboard queries
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Update sale mutation
export const useUpdateSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: ({ id, data }: { id; data }) => salesAPI.update(id, data),
    // onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: saleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Delete sale mutation
export const useDeleteSale = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: salesAPI.delete,
    // onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: saleKeys.all });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
