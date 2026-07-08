/**
 * Fix4Ever Customer App
 * Onboarding → Home with Login/Signup (menubar + footer).
 * Auth state restored from storage on load.
 * @format
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from './src/core/theme';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  hasCompletedOnboarding,
  setOnboardingCompleted,
  getStoredUser,
  setAuth,
  clearAuth,
} from './src/core/storage';
import { logout as apiLogout } from './src/core/api';
import type { User } from './src/core/api';
import { OnboardingScreen } from './src/features/onboarding';
import { HomeScreen } from './src/features/home';
import { NotificationsScreen } from './src/features/notifications';
import TermsAndPoliciesScreen from './src/features/policies/TermsAndPoliciesScreen';

import { AppBar, MobileFooter, FloatingDraftsCounter } from './src/core/components';
import type { FooterTabId } from './src/core/components/MobileFooter';
import TabNavigator from './src/navigation/TabNavigator';
import { AuthProvider, useAuth } from './src/lib/contexts/auth-context';

type MainScreen =
  | 'home'
  | 'login'
  | 'signup'
  | 'account'
  | 'reset-password'
  | 'google-oauth';

function AppContent() {
  const { isDark, colors } = useTheme();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null
  );
  // const [user, setUser] = useState<User | null>(null);
  const { isLoadingUser, user, setUser } = useAuth();
  const [screen, setScreen] = useState<MainScreen>('home');
  const [footerTab, setFooterTab] = useState<FooterTabId>('overview');

  useEffect(() => {
    let mounted = true;
    hasCompletedOnboarding().then(completed => {
      if (mounted) setHasSeenOnboarding(completed);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasSeenOnboarding) return;
    let mounted = true;
    getStoredUser().then(stored => {
      if (mounted && stored) setUser(stored);
    });
    return () => {
      mounted = false;
    };
  }, [hasSeenOnboarding]);

  const handleOnboardingComplete = async () => {
    await setOnboardingCompleted();
    setHasSeenOnboarding(true);
  };

  const handleLoginSuccess = async (token: string, newUser: User) => {
    await setAuth(token, newUser);
    setUser(newUser);
    setScreen('home');
  };

  const handleLogout = () => {
    apiLogout().catch(() => {});
    clearAuth();
    setUser(null);
    setScreen('home');
  };

  const handleFooterTab = (tab: MainScreen) => {
    // Footer currently controls high-level sections; keep auth screens independent.
    // We still allow navigating to "home" from the footer for convenience.
    if (tab === 'home') {
      setScreen('home');
    }
  };

  if (hasSeenOnboarding === null) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!hasSeenOnboarding) {
    return (
      <>
        <StatusBar
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
        />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  console.log(user);
  const isLoggedIn = !!user;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
      />
      <View style={[styles.main, { backgroundColor: colors.background }]}>
        <AppBar
          isLoggedIn={isLoggedIn}
          onLoginPress={() => setScreen('login')}
          onSignupPress={() => setScreen('signup')}
          onProfilePress={() => setScreen('account')}
          onNotificationsPress={() =>
            Alert.alert(
              'Notifications',
              'Please login to view notifications.'
            )
          }
          onLogoutPress={handleLogout}
          onOpenTerms={() =>
            Alert.alert(
              'Terms & policies',
              'Link to detailed terms and privacy policy will go here.'
            )
          }
        />
       
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  main: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

const Stack = createNativeStackNavigator(); 
  
function AppNavigator() {
  const { isDark, colors } = useTheme();
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(
    null
  );
  const [currentRouteName, setCurrentRouteName] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    hasCompletedOnboarding().then(completed => {
      if (mounted) setHasSeenOnboarding(completed);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: (isDark && (currentRouteName === 'Account' || currentRouteName === 'Login')) ? '#242D3B' : colors.background,
    },
  };

  return (
    <NavigationContainer 
      theme={navigationTheme}
      onStateChange={(state) => {
        if (!state) return;
        const getActiveRouteName = (routeState: any): string => {
          const route = routeState.routes[routeState.index];
          if (route.state) {
            return getActiveRouteName(route.state);
          }
          return route.name;
        };
        setCurrentRouteName(getActiveRouteName(state));
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasSeenOnboarding ? (
          <Stack.Screen name="AppContent" component={AppContent} />
        ) : (
          <Stack.Screen name="MainApp" component={TabNavigator} />
        )}
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="TermsAndPolicies" component={TermsAndPoliciesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppNavigator />
          </ThemeProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

export default App;
