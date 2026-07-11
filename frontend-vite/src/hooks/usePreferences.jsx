import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { preferencesAPI } from '../services/api';

// Query keys
export const preferencesKeys = {
  all: ['preferences'],
  current: () => [...preferencesKeys.all, 'current'],
};

// Get current user preferences
export const usePreferences = () => {
  return useQuery({
    queryKey: preferencesKeys.current(),
    queryFn: () => preferencesAPI.get(),
  });
};

// Update preferences mutation
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesAPI.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
    },
  });
};

// Create preferences mutation (for first time setup)
export const useCreatePreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: preferencesAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: preferencesKeys.all });
    },
  });
};
