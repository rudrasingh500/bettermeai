import { create } from 'zustand';
import { supabase } from './supabase';
import type { AuthState, Profile } from './types';

const REFRESH_THRESHOLD = 5 * 60; // 5 minutes in seconds

type AuthError = {
  message: string;
  code?: string;
};

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  initialized: false,
  lastRefresh: Math.floor(Date.now() / 1000),
  signIn: async (email: string, password: string): Promise<Profile> => {
    try {
      set({ isLoading: true });
      
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw new Error(signInError.message);
      if (!authData?.user) throw new Error('No user data returned');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError || !profile) {
        await supabase.auth.signOut();
        throw new Error('Failed to fetch user profile');
      }

      const now = Math.floor(Date.now() / 1000);
      set({ user: profile, isLoading: false, lastRefresh: now });
      return profile;
    } catch (error) {
      set({ isLoading: false });
      throw error instanceof Error ? error : new Error('An unexpected error occurred');
    }
  },
  signUp: async (email: string, password: string, username: string, gender: Profile['gender']) => {
    try {
      set({ isLoading: true });
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        }
        throw signUpError;
      }
      
      if (!authData.user) throw new Error('No user data returned from signup');

      const newProfile = {
        id: authData.user.id,
        username,
        gender,
        rating: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([newProfile]);
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
        await supabase.auth.signOut();
        throw new Error('Failed to create user profile. Please try again.');
      }

      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (fetchError || !profile) {
        console.error('Profile fetch error:', fetchError);
        await supabase.auth.signOut();
        throw new Error('Failed to fetch created profile. Please try again.');
      }

      const now = Math.floor(Date.now() / 1000);
      console.log('Setting isLoading to false.');
      set({ user: profile, isLoading: false, lastRefresh: now });
      return profile;
    } catch (error) {
      set({ isLoading: false });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred during signup. Please try again.');
    }
  },
  signOut: async () => {
    try {
      set({ isLoading: true });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      const now = Math.floor(Date.now() / 1000);
      set({ user: null, isLoading: false, lastRefresh: now });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  refreshSession: async () => {
    console.log('refreshSession function called.');
    if (!get().initialized) return;

    const now = Math.floor(Date.now() / 1000);
    const timeSinceLastRefresh = now - get().lastRefresh;
    
    if (timeSinceLastRefresh < REFRESH_THRESHOLD) {
      console.log('Session was refreshed recently, skipping refresh');
      return;
    }
    
    try {
      set({ isLoading: true });
      console.log('Proceeding with session refresh...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        set({ user: null, isLoading: false, lastRefresh: now });
        return;
      }
      
      if (!session?.user) {
        console.log('No user session found during refresh.');
        set({ user: null, isLoading: false, lastRefresh: now });
        return;
      }

      if (!get().user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileError || !profile) {
          console.warn('Profile fetch error:', profileError);
          set({ isLoading: false, lastRefresh: now });
          return;
        }
        
        set({ user: profile, isLoading: false, lastRefresh: now });
      } else {
        set({ isLoading: false, lastRefresh: now });
      }
    } catch (error) {
      console.warn('Error refreshing session:', error);
      set({ isLoading: false, lastRefresh: now });
    }
  }
}));

// Initialize auth state
const initializeAuth = async () => {
  if (useAuthStore.getState().initialized) return;
  
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    const now = Math.floor(Date.now() / 1000);
    
    if (sessionError) {
      console.error('Session initialization error:', sessionError);
      useAuthStore.setState({ user: null, isLoading: false, initialized: true, lastRefresh: now });
      return;
    }

    if (!session?.user) {
      useAuthStore.setState({ user: null, isLoading: false, initialized: true, lastRefresh: now });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile) {
      console.warn('Profile initialization warning:', profileError);
      useAuthStore.setState({ user: null, isLoading: false, initialized: true, lastRefresh: now });
      return;
    }

    useAuthStore.setState({ 
      user: profile, 
      isLoading: false, 
      initialized: true, 
      lastRefresh: now 
    });
  } catch (error) {
    console.warn('Error initializing auth:', error);
    useAuthStore.setState({ 
      user: null, 
      isLoading: false, 
      initialized: true, 
      lastRefresh: Math.floor(Date.now() / 1000) 
    });
  }
};

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && useAuthStore.getState().initialized) {
    const { user, lastRefresh } = useAuthStore.getState();
    const now = Math.floor(Date.now() / 1000);
    
    if (user && (now - lastRefresh) >= REFRESH_THRESHOLD) {
      console.log('Session needs refresh, refreshing...');
      useAuthStore.getState().refreshSession();
    } else {
      console.log('Session still valid or no user, skipping refresh');
    }
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (!useAuthStore.getState().initialized) return;

  const now = Math.floor(Date.now() / 1000);
  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, isLoading: false, lastRefresh: now });
    return;
  }

  if (event === 'SIGNED_IN' && session?.user) {
    await useAuthStore.getState().refreshSession();
  }
});

// Initialize auth state immediately
initializeAuth();

export { useAuthStore };