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

/** Convert follow-up chip labels (e.g. "7 Days") or ISO dates to YYYY-MM-DD for the API. */
export function resolveFollowUpDate(value?: string | null): string | null {
  if (!value || !String(value).trim()) return null;
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);

  const daysByLabel: Record<string, number> = {
    '3 days': 3,
    '7 days': 7,
    '2 weeks': 14,
    '1 month': 30,
  };
  const offset = daysByLabel[raw.toLowerCase()];
  if (offset != null) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
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
  notifications: {
    email: boolean;
    sms: boolean;
    reminders: boolean;
    push: boolean;
    marketing: boolean;
  };
};

export function mapDoctorProfile(doctor: any): DoctorProfile | null {
  if (!doctor) return null;
  const prefs = doctor.notification_preferences || {};
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
    notifications: {
      email: prefs.email ?? true,
      sms: prefs.sms ?? true,
      reminders: prefs.reminders ?? true,
      push: prefs.push ?? prefs.email ?? true,
      marketing: prefs.marketing ?? false,
    },
  };
}

export type DoctorAppointment = {
  id: string;
  patient: string;
  patientId?: string;
  patientEmail?: string;
  type: string;
  appointmentType: string;
  isFollowUp: boolean;
  parentAppointmentId?: string | null;
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
  const appointmentType = String(
    appointment.appointment_type || appointment.appointmentType || 'new',
  ).toLowerCase();
  return {
    id: appointment.id,
    patient: appointment.customer?.name || 'Unknown',
    patientId: appointment.customer?.id || appointment.customer_id,
    patientEmail: appointment.customer?.email,
    type:
      mode === 'in_person'
        ? 'Clinic'
        : mode === 'online' || mode === 'video'
          ? 'Video'
          : needsModeSelection
            ? 'Awaiting mode'
            : 'Consult',
    appointmentType,
    isFollowUp: appointmentType === 'follow_up',
    parentAppointmentId:
      appointment.parent_appointment_id || appointment.parentAppointmentId || null,
    consultationMode,
    needsModeSelection,
    isOnline:
      mode === 'online' ||
      mode === 'video' ||
      Boolean(appointment.meeting_id),
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
  age?: number | string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  lastVisit: string;
  condition: string;
  appointmentsCount: number;
  raw?: any;
};

export function mapPatient(patient: any): DoctorPatient {
  const profile =
    patient?.profile_data && typeof patient.profile_data === 'object'
      ? patient.profile_data
      : {};
  return {
    id: patient.id,
    name: patient.name,
    email: patient.email || '',
    phone: patient.phone || '',
    age: patient.age || profile.age || null,
    gender: patient.gender || profile.gender || null,
    bloodGroup: patient.bloodGroup || profile.bloodGroup || profile.blood_group || null,
    lastVisit: formatDate(patient.lastVisit),
    condition: patient.condition || 'General',
    appointmentsCount: patient.appointmentsCount || 1,
    raw: patient,
  };
}

export function mapChatMessage(message: any, myRole = 'doctor') {
  const createdAt = message.created_at || message.createdAt;
  let time = '';
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }
  }
  return {
    id: message.id,
    text: message.message || '',
    type: message.message_type || 'text',
    attachmentUrl: message.attachment_url,
    senderRole: message.sender_role,
    isMine: message.sender_role === myRole,
    isSystem: message.sender_role === 'system',
    isRead: Boolean(message.is_read),
    createdAt,
    time,
  };
}

export function formatAllergies(allergies: unknown): string {
  if (!allergies) return '';
  if (Array.isArray(allergies)) {
    return allergies
      .flatMap(item => (typeof item === 'string' ? [item] : Object.values(item || {})))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof allergies === 'object') {
    const record = allergies as Record<string, unknown>;
    const parts = [
      ...(Array.isArray(record.medicine) ? record.medicine : []),
      ...(Array.isArray(record.food) ? record.food : []),
      ...(Array.isArray(record.environmental) ? record.environmental : []),
    ];
    if (parts.length) return parts.filter(Boolean).map(String).join(', ');
    return Object.values(record)
      .flatMap(v => (Array.isArray(v) ? v : [v]))
      .filter(Boolean)
      .map(String)
      .join(', ');
  }
  return String(allergies);
}

