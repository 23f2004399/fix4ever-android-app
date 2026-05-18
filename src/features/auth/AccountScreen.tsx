import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';
import { useAuth } from '../../lib/contexts/auth-context';

type AccountScreenProps = {
  onLogout: () => void;
};

const fonts = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semibold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
} as const;

export function AccountScreen({ onLogout }: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, isDark } = useTheme();
  const { user } = useAuth();

  const profileCardColor = isDark ? '#1C3D63' : '#01325d';
  const pageSubtle = isDark ? '#B9C6DA' : '#2E2E2E';
  const buttonBgColor = isDark ? '#2B5F91' : profileCardColor;
  const containerBg = isDark ? '#242D3B' : colors.background;
  const titleColor = isDark ? '#F3F7FF' : '#082c50';
  const labelColor = isDark ? '#D4E0F0' : '#D8E2F0';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: containerBg,
    },
    scroll: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl,
      alignItems: 'center',
    },
    logoCircle: {
      width: 130,
      height: 130,
      borderRadius: 65,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      shadowColor: '#000000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    logoClip: {
      width: 130,
      height: 130,
      borderRadius: 65,
      overflow: 'hidden',
      backgroundColor: profileCardColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      fontSize: 58,
      color: '#FFFFFF',
      letterSpacing: -2.3,
      fontFamily: fonts.bold,
    },
    logoIcon: {
      width: 150,
      height: 150,
    },
    title: {
      fontSize: 48,
      lineHeight: 48,
      letterSpacing: -2.4,
      fontFamily: fonts.bold,
      color: titleColor,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 18,
      lineHeight: 20,
      letterSpacing: -0.18,
      color: pageSubtle,
      fontFamily: fonts.medium,
      marginBottom: 22,
    },
    card: {
      width: 336,
      height: 232,
      backgroundColor: profileCardColor,
      paddingHorizontal: 28,
      paddingVertical: 26,
      borderRadius: 16,
      marginBottom: 22,
      alignSelf: 'center',
      shadowColor: '#000000',
      shadowOpacity: isDark ? 0.28 : 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 7,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    row: { marginBottom: 22 },
    label: {
      fontSize: 15,
      lineHeight: 20,
      color: labelColor,
      fontFamily: fonts.medium,
      marginBottom: 6,
    },
    value: {
      fontSize: 18,
      lineHeight: 24,
      color: '#FFFFFF',
      fontFamily: fonts.medium,
    },
    logoutButton: {
      width: 336,
      height: 52,
      backgroundColor: buttonBgColor,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 22,
      alignSelf: 'center',
      shadowColor: '#000000',
      shadowOpacity: isDark ? 0.22 : 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    logoutText: {
      fontSize: 16,
      lineHeight: 18,
      color: '#FFFFFF',
      fontFamily: fonts.medium,
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
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoCircle}>
          <View style={styles.logoClip}>
            <Image
              source={require('../../assets/icons/blue_icon.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Your personal details</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{user?.username || '-'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || '-'}</Text>
          </View>
          {user?.phone ? (
            <View style={styles.row}>
              <Text style={styles.label}>Phone</Text>
              <Text style={styles.value}>{user.phone}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity onPress={onLogout} activeOpacity={0.85} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
