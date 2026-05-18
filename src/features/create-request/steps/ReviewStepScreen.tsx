import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';


import { useTheme } from '../../../core/theme';

import { FormData } from '../ServiceRequestStack.tsx';

interface ReviewStepScreenProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  onNext: () => void;
  onBack: () => void;
  calculatedPricing: any;
  problemCategories: { value: string; label: string }[];
  TIME_SLOTS: { id: string; label: string }[];
}

export function ReviewStepScreen({
  formData,
  updateFormData,
  errors,
  onNext,
  onBack,
  calculatedPricing,
  problemCategories,
  TIME_SLOTS,
}: ReviewStepScreenProps) {
  const { colors, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,
    scroll: {
      flex: 1,
    } as ViewStyle,
    scrollContent: {
      padding: spacing.md,
    } as ViewStyle,
    section: {
      marginBottom: spacing.lg,
    } as ViewStyle,
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: spacing.md,
    } as TextStyle,
    input: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: spacing.md,
      marginBottom: spacing.md,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as ViewStyle,
    optionText: {
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    } as TextStyle,
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Review Your Request</Text>
        
        <View style={styles.input}>
          <Text style={styles.optionText}>
            Request Type: {formData.requestType === 'self' ? 'For Myself' : 'For Someone Else'}
          </Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.optionText}>
            Service Type: {formData.serviceType.replace('-', ' ')}
          </Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.optionText}>
            Device: {formData.brand} - {formData.model}
          </Text>
        </View>

        <View style={styles.input}>
          <Text style={styles.optionText}>
            Location: {formData.address}, {formData.city}
          </Text>
        </View>

        {formData.knowsProblem && formData.mainProblem?.title && (
          <View style={styles.input}>
            <Text style={styles.optionText}>
              Problem: {formData.mainProblem.title}
            </Text>
          </View>
        )}

        {formData.knowsProblem && formData.subProblem?.title && (
          <View style={styles.input}>
            <Text style={styles.optionText}>
              Sub-category: {formData.subProblem.title}
            </Text>
          </View>
        )}

        {formData.knowsProblem && formData.relationalBehaviors?.[0]?.title && (
          <View style={styles.input}>
            <Text style={styles.optionText}>
              Specific Issue: {formData.relationalBehaviors[0].title}
            </Text>
          </View>
        )}

        {!formData.knowsProblem && formData.problemDescription && (
          <View style={styles.input}>
            <Text style={styles.optionText}>
              Description: {formData.problemDescription}
            </Text>
          </View>
        )}

        {formData.selectedDate && formData.selectedTimeSlot && (
          <View style={styles.input}>
            <Text style={styles.optionText}>
              Date & Time: {formData.selectedDate} - {TIME_SLOTS.find(s => s.id === formData.selectedTimeSlot)?.label}
            </Text>
          </View>
        )}

        {calculatedPricing && (
          <View style={styles.input}>
            <Text style={styles.optionText}>
              {calculatedPricing.displayLabel
                ? `Price: ${calculatedPricing.displayLabel}`
                : `Price Range: ₹${calculatedPricing.finalChargeRange.min} - ₹${calculatedPricing.finalChargeRange.max}`}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
