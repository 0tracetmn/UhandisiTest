import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsService } from '../services/notifications.service';

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const count = await notificationsService.getUnreadCount();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch unread notifications count:', error);
      }
    };

    fetchCount();

    const unsubscribe = notificationsService.subscribeToNotifications(user.id, fetchCount);

    return () => {
      unsubscribe();
    };
  }, [user]);

  return unreadCount;
};
