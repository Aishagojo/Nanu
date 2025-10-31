import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { VoiceButton, DashboardTile } from '@components/index';
import { FloatingAssistantButton, ChatWidget } from '@components/index';
import { Ionicons } from '@expo/vector-icons';
import { requestPasswordReset } from '@services/api';
import { palette, spacing, typography } from '@theme/index';
import { useAuth } from '@context/AuthContext';
import type { Role } from '@app-types/roles';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@navigation/AppNavigator';

interface LoginScreenProps {
  role: Role;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ role }) => {
  const [showHelper, setShowHelper] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [resetRequesting, setResetRequesting] = useState(false);
  const { login, loading, biometricsAvailable, hasPendingBiometric, unlockWithBiometrics } =
    useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSubmit = async () => {
    setError(null);
    const result = await login({
      username,
      password,
      expectedRole: role,
      totpCode: totp || undefined,
    });
    if (!result.success) {
      setError(result.error || 'Invalid credentials');
      Alert.alert('Login failed', result.error ?? 'Please check your details and try again');
      return;
    }
    if (result.requiresPasswordChange) {
      Alert.alert('Action needed', 'Set a new password to continue.');
    }
  };

  const handleReset = async () => {
    if (!username) {
      Alert.alert('Add username', 'Enter the username then tap forgot password.');
      return;
    }
    try {
      setResetRequesting(true);
      const data = await requestPasswordReset({ username });
      Alert.alert(
        'Reset token',
        `A reset token has been generated. Token: ${data.token ?? 'Check admin'}`,
        [{ text: 'Use token', onPress: () => navigation.navigate('PasswordResetConfirm') }],
      );
    } catch (err: any) {
      const message = err?.message;
      if (message && message.includes('Network request failed')) {
        Alert.alert(
          'Network error',
          "Could not reach the server. Ensure the backend is running and set EXPO_PUBLIC_API_URL to your machine's IP.",
        );
      } else {
        Alert.alert('Reset failed', message ?? 'Unable to request reset');
      }
    } finally {
      setResetRequesting(false);
    }
  };

  const handleBiometric = async () => {
    const success = await unlockWithBiometrics();
    if (!success) {
      Alert.alert(
        'Authentication failed',
        'We could not verify your biometrics. Try again or sign in with password.',
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login as {role}</Text>
      <DashboardTile
        title="Use microphone to fill form"
        subtitle="Speak your username and password"
        onPress={() => {}}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Username"
      />
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, styles.inputFlex]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          accessibilityLabel="Password"
        />
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
          onPress={() => setPasswordVisible((prev) => !prev)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={passwordVisible ? 'eye' : 'eye-off'}
            size={24}
            color={palette.textSecondary}
          />
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Authenticator code (if enabled)"
        value={totp}
        onChangeText={setTotp}
        keyboardType="number-pad"
        accessibilityLabel="Authenticator code"
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {biometricsAvailable && hasPendingBiometric ? (
        <VoiceButton
          label={loading ? 'Authenticating...' : 'Unlock with biometrics'}
          onPress={handleBiometric}
          accessibilityHint="Use fingerprint or face unlock"
        />
      ) : null}
      <VoiceButton
        label={loading ? 'Signing in...' : 'Login'}
        onPress={handleSubmit}
        accessibilityHint="Double tap to submit login"
      />
      <VoiceButton
        label={resetRequesting ? 'Requesting...' : 'Forgot password'}
        onPress={handleReset}
        accessibilityHint="Request a password reset token"
      />
      <VoiceButton
        label="Have a token?"
        onPress={() => navigation.navigate('PasswordResetConfirm')}
      />
      <VoiceButton
        label="Switch Role"
        onPress={() => navigation.goBack()}
        accessibilityHint="Go back to role selection"
      />
      {loading ? <ActivityIndicator color={palette.primary} /> : null}
      <FloatingAssistantButton onPress={() => setShowHelper((s) => !s)} />
      {showHelper ? (
        <ChatWidget
          onClose={() => setShowHelper(false)}
          onNavigateRole={(nextRole) => {
            setShowHelper(false);
            navigation.replace('Login', { role: nextRole });
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.headingL,
    color: palette.textPrimary,
  },
  input: {
    height: 56,
    borderRadius: 16,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: palette.disabled,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.disabled,
  },
  inputFlex: {
    flex: 1,
    borderWidth: 0,
  },
  eyeButton: {
    paddingHorizontal: spacing.md,
  },
  errorText: {
    ...typography.helper,
    color: palette.danger,
  },
});
