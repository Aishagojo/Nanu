import React from "react";
import { StatusBar, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AppNavigator } from "@navigation/AppNavigator";
import { palette } from "@theme/index";
import { AuthProvider } from "@context/AuthContext";
import { NotificationProvider } from "@context/NotificationContext";
import { useHydrateMe } from "@hooks/useHydration";
import { useRegisterDevice } from "@hooks/useRegisterDevice";

const queryClient = new QueryClient();

const HydrationBootstrapper = () => {
  const { data: me } = useHydrateMe();
  useRegisterDevice(!!me?.id);
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <AuthProvider>
            <NotificationProvider>
              <HydrationBootstrapper />
              <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
              <SafeAreaView style={styles.safeArea}>
                <KeyboardAvoidingView
                  style={styles.keyboardWrapper}
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                  keyboardVerticalOffset={Platform.OS === "ios" ? 16 : 0}
                >
                  <AppNavigator />
                </KeyboardAvoidingView>
              </SafeAreaView>
            </NotificationProvider>
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: palette.background,
  },
  keyboardWrapper: {
    flex: 1,
  },
});

export default App;
