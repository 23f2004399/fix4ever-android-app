import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Button, Input } from '../../core/components';
import { useAutoOtp } from '../../core/hooks';
import { getEmailError } from '../../core/utils';
import { sendLoginOtp, login } from '../../core/api';
import type { User } from '../../core/api';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';

type LoginScreenProps = {
  onSuccess: (token: string, user: User, refreshToken?: string) => void;
  onForgotPassword?: () => void;
  onGooglePress?: () => void;
};

export function LoginScreen({
  onSuccess,
  onForgotPassword,
  onGooglePress,
}: LoginScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const primaryBlue = isDark ? '#1C4E7E' : '#01325D';
  const screenBg = isDark ? '#242D3B' : '#FFFFFF';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const labelColor = isDark ? '#D5E1F1' : '#082C50';
  const mutedText = isDark ? '#D0D8E5' : '#3A3A3A';
  const inputBg = isDark ? '#2D394A' : '#FFFFFF';
  const inputBorder = isDark ? '#5A6A82' : '#B7BEC8';
  const dividerColor = isDark ? '#66778F' : '#D6D6D6';

  useAutoOtp({
    enabled: otpSent,
    onOtp: setOtp,
    numberOfDigits: 6,
  });

  const handleSendOtp = useCallback(async () => {
    setError('');
    const emailErr = getEmailError(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await sendLoginOtp(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.success) {
      setOtpSent(true);
      setError('');
    } else {
      setError(
        (data as { message?: string })?.message || 'Failed to send OTP.'
      );
    }
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    setError('');
    const emailErr = getEmailError(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    if (!otp.trim()) {
      setError('OTP is required.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await login({
      email: email.trim(),
      password,
      otp: otp.trim(),
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.success && data?.token && data?.user) {
      onSuccess(data.token, data.user, data.refreshToken);
    } else {
      console.log("Login failed", data);
      setError((data as { message?: string })?.message || 'Login failed.');
    }
  }, [email, password, otp, onSuccess]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: screenBg,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: insets.top + spacing.sm,
      paddingBottom: insets.bottom + spacing.lg,
      alignItems: 'center',
    },
    logoCircle: {
      width: 118,
      height: 118,
      borderRadius: 59,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      shadowColor: '#000000',
      shadowOpacity: 0.24,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    logoClip: {
      width: 118,
      height: 118,
      borderRadius: 59,
      overflow: 'hidden',
      backgroundColor: primaryBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoImage: {
      width: 150,
      height: 150,
    },
    title: {
      fontSize: 42,
      lineHeight: 52,
      letterSpacing: -1.2,
      fontFamily: fonts.bold,
      color: headingColor,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: -0.08,
      color: mutedText,
      fontFamily: fonts.medium,
      marginBottom: spacing.xl,
      textAlign: 'center',
      maxWidth: 320,
    },
    form: {
      marginBottom: spacing.md,
      alignSelf: 'stretch',
      width: '100%',
      maxWidth: 360,
    },
    inputContainer: {
      marginBottom: spacing.md,
    },
    inputLabel: {
      fontSize: 15,
      lineHeight: 20,
      letterSpacing: 0,
      color: labelColor,
      fontFamily: fonts.medium,
      marginBottom: 6,
    },
    textInput: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: inputBorder,
      backgroundColor: inputBg,
      paddingVertical: 14,
      paddingHorizontal: 16,
      color: isDark ? '#FFFFFF' : '#1E1E1E',
      fontFamily: fonts.medium,
      fontSize: 16,
    },
    inputPlaceholder: {
      color: isDark ? '#A5B4C8' : '#8A8A8A',
    },
    otpSentNote: {
      color: isDark ? '#9BC7FF' : primaryBlue,
      marginBottom: spacing.md,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 18,
    },
    errorText: {
      color: colors.destructive,
      marginBottom: spacing.md,
      fontSize: 14,
      fontFamily: fonts.medium,
    },
    actions: {
      gap: spacing.md,
      alignSelf: 'stretch',
      width: '100%',
      maxWidth: 360,
    },
    primaryBtn: {
      borderRadius: 10,
      minHeight: 56,
      backgroundColor: primaryBlue,
      shadowColor: '#000000',
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    primaryBtnText: {
      color: '#FFFFFF',
      fontFamily: fonts.semibold,
      fontSize: 16,
      lineHeight: 18,
    },
    ghostBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: primaryBlue,
      minHeight: 52,
    },
    ghostBtnText: {
      color: primaryBlue,
      fontFamily: fonts.semibold,
      fontSize: 16,
      lineHeight: 18,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      marginBottom: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: dividerColor,
    },
    dividerText: {
      color: mutedText,
      marginHorizontal: spacing.md,
      fontFamily: fonts.medium,
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: primaryBlue,
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
      minHeight: 58,
      zIndex: 2,
      position: 'relative',
    },
    googleGlyph: {
      color: '#FFFFFF',
      fontFamily: fonts.bold,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.8,
      marginRight: 10,
      marginTop: -2,
    },
    socialText: {
      color: '#FFFFFF',
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0,
      fontFamily: fonts.medium,
    },
    forgotLink: {
      marginTop: 2,
      marginBottom: spacing.sm,
      alignSelf: 'center',
    },
    forgotLinkText: {
      color: headingColor,
      fontFamily: fonts.medium,
      fontSize: 16,
      lineHeight: 20,
      letterSpacing: 0,
    },
    googleSection: {
      paddingTop: spacing.xs,
    },
    illustrationBehind: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: -80,
      alignItems: 'center',
      opacity: isDark ? 0.5 : 0.7,
    },
    leftDecoration: {
      position: 'absolute',
      left: -16,
      top: insets.top * 2 + 132,
      opacity: isDark ? 0.35 : 0.5,
    },
    leftDecorationImage: {
      width: 145,
      height: 190,
    },
    rightDecoration: {
      position: 'absolute',
      right: -20,
      bottom: 60,
      opacity: isDark ? 0.35 : 0.5,
    },
    rightDecorationImage: {
      width: 120,
      height: 160,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.illustrationBehind} pointerEvents="none">
        <MobileLaptop width={600} height={220} />
      </View>
      <View style={styles.leftDecoration} pointerEvents="none">
        <Image source={require('../../assets/icons/icon5.png')} style={styles.leftDecorationImage} resizeMode="contain" />
      </View>
      <View style={styles.rightDecoration} pointerEvents="none">
        <Image source={require('../../assets/icons/icon3.png')} style={styles.rightDecorationImage} resizeMode="contain" />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoCircle}>
          <View style={styles.logoClip}>
            <Image
              source={require('../../assets/icons/blue_icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.title}>Log in</Text>
        <Text style={styles.subtitle}>
          Log in for a lifetime of support for your devices.
        </Text>

        <View style={styles.form}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            containerStyle={styles.inputContainer}
            style={styles.textInput}
            labelStyle={styles.inputLabel}
            placeholderTextColor={styles.inputPlaceholder.color}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
            containerStyle={styles.inputContainer}
            style={styles.textInput}
            labelStyle={styles.inputLabel}
            placeholderTextColor={styles.inputPlaceholder.color}
          />
          {otpSent && (
            <>
              <Text style={styles.otpSentNote}>
                Check your email for the 6-digit code. If sent via SMS, it may
                auto-fill.
              </Text>
              <Input
                label="OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                containerStyle={styles.inputContainer}
                style={styles.textInput}
                labelStyle={styles.inputLabel}
                placeholderTextColor={styles.inputPlaceholder.color}
              />
            </>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          {!otpSent ? (
            <Button
              title="Send OTP to email"
              onPress={handleSendOtp}
              loading={loading}
              variant="primary"
              style={styles.primaryBtn}
              textStyle={styles.primaryBtnText}
            />
          ) : (
            <>
              <Button
                title="Log in"
                onPress={handleLogin}
                loading={loading}
                variant="primary"
                style={styles.primaryBtn}
                textStyle={styles.primaryBtnText}
              />
              <Button
                title="Send OTP again"
                onPress={handleSendOtp}
                loading={loading}
                variant="ghost"
                style={styles.ghostBtn}
                textStyle={styles.ghostBtnText}
              />
            </>
          )}
          {onForgotPassword ? (
            <TouchableOpacity
              style={styles.forgotLink}
              onPress={onForgotPassword}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotLinkText}>Forgot password?</Text>
            </TouchableOpacity>
          ) : null}

          {onGooglePress && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <View style={styles.googleSection}>
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={onGooglePress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.googleGlyph}>G</Text>
                  <Text style={styles.socialText}>Continue with Google</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
