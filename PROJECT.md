# Medzoos / medCare — Complete Project Overview

This document describes the **full Medzoos ecosystem** and the **medCare** React Native mobile app in detail.

---

## 1. What Is This Project?

**Medzoos** is a healthcare marketplace platform (branded as medCare on mobile) that connects customers with:

- **Pharmacies** — order medicines online with delivery
- **Doctors** — book online video or in-clinic consultations
- **Hospitals** — browse facilities and book visits
- **Labs** — book diagnostic tests with home sample collection
- **Health records** — reports, prescriptions, family profiles, and history

The mobile app (`app/medCare`) is the **customer-facing React Native app** for Android and iOS. It shares the same backend API as the customer website and other panels.

---

## 2. Workspace Structure (7 Projects)

| # | Project | Path | Port | Role |
|---|---------|------|------|------|
| 1 | **Backend** | `Backend/` | 5000 | Express API, Prisma ORM, Socket.IO (telehealth/chat) |
| 2 | **Customer Web** | `Frontend/Frontend/` | 3000 | Next.js storefront (reference UX for mobile) |
| 3 | **Admin Panel** | `Frontend/AdminPanel/` | 3001 | Platform administration |
| 4 | **Vendor Panel** | `Frontend/VendorPanel/` | 3002 | Pharmacy/vendor operations |
| 5 | **Doctor Panel** | `Frontend/DoctorPanel/` | 3003 | Doctor appointments & telehealth |
| 6 | **Lab Panel** | `Frontend/LabPanel/` | 3004 | Lab bookings, tests, reports |
| 7 | **Mobile App** | `app/medCare/` | Metro 8081 | React Native customer app |

All frontends talk to the same API base: `/api` on port **5000** (local) or `https://medmarket.asrar.dev/api` (production).

---

## 3. Mobile App Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React Native **0.86** + React **19** |
| Language | TypeScript |
| Navigation | React Navigation 7 — Drawer → Bottom Tabs → Native Stacks |
| Server state | TanStack React Query v5 |
| Local storage | AsyncStorage (auth tokens, guest cart, location) |
| Location | `@react-native-community/geolocation` |
| UI icons | `react-native-vector-icons` (MaterialCommunityIcons) |
| Gestures / animation | Reanimated 4, Gesture Handler, Worklets |
| Safe areas | `react-native-safe-area-context` |

---

## 4. App Entry & Global Providers

```
App.tsx
├── SafeAreaProvider
├── QueryProvider          → TanStack Query client
├── AuthProvider           → login, register, session, JWT
├── LocationProvider       → user location + permission modal
├── CartProvider           → medicine cart badge + guest merge on login
└── AppNavigator           → Drawer + tabs + stacks
```

Authenticated API calls attach `Authorization: Bearer <token>` via `lib/api/client.ts`.

---

## 5. Navigation Architecture

```
DrawerNavigator
├── MainTabs (BottomTabBar — 5 tabs)
│   ├── Home                    → HomePage
│   ├── Consult (DoctorsStack)
│   ├── Orders (OrdersStack)
│   ├── Health (HealthStack)
│   └── Account (AccountStack)
├── Hospitals                   → placeholder drawer screen
├── Pharmacies                  → placeholder drawer screen
├── Offers                      → placeholder drawer screen
├── Prescriptions               → auth-gated placeholder
├── Help                        → placeholder
└── Contact                     → placeholder
```

The bottom tab bar auto-hides on nested stack screens (booking, checkout, detail) via `tabBarVisibility.ts`.

---

## 6. Tab-by-Tab Feature Map

### Home Tab

**Purpose:** Discovery hub — search, promos, quick actions, featured content.

| Section | Description |
|---------|-------------|
| Search bar | Search medicines, doctors, lab tests |
| Promo carousel | Medicines discount, doctor consult, lab tests at home |
| Quick Actions | 24/7 Medicines, Doctor Consultation, Nearby Pharmacies, Lab Tests |
| Featured Doctors | Horizontal list → book or view all in Consult |
| Popular Tests | Lab packages from API → Consult lab flow |
| Nearby Pharmacies | From vendors API |
| Featured Hospitals | From hospitals API |

**Key file:** `src/features/home/HomePage.tsx`

---

### Consult Tab

**Purpose:** All booking flows for doctors, hospitals, labs, and health packages.

**Home screen (`ConsultHomePage`):**
- **Health Packages carousel** — auto-advances every 2.5s, swipeable, pagination dots
- Service cards: Doctors, Hospitals, Clinics, Video Consultation, Specialties, Lab Tests

