# EduAssist Platform

EduAssist is a voice-first learning companion designed with Kenya Methodist University and partner schools in mind. The platform blends a modular Django REST API with an Expo (React Native) mobile app so that neurodiverse students, their families, and campus staff can share the same data, receive timely nudges, and stay rewarded for progress.

---

## Personas & Primary Journeys

| Persona | Primary goals | In-app coverage |
|---------|---------------|-----------------|
| Students | Follow schedules, submit work, ask for help, earn rewards. | Large touchscreen tiles, voice buttons, library of pictorial resources, voice-enabled messaging, Rewards Hub, Notification bell. |
| Parents & Guardians | Track attendance, fees, and lecturer updates without jargon. | Parent dashboard, linked student overview, finance summary feed, communication threads, reward visibility. |
| Lecturers | Manage classes, share accessible resources, keep families synced. | Lecturer dashboard, course ownership, repository uploads, multi-party voice threads with audio + transcript history. |
| Heads of Department | Approve enrollments and monitor academic health. | Enrollment API restricted to HOD/staff, progress summaries per student, dashboard tiles for fast navigation. |
| Finance & Records teams | Maintain invoices, payments, transcripts, compliance logs. | Finance app (fee items, payments, status badges), records role routes, downloadable summaries, audit logging for sensitive actions. |
| Admins & Super Admins | Govern roles, enforce MFA, seed demo data, monitor usage. | Role assignment endpoint, TOTP lifecycle, audit trail, demo seeding, future dashboards for analytics. |
| Librarians & Support staff | Curate inclusive media and unblock access issues fast. | Resource repository with format filters, chatbot-ready chat sessions, helper widget on every screen. |

---

## Feature Breakdown

### Access, Security & Identity
- **Custom user model** stores the nine roles plus accessibility hints (`prefers_simple_language`, `prefers_high_contrast`, `speech_rate`) that the mobile app uses to adapt copy and narration.
- **JWT auth with refresh + blacklist**, optional TOTP enforcement, and a `/api/users/me/` profile endpoint drive sign-in from Expo.
- **Biometric unlock + secure storage**: `AuthContext` persists tokens in AsyncStorage, locks the session behind Expo Local Authentication, and only exposes protected routes when the user is re-verified.
- **Password lifecycle flows** provide reset token issuance, confirmation, and self-service password change; every action writes to `core.AuditLog` for traceability.
- **Role governance**: super administrators can harden accounts through `POST /api/users/assign-role/`, while `ParentStudentLink` keeps guardian access scoped to linked learners.

### Learning & Academic Support
- **Course / Unit / Enrollment / Grade models** capture curricula. The `Enrollment` model caps active courses at four per student and enforces that only HoDs or staff can create or edit assignments.
- **Progress summaries** (`GET /api/learning/students/<id>/progress/`) aggregate grades, averages, completed units, and course metadata for dashboards and guardians.
- **Student dashboards & flows** surface timetable cards, assignment reminders, and quick-access buttons to the library, help center, and Rewards Hub. The timetable screen uses large contrasty cards and keeps a â€œSpeak timetableâ€ control ready for screen-free guidance.

### Communication & Support Desk
- **Thread + Message triads** tie a student, lecturer, and optional parent into a single conversation. Role-based queryset filters prevent eavesdropping, and audio attachments are stored in `MEDIA_ROOT` with automatic transcript capture.
- **Voice note tooling**: `VoiceThreadScreen` records via `expo-av`, renders transcripts, and uses the `/api/core/transcribe/` endpoint (pydub + SpeechRecognition) to turn audio into searchable text.
- **Support chat API** stores anonymized helper sessions, redacts PII (email/phone), and replies with guided scripts for login, reset, and onboarding issues. The in-app `ChatWidget` hits the same endpoint, understands role keywords, and can deep-link to the right role experience.

