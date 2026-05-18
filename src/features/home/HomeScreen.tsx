import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Button } from '../../core/components';
import { useTheme } from '../../core/theme';

import type { User } from '../../core/api';

import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = '@fix4ever/auth_user';

import AuthStack from '../auth';


import {
  hasCompletedOnboarding,
  setOnboardingCompleted,
  getStoredUser,
  setAuth,
  clearAuth,
} from '../../core/storage';

import { AppBar } from '../../core/components';
import { useAuth } from '../../lib/contexts/auth-context';


type MainTabParamList = {
  Home: undefined;
  Requests: undefined;
  Create: undefined;
  Tracker: undefined;
  Drafts: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Auth: { screen: 'Login' | 'Signup' | 'Account' | 'ResetPassword' | 'GoogleOAuth' };
  ServiceRequestStack: { draftId?: string } | undefined;
  ServiceRequestDetails: { requestId: string };
  CreateServiceRequestScreen: undefined;
};

type HomeScreenProps = {
  navigation: CompositeNavigationProp<
    BottomTabNavigationProp<MainTabParamList, 'Home'>,
    NativeStackNavigationProp<RootStackParamList>
  >;
};

const QUICK_SERVICES = [
  { id: 'display',   title: 'Display issue',   subtitle: 'Cracked, blank,\nflickering',   icon: 'monitor',  color: '#4A90D9' },
  { id: 'battery',   title: 'Battery issue',   subtitle: 'Draining, not\ncharging',       icon: 'battery',  color: '#27AE60' },
  { id: 'physical',  title: 'Physical damage', subtitle: 'Hinge, damage,\nports',         icon: 'tool',     color: '#E67E22' },
  { id: 'power',     title: 'Not turning on',  subtitle: 'Dead, no power,\nblack',        icon: 'power',    color: '#E74C3C' },
  { id: 'charger',   title: 'Charger issue',   subtitle: 'Not charging,\nloose port',     icon: 'zap',      color: '#F39C12' },
  { id: 'keyboard',  title: 'Keyboard issue',  subtitle: 'Keys stuck, not\ntyping',       icon: 'type',     color: '#9B59B6' },
  { id: 'cleaning',  title: 'Laptop cleaning', subtitle: 'Dust, fan,\nthermal paste',     icon: 'wind',     color: '#16A085' },
  { id: 'slow',      title: 'Slow laptop',     subtitle: 'Lagging, hanging,\nfreezing',   icon: 'activity', color: '#C0392B' },
] as const;

