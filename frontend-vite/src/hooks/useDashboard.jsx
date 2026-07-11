import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';

// Query keys
export const dashboardKeys = {
  // all: ['dashboard'] const,
  // stats: () => [...dashboardKeys.all, 'stats'] const,
  // stat: (period) => [...dashboardKeys.stats(), period] const,
};

// Get dashboard stats
export const useDashboardStats = (period) => {
  return useQuery({
    // queryKey: dashboardKeys.stat(period),
    // queryFn: () => dashboardAPI.getStats(period),
  });
};
