import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Plus, Edit, Trash2, Users, Globe, MapPin, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ServiceCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
}

interface TutoringService {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  onlineAvailable: boolean;
  inPersonAvailable: boolean;
  hourlyRate: number | null;
  displayOrder: number;
  isActive: boolean;
  assignedTutorsCount?: number;
}

interface Tutor {
  id: string;
  name: string;
  email: string;
}

interface ServiceTutor {
  id: string;
  serviceId: string;
  tutorId: string;
  tutorName: string;
  tutorEmail: string;
}

export const ServicesManagement: React.FC = () => {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<TutoringService[]>([]);
  const [availableTutors, setAvailableTutors] = useState<Tutor[]>([]);
  const [serviceTutors, setServiceTutors] = useState<ServiceTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<TutoringService | null>(null);
  const [selectedServiceForTutors, setSelectedServiceForTutors] = useState<TutoringService | null>(null);
  const [serviceForm, setServiceForm] = useState({
    categoryId: '',
    name: '',
    description: '',
    onlineAvailable: true,
    inPersonAvailable: true,
    hourlyRate: '',
  });

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
        .select('*')
        .order('category_id, display_order');

      const { data: tutorsData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'tutor');

      const { data: serviceTutorsData } = await supabase
        .from('service_tutors')
        .select(`
          id,
          service_id,
          tutor_id,
          profiles!service_tutors_tutor_id_fkey(name, email)
        `);

      if (categoriesData) {
        setCategories(categoriesData.map(cat => ({
          id: cat.id,
          name: cat.name,
          description: cat.description,
          display_order: cat.display_order,
        })));
      }

      if (servicesData) {
        const formattedServices = servicesData.map(service => ({
          id: service.id,
          categoryId: service.category_id,
          name: service.name,
          description: service.description,
          onlineAvailable: service.online_available,
          inPersonAvailable: service.in_person_available,
          hourlyRate: service.hourly_rate,
          displayOrder: service.display_order,
          isActive: service.is_active,
        }));
        setServices(formattedServices);
      }

      if (tutorsData) {
        setAvailableTutors(tutorsData);
      }

      if (serviceTutorsData) {
        const formatted = serviceTutorsData.map((st: any) => ({
          id: st.id,
          serviceId: st.service_id,
          tutorId: st.tutor_id,
          tutorName: st.profiles?.name || 'Unknown',
          tutorEmail: st.profiles?.email || '',
        }));
        setServiceTutors(formatted);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddServiceModal = (categoryId: string) => {
    setEditingService(null);
    setServiceForm({
      categoryId,
      name: '',
      description: '',
      onlineAvailable: true,
      inPersonAvailable: true,
      hourlyRate: '',
    });
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (service: TutoringService) => {
    setEditingService(service);
    setServiceForm({
      categoryId: service.categoryId,
      name: service.name,
      description: service.description,
      onlineAvailable: service.onlineAvailable,
      inPersonAvailable: service.inPersonAvailable,
      hourlyRate: service.hourlyRate?.toString() || '',
    });
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async () => {
    try {
      const serviceData = {
        category_id: serviceForm.categoryId,
        name: serviceForm.name,
        description: serviceForm.description,
        online_available: serviceForm.onlineAvailable,
        in_person_available: serviceForm.inPersonAvailable,
        hourly_rate: serviceForm.hourlyRate ? parseFloat(serviceForm.hourlyRate) : null,
        updated_at: new Date().toISOString(),
      };

      if (editingService) {
        const { error } = await supabase
          .from('tutoring_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tutoring_services')
          .insert(serviceData);

        if (error) throw error;
      }

      setIsServiceModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save service:', error);
      alert('Failed to save service. Please try again.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This will also remove all tutor assignments.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tutoring_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Failed to delete service:', error);
      alert('Failed to delete service. Please try again.');
    }
  };

  const handleToggleServiceActive = async (service: TutoringService) => {
    try {
      const { error } = await supabase
        .from('tutoring_services')
        .update({ is_active: !service.isActive, updated_at: new Date().toISOString() })
        .eq('id', service.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Failed to toggle service status:', error);
      alert('Failed to update service status. Please try again.');
    }
  };

  const openTutorAssignmentModal = (service: TutoringService) => {
    setSelectedServiceForTutors(service);
    setIsTutorModalOpen(true);
  };

  const getAssignedTutors = (serviceId: string): ServiceTutor[] => {
    return serviceTutors.filter(st => st.serviceId === serviceId);
  };

  const handleAssignTutor = async (tutorId: string) => {
    if (!selectedServiceForTutors) return;

    try {
      const { error } = await supabase
        .from('service_tutors')
        .insert({
          service_id: selectedServiceForTutors.id,
          tutor_id: tutorId,
        });

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Failed to assign tutor:', error);
      alert('Failed to assign tutor. They may already be assigned to this service.');
    }
  };

  const handleUnassignTutor = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('service_tutors')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Failed to unassign tutor:', error);
      alert('Failed to unassign tutor. Please try again.');
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
        <h1 className="text-3xl font-bold text-slate-900">Tutoring Services Management</h1>
        <p className="text-slate-600 mt-1">Manage services, categories, and tutor assignments</p>
      </div>

      {categories.map(category => {
        const categoryServices = services.filter(s => s.categoryId === category.id);

        return (
          <Card key={category.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{category.name}</h2>
                  <p className="text-sm text-slate-600 mt-1">{category.description}</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => openAddServiceModal(category.id)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {categoryServices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No services in this category yet
                </div>
              ) : (
                <div className="space-y-3">
                  {categoryServices.map(service => {
                    const assignedTutors = getAssignedTutors(service.id);

                    return (
                      <div
                        key={service.id}
                        className="flex items-start justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-slate-900">{service.name}</h3>
                            {!service.isActive && (
                              <Badge variant="danger">Inactive</Badge>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-sm text-slate-600 mb-3">{service.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mb-2">
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
                              <Badge variant="default">
                                R{service.hourlyRate}/hr
                              </Badge>
                            )}
                          </div>
                          {assignedTutors.length > 0 && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Users className="w-4 h-4" />
                              <span>{assignedTutors.length} tutor(s) assigned</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openTutorAssignmentModal(service)}
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditServiceModal(service)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={service.isActive ? 'warning' : 'success'}
                            onClick={() => handleToggleServiceActive(service)}
                          >
                            {service.isActive ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleDeleteService(service.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        );
      })}

      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={editingService ? 'Edit Service' : 'Add New Service'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Service Name"
            value={serviceForm.name}
            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
            placeholder="e.g., Mathematics"
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              placeholder="Brief description of the service"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="online"
                checked={serviceForm.onlineAvailable}
                onChange={(e) => setServiceForm({ ...serviceForm, onlineAvailable: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="online" className="text-sm font-medium text-slate-700">
                Available Online
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="inperson"
                checked={serviceForm.inPersonAvailable}
                onChange={(e) => setServiceForm({ ...serviceForm, inPersonAvailable: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="inperson" className="text-sm font-medium text-slate-700">
                Available In-Person
              </label>
            </div>
          </div>

          <Input
            label="Hourly Rate (Optional)"
            type="number"
            value={serviceForm.hourlyRate}
            onChange={(e) => setServiceForm({ ...serviceForm, hourlyRate: e.target.value })}
            placeholder="e.g., 250"
          />

          <div className="flex gap-3 pt-4">
            <Button className="flex-1" onClick={handleSaveService}>
              {editingService ? 'Update Service' : 'Add Service'}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              onClick={() => setIsServiceModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isTutorModalOpen}
        onClose={() => setIsTutorModalOpen(false)}
        title={`Manage Tutors - ${selectedServiceForTutors?.name}`}
        size="lg"
      >
        {selectedServiceForTutors && (
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Assigned Tutors</h3>
              {getAssignedTutors(selectedServiceForTutors.id).length === 0 ? (
                <p className="text-sm text-slate-600">No tutors assigned to this service yet</p>
              ) : (
                <div className="space-y-2">
                  {getAssignedTutors(selectedServiceForTutors.id).map(assignment => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{assignment.tutorName}</p>
                        <p className="text-sm text-slate-600">{assignment.tutorEmail}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleUnassignTutor(assignment.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-slate-900 mb-3">Available Tutors</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableTutors
                  .filter(tutor => !getAssignedTutors(selectedServiceForTutors.id).some(st => st.tutorId === tutor.id))
                  .map(tutor => (
                    <div
                      key={tutor.id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-900">{tutor.name}</p>
                        <p className="text-sm text-slate-600">{tutor.email}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleAssignTutor(tutor.id)}
                      >
                        Assign
                      </Button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
