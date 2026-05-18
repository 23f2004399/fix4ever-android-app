import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,

 } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
//import { createStackNavigator } from '@react-navigation/stack';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Feather';
import { request } from '../../core/api';
import { useRoute } from '@react-navigation/native';
import Geolocation from 'react-native-geolocation-service';
import axios from 'axios';
import Config from 'react-native-config';

import { config } from '../../core/config';
const base = config.API_BASE_URL;

import { getStoredToken } from '../../core/storage';
import {
  DraftServiceRequest,
  getDraftServiceRequestById,
  saveDraftServiceRequest,
} from '../../core/api';

// Response interface for service request creation
interface ServiceRequestResponse {
  success: boolean;
  message?: string;
  data?: any;
}

import {
  ContactStepScreen,
  BrandStepScreen,
  ModelStepScreen,
  ProblemStepScreen,
  DateTimeStepScreen,
  ImagesStepScreen,
  ReviewStepScreen,
} from './steps';
import { Button } from '../../core/components';
import { ThemedAlertDialog } from '../../core/components/ThemedAlertDialog';
import { useTheme } from '../../core/theme';
import { useAuth } from '../../lib/contexts/auth-context';
import { getProblemPricingFromSelection } from '../../lib/service-pricing';
import {
  getServiceAreaSummaryText,
  isWithinServiceArea,
} from './serviceArea';

export interface FormData {
  requestType: "self" | 'other';
  serviceType: "pickup-drop" | 'visit-shop' | 'onsite';
  userName: string;
  userPhone: string;
  beneficiaryName: string;
  beneficiaryPhone: string;
  knowsProblem: boolean;
  problemType: string;
  issueLevel: any;
  problemDescription: string;
  warrantyOption: 'none' | '30days' | '3months';
  urgencyLevel: 'normal' | 'express' | 'urgent';
  dataSafety: boolean;
  selectedDate: string | null;
  selectedTimeSlot: string | null;
  preferredDate: string | null;
  preferredTime: string | null;
  address: string;
  latitude: number;
  longitude: number;
  city: string;
  brand: string;
  model: string;
  issueImages: File[];
  selectedBrand: string;
  deviceType: string;
  customBrandName: string;
  selectedModel: string;
  mainProblem: Record<string, string>;
  subProblem: Record<string, string>;
  relationalBehaviors: Record<string, string>[];
}

const DEVICE_TYPES = ['Laptop'];
// Issue level interface
interface IssueLevel {
  id: string;
  name: string;
  description: string;
  price: number;
}


interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

interface ServiceRequestStackProps {
  // updateFormData: (field: keyof FormData, value: any) => void;
  // addressQuery: string;
  // setAddressQuery: (value: string) => void;
  // addressPredictions: any[];
  // fetchAutocomplete: (value: string) => void;
  // loadingAddress: boolean;
  // calculatedPricing: any;
  navigation: any;
}

const Stack = createNativeStackNavigator();

// TIME_SLOTS constant for time slot selection
const TIME_SLOTS = [
  { id: '09:00-12:00', label: '9:00 AM - 12:00 PM' },
  { id: '12:00-15:00', label: '12:00 PM - 3:00 PM' },
  { id: '15:00-18:00', label: '3:00 PM - 6:00 PM' },
];

// Helper function to get step index from route name
const getStepIndex = (routeName: string): number => {
  const steps = ['Contact', 'Brand', 'Model', 'Problem', 'DateTime', 'Images', 'Review'];
  return steps.indexOf(routeName);
};

const getStepNameByIndex = (stepIndex: number): string | null => {
  const steps = ['Contact', 'Brand', 'Model', 'Problem', 'DateTime', 'Images', 'Review'];
  return steps[stepIndex] || null;
};

// STEPS constant for header titles
const STEPS = [
  { id: 'contact', title: 'Contact & Request' },
  { id: 'brand', title: 'Brand' },
  { id: 'model', title: 'Model' },
  { id: 'problem', title: 'Problem' },
  { id: 'datetime', title: 'Date & Time' },
  { id: 'images', title: 'Images' },
  { id: 'review', title: 'Review' },
];

const mapUrgencyToPriority = (
  urgency: 'normal' | 'express' | 'urgent'
): 'low' | 'medium' | 'high' | 'urgent' => {
  if (urgency === 'urgent') {
    return 'urgent';
  }
  if (urgency === 'express') {
    return 'high';
  }
  return 'medium';
};

const resolveDraftId = (draft: any): string | null => {
  if (!draft) {
    return null;
  }
  return draft._id || draft.id || draft.draftId || null;
};

const STACK_STEP_NAMES = ['Contact', 'Brand', 'Model', 'Problem', 'DateTime', 'Images', 'Review'] as const;

const STEP_KEY_TO_SCREEN: Record<string, (typeof STACK_STEP_NAMES)[number]> = {
  contact: 'Contact',
  brand: 'Brand',
  model: 'Model',
  problem: 'Problem',
  datetime: 'DateTime',
  dateTime: 'DateTime',
  images: 'Images',
  review: 'Review',
  schedule: 'DateTime',
};

const resolveDraftStepScreen = (draft: DraftServiceRequest): (typeof STACK_STEP_NAMES)[number] => {
  const key = String(draft.currentStepKey || '').trim();
  if (key && STEP_KEY_TO_SCREEN[key]) {
    return STEP_KEY_TO_SCREEN[key];
  }

  const idx = Number(draft.currentStep);
  if (Number.isFinite(idx)) {
    const safeIdx = Math.max(0, Math.min(STACK_STEP_NAMES.length - 1, idx));
    return STACK_STEP_NAMES[safeIdx];
  }

  return 'Contact';
};

