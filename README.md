# Medzoos Doctor (React Native CLI)

Doctor mobile app for Medzoos. Same backend as the **DoctorPanel website** and the **patient medCare app**.

Full plan: [PLAN.md](./PLAN.md)

## What you can do

- Sign in with the doctor portal email/password (created by admin)
- See today’s appointments, patients, video visits, revenue
- Confirm / cancel / complete visits
- Chat with the patient (Socket.IO, same room as website)
- Start video consult
- Write a prescription
- Publish weekly schedule (patients book these slots)
- Edit profile and password

## Run on Android

```bash
cd app/medDoctor
npm install
npm start
# other terminal:
npm run android
```

Uses the same local API flag as medCare (`src/config/api.ts`).

Login: `POST /api/auth/partner/login` with `{ portal: "doctor", email, password }`.
