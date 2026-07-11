import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopAPI } from '../services/api';

// Query keys
export const shopKeys = {
  all: ['shop'],
  settings: () => [...shopKeys.all, 'settings'],
};

// Get shop settings
export const useShopSettings = () => {
  return useQuery({
    queryKey: shopKeys.settings(),
    queryFn: () => shopAPI.get(),
  });
};

// Update shop settings mutation
export const useUpdateShopSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shopAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
};

// Upload shop logo mutation
export const useUploadShopLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shopAPI.uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
};

// Delete shop logo mutation
export const useDeleteShopLogo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shopAPI.deleteLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: shopKeys.all });
    },
  });
};
