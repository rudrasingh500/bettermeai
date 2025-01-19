import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Profile } from '../../../lib/types';

interface ConnectionWithProfiles {
  id: string;
  user1_id: string;
  user2_id: string;
  status: string;
  user1: Profile;
  user2: Profile;
}

interface Connection {
  profile: Profile;
  status: string;
  outgoing: boolean;
}

export const useConnections = (userId: string) => {
  const [potentialConnections, setPotentialConnections] = useState<Profile[]>([]);
  const [myConnections, setMyConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const { data, error: err } = await supabase
        .from('connections')
        .select(`
          id,
          user1_id,
          user2_id,
          status,
          user1:profiles!connections_user1_id_fkey (
            id, username, avatar_url, rating
          ),
          user2:profiles!connections_user2_id_fkey (
            id, username, avatar_url, rating
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (err) throw err;

      const transformedConnections = (data || []).map(conn => {
        const user1 = conn.user1 as unknown as Profile;
        const user2 = conn.user2 as unknown as Profile;
        return {
          profile: conn.user1_id === userId ? user2 : user1,
          status: conn.status,
          outgoing: conn.user1_id === userId
        };
      });

      setMyConnections(transformedConnections);
      setError(null);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to fetch connections');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const fetchPotentialConnections = useCallback(async (userRating: number) => {
    try {
      setIsLoading(true);
      // First get existing connection user IDs
      const { data: existingConnections, error: connectionsError } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (connectionsError) throw connectionsError;

      // Create array of user IDs to exclude
      const excludeIds = [
        userId,
        ...existingConnections?.map(c => c.user1_id === userId ? c.user2_id : c.user1_id) || []
      ].filter(Boolean);

      // Handle case when there are no connections
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .gte('rating', userRating - 1)
        .lte('rating', userRating + 1)
        .not('id', 'in', `(${excludeIds.join(',')})`);

      if (error) throw error;

      setPotentialConnections(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching potential connections:', err);
      setError('Failed to load potential connections');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const sendConnectionRequest = async (profileId: string, userRating: number) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('connections')
        .insert([{
          user1_id: userId,
          user2_id: profileId,
          status: 'pending'
        }])
        .select();

      if (error) throw error;
      await fetchConnections();
      await fetchPotentialConnections(userRating);
    } catch (err) {
      console.error('Error sending connection request:', err);
      setError('Failed to send connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const updateConnectionStatus = async (profileId: string, status: 'accepted' | 'rejected') => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('connections')
        .update({ status })
        .or(`and(user1_id.eq.${profileId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profileId})`)
        .eq('status', 'pending');

      if (error) throw error;
      await fetchConnections();
    } catch (err) {
      console.error('Error updating connection status:', err);
      setError('Failed to update connection status');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    potentialConnections,
    myConnections,
    error,
    isLoading,
    fetchConnections,
    fetchPotentialConnections,
    sendConnectionRequest,
    updateConnectionStatus
  };
}; 