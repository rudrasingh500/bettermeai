import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CachedData<T> {
  data: T[];
  timestamp: number;
}

export const usePrefetchedData = <T>(
  key: string,
  fetchFn?: () => Promise<T[]>,
  maxAge: number = 30 * 1000 // 30 seconds default
) => {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateData = (newData: T[]) => {
    // Update both state and cache
    setData(newData);
    localStorage.setItem(`prefetched_${key}`, JSON.stringify({
      data: newData,
      timestamp: Date.now()
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Try to get cached data first
        const cached = localStorage.getItem(`prefetched_${key}`);
        if (cached) {
          try {
            const parsedCache: CachedData<T> = JSON.parse(cached);
            const age = Date.now() - parsedCache.timestamp;
            
            // Always show cached data first if available
            if (parsedCache.data && Array.isArray(parsedCache.data)) {
              console.log(`Setting cached ${key} data:`, parsedCache.data);
              setData(parsedCache.data);
            }
            
            // If data is fresh enough and we have data, don't fetch
            if (age < maxAge && parsedCache.data && parsedCache.data.length > 0) {
              console.log(`Using cached ${key} data, age: ${age}ms`);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error(`Error parsing cached ${key} data:`, e);
            localStorage.removeItem(`prefetched_${key}`);
          }
        }

        // If we have a fetch function and either no cache or stale cache, fetch fresh data
        if (fetchFn) {
          console.log(`Fetching fresh ${key} data`);
          const freshData = await fetchFn();
          console.log(`Received fresh ${key} data:`, freshData);
          
          // Update both state and cache
          updateData(freshData);
        }
      } catch (error) {
        console.error(`Error loading ${key} data:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [key, maxAge, fetchFn]);

  return { data, isLoading, updateData };
}; 