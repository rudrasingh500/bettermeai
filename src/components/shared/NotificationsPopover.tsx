import React from 'react';
import { Bell, Check, X, Loader2, UserCheck } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuthStore } from '../../lib/store';
import { useConnections } from '../../hooks/useConnections';
import { useNavigate } from 'react-router-dom';

interface BaseNotification {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected' | 'connection_post';
  read: boolean;
  created_at: string;
  profile?: {
    username: string;
  };
}

interface ConnectionNotification extends BaseNotification {
  type: 'connection_request' | 'connection_accepted' | 'connection_rejected';
  data?: {
    connection_id: string;
    user_id: string;
    status?: string;
  };
}

interface PostNotification extends BaseNotification {
  type: 'connection_post';
  data: {
    username: string;
    post_id: string;
    post_type: 'analysis' | 'progress';
  };
}

type Notification = ConnectionNotification | PostNotification;

export const NotificationsPopover: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    error,
    isLoading,
    markAsRead,
    markAllAsRead
  } = useNotifications(user?.id || '');

  // Mark notifications as read when opened
  React.useEffect(() => {
    if (isOpen && unreadCount > 0) {
      markAllAsRead();
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  // Close popover when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleViewConnections = async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setIsOpen(false);
      navigate('/community', { state: { activeTab: 'connections' } });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleViewPost = (postId: string) => {
    navigate(`/feed?post=${postId}`);
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'connection_request':
        return `${notification.profile?.username} sent you a connection request`;
      case 'connection_accepted':
        return `${notification.profile?.username} is now your connection`;
      case 'connection_rejected':
        return `${notification.profile?.username} declined your connection request`;
      case 'connection_post':
        return (
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{notification.data?.username}</span>
              {' shared a new '}
              {notification.data?.post_type === 'analysis' ? 'analysis' : 'progress update'}
            </div>
            <button
              onClick={() => notification.data?.post_id && handleViewPost(notification.data.post_id)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100"
              aria-label="View post"
            >
              View Post
            </button>
          </div>
        );
      default:
        return 'New notification';
    }
  };

  const shouldShowViewConnections = (notification: Notification) => {
    return !notification.read && notification.type === 'connection_request';
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span 
            className="absolute top-0 right-0 inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-red-500 rounded-full"
            aria-hidden="true"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-50"
          role="dialog"
          aria-label="Notifications panel"
        >
          <div className="p-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold" id="notifications-title">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                  aria-label="Mark all notifications as read"
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          <div 
            className="max-h-96 overflow-y-auto"
            role="list"
            aria-labelledby="notifications-title"
          >
            {isLoading ? (
              <div className="p-4 text-center" aria-label="Loading notifications">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification: Notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 ${notification.read ? 'bg-white' : 'bg-blue-50'}`}
                    role="listitem"
                  >
                    <p className="text-sm text-gray-800">
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </p>
                    {shouldShowViewConnections(notification) && (
                      <button
                        onClick={() => handleViewConnections(notification.id)}
                        className="mt-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                        aria-label="View in Connections"
                      >
                        View in Connections
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div 
              className="p-4 text-red-600 text-sm border-t"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 