**Consult stack screens:**

| Screen | Route | Description |
|--------|-------|-------------|
| Consult Home | `ConsultHome` | Hub + packages carousel |
| Doctors List | `DoctorsList` | Filter by online/in-person, specialty |
| Hospitals List | `HospitalsList` | Browse hospitals |
| Specialties | `Specialties` | Pick specialty → doctors list |
| Doctor Booking | `DoctorBooking` | Slot picker, payment, confirm |
| Health Packages | `HealthPackages` | Full package list, compare, book |
| Lab Tests List | `LabTestsList` | Search, categories, popular tests |
| Lab Test Booking | `LabTestBooking` | Patient info, home collection, slot |
| Lab Cart | `LabCart` | Multi-test cart checkout |
| Lab Reports | `LabReports` | View lab results (also in Health) |

**Key files:** `src/features/consult/`, `src/features/doctors/`, `src/features/lab-tests/`, `src/features/health/screens/HealthPackagesScreen.tsx`

---

### Orders Tab

**Purpose:** Unified order tracking across all order types (matches web).

**Filter tabs:** All · Meds · Labs · Doctors · Hospital · Rx

**Order types merged in `useAllOrders()`:**

| Type | Prefix | Source |
|------|--------|--------|
| Medicines | `med-` | `/orders` |
| Doctor appointments | `doc-` | `/doctors/appointments/me` |
| Lab tests | `lab-` | Lab bookings API |
| Prescription requests | `rx-` | Prescription orders API |

**Stack screens:**
- `OrdersList` — filtered list with `OrderCard`
- `OrderDetail` — tracking steps, items, status (uses `orderRef`)
- `AppointmentChat` — telehealth chat for appointments

**Key files:** `src/features/orders/`, `src/lib/mappers/order.ts`

---

### Health Tab

**Purpose:** Personal health data hub — **not** primary booking for labs/packages (those live under Consult).

**Health hub cards:**

| Service | Screen | Description |
|---------|--------|-------------|
| Reports | `LabReports` | View/download lab results, trends |
| Medical Records | `MedicalRecords` | Prescriptions, discharge, imaging, etc. |
| Family Profiles | `FamilyProfiles` | Manage family member health profiles |
| Health History | `HealthHistory` | Timeline of tests, visits, wellness |

**Also in Health stack (commerce):**

| Screen | Description |
|--------|-------------|
| `MedicinesList` | Browse medicines by category |
| `ProductDetail` | Product info, add to cart |
| `Cart` | Medicine cart |
| `Checkout` | Address + payment + place order |

**Key files:** `src/features/health/`, `src/features/medicines/`

---

### Account Tab

**Purpose:** Profile, settings, auth, and cross-tab shortcuts.

**Guest users see:**
- Sign in / Register prompts
- Healthcare shortcuts (Lab Tests → Consult, Consult home)
- Support info

**Authenticated users see:**
- Profile summary card
- Healthcare shortcuts
- Menu: Profile, Addresses, Payments, Notifications, Settings, Support
- Sign out

**Auth screens (same stack):** SignIn, Register, ForgotPassword

**Key files:** `src/features/account/`, `src/features/auth/`

---

## 7. Health vs Consult — Feature Split

| Feature | Health Tab | Consult Tab |
|---------|------------|-------------|
| Lab Tests booking | ❌ | ✅ |
| Health Packages | ❌ | ✅ (carousel + full screen) |
| Lab Reports viewing | ✅ | ✅ (duplicate route in Consult stack) |
| Medical Records | ✅ | — |
| Family Profiles | ✅ | — |
| Health History | ✅ | — |
| Medicines shop | ✅ (Health stack) | — |
| Doctor/Hospital booking | — | ✅ |

Deep links from Home, Drawer, and Account shortcuts route lab tests to **Consult**, not Health.

---

## 8. Data Layer Architecture

```
UI Screen
    ↓
useApi hooks (React Query)     ← src/lib/hooks/useApi.ts
    ↓
API modules                    ← src/lib/api/index.ts
    ↓
apiClient                      ← src/lib/api/client.ts
    ↓
Backend REST API               ← Backend/ (port 5000)
    ↓
Mappers                        ← src/lib/mappers/*.ts
    ↓
Frontend-friendly types        (Medicine, Doctor, LabTest, UnifiedOrder, …)
```

### Main API modules

