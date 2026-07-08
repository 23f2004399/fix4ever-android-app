import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

import { useTheme } from '../../../core/theme';

import { FormData } from '../ServiceRequestStack';

interface BrandStepScreenProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  onNext: () => void;
  onBack: () => void;
  brands: any[];
  brandSearchQuery: string;
  setBrandSearchQuery: (value: string) => void;
  customBrand: string;
  setCustomBrand: (value: string) => void;
}

export function BrandStepScreen({
  formData,
  updateFormData,
  errors,
  onNext,
  onBack,
  brands,
  brandSearchQuery,
  setBrandSearchQuery,
  customBrand,
  setCustomBrand,
}: BrandStepScreenProps) {
  const { colors, spacing, typography, isDark } = useTheme();

  // Filter brands based on search query
  const filteredBrands = brands.filter(brand =>
    brand.name.toLowerCase().includes(brandSearchQuery.toLowerCase())
  );

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
    searchContainer: {
      marginBottom: spacing.md,
    } as ViewStyle,
    searchInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: spacing.md,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
    } as ViewStyle,
    brandGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      paddingBottom: spacing.md,
    } as ViewStyle,
    brandItem: {
      width: '48%',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: spacing.md,
      alignItems: 'center' as const,
      minHeight: 100,
      justifyContent: 'center' as const,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as ViewStyle,
    brandItemSelected: {
      borderColor: colors.primary,
      borderWidth: 2,
      shadowColor: colors.primary,
      shadowOpacity: 0.15,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    } as ViewStyle,
    brandItemError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    brandName: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
      marginTop: spacing.xs,
    } as TextStyle,
    brandNameSelected: {
      color: isDark ? '#FFFFFF' : colors.primary,
    } as TextStyle,
    otherBrandIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.border,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing.xs,
    } as ViewStyle,
    otherBrandIconText: {
      fontSize: 24,
      color: colors.mutedForeground,
      fontWeight: 'bold' as const,
    } as TextStyle,
    customBrandContainer: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      width: '100%',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as ViewStyle,
    customBrandLabel: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: colors.foreground,
      marginBottom: spacing.sm,
    } as TextStyle,
    customBrandInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: spacing.md,
      fontSize: 16,
      color: colors.foreground,
      backgroundColor: colors.card,
    } as ViewStyle,
    inputError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    errorText: {
      fontSize: 12,
      color: colors.destructive,
      marginTop: spacing.xs,
    } as TextStyle,
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Brand</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for brand (eg. Apple)"
            placeholderTextColor={colors.mutedForeground}
            selectionColor={colors.primary}
            cursorColor={colors.primary}
            value={brandSearchQuery}
            onChangeText={setBrandSearchQuery}
          />
        </View>

        {/* Brand Grid */}
        <View style={styles.brandGrid}>
          {filteredBrands.map((brand) => (
            <TouchableOpacity
              key={brand.id}
              style={[
                styles.brandItem,
                (formData.selectedBrand === brand.name || formData.selectedBrand === brand.id) && styles.brandItemSelected,
                errors.brand && !formData.brand && styles.brandItemError,
              ]}
              onPress={() => {
                console.log('Brand clicked:', brand.name, 'ID:', brand.id);
                updateFormData('selectedBrand', brand.name);
                
                // Clear custom brand fields if selecting a regular brand
                if (brand.name !== 'other') {
                  console.log('Clearing custom brand fields for:', brand.name);
                  updateFormData('customBrandName', '');
                  updateFormData('brand', brand.name);
                  setCustomBrand('');
                  console.log('Updated form data:', {
                    selectedBrand: brand.name,
                    brand: brand.name,
                    customBrandName: ''
                  });
                }
              }}
            >
              {/* Overlay tint to ensure uniform shading over both background and image */}
              {(formData.selectedBrand === brand.name || formData.selectedBrand === brand.id) && (
                <View 
                  style={[
                    StyleSheet.absoluteFillObject, 
                    { 
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : colors.primary + '18', 
                      borderRadius: 16 
                    }
                  ]} 
                  pointerEvents="none" 
                />
              )}
              
              {brand.img_url ? (
                <Image
                  source={{ uri: brand.img_url }}
                  style={{ width: 50, height: 50, marginBottom: spacing.xs }}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.otherBrandIcon}>
                  <Text style={styles.otherBrandIconText}>+</Text>
                </View>
              )}
              <Text style={[
                styles.brandName,
                (formData.selectedBrand === brand.name || formData.selectedBrand === brand.id) && styles.brandNameSelected,
              ]}>
                {brand.name.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Custom Brand Input - Show when Other is selected */}
          {formData.selectedBrand === 'other' && (
            <View style={styles.customBrandContainer}>
              <Text style={styles.customBrandLabel}>Enter your brand name:</Text>
              <TextInput
                style={[styles.customBrandInput, errors.brand && !customBrand.trim() && styles.inputError]}
                placeholder="Type your brand name"
                placeholderTextColor={colors.mutedForeground}
                selectionColor={colors.primary}
                cursorColor={colors.primary}
                value={customBrand}
                onChangeText={(value) => {
                  console.log('Custom brand input changed:', value);
                  setCustomBrand(value);
                  updateFormData('customBrandName', value);
                  updateFormData('brand', value); // Also update the brand field
                  console.log('Updated form data:', {
                    ...formData,
                    customBrandName: value,
                    brand: value
                  });
                }}
              />
              {errors.brand && !customBrand.trim() && (
                <Text style={styles.errorText}>{errors.brand}</Text>
              )}
            </View>
          )}
        </View>
        {errors.brand && !formData.brand && (
          <Text style={styles.errorText}>{errors.brand}</Text>
        )}
      </View>
    </ScrollView>
  );
}
