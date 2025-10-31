let API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000';
try {
  const env = require('@env');
  if (env?.EXPO_PUBLIC_API_URL) {
    API_BASE = env.EXPO_PUBLIC_API_URL;
  }
} catch {}

const jsonHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  Accept: 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

// Types
export type DashboardData = {
  department: {
    id: number;
    name: string;
    code: string;
  };
  statistics: {
    total_courses: number;
    active_courses: number;
    pending_courses: number;
    total_lecturers: number;
  };
  recent_courses: any[];
  recent_lecturers: any[];
};

export type Lecturer = {
  id: number;
  username: string;
  email: string;
  display_name: string;
  department_name?: string;
  course_count?: number;
  course_codes?: string[];
  remaining_capacity?: number;
};

export type CourseStudent = {
  id: number;
  username: string;
  display_name: string;
};

export type Course = {
  id: number;
  code: string;
  name: string;
  description: string;
  status: string;
  lecturer_name?: string;
  lecturer_email?: string;
  lecturer_id?: number | null;
  department_name?: string;
  students?: CourseStudent[];
};

export type DepartmentStudent = {
  id: number;
  username: string;
  display_name: string;
  course_ids: number[];
  course_codes: string[];
};

// HOD Dashboard API calls
export const fetchDashboardData = async (token: string): Promise<DashboardData[]> => {
  const resp = await fetch(`${API_BASE}/api/dashboard/`, { headers: jsonHeaders(token) });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to fetch dashboard data');
  }
  return resp.json();
};

// Department Lecturers API calls
export const fetchDepartments = async (
  token: string,
): Promise<Array<{ id: number; name: string; code: string }>> => {
  const resp = await fetch(`${API_BASE}/api/departments/`, { headers: jsonHeaders(token) });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to fetch departments');
  }
  return resp.json();
};

export const fetchDepartmentLecturers = async (
  token: string,
  departmentId: number,
): Promise<Lecturer[]> => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/lecturers/`, {
    headers: jsonHeaders(token),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to fetch lecturers');
  }
  return resp.json();
};

export const fetchDepartmentCourses = async (
  token: string,
  departmentId: number,
): Promise<Course[]> => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/courses/`, {
    headers: jsonHeaders(token),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to fetch courses');
  }
  return resp.json();
};

export const fetchDepartmentStudents = async (
  token: string,
  departmentId: number,
): Promise<DepartmentStudent[]> => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/students/`, {
    headers: jsonHeaders(token),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to fetch department students');
  }
  return resp.json();
};

export const addLecturer = async (
  token: string,
  departmentId: number,
  data: Partial<Lecturer> & { password: string },
) => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/add_lecturer/`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to add lecturer');
  }
  return resp.json();
};

export const assignCourse = async (
  token: string,
  departmentId: number,
  courseId: number,
  lecturerId: number,
): Promise<Course> => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/assign_course/`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ course_id: courseId, lecturer_id: lecturerId }),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to assign course');
  }
  return resp.json();
};

export const approveCourse = async (token: string, departmentId: number, courseId: number) => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/approve_course/`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify({ course_id: courseId }),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to approve course');
  }
  return resp.json();
};

export type CourseCreatePayload = {
  code: string;
  name: string;
  description?: string;
  lecturer_id?: number | null;
  status?: string;
  student_ids?: number[];
};

export const createCourse = async (
  token: string,
  departmentId: number,
  payload: CourseCreatePayload,
): Promise<Course> => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/create_course/`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to create course');
  }
  return resp.json();
};

export type EnrollStudentsPayload = {
  course_id: number;
  student_ids: number[];
};

export const enrollStudents = async (
  token: string,
  departmentId: number,
  payload: EnrollStudentsPayload,
): Promise<Course> => {
  const resp = await fetch(`${API_BASE}/api/departments/${departmentId}/enroll_students/`, {
    method: 'POST',
    headers: jsonHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    throw new Error((await resp.text()) || 'Failed to enroll students');
  }
  return resp.json();
};
