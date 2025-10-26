import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { GreetingHeader, VoiceButton, AlertBanner } from "@components/index";
import { palette, spacing, typography } from "@theme/index";
import { useAuth } from "@context/AuthContext";
import type { Role } from "@app-types/roles";
import {
  createParentLink,
  createProvisionRequest,
  fetchCourses,
  fetchParentLinks,
  fetchProvisionRequests,
  fetchUsers,
  quickEnrollStudent,
  type ApiCourse,
  type ApiParentLink,
  type ApiProvisionRequest,
  type ApiUser,
  type ProvisionRequestPayload,
  type QuickEnrollPayload,
} from "@services/api";

type EnrollableRole = Extract<Role, "student" | "parent">;

type EnrollFormState = {
  role: EnrollableRole;
  username: string;
  display_name: string;
  email: string;
};

type LinkFormState = {
  parentUsername: string;
  studentUsername: string;
  relationship: string;
};

const initialEnrollState: EnrollFormState = {
  role: "student",
  username: "",
  display_name: "",
  email: "",
};

const initialLinkState: LinkFormState = {
  parentUsername: "",
  studentUsername: "",
  relationship: "",
};

export const RecordsEnrollmentScreen: React.FC = () => {
  const { state } = useAuth();
  const token = state.accessToken;
  const [enrollForm, setEnrollForm] = useState<EnrollFormState>(initialEnrollState);
  const [linkForm, setLinkForm] = useState<LinkFormState>(initialLinkState);
  const [recordsPasscode, setRecordsPasscode] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [links, setLinks] = useState<ApiParentLink[]>([]);
  const [requests, setRequests] = useState<ApiProvisionRequest[]>([]);
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [linking, setLinking] = useState(false);
  const [loadingLists, setLoadingLists] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [rosterForm, setRosterForm] = useState({ studentUsername: "", courseCode: "" });
  const [rostering, setRostering] = useState(false);

  const parents = useMemo(() => users.filter((user) => user.role === "parent"), [users]);
  const students = useMemo(() => users.filter((user) => user.role === "student"), [users]);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingLists(true);
      const data = await fetchUsers(token);
      setUsers(data);
    } catch (error: any) {
      console.warn("Failed to fetch users", error);
      Alert.alert("Unable to load users", error?.message ?? "Check your connection and try again.");
    } finally {
      setLoadingLists(false);
    }
  }, [token]);

  const loadLinks = useCallback(async () => {
    if (!token) return;
    try {
      const data = await fetchParentLinks(token);
      setLinks(data);
    } catch (error: any) {
      console.warn("Failed to fetch parent links", error);
      Alert.alert("Unable to load parent links", error?.message ?? "Please try again.");
    }
  }, [token]);

  const loadRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingRequests(true);
      const data = await fetchProvisionRequests(token);
      setRequests(data);
    } catch (error: any) {
      console.warn("Failed to fetch provision requests", error);
      Alert.alert("Unable to load requests", error?.message ?? "Please try again.");
    } finally {
      setLoadingRequests(false);
    }
  }, [token]);

  const loadCourses = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingCourses(true);
      const data = await fetchCourses(token);
      setCourses(data);
    } catch (error: any) {
      console.warn("Failed to fetch courses", error);
      Alert.alert("Unable to load courses", error?.message ?? "Please refresh.");
    } finally {
      setLoadingCourses(false);
    }
  }, [token]);

  const refreshUserLists = useCallback(() => {
    loadUsers();
    loadLinks();
  }, [loadLinks, loadUsers]);

  useEffect(() => {
    loadUsers();
    loadLinks();
    loadRequests();
    loadCourses();
  }, [loadUsers, loadLinks, loadRequests, loadCourses]);

  const handleCreateRequest = async () => {
    if (!token) {
      Alert.alert("Not authenticated", "Please login again.");
      return;
    }
    const passcode = recordsPasscode.trim();
    if (!passcode) {
      Alert.alert("Approval needed", "Enter the records approval passcode before submitting.");
      return;
    }
    if (!enrollForm.username.trim()) {
      Alert.alert("Missing info", "Username is required.");
      return;
    }
    try {
      setCreatingRequest(true);
      const payload: ProvisionRequestPayload = {
        username: enrollForm.username.trim().toLowerCase(),
        role: enrollForm.role,
      };
      if (enrollForm.display_name.trim()) {
        payload.display_name = enrollForm.display_name.trim();
      }
      if (enrollForm.email.trim()) {
        payload.email = enrollForm.email.trim();
      }
      payload.records_passcode = passcode;
      await createProvisionRequest(token, payload);
      Alert.alert(
        "Request submitted",
        "An administrator will review this request and share the temporary password once approved."
      );
      setEnrollForm((prev) => ({ ...initialEnrollState, role: prev.role }));
      await loadRequests();
    } catch (error: any) {
      console.warn("Failed to submit provision request", error);
      Alert.alert("Request failed", error?.message ?? "Unable to send the request.");
    } finally {
      setCreatingRequest(false);
    }
  };

  const handleCreateLink = async () => {
    if (!token) {
      Alert.alert("Not authenticated", "Please login again.");
      return;
    }
    const passcode = recordsPasscode.trim();
    if (!passcode) {
      Alert.alert("Approval needed", "Enter the records approval passcode before linking.");
      return;
    }
    const parent = parents.find((user) => user.username.toLowerCase() === linkForm.parentUsername.trim().toLowerCase());
    const student = students.find((user) => user.username.toLowerCase() === linkForm.studentUsername.trim().toLowerCase());
    if (!parent || !student) {
      Alert.alert("Invalid usernames", "Double-check the parent and student usernames.");
      return;
    }
    try {
      setLinking(true);
      await createParentLink(token, {
        parent: parent.id,
        student: student.id,
        relationship: linkForm.relationship.trim() || undefined,
        records_passcode: passcode,
      });
      Alert.alert("Linked", `${parent.display_name || parent.username} is now linked to ${student.display_name || student.username}.`);
      setLinkForm(initialLinkState);
      await loadLinks();
    } catch (error: any) {
      console.warn("Failed to create parent link", error);
      Alert.alert("Link failed", error?.message ?? "Unable to create the parent/student link.");
    } finally {
      setLinking(false);
    }
  };

  const recentLinks = links.slice(0, 5);
  const recentRequests = requests.slice(0, 5);

  const handleRosterEnroll = async () => {
    if (!token) {
      Alert.alert("Not authenticated", "Please login again.");
      return;
    }
    const studentUsername = rosterForm.studentUsername.trim().toLowerCase();
    const courseCode = rosterForm.courseCode.trim().toUpperCase();
    if (!studentUsername || !courseCode) {
      Alert.alert("Missing info", "Student username and course code are required.");
      return;
    }
    try {
      setRostering(true);
      const payload: QuickEnrollPayload = {
        student_username: studentUsername,
        course_code: courseCode,
      };
      await quickEnrollStudent(token, payload);
      Alert.alert("Enrolled", "Student has been added to the course.");
      setRosterForm({ studentUsername: "", courseCode: "" });
    } catch (error: any) {
      console.warn("Quick enrollment failed", error);
      Alert.alert("Enrollment failed", error?.message ?? "Unable to enroll the student.");
    } finally {
      setRostering(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GreetingHeader name="Student Onboarding" />
      <AlertBanner message="Provision parent & student accounts, then link them for portal access." variant="info" />
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Records approval passcode</Text>
        <Text style={styles.cardSubtitle}>Required before you submit requests or link families.</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter passcode"
          value={recordsPasscode}
          onChangeText={setRecordsPasscode}
          autoCapitalize="none"
          secureTextEntry
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create account</Text>
        <Text style={styles.cardSubtitle}>Start with a student, then add their parent/guardian.</Text>
        <View style={styles.roleRow}>
          <VoiceButton
            label="Student"
            onPress={() => setEnrollForm((prev) => ({ ...prev, role: "student" }))}
            isActive={enrollForm.role === "student"}
          />
          <VoiceButton
            label="Parent"
            onPress={() => setEnrollForm((prev) => ({ ...prev, role: "parent" }))}
            isActive={enrollForm.role === "parent"}
          />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={enrollForm.username}
          autoCapitalize="none"
          onChangeText={(text) => setEnrollForm((prev) => ({ ...prev, username: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Display name (optional)"
          value={enrollForm.display_name}
          onChangeText={(text) => setEnrollForm((prev) => ({ ...prev, display_name: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Email (optional)"
          value={enrollForm.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(text) => setEnrollForm((prev) => ({ ...prev, email: text }))}
        />
        <VoiceButton
          label={creatingRequest ? "Submitting..." : "Submit for approval"}
          onPress={creatingRequest ? undefined : handleCreateRequest}
          accessibilityHint="Send the provisioning request for approval"
        />
        <Text style={styles.metaText}>
          Tip: Once the request is approved, you will receive the temporary password to share with the family.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Provision request history</Text>
        {loadingRequests ? (
          <ActivityIndicator color={palette.primary} />
        ) : recentRequests.length ? (
          recentRequests.map((request) => (
            <View key={request.id} style={styles.linkRow}>
              <Text style={styles.linkPrimary}>
                {request.username} - {request.role}
              </Text>
              <Text style={styles.linkSecondary}>
                Status: {request.status}
                {request.created_user_detail ? `  ${request.created_user_detail.display_name || request.created_user_detail.username}` : ""}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.metaText}>Requests will appear here once submitted.</Text>
        )}
        <VoiceButton label="Refresh requests" onPress={loadRequests} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Link parent to student</Text>
        <Text style={styles.cardSubtitle}>Use usernames exactly as created above. Approval passcode is required.</Text>
        <TextInput
          style={styles.input}
          placeholder="Parent username"
          value={linkForm.parentUsername}
          autoCapitalize="none"
          onChangeText={(text) => setLinkForm((prev) => ({ ...prev, parentUsername: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Student username"
          value={linkForm.studentUsername}
          autoCapitalize="none"
          onChangeText={(text) => setLinkForm((prev) => ({ ...prev, studentUsername: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Relationship (optional)"
          value={linkForm.relationship}
          onChangeText={(text) => setLinkForm((prev) => ({ ...prev, relationship: text }))}
        />
        <VoiceButton
          label={linking ? "Linking..." : "Link accounts"}
          onPress={linking ? undefined : handleCreateLink}
          accessibilityHint="Create a parent-student relationship"
        />
        <VoiceButton label={loadingLists ? "Refreshing..." : "Refresh lists"} onPress={refreshUserLists} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent links</Text>
        {recentLinks.length ? (
          recentLinks.map((link) => (
            <View key={link.id} style={styles.linkRow}>
              <Text style={styles.linkPrimary}>
                {link.student_detail.display_name || link.student_detail.username}
              </Text>
              <Text style={styles.linkSecondary}>
                Parent: {link.parent_detail.display_name || link.parent_detail.username}
                {link.relationship ? ` (${link.relationship})` : ""}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.metaText}>Linked families will appear here.</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Assign student to course</Text>
        <Text style={styles.cardSubtitle}>Use approved student usernames and course codes.</Text>
        <TextInput
          style={styles.input}
          placeholder="Student username"
          value={rosterForm.studentUsername}
          autoCapitalize="none"
          onChangeText={(text) => setRosterForm((prev) => ({ ...prev, studentUsername: text }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Course code (e.g., TTM101)"
          value={rosterForm.courseCode}
          autoCapitalize="characters"
          onChangeText={(text) => setRosterForm((prev) => ({ ...prev, courseCode: text }))}
        />
        {loadingCourses ? (
          <Text style={styles.helperText}>Loading course list</Text>
        ) : (
          <Text style={styles.helperText}>
            Available courses:{" "}
            {courses.slice(0, 3).map((course) => course.code).join(", ") || "none loaded"}
          </Text>
        )}
        <VoiceButton
          label={rostering ? "Assigning..." : "Assign course"}
          onPress={rostering ? undefined : handleRosterEnroll}
          accessibilityHint="Enroll the student into the selected course"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: palette.background,
    gap: spacing.lg,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    ...typography.headingM,
    color: palette.textPrimary,
  },
  cardSubtitle: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  roleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  input: {
    borderWidth: 1,
    borderColor: palette.disabled,
    borderRadius: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
  },
  metaText: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  helperText: {
    ...typography.helper,
    color: palette.textSecondary,
  },
  linkRow: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: palette.disabled,
  },
  linkPrimary: {
    ...typography.body,
    color: palette.textPrimary,
  },
  linkSecondary: {
    ...typography.helper,
    color: palette.textSecondary,
  },
});
