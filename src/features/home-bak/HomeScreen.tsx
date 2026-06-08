import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
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

// Aligned with frontend: How Fix4Ever Works
const REPAIR_STEPS = [
  {
    number: '01',
    title: 'Describe Your Issue',
    description:
      'Tell us about your device and what needs repair. Be as specific as possible.',
  },
  {
    number: '02',
    title: 'Get Matched with Technicians',
    description:
      'Our system will match you with qualified technicians in your area.',
  },
  {
    number: '03',
    title: 'Book Your Repair',
    description: 'Choose a convenient time and location for your repair.',
  },
  {
    number: '04',
    title: 'Get Your Device Fixed',
    description:
      'The technician will arrive and fix your device, often within the same day.',
  },
];

const FEATURES = [
  {
    icon: '⏱',
    title: 'Fast Repairs',
    description:
      'Most repairs are completed within hours, not days. We respect your time.',
  },
  {
    icon: '👥',
    title: 'Expert Technicians',
    description:
      'Our repair specialists are certified, experienced, and background checked.',
  },
  {
    icon: '🛡',
    title: 'Quality Guaranteed',
    description:
      'We use only high-quality parts and offer a 30-day warranty on all repairs.',
  },
];

const STATS = [
  { value: '10+', label: 'Verified Technicians' },
  { value: '2000+', label: 'Completed Repairs' },
  { value: '4.8+', label: 'Average Rating' },
  { value: '10+', label: 'Cities Covered' },
];

const TESTIMONIAL = {
  quote:
    'Fix4Ever saved my presentation! My laptop screen cracked hours before a big meeting, and their technician arrived within 30 minutes and replaced it on the spot. Amazing service!',
  name: 'Lakshay Kumar',
  role: 'Software Developer',
  location: 'Noida',
};

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

