import { useQuery } from '@tanstack/react-query';
import { phonesAPI } from '../services/api';

export function usePhoneModels(brand) {
  return useQuery({
    queryKey: ['phoneModels', brand],
    queryFn: async () => {
      if (!brand) return [];
      const { data } = await phonesAPI.getModels(brand);
      return data;
    },
    enabled: !!brand,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
