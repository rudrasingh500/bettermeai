import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

interface Notification {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected';
  data: {
    connection_id: string;
    user_id: string;
    status?: string;
  };
  read: boolean;
  created_at: string;
  profile?: Profile;
}

export const useNotifications = (userId: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      
      // First fetch notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (notificationsError) throw notificationsError;

      // Then fetch profiles for each notification
      const notificationsWithData = await Promise.all(
        (notificationsData || []).map(async (notification) => {
          // Get connection details
          const { data: connection } = await supabase
            .from('connections')
            .select('*')
            .eq('id', notification.data.connection_id)
            .single();

          // Get profile of the other user
          const otherUserId = notification.data.user_id;
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', otherUserId)
            .single();

          return {
            ...notification,
            profile: profile || undefined,
            data: {
              ...notification.data,
              status: connection?.status
            }
          };
        })
      );

      setNotifications(notificationsWithData);
      setUnreadCount(notificationsWithData.filter(n => !n.read).length);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .select();

      if (updateError) throw updateError;
      
      // Update the local state immediately
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Then fetch fresh data
      await fetchNotifications();
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError('Failed to update notification');
    }
  }, [fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (updateError) throw updateError;
      await fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError('Failed to update notifications');
    }
  }, [userId, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    error,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };
}; 