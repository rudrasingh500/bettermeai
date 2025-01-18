import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Analysis } from '../../../lib/types';
import type { AnalysisResult } from '../../../lib/gemini';

export const useAnalysisHistory = (userId: string) => {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [latestAnalysis, setLatestAnalysis] = useState<Analysis | null>(null);
  const [latestResults, setLatestResults] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }
      
      setAnalyses(data || []);
      if (data && data.length > 0) {
        setLatestAnalysis(data[0]);
        try {
          const parsedResults = JSON.parse(data[0].analysis_text || '{}');
          if (parsedResults && typeof parsedResults === 'object') {
            setLatestResults(parsedResults);
          }
        } catch (err) {
          console.warn('Error parsing analysis text:', err);
          setLatestResults(null);
        }
      } else {
        setLatestAnalysis(null);
        setLatestResults(null);
      }
    } catch (err) {
      console.error('Error fetching analyses:', err);
      setError('Failed to load analysis history. Please try again later.');
      setAnalyses([]);
      setLatestAnalysis(null);
      setLatestResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    const loadAnalyses = async () => {
      if (userId && mounted) {
        await fetchAnalyses();
      }
    };

    loadAnalyses();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      mounted = false;
    };
  }, [userId, fetchAnalyses]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('analyses_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analyses',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchAnalyses();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchAnalyses]);

  return {
    analyses,
    latestAnalysis,
    latestResults,
    isLoading,
    error,
    refreshHistory: fetchAnalyses
  };
};