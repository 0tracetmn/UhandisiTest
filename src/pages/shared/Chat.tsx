import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { chatService } from '../../services/chat.service';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { MessageCircle, Send, Search, Users, User, Calendar } from 'lucide-react';
import { ChatConversation, ChatMessage, Booking, GroupSession } from '../../types';
import { supabase } from '../../lib/supabase';

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const { refreshUnreadCount } = useUnreadMessages();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [availableBookings, setAvailableBookings] = useState<Booking[]>([]);
  const [availableGroupSessions, setAvailableGroupSessions] = useState<GroupSession[]>([]);
  const [showAvailableChats, setShowAvailableChats] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
    fetchAvailableBookings();
    fetchAvailableGroupSessions();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      handleMarkAsRead(selectedConversation.id);

      const channel = supabase
        .channel(`messages-${selectedConversation.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `conversation_id=eq.${selectedConversation.id}`,
          },
          () => {
            fetchMessages(selectedConversation.id);
            handleMarkAsRead(selectedConversation.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedConversation]);

  const handleMarkAsRead = async (conversationId: string) => {
    await chatService.markMessagesAsRead(conversationId);
    refreshUnreadCount();
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const data = await chatService.getConversations();
      setConversations(data);
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          student:profiles!student_id(id, name),
          tutor:profiles!tutor_id(id, name)
        `)
        .in('status', ['approved', 'assigned', 'completed'])
        .not('tutor_id', 'is', null)
        .or(`student_id.eq.${user?.id},tutor_id.eq.${user?.id}`)
        .eq('class_type', 'one-on-one');

      if (error) throw error;

      const existingConvBookingIds = conversations
        .filter(c => c.bookingId)
        .map(c => c.bookingId);

      const bookingsWithoutConv = (data || []).filter(
        b => !existingConvBookingIds.includes(b.id)
      );

      setAvailableBookings(bookingsWithoutConv.map(b => ({
        id: b.id,
        studentId: b.student_id,
        studentName: b.student?.name || '',
        studentEmail: '',
        studentPhone: '',
        subject: b.subject,
        sessionType: b.session_type,
        classType: b.class_type,
        preferredDate: b.preferred_date,
        preferredTime: b.preferred_time,
        status: b.status,
        tutorId: b.tutor_id,
        tutorName: b.tutor?.name || '',
        notes: b.notes,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })));
    } catch (error) {
      console.error('Failed to fetch available bookings:', error);
    }
  };

  const fetchAvailableGroupSessions = async () => {
    try {
      const { data, error } = await supabase
        .from('group_sessions')
        .select(`
          *,
          tutor:profiles!tutor_id(id, name),
          participants:group_session_participants(student_id, profiles!student_id(id, name))
        `)
        .in('status', ['assigned', 'approved', 'completed'])
        .not('tutor_id', 'is', null);

      if (error) throw error;

      const userGroupSessions = (data || []).filter(gs => {
        const isTutor = gs.tutor_id === user?.id;
        const isParticipant = gs.participants?.some(
          (p: any) => p.student_id === user?.id
        );
        return isTutor || isParticipant;
      });

      const existingConvGroupIds = conversations
        .filter(c => c.groupSessionId)
        .map(c => c.groupSessionId);

      const groupsWithoutConv = userGroupSessions.filter(
        gs => !existingConvGroupIds.includes(gs.id)
      );

      setAvailableGroupSessions(groupsWithoutConv.map(gs => ({
        id: gs.id,
        subject: gs.subject,
        serviceId: gs.service_id,
        sessionType: gs.session_type,
        preferredDate: gs.preferred_date,
        preferredTime: gs.preferred_time,
        status: gs.status,
        tutorId: gs.tutor_id,
        tutorName: gs.tutor?.name || '',
        minStudents: gs.min_students,
        maxStudents: gs.max_students,
        currentCount: gs.current_count,
        createdAt: gs.created_at,
        updatedAt: gs.updated_at,
      })));
    } catch (error) {
      console.error('Failed to fetch available group sessions:', error);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleStartChatForBooking = async (bookingId: string) => {
    try {
      const conversationId = await chatService.getOrCreateConversationForBooking(bookingId);
      await fetchConversations();
      await fetchAvailableBookings();
      const newConv = conversations.find(c => c.id === conversationId) ||
                      (await chatService.getConversations()).find(c => c.id === conversationId);
      if (newConv) {
        setSelectedConversation(newConv);
      }
      setShowAvailableChats(false);
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      alert(error.message || 'Failed to start chat');
    }
  };

  const handleStartChatForGroupSession = async (groupSessionId: string) => {
    try {
      const conversationId = await chatService.getOrCreateConversationForGroupSession(groupSessionId);
      await fetchConversations();
      await fetchAvailableGroupSessions();
      const newConv = conversations.find(c => c.id === conversationId) ||
                      (await chatService.getConversations()).find(c => c.id === conversationId);
      if (newConv) {
        setSelectedConversation(newConv);
      }
      setShowAvailableChats(false);
    } catch (error: any) {
      console.error('Failed to start chat:', error);
      alert(error.message || 'Failed to start group chat');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await chatService.sendMessage(selectedConversation.id, newMessage);
      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.participants.some((p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const getConversationTitle = (conv: ChatConversation) => {
    if (conv.groupSessionId) {
      return `Group: ${conv.participants.length} members`;
    }
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.name || 'Unknown';
  };

  const getConversationSubtitle = (conv: ChatConversation) => {
    if (conv.groupSessionId) {
      return conv.participants.map(p => p.name).join(', ');
    }
    const otherParticipant = conv.participants.find((p) => p.id !== user?.id);
    return otherParticipant?.role || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-600 mt-1">Chat with tutors and students</p>
        </div>
        {(availableBookings.length > 0 || availableGroupSessions.length > 0) && (
          <Button onClick={() => setShowAvailableChats(!showAvailableChats)}>
            {showAvailableChats ? 'Hide' : 'Start New Chat'}
          </Button>
        )}
      </div>

      {showAvailableChats && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-slate-900">Available Chats</h2>
          </CardHeader>
          <CardBody>
            {availableBookings.length === 0 && availableGroupSessions.length === 0 ? (
              <p className="text-slate-600 text-center py-4">No available chats</p>
            ) : (
              <div className="space-y-3">
                {availableBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900">
                          {user?.id === booking.studentId ? booking.tutorName : booking.studentName}
                        </p>
                        <p className="text-sm text-slate-600">
                          {booking.subject} - {booking.sessionType}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStartChatForBooking(booking.id)}
                    >
                      Start Chat
                    </Button>
                  </div>
                ))}
                {availableGroupSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900">
                          Group: {session.subject}
                        </p>
                        <p className="text-sm text-slate-600">
                          {session.currentCount} students - {session.sessionType}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleStartChatForGroupSession(session.id)}
                    >
                      Start Group Chat
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-20rem)]">
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardBody className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 text-sm">No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConversations.map((conv) => {
                  const isGroupChat = conv.groupSessionId !== undefined && conv.groupSessionId !== null;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedConversation(conv)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedConversation?.id === conv.id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                          {isGroupChat ? (
                            <Users className="w-5 h-5" />
                          ) : (
                            getConversationTitle(conv).charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {getConversationTitle(conv)}
                          </p>
                          <p className="text-sm text-slate-600 truncate">
                            {conv.lastMessage?.content || 'No messages yet'}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                    {selectedConversation.groupSessionId ? (
                      <Users className="w-5 h-5" />
                    ) : (
                      getConversationTitle(selectedConversation).charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {getConversationTitle(selectedConversation)}
                    </h3>
                    <p className="text-sm text-slate-600">
                      {selectedConversation.groupSessionId ? (
                        <span className="capitalize">
                          {selectedConversation.participants.map(p => p.name).join(', ')}
                        </span>
                      ) : (
                        <span className="capitalize">{getConversationSubtitle(selectedConversation)}</span>
                      )}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardBody className="flex-1 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600">No messages yet</p>
                      <p className="text-sm text-slate-500 mt-1">Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              isOwn
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-900'
                            }`}
                          >
                            {!isOwn && selectedConversation.groupSessionId && (
                              <p className="text-xs font-semibold mb-1 opacity-75">
                                {message.senderName}
                              </p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                isOwn ? 'text-blue-100' : 'text-slate-500'
                              }`}
                            >
                              {new Date(message.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </CardBody>

              <div className="p-4 border-t border-slate-200">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <Input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <CardBody className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Select a conversation to start messaging</p>
              </div>
            </CardBody>
          )}
        </Card>
      </div>
    </div>
  );
};
