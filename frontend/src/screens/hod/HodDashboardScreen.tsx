import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { VoiceButton } from '@components/index';
import { palette, spacing, typography } from '@theme/index';
import {
  fetchDashboardData,
  fetchDepartmentLecturers,
  fetchDepartmentStudents,
  type Lecturer,
  type DepartmentStudent,
} from '@services/hodApi';
import { useAuth } from '@context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/AppNavigator';

type DashboardStats = {
  total_courses: number;
  active_courses: number;
  pending_courses: number;
  total_lecturers: number;
};

type DepartmentData = {
  department: {
    id: number;
    name: string;
    code: string;
  };
  statistics: DashboardStats;
  recent_courses: any[];
  recent_lecturers: any[];
};

export const HodDashboardScreen: React.FC = () => {
  const { state } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DepartmentData[]>([]);
  const [lecturerMap, setLecturerMap] = useState<Record<number, Lecturer[]>>({});
  const [studentMap, setStudentMap] = useState<Record<number, DepartmentStudent[]>>({});
  const [detailsLoading, setDetailsLoading] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchDashboardData(state.accessToken!);
      setDashboardData(data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load dashboard', err);
      setError(err?.message ?? 'Unable to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [state.accessToken]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const loadDepartmentDetails = useCallback(
    async (departmentId: number) => {
      if (!state.accessToken) {
        return;
      }
      if (lecturerMap[departmentId] && studentMap[departmentId]) {
        return;
      }
      try {
        setDetailsLoading(true);
        const [lecturers, students] = await Promise.all([
          fetchDepartmentLecturers(state.accessToken, departmentId),
          fetchDepartmentStudents(state.accessToken, departmentId),
        ]);
        setLecturerMap((prev) => ({ ...prev, [departmentId]: lecturers }));
        setStudentMap((prev) => ({ ...prev, [departmentId]: students }));
      } catch (err) {
        console.warn('Failed to load department details', err);
      } finally {
        setDetailsLoading(false);
      }
    },
    [lecturerMap, state.accessToken, studentMap],
  );

  useEffect(() => {
    dashboardData.forEach((data) => {
      loadDepartmentDetails(data.department.id);
    });
  }, [dashboardData, loadDepartmentDetails]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <VoiceButton
          label="Try Again"
          onPress={loadDashboardData}
          accessibilityHint="Reload dashboard data"
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Department Dashboard</Text>

      {dashboardData.map((data) => {
        const deptLecturers = lecturerMap[data.department.id] ?? [];
        const deptStudents = studentMap[data.department.id] ?? [];
        return (
          <View key={data.department.id} style={styles.departmentSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.departmentTitle}>{data.department.name}</Text>
              <VoiceButton
                label="Open course manager"
                onPress={() =>
                  navigation.navigate('LecturerManagement', { departmentId: data.department.id })
                }
                accessibilityHint="Open the detailed course assignment manager"
              />
            </View>

            {/* Statistics */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data.statistics.total_courses}</Text>
                <Text style={styles.statLabel}>Total Courses</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data.statistics.active_courses}</Text>
                <Text style={styles.statLabel}>Active Courses</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data.statistics.pending_courses}</Text>
                <Text style={styles.statLabel}>Pending Approval</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{data.statistics.total_lecturers}</Text>
                <Text style={styles.statLabel}>Lecturers</Text>
              </View>
            </View>

            {/* Lecturers & load */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lecturers & teaching load</Text>
              {detailsLoading && !deptLecturers.length ? (
                <ActivityIndicator color={palette.primary} />
              ) : deptLecturers.length ? (
                deptLecturers.map((lecturer) => (
                  <View key={lecturer.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>
                      {lecturer.display_name || lecturer.username}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Courses: {lecturer.course_count ?? 0} • Slots remaining:{' '}
                      {lecturer.remaining_capacity ?? 0}
                    </Text>
                    {lecturer.course_codes && lecturer.course_codes.length ? (
                      <Text style={styles.itemMeta}>
                        {lecturer.course_codes.length} codes:{' '}
                        {lecturer.course_codes.join(', ')}
                      </Text>
                    ) : (
                      <Text style={styles.itemMeta}>No courses assigned yet.</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.helper}>
                  No lecturers assigned to this department yet.
                </Text>
              )}
            </View>

            {/* Students & enrolments */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Students & enrolments</Text>
              {detailsLoading && !deptStudents.length ? (
                <ActivityIndicator color={palette.primary} />
              ) : deptStudents.length ? (
                deptStudents.map((student) => (
                  <View key={student.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>
                      {student.display_name || student.username}
                    </Text>
                    <Text style={styles.itemSubtitle}>
                      Username: {student.username}
                    </Text>
                    {student.course_codes.length ? (
                      <Text style={styles.itemMeta}>
                        Courses: {student.course_codes.join(', ')}
                      </Text>
                    ) : (
                      <Text style={styles.itemMeta}>No courses approved yet.</Text>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.helper}>No students enrolled in department courses yet.</Text>
              )}
            </View>

            {/* Recent Courses */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent courses</Text>
              {data.recent_courses.length ? (
                data.recent_courses.map((course) => (
                  <View key={course.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{course.name}</Text>
                    <Text style={styles.itemSubtitle}>
                      {course.code} | {course.lecturer_name || 'Unassigned'}
                    </Text>
                    <Text style={styles.itemStatus}>{course.status}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.helper}>No course activity tracked yet.</Text>
              )}
            </View>

            {/* Recent Lecturers */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recently added staff</Text>
              {data.recent_lecturers.length ? (
                data.recent_lecturers.map((lecturer) => (
                  <View key={lecturer.id} style={styles.listItem}>
                    <Text style={styles.itemTitle}>{lecturer.display_name}</Text>
                    <Text style={styles.itemSubtitle}>{lecturer.email}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.helper}>No new lecturer accounts created recently.</Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

type Styles = {
  container: ViewStyle;
  centered: ViewStyle;
  title: TextStyle;
  error: TextStyle;
  departmentSection: ViewStyle;
  sectionHeaderRow: ViewStyle;
  departmentTitle: TextStyle;
  statsGrid: ViewStyle;
  statCard: ViewStyle;
  statValue: TextStyle;
  statLabel: TextStyle;
  section: ViewStyle;
  sectionTitle: TextStyle;
  listItem: ViewStyle;
  itemTitle: TextStyle;
  itemSubtitle: TextStyle;
  itemMeta: TextStyle;
  itemStatus: TextStyle;
  helper: TextStyle;
};

const rawStyles: Styles = {
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: palette.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.headingXL,
    color: palette.textPrimary,
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.body,
    color: palette.danger,
    marginBottom: spacing.md,
  },
  departmentSection: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  departmentTitle: {
    ...typography.headingL,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: palette.surface,
    padding: spacing.md,
    margin: spacing.xs,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    ...typography.headingXL,
    color: palette.primary,
  },
  statLabel: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
    marginBottom: spacing.md,
  },
  listItem: {
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  itemTitle: {
    ...typography.body,
    color: palette.textPrimary,
  },
  itemSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  itemMeta: {
    ...typography.helper,
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
  itemStatus: {
    ...typography.helper,
    color: palette.primary,
    marginTop: spacing.xs,
  },
  helper: {
    ...typography.helper,
    color: palette.textSecondary,
  },
};

const styles = StyleSheet.create(rawStyles);
