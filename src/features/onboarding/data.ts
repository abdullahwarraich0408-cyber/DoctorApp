export type OnboardingAuthTarget = 'signin';

export type OnboardingVariant = 'welcome' | 'tour' | 'finish';

export type OnboardingSlideData = {
  id: string;
  kicker: string;
  title: string;
  description: string;
  icon: string;
  accentIcon: string;
  variant: OnboardingVariant;
};

export const ONBOARDING_SLIDES: OnboardingSlideData[] = [
  {
    id: 'welcome',
    kicker: 'Medzoos Doctor',
    title: 'Practice with clarity',
    description:
      'Your clinic day — visits, consults, and patients — in one secure workspace.',
    icon: 'stethoscope',
    accentIcon: 'hospital-building',
    variant: 'welcome',
  },
  {
    id: 'visits',
    kicker: 'Schedule',
    title: "See today's visits",
    description:
      'Confirm appointments, start consultations, and keep every patient on time.',
    icon: 'calendar-clock',
    accentIcon: 'account-check-outline',
    variant: 'tour',
  },
  {
    id: 'consult',
    kicker: 'Care',
    title: 'Consult in one place',
    description:
      'Notes, chat, and video live on the same visit so you can focus on care.',
    icon: 'video-outline',
    accentIcon: 'message-text-outline',
    variant: 'tour',
  },
  {
    id: 'prescribe',
    kicker: 'Follow-through',
    title: 'Prescribe and follow patients',
    description:
      'Write prescriptions, review history, and stay connected with the people you treat.',
    icon: 'prescription',
    accentIcon: 'account-heart-outline',
    variant: 'tour',
  },
  {
    id: 'started',
    kicker: 'Ready',
    title: 'Your clinic, ready',
    description:
      'Sign in with the account created by Medzoos admin — the same login as the doctor website.',
    icon: 'shield-check-outline',
    accentIcon: 'login',
    variant: 'finish',
  },
];
