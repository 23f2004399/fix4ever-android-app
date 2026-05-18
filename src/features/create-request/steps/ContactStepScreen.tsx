import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView
} from 'react-native';
import MapView, { Marker, Region, Callout } from 'react-native-maps';
import Config from 'react-native-config';
import { useTheme } from '../../../core/theme';
import { Input } from '../../../core/components';

import Icon from 'react-native-vector-icons/Feather';
import { config } from '../../../core/config';

import { FormData } from '../ServiceRequestStack';
import {
  DEFAULT_SERVICE_LOCATION,
  getServiceAreaSummaryText,
  isWithinServiceArea,
} from '../serviceArea';


interface ContactStepScreenProps {
  formData: FormData;
  updateFormData: (field: keyof FormData, value: any) => void;
  errors: Record<string, string>;
  onNext: () => void;
  onBack: () => void;
  addressQuery: string;
  setAddressQuery: (value: string) => void;
  addressPredictions: any[];
  fetchAutocomplete: (value: string) => void;
  loadingAddress: boolean;
  getCurrentLocation: () => void;
  isGettingLocation: boolean;
  locationError: string | null;
  showPopup: (title: string, message: string, variant?: 'info' | 'success' | 'warning' | 'error') => void;
}

export function ContactStepScreen({
  formData,
  updateFormData,
  errors,
  onNext,
  onBack,
  addressQuery,
  setAddressQuery,
  addressPredictions,
  fetchAutocomplete,
  loadingAddress,
  getCurrentLocation,
  isGettingLocation,
  locationError,
  showPopup,
}: ContactStepScreenProps) {
  const { colors, spacing } = useTheme();

  const defaultRegion: Region = {
    latitude: DEFAULT_SERVICE_LOCATION.latitude,
    longitude: DEFAULT_SERVICE_LOCATION.longitude,
    latitudeDelta: 0.9,
    longitudeDelta: 0.9,
  };

  const [mapRegion, setMapRegion] = useState<Region>(defaultRegion);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);

  interface NearbyVendor {
    _id: string;
    name: string;
    latitude: number;
    longitude: number;
    workingHours?: { start?: string; end?: string };
  }
  const [nearbyVendors, setNearbyVendors] = useState<NearbyVendor[]>([]);

  
  // Simple text change handler - only update parent
  const handleTextChange = (field: string, value: string) => {
    updateFormData(field as any, value);
  };

  const hasLatLong =
    Number.isFinite(formData.latitude) &&
    Number.isFinite(formData.longitude) &&
    !(formData.latitude === 1 && formData.longitude === 1);

  const selectedCoordinate = hasLatLong
    ? { latitude: formData.latitude, longitude: formData.longitude }
    : null;

  const showOutOfServiceAreaAlert = () => {
    showPopup(
      'Location Not Serviceable',
      `We currently serve locations within ${getServiceAreaSummaryText()} only.`,
      'warning'
    );
  };

  const setMapPin = (latitude: number, longitude: number): boolean => {
    if (!isWithinServiceArea(latitude, longitude)) {
      showOutOfServiceAreaAlert();
      return false;
    }

    updateFormData('latitude', latitude);
    updateFormData('longitude', longitude);
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    return true;
  };

  const reverseGeocodeLatLng = async (latitude: number, longitude: number) => {
    const geocodingKey = Config.GOOGLE_MAPS_API_KEY;

    if (!geocodingKey) {
      return;
    }

    setIsResolvingAddress(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${geocodingKey}`
      );
      if (!response.ok) {
        return;
      }

      const geocode = await response.json();
      if (geocode?.status !== 'OK' || !Array.isArray(geocode?.results) || !geocode.results.length) {
        return;
      }

      const first = geocode.results[0];
      const resolvedAddress = first?.formatted_address || '';
      const cityComponent = (first?.address_components || []).find((component: any) =>
        component?.types?.includes('locality') ||
        component?.types?.includes('administrative_area_level_3') ||
        component?.types?.includes('administrative_area_level_2') ||
        component?.types?.includes('sublocality') ||
        component?.types?.includes('postal_town')
      );

      if (resolvedAddress) {
        updateFormData('address', resolvedAddress);
        setAddressQuery(resolvedAddress);
      }
      if (cityComponent?.long_name) {
        updateFormData('city', cityComponent.long_name);
      }
    } catch (error) {
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const resolveAddressToRegion = async (inputAddress: string, placeId?: string) => {
    const geocodingKey = Config.GOOGLE_MAPS_API_KEY;

    if (!geocodingKey || !inputAddress.trim()) {
      return;
    }

    setIsResolvingAddress(true);
    try {
      const params = placeId
        ? `place_id=${encodeURIComponent(placeId)}`
        : `address=${encodeURIComponent(inputAddress)}`;
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?${params}&key=${geocodingKey}`
      );
      if (!response.ok) {
        return;
      }

      const geocode = await response.json();
      if (geocode?.status !== 'OK' || !Array.isArray(geocode?.results) || !geocode.results.length) {
        return;
      }

      const first = geocode.results[0];
      const location = first?.geometry?.location;
      const latitude = Number(location?.lat);
      const longitude = Number(location?.lng);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const wasPinUpdated = setMapPin(latitude, longitude);
      if (!wasPinUpdated) {
        return;
      }

      const cityComponent = (first?.address_components || []).find((component: any) =>
        component?.types?.includes('locality') ||
        component?.types?.includes('administrative_area_level_2') ||
        component?.types?.includes('postal_town')
      );
      if (cityComponent?.long_name && !formData.city) {
        updateFormData('city', cityComponent.long_name);
      }
    } catch (e) {
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const onAddressChange = (value: string) => {
    handleTextChange('address', value);
    setAddressQuery(value);
    fetchAutocomplete(value);
  };

  const onSelectPrediction = async (item: any) => {
    const selectedAddress = item?.description || '';
    updateFormData('address', selectedAddress);
    setAddressQuery(selectedAddress);
    fetchAutocomplete('');
    Keyboard.dismiss();
    await resolveAddressToRegion(selectedAddress, item?.place_id);
  };

  const handleMapPress = async (event: any) => {
    const coordinate = event?.nativeEvent?.coordinate;
    const latitude = Number(coordinate?.latitude);
    const longitude = Number(coordinate?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const wasPinUpdated = setMapPin(latitude, longitude);
    if (!wasPinUpdated) {
      return;
    }
    await reverseGeocodeLatLng(latitude, longitude);
  };

  const handleMarkerDragEnd = async (event: any) => {
    const coordinate = event?.nativeEvent?.coordinate;
    const latitude = Number(coordinate?.latitude);
    const longitude = Number(coordinate?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const wasPinUpdated = setMapPin(latitude, longitude);
    if (!wasPinUpdated) {
      return;
    }
    await reverseGeocodeLatLng(latitude, longitude);
  };

  useEffect(() => {
    if (!hasLatLong) {
      return;
    }

    setMapRegion({
      latitude: formData.latitude,
      longitude: formData.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  }, [formData.latitude, formData.longitude, hasLatLong]);

  useEffect(() => {
  }, [mapRegion]);

  useEffect(() => {
  }, [selectedCoordinate, hasLatLong]);

  useEffect(() => {
    if (formData.serviceType !== 'visit-shop' || !hasLatLong) {
      setNearbyVendors([]);
      return;
    }
    const fetchNearby = async () => {
      try {
        const res = await fetch(
          `${config.API_BASE_URL}/vendors/nearby?lat=${formData.latitude}&lng=${formData.longitude}&radius=15`
        );
        const json = await res.json();
        if (json.success) setNearbyVendors(json.vendors);
      } catch {}
    };
    fetchNearby();
  }, [formData.serviceType, formData.latitude, formData.longitude, hasLatLong]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    } as ViewStyle,
    content: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxl,
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
    optionsGrid: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
      marginBottom: spacing.md,
    } as ViewStyle,
    optionButton: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      padding: spacing.md,
      alignItems: 'center' as const,
      minHeight: 60,
      justifyContent: 'center' as const,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    } as ViewStyle,
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    } as ViewStyle,
    optionButtonError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    optionText: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
    } as TextStyle,
    optionTextSelected: {
      color: colors.primaryForeground,
    } as TextStyle,
    suggestionsContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: 200,
      zIndex: 1000,
    } as ViewStyle,
    suggestionItem: {
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    } as ViewStyle,
    suggestionText: {
      fontSize: 14,
      color: colors.foreground,
    } as TextStyle,
    locationSection: {
      marginTop: spacing.md,
    } as ViewStyle,
    locationLabel: {
      fontSize: 16,
      fontWeight: '500' as const,
      color: colors.foreground,
      marginBottom: spacing.sm,
    } as TextStyle,
    locationButton: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: spacing.md,
      gap: spacing.sm,
    } as ViewStyle,
    locationButtonDisabled: {
      opacity: 0.6,
    } as ViewStyle,
    locationButtonText: {
      fontSize: 16,
      color: colors.foreground,
    } as TextStyle,
    locationButtonTextDisabled: {
      color: colors.mutedForeground,
    } as TextStyle,
    locationError: {
      fontSize: 14,
      color: colors.destructive,
      marginTop: spacing.sm,
    } as TextStyle,
    locationDetailsCard: {
      marginTop: spacing.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    } as ViewStyle,
    locationDetailsCardError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as ViewStyle,
    locationDetailsTitle: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: spacing.sm,
      textAlign: 'center' as const,
    } as TextStyle,
    searchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    } as ViewStyle,
    searchInput: {
      flex: 1,
      height: 48,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 24,
      paddingHorizontal: spacing.md,
      color: colors.foreground,
      backgroundColor: colors.background,
      fontSize: 15,
    } as TextStyle,
    searchInputError: {
      borderColor: colors.destructive,
      borderWidth: 1.5,
    } as TextStyle,
    currentLocationIconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.primary,
    } as ViewStyle,
    miniMapContainer: {
      borderRadius: 12,
      overflow: 'hidden' as const,
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle,
    miniMap: {
      width: '100%',
      height: 220,
    } as ViewStyle,
    mapOverlay: {
      position: 'absolute' as const,
      top: spacing.sm,
      right: spacing.sm,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    } as ViewStyle,
    mapOverlayText: {
      fontSize: 12,
      color: colors.foreground,
      fontWeight: '500' as const,
    } as TextStyle,
    mapLoadingOverlay: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.card,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.sm,
    } as ViewStyle,
    mapLoadingText: {
      fontSize: 13,
      color: colors.mutedForeground,
      fontWeight: '500' as const,
    } as TextStyle,
    mapHelp: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center' as const,
    } as TextStyle,
    locationSuccessCard: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 16,
      backgroundColor: '#EAF4FF',
      borderWidth: 1,
      borderColor: '#B8D7FF',
    } as ViewStyle,
    locationSuccessTitle: {
      fontSize: 14,
      color: '#0B5CAB',
      fontWeight: '600' as const,
      marginBottom: 2,
      textAlign: 'center' as const,
    } as TextStyle,
    locationSuccessText: {
      fontSize: 12,
      color: '#0B5CAB',
      textAlign: 'center' as const,
    } as TextStyle,
    mapHint: {
      marginTop: spacing.xs,
      fontSize: 12,
      color: colors.mutedForeground,
    } as TextStyle,
    vendorCallout: {
      width: 160,
      padding: 8,
      borderRadius: 8,
      backgroundColor: colors.card,
    } as ViewStyle,
    vendorCalloutName: {
      fontSize: 13,
      fontWeight: '700' as const,
      color: colors.foreground,
      marginBottom: 2,
    } as TextStyle,
    vendorCalloutHours: {
      fontSize: 11,
      color: colors.mutedForeground,
    } as TextStyle,
    vendorsBanner: {
      marginTop: spacing.xs,
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: 8,
      backgroundColor: colors.muted,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.xs,
    } as ViewStyle,
    vendorsBannerText: {
      fontSize: 12,
      color: colors.mutedForeground,
    } as TextStyle,
  });

  const renderLocationPicker = () => {
    const hasLocationFieldError = Boolean(errors.address || errors.city || errors.location);
    return (
    <View style={[styles.locationDetailsCard, hasLocationFieldError && styles.locationDetailsCardError]}>
      <Text style={styles.locationDetailsTitle}>Location Details</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, errors.address && styles.searchInputError]}
          value={addressQuery || formData.address}
          onChangeText={onAddressChange}
          placeholder="Search for a location or address..."
          placeholderTextColor={colors.mutedForeground}
        />
        <TouchableOpacity
          style={styles.currentLocationIconButton}
          onPress={getCurrentLocation}
          disabled={isGettingLocation}
        >
          {isGettingLocation ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Icon name="map-pin" size={18} color={colors.primaryForeground} />
          )}
        </TouchableOpacity>
      </View>

      {addressPredictions && addressPredictions.length > 0 && (
        <ScrollView
          style={styles.suggestionsContainer}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          {addressPredictions.map((item: any, index: number) => (
            <TouchableOpacity
              key={item.place_id || `${item.description}-${index}`}
              style={styles.suggestionItem}
              onPress={() => onSelectPrediction(item)}
            >
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item.description}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.miniMapContainer}>
        <MapView
          style={styles.miniMap}
          provider="google"
          initialRegion={mapRegion}
          region={mapRegion}
          onPress={handleMapPress}
          onMapReady={() => setIsMapLoading(false)}
          onMapLoaded={() => setIsMapLoading(false)}
          onRegionChangeComplete={() => {}}
          zoomEnabled
          scrollEnabled
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
        >
          {selectedCoordinate && (
            <Marker
              coordinate={selectedCoordinate}
              draggable
              onDragEnd={handleMarkerDragEnd}
            />
          )}
          {formData.serviceType === 'visit-shop' && nearbyVendors.map(vendor => (
            <Marker
              key={String(vendor._id)}
              coordinate={{ latitude: vendor.latitude, longitude: vendor.longitude }}
              pinColor="#E67E22"
            >
              <Callout tooltip>
                <View style={styles.vendorCallout}>
                  <Text style={styles.vendorCalloutName}>{vendor.name}</Text>
                  {vendor.workingHours?.start && vendor.workingHours?.end && (
                    <Text style={styles.vendorCalloutHours}>
                      {vendor.workingHours.start} – {vendor.workingHours.end}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
        {isMapLoading && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.mapLoadingText}>Loading map...</Text>
          </View>
        )}
        {!isMapLoading && (
          <View style={styles.mapOverlay}>
            <Text style={styles.mapOverlayText}>Tap map to drop pin</Text>
          </View>
        )}
      </View>

      <Text style={styles.mapHelp}>
        Tip: Search, tap the map, drag the pin, or use current location in serviceable areas.
      </Text>
      {formData.serviceType === 'visit-shop' && hasLatLong && (
        <View style={styles.vendorsBanner}>
          <Icon name="map-pin" size={12} color="#E67E22" />
          <Text style={styles.vendorsBannerText}>
            {nearbyVendors.length > 0
              ? `${nearbyVendors.length} Fix4Ever shop${nearbyVendors.length > 1 ? 's' : ''} within 15 km — tap orange pins to see details`
              : 'No Fix4Ever shops found within 15 km of your location'}
          </Text>
        </View>
      )}
      {selectedCoordinate && (
        <View style={styles.locationSuccessCard}>
          <Text style={styles.locationSuccessTitle}>Location captured successfully!</Text>
          <Text style={styles.locationSuccessText}>
            Coordinates: {selectedCoordinate.latitude.toFixed(6)}, {selectedCoordinate.longitude.toFixed(6)}
          </Text>
        </View>
      )}
      {(isResolvingAddress || locationError) && (
        <Text style={styles.mapHint}>
          {isResolvingAddress ? 'Resolving selected location...' : locationError}
        </Text>
      )}
      {!!errors.address && <Text style={styles.locationError}>{errors.address}</Text>}
      {!!errors.city && <Text style={styles.locationError}>{errors.city}</Text>}
      {!!errors.location && <Text style={styles.locationError}>{errors.location}</Text>}
    </View>
    );
  };

  return (
    <ScrollView
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>Request Type</Text>
        <View style={styles.optionsGrid}>
          {['self', 'other'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                errors.requestType && styles.optionButtonError,
                formData.requestType === type && styles.optionButtonSelected,
              ]}
              onPress={() => updateFormData('requestType', type as 'self' | 'other')}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.requestType === type && styles.optionTextSelected,
                ]}
              >
                {type === 'self' ? 'For Myself' : 'For Someone Else'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!errors.requestType && <Text style={styles.locationError}>{errors.requestType}</Text>}

        <Text style={styles.sectionTitle}>Service Type</Text>
        <View style={styles.optionsGrid}>
          {[
            { id: 'pickup-drop', label: 'Pickup & Drop' },
            { id: 'visit-shop', label: 'Visit Shop' },
            { id: 'onsite', label: 'Onsite' },
          ].map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionButton,
                errors.serviceType && styles.optionButtonError,
                formData.serviceType === type.id && styles.optionButtonSelected,
              ]}
              onPress={() => updateFormData('serviceType', type.id as any)}
            >
              <Text
                style={[
                  styles.optionText,
                  formData.serviceType === type.id && styles.optionTextSelected,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!!errors.serviceType && <Text style={styles.locationError}>{errors.serviceType}</Text>}

        {formData.requestType === 'self' ? (
          <>
            <Input
              label="Your Name"
              value={formData.userName}
              onChangeText={(value: string) => handleTextChange('userName', value)}
              placeholder="Enter your full name"
              error={errors.userName}
              keyboardType="default"
            />
            <Input
              label="Phone Number"
              value={formData.userPhone}
              onChangeText={(value: string) => handleTextChange('userPhone', value)}
              placeholder="Enter your 10-digit phone number"
              error={errors.userPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {renderLocationPicker()}
          </>
        ) : (
          <>
            <Input
              label="Beneficiary Name"
              value={formData.beneficiaryName}
              onChangeText={(value: string) => handleTextChange('beneficiaryName', value)}
              error={errors.beneficiaryName}
              placeholder="Enter beneficiary's full name"
            />
            <Input
              label="Beneficiary Phone Number"
              value={formData.beneficiaryPhone}
              onChangeText={(value: string) => handleTextChange('beneficiaryPhone', value)}
              error={errors.beneficiaryPhone}
              placeholder="Enter beneficiary's 10-digit phone number"
              keyboardType="phone-pad"
              maxLength={10}
            />
            {renderLocationPicker()}
          </>
        )}
      </View>
    </View>
  </View>
    </ScrollView>
);
}
