import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';

interface UseConnections {
  acceptConnection: (connectionId: string) => Promise<void>;
  rejectConnection: (connectionId: string) => Promise<void>;
}

export const useConnections = (): UseConnections => {
  const { user } = useAuthStore();

  const acceptConnection = useCallback(async (connectionId: string) => {
    if (!user) {
      console.error('No user found');
      return;
    }
    try {
      console.log('Accepting connection:', connectionId);
      
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (error) {
        console.error('Error accepting connection:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error accepting connection:', err);
      throw err;
    }
  }, [user]);

  const rejectConnection = useCallback(async (connectionId: string) => {
    if (!user) {
      console.error('No user found');
      return;
    }
    try {
      console.log('Rejecting connection:', connectionId);
      
      const { error } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (error) {
        console.error('Error rejecting connection:', error);
        throw error;
      }
    } catch (err) {
      console.error('Error rejecting connection:', err);
      throw err;
    }
  }, [user]);

  return {
    acceptConnection,
    rejectConnection
  };
}; 