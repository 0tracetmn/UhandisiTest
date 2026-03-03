import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Users, Mail, Phone, CheckCircle, Clock, X, FileText, ExternalLink, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Tutor {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  status: string;
  createdAt: string;
  transcriptUrl: string | null;
  qualificationsUrl: string | null;
  idCopyUrl: string | null;
}

export const TutorsManagement: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      const { data: tutorDetailsData } = await supabase
        .from('tutor_details')
        .select(`
          id,
          user_id,
          status,
          created_at,
          transcript_url,
          qualifications_url,
          id_copy_url,
          profiles!tutor_details_user_id_fkey(
            name,
            email,
            phone_number
          )
        `)
        .order('created_at', { ascending: false });

      if (tutorDetailsData) {
        const formattedTutors: Tutor[] = tutorDetailsData.map((tutor: any) => ({
          id: tutor.id,
          userId: tutor.user_id,
          name: tutor.profiles?.name || 'Unknown',
          email: tutor.profiles?.email || 'No email',
          phoneNumber: tutor.profiles?.phone_number || null,
          status: tutor.status,
          createdAt: tutor.created_at,
          transcriptUrl: tutor.transcript_url,
          qualificationsUrl: tutor.qualifications_url,
          idCopyUrl: tutor.id_copy_url,
        }));
        setTutors(formattedTutors);
      }
    } catch (error) {
      console.error('Failed to fetch tutors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const openMailClient = (email: string) => {
    window.location.href = `mailto:${email}`;
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
          <h1 className="text-3xl font-bold text-slate-900">Tutor Management</h1>
          <p className="text-slate-600 mt-1">View and manage all tutors</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-600">Total Tutors</p>
            <p className="text-2xl font-bold text-slate-900">{tutors.length}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>

      {tutors.length === 0 ? (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-900 font-medium text-lg">No tutors found</p>
              <p className="text-slate-600 text-sm mt-1">Tutors will appear here once they register</p>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold text-slate-900">All Tutors</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {tutors.map((tutor) => (
                <div
                  key={tutor.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-semibold text-slate-900 text-lg">{tutor.name}</p>
                      {getStatusBadge(tutor.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        <span>{tutor.email}</span>
                      </div>
                      {tutor.phoneNumber && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          <span>{tutor.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Registered: {new Date(tutor.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedTutor(tutor)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Modal
        isOpen={!!selectedTutor}
        onClose={() => setSelectedTutor(null)}
        title="Tutor Details"
      >
        {selectedTutor && (
          <div className="space-y-6">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900 text-lg">Contact Information</h3>
                {getStatusBadge(selectedTutor.status)}
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-slate-600">Full Name:</span>
                  <p className="font-medium text-slate-900">{selectedTutor.name}</p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">Email Address:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium text-slate-900">{selectedTutor.email}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openMailClient(selectedTutor.email)}
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Send Email
                    </Button>
                  </div>
                </div>
                {selectedTutor.phoneNumber && (
                  <div>
                    <span className="text-sm text-slate-600">Phone Number:</span>
                    <p className="font-medium text-slate-900">{selectedTutor.phoneNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-slate-600">Registration Date:</span>
                  <p className="font-medium text-slate-900">
                    {new Date(selectedTutor.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-slate-600">User ID:</span>
                  <p className="font-mono text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded mt-1">
                    {selectedTutor.userId}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Uploaded Documents</h3>
              <div className="space-y-3">
                {selectedTutor.transcriptUrl ? (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-slate-900">Transcript</p>
                        <p className="text-sm text-slate-600">Academic transcript document</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedTutor.transcriptUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg text-slate-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Transcript not uploaded</span>
                  </div>
                )}

                {selectedTutor.qualificationsUrl ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-slate-900">Qualifications</p>
                        <p className="text-sm text-slate-600">Certificates and degrees</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedTutor.qualificationsUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg text-slate-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Qualifications not uploaded</span>
                  </div>
                )}

                {selectedTutor.idCopyUrl ? (
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-orange-600" />
                      <div>
                        <p className="font-medium text-slate-900">Copy of ID</p>
                        <p className="text-sm text-slate-600">Identity verification document</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(selectedTutor.idCopyUrl!, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-4 bg-slate-100 rounded-lg text-slate-500">
                    <AlertCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">ID copy not uploaded</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-2">
                <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Quick Email Access</p>
                  <p className="text-sm text-blue-700 mt-1">
                    Click the "Send Email" button above to open your email client with this tutor's address pre-filled.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setSelectedTutor(null)}
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
