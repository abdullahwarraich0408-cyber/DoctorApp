export function formatDate(dateValue?: string | null) {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatMoney(value?: number | string | null) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 'PKR 0';
  return `PKR ${n.toLocaleString()}`;
}

export type DoctorProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  hospital: string;
  experience: string;
  consultationFee: string;
  languages: string;
  bio: string;
  slots: { day: string; slots: string[] }[];
  online?: boolean;
  photoUrl?: string | null;
};

export function mapDoctorProfile(doctor: any): DoctorProfile | null {
  if (!doctor) return null;
  return {
    id: doctor.id,
    name: doctor.name || '',
    email: doctor.email || '',
    phone: doctor.phone || '',
    specialty: doctor.specialty || '',
    hospital: doctor.hospital || '',
    experience: String(doctor.experience_years ?? ''),
    consultationFee: String(doctor.fee ?? ''),
    languages: Array.isArray(doctor.languages)
      ? doctor.languages.join(', ')
      : doctor.languages || '',
    bio: doctor.about || '',
    slots: doctor.slots || [],
    online: doctor.online,
    photoUrl: doctor.photo_url,
  };
}

export type DoctorAppointment = {
  id: string;
  patient: string;
  patientId?: string;
  patientEmail?: string;
  type: string;
  consultationMode: string | null;
  needsModeSelection: boolean;
  isOnline: boolean;
  isInPerson: boolean;
  date: string;
  dateRaw?: string;
  time: string;
  status: string;
  phone: string;
  reason: string;
  paymentStatus?: string;
  meetingId?: string | null;
  meetingUrl?: string | null;
  consultationNotes?: string | null;
  diagnosis?: string | null;
  prescription?: unknown;
  raw: any;
};

export function mapAppointment(appointment: any): DoctorAppointment {
  const consultationMode = appointment.consultation_mode || null;
  const needsModeSelection =
    appointment.status === 'confirmed' && !consultationMode;
  const mode =
    consultationMode || appointment.preferred_consultation_mode || null;
  return {
    id: appointment.id,
    patient: appointment.customer?.name || 'Unknown',
    patientId: appointment.customer?.id || appointment.customer_id,
    patientEmail: appointment.customer?.email,
    type:
      mode === 'in_person'
        ? 'Clinic'
        : mode === 'online'
          ? 'Online'
          : needsModeSelection
            ? 'Awaiting mode'
            : 'Consult',
    consultationMode,
    needsModeSelection,
    isOnline: mode === 'online' || Boolean(appointment.meeting_id),
    isInPerson: mode === 'in_person',
    date: formatDate(appointment.appointment_date),
    dateRaw: appointment.appointment_date,
    time: appointment.slot,
    status: appointment.status,
    phone: appointment.customer?.phone || '',
    reason: appointment.reason || '',
    paymentStatus: appointment.payment_status,
    meetingId: appointment.meeting_id,
    meetingUrl: appointment.meeting_url,
    consultationNotes: appointment.consultation_notes,
    diagnosis: appointment.consultation?.diagnosis || null,
    prescription: appointment.prescription,
    raw: appointment,
  };
}

export type DoctorPatient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastVisit: string;
  condition: string;
  appointmentsCount: number;
};

export function mapPatient(patient: any): DoctorPatient {
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email || '',
    phone: patient.phone || '',
    lastVisit: formatDate(patient.lastVisit),
    condition: patient.condition || 'General',
    appointmentsCount: patient.appointmentsCount || 1,
  };
}

export function mapChatMessage(message: any, myRole = 'doctor') {
  return {
    id: message.id,
    text: message.message || '',
    type: message.message_type || 'text',
    attachmentUrl: message.attachment_url,
    senderRole: message.sender_role,
    isMine: message.sender_role === myRole,
    isSystem: message.sender_role === 'system',
    isRead: Boolean(message.is_read),
    createdAt: message.created_at,
  };
}