export function HomeScreen( { navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderRadius, typography, isDark } = useTheme();

  const {  isLoadingUser,user, setUser, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showServicesSheet, setShowServicesSheet] = useState(false);

  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const brandBlue = '#01325D';
  const primaryBlue = isDark ? '#1C4E7E' : brandBlue;
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const mutedText = isDark ? '#D0D8E5' : '#3A3A3A';
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      clearAuth();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if(!isLoadingUser){
      console.log(user);
    }
  }, [isLoadingUser,mounted]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scroll: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
          alignItems: 'center',
          position: 'relative',
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
          top: insets.top + spacing.xl + spacing.xxl,
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
        hero: {
          alignItems: 'center',
          paddingTop: spacing.xl,
          paddingBottom: spacing.md,
          width: '100%',
        },
        logoCircle: {
          width: 120,
          height: 120,
          borderRadius: 60,
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
          width: 120,
          height: 120,
          borderRadius: 60,
          overflow: 'hidden',
          backgroundColor: brandBlue,
          alignItems: 'center',
          justifyContent: 'center',
        },
        logoImage: {
          width: 140,
          height: 140,
        },
        brand: {
          fontSize: 36,
          lineHeight: 44,
          letterSpacing: -1,
          fontFamily: fonts.bold,
          color: headingColor,
          marginBottom: spacing.md,
          textAlign: 'center',
        },
        heroHeadline: {
          fontSize: 24,
          lineHeight: 32,
          fontFamily: fonts.bold,
          color: headingColor,
          textAlign: 'center',
          marginBottom: spacing.sm,
          maxWidth: 320,
        },
        heroSubtext: {
          fontSize: 14,
          lineHeight: 22,
          color: mutedText,
          textAlign: 'center',
          fontFamily: fonts.medium,
          marginBottom: spacing.lg,
          maxWidth: 300,
        },
        processIconsRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: spacing.lg,
        },
        processIconCircle: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: brandBlue,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: isDark ? '#242D3B' : '#FFFFFF',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 3,
        },
        overlappingIcon: {
          marginLeft: -12,
        },
        heroBadge: {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          borderRadius: borderRadius.full,
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
        },
        heroBadgeText: {
          fontFamily: fonts.medium,
          color: mutedText,
          fontSize: 14,
          letterSpacing: 0.2,
        },
        ctaSection: {
          alignItems: 'center',
          width: '100%',
          maxWidth: 360,
          marginBottom: spacing.xxl,
        },
        primaryCta: { 
          borderRadius: 12,
          width: '100%',
          minHeight: 56,
          backgroundColor: primaryBlue,
          shadowColor: '#000000',
          shadowOpacity: 0.15,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        primaryCtaText: {
          fontFamily: fonts.semibold,
          fontSize: 17,
          color: '#FFFFFF',
        },
        allServicesCard: {
          width: '100%',
          marginTop: spacing.xl,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.2 : 0.07,
          shadowRadius: 8,
          elevation: 3,
        },
        allServicesIconWrap: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: isDark ? 'rgba(28,78,126,0.35)' : 'rgba(1,50,93,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        allServicesTextBlock: {
          flex: 1,
        },
        allServicesCardTitle: {
          fontFamily: fonts.bold,
          fontSize: 16,
          color: colors.foreground,
          marginBottom: 3,
        },
        allServicesCardSubtitle: {
          fontFamily: fonts.regular,
          fontSize: 13,
          color: colors.textSecondary,
        },
        // Sheet styles
        sheetOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.background,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingBottom: insets.bottom + 24,
          maxHeight: '90%',
        },
        sheetHandle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          alignSelf: 'center',
          marginTop: 12,
          marginBottom: 4,
        },
        sheetHeader: {
          alignItems: 'center',
          paddingVertical: 16,
          paddingHorizontal: spacing.lg,
        },
        sheetBadge: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.muted,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: 20,
          marginBottom: 12,
          borderWidth: 1,
          borderColor: colors.border,
        },
        sheetBadgeText: {
          fontFamily: fonts.medium,
          fontSize: 12,
          color: colors.mutedForeground,
        },
        sheetTitle: {
          fontFamily: fonts.bold,
          fontSize: 20,
          color: colors.foreground,
          textAlign: 'center',
          marginBottom: 6,
        },
        sheetSubtitle: {
          fontFamily: fonts.regular,
          fontSize: 13,
          color: colors.textSecondary,
          textAlign: 'center',
        },
        grid: {
          paddingHorizontal: spacing.md,
        },
        gridRow: {
          flexDirection: 'row',
          gap: 10,
          marginBottom: 10,
        },
        tile: {
          flex: 1,
          backgroundColor: colors.secondary,
          borderRadius: 14,
          padding: 14,
          alignItems: 'flex-start',
          borderWidth: 1,
          borderColor: colors.border,
        },
        tileIconWrap: {
          width: 40,
          height: 40,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 10,
        },
        tileTitle: {
          fontFamily: fonts.semibold,
          fontSize: 13,
          color: colors.foreground,
          marginBottom: 3,
        },
        tileSubtitle: {
          fontFamily: fonts.regular,
          fontSize: 11,
          color: colors.textSecondary,
          lineHeight: 15,
        },
        sheetFooter: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingTop: 14,
          paddingHorizontal: spacing.lg,
        },
        sheetFooterText: {
          fontFamily: fonts.regular,
          fontSize: 12,
          color: colors.textMuted,
        },
        footer: { alignItems: 'center' },
        footerText: {
          fontSize: 12,
          fontFamily: fonts.medium,
          color: mutedText,
        },
      }),
    [colors, spacing, borderRadius, typography, isDark, primaryBlue, headingColor, mutedText, fonts, insets]
  );

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: isDark ? '#242D3B' : '#FFFFFF' }}>
        <AppBar 
          isLoggedIn={!!user}
          user={user}
          onLoginPress={() => navigation.navigate('Auth', { screen: 'Login' })} 
          onSignupPress={() => navigation.navigate('Auth', { screen: 'Signup' })}
          onProfilePress={() => navigation.navigate('Auth', { screen: 'Account' })} 
          onNotificationsPress={() =>
            Alert.alert(
              'Notifications',
              'Your notifications will appear here soon.'
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
      <View style={{ flex: 1, position: 'relative' }}>
        {/* Background Illustration - Fixed at bottom */}
        <View style={styles.illustrationBehind} pointerEvents="none">
          <MobileLaptop width={600} height={220} />
        </View>
        {/* Left decoration at logo height */}
        <View style={styles.leftDecoration} pointerEvents="none">
          <Image
            source={require('../../assets/icons/icon5.png')}
            style={styles.leftDecorationImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.rightDecoration} pointerEvents="none">
          <Image source={require('../../assets/icons/icon3.png')} style={styles.rightDecorationImage} resizeMode="contain" />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
          showsVerticalScrollIndicator={false}
        >

        <View style={styles.hero}>
          <View style={styles.logoCircle}>
            <View style={styles.logoClip}>
              <Image
                source={require('../../assets/icons/blue_icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
          
          <Text style={styles.brand}>Fix4Ever</Text>
          
          <Text style={styles.heroHeadline}>
            Within Six We Will Fix!
          </Text>
          
          <Text style={styles.heroSubtext}>
            Our seamless process connects you with expert technicians in just minutes.
          </Text>

          <View style={styles.processIconsRow}>
            {/* <View style={styles.processIconCircle}>
              <Icon name="tool" size={22} color="#FFFFFF" />
            </View> */}
            {/* <View style={[styles.processIconCircle, styles.overlappingIcon, { overflow: 'hidden' }]}>
              <Image 
                source={require('../../assets/icons/blue_icon.png')} 
                style={{ width: '103%', height: '103%' }}
                resizeMode="contain"
              />
            </View> */}
            <View style={[styles.processIconCircle, styles.overlappingIcon]}>
              <Icon name="user" size={22} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Simple Process</Text>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Button
            title="Create Service Request"
            onPress={() => navigation.navigate('ServiceRequestStack')}
            variant="primary"
            style={styles.primaryCta}
            textStyle={styles.primaryCtaText}
          />

          {/* All Services card */}
          <TouchableOpacity
            style={styles.allServicesCard}
            onPress={() => setShowServicesSheet(true)}
            activeOpacity={0.75}
          >
            <View style={styles.allServicesIconWrap}>
              <Icon name="grid" size={22} color={primaryBlue} />
            </View>
            <View style={styles.allServicesTextBlock}>
              <Text style={styles.allServicesCardTitle}>All Services</Text>
              <Text style={styles.allServicesCardSubtitle}>Browse all repair categories</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          {!user && (
            <TouchableOpacity
              style={{ marginTop: spacing.lg }}
              onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
              activeOpacity={0.7}
            >
              <Text style={{ fontFamily: fonts.semibold, color: colors.primary, fontSize: 15 }}>
                I already have an account
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Quick Services Bottom Sheet */}
      <Modal
        visible={showServicesSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServicesSheet(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setShowServicesSheet(false)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetBadge}>
                <Icon name="grid" size={12} color={colors.mutedForeground} />
                <Text style={styles.sheetBadgeText}>Quick service</Text>
              </View>
              <Text style={styles.sheetTitle}>What's wrong with your laptop?</Text>
              <Text style={styles.sheetSubtitle}>Tap an issue to submit a service request instantly</Text>
            </View>

            <View style={styles.grid}>
              {Array.from({ length: Math.ceil(QUICK_SERVICES.length / 2) }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {QUICK_SERVICES.slice(rowIdx * 2, rowIdx * 2 + 2).map(service => (
                    <TouchableOpacity
                      key={service.id}
                      style={styles.tile}
                      activeOpacity={0.75}
                      onPress={() => {
                        setShowServicesSheet(false);
                        navigation.navigate('ServiceRequestStack');
                      }}
                    >
                      <View style={[styles.tileIconWrap, { backgroundColor: service.color + '22' }]}>
                        <Icon name={service.icon} size={20} color={service.color} />
                      </View>
                      <Text style={styles.tileTitle}>{service.title}</Text>
                      <Text style={styles.tileSubtitle}>{service.subtitle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            <View style={styles.sheetFooter}>
              <Icon name="grid" size={12} color={colors.textMuted} />
              <Text style={styles.sheetFooterText}>Tap any button to see the service form</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </View>
      </View>
    </SafeAreaProvider>
  );
}
