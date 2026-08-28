# MedCare App — Tab Screens & Functionality

This document describes the layout, navigation, and functionality of all main bottom tabs in the MedCare mobile app.

**App path:** `app/medCare/`  
**Last updated:** July 2026

---

## Bottom navigation overview

| Tab | Icon | Root screen | Stack |
|-----|------|-------------|-------|
| **Home** | `home` | `HealthDashboardPage` | `HomeStack` |
| **Health** | `heart-pulse` | `HealthHomePage` | `HealthStack` |
| **Copilot** | `robot` (center) | `CopilotHome` | `CopilotStack` |
| **Community** | `account-group` | `CommunityHomeScreen` | `CommunityStack` |
| **You** | `account` | `AccountHomeScreen` | `YouStack` |

---

# 1. Home Tab

**Bottom tab:** 1st tab — **Home**  
**Root screen:** `HealthDashboardPage` (main dashboard)  
**Stack:** `HomeStack` → Dashboard, ServicesHub, Services

## Main dashboard layout (top → bottom)

### 1. Header
- Greeting: **"Hi {firstName} 👋"**
- Subtitle: "Your health hub is ready"
- **Bell icon** → Notifications (You tab)
- Long-press bell → send test push notification

### 2. Search bar
- Placeholder: "Search doctors, medicines, lab tests..."
- Submit/search tap → **Health → Medicines List**

### 3. Quick care services (2×2 grid)

| Tile | Action |
|------|--------|
| **Doctors** | Services → Doctors list |
| **Lab Tests** | Services → Lab tests list |
| **Medicines** | Drawer → Pharmacies |
| **Hospitals** | Services → Hospitals list |

### 4. AI Health Copilot banner
- Personalized AI summary (or default message)
- **View Briefing** → Copilot tab

### 5. Needs your attention
Dynamic list based on live data:
- **Medicines** → Health → Medicines
- **Lab Reports** → Health → Reports
- **Appointments** → You → Orders

### 6. Offers (promo carousel)
Swipeable banners:
- 25% OFF Medicines → Health → Medicines
- Consult Top Doctors → Services → Doctors
- Lab Tests at Home → Services → Lab tests
- Hospital Care → Services → Hospitals

### 7. Recommended for you
Tabbed section: **Doctors | Labs | Pharmacies | Hospitals**
- Cards from API (doctors, lab packages, pharmacies, hospitals)
- **See all** per tab
- Tap card → doctor profile, lab test, pharmacy detail, or hospital detail

**Pull-to-refresh** reloads health data, home recommendations, and gamification profile.

## Sub-screens from Home

| Screen | Purpose |
|--------|---------|
| **Services Hub** | Directory: Doctors, Lab tests, Specialists, Health packages, Hospitals, Medicines link |
| **Services stack** | Full consult flow: doctors, hospitals, lab tests, bookings, health packages |

## Data: live vs static

| Feature | Source |
|---------|--------|
| Doctors, pharmacies, hospitals, lab packages | API (live) |
| Attention items | Health dashboard (live when logged in) |
| Promo banners | Static config |
| Recommended fallback | Mock data if API empty |

## Auth
- Works for guests; richer data when logged in

---

# 2. Health Tab

**Bottom tab:** 2nd tab — **Health**  
**Root screen:** `HealthHomePage` — **"Your Health Hub"**  
**Stack:** `HealthStack`

## Health Hub layout (top → bottom)

### 1. Page header
- **Title:** "Your Health Hub"
- **Subtitle:** "Track records, reports, prescriptions, and family health in one place"

### 2. Health Overview hero card
- Health score
- Prescriptions count
- New reports count
- Family member count
- Next visit (from upcoming lab bookings)

### 3. Quick action grid (2×2)

| Tile | Goes to | Badge |
|------|---------|-------|
| **Reports** | Lab Reports | e.g. "1 new report" |
| **Medical Records** | Medical Records | "Secure vault" |
| **Prescriptions** | Medicines list | e.g. "2 active" |
| **Family Vault** | Family Profiles | e.g. "3 members" |

