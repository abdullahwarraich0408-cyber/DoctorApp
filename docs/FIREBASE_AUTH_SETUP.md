# Firebase Authentication — Environment Variables

## Backend (`Backend/.env`)

```env
# Existing JWT secrets (required)
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Firebase Admin SDK — choose ONE method:

# Option A: Full service account JSON (single line)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# Option B: Individual fields
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Customer Web (`Frontend/Frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api

NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Mobile (`app/medCare`)

Add to Firebase console and native projects:
- `android/app/google-services.json`
- `ios/GoogleService-Info.plist`

Then install and rebuild:
```bash
npm install @react-native-firebase/app @react-native-firebase/auth
cd ios && pod install
npm run android   # or npm run ios
```

Set `FIREBASE_ENABLED = true` in `src/lib/firebase/auth.ts` after native linking.
