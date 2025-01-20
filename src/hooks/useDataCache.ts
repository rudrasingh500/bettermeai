import { useEffect, useCallback } from 'react';
import { mobileService } from '../lib/mobile';
import { useLoadingStore } from '../lib/loadingManager';

interface CacheConfig<T> {
  key: string;
  fetchFn: () => Promise<T>;
  ttl?: number; // Time to live in milliseconds
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
}

export function useDataCache<T>({ key, fetchFn, ttl = 5 * 60 * 1000, onSuccess, onError }: CacheConfig<T>) {
  const { setLoading, isLoading } = useLoadingStore();
  const cacheKey = `cache_${key}`;
  const timestampKey = `timestamp_${key}`;

  const fetchAndCache = useCallback(async (force = false) => {
    const cachedTimestamp = await mobileService.getData(timestampKey);
    const now = Date.now();

    // Check if cache is still valid
    if (!force && cachedTimestamp) {
      const timestamp = parseInt(cachedTimestamp, 10);
      if (now - timestamp < ttl) {
        const cachedData = await mobileService.getData(cacheKey);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData) as T;
          onSuccess?.(parsedData);
          return parsedData;
        }
      }
    }

    // Fetch new data
    setLoading(key, true);
    try {
      const data = await fetchFn();
      await Promise.all([
        mobileService.storeData(cacheKey, JSON.stringify(data)),
        mobileService.storeData(timestampKey, now.toString()),
      ]);
      onSuccess?.(data);
      return data;
    } catch (error) {
      onError?.(error);
      throw error;
    } finally {
      setLoading(key, false);
    }
  }, [key, fetchFn, ttl, onSuccess, onError, cacheKey, timestampKey, setLoading]);

  useEffect(() => {
    fetchAndCache().catch(console.error);
  }, [fetchAndCache]);

  return {
    isLoading: isLoading(key),
    refetch: (force = true) => fetchAndCache(force),
    clearCache: async () => {
      await Promise.all([
        mobileService.removeData(cacheKey),
        mobileService.removeData(timestampKey),
      ]);
    },
  };
} 