import type { Role } from '@app-types/roles';

let API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
try {
  // Fallback for expo @env usage in some bundlers

  const env = require('@env');
  if (env?.EXPO_PUBLIC_API_URL) {
    API_BASE = env.EXPO_PUBLIC_API_URL;
  }
} catch {
  // no-op: keep default
}

type LoginPayload = {
  username: string;
  password: string;
  totp_code?: string;
};

type TokenResponse = {
  access: string;
  refresh: string;
};

export type ApiUser = {
  id: number;
  username: string;
  email: string | null;
  first_name: string;
  last_name: string;
  display_name: string | null;
  role: Role;
  must_change_password: boolean;
  prefers_simple_language: boolean;
  prefers_high_contrast: boolean;
  speech_rate: number;
  totp_enabled?: boolean;
};

export type ApiParentLink = {
  id: number;
  parent: number;
  student: number;
  relationship: string | null;
  parent_detail: ApiUser;
  student_detail: ApiUser;
};

export type ApiCourse = {
  id: number;
  code: string;
  name: string;
  description: string;
  lecturer?: number | null;
  lecturer_name?: string;
};

export type ApiProvisionRequest = {
  id: number;
  username: string;
  display_name: string;
  email: string;
  role: Role;
  status: string;
  requested_by: number;
  requested_by_detail: ApiUser;
  reviewed_by: number | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_user: number | null;
  created_user_detail: ApiUser | null;
  temporary_password?: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseRoster = {
  course: {
    id: number;
    code: string;
    name: string;
  };
  students: Array<{
    id: number;
    username: string;
    display_name: string | null;
    active: boolean;
    enrollment_id: number;
  }>;
};

export type ApiResource = {
  id: number;
  title: string;
  kind: string;
  description: string;
  url?: string | null;
  file?: string | null;
  category?: number | null;
  category_name?: string | null;
  category_parent_name?: string | null;
  course?: number | null;
  course_name?: string | null;
  course_code?: string | null;
};

type LoginResponse = TokenResponse & {
  user?: ApiUser;
};

type PasswordResetRequestPayload = {
  username?: string;
  email?: string;
};

type PasswordResetConfirmPayload = {
  username: string;
  token: string;
  new_password: string;
};

export const endpoints = {
  me: () => `${API_BASE}/api/users/me/`,
  login: () => `${API_BASE}/api/token/`,
  passwordResetRequest: () => `${API_BASE}/api/users/password-reset/request/`,
  passwordResetConfirm: () => `${API_BASE}/api/users/password-reset/confirm/`,
  passwordChangeSelf: () => `${API_BASE}/api/users/password-reset/self/`,
  usersList: () => `${API_BASE}/api/users/users/`,
  parentLinks: () => `${API_BASE}/api/users/parent-links/`,
  provisionUser: () => `${API_BASE}/api/users/provision/`,
  provisionRequests: () => `${API_BASE}/api/users/provision-requests/`,
  provisionRequestApprove: (id: number) =>
    `${API_BASE}/api/users/provision-requests/${id}/approve/`,
  provisionRequestReject: (id: number) => `${API_BASE}/api/users/provision-requests/${id}/reject/`,
  provisionRequestEmailAgain: (id: number) =>
    `${API_BASE}/api/users/provision-requests/${id}/email_again/`,
  threads: () => `${API_BASE}/api/communications/threads/`,
  messages: () => `${API_BASE}/api/communications/messages/`,
  progressSummary: (studentId: number) =>
    `${API_BASE}/api/learning/students/${studentId}/progress/`,
  courses: () => `${API_BASE}/api/learning/courses/`,
  quickEnroll: () => `${API_BASE}/api/learning/enrollments/quick/`,
  courseRoster: (courseId: number) => `${API_BASE}/api/learning/courses/${courseId}/roster/`,
  attendanceCheckIn: () => `${API_BASE}/api/learning/attendance/check-in/`,
  examRegister: () => `${API_BASE}/api/learning/exams/register/`,
  financeSummary: (studentId: number) => `${API_BASE}/api/finance/students/${studentId}/summary/`,
  timetable: (studentId: number) => `${API_BASE}/api/learning/students/${studentId}/timetable/`,
  totpSetup: () => `${API_BASE}/api/users/totp/setup/`,
  totpActivate: () => `${API_BASE}/api/users/totp/activate/`,
  totpDisable: () => `${API_BASE}/api/users/totp/disable/`,
  assignRole: () => `${API_BASE}/api/users/assign-role/`,
  transcribe: () => `${API_BASE}/api/core/transcribe/`,
  resources: () => `${API_BASE}/api/repository/resources/`,
};

export const fetchJson = async <T>(url: string, token?: string): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }

  return response.json();
};

