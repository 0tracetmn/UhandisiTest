import { supabase } from '../lib/supabase';
import { Payment } from '../types';

export const paymentsService = {
  async getAll(): Promise<Payment[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile?.role === 'student') {
      query = query.eq('student_id', user.id);
    }

    const { data, error } = await query;

    if (error) throw error;

    return (data || []).map(payment => ({
      id: payment.id,
      bookingId: payment.booking_id,
      studentId: payment.student_id,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      createdAt: payment.created_at,
    }));
  },

  async create(paymentData: {
    bookingId: string;
    amount: number;
    paymentMethod?: string;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('payments')
      .insert({
        booking_id: paymentData.bookingId,
        student_id: user.id,
        amount: paymentData.amount,
        payment_method: paymentData.paymentMethod || null,
        status: 'pending',
      });

    if (error) throw error;
  },

  async updateStatus(paymentId: string, status: string, transactionId?: string): Promise<void> {
    const updates: any = { status };
    if (transactionId) {
      updates.transaction_id = transactionId;
    }

    const { error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', paymentId);

    if (error) throw error;
  },
};
