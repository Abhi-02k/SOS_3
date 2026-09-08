# 📘 SOS GUARDIAN — MASTER PROJECT SPECIFICATION & ARCHITECTURAL BLUEPRINT

**Project Name**: SOS Guardian  
**Repository**: [https://github.com/Abhi-02k/SOS_3.git](https://github.com/Abhi-02k/SOS_3.git)  
**Live Production URL**: [https://sos-3.vercel.app](https://sos-3.vercel.app)  
**Primary System Admin**: `abhaykumar200703@gmail.com`  
**Immutable Attribution**: Crafted by [Veer Bhanushali](https://veerbhanushali.com)  

---

## 1. Project Purpose & Problem Statement

Road traffic collisions and medical emergencies are among the leading causes of preventable fatalities worldwide. In high-speed vehicular crashes, drivers and passengers frequently suffer from immediate loss of consciousness, traumatic shock, or physical entrapment, making it physically impossible to place a 911/emergency telephone call.

**SOS Guardian** solves this critical vulnerability by transforming any standard smartphone browser into an autonomous, hardware-accelerated emergency crash beacon:
- **Autonomous Detection**: Continuously samples device accelerometer sensors without user intervention.
- **Accident Verification**: Uses multi-frame debouncing at $a > 25.0\,\text{m/s}^2$ to differentiate collisions from harmless phone drops.
- **Triage Telemetry**: Delivers the driver's exact blood type, drug allergies, vehicle make/plate, and immediate family contacts directly onto a real-time Leaflet radar map monitored by emergency dispatchers.

---

## 2. Core Technological Stack

| Tier | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16.3.4 (App Router & Turbopack) | Serverless architecture, React Server Components, high performance |
| **Language** | TypeScript (Strict Mode) | Type safety across all API payloads and state management |
| **Database** | Supabase PostgreSQL 15 | Relational persistence, Row-Level Security (RLS), Realtime WebSockets |
| **Cache Layer** | Upstash Redis | Stateless sub-millisecond incident caching & active ID sets |
| **Authentication** | Google OAuth 2.0 via Supabase Auth | Strict, passwordless authentication with zero public pages |
| **Mapping Engine** | Leaflet 1.9.4 (`react-leaflet` ssr:false) | Tactical radar visualization, multi-provider satellite & dark tiles |
| **Sensor API** | W3C DeviceMotionEvent & Geolocation API | Continuous $60\,\text{Hz}$ linear acceleration sampling & GPS coordinates |
| **Styling** | Tailwind CSS + Vanilla CSS Tokens | Dark mode tactical aesthetic, radar animations, glassmorphism |
| **App Shell** | Progressive Web App (PWA) | Service worker, manifest, installable on mobile & desktop |

---

## 3. Application Routes & Confidential Access Model

### A. Gatekeeper Authentication Gateway (`/`)
- **Strict Access Barrier**: No marketing fluff or public browse mode. Every user must authenticate with Google before accessing any tool.
- **Intelligent Routing**:
  - `ADMIN` & `DISPATCHER` $\rightarrow$ Routed directly to `/dashboard`.
  - `CITIZEN` (first time) $\rightarrow$ Routed to `/onboarding`.
  - `CITIZEN` (returning) $\rightarrow$ Routed to `/mobile`.
- **Security Lock Screen**: Any direct URL navigation by unauthenticated visitors to `/mobile`, `/dashboard`, or `/admin/*` instantly displays a security authorization screen and redirects to `/`.

### B. Driver & Relative Onboarding (`/onboarding`)
- Enforced on first sign-up. Captures critical first-responder data:
  1. Driver Mobile Phone
  2. Blood Group (`O+`, `O-`, `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`)
  3. Vehicle Details (Make, Model, License Plate)
  4. Medical Notes & Drug Allergies (e.g. Penicillin allergy, diabetic)
  5. Primary Family Emergency Contact (Name, Relationship, Phone Number)
  6. Secondary Family Emergency Contact (Optional relative)
  7. GPS & Push Notification permission requests.
- Persists to `public.profiles` in Supabase and session storage.

### C. Citizen Crash Beacon Client (`/mobile`)
- **Confidential Design**: Citizens see only their personal crash monitor; no admin links or confidential dispatch panels exist here.
- **Hardware Telemetry**: Displays live coordinates, accuracy radius ($\pm\text{m}$), and velocity ($\text{km/h}$).
- **Mini Radar**: Live visual map showing the driver's active location.
- **Crash Overlay**: 10-second countdown with audible siren, vibration pattern, and tactile "I'M OK" cancel button.
- **Manual SOS**: High-contrast red button for medical or security emergencies with instant 5-second beacon loop.

### D. Dispatch Command Center (`/dashboard`)
- **Tactile Multi-Layer Radar**:
  - CartoDB Dark Matter (tactical dark mode)
  - OpenStreetMap Standard
  - Esri World Imagery (high-res satellite)
- **Live 2-Second Polling**: Incident list updates every 2 seconds without page refresh.
- **Incident Cards**:
  - Auto Crash (Red flame) vs. Manual SOS (Amber shield).
  - Driver blood type badge (`O+`, `A+`, etc.).
  - Medical allergy alert callout.
  - Vehicle details & live velocity.
  - Clickable **"Call Relative: [Phone]"** buttons with `tel:` links.
- **Incident Resolution**: Dismisses or marks incidents resolved in both Redis and PostgreSQL.

### E. Personnel Roster & Role Reassignment (`/admin/users`)
- Restricted strictly to `ADMIN` accounts.
- Displays all registered personnel, roles, device IDs, and contact counts.
- Dynamic role switcher between `ADMIN`, `DISPATCHER`, and `CITIZEN` with instant database synchronization.

---

## 4. Database Schema Structure (`supabase_schema.sql`)

### 1. `public.profiles`
```sql
CREATE TABLE public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'Citizen Responder',
    avatar_url TEXT DEFAULT NULL,
    role TEXT NOT NULL DEFAULT 'CITIZEN' CHECK (role IN ('ADMIN', 'DISPATCHER', 'CITIZEN')),
    phone TEXT DEFAULT NULL,
    device_id TEXT DEFAULT NULL,
    blood_group TEXT DEFAULT 'UNKNOWN',
    medical_notes TEXT DEFAULT NULL,
    vehicle_info TEXT DEFAULT NULL,
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. `public.emergencies`
```sql
CREATE TABLE public.emergencies (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL DEFAULT 'DEV-UNKNOWN',
    user_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    driver_name TEXT DEFAULT NULL,
    driver_phone TEXT DEFAULT NULL,
    blood_group TEXT DEFAULT NULL,
    medical_notes TEXT DEFAULT NULL,
    vehicle_info TEXT DEFAULT NULL,
    emergency_contacts JSONB DEFAULT '[]'::jsonb,
    type TEXT NOT NULL DEFAULT 'MANUAL' CHECK (type IN ('MANUAL', 'AUTO')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISPATCHED', 'RESOLVED', 'CANCELLED')),
    lat DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    lng DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    speed NUMERIC(6, 2) DEFAULT NULL,
    accuracy NUMERIC(6, 2) DEFAULT NULL,
    heading NUMERIC(6, 2) DEFAULT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT DEFAULT NULL,
    responder_notes TEXT DEFAULT NULL,
    assigned_unit TEXT DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_ping TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_by TEXT DEFAULT NULL,
    resolved_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. `public.emergency_breadcrumbs`
Stores historical coordinate trails for moving vehicles:
```sql
CREATE TABLE public.emergency_breadcrumbs (
    id BIGSERIAL PRIMARY KEY,
    emergency_id TEXT NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    speed NUMERIC(6, 2) DEFAULT NULL,
    accuracy NUMERIC(6, 2) DEFAULT NULL,
    heading NUMERIC(6, 2) DEFAULT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 4. Automatic Google Auth Trigger (`handle_new_auth_user`)
Runs whenever a user logs in via Google:
- Extracts Google profile name and avatar URL.
- Auto-assigns `ADMIN` if the email is `abhaykumar200703@gmail.com` or contains `admin`.
- Auto-provisions the user into `public.profiles`.

---

## 5. Crash Detection Physics Algorithm

```
                  DeviceMotionEvent at 60 Hz
                              │
                              ▼
            Calculate Linear Acceleration Magnitude:
               ||a|| = sqrt(ax² + ay² + az²)
                              │
                              ▼
                       ||a|| > 25.0 m/s² ?
                       ├── No  ──> Reset spike counter
                       └── Yes ──> Increment spike counter
                              │
                              ▼
                 Consecutive frames >= 2 ?
                       ├── No  ──> Wait for next frame (anti-false positive)
                       └── Yes ──> TRIGGER CRASH ALERT
                              │
                              ▼
                 10-Second Audible / Haptic Countdown
                       ├── Driver presses "I'M OK" ──> CANCEL SOS
                       └── Countdown reaches 0    ──> DISPATCH BEACON
                              │
                              ▼
              POST /api/sos (with medical & family data)
                              │
                              ▼
          5-Second Continuous GPS Tracking Loop (POST /api/location)
```

---

## 6. Immutable Author Attribution

Per strict system instructions in `AGENTS.md`:
- Author: **Veer Bhanushali**
- Official URL: [https://veerbhanushali.com](https://veerbhanushali.com)
- Display: **"Crafted by Veer Bhanushali"** with external link icon across all application views.
- Protected by `Object.freeze` sealed constants and immutable repository policy.