### 4. Needs attention
Actionable alerts (currently static demo data):
- CBC report ready → Reports
- 2 medicines due today → Medicines
- Family follow-up tomorrow → Family Vault

### 5. Recent activity
Timeline (currently static demo data):
- Lab test completed
- Prescription uploaded
- Appointment booked

### 6. Family health preview
- Horizontal cards for up to 3 family members
- **View Family Vault** → Family Profiles
- Tap member → member detail

## Sub-screens

### Reports (`LabReports`) — Auth required
- Summary: total reports, latest report, last updated
- **Track trends** — HbA1c trend chart when enough data
- **Recent reports** — list from lab API
- Empty state → **Book a Lab Test** (Services tab)

### Medical Records (`MedicalRecords`) — Auth required
- Unified document vault (lab, orders, manual uploads)
- Search bar
- **Category chips:** All, Lab Reports, Prescriptions, Doctor Visits, Discharge, Vaccination, Imaging
- Upload new documents
- Tap record → view, booking details, delete manual uploads
- Pull-to-refresh

### Prescriptions & Medicines (`MedicinesList`)
- Prescriptions summary card
- Upload prescription banner
- Search + segments: Active, Refill, OTC, Supplements
- Medicine list from API
- Product Detail → Cart → Checkout

### Family Vault (`FamilyProfiles`) — Auth required
- Create family vault (if none)
- Summary card, add member
- **4 tabs:** Overview | Calendar | Copilot | Summary
- Add member modal
- Tap member → Family Member Detail

### Family Member Detail (`FamilyMemberDetail`) — Auth required
- **Prescriptions:** upload photo, OCR extract, delete
- **Medicines:** saved/extracted list
- **Vitals:** log BP, sugar, weight, heart rate, SpO2; trends

### Health History (`HealthHistory`) — Auth required
- Registered in navigation but **not linked from Health Hub UI**
- Blood group, member since, DOB
- Monthly healthcare timeline

## Data: live vs static

| Feature | Source |
|---------|--------|
| Health score | Gamification profile (live) |
| Lab reports & trends | Backend API (live) |
| Medical records | API + uploads (live) |
| Medicines list | Products API (live) |
| Family vault | Family vault API (live) |
| Active prescriptions count | Hardcoded (2) |
| Needs attention | Static demo |
| Recent activity | Static demo |

---

# 3. Community Tab

**Bottom tab:** 4th tab — **Community**  
**Root screen:** `CommunityHomeScreen`  
**Provider:** `CommunityProvider` (live API + mock fallback)

## Main screen layout

### Header
- Title: **Community**
- **"Live community"** badge when API connected
- **+ button** → Create post (auth required)

### 4 segment tabs: Feed | Challenges | Groups | You

#### Feed
- **Filters:** All, Videos, Verified, Friends
- Up to 6 post cards
- Tap → Post Detail; like from feed
- Pull-to-refresh

#### Challenges
- **+ Create challenge**
- Your challenges (joined)
- Discover more / All challenges
- Tap → Challenge Detail

#### Groups
- **+ Create group**
- Group cards (join/leave)
- Tap → Group Detail

#### You (community profile)
- **Health buddies** → Buddies
- **Weekly health report** → Weekly Report
- Note: streaks/badges on Home tab

**Guests:** warning to sign in for post/group/challenge actions.

## Sub-screens

| Screen | Features |
|--------|----------|
| **Post Detail** | Full post, media, like, comments |
| **Create Post** | Text or video (optional group) |
| **Challenge Detail** | Progress, join/leave, log progress |
| **Group Detail** | Discussions + Members, join, add members |
| **Create Group** | New health group |
| **Create Challenge** | New wellness challenge |
| **Add Group Member** | Invite/add to group |
| **Buddies** | Manage health buddies |
| **Add Buddy** | Add a buddy |
| **Weekly Report** | Weekly progress view/share |

