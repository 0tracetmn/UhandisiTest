import { supabase } from '../lib/supabase';
import { ChatConversation, ChatMessage } from '../types';

export const chatService = {
  async getConversations(): Promise<ChatConversation[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('chat_participants')
      .select(`
        conversation:chat_conversations(
          id,
          booking_id,
          group_session_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    const conversations = await Promise.all(
      (data || []).map(async ({ conversation }) => {
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id, profiles(id, name, role)')
          .eq('conversation_id', conversation.id);

        const { data: lastMessage } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id)
          .eq('is_read', false)
          .neq('sender_id', user.id);

        return {
          id: conversation.id,
          bookingId: conversation.booking_id,
          groupSessionId: conversation.group_session_id,
          participants: (participants || []).map(p => ({
            id: p.profiles.id,
            name: p.profiles.name,
            role: p.profiles.role,
            email: '',
            createdAt: '',
          })),
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            conversationId: lastMessage.conversation_id,
            senderId: lastMessage.sender_id,
            senderName: '',
            content: lastMessage.content,
            createdAt: lastMessage.created_at,
            isRead: lastMessage.is_read,
          } : undefined,
          unreadCount: count || 0,
          updatedAt: conversation.updated_at,
        };
      })
    );

    return conversations;
  },

  async getMessages(conversationId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(`
        *,
        sender:profiles!sender_id(name)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(message => ({
      id: message.id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderName: message.sender?.name || '',
      content: message.content,
      createdAt: message.created_at,
      isRead: message.is_read,
    }));
  },

  async sendMessage(conversationId: string, content: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content,
      });

    if (error) throw error;

    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
  },

  async createConversation(participantIds: string[]): Promise<string> {
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .insert({})
      .select()
      .single();

    if (convError) throw convError;

    const participants = participantIds.map(userId => ({
      conversation_id: conversation.id,
      user_id: userId,
    }));

    const { error: partError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (partError) throw partError;

    return conversation.id;
  },

  async getOrCreateConversationForBooking(bookingId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if conversation already exists for this booking
    const { data: existingConv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (existingConv) {
      return existingConv.id;
    }

    // Use database function to create conversation with participants
    const { data, error } = await supabase.rpc('create_booking_conversation', {
      p_booking_id: bookingId,
    });

    if (error) throw error;

    return data;
  },

  async getOrCreateConversationForGroupSession(groupSessionId: string): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if conversation already exists for this group session
    const { data: existingConv } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('group_session_id', groupSessionId)
      .maybeSingle();

    if (existingConv) {
      return existingConv.id;
    }

    // Use database function to create conversation with participants
    const { data, error } = await supabase.rpc('create_group_session_conversation', {
      p_group_session_id: groupSessionId,
    });

    if (error) throw error;

    return data;
  },

  async markMessagesAsRead(conversationId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    await supabase
      .from('chat_messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('is_read', false);
  },
};