export function HomeScreen( { navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderRadius, typography } = useTheme();

  const {  isLoadingUser,user, setUser, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        console.warn('Google sign-out failed:', signOutError);
      }
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
          backgroundColor: colors.background,
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxl,
        },
        hero: {
          alignItems: 'center',
          paddingTop: spacing.xl,
          paddingBottom: spacing.lg,
        },
        heroBadge: {
          backgroundColor: `${colors.primary}18`,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          marginBottom: spacing.lg,
          borderWidth: 1,
          borderColor: `${colors.primary}30`,
        },
        heroBadgeText: {
          ...typography.label,
          color: colors.primary,
          fontSize: 12,
        },
        logoBadge: {
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.md,
        },
        logoEmoji: { fontSize: 36 },
        brand: {
          ...typography.title,
          fontSize: 30,
          color: colors.foreground,
          letterSpacing: -0.5,
          marginBottom: spacing.sm,
        },
        heroHeadline: {
          ...typography.titleSmall,
          fontSize: 20,
          color: colors.foreground,
          textAlign: 'center',
          lineHeight: 28,
          marginBottom: spacing.sm,
        },
        heroSubtext: {
          ...typography.bodySmall,
          color: colors.mutedForeground,
          textAlign: 'center',
          lineHeight: 22,
        },
        ctaSection: {
          gap: spacing.sm,
          marginBottom: spacing.xxl,
        },
        primaryCta: { borderRadius: borderRadius.lg },
        secondaryCta: {
          borderRadius: borderRadius.lg,
          borderWidth: 2,
          borderColor: colors.primary,
        },
        loginCta: {
          paddingVertical: spacing.md,
          alignItems: 'center',
        },
        loginCtaText: {
          ...typography.label,
          color: colors.primary,
        },
        sectionWrap: { marginBottom: spacing.xl },
        sectionMuted: {
          backgroundColor: `${colors.primary}08`,
          marginHorizontal: -spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          borderRadius: 0,
        },
        sectionBadge: {
          alignSelf: 'flex-start',
          backgroundColor: `${colors.primary}18`,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: borderRadius.full,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: `${colors.primary}25`,
        },
        sectionBadgeText: {
          ...typography.label,
          color: colors.primary,
          fontSize: 12,
        },
        sectionTitle: {
          ...typography.subtitle,
          fontSize: 20,
          color: colors.foreground,
          marginBottom: spacing.sm,
        },
        sectionTitleAccent: { color: colors.primary },
        stepCard: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          backgroundColor: colors.card,
          padding: spacing.md,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.md,
          shadowColor: colors.foreground,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 2,
        },
        stepNumberWrap: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        stepNumber: {
          ...typography.caption,
          fontWeight: '700',
          color: colors.primaryForeground,
        },
        stepContent: { flex: 1 },
        stepTitle: {
          ...typography.label,
          color: colors.foreground,
          marginBottom: 2,
        },
        stepDesc: {
          ...typography.bodySmall,
          color: colors.mutedForeground,
        },
        featureCard: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.card,
          padding: spacing.md,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.md,
          shadowColor: colors.foreground,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        },
        featureIconWrap: {
          width: 48,
          height: 48,
          borderRadius: borderRadius.md,
          backgroundColor: `${colors.primary}15`,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: spacing.md,
        },
        featureIcon: { fontSize: 24 },
        featureText: { flex: 1 },
        featureTitle: {
          ...typography.label,
          color: colors.foreground,
          marginBottom: 2,
        },
        featureDesc: {
          ...typography.bodySmall,
          color: colors.mutedForeground,
        },
        statsWrap: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          backgroundColor: colors.card,
          padding: spacing.lg,
          borderRadius: borderRadius.lg,
          marginBottom: spacing.xl,
          shadowColor: colors.foreground,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        },
        statItem: {
          width: '48%',
          alignItems: 'center',
          marginBottom: spacing.md,
        },
        statValue: {
          ...typography.titleSmall,
          fontSize: 24,
          color: colors.primary,
          marginBottom: 2,
        },
        statLabel: {
          ...typography.caption,
          color: colors.mutedForeground,
          textAlign: 'center',
        },
        testimonialSubtext: {
          ...typography.bodySmall,
          color: colors.mutedForeground,
          marginBottom: spacing.md,
        },
        testimonialCard: {
          backgroundColor: colors.card,
          padding: spacing.lg,
          borderRadius: borderRadius.lg,
          borderLeftWidth: 4,
          borderLeftColor: colors.primary,
          shadowColor: colors.foreground,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        },
        testimonialQuote: {
          ...typography.body,
          color: colors.foreground,
          fontStyle: 'italic',
          marginBottom: spacing.md,
        },
        testimonialName: {
          ...typography.label,
          color: colors.foreground,
        },
        testimonialMeta: {
          ...typography.caption,
          color: colors.mutedForeground,
          marginTop: 2,
        },
        footer: { alignItems: 'center' },
        footerText: {
          ...typography.caption,
          color: colors.mutedForeground,
        },
      }),
    [colors, spacing, borderRadius, typography]
  );

  return (

    <SafeAreaProvider>
      <AppBar 
          isLoggedIn={!!user}
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
                }/>
      <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>Simple Process</Text>
        </View>
        <View style={styles.logoBadge}>
          <Text style={styles.logoEmoji}>🛠</Text>
        </View>
        <Text style={styles.brand}>Fix4Ever</Text>
        <Text style={styles.heroHeadline}>
          Getting Your Device Fixed{'\n'}Is Easier Than Ever!
        </Text>
        <Text style={styles.heroSubtext}>
          Our seamless process connects you with expert technicians in just
          minutes.
        </Text>
      </View>

      <View style={styles.ctaSection}>
        <Button
          title="Create Service Request"
          onPress={  (() => {
            navigation.navigate('ServiceRequestStack');
          })} 
          variant="primary"
          style={styles.primaryCta}
        /> 
         {!user && <Button
          title="Get Started Now"
          onPress={  (() => {})}
          variant="outline"
          style={styles.secondaryCta}
        /> }
        {!user && <TouchableOpacity
          style={styles.loginCta}
          onPress={() => navigation.navigate('Auth', { screen: 'Login' })}
          activeOpacity={0.7}
        >
          <Text style={styles.loginCtaText}>I already have an account</Text>
        </TouchableOpacity>
        }
      </View>

      <View style={styles.sectionWrap}>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>How it works</Text>
        </View>
        <Text style={styles.sectionTitle}>
          How Fix4Ever <Text style={styles.sectionTitleAccent}>Works?</Text>
        </Text>
        {REPAIR_STEPS.map(step => (
          <View key={step.number} style={styles.stepCard}>
            <View style={styles.stepNumberWrap}>
              <Text style={styles.stepNumber}>{step.number}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.sectionWrap, styles.sectionMuted]}>
        <Text style={styles.sectionTitle}>Why Choose Us</Text>
        {FEATURES.map((item, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Text style={styles.featureIcon}>{item.icon}</Text>
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{item.title}</Text>
              <Text style={styles.featureDesc}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.statsWrap}>
        {STATS.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={[styles.sectionWrap, styles.sectionMuted]}>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>Customer Testimonials</Text>
        </View>
        <Text style={styles.sectionTitle}>
          Real People. Real Fixes.{'\n'}
          <Text style={styles.sectionTitleAccent}>Real Stories.</Text>
        </Text>
        <Text style={styles.testimonialSubtext}>
          Hear directly from our satisfied customers about their repair
          experiences
        </Text>
        <View style={styles.testimonialCard}>
          <Text style={styles.testimonialQuote}>"{TESTIMONIAL.quote}"</Text>
          <Text style={styles.testimonialName}>{TESTIMONIAL.name}</Text>
          <Text style={styles.testimonialMeta}>
            {TESTIMONIAL.role} · {TESTIMONIAL.location}
          </Text>
        </View>
      </View>

      <View
        style={[styles.footer, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <Text style={styles.footerText}>Trusted device care across India</Text>
      </View>
    </ScrollView>
    </SafeAreaProvider>
  )
}
