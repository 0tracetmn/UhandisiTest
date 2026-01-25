import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { announcementsService } from '../services/announcements.service';

export const useUnreadAnnouncements = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const count = await announcementsService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread announcements:', error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel('unread-announcements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcement_reads',
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { unreadCount, refreshUnreadCount: fetchUnreadCount };
};