| Module | Endpoints (examples) |
|--------|----------------------|
| `authApi` | `/auth/login`, `/auth/register`, `/auth/logout` |
| `productsApi` | `/products`, `/products/:id` |
| `cartApi` | `/customer/cart` |
| `ordersApi` | `/orders` |
| `doctorsApi` | `/doctors`, `/doctors/:id/slots`, `/doctors/appointments` |
| `labTestsApi` | `/lab-tests`, `/lab-tests/book`, `/lab-tests/reports` |
| `hospitalsApi` | `/hospitals` |
| `vendorsApi` | `/vendors` (pharmacies) |
| `usersApi` | Profile, change password |
| `addressesApi` | Saved addresses |
| `prescriptionOrdersApi` | Prescription order requests |

### React Query hooks (selection)

`useDoctors`, `useDoctor`, `useDoctorSlots`, `useBookDoctorAppointment`, `useLabTests`, `useLabTestBookings`, `useLabReports`, `useProducts`, `useCart`, `useAllOrders`, `useUserProfile`, `useAddresses`, `useHospitals`, `useVendors`, …

Mock data fallbacks exist for lab tests and medicines when API returns empty (`mockLabTests.ts`, `mockMedicines.ts`).

---

## 9. Authentication & Guest Mode

- JWT access token stored in AsyncStorage (`lib/auth/tokenStorage.ts`)
- `AuthContext` exposes `user`, `isAuthenticated`, `login`, `register`, `logout`
- `RequireAuthGate` wraps screens that need login (orders, reports, profile, etc.)
- **Guest cart:** medicines stored locally; merged to server cart after login (`CartContext` + `cartActions.ts`)
- **Guest lab cart:** separate local storage (`lib/labCart.ts`)

Cross-tab navigation helpers: `lib/auth/navigation.ts` (`navigateToTabScreen`, `navigateToSignIn`, …)

---

## 10. Folder Structure (Mobile)

```
app/medCare/
├── App.tsx                      # Root providers + navigator
├── src/
│   ├── config/
│   │   └── api.ts               # API base URL (local vs production)
│   ├── navigation/
│   │   ├── AppNavigator.tsx     # Drawer + tabs
│   │   ├── DoctorsStack.tsx     # Consult stack
│   │   ├── HealthStack.tsx
│   │   ├── OrdersStack.tsx
│   │   ├── AccountStack.tsx
│   │   ├── types.ts             # All route param types
│   │   └── tabBarVisibility.ts
│   ├── features/
│   │   ├── home/                # HomePage, promos, quick actions
│   │   ├── consult/             # Consult hub, hospitals, specialties, carousel
│   │   ├── doctors/             # Doctor list, booking, chat
│   │   ├── lab-tests/           # Lab booking, cart, reports page
│   │   ├── medicines/           # Shop, cart, checkout
│   │   ├── health/              # Health hub, records, family, history, packages UI
│   │   ├── orders/              # Unified orders list + detail
│   │   ├── account/             # Account hub + sub-screens
│   │   └── auth/                # Sign in, register, RequireAuthGate
│   ├── components/
│   │   ├── layout/              # ScreenLayout (header + content)
│   │   ├── navigation/          # TopNavigation, BottomTabBar, DrawerContent
│   │   └── location/            # Location permission modal
│   ├── lib/
│   │   ├── api/                 # REST client + endpoint modules
│   │   ├── auth/                # AuthContext, token storage, nav helpers
│   │   ├── cart/                # CartContext, cart actions
│   │   ├── hooks/               # useApi, useHomeData, useTelehealth
│   │   ├── mappers/             # API → UI model transforms
│   │   ├── location/            # Geolocation context
│   │   ├── profile/             # Profile merge helpers
│   │   ├── labCart.ts           # Guest lab cart
│   │   └── medicineCart.ts      # Guest medicine cart
│   ├── providers/
│   │   └── QueryProvider.tsx
│   ├── screens/                 # Drawer placeholder screens
│   └── theme/                   # colors, spacing, radius, shadows
├── android/                     # Android native project
└── ios/                         # iOS native project
```

---

## 11. UI & Theming

- Brand primary: teal (`#0B6E72` family)
- Shared tokens: `src/theme/colors.ts`, `spacing.ts`, `layout.ts`
- `ScreenLayout` — top bar with menu, search (main mode), cart badge, back (stack mode)
- `BottomTabBar` — custom pill-style tab bar with 5 tabs
- `DrawerContent` — side menu with primary/secondary links

---

## 12. API Configuration (Local Development)

