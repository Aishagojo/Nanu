# EduAssist Mobile

React Native (Expo) prototype implementing the accessibility-first dashboards described for EduAssist roles.

## Structure

- `src/theme`: shared colors, spacing, typography tokens.
- `src/components`: reusable pieces (tiles, voice buttons, banners, assistant bubble, etc.).
- `src/screens`: role-based screens wired through React Navigation.
- `src/services`: API helpers to hit the Django backend while testing.
- `src/hooks`: voice synthesis hook using `expo-speech`.

## Getting Started

> Expo CLI is required. Install globally if missing: `npm install -g expo-cli`

```
npm install
npm run start
```

Set the backend base URL via `EXPO_PUBLIC_API_URL` in `.env` for API calls.

The prototype currently implements:

- Role selection ? login placeholder ? role dashboards (student, parent, lecturer, HoD, finance, records, admin)
- Accessibility affordances: large tiles, voice buttons, alert banners, assistant bubble, bottom utility bar.
- Stubbed voice hook (`useVoice`) and API helper ready to connect to real endpoints.

Next steps include wiring live data, implementing timetable and chatbot drawers, and integrating auth.
