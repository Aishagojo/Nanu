import React, { useEffect, useState } from "react";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  RoleSelectionScreen,
  LoginScreen,
  StudentDashboardScreen,
  ParentDashboardScreen,
  LecturerDashboardScreen,
  HodDashboardScreen,
  FinanceDashboardScreen,
  RecordsDashboardScreen,
  AdminDashboardScreen,
  FeatureScreen,
  SearchScreen,
  ProfileScreen,
  ForcePasswordChangeScreen,
  PasswordResetConfirmScreen,
  StudentTimetableScreen,
  StudentAssignmentsScreen,
  StudentCommunicateScreen,
  StudentHelpScreen,
  StudentLibraryScreen,
  LecturerClassesScreen,
  LecturerAssignmentsScreen,
  LecturerMessagesScreen,
  LecturerRecordsScreen,
  LecturerTimetableScreen,
  ParentProgressScreen,
  ParentFeesScreen,
  ParentMessagesScreen,
  ParentTimetableScreen,
  ParentAnnouncementsScreen,
  HodAssignmentsScreen,
  HodTimetableScreen,
  HodPerformanceScreen,
  HodCommunicationsScreen,
  HodReportsScreen,
  RecordsExamsScreen,
  RecordsTranscriptsScreen,
  RecordsProgressScreen,
  RecordsVerificationsScreen,
  RecordsReportsScreen,
  AdminUsersScreen,
  AdminSystemsScreen,
  AdminAnalyticsScreen,
  AdminThemeScreen,
  AdminAuditScreen,
  FinanceOverviewScreen,
  FinanceStudentsScreen,
  FinanceInvoicesScreen,
  FinanceAlertsScreen,
  FinanceSettingsScreen,
  RewardsScreen,
} from "@screens/index";
import { useAuth } from "@context/AuthContext";
import type { Role } from "@app-types/roles";
import { FeatureDescriptor } from "@data/featureCatalog";

