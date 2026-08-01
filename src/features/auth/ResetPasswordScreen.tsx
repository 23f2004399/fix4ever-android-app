import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { useAutoOtp } from '../../core/hooks';
import { getEmailError, validatePassword } from '../../core/utils';
import { forgotPassword, resetPassword } from '../../core/api';

const PASSWORD_HINT =
  'Min 8 characters, one uppercase, one lowercase, one number, one special character.';

type ResetPasswordScreenProps = {
  onBack: () => void;
  onSuccess: () => void;
};

export function ResetPasswordScreen({
  onBack,
  onSuccess,
}: ResetPasswordScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    setLoading(true);
    const { data, error: err } = await forgotPassword(email.trim());
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
  }, [email]);

  const handleResetPassword = useCallback(async () => {
    setError('');
    const emailErr = getEmailError(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    if (!otp.trim()) {
      setError('OTP is required.');
      return;
    }
    const pwdCheck = validatePassword(newPassword);
    if (!pwdCheck.valid) {
      setError(pwdCheck.message!);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await resetPassword({
      email: email.trim(),
      otp: otp.trim(),
      newPassword,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.success) {
      onSuccess();
    } else {
      setError(
        (data as { message?: string })?.message || 'Password reset failed.'
      );
    }
  }, [email, otp, newPassword, confirmPassword, onSuccess]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: screenBg,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: insets.top + spacing.sm,
      paddingBottom: insets.bottom + spacing.lg + (Platform.OS === 'android' ? 300 : 0),
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
    hint: {
      fontSize: 12,
      color: mutedText,
      fontFamily: fonts.regular,
      marginTop: -spacing.sm,
      marginBottom: spacing.md,
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
      alignItems: 'center',
      justifyContent: 'center',
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
      lineHeight: 20,
    },
    ghostBtn: {
      borderRadius: 10,
      minHeight: 48,
      borderWidth: 1,
      borderColor: primaryBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostBtnText: {
      color: primaryBlue,
      fontFamily: fonts.semibold,
      fontSize: 16,
      lineHeight: 20,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
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

        <Text style={styles.title}>Reset</Text>
        <Text style={styles.subtitle}>
          Enter your email. We'll send a verification code, then you can set a
          new password.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={isDark ? '#A5B4C8' : '#8A8A8A'}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              editable={!otpSent}
            />
          </View>

          {otpSent && (
            <>
              <Text style={styles.otpSentNote}>
                Check your email for the 6-digit code.
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>OTP</Text>
                <TextInput
                  style={styles.textInput}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="000000"
                  placeholderTextColor={isDark ? '#A5B4C8' : '#8A8A8A'}
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>New password</Text>
                <TextInput
                  style={styles.textInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#A5B4C8' : '#8A8A8A'}
                  secureTextEntry
                  autoComplete="password-new"
                />
              </View>
              <Text style={styles.hint}>{PASSWORD_HINT}</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Confirm new password</Text>
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor={isDark ? '#A5B4C8' : '#8A8A8A'}
                  secureTextEntry
                  autoComplete="password-new"
                />
              </View>
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          {!otpSent ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSendOtp}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Send OTP to email</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleResetPassword}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryBtnText}>Reset password</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={handleSendOtp}
                activeOpacity={0.7}
                disabled={loading}
              >
                <Text style={styles.ghostBtnText}>Send OTP again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