Edit `src/config/api.ts`:

```ts
export const USE_LOCAL_API = true;        // false → production API
export const LOCAL_DEV_HOST = '192.168.1.12';  // your PC LAN IP
export const ANDROID_USE_EMULATOR = false;     // true → 10.0.2.2
```

| Target | API URL |
|--------|---------|
| Production | `https://medmarket.asrar.dev/api` |
| Android emulator | `http://10.0.2.2:5000/api` |
| Physical device (same Wi‑Fi) | `http://<LAN_IP>:5000/api` |
| iOS simulator | `http://localhost:5000/api` |

**Requirements:** Backend running on port 5000; phone and PC on same network for physical device testing.

---

## 13. How to Run the Mobile App

```bash
# Terminal 1 — Backend (from workspace root)
cd Backend
npm install
npm run dev

# Terminal 2 — Metro bundler
cd app/medCare
npm install
npm start

# Terminal 3 — Run on device/emulator
cd app/medCare
npm run android    # or npm run ios
```

Type check:

```bash
cd app/medCare
npx tsc --noEmit
```

---

## 14. User Flows (End-to-End)

### Book a doctor (video)
Home → Featured Doctor / Consult → Doctors → pick doctor → DoctorBooking → select date/slot → confirm → appears in Orders (Doctors filter)

### Order medicines
Home → Quick Action Medicines / Health → MedicinesList → ProductDetail → add to cart → Cart → Checkout → address + payment → Orders (Meds filter)

### Book lab test
Consult → Lab Tests (or Home quick action) → search/browse → LabTestBooking → home collection + slot → LabCart (multi-test) → confirm → Orders (Labs filter)

### Book health package
Consult → carousel / Health Packages → pick package → maps to lab test booking → same lab checkout flow

### View lab report
Health → Reports (auth required) → list + trends; empty state links to Consult → Lab Tests

### Track any order
Orders tab → filter by type → tap order → OrderDetail with tracking steps

---

## 15. Implementation Status

| Area | Status |
|------|--------|
| Home discovery | ✅ Built with API + promos |
| Consult hub + carousel | ✅ Built |
| Doctor booking | ✅ Built |
| Lab tests flow | ✅ Built |
| Health packages | ✅ Built (Consult only) |
| Medicines shop + cart | ✅ Built |
| Unified orders | ✅ Built |
| Health records hub | ✅ Built (UI + hooks) |
| Account + auth | ✅ Built |
| Telehealth chat | ✅ Screen wired in Orders stack |
| Drawer: Hospitals, Pharmacies, Offers, Help, Contact | ⏳ Placeholder screens |
| Prescriptions upload flow | ⏳ Placeholder (auth gate only) |

---

## 16. Relationship to Customer Website

The mobile app mirrors the **Frontend/Frontend** customer website:

- Same API contracts and mappers philosophy
- Similar tab semantics: shop/health, consult, orders, account
- Health vs Consult split aligned with recent mobile UX decisions
- Web is the reference for new features; mobile reuses `lib/mappers` patterns and endpoint shapes

When adding a feature, check the web implementation first, then add API hook + mapper + screen in the matching `features/` folder.

---

## 17. Key Design Decisions

1. **Feature-based folders** — each domain (`doctors`, `lab-tests`, `health`) owns its screens and components.
2. **Mappers isolate API shape** — UI never depends on raw backend field names.
3. **React Query for all server data** — caching, refetch, mutations with invalidation.
4. **Nested stacks per tab** — each bottom tab has its own native stack navigator.
5. **Consult = booking, Health = records** — labs and packages book from Consult; Health stores longitudinal data.
6. **Unified orders** — one list merges medicine, lab, doctor, and prescription orders with type-specific detail rendering.
7. **Guest-friendly browsing** — auth required only at checkout, orders, reports, and profile actions.

---

## 18. Useful Commands & Files

| Task | Command / File |
|------|----------------|
| Change API URL | `src/config/api.ts` |
| Add a new screen route | `src/navigation/types.ts` + relevant `*Stack.tsx` |
| Add API endpoint | `src/lib/api/index.ts` + hook in `useApi.ts` |
| Add bottom tab | `AppNavigator.tsx` + `MainTabParamList` |
| Hide tab bar on screen | `src/navigation/tabBarVisibility.ts` |
| Theme colors | `src/theme/colors.ts` |

---

*Last updated: reflects medCare mobile app structure including Consult health-packages carousel, Health/Consult feature split, and unified Orders tab.*
