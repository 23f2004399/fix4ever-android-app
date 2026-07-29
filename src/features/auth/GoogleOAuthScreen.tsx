import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from '@react-native-google-signin/google-signin';
import { useTheme } from '../../core/theme';
import { config } from '../../core/config';
import { googleNativeAuth, type User } from '../../core/api';

type Phase = 'signing-in' | 'complete-profile' | 'error';

type GoogleOAuthScreenProps = {
  onBack: () => void;
  onSuccess: (token: string, user: User) => void;
};

export function GoogleOAuthScreen({ onBack, onSuccess }: GoogleOAuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, isDark } = useTheme();

  const [phase, setPhase] = useState<Phase>('signing-in');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Complete-profile phase state
  const [storedIdToken, setStoredIdToken] = useState('');
  const [prefillEmail, setPrefillEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);

  // ─── Design tokens (mirrors LoginScreen exactly) ───────────────────────────
  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const primaryBlue  = isDark ? '#1C4E7E' : '#01325D';
  const screenBg     = isDark ? '#242D3B' : '#FFFFFF';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const labelColor   = isDark ? '#D5E1F1' : '#082C50';
  const mutedText    = isDark ? '#D0D8E5' : '#3A3A3A';
  const inputBg      = isDark ? '#2D394A' : '#FFFFFF';
  const inputBorder  = isDark ? '#5A6A82' : '#B7BEC8';

  // Configure + auto-trigger after navigation animation settles (prevents 'Current activity is null').
  // 600ms gives the stack navigator transition time to fully complete.
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: config.GOOGLE_WEB_CLIENT_ID,
      ...(Platform.OS === 'ios' ? { iosClientId: config.GOOGLE_IOS_CLIENT_ID } : {}),
    });
    const timer = setTimeout(startGoogleSignIn, 900);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Google Sign-In ─────────────────────────────────────────────────────────
  const startGoogleSignIn = useCallback(async () => {
    setErrorMsg('');
    setLoading(true);
    setPhase('signing-in');

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Force account selection by signing out any previously cached session
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // Ignore if not signed in
      }

      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        // User dismissed the picker — go back silently
        onBack();
        return;
      }

      const { idToken, user: gUser } = response.data;

      if (!idToken) {
        setErrorMsg(
          'Could not get an ID token from Google. Make sure the Web Client ID is configured correctly.',
        );
        setPhase('error');
        setLoading(false);
        return;
      }

      // Call backend — first pass (no phone yet), with 15s timeout
      let timeoutHandle: ReturnType<typeof setTimeout>;
      const withTimeout = new Promise<{ data: undefined; error: { message: string } }>((resolve) => {
        timeoutHandle = setTimeout(
          () => resolve({ data: undefined, error: { message: 'Connection timed out. Make sure the backend is running and your device is on the same network.' } }),
          15000,
        );
      });
      const apiResult = await Promise.race([googleNativeAuth({ idToken }), withTimeout]);
      clearTimeout(timeoutHandle!);
      const { data, error: apiErr } = apiResult;
      setLoading(false);

      if (apiErr) {
        setErrorMsg(apiErr.message);
        setPhase('error');
        return;
      }

      if (data?.isNewUser) {
        // New user — show complete-profile form
        setStoredIdToken(idToken);
        setPrefillEmail(data.prefillEmail ?? gUser?.email ?? '');
        setName(data.prefillName ?? gUser?.name ?? '');
        setPhase('complete-profile');
        return;
      }

      if (data?.token && data?.user) {
        onSuccess(data.token, data.user);
        return;
      }

      setErrorMsg('Unexpected response from server. Please try again.');
      setPhase('error');
    } catch (err: any) {
      setLoading(false);
      if (isErrorWithCode(err)) {
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          onBack();
          return;
        } else if (err.code === statusCodes.IN_PROGRESS) {
          // Already running — just wait
          return;
        } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setErrorMsg('Google Play Services is not available on this device.');
        } else {
          setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
        }
      } else {
        setErrorMsg(err?.message || 'Something went wrong. Please try again.');
      }
      setPhase('error');
    }
  }, [onBack, onSuccess]);

  // ─── Complete-profile submit ─────────────────────────────────────────────
  const handleCompleteProfile = useCallback(async () => {
    setFormError('');
    if (!name.trim()) {
      setFormError('Please enter your full name.');
      return;
    }
    if (!/^\d{10}$/.test(phone.trim())) {
      setFormError('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    const { data, error: apiErr } = await googleNativeAuth({
      idToken: storedIdToken,
      username: name.trim(),
      phone: phone.trim(),
    });
    setLoading(false);

    if (apiErr) {
      setFormError(apiErr.message);
      return;
    }
    if (data?.token && data?.user) {
      onSuccess(data.token, data.user);
    } else {
      setFormError((data as any)?.message || 'Registration failed. Please try again.');
    }
  }, [name, phone, storedIdToken, onSuccess]);

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: screenBg },

    // ── Signing-in / Error full-center layout ──
    centerWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    gCircleOuter: {
      width: 100,
      height: 100,
      borderRadius: 50,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    gCircleInner: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: primaryBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gGlyph: {
      color: '#FFFFFF',
      fontFamily: fonts.bold,
      fontSize: 48,
      lineHeight: 56,
      letterSpacing: -1,
      marginTop: -4,
    },
    centerTitle: {
      fontSize: 26,
      lineHeight: 32,
      letterSpacing: -0.5,
      fontFamily: fonts.bold,
      color: headingColor,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    centerSubtitle: {
      fontSize: 15,
      lineHeight: 20,
      color: mutedText,
      fontFamily: fonts.medium,
      textAlign: 'center',
      maxWidth: 280,
      marginBottom: spacing.xl,
    },
    errorText: {
      color: colors.destructive,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      maxWidth: 300,
      marginBottom: spacing.xl,
    },
    primaryBtn: {
      borderRadius: 10,
      minHeight: 56,
      backgroundColor: primaryBlue,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
      width: '100%',
      maxWidth: 320,
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
      paddingHorizontal: spacing.xl,
      marginTop: spacing.md,
      width: '100%',
      maxWidth: 320,
    },
    ghostBtnText: {
      color: primaryBlue,
      fontFamily: fonts.semibold,
      fontSize: 16,
      lineHeight: 20,
    },
    // ── Complete-profile layout ──
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: insets.bottom + spacing.xl + (Platform.OS === 'android' ? 300 : 0),
      alignItems: 'center',
    },
    gCircleSmOuter: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      marginTop: spacing.lg,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },
    gCircleSmInner: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: primaryBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gGlyphSm: {
      color: '#FFFFFF',
      fontFamily: fonts.bold,
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.8,
      marginTop: -3,
    },
    formTitle: {
      fontSize: 28,
      lineHeight: 34,
      letterSpacing: -0.8,
      fontFamily: fonts.bold,
      color: headingColor,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    formSubtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedText,
      fontFamily: fonts.medium,
      textAlign: 'center',
      maxWidth: 300,
      marginBottom: spacing.xl,
    },
    emailChip: {
      color: isDark ? '#9BC7FF' : primaryBlue,
      fontFamily: fonts.semibold,
    },
    form: {
      alignSelf: 'stretch',
      width: '100%',
      maxWidth: 360,
      marginBottom: spacing.lg,
    },
    inputContainer: { marginBottom: spacing.md },
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
      backgroundColor: inputBg,
      paddingVertical: 14,
      paddingHorizontal: 16,
      color: isDark ? '#FFFFFF' : '#1E1E1E',
      fontFamily: fonts.medium,
      fontSize: 16,
    },
    formErrorText: {
      color: colors.destructive,
      fontFamily: fonts.medium,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    actions: {
      alignSelf: 'stretch',
      width: '100%',
      maxWidth: 360,
      gap: spacing.md,
    },
    submitBtn: {
      borderRadius: 10,
      minHeight: 56,
      backgroundColor: primaryBlue,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    },
    submitBtnText: {
      color: '#FFFFFF',
      fontFamily: fonts.semibold,
      fontSize: 16,
      lineHeight: 20,
    },
  });

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  // Phase: signing-in — spinner shown immediately; native picker triggered after 600ms delay
  if (phase === 'signing-in') {
    return (
      <View style={styles.container}>
        <View style={styles.centerWrap}>
          <View style={styles.gCircleOuter}>
            <View style={styles.gCircleInner}>
              <Text style={styles.gGlyph}>G</Text>
            </View>
          </View>
          <Text style={styles.centerTitle}>Continue with Google</Text>
          <Text style={styles.centerSubtitle}>
            Connecting to your Google account…
          </Text>
          <ActivityIndicator size="large" color={primaryBlue} />
          <TouchableOpacity style={[styles.ghostBtn, { marginTop: 32 }]} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.container}>
        <View style={styles.centerWrap}>
          <View style={styles.gCircleOuter}>
            <View style={styles.gCircleInner}>
              <Text style={styles.gGlyph}>G</Text>
            </View>
          </View>
          <Text style={styles.centerTitle}>Sign-in failed</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={startGoogleSignIn}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Try again</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={styles.ghostBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // phase === 'complete-profile'
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.gCircleSmOuter}>
          <View style={styles.gCircleSmInner}>
            <Text style={styles.gGlyphSm}>G</Text>
          </View>
        </View>

        <Text style={styles.formTitle}>One more step</Text>
        <Text style={styles.formSubtitle}>
          Signing in as{' '}
          <Text style={styles.emailChip}>{prefillEmail}</Text>
          {'\n'}Please confirm your name and add your phone number.
        </Text>

        <View style={styles.form}>
          {/* Full name */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: nameFocused ? primaryBlue : inputBorder },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={isDark ? '#A5B4C8' : '#8A8A8A'}
              autoCapitalize="words"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </View>

          {/* Phone number */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone number</Text>
            <TextInput
              style={[
                styles.textInput,
                { borderColor: phoneFocused ? primaryBlue : inputBorder },
              ]}
              value={phone}
              onChangeText={setPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor={isDark ? '#A5B4C8' : '#8A8A8A'}
              keyboardType="phone-pad"
              maxLength={10}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
            />
          </View>

          {formError ? (
            <Text style={styles.formErrorText}>{formError}</Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleCompleteProfile}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Complete sign-up</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}



