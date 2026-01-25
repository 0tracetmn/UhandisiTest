import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { API_ENDPOINTS } from '../../config/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { CreditCard, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Payment } from '../../types';

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const data = await api.get<Payment[]>(API_ENDPOINTS.payments.list);
      setPayments(data);

      const statsData = {
        total: data.reduce((sum, p) => sum + (p.status === 'completed' ? p.amount : 0), 0),
        completed: data.filter((p) => p.status === 'completed').length,
        pending: data.filter((p) => p.status === 'pending').length,
        failed: data.filter((p) => p.status === 'failed').length,
      };
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      refunded: 'neutral',
    };
    return <Badge variant={variants[status] || 'neutral'}>{status}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      completed: <CheckCircle className="w-5 h-5 text-green-600" />,
      pending: <Clock className="w-5 h-5 text-yellow-600" />,
      failed: <XCircle className="w-5 h-5 text-red-600" />,
    };
    return icons[status] || <Clock className="w-5 h-5 text-slate-600" />;
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
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-600 mt-1">Manage your payment transactions</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Total Revenue</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">
                  R {stats.total.toFixed(2)}
                </p>
              </div>
              <div className="text-green-600 bg-green-50 p-3 rounded-lg">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Completed</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.completed}</p>
              </div>
              <div className="text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Pending</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.pending}</p>
              </div>
              <div className="text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardBody>
        </Card>

        <Card hover>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-600 text-sm">Failed</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{stats.failed}</p>
              </div>
              <div className="text-red-600 bg-red-50 p-3 rounded-lg">
                <XCircle className="w-6 h-6" />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">Payment History</h2>
            <Button size="sm" variant="outline">
              Export
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No payments yet</h3>
              <p className="text-slate-600">Payment transactions will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                      Transaction ID
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                      Method
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 text-sm text-slate-900">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 font-mono">
                        {payment.transactionId || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-slate-900">
                        {payment.currency} {payment.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 capitalize">
                        {payment.paymentMethod || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(payment.status)}
                          {getStatusBadge(payment.status)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
