import { api, apiClient } from './client';
import { setSession } from '../auth/session';

export const partnerAuthApi = {
  login: async (email: string, password: string) => {
    const data = await apiClient<any>('/auth/partner/login', {
      method: 'POST',
      body: {
        portal: 'doctor',
        email,
        password,
      },
      skipAuth: true,
    });
    if (data?.tokens) {
      await setSession({
        tokens: data.tokens,
        role: data.role,
        partner: data.partner,
      });
    }
    return data;
  },
  forgotPassword: (email: string) =>
    apiClient('/auth/forgot-password', {
      method: 'POST',
      body: { email },
      skipAuth: true,
    }),
};

export const doctorPortalApi = {
  getProfile: () => api.get<any>('/partners/doctor/profile'),
  updateProfile: (data: object) => api.patch('/partners/doctor/profile', data),
  updatePassword: (current: string, next: string) =>
    api.patch('/partners/doctor/password', { current, new: next }),
  getAppointments: () => api.get<any>('/partners/doctor/appointments'),
  updateAppointmentStatus: (id: string, status: string, notes?: string, extra?: { no_show_reason?: string }) =>
    api.patch(`/partners/doctor/appointments/${id}/status`, {
      status,
      notes,
      ...(extra?.no_show_reason ? { no_show_reason: extra.no_show_reason } : {}),
    }),
  getSchedule: () => api.get<any>('/partners/doctor/schedule'),
  updateSchedule: (slots: unknown) =>
    api.put('/partners/doctor/schedule', { slots }),
  getHospitals: () => api.get<any>('/partners/doctor/hospitals'),
  getPracticeLocations: () => api.get<any>('/partners/doctor/practice-locations'),
  createPracticeLocation: (data: object) =>
    api.post('/partners/doctor/practice-locations', data),
  updatePracticeLocation: (locationId: string, data: object) =>
    api.patch(`/partners/doctor/practice-locations/${locationId}`, data),
  deletePracticeLocation: (locationId: string) =>
    api.delete(`/partners/doctor/practice-locations/${locationId}`),
  getPatients: () => api.get<any>('/partners/doctor/patients'),
  getPatient: (patientId: string) =>
    api.get<any>(`/partners/doctor/patients/${patientId}`),
  getStats: () => api.get<any>('/partners/doctor/stats'),
  getConsultation: (appointmentId: string) =>
    api.get<any>(`/partners/doctor/appointments/${appointmentId}/consultation`),
  updateConsultation: (appointmentId: string, data: object) =>
    api.patch(`/partners/doctor/appointments/${appointmentId}/consultation`, data),
  createPrescription: (data: object) =>
    api.post('/partners/doctor/prescriptions', data),
  getPrescription: (appointmentId: string) =>
    api.get(`/partners/doctor/prescriptions/${appointmentId}`),
  orderLabTest: (data: object) =>
    api.post('/partners/doctor/lab-orders', data),
  getLabTests: () => api.get<any>('/lab-tests'),
  getNotifications: () => api.get<any>('/notifications'),
  markNotificationRead: (id: string) => api.patch(`/notifications/${id}/read`, {}),
  markAllNotificationsRead: () => api.post('/notifications/read-all', {}),
  getFollowUps: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get<any>(
      query ? `/partners/doctor/follow-ups?${query}` : '/partners/doctor/follow-ups',
    );
  },
  getFollowUp: (id: string) => api.get<any>(`/partners/doctor/follow-ups/${id}`),
  upsertConsultationFollowUp: (consultationId: string, data: object) =>
    api.put(`/partners/doctor/consultations/${consultationId}/follow-up`, data),
  remindFollowUp: (id: string) =>
    api.post(`/partners/doctor/follow-ups/${id}/remind`, {}),
  cancelFollowUp: (id: string) =>
    api.post(`/partners/doctor/follow-ups/${id}/cancel`, {}),
  markAppointmentPaid: (id: string) =>
    api.post(`/partners/doctor/appointments/${id}/mark-paid`, {}),
  getVisitDocuments: (appointmentId: string) =>
    api.get<any>(`/partners/doctor/appointments/${appointmentId}/documents`),
  createVisitDocument: (appointmentId: string, data: object) =>
    api.post(`/partners/doctor/appointments/${appointmentId}/documents`, data),
  removeVisitDocument: (appointmentId: string, documentId: string) =>
    api.delete(`/partners/doctor/appointments/${appointmentId}/documents/${documentId}`),
  getAppointmentSharedHistory: (appointmentId: string) =>
    api.get<any>(`/partners/doctor/appointments/${appointmentId}/shared-history`),
};

export const telehealthApi = {
  getChat: (appointmentId: string) =>
    api.get<any>(`/telehealth/appointments/${appointmentId}/chat`),
  sendMessage: (
    appointmentId: string,
    data: { message?: string; message_type?: string; attachment_url?: string },
  ) =>
    api.post<any>(
      `/telehealth/appointments/${appointmentId}/chat/messages`,
      data,
    ),
  markRead: (appointmentId: string) =>
    api.patch(`/telehealth/appointments/${appointmentId}/chat/read`, {}),
  getVideoAccess: (appointmentId: string) =>
    api.get<any>(`/telehealth/appointments/${appointmentId}/video`),
};
