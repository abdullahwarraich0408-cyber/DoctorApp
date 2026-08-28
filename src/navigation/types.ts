export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Main: undefined;
  AppointmentDetail: { appointmentId: string };
  Consultation: { appointmentId: string; patientName?: string; patientId?: string };
  Chat: { appointmentId: string; patientName?: string };
  Video: { appointmentId: string; meetingUrl?: string | null; patientName?: string };
  Prescription: { appointmentId: string; patientName?: string };
  PatientDetail: { patientId: string };
  Schedule: undefined;
  Settings: undefined;
  Notifications: undefined;
};


export type MainTabParamList = {
  Home: undefined;
  Appointments: undefined;
  Consult: undefined;
  Patients: undefined;
  Profile: undefined;
};