export function mapClinicalConsultation(item: any) {
  const appointmentId = item.appointmentId || item.appointment_id || item.id;
  const symptoms = Array.isArray(item.symptoms)
    ? item.symptoms.join(', ')
    : item.symptoms || item.reason || '';
  return {
    id: String(item.id),
    appointmentId: appointmentId ? String(appointmentId) : undefined,
    date: formatDate(item.date || item.appointment_date || item.created_at),
    dateRaw: item.date || item.appointment_date || item.created_at,
    time: item.slot || item.time || '',
    title: item.diagnosis || item.reason || 'Consultation Visit',
    doctor: item.doctor?.name ? `Dr. ${item.doctor.name}` : '',
    complaint: symptoms || item.reason || '',
    notes: item.notes || item.clinical_notes || item.consultation_notes || '',
    status: item.status || 'completed',
    mode: item.mode || item.consultation_mode || null,
    prescription: item.prescription || null,
    followUpDate: item.followUpDate || item.follow_up_date || null,
    followUpNotes: item.followUpNotes || item.follow_up_notes || null,
  };
}

export function mapClinicalPrescription(rx: any) {
  const items = Array.isArray(rx?.items)
    ? rx.items.map((item: any) => ({
        name: item.name || item.medicine || 'Medication',
        dosage: item.dosage || item.dose || '',
        freq: item.frequency || item.freq || '',
        duration: item.duration || '',
        instructions: item.instructions || '',
      }))
    : [];
  return {
    id: String(rx.id),
    appointmentId: rx.appointment_id ? String(rx.appointment_id) : undefined,
    date: formatDate(rx.created_at || rx.appointment?.appointment_date || rx.signed_at),
    doctor: rx.sourceLabel || 'Issued by you',
    notes: rx.notes || '',
    items,
    raw: rx,
  };
}

export function mapClinicalLabOrder(lab: any) {
  return {
    id: String(lab.id),
    name: lab.lab_test?.name || lab.name || 'Diagnostic Panel',
    date: formatDate(lab.created_at || lab.collection_date || lab.date),
    category: lab.lab_test?.category || lab.category || 'Diagnostic',
    status: lab.status || 'Ordered',
    resultValue: lab.result_value || lab.result || '',
    refRange: lab.ref_range || '',
  };
}

export function mapPatientClinicalHistory(data: any) {
  const patient = data?.patient || data?.customer || {};
  const timelineRaw =
    data?.myConsultations || data?.timeline || data?.consultations || data?.appointments || [];
  const prescriptionsRaw = data?.myPrescriptions || data?.prescriptions || [];
  const labsRaw = data?.myLabOrders || data?.lab_orders || data?.labOrders || [];

  const consultations = (Array.isArray(timelineRaw) ? timelineRaw : []).map(
    mapClinicalConsultation,
  );
  const prescriptions = (Array.isArray(prescriptionsRaw) ? prescriptionsRaw : []).map(
    mapClinicalPrescription,
  );
  const labs = (Array.isArray(labsRaw) ? labsRaw : []).map(mapClinicalLabOrder);

  const allergiesText = formatAllergies(patient.allergies);
  const latestAppointmentId =
    consultations.find(c => c.appointmentId)?.appointmentId ||
    prescriptions.find(p => p.appointmentId)?.appointmentId;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizeFollowUp = (item: any, fallbackId: string) => {
    const date = item.followUpDate || item.follow_up_date || null;
    if (!date) return null;
    return {
      id: String(item.id || fallbackId),
      consultationId: item.consultationId || item.id,
      appointmentId: item.appointmentId || item.appointment_id,
      date,
      dateLabel: formatDate(date),
      notes: item.followUpNotes || item.follow_up_notes || item.notes || '',
      title: item.title || item.diagnosis || 'Follow-up visit',
      status: new Date(date).getTime() < today.getTime() ? 'overdue' : 'upcoming',
    };
  };

  const followUpsFromApi = (Array.isArray(data?.followUps) ? data.followUps : [])
    .map((item: any, idx: number) => normalizeFollowUp(item, `api-fu-${idx}`))
    .filter(Boolean);

  const followUpsFromConsults = consultations
    .map((c, idx) =>
      normalizeFollowUp(
        {
          id: `fu-${c.id}`,
          consultationId: c.id,
          appointmentId: c.appointmentId,
          followUpDate: c.followUpDate,
          followUpNotes: c.followUpNotes,
          title: c.title,
        },
        `fu-${idx}`,
      ),
    )
    .filter(Boolean);

  const followUps = (followUpsFromApi.length ? followUpsFromApi : followUpsFromConsults).sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return {
    patient: {
      id: patient.id,
      name: patient.name || 'Patient',
      email: patient.email || '',
      phone: patient.phone || '',
      bloodGroup: patient.bloodGroup || patient.blood_group || '',
      allergies: allergiesText,
      age: patient.age || patient.profile_data?.age,
      gender: patient.gender || patient.profile_data?.gender,
    },
    relationship: data?.relationship || null,
    consultations,
    prescriptions,
    labs,
    followUps,
    latestAppointmentId,
  };
}
