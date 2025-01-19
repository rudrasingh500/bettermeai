import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Profile } from '../../../lib/types';

interface ConnectionWithProfiles {
  user1_id: string;
  user2_id: string;
  status: string;
  profiles_user1: Profile;
  profiles_user2: Profile;
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
      const { data, error: connectionsError } = await supabase
        .from('connections')
        .select(`
          *,
          profiles_user1:profiles!connections_user1_id_fkey (
            id, username, rating
          ),
          profiles_user2:profiles!connections_user2_id_fkey (
            id, username, rating
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (connectionsError) throw connectionsError;

      // Transform connections data
      const connections = (data || []).map((connection: ConnectionWithProfiles) => {
        const isUser1 = connection.user1_id === userId;
        return {
          profile: isUser1 ? connection.profiles_user2 : connection.profiles_user1,
          status: connection.status,
          outgoing: isUser1
        };
      });

      setMyConnections(connections);
      setError(null);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to load connections');
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
      ];

      // Handle case when there are no connections
      const query = excludeIds.length > 1
        ? supabase
            .from('profiles')
            .select('*')
            .not('id', 'in', `(${excludeIds.join(',')})`)
            .gte('rating', userRating - 1)
            .lte('rating', userRating + 1)
        : supabase
            .from('profiles')
            .select('*')
            .neq('id', userId)
            .gte('rating', userRating - 1)
            .lte('rating', userRating + 1);

      const { data, error } = await query;

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
        }]);

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
        .or(`and(user1_id.eq.${profileId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${profileId})`);

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