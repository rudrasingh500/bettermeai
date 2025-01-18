import { create } from 'zustand';
import { supabase } from './supabase';
import type { AuthState, Profile } from './types';

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  initialized: false,
  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true });
      
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) {
        if (signInError.message === 'Invalid login credentials') {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw signInError;
      }
      
      if (!authData.user) throw new Error('No user data returned');
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (profileError) {
        console.error('Profile fetch error:', profileError);
        await supabase.auth.signOut();
        throw new Error('Failed to fetch user profile. Please try again.');
      }

      if (!profile) {
        console.error('No profile found for user');
        await supabase.auth.signOut();
        throw new Error('User profile not found. Please contact support.');
      }

      set({ user: profile, isLoading: false });
      return profile;
    } catch (error) {
      set({ isLoading: false });
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred. Please try again.');
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

      set({ user: profile, isLoading: false });
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
      set({ user: null, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  refreshSession: async () => {
    if (!get().initialized) return;
    
    try {
      set({ isLoading: true });
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        set({ user: null, isLoading: false });
        return;
      }
      
      if (!session?.user) {
        set({ user: null, isLoading: false });
        return;
      }
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        // Instead of logging the error and setting user to null,
        // we'll keep the existing user data if available
        console.warn('Profile refresh warning:', profileError);
        set({ isLoading: false });
        return;
      }
      
      if (!profile) {
        console.warn('No profile found during refresh');
        set({ isLoading: false });
        return;
      }
      
      set({ user: profile, isLoading: false });
    } catch (error) {
      console.warn('Error refreshing session:', error);
      // Don't clear the user on refresh errors
      set({ isLoading: false });
    }
  }
}));

// Initialize auth state
const initializeAuth = async () => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session initialization error:', sessionError);
      useAuthStore.setState({ user: null, isLoading: false, initialized: true });
      return;
    }

    if (session?.user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        console.warn('Profile initialization warning:', profileError);
        useAuthStore.setState({ isLoading: false, initialized: true });
        return;
      }

      if (!profile) {
        console.warn('No profile found during initialization');
        useAuthStore.setState({ isLoading: false, initialized: true });
        return;
      }

      useAuthStore.setState({ user: profile, isLoading: false, initialized: true });
    } else {
      useAuthStore.setState({ user: null, isLoading: false, initialized: true });
    }
  } catch (error) {
    console.warn('Error initializing auth:', error);
    useAuthStore.setState({ isLoading: false, initialized: true });
  }
};

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && useAuthStore.getState().initialized) {
    useAuthStore.getState().refreshSession();
  }
});

// Listen for auth changes
supabase.auth.onAuthStateChange(async (event, session) => {
  if (!useAuthStore.getState().initialized) return;

  if (event === 'SIGNED_OUT') {
    useAuthStore.setState({ user: null, isLoading: false });
    return;
  }

  if (event === 'SIGNED_IN' && session?.user) {
    await useAuthStore.getState().refreshSession();
  }
});

// Initialize auth state immediately
initializeAuth();

export { useAuthStore };