import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryAPI } from '../services/api';

// Query keys
export const inventoryKeys = {
  all: ['inventory'],
  lists: () => [...inventoryKeys.all, 'list'],
  list: (filters) => [...inventoryKeys.lists(), filters],
  details: () => [...inventoryKeys.all, 'detail'],
  detail: (id) => [...inventoryKeys.details(), id],
  history: (id) => [...inventoryKeys.detail(id), 'history'],
  stockHistory: (filters) => [...inventoryKeys.all, 'stock-history', filters],
};

// Get all inventory items with optional filters
export const useInventory = (filters) => {
  return useQuery({
    queryKey: inventoryKeys.list(filters || {}),
    queryFn: () => inventoryAPI.getAll(filters).then(res => res.data),
  });
};

// Get single inventory item by ID
export const useInventoryItem = (id) => {
  return useQuery({
    queryKey: inventoryKeys.detail(id),
    queryFn: () => inventoryAPI.get(id).then(res => res.data),
    enabled: !!id,
  });
};

// Get inventory history for an item
export const useInventoryHistory = (id, filters) => {
  return useQuery({
    queryKey: inventoryKeys.history(id),
    queryFn: () => inventoryAPI.getHistory(id, filters).then(res => res.data),
    enabled: !!id,
  });
};

// Get all stock history
export const useStockHistory = (filters) => {
  return useQuery({
    queryKey: inventoryKeys.stockHistory(filters || {}),
    queryFn: () => inventoryAPI.getStockHistory(filters).then(res => res.data),
  });
};

// Get stock history statistics
export const useStockHistoryStats = (filters) => {
  return useQuery({
    queryKey: ['inventory', 'stock-history', 'stats', filters],
    queryFn: () => inventoryAPI.getStockHistoryStats(filters).then(res => res.data),
  });
};

// Create inventory item mutation
export const useCreateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoryAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Update inventory item mutation
export const useUpdateInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => inventoryAPI.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Adjust stock mutation
export const useAdjustStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => inventoryAPI.adjustStock(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.history(id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockHistory({}) });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Delete inventory item mutation
export const useDeleteInventoryItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoryAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