## Data
- Posts, groups, challenges from API when authenticated
- Mock fallback when API unavailable

---

# 4. You Tab

**Bottom tab:** 5th tab — **You**  
**Root screen:** `AccountHomeScreen` (`YouHome`)  
**Modes:** Guest vs Logged-in

## Guest layout

- Guest welcome message
- **Sign in with phone**
- **Create account**
- **Browse without signing in:**
  - Lab Tests
  - Healthcare Services
  - My Orders

**Auth screens:** Phone Sign In, OTP Verify, Sign In, Register, Forgot Password

## Logged-in layout (top → bottom)

### 1. Profile hero card
- Name, family health score, member count
- Tap → **Profile**

### 2. Quick actions (4 tiles)

| Action | Goes to |
|--------|---------|
| My Orders | Orders list |
| Appointments | Orders list |
| Lab Reports | Health → Reports |
| Family Members | Health → Family Vault |

### 3. Health summary card
- Medicines due, reports ready, upcoming visit

### 4. Account settings

| Item | Screen |
|------|--------|
| Addresses | Saved addresses |
| Payments | Payment methods |
| Notifications | Push prefs + recent list |
| Privacy & Security | Settings |
| Support | Help center |

### 5. More services
- Lab Tests → Home Services
- Healthcare Services → Services Hub

### 6. Emergency support strip
- Opens Copilot with emergency prompt

### 7. Sign out

## Sub-screens

| Screen | Features |
|--------|----------|
| **Profile** | Personal info, blood group, health summary |
| **Orders List** | Filters: All, Meds, Labs, Doctors, Hospital, Rx; live tracking |
| **Order Detail** | Status, items, tracking |
| **Appointment Chat** | Doctor messaging |
| **Addresses** | Manage addresses |
| **Payments** | Payment methods |
| **Notifications** | Enable push, test push, prefs, recent list |
| **Settings** | Privacy, security, profile |
| **Support** | Contact, FAQs |

## Data
- Profile, orders, family vault, notifications when logged in
- Guest browse only without auth

---

# Navigation map (all tabs)

```
HOME                          HEALTH                        COMMUNITY
├── Dashboard                 ├── Health Hub                ├── Feed
│   ├── Header + notifs       │   ├── Overview card         ├── Challenges
│   ├── Search                │   ├── Quick actions         ├── Groups
│   ├── Services grid         │   ├── Needs attention       └── You
│   ├── Copilot banner        │   ├── Recent activity             │
│   ├── Attention list        │   └── Family preview            ├── Post Detail
│   ├── Promo carousel        ├── Reports                       ├── Challenge Detail
│   └── Recommended tabs      ├── Medical Records               ├── Group Detail
├── Services Hub              ├── Medicines → Cart              └── Buddies / Report
└── Services                  ├── Family Vault
                              └── Family Member Detail

YOU
├── Guest: Sign in / Register / Browse
└── Logged in:
    ├── Profile hero
    ├── Quick actions
    ├── Health summary
    ├── Settings group
    ├── More services
    ├── Emergency
    ├── Orders / Profile / Notifications / etc.
    └── Sign out
```

---

# Key source files

| Tab | Main files |
|-----|------------|
| Home | `src/features/dashboard/HealthDashboardPage.tsx`, `src/navigation/HomeStack.tsx` |
| Health | `src/features/health/HealthHomePage.tsx`, `src/navigation/HealthStack.tsx` |
| Community | `src/features/community/CommunityHomeScreen.tsx`, `src/navigation/CommunityStack.tsx` |
| You | `src/features/account/screens/AccountHomeScreen.tsx`, `src/navigation/YouStack.tsx` |
| Tabs | `src/components/navigation/BottomTabBar.tsx`, `src/navigation/types.ts` |

---

# Auth summary

| Tab | Guest access |
|-----|--------------|
| Home | Full browse; richer when logged in |
| Health | Hub open; sub-screens mostly require login |
| Community | Read feed; sign in to post/join/create |
| You | Limited; full account needs login |