export type RootStackParamList = {
  RoleSelection: undefined;
  Login: { role: Role };
  Dashboard: { role: Role };
  Feature: { role: Role; feature: FeatureDescriptor };
  Search: undefined;
  Profile: undefined;
  ForcePasswordChange: undefined;
  PasswordResetConfirm: undefined;
  StudentTimetable: undefined;
  StudentAssignments: undefined;
  StudentCommunicate: undefined;
  StudentHelp: undefined;
  StudentLibrary: undefined;
  LecturerClasses: undefined;
  LecturerAssignments: undefined;
  LecturerMessages: undefined;
  LecturerRecords: undefined;
  LecturerTimetable: undefined;
  FinanceOverview: undefined;
  FinanceStudents: undefined;
  FinanceInvoices: undefined;
  FinanceAlerts: undefined;
  FinanceSettings: undefined;
  ParentProgress: undefined;
  ParentFees: undefined;
  ParentMessages: undefined;
  ParentTimetable: undefined;
  ParentAnnouncements: undefined;
  HodAssignments: undefined;
  HodTimetable: undefined;
  HodPerformance: undefined;
  HodCommunications: undefined;
  HodReports: undefined;
  RecordsExams: undefined;
  RecordsTranscripts: undefined;
  RecordsProgress: undefined;
  RecordsVerifications: undefined;
  RecordsReports: undefined;
  AdminUsers: undefined;
  AdminSystems: undefined;
  AdminAnalytics: undefined;
  AdminTheme: undefined;
  AdminAudit: undefined;
  Rewards: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const getDashboardComponent = (role: Role) => {
  switch (role) {
    case "student":
      return StudentDashboardScreen;
    case "parent":
      return ParentDashboardScreen;
    case "lecturer":
      return LecturerDashboardScreen;
    case "hod":
      return HodDashboardScreen;
    case "finance":
      return FinanceDashboardScreen;
    case "records":
      return RecordsDashboardScreen;
    case "admin":
    default:
      return AdminDashboardScreen;
  }
};

export const AppNavigator = () => {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { isAuthenticated, state } = useAuth();
  const [navReady, setNavReady] = useState(false);

  useEffect(() => {
    if (!navReady) return;
    const user = state.user;
    if (isAuthenticated && user) {
      if (user.must_change_password) {
        navigationRef.reset({ index: 0, routes: [{ name: "ForcePasswordChange" }] });
      } else {
        navigationRef.reset({ index: 0, routes: [{ name: "Dashboard", params: { role: user.role } }] });
      }
    } else {
      navigationRef.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
    }
  }, [isAuthenticated, state.user, navReady, navigationRef]);

  return (
    <NavigationContainer ref={navigationRef} onReady={() => setNavReady(true)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RoleSelection">
          {({ navigation }) => (
            <RoleSelectionScreen onSelectRole={(role) => navigation.navigate("Login", { role })} />
          )}
        </Stack.Screen>
        <Stack.Screen name="Login">
          {({ route }) => <LoginScreen role={route.params.role} />}
        </Stack.Screen>
        <Stack.Screen name="Dashboard">
          {({ route }) => {
            const Component = getDashboardComponent(route.params.role);
            return <Component />;
          }}
        </Stack.Screen>
        <Stack.Screen name="Feature" component={FeatureScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} />
        <Stack.Screen name="PasswordResetConfirm" component={PasswordResetConfirmScreen} />
        <Stack.Screen name="StudentTimetable" component={StudentTimetableScreen} />
        <Stack.Screen name="StudentAssignments" component={StudentAssignmentsScreen} />
        <Stack.Screen name="StudentCommunicate" component={StudentCommunicateScreen} />
        <Stack.Screen name="StudentHelp" component={StudentHelpScreen} />
        <Stack.Screen name="StudentLibrary" component={StudentLibraryScreen} />
        <Stack.Screen name="LecturerClasses" component={LecturerClassesScreen} />
        <Stack.Screen name="LecturerAssignments" component={LecturerAssignmentsScreen} />
        <Stack.Screen name="LecturerMessages" component={LecturerMessagesScreen} />
        <Stack.Screen name="LecturerRecords" component={LecturerRecordsScreen} />
        <Stack.Screen name="LecturerTimetable" component={LecturerTimetableScreen} />
        <Stack.Screen name="FinanceOverview" component={FinanceOverviewScreen} />
        <Stack.Screen name="FinanceStudents" component={FinanceStudentsScreen} />
        <Stack.Screen name="FinanceInvoices" component={FinanceInvoicesScreen} />
        <Stack.Screen name="FinanceAlerts" component={FinanceAlertsScreen} />
        <Stack.Screen name="FinanceSettings" component={FinanceSettingsScreen} />
        <Stack.Screen name="ParentProgress" component={ParentProgressScreen} />
        <Stack.Screen name="ParentFees" component={ParentFeesScreen} />
        <Stack.Screen name="ParentMessages" component={ParentMessagesScreen} />
        <Stack.Screen name="ParentTimetable" component={ParentTimetableScreen} />
        <Stack.Screen name="ParentAnnouncements" component={ParentAnnouncementsScreen} />
        <Stack.Screen name="HodAssignments" component={HodAssignmentsScreen} />
        <Stack.Screen name="HodTimetable" component={HodTimetableScreen} />
        <Stack.Screen name="HodPerformance" component={HodPerformanceScreen} />
        <Stack.Screen name="HodCommunications" component={HodCommunicationsScreen} />
        <Stack.Screen name="HodReports" component={HodReportsScreen} />
        <Stack.Screen name="RecordsExams" component={RecordsExamsScreen} />
        <Stack.Screen name="RecordsTranscripts" component={RecordsTranscriptsScreen} />
        <Stack.Screen name="RecordsProgress" component={RecordsProgressScreen} />
        <Stack.Screen name="RecordsVerifications" component={RecordsVerificationsScreen} />
        <Stack.Screen name="RecordsReports" component={RecordsReportsScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="AdminSystems" component={AdminSystemsScreen} />
        <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} />
        <Stack.Screen name="AdminTheme" component={AdminThemeScreen} />
        <Stack.Screen name="AdminAudit" component={AdminAuditScreen} />
        <Stack.Screen name="Rewards" component={RewardsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
