/* eslint jsx-quotes: "off" */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { VoiceButton } from '@components/index';
import { palette, spacing, typography } from '@theme/index';
import { useAuth } from '@context/AuthContext';
import {
  assignCourse,
  createCourse,
  enrollStudents,
  fetchDepartmentCourses,
  fetchDepartmentLecturers,
  fetchDepartmentStudents,
  fetchDepartments,
  type Course,
  type CourseCreatePayload,
  type DepartmentStudent,
  type Lecturer,
} from '@services/hodApi';

type Department = { id: number; name: string; code: string };

const LecturerManagementScreen: React.FC = () => {
  const { state } = useAuth();
  const token = state.accessToken;

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [lecturers, setLecturers] = useState<Lecturer[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<DepartmentStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [assigningCourseId, setAssigningCourseId] = useState<number | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<number | null>(null);

  const [managingStudentsCourseId, setManagingStudentsCourseId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

const [creatingCourse, setCreatingCourse] = useState(false);
const [newCourseForm, setNewCourseForm] = useState<{
  code: string;
  name: string;
  description: string;
  lecturerId: number | null;
  studentIds: number[];
}>({
  code: '',
  name: '',
  description: '',
  lecturerId: null,
  studentIds: [],
});
  const [showNewCourseLecturerPicker, setShowNewCourseLecturerPicker] = useState(false);

  const loadDepartmentData = useCallback(
    async (deptId: number) => {
      if (!token) {
        return;
      }
      try {
        setLoading(true);
        const [lecturerData, courseData, studentData] = await Promise.all([
          fetchDepartmentLecturers(token, deptId),
          fetchDepartmentCourses(token, deptId),
          fetchDepartmentStudents(token, deptId),
        ]);
        setLecturers(lecturerData);
        setCourses(courseData);
        setStudents(studentData);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load department data', err);
        setError(err?.message ?? 'Unable to load department information.');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    const load = async () => {
      try {
        setLoading(true);
        const deptList = await fetchDepartments(token);
        setDepartments(deptList);
        if (deptList.length > 0) {
          setSelectedDeptId((prev) => prev ?? deptList[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load departments', err);
        setError(err?.message ?? 'Unable to load departments.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  useEffect(() => {
    if (!token || !selectedDeptId) {
      return;
    }
    loadDepartmentData(selectedDeptId);
  }, [loadDepartmentData, selectedDeptId, token]);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredLecturers = useMemo(() => {
    if (!normalizedSearch) {
      return lecturers;
    }
    return lecturers.filter((lecturer) =>
      [lecturer.display_name, lecturer.username, lecturer.email, lecturer.department_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [lecturers, normalizedSearch]);

  const filteredCourses = useMemo(() => {
    if (!normalizedSearch) {
      return courses;
    }
    return courses.filter((course) =>
      [
        course.code,
        course.name,
        course.description,
        course.lecturer_name,
        course.lecturer_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [courses, normalizedSearch]);

  const availableStudents = useMemo(() => {
    if (!managingStudentsCourseId) {
      return students;
    }
    return students;
  }, [managingStudentsCourseId, students]);

  const startAssigning = (course: Course) => {
    setAssigningCourseId(course.id);
    setSelectedLecturerId(course.lecturer_id ?? null);
    setManagingStudentsCourseId(null);
  };

  const cancelAssigning = () => {
    setAssigningCourseId(null);
    setSelectedLecturerId(null);
  };

  const handleAssignLecturer = async () => {
    if (!token || !selectedDeptId || assigningCourseId === null || selectedLecturerId === null) {
      Alert.alert('Select lecturer', 'Please select a lecturer to assign to this course.');
      return;
    }
    try {
      setActionLoading(true);
      await assignCourse(token, selectedDeptId, assigningCourseId, selectedLecturerId);
      await loadDepartmentData(selectedDeptId);
      cancelAssigning();
      Alert.alert('Course updated', 'Lecturer assignment saved successfully.');
    } catch (err: any) {
      console.error('Assign lecturer failed', err);
      Alert.alert('Unable to assign', err?.message ?? 'Failed to assign lecturer.');
    } finally {
      setActionLoading(false);
    }
  };

  const startManagingStudents = (course: Course) => {
    setManagingStudentsCourseId(course.id);
    setSelectedStudentIds((course.students ?? []).map((student) => student.id));
    setAssigningCourseId(null);
  };

  const cancelManagingStudents = () => {
    setManagingStudentsCourseId(null);
    setSelectedStudentIds([]);
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const handleSaveStudents = async () => {
    if (!token || !selectedDeptId || managingStudentsCourseId === null) {
      return;
    }
    if (selectedStudentIds.length === 0) {
      Alert.alert('Select students', 'Choose at least one student to enroll.');
      return;
    }
    try {
      setActionLoading(true);
      await enrollStudents(token, selectedDeptId, {
        course_id: managingStudentsCourseId,
        student_ids: selectedStudentIds,
      });
      await loadDepartmentData(selectedDeptId);
      cancelManagingStudents();
      Alert.alert('Roster updated', 'Students enrolled successfully.');
    } catch (err: any) {
      console.error('Enroll students failed', err);
      Alert.alert('Unable to enroll', err?.message ?? 'Failed to enroll students into the course.');
    } finally {
      setActionLoading(false);
    }
  };

const toggleCreateCourse = () => {
  setCreatingCourse((prev) => !prev);
  setNewCourseForm({
    code: '',
    name: '',
    description: '',
    lecturerId: null,
    studentIds: [],
  });
  setShowNewCourseLecturerPicker(false);
};

  const toggleNewCourseStudent = (studentId: number) => {
    setNewCourseForm((prev) => ({
      ...prev,
      studentIds: prev.studentIds.includes(studentId)
        ? prev.studentIds.filter((id) => id !== studentId)
        : [...prev.studentIds, studentId],
    }));
  };

  const handleCreateCourse = async () => {
    if (!token || !selectedDeptId) {
      return;
    }
    const code = newCourseForm.code.trim();
    const name = newCourseForm.name.trim();
    if (!code || !name) {
      Alert.alert('Missing details', 'Course code and name are required.');
      return;
    }
    const payload: CourseCreatePayload = {
      code,
      name,
      description: newCourseForm.description.trim(),
      lecturer_id: newCourseForm.lecturerId ?? undefined,
      student_ids: newCourseForm.studentIds,
    };
    try {
      setActionLoading(true);
      await createCourse(token, selectedDeptId, payload);
      await loadDepartmentData(selectedDeptId);
      toggleCreateCourse();
      Alert.alert('Course created', 'The course has been added successfully.');
    } catch (err: any) {
      console.error('Create course failed', err);
      Alert.alert('Unable to create course', err?.message ?? 'Failed to create course.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderDepartmentPills = () => (
    <View style={styles.deptRow}>
      {departments.map((dept) => {
        const active = dept.id === selectedDeptId;
        return (
          <TouchableOpacity
            key={dept.id}
            style={[styles.deptPill, active && styles.deptPillActive]}
            onPress={() => {
              if (dept.id !== selectedDeptId) {
                setSelectedDeptId(dept.id);
              }
            }}
          >
            <Text style={[styles.deptPillText, active && styles.deptPillTextActive]}>
              {dept.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderLecturerCard = (lecturer: Lecturer) => (
    <View key={lecturer.id} style={styles.lecturerCard}>
      <View style={styles.lecturerInfo}>
        <Text style={styles.lecturerName}>{lecturer.display_name || lecturer.username}</Text>
        <Text style={styles.lecturerEmail}>{lecturer.email}</Text>
        <View style={styles.lecturerBadges}>
          <Text style={styles.badgeChip}>
            {lecturer.course_count ?? 0} / {4} courses
          </Text>
          {lecturer.remaining_capacity !== undefined ? (
            <Text style={styles.badgeChip}>
              {lecturer.remaining_capacity} slot{lecturer.remaining_capacity === 1 ? '' : 's'} left
            </Text>
          ) : null}
        </View>
        {lecturer.course_codes && lecturer.course_codes.length ? (
          <Text style={styles.lecturerCourses}>
            Courses: {lecturer.course_codes.join(', ')}
          </Text>
        ) : (
          <Text style={styles.lecturerCourses}>No courses yet.</Text>
        )}
      </View>
    </View>
  );

  const renderCourseCard = (course: Course) => {
    const isAssigning = assigningCourseId === course.id;
    const isManaging = managingStudentsCourseId === course.id;
    const courseStudents = course.students ?? [];

    return (
      <View key={course.id} style={styles.courseCard}>
        <View style={styles.courseHeader}>
          <Text style={styles.courseTitle}>
            {course.code} • {course.name}
          </Text>
          <Text style={styles.courseStatus}>{course.status.toUpperCase()}</Text>
        </View>
        <Text style={styles.courseMeta}>
          Lecturer:{' '}
          <Text style={styles.courseMetaValue}>
            {course.lecturer_name || 'Unassigned'}
            {course.lecturer_email ? ` (${course.lecturer_email})` : ''}
          </Text>
        </Text>

        {isAssigning ? (
          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitle}>Select lecturer</Text>
            <ScrollView style={styles.selectorList}>
              {lecturers.map((lecturer) => {
                const selected = selectedLecturerId === lecturer.id;
                const disabledOption =
                  lecturer.remaining_capacity !== undefined &&
                  lecturer.remaining_capacity <= 0 &&
                  lecturer.id !== course.lecturer_id;
                return (
                  <TouchableOpacity
                    key={lecturer.id}
                    style={[styles.selectorItem, selected && styles.selectorItemSelected]}
                    disabled={disabledOption}
                    onPress={() => setSelectedLecturerId(lecturer.id)}
                  >
                    <Text
                      style={[styles.selectorText, selected && styles.selectorTextSelected]}
                    >
                      {lecturer.display_name || lecturer.username}
                      {disabledOption ? ' (limit reached)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.selectorActions}>
              <VoiceButton
                label='Cancel'
                onPress={cancelAssigning}
                isActive={!actionLoading}
                accessibilityHint='Dismiss lecturer selection'
              />
              <VoiceButton
                label={actionLoading ? 'Saving...' : 'Assign lecturer'}
                onPress={handleAssignLecturer}
                isActive={!actionLoading}
                accessibilityHint='Assign selected lecturer to this course'
              />
            </View>
          </View>
        ) : (
          <VoiceButton
            label='Assign / change lecturer'
            accessibilityHint='Assign a lecturer to this course'
            onPress={() => startAssigning(course)}
          />
        )}

        <View style={styles.studentSection}>
          <Text style={styles.sectionSubtitle}>Students</Text>
          {courseStudents.length ? (
            <View style={styles.studentList}>
              {courseStudents.map((student) => (
                <View key={student.id} style={styles.studentRow}>
                  <Text style={styles.studentName}>
                    {student.display_name || student.username}
                  </Text>
                  <Text style={styles.studentMeta}>{student.username}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>No students enrolled yet.</Text>
          )}
        </View>

        {isManaging ? (
          <View style={styles.selectorCard}>
            <Text style={styles.selectorTitle}>Select students</Text>
            <ScrollView style={styles.selectorList}>
              {availableStudents.map((student) => {
                const selected = selectedStudentIds.includes(student.id);
                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[styles.selectorItem, selected && styles.selectorItemSelected]}
                    onPress={() => toggleStudentSelection(student.id)}
                  >
                    <Text
                      style={[styles.selectorText, selected && styles.selectorTextSelected]}
                    >
                      {student.display_name || student.username}
                    </Text>
                    {student.course_codes.length ? (
                      <Text style={styles.selectorMeta}>
                        Courses: {student.course_codes.join(', ')}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.selectorActions}>
              <VoiceButton
                label='Cancel'
                onPress={cancelManagingStudents}
                isActive={!actionLoading}
                accessibilityHint='Dismiss student selection'
              />
              <VoiceButton
                label={actionLoading ? 'Saving...' : 'Save students'}
                onPress={handleSaveStudents}
                isActive={!actionLoading}
                accessibilityHint='Enroll selected students in this course'
              />
            </View>
          </View>
        ) : (
          <VoiceButton
            label='Manage students'
            onPress={() => startManagingStudents(course)}
            accessibilityHint='Add or remove students from this course'
          />
        )}
      </View>
    );
  };

  const availableStudentsForNewCourse = useMemo(() => students, [students]);

  const newCourseLecturerName = useMemo(() => {
    if (!newCourseForm.lecturerId) {
      return 'Tap to select lecturer';
    }
    const lecturer = lecturers.find((l) => l.id === newCourseForm.lecturerId);
    return lecturer ? lecturer.display_name || lecturer.username : 'Tap to select lecturer';
  }, [lecturers, newCourseForm.lecturerId]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Department Course Management</Text>
          <VoiceButton
            label='Refresh'
            onPress={() => selectedDeptId && loadDepartmentData(selectedDeptId)}
            accessibilityHint='Reload data for this department'
          />
        </View>

        {departments.length > 0 ? renderDepartmentPills() : null}

        <View style={styles.searchCard}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search lecturers, courses, or students'
            style={styles.searchInput}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={palette.primary} /> : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lecturers</Text>
        </View>
        {filteredLecturers.length ? (
          filteredLecturers.map(renderLecturerCard)
        ) : (
          <Text style={styles.helper}>
            {departments.length ? 'No lecturers found for this department yet.' : 'No data available.'}
          </Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Courses</Text>
          <VoiceButton
            label={creatingCourse ? 'Close form' : 'Add course'}
            onPress={toggleCreateCourse}
            accessibilityHint='Create a new course for this department'
          />
        </View>

        {creatingCourse ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>New course details</Text>
            <TextInput
              value={newCourseForm.code}
              onChangeText={(text) => setNewCourseForm((prev) => ({ ...prev, code: text }))}
              placeholder='Course code (e.g., TTM201)'
              style={styles.input}
              autoCapitalize='characters'
            />
            <TextInput
              value={newCourseForm.name}
              onChangeText={(text) => setNewCourseForm((prev) => ({ ...prev, name: text }))}
              placeholder='Course name'
              style={styles.input}
            />
            <TextInput
              value={newCourseForm.description}
              onChangeText={(text) => setNewCourseForm((prev) => ({ ...prev, description: text }))}
              placeholder='Short description (optional)'
              style={[styles.input, styles.multilineInput]}
              multiline
            />
            <TouchableOpacity
              style={styles.selectorToggle}
              onPress={() => setShowNewCourseLecturerPicker((prev) => !prev)}
            >
              <Text style={styles.selectorToggleLabel}>
                {newCourseForm.lecturerId
                  ? `Lecturer: ${newCourseLecturerName}`
                  : 'Tap to select lecturer'}
              </Text>
            </TouchableOpacity>
            {showNewCourseLecturerPicker ? (
              <View style={styles.selectorCard}>
                <Text style={styles.selectorTitle}>Choose lecturer</Text>
                <ScrollView style={styles.selectorList}>
                  {lecturers.map((lecturer) => {
                    const selected = newCourseForm.lecturerId === lecturer.id;
                    const disabledOption =
                      lecturer.remaining_capacity !== undefined &&
                      lecturer.remaining_capacity <= 0 &&
                      lecturer.id !== newCourseForm.lecturerId;
                    return (
                      <TouchableOpacity
                        key={lecturer.id}
                        style={[styles.selectorItem, selected && styles.selectorItemSelected]}
                        disabled={disabledOption}
                        onPress={() =>
                          setNewCourseForm((prev) => ({
                            ...prev,
                            lecturerId: lecturer.id,
                          }))
                        }
                      >
                        <Text
                          style={[styles.selectorText, selected && styles.selectorTextSelected]}
                        >
                          {lecturer.display_name || lecturer.username}
                          {disabledOption ? ' (limit reached)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                <View style={styles.selectorActions}>
                  <VoiceButton
                    label='Clear'
                    onPress={() =>
                      setNewCourseForm((prev) => ({
                        ...prev,
                        lecturerId: null,
                      }))
                    }
                    accessibilityHint='Remove selected lecturer'
                  />
                  <VoiceButton
                    label='Done selecting'
                    onPress={() => setShowNewCourseLecturerPicker(false)}
                    accessibilityHint='Collapse lecturer choices'
                  />
                </View>
              </View>
            ) : null}
            <View style={styles.selectorCard}>
              <Text style={styles.selectorTitle}>Student starters (optional)</Text>
              <ScrollView style={styles.selectorList}>
                {availableStudentsForNewCourse.map((student) => {
                  const selected = newCourseForm.studentIds.includes(student.id);
                  return (
                    <TouchableOpacity
                      key={student.id}
                      style={[styles.selectorItem, selected && styles.selectorItemSelected]}
                      onPress={() => toggleNewCourseStudent(student.id)}
                    >
                      <Text
                        style={[styles.selectorText, selected && styles.selectorTextSelected]}
                      >
                        {student.display_name || student.username}
                      </Text>
                      {student.course_codes.length ? (
                        <Text style={styles.selectorMeta}>
                          Current: {student.course_codes.join(', ')}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <VoiceButton
              label={actionLoading ? 'Creating...' : 'Create course'}
              onPress={handleCreateCourse}
              isActive={!actionLoading}
              accessibilityHint='Create the new course with the provided details'
            />
          </View>
        ) : null}

        {filteredCourses.length ? (
          filteredCourses.map(renderCourseCard)
        ) : (
          <Text style={styles.helper}>
            {departments.length
              ? 'No courses found for this department yet.'
              : 'No department selected.'}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scroll: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.headingXL,
    color: palette.textPrimary,
  },
  searchCard: {
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: spacing.lg,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: palette.disabled,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
  },
  deptRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  deptPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.disabled,
  },
  deptPillActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  deptPillText: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  deptPillTextActive: {
    color: palette.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingL,
    color: palette.textPrimary,
  },
  sectionSubtitle: {
    ...typography.headingM,
    color: palette.textPrimary,
    marginBottom: spacing.sm,
  },
  error: {
    ...typography.body,
    color: palette.danger,
  },
  helper: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  lecturerCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.lg,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  lecturerInfo: {
    gap: spacing.xs,
  },
  lecturerName: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  lecturerEmail: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  lecturerCourses: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  lecturerBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  badgeChip: {
    backgroundColor: '#E5EDFF',
    color: palette.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.md,
    ...typography.helper,
  },
  courseCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.lg,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  courseStatus: {
    ...typography.helper,
    color: palette.primary,
  },
  courseMeta: {
    ...typography.body,
    color: palette.textSecondary,
  },
  courseMetaValue: {
    color: palette.textPrimary,
    fontWeight: '600',
  },
  studentSection: {
    gap: spacing.sm,
  },
  studentList: {
    gap: spacing.xs,
  },
  studentRow: {
    backgroundColor: '#F4F6FA',
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  studentName: {
    ...typography.body,
    color: palette.textPrimary,
  },
  studentMeta: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  selectorCard: {
    backgroundColor: '#F9FAFF',
    borderRadius: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  selectorTitle: {
    ...typography.helper,
    color: palette.primary,
  },
  selectorList: {
    maxHeight: 180,
  },
  selectorItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.md,
    borderWidth: 1,
    borderColor: palette.disabled,
    marginBottom: spacing.xs,
  },
  selectorItemSelected: {
    borderColor: palette.primary,
    backgroundColor: '#E8EDFF',
  },
  selectorText: {
    ...typography.body,
    color: palette.textPrimary,
  },
  selectorTextSelected: {
    color: palette.primary,
    fontWeight: '600',
  },
  selectorMeta: {
    ...typography.helper,
    color: palette.textSecondary,
    marginTop: spacing.xs / 2,
  },
  selectorActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  formCard: {
    backgroundColor: palette.surface,
    borderRadius: spacing.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: palette.disabled,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  selectorToggle: {
    borderWidth: 1,
    borderColor: palette.disabled,
    borderRadius: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
  },
  selectorToggleLabel: {
    ...typography.body,
    color: palette.textSecondary,
  },
});

export default LecturerManagementScreen;
