import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { VoiceButton } from '@components/index';
import { palette, spacing, typography } from '@theme/index';
import { fetchDashboardData } from '@services/hodApi';
import { useAuth } from '@context/AuthContext';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DepartmentData[]>([]);

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

      {dashboardData.map((data) => (
        <View key={data.department.id} style={styles.departmentSection}>
          <Text style={styles.departmentTitle}>{data.department.name}</Text>

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

          {/* Recent Courses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Courses</Text>
            {data.recent_courses.map((course) => (
              <View key={course.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{course.name}</Text>
                <Text style={styles.itemSubtitle}>
                  {course.code} | {course.lecturer_name || 'Unassigned'}
                </Text>
                <Text style={styles.itemStatus}>{course.status}</Text>
              </View>
            ))}
          </View>

          {/* Recent Lecturers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Lecturers</Text>
            {data.recent_lecturers.map((lecturer) => (
              <View key={lecturer.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{lecturer.display_name}</Text>
                <Text style={styles.itemSubtitle}>{lecturer.email}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  itemStatus: {
    ...typography.helper,
    color: palette.primary,
    marginTop: spacing.xs,
  },
});
