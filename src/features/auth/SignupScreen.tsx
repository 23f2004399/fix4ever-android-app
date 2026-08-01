import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Button, Input } from '../../core/components';
import { useAutoOtp } from '../../core/hooks';
import {
  getEmailError,
  getUsernameError,
  getPhoneError,
  validatePassword,
} from '../../core/utils';
import { sendSignupOtp, signup } from '../../core/api';
import type { User } from '../../core/api';

const PASSWORD_HINT =
  'Min 8 characters, one uppercase, one lowercase, one number, one special character.';

type SignupScreenProps = {
  onBack: () => void;
  onSuccess: (token: string, user: User, refreshToken?: string) => void;
  onGooglePress?: () => void;
};

export function SignupScreen({
  onBack,
  onSuccess,
  onGooglePress,
}: SignupScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useAutoOtp({
    enabled: otpSent,
    onOtp: setOtp,
    numberOfDigits: 6,
  });

  const handleSendOtp = useCallback(async () => {
    setError('');
    const nameErr = getUsernameError(username);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const emailErr = getEmailError(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const phoneErr = getPhoneError(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setError(pwdCheck.message!);
      return;
    }
    setLoading(true);
    const { data, error: err } = await sendSignupOtp(email.trim());
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
  }, [username, email, phone, password]);

  const handleSignup = useCallback(async () => {
    setError('');
    const nameErr = getUsernameError(username);
    if (nameErr) {
      setError(nameErr);
      return;
    }
    const emailErr = getEmailError(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const phoneErr = getPhoneError(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setError(pwdCheck.message!);
      return;
    }
    if (!otp.trim()) {
      setError('OTP is required.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await signup({
      username: username.trim(),
      email: email.trim(),
      phone: phone.trim(),
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
      setError((data as { message?: string })?.message || 'Sign up failed.');
    }
  }, [username, email, phone, password, otp, onSuccess]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: insets.top + spacing.lg,
      paddingBottom: insets.bottom + spacing.xxl,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    backBtn: { padding: spacing.sm, marginLeft: -spacing.sm },
    backText: { ...typography.label, color: colors.primary },
    title: {
      ...typography.title,
      color: colors.foreground,
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.bodySmall,
      color: colors.mutedForeground,
      marginBottom: spacing.xl,
    },
    form: { marginBottom: spacing.lg },
    hint: {
      ...typography.caption,
      color: colors.mutedForeground,
      marginTop: -spacing.sm,
      marginBottom: spacing.md,
    },
    otpSentNote: {
      ...typography.caption,
      color: colors.primary,
      marginBottom: spacing.md,
    },
    errorText: {
      color: colors.destructive,
      marginBottom: spacing.md,
      fontSize: 14,
    },
    actions: { gap: spacing.md },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      ...typography.caption,
      color: colors.mutedForeground,
      marginHorizontal: spacing.sm,
    },
    socialButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    socialText: {
      ...typography.label,
      color: colors.foreground,
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
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>
          Enter your details. We'll send a verification code to your email.
        </Text>

        <View style={styles.form}>
          <Input
            label="Full name"
            value={username}
            onChangeText={setUsername}
            placeholder="Your name"
            autoCapitalize="words"
            editable={!otpSent}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            editable={!otpSent}
          />
          <Input
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            keyboardType="phone-pad"
            editable={!otpSent}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password-new"
            editable={!otpSent}
          />
          <Text style={styles.hint}>{PASSWORD_HINT}</Text>
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
            />
          ) : (
            <>
              <Button
                title="Sign up"
                onPress={handleSignup}
                loading={loading}
                variant="primary"
              />
              <Button
                title="Send OTP again"
                onPress={handleSendOtp}
                loading={loading}
                variant="ghost"
              />
            </>
          )}

          {onGooglePress && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={onGooglePress}
                activeOpacity={0.8}
              >
                <Text style={styles.socialText}>Sign up with Google</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
