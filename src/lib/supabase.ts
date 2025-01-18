import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

// Create Supabase client with proper configuration and retry logic
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'apikey': supabaseKey
    }
  },
  // Add retry configuration
  fetch: (url, options = {}) => {
    const retryCount = 3;
    const retryDelay = 1000; // 1 second

    const fetchWithRetry = async (attempt = 0): Promise<Response> => {
      try {
        const response = await fetch(url, {
          ...options,
          // Add cache control headers
          headers: {
            ...options.headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });

        if (!response.ok && attempt < retryCount) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response;
      } catch (error) {
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, attempt)));
          return fetchWithRetry(attempt + 1);
        }
        throw error;
      }
    };

    return fetchWithRetry();
  }
});

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear any session-specific state if needed
    return;
  }

  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    // The Supabase client will automatically handle the Authorization header
  }
});