export const loginRequest = async ({
  username,
  password,
  totp_code,
}: LoginPayload): Promise<LoginResponse> => {
  const response = await fetch(endpoints.login(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password, totp_code }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = (data && (data.detail || data.non_field_errors?.[0])) || 'Invalid credentials';
    throw new Error(error);
  }

  return response.json();
};

export const requestPasswordReset = async (payload: PasswordResetRequestPayload) => {
  const response = await fetch(endpoints.passwordResetRequest(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

export const confirmPasswordReset = async (payload: PasswordResetConfirmPayload) => {
  const response = await fetch(endpoints.passwordResetConfirm(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

export const changePasswordSelf = async (newPassword: string, token: string) => {
  const response = await fetch(endpoints.passwordChangeSelf(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ new_password: newPassword }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

const authedPost = async <T>(
  url: string,
  token: string,
  body: Record<string, unknown> = {},
): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

export const requestTotpSetup = async (token: string) =>
  authedPost<{ secret: string; otpauth_url: string; enabled: boolean }>(
    endpoints.totpSetup(),
    token,
  );

export const activateTotp = async (token: string, code: string) =>
  authedPost<{ detail: string; enabled: boolean }>(endpoints.totpActivate(), token, { code });

export const disableTotp = async (token: string, code: string) =>
  authedPost<{ detail: string; enabled: boolean }>(endpoints.totpDisable(), token, { code });

export const assignUserRole = async (token: string, userId: number, role: Role) =>
  authedPost<ApiUser>(endpoints.assignRole(), token, { user_id: userId, role });

export type ApiMessage = {
  id: number;
  thread: number;
  body: string;
  audio?: string | null;
  transcript?: string;
  sender_role: string;
  created_at: string;
  updated_at: string;
  author_detail: ApiUser;
};

export type ApiThread = {
  id: number;
  subject: string;
  student: number;
  teacher: number;
  parent: number | null;
  student_detail: ApiUser;
  teacher_detail: ApiUser;
  parent_detail: ApiUser | null;
  messages: ApiMessage[];
  created_at: string;
  updated_at: string;
};

export const fetchThreads = (token: string) => fetchJson<ApiThread[]>(endpoints.threads(), token);

export const fetchResources = (token: string) =>
  fetchJson<ApiResource[]>(endpoints.resources(), token);

export type CreateThreadPayload = {
  student: number;
  teacher: number;
  parent?: number | null;
  subject?: string;
};

export const createThread = (token: string, payload: CreateThreadPayload) =>
  authedPost<ApiThread>(endpoints.threads(), token, payload);

export const fetchCourses = (
  token: string,
  params?: Record<string, string | number | undefined>,
) => {
  const search =
    params && Object.keys(params).length
      ? `?${new URLSearchParams(
          Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              acc[key] = String(value);
            }
            return acc;
          }, {}),
        ).toString()}`
      : '';
  return fetchJson<ApiCourse[]>(`${endpoints.courses()}${search}`, token);
};

export const fetchUsers = (token: string) => fetchJson<ApiUser[]>(endpoints.usersList(), token);

export const fetchParentLinks = (token: string) =>
  fetchJson<ApiParentLink[]>(endpoints.parentLinks(), token);

export const fetchProvisionRequests = (token: string) =>
  fetchJson<ApiProvisionRequest[]>(endpoints.provisionRequests(), token);

export type CreateUserPayload = {
  username: string;
  password: string;
  role: Role;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  prefers_simple_language?: boolean;
  prefers_high_contrast?: boolean;
  speech_rate?: number;
};

export const provisionUser = (token: string, payload: CreateUserPayload) =>
  authedPost<ApiUser>(endpoints.provisionUser(), token, payload);

export type ParentLinkPayload = {
  parent: number;
  student: number;
  relationship?: string;
  records_passcode: string;
};

export const createParentLink = (token: string, payload: ParentLinkPayload) =>
  authedPost<ApiParentLink>(endpoints.parentLinks(), token, payload);

export type ProvisionRequestPayload = {
  username: string;
  role: Extract<Role, 'student' | 'parent'>;
  display_name?: string;
  email?: string;
  records_passcode: string;
};

export const createProvisionRequest = (token: string, payload: ProvisionRequestPayload) =>
  authedPost<ApiProvisionRequest>(endpoints.provisionRequests(), token, payload);

export type QuickEnrollPayload = {
  student_id?: number;
  student_username?: string;
  course_id?: number;
  course_code?: string;
};

export const quickEnrollStudent = (token: string, payload: QuickEnrollPayload) =>
  authedPost<{ detail: string }>(endpoints.quickEnroll(), token, payload);

export const approveProvisionRequest = (token: string, requestId: number) =>
  authedPost<{ user: ApiUser; temporary_password: string }>(
    endpoints.provisionRequestApprove(requestId),
    token,
  );

export const rejectProvisionRequest = (token: string, requestId: number, reason?: string) =>
  authedPost<ApiProvisionRequest>(
    endpoints.provisionRequestReject(requestId),
    token,
    reason ? { reason } : {},
  );

export const emailProvisionCredentials = (token: string, requestId: number) =>
  authedPost<{ detail: string }>(endpoints.provisionRequestEmailAgain(requestId), token);

export const fetchCourseRoster = (token: string, courseId: number) =>
  fetchJson<CourseRoster>(endpoints.courseRoster(courseId), token);

export type AttendancePayload = {
  enrollment_id?: number;
  student_id?: number;
  course_id?: number;
  event_type?: 'lecturer_mark' | 'student_checkin';
  note?: string;
};

export const submitAttendanceEvent = (token: string, payload: AttendancePayload) =>
  authedPost(endpoints.attendanceCheckIn(), token, payload);

export const registerForExams = (token: string) =>
  authedPost<{ detail: string; allowed: boolean }>(endpoints.examRegister(), token);

type CreateMessagePayload = {
  thread: number;
  body?: string;
  transcript?: string;
  audioUri?: string;
  audioMimeType?: string;
};

export const createMessage = async (
  token: string,
  payload: CreateMessagePayload,
): Promise<ApiMessage> => {
  const { thread, body, transcript, audioUri, audioMimeType } = payload;
  const form = new FormData();
  form.append('thread', String(thread));
  if (body !== undefined) {
    form.append('body', body);
  }
  if (transcript) {
    form.append('transcript', transcript);
  }
  if (audioUri) {
    form.append('audio', {
      uri: audioUri,
      name: `voice-${Date.now()}.m4a`,
      type: audioMimeType ?? 'audio/m4a',
    } as any);
  }
  const response = await fetch(endpoints.messages(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

export const transcribeAudio = async (
  token: string,
  uri: string,
  mimeType: string = 'audio/m4a',
): Promise<{ text: string }> => {
  const form = new FormData();
  form.append('audio', {
    uri,
    name: `clip-${Date.now()}.m4a`,
    type: mimeType,
  } as any);
  const response = await fetch(endpoints.transcribe(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};

// Repository
export type CreateResourcePayload = {
  title: string;
  description?: string;
  kind: ApiResource['kind'];
  url?: string;
  fileUri?: string; // provide either url or fileUri
  fileMimeType?: string;
  course: number;
};

export const createResource = async (
  token: string,
  payload: CreateResourcePayload,
): Promise<ApiResource> => {
  const { title, description, kind, url, fileUri, fileMimeType, course } = payload;
  const form = new FormData();
  form.append('title', title);
  form.append('kind', kind);
  if (description) {
    form.append('description', description);
  }
  if (url) {
    form.append('url', url);
  }
  form.append('course', String(course));
  if (fileUri) {
    form.append('file', {
      uri: fileUri,
      // backend does not care about the exact name, use a timestamp
      name: `upload-${Date.now()}`,
      type: fileMimeType || 'application/octet-stream',
    } as any);
  }
  const response = await fetch(endpoints.resources(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json();
};
