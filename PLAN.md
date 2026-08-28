# Medzoos Doctor — Mobile App Plan

Native CLI app for doctors. Same backend as the patient app (`medCare`) and DoctorPanel website.

## Why this app exists

Patients book, chat, and pay on **medCare** / the website. Doctors currently only have the **DoctorPanel** website. This app is the mobile counterpart so a doctor can run their clinic from a phone.

## Shared backend (already live)

- Auth: `POST /api/auth/partner/login` `{ portal: "doctor", email, password }`
- Portal: `/api/partners/doctor/*` (profile, appointments, schedule, patients, stats, prescriptions, practice locations)
- Chat / video: `/api/telehealth/appointments/:id/chat|messages|read|video`
- Realtime: Socket.IO `join-chat` / `new-message` (same rooms as the website)
- Production API: `https://medmarket.asrar.dev/api`
- Local API: `http://127.0.0.1:5000/api` (USB + adb reverse)

Doctors are created by **admin**. There is no public self-signup.

## Screens (v1 — matches DoctorPanel)

| Tab / screen | What the doctor does | API |
|---|---|---|
| Login | Email + password | `/auth/partner/login` |
| Home | Today’s load, revenue, rating, upcoming visits | `/partners/doctor/stats` + appointments |
| Appointments | Confirm, cancel, complete, open chat/video | `/partners/doctor/appointments` |
| Appointment detail | Patient, reason, notes, Rx | status + prescriptions |
| Chat | Text chat with the patient | telehealth + Socket.IO |
| Video | Join Jitsi consult | `/telehealth/.../video` |
| Schedule | Weekly online slots + clinic locations | `/schedule` + `/practice-locations` |
| Patients | Visit history / contact | `/partners/doctor/patients` |
| Account | Profile, fee, password, logout | `/profile` `/password` |

## Navigation

```
Login
 └── Tabs
      ├── Home
      ├── Appointments → Detail → Chat | Video | Prescription
      ├── Patients → Detail
      ├── Schedule
      └── Account → Settings
```

## Design

DoctorPanel teal (not the patient-app blue):

- Primary `#0B6E72`
- Dark `#084F52`
- Mist `#F0F9FA`
- Ink `#0C1A2E`

## Out of scope for v1 (backend does not support it yet)

- Doctor wallet / payouts (revenue is a KPI only)
- Family-vault medical records (customer-only)
- Doctor self-registration
- Push notifications (website bell is a stub)

## How it connects to the user app

1. Patient books on medCare → doctor sees it in Appointments.
2. Doctor confirms → patient can pick online / in-person.
3. Same chat room (`chat-{appointmentId}`) for both apps.
4. Doctor writes a prescription → stored on the appointment the patient already sees.
5. Same JWT issuer; doctor token role is `doctor`, patient token role is `customer`.
