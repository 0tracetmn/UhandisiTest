import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Globe, MapPin, User, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
}

interface TutoringService {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  onlineAvailable: boolean;
  inPersonAvailable: boolean;
  hourlyRate: number | null;
}

export const BookClass: React.FC = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<TutoringService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<TutoringService | null>(null);
  const [bookingForm, setBookingForm] = useState({
    deliveryMode: 'online',
    classType: 'one-on-one',
    preferredDate: '',
    preferredTime: '',
    notes: '',
    curriculum: '',
    durationMinutes: 60,
    additionalSubjects: [] as Array<{ serviceId: string; durationMinutes: number }>,
    capeTownAcknowledgement: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: categoriesData } = await supabase
        .from('service_categories')
        .select('*')
        .order('display_order');

      const { data: servicesData } = await supabase
        .from('tutoring_services')
        .select(`
          id,
          category_id,
          name,
          description,
          online_available,
          in_person_available,
          hourly_rate
        `)
        .eq('is_active', true)
        .order('category_id, display_order');

      if (categoriesData) {
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
        })));
      }

      if (servicesData) {
        setServices(servicesData.map(service => ({
          id: service.id,
          categoryId: service.category_id,
          name: service.name,
          description: service.description,
          onlineAvailable: service.online_available,
          inPersonAvailable: service.in_person_available,
          hourlyRate: service.hourly_rate,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openBookingModal = (service: TutoringService) => {
    console.log('Opening booking modal for service:', service.name);
    setSelectedService(service);
    setBookingForm({
      deliveryMode: service.onlineAvailable ? 'online' : 'in_person',
      classType: 'one-on-one',
      preferredDate: '',
      preferredTime: '',
      notes: '',
      curriculum: '',
      durationMinutes: 60,
      additionalSubjects: [],
      capeTownAcknowledgement: false,
    });
    setIsBookingModalOpen(true);
    console.log('Modal state set to open');
  };

  const handleSubmitBooking = async () => {
    if (!selectedService || !user?.id) return;

    if (!bookingForm.preferredDate) {
      alert('Please select a date for your session');
      return;
    }

    if (bookingForm.classType !== 'group' && !bookingForm.preferredTime) {
      alert('Please select a time for your session');
      return;
    }

    if (bookingForm.classType === 'one-on-one') {
      if (!bookingForm.curriculum) {
        alert('Please select your curriculum');
        return;
      }

      if (!bookingForm.durationMinutes || bookingForm.durationMinutes < 30) {
        alert('Please specify a session duration of at least 30 minutes');
        return;
      }

      // Check acknowledgement for in-person sessions
      if (bookingForm.deliveryMode === 'in_person' && !bookingForm.capeTownAcknowledgement) {
        alert('Please acknowledge that you are in Cape Town and can travel to the meeting location before submitting your in-person session request.');
        return;
      }
    }

    setSubmitting(true);

    const classType = bookingForm.classType;
    const sessionType = bookingForm.deliveryMode === 'online' ? 'online' : 'face-to-face';

    try {
      if (classType === 'group') {
        // Handle group booking - find or create group session
        // For group sessions, time will be assigned later by admin
        const preferredTime = bookingForm.preferredTime || null;

        const { data: existingSession, error: findError } = await supabase
          .from('group_sessions')
          .select('*')
          .eq('subject', selectedService.name)
          .eq('service_id', selectedService.id)
          .eq('session_type', sessionType)
          .eq('preferred_date', bookingForm.preferredDate)
          .is('preferred_time', null)
          .in('status', ['forming', 'ready'])
          .maybeSingle();

        if (findError) throw findError;

        let groupSessionId: string;

        if (existingSession) {
          // Join existing session
          groupSessionId = existingSession.id;

          // Check if student is already in this session
          const { data: existingParticipant } = await supabase
            .from('group_session_participants')
            .select('id')
            .eq('group_session_id', groupSessionId)
            .eq('student_id', user.id)
            .maybeSingle();

          if (existingParticipant) {
            alert('You have already joined this group session!');
            setSubmitting(false);
            return;
          }

          // Check if session is full
          if (existingSession.current_count >= existingSession.max_students) {
            alert('This group session is already full. Please try a different time.');
            setSubmitting(false);
            return;
          }
        } else {
          // Create new group session
          // Generate ID client-side to avoid RLS issues with .select()
          groupSessionId = crypto.randomUUID();

          const { error: createError } = await supabase
            .from('group_sessions')
            .insert({
              id: groupSessionId,
              subject: selectedService.name,
              service_id: selectedService.id,
              session_type: sessionType,
              preferred_date: bookingForm.preferredDate,
              preferred_time: preferredTime,
              status: 'forming',
              min_students: 3,
              max_students: 40,
              current_count: 0,
            });

          if (createError) throw createError;
        }

        // Add student to group session participants
        const { error: participantError } = await supabase
          .from('group_session_participants')
          .insert({
            group_session_id: groupSessionId,
            student_id: user.id,
            notes: bookingForm.notes,
          });

        if (participantError) throw participantError;

        // Create booking record linked to group session
        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            student_id: user.id,
            service_id: selectedService.id,
            subject: selectedService.name,
            delivery_mode: bookingForm.deliveryMode,
            preferred_date: bookingForm.preferredDate,
            preferred_time: null,
            notes: bookingForm.notes,
            status: 'pending',
            session_type: sessionType,
            class_type: 'group',
            group_session_id: groupSessionId,
          });

        if (bookingError) throw bookingError;

        // Show success message
        setIsBookingModalOpen(false);
        setSelectedService(null);
        setBookingForm({
          deliveryMode: 'online',
          classType: 'one-on-one',
          preferredDate: '',
          preferredTime: '',
          notes: '',
          curriculum: '',
          durationMinutes: 60,
          additionalSubjects: [],
          capeTownAcknowledgement: false,
        });
        setSubmitting(false);

        setTimeout(() => {
          alert('Successfully joined group session! You will be notified once enough students join and a tutor is assigned.');
        }, 300);
      } else {
        // Handle one-on-one booking
        const bookingId = crypto.randomUUID();

        const { error: bookingError } = await supabase
          .from('bookings')
          .insert({
            id: bookingId,
            student_id: user.id,
            service_id: selectedService.id,
            subject: selectedService.name,
            delivery_mode: bookingForm.deliveryMode,
            preferred_date: bookingForm.preferredDate,
            preferred_time: bookingForm.preferredTime,
            notes: bookingForm.notes,
            status: 'pending',
            session_type: sessionType,
            class_type: 'one-on-one',
            curriculum: bookingForm.curriculum,
            duration_minutes: bookingForm.durationMinutes,
          });

        if (bookingError) throw bookingError;

        // Insert subjects (primary + additional)
        const subjectInserts = [
          {
            booking_id: bookingId,
            service_id: selectedService.id,
            subject_order: 1,
          },
          ...bookingForm.additionalSubjects.map((subj, index) => ({
            booking_id: bookingId,
            service_id: subj.serviceId,
            subject_order: index + 2,
          }))
        ];

        const { error: subjectsError } = await supabase
          .from('booking_subjects')
          .insert(subjectInserts);

        if (subjectsError) throw subjectsError;

        setIsBookingModalOpen(false);
        setSelectedService(null);
        setBookingForm({
          deliveryMode: 'online',
          classType: 'one-on-one',
          preferredDate: '',
          preferredTime: '',
          notes: '',
          curriculum: '',
          durationMinutes: 60,
          additionalSubjects: [],
          capeTownAcknowledgement: false,
        });
        setSubmitting(false);

        setTimeout(() => {
          alert('Booking submitted successfully! Wait for admin approval and tutor assignment.');
        }, 300);
      }
    } catch (error: any) {
      console.error('Failed to submit booking:', error);
      console.error('Error details:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
      });
      setSubmitting(false);
      alert(`Failed to submit booking: ${error?.message || 'Please try again.'}`);
    }
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
        <h1 className="text-3xl font-bold text-slate-900">Book a Class</h1>
        <p className="text-slate-600 mt-1">Browse our tutoring services and schedule your next session</p>
      </div>

      <div className="space-y-6">
        {categories.map(category => {
          const categoryServices = services.filter(s => s.categoryId === category.id);

          if (categoryServices.length === 0) return null;

          return (
            <Card key={category.id}>
              <CardHeader>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{category.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryServices.map(service => (
                    <div
                      key={service.id}
                      className="p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      <h4 className="font-semibold text-slate-900 mb-2">{service.name}</h4>
                      {service.description && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">{service.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {service.onlineAvailable && (
                          <Badge variant="info">
                            <Globe className="w-3 h-3 mr-1" />
                            Online
                          </Badge>
                        )}
                        {service.inPersonAvailable && (
                          <Badge variant="success">
                            <MapPin className="w-3 h-3 mr-1" />
                            In-Person
                          </Badge>
                        )}
                        {service.hourlyRate && (
                          <Badge variant="default">R{service.hourlyRate}/hr</Badge>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => openBookingModal(service)}
                      >
                        Book Session
                      </Button>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title={`Book Session - ${selectedService?.name}`}
        size="lg"
      >
        {selectedService && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-900 mb-2">Service Details</h3>
              <p className="text-sm text-slate-600">{selectedService.description}</p>
              {selectedService.hourlyRate && (
                <p className="text-sm font-medium text-slate-900 mt-2">
                  Rate: R{selectedService.hourlyRate}/hour
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Class Type *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    bookingForm.classType === 'one-on-one'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setBookingForm({ ...bookingForm, classType: 'one-on-one' })}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-slate-900">One-on-One</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Individual session with dedicated tutor attention
                  </p>
                </div>
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    bookingForm.classType === 'group'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setBookingForm({ ...bookingForm, classType: 'group', deliveryMode: 'online' })}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-slate-900">Group Session</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Join with other students learning the same subject
                  </p>
                </div>
              </div>
              {bookingForm.classType === 'group' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>Group Session:</strong> Select your preferred date and the session time will be communicated to you based on our set timetable. You'll be placed with other students booking the same subject. Minimum of 3 students required, maximum of 40 per group.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Delivery Mode *
              </label>
              <div className="space-y-2">
                {selectedService.onlineAvailable && (
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="online"
                      name="deliveryMode"
                      value="online"
                      checked={bookingForm.deliveryMode === 'online'}
                      onChange={(e) => setBookingForm({ ...bookingForm, deliveryMode: e.target.value })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="online" className="text-sm text-slate-700 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Online Session
                    </label>
                  </div>
                )}
                {selectedService.inPersonAvailable && bookingForm.classType !== 'group' && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="in_person"
                        name="deliveryMode"
                        value="in_person"
                        checked={bookingForm.deliveryMode === 'in_person'}
                        onChange={(e) => setBookingForm({ ...bookingForm, deliveryMode: e.target.value })}
                        className="w-4 h-4"
                      />
                      <label htmlFor="in_person" className="text-sm text-slate-700 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        In-Person Session
                      </label>
                    </div>
                    {bookingForm.deliveryMode === 'in_person' && bookingForm.classType === 'one-on-one' && (
                      <div className="mt-2 space-y-3">
                        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <p className="text-sm text-orange-800">
                            <strong>Important:</strong> In-person one-on-one sessions are only available for students in Cape Town (Western Cape). If you are not from Cape Town, please select "Online" as your delivery mode, otherwise your session will not be approved.
                          </p>
                        </div>
                        <label className="flex items-start gap-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={bookingForm.capeTownAcknowledgement}
                            onChange={(e) => setBookingForm({ ...bookingForm, capeTownAcknowledgement: e.target.checked })}
                            className="w-5 h-5 mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700 flex-1">
                            <strong className="text-slate-900">I acknowledge that I am currently living in Cape Town and am able to travel to the meeting location for this in-person session.</strong>
                          </span>
                        </label>
                      </div>
                    )}
                  </>
                )}
              </div>
              {bookingForm.classType === 'group' && (
                <p className="text-xs text-slate-600 mt-2">
                  Group sessions are only available online
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Preferred Start Date *
              </label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={bookingForm.preferredDate}
                onChange={(e) => setBookingForm({ ...bookingForm, preferredDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>

            {bookingForm.classType === 'one-on-one' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Current Curriculum *
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingForm.curriculum}
                    onChange={(e) => setBookingForm({ ...bookingForm, curriculum: e.target.value })}
                    required
                  >
                    <option value="">Select your curriculum</option>
                    <option value="CAPS">CAPS (Curriculum and Assessment Policy Statement)</option>
                    <option value="IEB">IEB (Independent Examinations Board)</option>
                    <option value="Cambridge">Cambridge International</option>
                    <option value="IB">IB (International Baccalaureate)</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Main Session Duration *
                  </label>
                  <select
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={bookingForm.durationMinutes}
                    onChange={(e) => setBookingForm({ ...bookingForm, durationMinutes: parseInt(e.target.value) })}
                    required
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                    <option value="150">2.5 hours</option>
                    <option value="180">3 hours</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Additional Subjects (Optional)
                  </label>
                  <p className="text-xs text-slate-600 mb-2">
                    Select up to 4 additional subjects to include in this session beyond {selectedService?.name}
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                    {services
                      .filter(s => s.id !== selectedService?.id)
                      .map(service => (
                        <label key={service.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={bookingForm.additionalSubjects.some(s => s.serviceId === service.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                if (bookingForm.additionalSubjects.length >= 4) {
                                  alert('You can only select up to 4 additional subjects');
                                  return;
                                }
                                setBookingForm({
                                  ...bookingForm,
                                  additionalSubjects: [...bookingForm.additionalSubjects, { serviceId: service.id, durationMinutes: 60 }]
                                });
                              } else {
                                setBookingForm({
                                  ...bookingForm,
                                  additionalSubjects: bookingForm.additionalSubjects.filter(s => s.serviceId !== service.id)
                                });
                              }
                            }}
                            disabled={!bookingForm.additionalSubjects.some(s => s.serviceId === service.id) && bookingForm.additionalSubjects.length >= 4}
                            className="w-4 h-4"
                          />
                          <span className="text-sm text-slate-700">{service.name}</span>
                        </label>
                      ))}
                  </div>
                  {bookingForm.additionalSubjects.length > 0 && (
                    <div className="mt-3 space-y-3">
                      <p className="text-xs text-slate-600">
                        {bookingForm.additionalSubjects.length} additional subject{bookingForm.additionalSubjects.length > 1 ? 's' : ''} selected
                      </p>
                      <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-slate-900 mb-2">
                          Set duration for each subject:
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">{selectedService?.name} (Primary)</span>
                            <select
                              className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              value={bookingForm.durationMinutes}
                              onChange={(e) => setBookingForm({ ...bookingForm, durationMinutes: parseInt(e.target.value) })}
                            >
                              <option value="30">30 min</option>
                              <option value="60">1 hour</option>
                              <option value="90">1.5 hours</option>
                              <option value="120">2 hours</option>
                              <option value="150">2.5 hours</option>
                              <option value="180">3 hours</option>
                            </select>
                          </div>
                          {bookingForm.additionalSubjects.map((subj, index) => {
                            const service = services.find(s => s.id === subj.serviceId);
                            return (
                              <div key={subj.serviceId} className="flex items-center justify-between">
                                <span className="text-sm text-slate-700">{service?.name}</span>
                                <select
                                  className="px-3 py-1 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={subj.durationMinutes}
                                  onChange={(e) => {
                                    const newSubjects = [...bookingForm.additionalSubjects];
                                    newSubjects[index] = { ...newSubjects[index], durationMinutes: parseInt(e.target.value) };
                                    setBookingForm({ ...bookingForm, additionalSubjects: newSubjects });
                                  }}
                                >
                                  <option value="30">30 min</option>
                                  <option value="60">1 hour</option>
                                  <option value="90">1.5 hours</option>
                                  <option value="120">2 hours</option>
                                  <option value="150">2.5 hours</option>
                                  <option value="180">3 hours</option>
                                </select>
                              </div>
                            );
                          })}
                          <div className="pt-2 mt-2 border-t border-blue-300">
                            <div className="flex items-center justify-between font-semibold text-slate-900">
                              <span className="text-sm">Total Duration:</span>
                              <span className="text-sm">
                                {(() => {
                                  const total = bookingForm.durationMinutes + bookingForm.additionalSubjects.reduce((sum, s) => sum + s.durationMinutes, 0);
                                  return total >= 60
                                    ? `${Math.floor(total / 60)}h${total % 60 > 0 ? ` ${total % 60}min` : ''}`
                                    : `${total}min`;
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {bookingForm.classType !== 'group' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Preferred Start Time *
                </label>
                <select
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={bookingForm.preferredTime}
                  onChange={(e) => setBookingForm({ ...bookingForm, preferredTime: e.target.value })}
                  required
                >
                  <option value="">Select a time</option>
                  <option value="08:00">08:00 AM</option>
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                  <option value="18:00">06:00 PM</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional Notes (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                placeholder="Any specific topics or questions you'd like to cover?"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                className="flex-1"
                onClick={handleSubmitBooking}
                isLoading={submitting}
                disabled={submitting}
              >
                Submit Booking Request
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => setIsBookingModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
