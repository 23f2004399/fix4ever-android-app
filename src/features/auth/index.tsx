import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useAuth } from '../../lib/contexts/auth-context';
import { useTheme } from '../../core/theme';
import { ThemeSelector } from '../../core/components/ThemeSelector';

import type { User } from '../../core/api';

import {
  setAuth,
  clearAuth,
} from '../../core/storage';

import { LoginScreen } from './LoginScreen';
import { SignupScreen } from './SignupScreen';
import { AccountScreen } from './AccountScreen';
import { ResetPasswordScreen } from './ResetPasswordScreen';
import { GoogleOAuthScreen } from './GoogleOAuthScreen';


const Stack = createNativeStackNavigator();

function CompactHeader({ options, back, navigation: nav }: any) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, isDark } = useTheme();
  const bg = isDark ? '#242D3B' : colors.background;

  return (
    <View style={{ backgroundColor: bg, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ height: insets.top }} />
      <View style={{
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: spacing.sm,
        paddingRight: spacing.lg,
      }}>
        {back ? (
          <TouchableOpacity
            onPress={() => nav.goBack()}
            activeOpacity={0.7}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm }}
          >
            <Icon name="chevron-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
        ) : null}
        {options.title ? (
          <Text style={{ fontFamily: 'Montserrat-SemiBold', fontSize: 18, color: colors.foreground }}>
            {options.title}
          </Text>
        ) : null}
        {options.title === 'Account' ? (
          <View style={{ marginLeft: 'auto' }}>
            <ThemeSelector />
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function AuthStack({ route }: { route: { params?: { screen?: string } } }) {
    const initialScreen = route.params?.screen || 'Login';
    const { colors, isDark } = useTheme();

    const { setUser } = useAuth();

    const handleLoginSuccess = async (token: string, user: User, refreshToken?: string) => {
      await setAuth(token, user, refreshToken);
      setUser(user);
    };

    return (
        <Stack.Navigator
            initialRouteName={initialScreen}
            screenOptions={{
                header: (props) => <CompactHeader {...props} />,
                contentStyle: {
                    backgroundColor: colors.background,
                },
            }}
        >
            <Stack.Screen
                name="Login"
                options={{
                    title: 'fix4ever',
                }}
            >
                {(props) => (
                    <LoginScreen
                        onSuccess={async (token, user, refreshToken) => {
                            console.log('Login successful', { token, user });
                            await handleLoginSuccess(token, user, refreshToken);
                            props.navigation.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            });
                        }}
                        onForgotPassword={() => props.navigation.navigate('ResetPassword')}
                        onGooglePress={() => props.navigation.navigate('GoogleOAuth')}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="Signup">
                {(props) => (
                    <SignupScreen
                        onBack={() => props.navigation.goBack()}
                        onSuccess={async (token, user, refreshToken) => {
                            console.log('Signup successful', { token, user });
                            await handleLoginSuccess(token, user, refreshToken);
                            props.navigation.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            });
                        }}
                        onGooglePress={() => props.navigation.navigate('GoogleOAuth')}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen
                name="Account"
                options={{
                    title: 'Account',
                    contentStyle: {
                        backgroundColor: isDark ? '#242D3B' : colors.background,
                    },
                    navigationBarColor: isDark ? '#242D3B' : colors.background,
                }}
            >
                {(props) => (
                    <AccountScreen
                        onLogout={async () => {
                            console.log('Logout');
                            await clearAuth();
                            props.navigation.navigate('Login');
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="ResetPassword">
                {(props) => (
                    <ResetPasswordScreen
                        onBack={() => props.navigation.goBack()}
                        onSuccess={() => {
                            console.log('Password reset successful');
                            props.navigation.navigate('Login');
                        }}
                    />
                )}
            </Stack.Screen>
            <Stack.Screen name="GoogleOAuth">
                {(props) => (
                    <GoogleOAuthScreen
                        onBack={() => props.navigation.goBack()}
                        onSuccess={async (token, user) => {
                            console.log('Google OAuth successful', { token, user });
                            await handleLoginSuccess(token, user);
                            props.navigation.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            });
                        }}
                    />
                )}
            </Stack.Screen>
        </Stack.Navigator>
    )
}