### Finance, Records & Admin Ops
- **FeeItem + Payment models** track due amounts, partial payments, and derived statuses (`Complete`, `In progress`, `Action needed`). Every payment recomputes the parent itemâ€TMs paid total.
- **Finance summary endpoint** (`GET /api/finance/students/<id>/summary/`) aggregates balances, showcases overdue counts, and exposes item-level breakdowns for students, parents, and finance staff.
- **Role-restricted CRUD**: finance users can create invoices and payments; admins may assist; students/parents are read-only. Heads of department manage enrollments, while admins manage users and links.
- **Notifications groundwork** exists both in the backend (`notifications.Notification`) and the appâ€TMs `NotificationContext`, which polls threads/resources every 60 seconds, stores unread items per user in AsyncStorage, and powers the modal `NotificationBell`.

### Library & Inclusive Media
- **Repository resources** accept multiple media kinds (video, audio, PDF, doc, link). Serializers validate file types so only lecturers/staff can upload, and the student library screen emphasizes friendly thumbnails and fallback links.
- **Librarian workflow** is ready via the `librarian` role and repository endpoints, ensuring curated lists stay accessible and policy-compliant.

### Rewards & Motivation
- **Rewards Hub screen** shows token balance, streak medals, featured rewards, earning tips, and a HashPack wallet CTA. Data is mocked locally until the rewards service ships, but the navigation, modal flows, and cross-role entry points are in place.
- **Dashboards + bottom bar shortcuts** make rewards one tap away for students, parents, and lecturers.
- **Roadmap-ready backend**: upcoming `rewards` app will log earning events, mint Hedera tokens, and drive claims (see roadmap below).

### Notifications & Guided Actions
- **Notification bell** displays unread counts, routes users to exact screens, and lets them mark everything read. It relies on `NotificationContext` tracking thread IDs and resource IDs so duplicate banners are avoided.
- **Alert banners & floating assistant** give contextual nudges (e.g., â€œMath class starts in 15 minutesâ€) and provide instant chat access anywhere in the app.

### Accessibility by Design
- Voice buttons appear on every critical flow (login, timetable, library, messaging, rewards) to either trigger speech or indicate microphone input.
- Screens use large tiles, pictorial cues, and explicit labels so that color is never the only indicator.
- The UI honors per-user preferences (simple language, contrast, speech rate) retrieved from `/api/users/me/`, and helper modals reduce cognitive load by chunking actions.

---

## System Architecture

### Backend (Django 5 + DRF)
- Apps include `core` (health/help/about/transcribe endpoints), `users` (auth, MFA, parent links, audit logs), `learning` (courses, enrollments, grades, summaries), `finance` (fees/payments/summaries), `communications` (threads, messages, support chat), `repository` (resources), `chatbot` (conversation storage), and `notifications`.
- `drf-spectacular` exposes interactive docs at `http://127.0.0.1:8000/api/docs/`. `/api/core/health/` offers uptime probes, and `/api/core/help/` shares accessibility guidance for kiosks.
- Voice attachments, resources, and other uploads land under `backend/media/`. SQLite powers development, while PostgreSQL + S3-compatible storage is recommended for production (dependencies already include `psycopg2-binary`, `redis`, `celery`, and `channels` to support scaling, background jobs, and websockets).
- `seed_demo` provisions nine role-based demo accounts, a starter course/unit, and a sample PDF resource so the mobile app has meaningful fixtures immediately.

### Frontend (Expo SDK 54 + TypeScript)
- `src/context/AuthContext.tsx` centralizes login, JWT refresh, AsyncStorage persistence, biometric relocking, password-change flags, and MFA toggles. `NotificationContext` tracks unread resource/thread events and hydrates `NotificationBell`.
- Navigation is managed with React Navigation (stack). Role selection, login, dashboards, voice messaging, rewards, finance, and library screens are split per persona under `src/screens`.
- Voice interactions lean on `expo-av` (record/playback) and `expo-speech` (spoken prompts). AsyncStorage stores local notification state and auth tokens. UI primitives (`VoiceButton`, `DashboardTile`, `FloatingAssistantButton`, `AlertBanner`, etc.) keep interactions consistent and accessible.

