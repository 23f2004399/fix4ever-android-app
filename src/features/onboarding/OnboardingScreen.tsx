import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../core/theme';
import { Button } from '../../core/components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STEPS = [
  {
    key: 'welcome',
    icon: 'tool',
    title: 'Welcome to Fix4Ever',
    description:
      'Device repair made simple. We pick up your device, get it fixed by experts, and deliver it back to you.',
  },
  {
    key: 'describe',
    icon: 'edit-3',
    title: 'Describe Your Issue',
    description:
      'Tell us your device and what’s wrong. We match you with verified technicians in your area.',
  },
  {
    key: 'book',
    icon: 'truck',
    title: 'We Pick Up & Repair',
    description:
      'Choose a convenient time and place. We pick up from your doorstep and handle the rest.',
  },
  {
    key: 'deliver',
    icon: 'check-circle',
    title: 'Get It Back, Fixed',
    description:
      'Expert repair with quality parts and warranty. We deliver your device back to you, good as new.',
  },
];

type OnboardingScreenProps = {
  onComplete: () => void;
};

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };

  const goNext = () => {
    if (currentIndex < STEPS.length - 1) {
      scrollRef.current?.scrollTo({
        x: (currentIndex + 1) * SCREEN_WIDTH,
        animated: true,
      });
    } else {
      onComplete();
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    skipWrap: {
      position: 'absolute',
      top: insets.top + spacing.sm,
      right: spacing.lg,
      zIndex: 10,
    },
    skipText: {
      ...typography.label,
      color: colors.mutedForeground,
    },
    scroll: {
      flex: 1,
    },
    stepPage: {
      width: SCREEN_WIDTH,
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: insets.top + spacing.xxl,
      paddingBottom: insets.bottom + spacing.xl,
      justifyContent: 'space-between',
    },
    stepContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
    },
    iconWrap: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: `${colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    stepTitle: {
      ...typography.title,
      fontSize: 24,
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    stepDesc: {
      ...typography.body,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 26,
      paddingHorizontal: spacing.sm,
    },
    footer: {
      paddingHorizontal: spacing.md,
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
      gap: spacing.sm,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    dotInactive: {
      opacity: 0.3,
    },
    button: {
      borderRadius: borderRadius.lg,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skipWrap}
        onPress={onComplete}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
      >
        {STEPS.map(step => (
          <View key={step.key} style={styles.stepPage}>
            <View style={styles.stepContent}>
              <View style={styles.iconWrap}>
                <Icon name={step.icon} size={56} color={colors.primary} />
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDesc}>{step.description}</Text>
            </View>
            <View style={styles.footer}>
              <View style={styles.dots}>
                {STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.dot,
                      {
                        backgroundColor:
                          i === currentIndex ? colors.primary : colors.border,
                      },
                      i !== currentIndex && styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
              <Button
                title={
                  currentIndex === STEPS.length - 1 ? 'Get started' : 'Next'
                }
                onPress={goNext}
                variant="primary"
                style={styles.button}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
