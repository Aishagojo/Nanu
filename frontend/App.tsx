import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { AppNavigator } from "@navigation/AppNavigator";
import { palette } from "@theme/index";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "@context/AuthContext";
import { NotificationProvider } from "@context/NotificationContext";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

const App = () => {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar barStyle="dark-content" backgroundColor={palette.background} />
            <SafeAreaView style={styles.safeArea}>
              <AppNavigator />
            </SafeAreaView>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
});

export default App;