### API & Data Flow Highlights
- `POST /api/token/` (+ `totp_code`) â*' issue JWT access & refresh pairs.
- `GET /api/users/me/` â*' fetch profile, role, and accessibility preferences.
- `POST /api/users/totp/*` â*' setup, activate, or disable MFA.
- `GET|POST /api/learning/courses|units|enrollments/` + `GET /api/learning/students/<id>/progress/`.
- `GET|POST /api/finance/items|payments/` + `GET /api/finance/students/<id>/summary/`.
- `GET|POST /api/communications/threads|messages/` + `POST /api/communications/support/chat/`.
- `POST /api/core/transcribe/` â*' convert uploaded audio to text.
- `GET /api/repository/resources/` â*' drive the inclusive library screens.

---

## Local Development

### Requirements
- Python 3.11+, pip, and virtualenv/venv.
- Node.js 18+ with npm or Yarn, plus the Expo CLI (`npx expo` works out of the box).
- Expo Go app (for device testing) or Android/iOS simulators.

### Backend setup
```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_demo   # optional but recommended
python backend/manage.py runserver 0.0.0.0:8000
```
- Admin: `http://127.0.0.1:8000/admin`
- API docs (Swagger UI): `http://127.0.0.1:8000/api/docs/`
- Health: `http://127.0.0.1:8000/api/core/health/`

### Frontend setup
```bash
cd frontend
npm install
# Create frontend/.env and set:
# EXPO_PUBLIC_API_URL=http://<your-local-IP>:8000
npx expo start --clear
```
- Use LAN or tunnel mode in Expo so mobile devices can reach the backend.
- Rewards data is stubbed locally; once the rewards API ships, set `EXPO_PUBLIC_API_URL` and the screens automatically switch to live data.

### Demo data & sample accounts
Run `python backend/manage.py seed_demo` whenever you need fresh fixtures. Default credentials:

| Role | Username | Password |
|------|----------|----------|
| Student | `student1` | `Student@2025` |
| Parent | `parent1` | `Parent@2025` |
| Lecturer | `lecturer1` | `Lecturer@2025` |
| Head of Department | `hod1` | `HOD@2025` |
| Finance | `finance1` | `Finance@2025` |
| Records | `records1` | `Records@2025` |
| Admin | `admin1` | `Admin@2025` |
| Super Admin | `superadmin1` | `SuperAdmin@2025` |
| Librarian | `librarian1` | `Librarian@2025` |

Each account comes with sensible `is_staff` / `is_superuser` settings so you can test permissions as-is.

### Testing & quality checks
- Backend unit tests: `python backend/manage.py test`
- Lint API schema or run DRF checks as needed (`python backend/manage.py spectacular --file schema.yml`)
- Frontend linting: `cd frontend && npm run lint`
- For end-to-end manual testing, start the backend first, then Expo, log in with a demo user, and exercise dashboards, messaging, support chat, and rewards flows.

---

## Rewards & Hedera Roadmap
1. **Backend rewards service** â€" add a dedicated Django app for wallet linking, reward events, and Celery tasks that mint/transfer Hedera tokens.
2. **HashPack connect flow** â€" implement QR/deeplink pairing, persist wallet metadata, and surface connection health inside the Rewards screen.
3. **Automated earning rules** â€" emit reward events for attendance streaks, on-time assignments, login streaks, and lecturer commendations; notify stakeholders via the NotificationContext.
4. **Claims + fulfillment** â€" let students request merch/fee credits, allow staff to approve or reject, and optionally burn or recycle Hedera tokens.
5. **Chatbot integration** â€" route â€œHow many tokens do I have?â€ requests through Hedera Agent Kit so the helper can speak wallet balances and guide linking steps.

---

## Next Steps
- Build production infrastructure (PostgreSQL, Redis, Celery worker, HTTPS termination, monitoring) so multi-tenancy and push notifications can be added safely.
- Replace static timetable/assignment data with live endpoints that hydrate the student dashboard.
- Extend notifications to use the backend `notifications` app (and eventually push) instead of local polling only.
- Add advanced accessibility settings (dynamic font scaling, offline voice packs) and collect anonymous telemetry to keep improving neurodiverse experiences.

EduAssist is steadily evolving into a unified, voice-forward experience that rewards positive behavior, keeps families in the loop, and gives staff clear controlsâ€"without compromising on clarity or accessibility.



