import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { phonesAPI } from '../services/api';

// Query keys
export const phoneKeys = {
  // all: ['phones'] const,
  // lists: () => [...phoneKeys.all, 'list'] const,
  // list: (filters: Record<string, any>) => [...phoneKeys.lists(), filters] const,
  // details: () => [...phoneKeys.all, 'detail'] const,
  // detail: (id) => [...phoneKeys.details(), id] const,
};

// Get all phones with optional filters
export const usePhones = (filters: Record<string, any>) => {
  return useQuery({
    // queryKey: phoneKeys.list(filters || {}),
    // queryFn: () => phonesAPI.getAll(filters),
  });
};

// Get single phone by ID
export const usePhone = (id) => {
  return useQuery({
    // queryKey: phoneKeys.detail(id),
    // queryFn: () => phonesAPI.get(id),
    // enabled: !!id,
  });
};

// Create phone mutation
export const useCreatePhone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: phonesAPI.create,
    // onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.all });
    },
  });
};

// Update phone mutation
export const useUpdatePhone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: ({ id, data }: { id; data }) => phonesAPI.update(id, data),
    // onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.all });
      queryClient.invalidateQueries({ queryKey: phoneKeys.detail(id) });
    },
  });
};

// Delete phone mutation
export const useDeletePhone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    // mutationFn: phonesAPI.delete,
    // onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: phoneKeys.all });
    },
  });
};