// Custom Header Component
const StepHeader = ({ onClose, routeName }: { onClose: () => void; routeName: string }) => {
  const { colors, spacing, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const stepIndex = getStepIndex(routeName);
  const title = `${stepIndex + 1}/7 ${STEPS[stepIndex]?.title || 'Service Request'}`;

  return (
    <View style={{
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md + insets.top,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: spacing.sm,
        marginBottom: spacing.sm,
      }}>
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.full,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Icon name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 12,
            fontWeight: '700' as const,
            color: colors.mutedForeground,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 2,
          }}>
            Request Flow
          </Text>
          <Text style={{
            fontSize: 18,
            fontWeight: '700' as const,
            color: colors.foreground,
          }}>
            {title}
          </Text>
        </View>
      </View>
      <View style={{
        height: 6,
        borderRadius: borderRadius.full,
        backgroundColor: colors.muted,
        overflow: 'hidden',
      }}>
        <View style={{
          width: `${Math.max(1, stepIndex + 1) * 100 / STEPS.length}%`,
          height: '100%',
          borderRadius: borderRadius.full,
          backgroundColor: colors.primary,
        }} />
      </View>
    </View>
  );
};

export function ServiceRequestStack({
  // addressQuery,
  // setAddressQuery,
  // addressPredictions,
  // fetchAutocomplete,
  // loadingAddress,
  // calculatedPricing,
  navigation,
}: ServiceRequestStackProps) {
  const { colors, spacing } = useTheme();
  const route = useRoute<any>();
  const draftIdFromRoute = route?.params?.draftId as string | undefined;

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(draftIdFromRoute || null);
  const [isLoadingDraft, setIsLoadingDraft] = useState<boolean>(Boolean(draftIdFromRoute));
  const [initialStepName, setInitialStepName] = useState<(typeof STACK_STEP_NAMES)[number]>('Contact');
  const activeDraftIdRef = useRef<string | null>(draftIdFromRoute || null);
  const isDraftCreateInFlightRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const lastSavedStepIndexRef = useRef<number>(-1);

  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // search query state
  const [searchQuery, setSearchQuery] = useState('');
  const [customBrand, setCustomBrand] = useState('');


  // Location states
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [popup, setPopup] = useState<{
    title: string;
    message: string;
    variant?: 'info' | 'success' | 'warning' | 'error';
  } | null>(null);

  const [serviceTypeOverrideModal, setServiceTypeOverrideModal] = useState<{
    level: 'L2' | 'L3';
    navigationFn: () => void;
  } | null>(null);


  // Address autocomplete state
  const [addressQuery, setAddressQuery] = useState('');
  const [addressPredictions, setAddressPredictions] = useState<any[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);

  const { user } = useAuth();

  const [formData, setFormData] = useState<FormData>({
      // Enhanced user contact and request details
      requestType: 'self' as "self" | 'other',
      serviceType: 'pickup-drop' as "pickup-drop" | 'visit-shop' | 'onsite',
      userName: user?.username || '',
      userPhone: user?.phone || '',
      beneficiaryName: '',
      beneficiaryPhone: '',
      // Problem knowledge fields
      knowsProblem: true as boolean,
      problemType: '',
      issueLevel: { id: 'moderate', name: 'Moderate', description: '', price: 500 } as IssueLevel,
      problemDescription: '',
      // Warranty and urgency
      warrantyOption: 'none' as 'none' | '30days' | '3months',
      urgencyLevel: 'normal' as 'normal' | 'express' | 'urgent',
      dataSafety: true as boolean,
      // Date and time
      selectedDate: "" as string | null,
      selectedTimeSlot: "" as string | null,
      preferredDate: "" as string | null,
      preferredTime: "" as string | null,
      // Location
      address: '',
      latitude: 1,
      longitude: 1,
      city: '',
      // Device details
      brand: '',
      model: '',
      issueImages: [] as File[],
      selectedBrand: '',
      deviceType: 'Laptop',
      customBrandName: '',
      selectedModel: '',
      mainProblem: {},
      subProblem: {},
      relationalBehaviors: []
    });

  const calculatedPricing = useMemo(() => {
    const selectedProblemPricing = formData.knowsProblem
      ? getProblemPricingFromSelection({
          mainProblemCategory: formData.mainProblem?.title || formData.problemType || '',
          subProblem: formData.subProblem?.title || '',
          relatedBehavior: formData.relationalBehaviors[0]?.title || '',
        })
      : null;

    return (
      selectedProblemPricing || {
        displayLabel: '₹500 - ₹1,500',
        finalChargeRange: { min: 500, max: 1500 },
        breakdown: ['Estimated price range'],
        matched: false,
        requiresManualQuote: false,
      }
    );
  }, [
    formData.knowsProblem,
    formData.mainProblem,
    formData.problemType,
    formData.relationalBehaviors,
    formData.subProblem,
  ]);

  const getIssueLevelForPayload = useCallback(() => {
    const raw =
      typeof formData.issueLevel === 'string'
        ? formData.issueLevel
        : formData.issueLevel?.id || formData.issueLevel?.name || 'hardware';

    const normalized = String(raw).toLowerCase();
    if (normalized.includes('software')) {
      return 'software';
    }
    if (normalized.includes('board') || normalized.includes('motherboard')) {
      return 'board';
    }
    return 'hardware';
  }, [formData.issueLevel]);

  const draftPayload = useMemo(
    () => ({
      address: formData.address,
      city: formData.city,
      brand: formData.brand,
      model: formData.model,
      problemDescription: formData.problemDescription,
      userName: formData.userName,
      userPhone: formData.userPhone,
      requestType: formData.requestType,
      serviceType: formData.serviceType,
      beneficiaryName: formData.beneficiaryName,
      beneficiaryPhone: formData.beneficiaryPhone,
      preferredDate: formData.preferredDate || undefined,
      preferredTime: formData.preferredTime || undefined,
      selectedDate: formData.selectedDate || undefined,
      selectedTimeSlot: formData.selectedTimeSlot || undefined,
      priority: mapUrgencyToPriority(formData.urgencyLevel),
      isUrgent: formData.urgencyLevel === 'urgent',
      issueLevel: getIssueLevelForPayload(),
      urgency: formData.urgencyLevel === 'normal' ? 'standard' : formData.urgencyLevel,
      wantsWarranty: formData.warrantyOption !== 'none',
      wantsDataSafety: formData.dataSafety,
      calculatedPricing,
      selectedProblem: {
        mainProblem: formData.mainProblem,
        subProblem: formData.subProblem,
        relationalBehaviors: formData.relationalBehaviors,
      },
      problemType: formData.problemType,
      knowsProblem: formData.knowsProblem,
      location: {
        address: formData.address,
        lat: formData.latitude,
        lng: formData.longitude,
        latitude: formData.latitude,
        longitude: formData.longitude,
      },
      issueImages: formData.issueImages
        .map((img: any) => img?.uri)
        .filter((uri: string | undefined): uri is string => Boolean(uri)),
    }),
    [calculatedPricing, formData, getIssueLevelForPayload]
  );

  const setResolvedDraftId = useCallback((draftId: string | null) => {
    activeDraftIdRef.current = draftId;
    setActiveDraftId(draftId);
  }, []);

  const handleCloseFlow = useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    navigation?.navigate?.('Main');
  }, [navigation]);

  const saveDraftProgress = useCallback(
    async (stepIndex: number) => {
      const payloadCore = { ...draftPayload };
      const payloadFingerprint = JSON.stringify(payloadCore);
      const payload: Record<string, any> = {
        ...payloadCore,
      };

      const currentDraftId = activeDraftIdRef.current;

      // If user is moving through previously-saved steps without any edits, skip save.
      if (
        currentDraftId &&
        payloadFingerprint === lastSavedFingerprintRef.current &&
        stepIndex <= lastSavedStepIndexRef.current
      ) {
        return;
      }

      // While initial draft create request is pending, don't enqueue extra saves.
      if (!currentDraftId && isDraftCreateInFlightRef.current) {
        return;
      }

      const effectiveStepIndex = currentDraftId
        ? Math.max(stepIndex, lastSavedStepIndexRef.current)
        : stepIndex;

      payload.currentStep = effectiveStepIndex;
      payload.currentStepKey = STEPS[effectiveStepIndex]?.id || 'contact';

      if (currentDraftId) {
        payload.draftId = currentDraftId;
      } else {
        // Create at most one draft while id is still being resolved.
        payload.createNew = !isDraftCreateInFlightRef.current;
      }

      if (payload.createNew) {
        isDraftCreateInFlightRef.current = true;
      }

      const response = await saveDraftServiceRequest(payload);
      if (response.error) {
        if (payload.createNew) {
          isDraftCreateInFlightRef.current = false;
        }
        return;
      }

      const savedDraft = response.data?.draft || response.data?.data?.draft;
      const savedDraftId =
        resolveDraftId(savedDraft) ||
        resolveDraftId((response.data as any)?.data) ||
        ((response.data as any)?.draftId as string | undefined) ||
        null;

      const savedStepRaw = Number(savedDraft?.currentStep);
      const savedStep = Number.isFinite(savedStepRaw) ? savedStepRaw : effectiveStepIndex;
      lastSavedStepIndexRef.current = Math.max(lastSavedStepIndexRef.current, savedStep);
      lastSavedFingerprintRef.current = payloadFingerprint;

      if (savedDraftId) {
        setResolvedDraftId(savedDraftId);
        isDraftCreateInFlightRef.current = false;
      } else if (payload.createNew) {
        isDraftCreateInFlightRef.current = false;
      }
    },
    [draftPayload, setResolvedDraftId]
  );

  const hydrateFormDataFromDraft = useCallback((draft: DraftServiceRequest) => {
    const selectedProblem =
      typeof draft.selectedProblem === 'string'
        ? (() => {
            try {
              return JSON.parse(draft.selectedProblem);
            } catch {
              return {};
            }
          })()
        : draft.selectedProblem || {};

    setFormData((prev) => ({
      ...prev,
      requestType: draft.requestType || prev.requestType,
      serviceType: draft.serviceType || prev.serviceType,
      userName: draft.userName || prev.userName,
      userPhone: draft.userPhone || prev.userPhone,
      beneficiaryName: draft.beneficiaryName || prev.beneficiaryName,
      beneficiaryPhone: draft.beneficiaryPhone || prev.beneficiaryPhone,
      knowsProblem:
        typeof draft.knowsProblem === 'boolean' ? draft.knowsProblem : prev.knowsProblem,
      problemType: draft.problemType || prev.problemType,
      issueLevel: draft.issueLevel || prev.issueLevel,
      problemDescription: draft.problemDescription || prev.problemDescription,
      urgencyLevel:
        draft.urgency === 'urgent'
          ? 'urgent'
          : draft.urgency === 'express'
          ? 'express'
          : prev.urgencyLevel,
      dataSafety:
        typeof draft.wantsDataSafety === 'boolean' ? draft.wantsDataSafety : prev.dataSafety,
      selectedDate: draft.selectedDate || prev.selectedDate,
      selectedTimeSlot: draft.selectedTimeSlot || prev.selectedTimeSlot,
      preferredDate: draft.preferredDate || prev.preferredDate,
      preferredTime: draft.preferredTime || prev.preferredTime,
      address: draft.address || prev.address,
      latitude:
        draft.location?.lat ||
        draft.location?.latitude ||
        draft.latitude ||
        prev.latitude,
      longitude:
        draft.location?.lng ||
        draft.location?.longitude ||
        draft.longitude ||
        prev.longitude,
      city: draft.city || prev.city,
      brand: draft.brand || prev.brand,
      model: draft.model || prev.model,
      selectedBrand: draft.brand || prev.selectedBrand,
      selectedModel: draft.model || prev.selectedModel,
      mainProblem: selectedProblem?.mainProblem || prev.mainProblem,
      subProblem: selectedProblem?.subProblem || prev.subProblem,
      relationalBehaviors:
        selectedProblem?.relationalBehaviors || prev.relationalBehaviors,
    }));
    setAddressQuery(draft.address || '');
  }, []);

  useEffect(() => {
    if (!draftIdFromRoute) {
      setResolvedDraftId(null);
      isDraftCreateInFlightRef.current = false;
      lastSavedFingerprintRef.current = null;
      lastSavedStepIndexRef.current = -1;
      setInitialStepName('Contact');
      setIsLoadingDraft(false);
      return;
    }

    const loadDraftById = async () => {
      setIsLoadingDraft(true);
      const response = await getDraftServiceRequestById(draftIdFromRoute);
      const draft = response.data?.draft || response.data?.data?.draft;
      if (draft) {
        hydrateFormDataFromDraft(draft);
        setInitialStepName(resolveDraftStepScreen(draft));
        const loadedDraftId = resolveDraftId(draft) || draftIdFromRoute;
        setResolvedDraftId(loadedDraftId);
        const loadedStepRaw = Number(draft.currentStep);
        lastSavedStepIndexRef.current = Number.isFinite(loadedStepRaw)
          ? loadedStepRaw
          : STACK_STEP_NAMES.indexOf(resolveDraftStepScreen(draft));
        isDraftCreateInFlightRef.current = false;
      }
      setIsLoadingDraft(false);
    };

    loadDraftById();
  }, [draftIdFromRoute, hydrateFormDataFromDraft, setResolvedDraftId]);

  // Seed fingerprint after draft hydration so unchanged back/forward navigation doesn't resave.
  useEffect(() => {
    if (!activeDraftIdRef.current || isLoadingDraft) {
      return;
    }
    if (!lastSavedFingerprintRef.current) {
      lastSavedFingerprintRef.current = JSON.stringify(draftPayload);
    }
  }, [draftPayload, isLoadingDraft]);



    
      // Debounce utility
      const debounce = (func: Function, wait: number) => {
        let timeout: ReturnType<typeof setTimeout>;
        return function executedFunction(...args: any[]) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      };
    
      // Address autocomplete
      const fetchAutocomplete = useCallback(
        debounce(async (query: string) => {
          if (!query.trim()) {
            setAddressPredictions([]);
            return;
          }

          const placesKey = Config.GOOGLE_MAPS_API_KEY;
          if (!placesKey) {
            setAddressPredictions([]);
            return;
          }
    
          setLoadingAddress(true);
          try {
            const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
              query
            )}&key=${placesKey}&language=en&components=country:in`;

            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Autocomplete request failed with status ${response.status}`);
            }

            const data = await response.json();
            if (data?.status === 'OK' && Array.isArray(data?.predictions)) {
              const predictions = data.predictions.map((item: any) => ({
                place_id: item.place_id,
                description: item.description,
              }));
              setAddressPredictions(predictions);
            } else {
              setAddressPredictions([]);
            }
          } catch (error) {
            setAddressPredictions([]);
          } finally {
            setLoadingAddress(false);
          }
        }, 300),
        []
      );
    
    
    
       
    
    // Helper functions
      const updateFormData = useCallback((field: keyof FormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        const hasText = (v: any) => typeof v === 'string' && v.trim().length > 0;

        setErrors(prevErrors => {
          if (!prevErrors || Object.keys(prevErrors).length === 0) {
            return prevErrors;
          }

          const nextErrors = { ...prevErrors };

          const clearError = (key: string) => {
            if (nextErrors[key]) {
              delete nextErrors[key];
            }
          };

          switch (field) {
            case 'requestType':
              if (value) {
                clearError('requestType');
              }
              break;
            case 'serviceType':
              if (value) {
                clearError('serviceType');
              }
              break;
            case 'userName':
              if (hasText(value)) {
                clearError('userName');
              }
              break;
            case 'userPhone':
              if (typeof value === 'string' && /^\d{10}$/.test(value)) {
                clearError('userPhone');
              }
              break;
            case 'beneficiaryName':
              if (hasText(value)) {
                clearError('beneficiaryName');
              }
              break;
            case 'beneficiaryPhone':
              if (typeof value === 'string' && /^\d{10}$/.test(value)) {
                clearError('beneficiaryPhone');
              }
              break;
            case 'address':
              if (hasText(value)) {
                clearError('address');
              }
              break;
            case 'city':
              if (hasText(value)) {
                clearError('city');
              }
              break;
            case 'latitude':
            case 'longitude':
              if (Number.isFinite(Number(value))) {
                clearError('location');
              }
              break;
            case 'brand':
              if (hasText(value)) {
                clearError('brand');
              }
              break;
            case 'model':
              if (hasText(value)) {
                clearError('model');
              }
              break;
            case 'mainProblem':
              if (value?.title) {
                clearError('mainProblem');
              }
              break;
            case 'subProblem':
              if (value?.title) {
                clearError('subProblem');
              }
              break;
            case 'relationalBehaviors':
              if (Array.isArray(value) && value.length > 0) {
                clearError('relationalBehaviors');
              }
              break;
            case 'problemDescription':
              if (hasText(value)) {
                clearError('problemDescription');
              }
              break;
            case 'preferredDate':
              if (hasText(value)) {
                clearError('preferredDate');
              }
              break;
            case 'preferredTime':
              if (hasText(value)) {
                clearError('preferredTime');
              }
              break;
            default:
              break;
          }

          return Object.keys(nextErrors).length === Object.keys(prevErrors).length
            ? prevErrors
            : nextErrors;
        });
      }, []);

    const getAllBrands = async () => {
      try {
        setLoading(true);
        const response = await request<ApiResponse<any>>(
          `/brands`,
          {
            method: 'POST',
            body: {device: 'laptop'},
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.data?.success) {
          const brands = response.data.data.map((brand: any, index: number) => {
            brand.key = brand.key;
            brand.name = brand.key.split("/").at(-1).split("-").at(0);
            brand.img_url = brand.url;
            brand.id = brand.key || index.toString();
            return brand;
          })
          setBrands(brands);
        }
      } catch (error) {
        setError('Failed to fetch brands request');
      } finally {
        setLoading(false);
      }
    };

    const getBrandModels = async (brandOverride?: string) => {
      const brandToFetch = (brandOverride || formData.brand || '').trim();
      if (!brandToFetch) {
        return;
      }

      try {
        setLoading(true);
        const response = await request<ApiResponse<any>>(
          `/models`,
          {
            method: 'POST',
            body: {device: 'laptop', brand: brandToFetch},
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.data?.success) {
          
          const models = response.data.data.map((model: any, index: number) => {
            model.key = model.key;
            model.name = model.key.split("/").at(-1).split(".").at(0);
            model.id = index.toString();
            return model;
          })
          setModels(models);
        }

      } catch (error) {
        setError('Failed to fetch models request');
      } finally {
        setLoading(false);
      }
    }

    // When reopening a draft directly on Model (or later), preload dependencies.
    useEffect(() => {
      if (!draftIdFromRoute || isLoadingDraft) {
        return;
      }

      const stepIndex = STACK_STEP_NAMES.indexOf(initialStepName);
      if (stepIndex >= 1 && brands.length === 0) {
        void getAllBrands();
      }

      if (stepIndex >= 2 && models.length === 0 && formData.brand) {
        void getBrandModels(formData.brand);
      }
    }, [
      brands.length,
      draftIdFromRoute,
      formData.brand,
      initialStepName,
      isLoadingDraft,
      models.length,
    ]);


  // Location permission and geolocation
  const requestLocationPermission = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      try {
        const status = await Geolocation.requestAuthorization('whenInUse');
        return status === 'granted';
      } catch (error) {
        return false;
      }
    } else {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Access Required',
            message: 'This app needs to access your location to provide better service.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
  };

  const resolveLocationDetails = async (latitude: number, longitude: number) => {
    let resolvedAddress = `Location detected at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    let resolvedCity = '';

    try {
      const geocodingKey = Config.GOOGLE_MAPS_API_KEY;

      if (!geocodingKey) {
        return;
      }

      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${geocodingKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Reverse geocoding failed with status ${response.status}`);
      }

      const geocode = await response.json();
      if (geocode.status === 'OK' && Array.isArray(geocode.results) && geocode.results.length > 0) {
        const addressResults = geocode.results.filter((result: any) => {
          const types = result?.types || [];
          return (
            types.includes('street_address') ||
            types.includes('premise') ||
            types.includes('establishment') ||
            types.includes('route') ||
            types.includes('subpremise')
          );
        });

        const addressResult = addressResults[0] || geocode.results[0];
        const cityResult = geocode.results.find((result: any) =>
          (result?.address_components || []).some((component: any) =>
            component?.types?.includes('locality') ||
            component?.types?.includes('administrative_area_level_3') ||
            component?.types?.includes('administrative_area_level_2') ||
            component?.types?.includes('sublocality') ||
            component?.types?.includes('postal_town')
          )
        ) || geocode.results[0];

        const cityComponent = (cityResult?.address_components || []).find((component: any) =>
          component?.types?.includes('locality') ||
          component?.types?.includes('administrative_area_level_3') ||
          component?.types?.includes('administrative_area_level_2') ||
          component?.types?.includes('sublocality') ||
          component?.types?.includes('postal_town')
        );

        resolvedAddress = addressResult?.formatted_address || resolvedAddress;
        resolvedCity = cityComponent?.long_name || '';
      }
    } catch (geocodeError) {
    }

    updateFormData('address', resolvedAddress);
    updateFormData('city', resolvedCity || 'Detected City');
  };

  // Get current location
  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    setLocationError(null);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setLocationError('Location permission denied');
        setIsGettingLocation(false);
        return;
      }

      // Try a fast cached position first, then fall back to a live fix.
      const tryGetLocation = (highAccuracy: boolean) => {
        return new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (position) => resolve(position),
            (error) => reject(error),
            {
              enableHighAccuracy: highAccuracy,
              timeout: highAccuracy ? 7000 : 2500,
              maximumAge: highAccuracy ? 5000 : 60000,
              showLocationDialog: true,
              forceRequestLocation: true,
            }
          );
        });
      };

      let position;
      try {
        position = await tryGetLocation(false);
      } catch (highAccuracyError) {
        try {
          position = await tryGetLocation(true);
        } catch (lowAccuracyError) {
          throw lowAccuracyError;
        }
      }

      // Successfully got position
      const { latitude, longitude } = (position as any).coords;

      if (!isWithinServiceArea(latitude, longitude)) {
        setLocationError(
          `Location is outside service area. We currently serve within ${getServiceAreaSummaryText()}.`
        );
        setIsGettingLocation(false);
        setPopup({
          title: 'Location Not Serviceable',
          message: `We currently serve locations within ${getServiceAreaSummaryText()} only.`,
          variant: 'warning',
        });
        return;
      }

      updateFormData('latitude', latitude);
      updateFormData('longitude', longitude);

      // Update the map immediately, then resolve the human-readable address in the background.
      Promise.resolve().then(() => {
        void resolveLocationDetails(latitude, longitude);
      });

      setIsGettingLocation(false);
      setLocationError(null);
      setPopup({
        title: 'Location Detected',
        message: `Your location has been detected successfully.\nLatitude: ${latitude.toFixed(6)}\nLongitude: ${longitude.toFixed(6)}`,
        variant: 'success',
      });
    } catch (error) {
      const locationError = error as { code?: number };

      if (locationError?.code === 5) {
        setLocationError('Please turn on location services to continue');
      } else if (locationError?.code === 1) {
        setLocationError('Location permission denied');
      } else {
        setLocationError('Failed to get location');
      }
      setIsGettingLocation(false);
    }
  };

  // Validation
  const validateCurrentStep = (stepIndex: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (stepIndex === 0) {
      // Basic validation for Contact step (step 0)
      if (!formData.requestType) {
        newErrors.requestType = 'Please select request type';
      }
      if (!formData.serviceType) {
        newErrors.serviceType = 'Please select service type';
      }
      
      if (formData.requestType === 'self') {
        if (!formData.userName.trim()) {
          newErrors.userName = 'Name is required';
        }
        if (!formData.userPhone.trim()) {
          newErrors.userPhone = 'Phone number is required';
        } else if (!/^\d{10}$/.test(formData.userPhone)) {
          newErrors.userPhone = 'Phone number must be exactly 10 digits';
        }
      }
      
      if (formData.requestType === 'other') {
        if (!formData.beneficiaryName.trim()) {
          newErrors.beneficiaryName = 'Beneficiary name is required';
        }
        if (!formData.beneficiaryPhone.trim()) {
          newErrors.beneficiaryPhone = 'Beneficiary phone is required';
        } else if (!/^\d{10}$/.test(formData.beneficiaryPhone)) {
          newErrors.beneficiaryPhone = 'Phone number must be exactly 10 digits';
        }
      }
      
      if (!formData.address.trim()) {
        newErrors.address = 'Address is required';
      }
      if (!formData.city.trim()) {
        newErrors.city = 'City is required';
      }
      if (formData.latitude === 0 || formData.longitude === 0) {
        newErrors.location = 'Please enable location services';
      }
    }
    else if(stepIndex === 1) {
      if (formData.brand === "") {
        newErrors.brand = 'Brand is required';
      }
    }
    else if (stepIndex === 2) {
      if (formData.model === "") {
        newErrors.model = 'Model is required';
      }
    }
    else if (stepIndex === 3) {
      if (formData.knowsProblem) {
        if (!formData.mainProblem?.title) {
          newErrors.mainProblem = 'Main problem is required';
        }
        if (!formData.subProblem?.title) {
          newErrors.subProblem = 'Sub problem is required';
        }
        if (!formData.relationalBehaviors[0]) {
          newErrors.relationalBehaviors = 'Relational behavior is required';
        }
      }
      else if (!formData.knowsProblem) {
        if (formData.problemDescription === "") {
          newErrors.problemDescription = 'Problem description is required';
        }
      }
    }
    else if (stepIndex === 4) {
      if (!formData.preferredDate) {
        newErrors.preferredDate = 'Preferred date is required';
      }
      if (!formData.preferredTime) {
        newErrors.preferredTime = 'Preferred time is required';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const nextStep = async (currentNavigation: any) => {
    const currentRoute = currentNavigation.getState();
    const stepIndex = getStepIndex(currentRoute.routes[currentRoute.index].name);
    if (validateCurrentStep(stepIndex)) {
        const nextStepName = getNextStepName(stepIndex);
        const nextStepIndex = Math.min(STEPS.length - 1, stepIndex + 1);

        const doNavigate = () => {
          void saveDraftProgress(nextStepIndex).catch((draftError) => {
            console.warn('Draft save failed:', draftError);
          });
          if (stepIndex === 0) {
            void getAllBrands();
          }
          if (stepIndex === 1) {
            void getBrandModels(formData.brand);
          }
          if (nextStepName) {
            if (typeof currentNavigation.replace === 'function') {
              currentNavigation.replace(nextStepName);
            } else {
              currentNavigation.navigate(nextStepName);
            }
          }
          setSearchQuery('');
        };

        if (
          stepIndex === 3 &&
          formData.serviceType === 'onsite' &&
          (calculatedPricing.defaultLevel === 'L2' || calculatedPricing.defaultLevel === 'L3')
        ) {
          setServiceTypeOverrideModal({
            level: calculatedPricing.defaultLevel,
            navigationFn: doNavigate,
          });
          return;
        }

        doNavigate();
    } else {
        setPopup({
          title: 'Missing Required Fields',
          message: 'Please fill in all required fields before continuing.',
          variant: 'error',
        });
    }
  };

  const prevStep = (currentNavigation: any) => {
    setSearchQuery("");
    const currentRoute = currentNavigation.getState();
    const stepIndex = getStepIndex(currentRoute.routes[currentRoute.index].name);

    if (stepIndex > 0) {
      const previousStepName = getStepNameByIndex(stepIndex - 1);
      if (previousStepName) {
        if (typeof currentNavigation.replace === 'function') {
          currentNavigation.replace(previousStepName);
        } else {
          currentNavigation.navigate(previousStepName);
        }
        return;
      }
    }

    if (currentNavigation.canGoBack()) {
      currentNavigation.goBack();
    }
  };

  const getNextStepName = (currentIndex: number): string => {
    const steps = ['Contact', 'Brand', 'Model', 'Problem', 'DateTime', 'Images', 'Review'];
    return steps[currentIndex + 1] || 'Review';
  };

  const getStepTitle = (route: any): string => {
    const stepIndex = route.state?.index || 0;
    const titles = [
      '1/7 Contact & Request',
      '2/7 Brand',
      '3/7 Model', 
      '4/7 Problem',
      '5/7 Date & Time',
      '6/7 Images',
      '7/7 Review'
    ];
    return titles[stepIndex] || 'Service Request';
  };

  const canGoBack = (route: any): boolean => {
    const stepIndex = route.state?.index || 0;
    return stepIndex > 0;
  };

  const canGoForward = (route: any): boolean => {
    const stepIndex = route.state?.index || 0;
    return stepIndex < 6;
  };

    // Form submission
    const handleSubmit = async (currentNavigation: any) => {
      const currentRoute = currentNavigation.getState();
      const stepIndex = getStepIndex(currentRoute.routes[currentRoute.index].name);
      if (!validateCurrentStep(stepIndex)) {
        setPopup({
          title: 'Missing Required Fields',
          message: 'Please fill in all required fields before continuing.',
          variant: 'error',
        });
        return;
      }
  
      setIsSubmitting(true);
      setError(null);
  
      try {
        const finalStepIndex = STEPS.length - 1;
        await saveDraftProgress(finalStepIndex);
        const currentDraftId = activeDraftIdRef.current;
            const token = await getStoredToken();
            const formDataObj = new FormData();
          if (currentDraftId) {
            formDataObj.append('draftId', currentDraftId);
          }
            // Create FormData object
            Object.entries(formData).forEach(([key, value]) => {
                // Append all form fields except images
          if (key !== 'issueImages' && value !== undefined && value !== null) {
            // These specific fields need to be JSON strings
            if (key === 'mainProblem' || key === 'subProblem' || key === 'relationalBehaviors') {
              formDataObj.append(key, JSON.stringify(value));
            } else if (typeof value === 'object') {
              formDataObj.append(key, JSON.stringify(value));
            } else {
              formDataObj.append(key, value.toString());
            }
          }
        });

            // calculatedPricing is derived from formData via useMemo — not in formData itself
            if (calculatedPricing) {
              formDataObj.append('calculatedPricing', JSON.stringify(calculatedPricing));
            }

            // Append image files to FormData
            // Format: { uri: local path, type: mime type, name: filename }
        if (formData.issueImages.length > 0) {
          formData.issueImages.forEach((file: any, index: number) => {
            formDataObj.append('issueImages', {
              uri: file.uri,
              type: file.type || 'image/jpeg', // Fallback to jpeg if type unknown
              name: file.name || `upload-${Date.now()}.jpg`, // Unique filename
            });
          });
        }

        const resp = await axios.post(`${base}/service-requests/create`, formDataObj, {  
          headers: {  
            'Content-Type': 'multipart/form-data', // Critical for file uploads 
            Authorization: `Bearer ${token}` 
          },
        });  
        if (resp?.data?.success) {
          setPopup({
            title: 'Success',
            message: 'Service request submitted successfully!',
            variant: 'success',
          });
          navigation.goBack();
        } else {
          setPopup({
            title: 'Error',
            message: resp?.data?.message || 'Failed to submit request',
            variant: 'error',
          });
        }
      } catch (error) {
        setError('Failed to submit request');
        setPopup({
          title: 'Error',
          message: 'Failed to submit request',
          variant: 'error',
        });
      } finally {
        setIsSubmitting(false);
      }
    };

  if (isLoadingDraft) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.foreground }}>Loading draft...</Text>
      </View>
    );
  }

  return (
    <>
      <ThemedAlertDialog
        visible={Boolean(popup)}
        title={popup?.title || ''}
        message={popup?.message || ''}
        variant={popup?.variant || 'info'}
        onDismiss={() => setPopup(null)}
      />
      <ThemedAlertDialog
        visible={Boolean(serviceTypeOverrideModal)}
        title={`Level ${serviceTypeOverrideModal?.level?.slice(1)} Problem — Onsite Not Available`}
        message={`Your described problem is of level ${serviceTypeOverrideModal?.level?.slice(1)} and onsite service for these problems is not available. Choose another service type.`}
        variant="warning"
        onDismiss={() => {}}
        buttons={[
          {
            text: 'Visit the Shop',
            variant: 'primary',
            onPress: () => {
              updateFormData('serviceType', 'visit-shop');
              const fn = serviceTypeOverrideModal?.navigationFn;
              setServiceTypeOverrideModal(null);
              fn?.();
            },
          },
          {
            text: 'Pickup & Drop',
            variant: 'secondary',
            onPress: () => {
              updateFormData('serviceType', 'pickup-drop');
              const fn = serviceTypeOverrideModal?.navigationFn;
              setServiceTypeOverrideModal(null);
              fn?.();
            },
          },
        ]}
      />
      <Stack.Navigator
        initialRouteName={initialStepName}
        screenOptions={{
          headerShown: false,
        }}
      >
      <Stack.Screen name="Contact">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="Contact" />
            <ContactStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => nextStep(props.navigation)}
              onBack={() => prevStep(props.navigation)}
              addressQuery={addressQuery}
              setAddressQuery={setAddressQuery}
              addressPredictions={addressPredictions}
              fetchAutocomplete={fetchAutocomplete}
              
              loadingAddress={loadingAddress}
              getCurrentLocation={getCurrentLocation}
              isGettingLocation={isGettingLocation}
              locationError={locationError}
              showPopup={(title: string, message: string, variant?: 'info' | 'success' | 'warning' | 'error') =>
                setPopup({ title, message, variant })
              }
            />
            <NavigationFooter
              canGoBack={false}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => nextStep(props.navigation)}
              isSubmitting={false}
              isLastStep={false}
            />
          </View>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Brand">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="Brand" />
            <BrandStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => nextStep(props.navigation)}
              onBack={() => prevStep(props.navigation)}
              brands={brands}
              brandSearchQuery={searchQuery}
              setBrandSearchQuery={setSearchQuery}
              customBrand={customBrand}
              setCustomBrand={setCustomBrand}
            />
            <NavigationFooter
              canGoBack={true}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => nextStep(props.navigation)}
              isSubmitting={false}
              isLastStep={false}
            />
          </View>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Model">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="Model" />
            <ModelStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => nextStep(props.navigation)}
              onBack={() => prevStep(props.navigation)}
              models={models}
              modelSearchQuery={searchQuery}
              setModelSearchQuery={setSearchQuery}
            />
            <NavigationFooter
              canGoBack={true}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => nextStep(props.navigation)}
              isSubmitting={false}
              isLastStep={false}
            />
          </View>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Problem">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="Problem" />
            <ProblemStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => nextStep(props.navigation)}
              onBack={() => prevStep(props.navigation)}
            />
            <NavigationFooter
              canGoBack={true}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => nextStep(props.navigation)}
              isSubmitting={false}
              isLastStep={false}
            />
          </View>
        )}
      </Stack.Screen>

      <Stack.Screen name="DateTime">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="DateTime" />
            <DateTimeStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => nextStep(props.navigation)}
              onBack={() => prevStep(props.navigation)}
            />
            <NavigationFooter
              canGoBack={true}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => nextStep(props.navigation)}
              isSubmitting={false}
              isLastStep={false}
            />
          </View>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Images">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="Images" />
            <ImagesStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => nextStep(props.navigation)}
              onBack={() => prevStep(props.navigation)}
              showPopup={(title: string, message: string, variant?: 'info' | 'success' | 'warning' | 'error') =>
                setPopup({ title, message, variant })
              }
            />
            <NavigationFooter
              canGoBack={true}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => nextStep(props.navigation)}
              isSubmitting={false}
              isLastStep={false}
            />
          </View>
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Review">
        {(props) => (
          <View style={{ flex: 1 }}>
            <StepHeader onClose={handleCloseFlow} routeName="Review" />
            <ReviewStepScreen
              {...props}
              formData={formData}
              updateFormData={updateFormData}
              errors={errors}
              onNext={() => handleSubmit(props.navigation)}
              onBack={() => prevStep(props.navigation)}
              calculatedPricing={calculatedPricing}
              problemCategories={[]}
              TIME_SLOTS={TIME_SLOTS}
            />
            <NavigationFooter
              canGoBack={true}
              canGoForward={true}
              onBack={() => prevStep(props.navigation)}
              onNext={() => handleSubmit(props.navigation)}
              isSubmitting={isSubmitting}
              isLastStep={true}
            />
          </View>
        )}
      </Stack.Screen>
      </Stack.Navigator>
    </>
  );
}

function NavigationFooter({
  canGoBack,
  canGoForward,
  onBack,
  onNext,
  isSubmitting,
  isLastStep,
}: {
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
  isLastStep: boolean;
}) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{
      flexDirection: 'row' as const,
      paddingTop: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md + insets.bottom,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: spacing.md,
    }}>
      {canGoBack ? (
        <Button
          title="Back"
          onPress={onBack}
          variant="outline"
          style={{
            flex: 1,
            backgroundColor: colors.background,
            borderColor: colors.ring,
          }}
          textStyle={{ color: colors.foreground }}
        />
      ) : (
        <View style={{ flex: 1 }} />
      )}
      
      {canGoForward ? (
        <Button
          title="Continue"
          onPress={onNext}
          style={{ flex: 1 }}
        />
      ) : (
        <Button
          title={isSubmitting ? 'Submitting...' : 'Submit Request'}
          onPress={onNext}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={{ flex: 1 }}
        />
      )}
    </View>
  );
}
