import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Button, ServiceRequestTimer, RealTimeServiceTracker } from '../../core/components';
import Icon from 'react-native-vector-icons/Feather';
import { useRoute, useNavigation } from '@react-navigation/native';

import { requestWithAuth } from '../../core/api';
import { getStoredToken } from '../../core/storage';
import PaymentForm from './PaymentForm';

import RupeeReceiptSVG from "../../assets/icons/receipt-rupee.svg";

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}


interface ServiceRequest {
  _id: string;
  userId: string;
  title?: string;
  description?: string;
  category?: string;
  brand: string;
  model: string;
  problemDescription: string;
  deviceType?: string;
  deviceBrand?: string;
  deviceModel?: string;
  status:
    | 'Pending'
    | 'Assigned'
    | 'In Progress'
    | 'Completed'
    | 'Cancelled'
    | 'Expired'
    | 'Pickup Requested'
    | 'Pickup Initiated'
    | 'Pickup Done'
    | 'Problem Verification'
    | 'Repair'
    | 'Repair Done'
    | 'Drop Requested'
    | 'Drop Initiated'
    | 'Captain Reached Vendor'
    | 'Handover to Captain'
    | 'Captain Pickup Done'
    | 'Delivered'
    | 'Arrived at Shop'
    | 'Device Received'
    | 'Device Delivered'
    | 'Identification Done'
    | 'Rejected'
    | 'Problem Identification'
    | 'Technician Arrived'
    | 'Onsite Problem Verification'
    | 'Onsite Problem Identification';
  scheduleStatus?: 'pending' | 'proposed' | 'accepted' | 'rejected' | 'scheduled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  location: {
    address: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  city?: string;
  preferredDate?: string;
  preferredTime?: string;
  isUrgent?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignedTechnician?: {
    _id: string;
    pocInfo: {
      fullName: string;
      email: string;
      phone: string;
    };
  };
  assignedVendor?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    businessDetails?: {
      businessName?: string;
      registeredOfficeAddress?: string;
      website?: string;
    };
    pocInfo?: {
      fullName: string;
      email: string;
      phone: string;
      correspondenceAddress?: string;
      latitude?: number;
      longitude?: number;
    };
    currentLocation?: {
      latitude?: number;
      longitude?: number;
    };
    rating?: number;
    totalReviews?: number;
    services?: string[];
    facilities?: string[];
    parkingAvailable?: boolean;
    wheelchairAccessible?: boolean;
    specialization: (
      | string
      | {
          serviceType?: string;
          serviceName?: string;
          priceRange?: string;
          deviceType?: string;
          estimatedTime?: string;
          _id?: string;
        }
    )[];
    experience: number;
  };
  customerId?: {
    username: string;
    email: string;
    phone: string;
  };
  estimatedCost?: number;
  vendorServiceCharge?: number;
  issueImages?: string[];
  timerExpiresAt?: string;
  isTimerActive?: boolean;
  acceptedBy?: string;
  acceptedAt?: string;
  paymentStatus?: 'pending' | 'completed' | 'failed';
  paymentTransactionId?: string;
  // Warranty fields
  warrantyStatus?: 'not_purchased' | 'pending_activation' | 'active' | 'expired' | 'claim_raised' | 'void';
  warrantyPlanName?: string;
  warrantyAmount?: number;
  warrantyStartDate?: string;
  warrantyEndDate?: string;
  claimId?: string;
  claimVerificationStatus?: string;
  // Scheduling fields
  scheduledDate?: string;
  scheduledTime?: string;
  scheduleNotes?: string;
  availableSlots?: string[];
  // New properties for problem identification and captain pickup
  problemType?: 'known' | 'unknown';
  captainPickupRequest?: {
    requestedAt?: string;
    requestedBy?: string;
    pickupAddress?: string;
    pickupCoordinates?: [number, number];
    pickupNotes?: string;
    estimatedPickupTime?: string;
    status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'rejected';
    rejectionReason?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    deliveryNotes?: string;
  };
  captainDropRequest?: {
    requestedAt?: string;
    requestedBy?: string;
    vendorAddress?: string;
    vendorCoordinates?: {
      latitude?: number;
      longitude?: number;
    };
    customerAddress?: string;
    customerCoordinates?: {
      latitude?: number;
      longitude?: number;
    };
    dropNotes?: string;
    estimatedDropTime?: string;
    status?: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'rejected';
    rejectionReason?: string;
    rejectedBy?: string;
    rejectedAt?: string;
    deliveryNotes?: string;
  };
  postRepairDeliveryPreference?: 'self-pickup' | 'captain-delivery';
  postRepairDeliveryChosenAt?: string;
  problemIdentification?: {
    identifiedProblem?: string;
    identifiedAt?: string;
    identifiedBy?: string;
    identificationNotes?: string;
    estimatedRepairTime?: string;
    estimatedCost?: number;
    customerApproval?: {
      status?: 'pending' | 'approved' | 'rejected';
      approvedAt?: string;
      rejectedAt?: string;
      rejectionReason?: string;
      customerNotes?: string;
    };
  };
  userResponse?: {
    status: 'pending' | 'accepted' | 'rejected';
    respondedAt?: string;
    userNotes?: string;
  };
  serviceType?: 'visit-shop' | 'pickup-drop' | 'onsite';
  customerLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: Date;
  };
  // Additional fields for status management
  pickupDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    actualPickupTime?: string;
    pickupConfirmed?: boolean;
    pickupNotes?: string;
  };
  repairDetails?: {
    problemIdentified?: boolean;
    problemDescription?: string;
    repairStarted?: boolean;
    repairCompleted?: boolean;
    repairNotes?: string;
  };
  dropDetails?: {
    scheduledDate?: string;
    scheduledTime?: string;
    actualDropTime?: string;
    dropConfirmed?: boolean;
    dropNotes?: string;
  };
  // Identification fields
  aiPredicted?: boolean;
  aiPredictions?: any[];
  selectedProblem?: any;
  identificationTimerStartedAt?: string;
  identificationTimerExpiresAt?: string;
  isIdentificationTimerActive?: boolean;
  verificationData?: {
    identifiedProblem?: string;
    identifiedDescription?: string;
    estimatedPrice?: number;
    vendorNotes?: string;
    identifiedBy?: string;
    identifiedAt?: string;
  };
  rejectionReason?: string;
  finalAmount?: number;
  serviceTypeFee?: number;
  // Admin pricing fields
  adminFinalPrice?: number;
  adminPricingNotes?: string;
  adminPricingSetAt?: string;
  adminPricingSetBy?: string;
  // Calculated pricing from service request creation
  calculatedPricing?: {
    finalChargeRange?: {
      min: number;
      max: number;
    };
    serviceChargeRange?: {
      min: number;
      max: number;
    };
    netChargeRange?: {
      min: number;
      max: number;
    };
    breakdown?: string[];
    serviceTypeFee?: number;
    urgencyFee?: number;
    urgencyLevel?: string;
    warrantyFee?: number;
    warrantyOption?: string;
    dataSafetyFee?: number;
  };
  paymentBreakdown?: {
    totalCost?: number;
    technicianEarnings?: number;
    companyCommission?: number;
    componentCost?: number;
    platformFee?: number;
    taxes?: number;
  };
}

interface RouteParams {
  serviceRequest: ServiceRequest;
}

interface PaymentHistory {
  _id: string;
  amount: number;
  paymentMethod: string;
  status: 'Completed' | 'Failed' | 'Pending';
  createdAt: string;
}

interface Review {
  _id: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface PaymentBreakdown {
  totalCost: number;
  technicianEarnings: number;
  companyCommission: number;
  componentCost?: number;
}

export function ServiceRequestDetailsScreen(): React.ReactElement {
  const { colors: themeColors, typography, spacing, isDark } = useTheme();
  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;
  const primaryBlue = isDark ? '#58A6FF' : '#01325D';
  const screenBg = isDark ? '#242D3B' : '#F6F8FB';
  const headerBg = isDark ? '#2D394A' : '#FFFFFF';
  const cardBg = isDark ? '#2D394A' : '#FFFFFF';
  const cardBorder = isDark ? '#43526A' : '#E4E9F1';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const bodyColor = isDark ? '#E8F0FC' : '#10243C';
  const mutedText = isDark ? '#B8C8DE' : '#64748B';
  const warrantyAccent = isDark ? '#B9A6FF' : '#6D28D9';
  const colors = { ...themeColors, primary: primaryBlue };
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const navigation = useNavigation();
  const { serviceRequest: initialServiceRequest } = route.params as RouteParams;
  
  // State management
  const [serviceRequest, setServiceRequest] = useState<ServiceRequest>(initialServiceRequest);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomCancelDialog, setShowCustomCancelDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  
  // Warranty Claim State
  const [showWarrantyClaimModal, setShowWarrantyClaimModal] = useState(false);
  const [isSameIssue, setIsSameIssue] = useState<boolean | null>(null);
  const [warrantyIssueDescription, setWarrantyIssueDescription] = useState('');
  const [isSubmittingWarranty, setIsSubmittingWarranty] = useState(false);
  
  // Animation values
  const timelineHeight = useRef(new Animated.Value(0)).current;

  const handleShare = async () => {
    try {
      const message = `Service Request Details:\n` +
        `Request ID: ${serviceRequest._id}\n` +
        `Device: ${serviceRequest.brand} ${serviceRequest.model}\n` +
        `Problem: ${serviceRequest.problemType || 'Not specified'}\n` +
        `Status: ${serviceRequest.status}\n` +
        `Created: ${new Date(serviceRequest.createdAt).toLocaleDateString()}`;
      
      await Share.share({
        message,
        title: 'Service Request Details',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share service request details');
    }
  };

  const fetchServiceRequest = async () => {
    try {
      setLoading(true);
      const token = await getStoredToken();
      if (!token) throw new Error('No token found');
      
      const response = await requestWithAuth<ApiResponse<ServiceRequest>>(
        `/service-requests/${serviceRequest._id}`,
        token
      );
      
      console.log(serviceRequest)
      if (response.data?.success) {
        setServiceRequest(response.data.data);
        console.log(response.data?.data)
      }
    } catch (error) {
      setError('Failed to fetch service request');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!serviceRequest._id) return;
    
    setLoadingPaymentHistory(true);
    try {
      const token = await getStoredToken();
      if (!token) return;
      
      const response = await requestWithAuth<ApiResponse<PaymentHistory[]>>(
        `/payment-transactions/service-request/${serviceRequest._id}`,
        token
      );
      
      if (response.data?.success) {
        setPaymentHistory(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const handleRaiseWarrantyClaim = async () => {
    if (isSameIssue === null) {
      Alert.alert('Required', 'Please specify if this is the same issue as before.');
      return;
    }
    setIsSubmittingWarranty(true);
    try {
      const token = await getStoredToken();
      if (!token) return;

      const response = await requestWithAuth<ApiResponse>(
        `/service-requests/${serviceRequest._id}/warranty-claim`,
        token,
        {
          method: 'POST',
          body: { isSameIssue, issueDescription: warrantyIssueDescription },
        }
      );

      if (response.data?.success) {
        Alert.alert('Warranty Claim Received', response.data.message);
        setShowWarrantyClaimModal(false);
        fetchServiceRequest();
      } else {
        Alert.alert('Claim Failed', response.data?.message || 'Failed to raise warranty claim');
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to raise warranty claim';
      Alert.alert('Claim Failed', msg);
    } finally {
      setIsSubmittingWarranty(false);
    }
  };

  useEffect(() => {
    if (serviceRequest._id) {
      fetchServiceRequest();
      fetchPaymentHistory();
    }
  }, [serviceRequest._id]);


  const checkReviewStatus = async () => {
    try {
      const token = await getStoredToken();
      if (!token) return;
      
      const vendorId = serviceRequest.assignedVendor?._id || serviceRequest.assignedTechnician?._id;
      if (!vendorId) return;
      
      const response = await requestWithAuth<ApiResponse<{ hasReviewed: boolean }>>(
        `/reviews/check/${vendorId}/${serviceRequest._id}`,
        token
      );
      
      setHasReviewed(response.data?.data?.hasReviewed || false);
    } catch (error) {
      console.error('Error checking review status:', error);
    }
  };

  const cancelServiceRequest = async (requestId: string) => {
    setShowCustomCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    const requestId = serviceRequest._id;
    try {
      setIsUpdatingStatus(true);
      const token = await getStoredToken();
      if (!token) return;
      
      const response = await requestWithAuth<ApiResponse<any>>(
        `/service-requests/${requestId}/cancel`,
        token,
        { method: 'PATCH' }
      );
      
      if (response.data?.success) {
        Alert.alert('Success', 'Service request cancelled successfully!');
        setShowCustomCancelDialog(false);
        fetchServiceRequest();
        // Navigate back to refresh the list and stop timers
        navigation.goBack();
      } else {
        Alert.alert('Error', 'Failed to cancel service request');
      }
    } catch (error) {
      console.error('Error cancelling service request:', error);
      Alert.alert('Error', 'Failed to cancel service request');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    if (newStatus !== 'Cancelled') {
      Alert.alert('Error', 'You can only cancel service requests');
      return;
    }
    
    Alert.alert(
      'Cancel Service Request',
      'Are you sure you want to cancel this service request? This action cannot be undone.',
      [
        { text: 'Go Back', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsUpdatingStatus(true);
              const token = await getStoredToken();
              if (!token) return;
              
              const response = await requestWithAuth<ApiResponse<any>>(
                `/service-requests/${serviceRequest._id}/cancel`,
                token,
                { method: 'PATCH' }
              );
              
              if (response.data?.success) {
                Alert.alert('Success', 'Service request cancelled successfully!');
                fetchServiceRequest();
              } else {
                Alert.alert('Error', 'Failed to cancel service request');
              }
            } catch (error) {
              console.error('Error cancelling service request:', error);
              Alert.alert('Error', 'Failed to cancel service request');
            } finally {
              setIsUpdatingStatus(false);
            }
          }
        }
      ]
    );
  };

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Error', 'Please provide a review comment');
      return;
    }
    
    try {
      const token = await getStoredToken();
      if (!token) return;
      
      const vendorId = serviceRequest.assignedVendor?._id || serviceRequest.assignedTechnician?._id;
      if (!vendorId) return;
      
      const response = await requestWithAuth<ApiResponse<any>>(
        `/reviews`,
        token,
        {
          method: 'POST',
          body: {
            serviceRequestId: serviceRequest._id,
            vendorId: vendorId,
            rating: reviewRating,
            comment: reviewComment,
          }
        }
      );
      
      if (response.data?.success) {
        Alert.alert('Success', 'Review submitted successfully!');
        setShowReviewForm(false);
        setHasReviewed(true);
        setReviewComment('');
        setReviewRating(5);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit review');
    }
  };

  const calculateTotalPayment = (): number => {
    if (serviceRequest.adminFinalPrice) {
      return serviceRequest.adminFinalPrice;
    }
    
    if (serviceRequest.calculatedPricing?.finalChargeRange) {
      const { min, max } = serviceRequest.calculatedPricing.finalChargeRange;
      return (min + max) / 2;
    }
    
    return serviceRequest.vendorServiceCharge || serviceRequest.estimatedCost || 0;
  };

  const toggleTimeline = () => {
    setIsTimelineExpanded(!isTimelineExpanded);
    Animated.timing(timelineHeight, {
      toValue: isTimelineExpanded ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

 
  useEffect(() => {
    if (serviceRequest.status === 'Completed') {
      checkReviewStatus();
    }
  }, [serviceRequest.status]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return colors.warning;
      case 'assigned':
        return colors.primary;
      case 'in progress':
        return colors.primary;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return mutedText;
    }
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return mutedText;
    switch (priority.toLowerCase()) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return mutedText;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Calculate the total payment amount based on admin final price (with GST)
  const calculateTotalPaymentAmount = (
    serviceRequest: any
  ): { baseAmount: number; gstAmount: number; totalAmount: number } => {
    let baseAmount = 0;

    // If paymentBreakdown exists (admin has set final price), use the totalCost from breakdown
    if (serviceRequest.paymentBreakdown && serviceRequest.paymentBreakdown.totalCost > 0) {
      baseAmount = serviceRequest.paymentBreakdown.totalCost;
    }
    // If admin has set a final price but no breakdown yet, use that directly
    else if (serviceRequest.adminFinalPrice && serviceRequest.adminFinalPrice > 0) {
      baseAmount = serviceRequest.adminFinalPrice;

      // For unknown problem types (legacy records where service type fee was not included in adminFinalPrice),
      // add the service type fee if calculatedPricing.serviceTypeFee doesn't match the expected fee
      if (serviceRequest.knowsProblem === false) {
        const expectedFee =
          serviceRequest.serviceType === 'pickup-drop'
            ? 249
            : serviceRequest.serviceType === 'onsite'
              ? 149
              : 0;
        const currentFee = serviceRequest.calculatedPricing?.serviceTypeFee || 0;
        // If the stored fee doesn't match the expected fee, it's a legacy record - add the fee
        if (expectedFee > 0 && currentFee !== expectedFee) {
          baseAmount += expectedFee;
        }
      }
    }
    // Otherwise, calculate from pricing estimates
    else {
      if (serviceRequest.calculatedPricing) {
        if (serviceRequest.calculatedPricing.finalChargeRange) {
          // Use the average of min and max from final charge range
          baseAmount =
            (serviceRequest.calculatedPricing.finalChargeRange.min +
              serviceRequest.calculatedPricing.finalChargeRange.max) /
            2;
        } else if (serviceRequest.calculatedPricing.netChargeRange) {
          // Use the average of min and max from net charge range
          baseAmount =
            (serviceRequest.calculatedPricing.netChargeRange.min +
              serviceRequest.calculatedPricing.netChargeRange.max) /
            2;

          // Add addon fees
          baseAmount += serviceRequest.calculatedPricing.serviceTypeFee || 0;
          baseAmount += serviceRequest.calculatedPricing.warrantyFee || 0;
          baseAmount += serviceRequest.calculatedPricing.urgencyFee || 0;
          baseAmount += serviceRequest.calculatedPricing.dataSafetyFee || 0;
        }
      }

      // If no calculated pricing, fall back to vendor service charge or estimated cost
      if (baseAmount === 0) {
        baseAmount = serviceRequest.vendorServiceCharge || serviceRequest.estimatedCost || 0;
      }
    }

    // Admin's final price is inclusive of 18% GST — extract it for the breakdown,
    // don't add another 18% on top.
    const hasAdminPrice =
      (serviceRequest.paymentBreakdown && serviceRequest.paymentBreakdown.totalCost > 0) ||
      (serviceRequest.adminFinalPrice && serviceRequest.adminFinalPrice > 0);

    if (hasAdminPrice) {
      const totalAmount = Math.round(baseAmount * 100) / 100;
      const extractedBase = Math.round((totalAmount / 1.18) * 100) / 100;
      const gstAmount = Math.round((totalAmount - extractedBase) * 100) / 100;
      return {
        baseAmount: extractedBase,
        gstAmount,
        totalAmount,
      };
    }

    // If no admin price set, return base amount without GST
    return {
      baseAmount: Math.round(baseAmount * 100) / 100,
      gstAmount: 0,
      totalAmount: Math.max(baseAmount, 1),
    };
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: screenBg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: headerBg,
      borderBottomWidth: 1,
      borderBottomColor: cardBorder,
      paddingTop: spacing.md + insets.top,
    },
    headerTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontFamily: fonts.semibold,
      color: headingColor,
    },
    backButton: {
      padding: spacing.sm,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl + insets.bottom,
    },
    card: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: cardBorder,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 16,
      alignSelf: 'flex-start',
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statusText: {
      fontSize: 12,
      fontFamily: fonts.semibold,
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    sectionTitle: {
      fontSize: 18,
      lineHeight: 24,
      fontFamily: fonts.bold,
      color: headingColor,
      marginBottom: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    detailLabel: {
      fontSize: 14,
      lineHeight: 20,
      color: mutedText,
      fontFamily: fonts.medium,
      flex: 1,
    },
    detailValue: {
      fontSize: 14,
      lineHeight: 20,
      color: bodyColor,
      fontFamily: fonts.semibold,
      flex: 2,
      textAlign: 'right',
    },
    deviceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    deviceIcon: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: primaryBlue + '14',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    deviceDetails: {
      flex: 1,
    },
    deviceName: {
      fontSize: 16,
      fontFamily: fonts.bold,
      color: headingColor,
      marginBottom: spacing.xs,
    },
    deviceType: {
      fontSize: 14,
      color: mutedText,
      fontFamily: fonts.medium,
    },
    technicianInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      backgroundColor: primaryBlue + '10',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: primaryBlue + '28',
    },
    technicianAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: primaryBlue,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    technicianDetails: {
      flex: 1,
    },
    technicianName: {
      fontSize: 14,
      fontFamily: fonts.semibold,
      color: headingColor,
    },
    technicianStatus: {
      fontSize: 12,
      color: mutedText,
      fontFamily: fonts.medium,
    },
    technicianContact: {
      fontSize: 13,
      color: mutedText,
      fontFamily: fonts.medium,
      marginTop: 2,
    },
    // Technician action buttons
    technicianActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: cardBorder,
      borderRadius: 10,
      backgroundColor: isDark ? '#2D394A' : '#FFFFFF',
    },
    actionButtonText: {
      fontSize: 14,
      lineHeight: 18,
      fontFamily: fonts.semibold,
      color: bodyColor,
    },
    // Payment section styles
    paymentSection: {
      gap: spacing.sm,
    },
    priceBreakdown: {
      backgroundColor: primaryBlue + '10',
      borderWidth: 1,
      borderColor: primaryBlue + '30',
      borderRadius: 8,
      padding: spacing.sm,
      marginBottom: spacing.sm,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    totalPriceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: primaryBlue + '30',
    },
    priceLabel: {
      fontSize: 14,
      color: primaryBlue,
      fontFamily: fonts.medium,
    },
    priceValue: {
      fontSize: 14,
      color: primaryBlue,
      fontFamily: fonts.bold,
    },
    totalPriceLabel: {
      fontSize: 14,
      color: primaryBlue,
      fontFamily: fonts.semibold,
    },
    totalPriceValue: {
      fontSize: 18,
      color: primaryBlue,
      fontFamily: fonts.bold,
    },
    awaitingPriceContainer: {
      backgroundColor: colors.warning + '10',
      borderWidth: 1,
      borderColor: colors.warning + '30',
      borderRadius: 8,
      padding: spacing.sm,
    },
    awaitingPriceTitle: {
      fontSize: 14,
      color: colors.warning,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    priceRangeText: {
      fontSize: 14,
      color: colors.warning,
      marginBottom: spacing.xs,
    },
    awaitingPriceDescription: {
      fontSize: 12,
      color: colors.warning,
      lineHeight: 16,
    },
    // Issue Images styles
    imageGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -6,
    },
    imageContainer: {
      width: '50%',
      paddingHorizontal: 6,
      marginBottom: 12,
    },
    issueImage: {
      width: '100%',
      height: 120,
      borderRadius: 8,
      backgroundColor: colors.muted,
      resizeMode: 'cover',
    },
    // Image Modal styles
    imageModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageModalCloseArea: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: Platform.OS === 'ios' ? 50 : 30,
      paddingRight: 20,
    },
    imageModalCloseButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageModalContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
    },
    fullScreenImage: {
      width: '100%',
      height: '80%',
    },
    imageCounter: {
      position: 'absolute',
      bottom: 30,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 15,
    },
    imageCounterText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '500',
    },
    imageNavigation: {
      position: 'absolute',
      bottom: 100,
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: 30,
    },
    navButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // New styles for enhanced features
    timerCard: {
      borderLeftWidth: 4,
      borderLeftColor: colors.warning,
      backgroundColor: colors.warning + '10',
    },
    timelineHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    timelineIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    timelineContent: {
      flex: 1,
    },
    timelineTitle: {
      fontSize: 14,
      fontFamily: fonts.semibold,
      color: headingColor,
      marginBottom: spacing.xs,
    },
    timelineDescription: {
      fontSize: 12,
      color: mutedText,
      fontFamily: fonts.medium,
    },
    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    paymentTotal: {
      borderTopWidth: 2,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: cardBg,
      borderRadius: 16,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: fonts.semibold,
      color: headingColor,
      marginBottom: spacing.sm,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    textArea: {
      height: 100,
      textAlignVertical: 'top',
    },
    input: {
      backgroundColor: isDark ? '#334155' : '#FFFFFF',
      color: bodyColor,
      borderRadius: 10,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: cardBorder,
      fontFamily: fonts.medium,
      fontSize: 14,
    },
    ratingContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginBottom: spacing.md,
      gap: spacing.xs,
    },
    starButton: {
      padding: spacing.xs,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    priorityBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: 6,
      alignSelf: 'flex-start',
    },
    identificationCard: {
      borderColor: colors.warning,
      borderWidth: 2,
      backgroundColor: colors.warning + '12',
    },
    customCancelDialog: {
      backgroundColor: cardBg,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#DC2626',
      padding: 24,
      width: '100%',
      maxWidth: 320,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
    cancelDialogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    warningIconContainer: {
      marginRight: 12,
    },
    cancelDialogTitle: {
      fontSize: 18,
      fontFamily: fonts.semibold,
      color: headingColor,
      flex: 1,
    },
    cancelDialogMessage: {
      fontSize: 14,
      color: mutedText,
      lineHeight: 20,
      fontFamily: fonts.medium,
      marginBottom: 24,
    },
    cancelDialogActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
    },
    cancelDialogGoBackButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: cardBorder,
      backgroundColor: cardBg,
      gap: 8,
    },
    cancelDialogGoBackText: {
      fontSize: 14,
      fontFamily: fonts.semibold,
      color: bodyColor,
    },
    cancelDialogConfirmButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 6,
      backgroundColor: '#DC2626',
      gap: 8,
    },
    cancelDialogConfirmText: {
      fontSize: 14,
      fontFamily: fonts.semibold,
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: screenBg,
    },
  });

  // Loading state
  if (loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: spacing.sm, color: mutedText, fontFamily: fonts.medium }}>
            Loading service request...
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text style={{ fontSize: 16, color: colors.error, textAlign: 'center', marginBottom: spacing.md, fontFamily: fonts.semibold }}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{ padding: spacing.sm, backgroundColor: colors.primary, borderRadius: 8 }}
            onPress={() => {
              setError(null);
              fetchServiceRequest();
            }}
          >
            <Text style={{ color: '#FFFFFF', fontFamily: fonts.semibold }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={headingColor} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Request Details</Text>
          <TouchableOpacity onPress={handleShare}>
            <Icon name="share-2" size={24} color={headingColor} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {/* Status and Priority Badges */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(serviceRequest.status) }]}>
              <Icon name="clock" size={14} color="#FFFFFF" />
              <Text style={styles.statusText}>{serviceRequest.status}</Text>
            </View>
            {serviceRequest.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(serviceRequest.priority) }]}>
                <Text style={[styles.statusText, { color: '#FFFFFF' }]}>{serviceRequest.priority}</Text>
              </View>
            )}
          </View>

          {/* Timer for pending requests */}
          {serviceRequest.status === 'Pending' && 
           serviceRequest.isTimerActive && 
           serviceRequest.timerExpiresAt && (
            <View style={[styles.card, styles.timerCard]}>
              <ServiceRequestTimer serviceRequest={serviceRequest as any} />
            </View>
          )}

          {/* Real-Time Service Tracker */}
          {serviceRequest.status !== 'Pending' &&
            serviceRequest.status !== 'Cancelled' &&
            serviceRequest.status !== 'Expired' && (
              <RealTimeServiceTracker
                serviceRequest={serviceRequest}
                serviceType={
                  (serviceRequest.serviceType as 'pickup-drop' | 'visit-shop' | 'onsite') ||
                  'pickup-drop'
                }
              />
            )}

          {/* Device Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Device Information</Text>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceIcon}>
                <Icon name="smartphone" size={24} color={colors.primary} />
              </View>
              <View style={styles.deviceDetails}>
                <Text style={styles.deviceName}>{serviceRequest.brand.toUpperCase()} {serviceRequest.model}</Text>
                <Text style={styles.deviceType}>{serviceRequest.deviceType || 'Mobile Device'}</Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category:</Text>
              <Text style={styles.detailValue}>{serviceRequest.category || 'General'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Problem Type:</Text>
              <Text style={styles.detailValue}>{serviceRequest.problemType || 'Not specified'}</Text>
            </View>
            {serviceRequest.priority && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Priority:</Text>
                <Text style={[styles.detailValue, { color: getPriorityColor(serviceRequest.priority) }]}>
                  {serviceRequest.priority}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Service Request Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Request ID:</Text>
              <Text style={styles.detailValue}>{serviceRequest._id}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>{formatDate(serviceRequest.createdAt)}</Text>
            </View>
            {serviceRequest.preferredDate && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Preferred Date:</Text>
                <Text style={styles.detailValue}>{serviceRequest.preferredDate}</Text>
              </View>
            )}
            {serviceRequest.preferredTime && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Preferred Time:</Text>
                <Text style={styles.detailValue}>{serviceRequest.preferredTime}</Text>
              </View>
            )}
            {/* !! to force any value into a Boolean  */}
            {!!serviceRequest.budget && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Budget:</Text>
                <Text style={styles.detailValue}>₹{serviceRequest.budget}</Text>
              </View>
            )}
            {!!serviceRequest.estimatedCost && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estimated Cost:</Text>
                <Text style={styles.detailValue}>₹{serviceRequest.estimatedCost}</Text>
              </View>
            )}
          </View>

          {/* Issue Images */}
          {serviceRequest.issueImages && serviceRequest.issueImages.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Issue Images</Text>
              <View style={styles.imageGrid}>
                {serviceRequest.issueImages.map((image, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.imageContainer}
                    onPress={() => {
                      setSelectedImageIndex(index);
                      setShowImageModal(true);
                    }}
                  >
                    <Image
                      source={{ uri: image }}
                      alt={`Issue image ${index + 1}`}
                      style={styles.issueImage}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Scheduling Information */}
          {(serviceRequest.scheduledDate || serviceRequest.scheduledTime || serviceRequest.scheduleStatus) && (
            <View style={styles.card}>
              <View style={styles.timelineHeader}>
                <Text style={styles.sectionTitle}>Schedule Information</Text>
                {serviceRequest.scheduleStatus && (
                  <View style={[
                    styles.statusBadge, 
                    { 
                      backgroundColor: serviceRequest.scheduleStatus === 'accepted' ? colors.success :
                                       serviceRequest.scheduleStatus === 'proposed' ? colors.warning :
                                       serviceRequest.scheduleStatus === 'rejected' ? colors.error :
                                       mutedText,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.xs,
                    }
                  ]}>
                    <Text style={[styles.statusText, { fontSize: 10 }]}>
                      {serviceRequest.scheduleStatus}
                    </Text>
                  </View>
                )}
              </View>
              
              {serviceRequest.scheduledDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    <Icon name="calendar" size={14} color={colors.primary} /> Date:
                  </Text>
                  <Text style={styles.detailValue}>{formatDate(serviceRequest.scheduledDate)}</Text>
                </View>
              )}
              
              {serviceRequest.scheduledTime && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    <Icon name="clock" size={16} color={colors.primary} /> Time:
                  </Text>
                  <Text style={styles.detailValue}>{serviceRequest.scheduledTime}</Text>
                </View>
              )}

              {serviceRequest.scheduleNotes && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={[styles.detailLabel, { marginBottom: spacing.xs }]}>
                    <Icon name="file-text" size={16} color={colors.primary} /> Schedule Notes:
                  </Text>
                  <Text style={[styles.detailValue, { textAlign: 'left', lineHeight: 20 }]}>
                    {serviceRequest.scheduleNotes}
                  </Text>
                </View>
              )}

              {serviceRequest.availableSlots && serviceRequest.availableSlots.length > 0 && (
                <View style={{ marginTop: spacing.sm }}>
                  <Text style={[styles.detailLabel, { marginBottom: spacing.xs }]}>
                    <Icon name="list" size={14} color={colors.primary} /> Available Time Slots:
                  </Text>
                  {serviceRequest.availableSlots.map((slot, index) => (
                    <Text key={index} style={[styles.detailValue, { textAlign: 'left', marginBottom: spacing.xs }]}>
                      • {slot}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Location Information */}
          {(serviceRequest.address || serviceRequest.city) && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Service Location</Text>
              {serviceRequest.address && (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{serviceRequest.address}</Text>
                </View>
              )}
              {serviceRequest.city && (
                <View style={[styles.detailRow, { alignItems: 'flex-start' }]}>
                  <Text style={styles.detailLabel}>City:</Text>
                  <Text style={styles.detailValue}>{serviceRequest.city}</Text>
                </View>
              )}
            </View>
          )}

          {/* Assigned Technician */}
          {serviceRequest.assignedTechnician && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Assigned Technician</Text>
              <View style={styles.technicianInfo}>
                <View style={styles.technicianAvatar}>
                  <Icon name="user" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.technicianDetails}>
                  <Text style={styles.technicianName}>
                    {serviceRequest.assignedTechnician.pocInfo.fullName}
                  </Text>
                  <Text style={styles.technicianContact}>
                    <Icon name="phone" size={12} color={mutedText} /> {serviceRequest.assignedTechnician.pocInfo.phone}
                  </Text>    
                  <Text style={styles.technicianContact}>
                    <Icon name="mail" size={12} color={mutedText} /> {serviceRequest.assignedTechnician.pocInfo.email}
                  </Text>
                  <Text style={styles.technicianStatus}>Technician</Text>
                </View>
              </View>
              
              {/* Action Buttons */}
              <View style={styles.technicianActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    if (serviceRequest.serviceType === 'onsite') {
                      Alert.alert(
                        'Call via Fix4Ever CRM',
                        "Your call will be routed through Fix4Ever's secure CRM. Neither party's contact details will be shared.",
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Connect Call',
                            onPress: () =>
                              Alert.alert('Connecting...', 'Routing your call through Fix4Ever CRM. Please wait.'),
                          },
                        ]
                      );
                    } else if (serviceRequest.assignedTechnician?.pocInfo.phone) {
                      Linking.openURL(`tel:${serviceRequest.assignedTechnician.pocInfo.phone}`);
                    }
                  }}
                >
                  <Icon name="phone" size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>
                    {serviceRequest.serviceType === 'onsite' ? 'Call via CRM' : 'Call'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    if (serviceRequest.serviceType === 'onsite') {
                      (navigation as any).navigate('OnsiteChat', { serviceRequest });
                    } else if (serviceRequest.assignedTechnician?.pocInfo.phone) {
                      Linking.openURL(`sms:${serviceRequest.assignedTechnician.pocInfo.phone}`);
                    }
                  }}
                >
                  <Icon name="message-circle" size={16} color={colors.primary} />
                  <Text style={styles.actionButtonText}>
                    {serviceRequest.serviceType === 'onsite' ? 'Chat via CRM' : 'Message'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Status Timeline */}
          <View style={styles.card}>
            <View style={styles.timelineHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Status Timeline</Text>
              <TouchableOpacity 
                onPress={toggleTimeline}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
              >
                <Text style={{ color: colors.primary, fontSize: 14, fontFamily: fonts.semibold, lineHeight: 20 }}>
                  {isTimelineExpanded ? "Show Less" : "Show All Steps"}
                </Text>
                <Icon 
                  name={isTimelineExpanded ? "chevron-up" : "chevron-down"} 
                  size={16} 
                  color={colors.primary} 
                  style={{ marginTop: 1 }}
                />
              </TouchableOpacity>
            </View>            
            <Animated.View style={{ height: isTimelineExpanded ? 'auto' : 0, overflow: 'hidden' }}>
              {/* Request Created */}
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: colors.success + '20' }]}>
                  <Icon name="check" size={16} color={colors.success} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Request Created</Text>
                  <Text style={styles.timelineDescription}>
                    {formatDate(serviceRequest.createdAt)}
                  </Text>
                </View>
              </View>

              {/* Schedule Confirmed */}
              {(serviceRequest.scheduledDate || serviceRequest.scheduledTime) && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: colors.success + '20' }]}>
                    <Icon name="check" size={16} color={colors.success} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Schedule Confirmed</Text>
                    <Text style={styles.timelineDescription}>
                      {serviceRequest.scheduledDate && formatDate(serviceRequest.scheduledDate)}
                      {serviceRequest.scheduledDate && serviceRequest.scheduledTime && ' at '}
                      {serviceRequest.scheduledTime && serviceRequest.scheduledTime}
                      {serviceRequest.scheduledDate && !serviceRequest.scheduledTime && ' - All Day'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Current Status */}
              <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Icon name="clock" size={16} color={colors.primary} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Current Status</Text>
                  <Text style={styles.timelineDescription}>
                    {serviceRequest.status}
                  </Text>
                </View>
              </View>

              {/* Last Updated */}
              {serviceRequest.updatedAt && serviceRequest.updatedAt !== serviceRequest.createdAt && (
                <View style={styles.timelineItem}>
                <View style={[styles.timelineIcon, { backgroundColor: mutedText + '20' }]}>
                  <Icon name="clock" size={16} color={mutedText} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Last Updated</Text>
                    <Text style={styles.timelineDescription}>
                      {formatDate(serviceRequest.updatedAt)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Service Completed */}
              {serviceRequest.completedAt && (
                <View style={styles.timelineItem}>
                  <View style={[styles.timelineIcon, { backgroundColor: colors.success + '20' }]}>
                    <Icon name="check-circle" size={16} color={colors.success} />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Service Completed</Text>
                    <Text style={styles.timelineDescription}>
                      {formatDate(serviceRequest.completedAt)}
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Warranty Status Card */}
          {serviceRequest.warrantyStatus && serviceRequest.warrantyStatus !== 'not_purchased' && (
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
                <Icon name="shield" size={20} color={warrantyAccent} />
                <Text style={styles.sectionTitle}>Service Warranty</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Plan</Text>
                <Text style={[styles.detailValue, { color: warrantyAccent, fontWeight: 'bold' }]}>
                  {serviceRequest.warrantyPlanName}
                </Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={{
                  backgroundColor: 
                    serviceRequest.warrantyStatus === 'active' ? colors.success + '20' :
                    serviceRequest.warrantyStatus === 'expired' ? colors.error + '20' :
                    colors.warning + '20',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4
                }}>
                  <Text style={{ 
                    fontSize: 12, 
                    fontWeight: 'bold',
                    color: 
                      serviceRequest.warrantyStatus === 'active' ? colors.success :
                      serviceRequest.warrantyStatus === 'expired' ? colors.error :
                      colors.warning 
                  }}>
                    {serviceRequest.warrantyStatus.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>

              {serviceRequest.warrantyStartDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Validity</Text>
                  <Text style={styles.detailValue}>
                    {new Date(serviceRequest.warrantyStartDate).toLocaleDateString()} to {new Date(serviceRequest.warrantyEndDate!).toLocaleDateString()}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Pricing Breakdown */}
          {serviceRequest.calculatedPricing && (
            <View style={styles.card}>
              <View style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <RupeeReceiptSVG width={20} height={20} strokeWidth={10} />
                  <Text style={styles.sectionTitle}>Pricing Structure</Text>
                </View>
                <Text style={{ fontSize: 14, color: mutedText, marginTop: spacing.xs, fontFamily: fonts.medium }}>
                  {serviceRequest.adminFinalPrice
                    ? 'Final pricing breakdown for your service'
                    : 'Estimated pricing breakdown based on your request'}
                </Text>
              </View>

              {/* Base Service Charge */}
              {serviceRequest.calculatedPricing.netChargeRange && (
                <View style={{ marginBottom: spacing.md }}>
                  <View style={[styles.paymentRow, { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.sm }]}>
                    <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: bodyColor }}>
                      Base Service Charge
                    </Text>
                    <Text style={{ fontSize: 14, fontFamily: fonts.semibold, color: bodyColor }}>
                      {serviceRequest.adminFinalPrice
                        ? `₹${
                            serviceRequest.adminFinalPrice -
                            (serviceRequest.calculatedPricing.serviceTypeFee || 0) -
                            (serviceRequest.calculatedPricing.urgencyFee || 0) -
                            (serviceRequest.calculatedPricing.warrantyFee || 0) -
                            (serviceRequest.calculatedPricing.dataSafetyFee || 0) -
                            (serviceRequest.paymentBreakdown?.componentCost || 0)
                          }`
                        : `₹${serviceRequest.calculatedPricing.netChargeRange.min} - ₹${serviceRequest.calculatedPricing.netChargeRange.max}`}
                    </Text>
                  </View>
                </View>
              )}

              {/* Component Cost */}
              {(serviceRequest.paymentBreakdown?.componentCost || 0) > 0 && (
                <View style={styles.paymentRow}>
                  <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>Component/Parts Cost</Text>
                  <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: bodyColor }}>
                    ₹{serviceRequest.paymentBreakdown?.componentCost}
                  </Text>
                </View>
              )}

              {/* Service Type Fee */}
              {(serviceRequest.calculatedPricing.serviceTypeFee || 0) > 0 && (
                <View style={styles.paymentRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Icon name="truck" size={16} color={colors.primary} />
                    <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>
                      {serviceRequest.serviceType === 'pickup-drop'
                        ? 'Pickup & Drop Charges'
                        : 'Onsite Visit Charges'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: colors.primary }}>
                    ₹{serviceRequest.calculatedPricing.serviceTypeFee}
                  </Text>
                </View>
              )}

              {/* Urgency Fee */}
              {(serviceRequest.calculatedPricing.urgencyFee || 0) > 0 && (
                <View style={styles.paymentRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Icon name="zap" size={16} color={colors.warning} />
                    <View>
                      <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>
                        Emergency/Urgency Charges
                      </Text>
                      {serviceRequest.calculatedPricing.urgencyLevel && (
                        <Text style={{ fontSize: 12, color: mutedText, marginTop: 2, fontFamily: fonts.medium }}>
                          ({serviceRequest.calculatedPricing.urgencyLevel})
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: colors.warning }}>
                    ₹{serviceRequest.calculatedPricing.urgencyFee}
                  </Text>
                </View>
              )}

              {/* Warranty Fee */}
              {(serviceRequest.calculatedPricing.warrantyFee || 0) > 0 && (
                <View style={styles.paymentRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Icon name="shield" size={16} color={warrantyAccent} />
                    <View>
                      <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>
                        Extended Warranty
                      </Text>
                      {serviceRequest.calculatedPricing.warrantyOption && (
                        <Text style={{ fontSize: 12, color: mutedText, marginTop: 2, fontFamily: fonts.medium }}>
                          ({serviceRequest.calculatedPricing.warrantyOption})
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: warrantyAccent }}>
                    ₹{serviceRequest.calculatedPricing.warrantyFee}
                  </Text>
                </View>
              )}

              {/* Data Safety Fee */}
              {(serviceRequest.calculatedPricing.dataSafetyFee || 0) > 0 && (
                <View style={styles.paymentRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
                    <Icon name="shield" size={16} color={colors.success} />
                    <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>Data Safety & Backup</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontFamily: fonts.medium, color: colors.success }}>
                    ₹{serviceRequest.calculatedPricing.dataSafetyFee}
                  </Text>
                </View>
              )}

              {/* Total Price */}
              <View style={{ 
                paddingTop: spacing.md, 
                borderTopWidth: 2, 
                borderTopColor: colors.border,
                marginTop: spacing.sm 
              }}>
                <View style={styles.paymentRow}>
                  <Text style={{ fontSize: 16, fontFamily: fonts.semibold, color: bodyColor }}>Total Price</Text>
                  <Text style={{ fontSize: 18, fontFamily: fonts.bold, color: colors.primary }}>
                    {serviceRequest.adminFinalPrice
                      ? `₹${calculateTotalPayment().toFixed(2)}` 
                      : serviceRequest.calculatedPricing.finalChargeRange
                        ? `₹${serviceRequest.calculatedPricing.finalChargeRange.min} - ₹${serviceRequest.calculatedPricing.finalChargeRange.max}` 
                        : 'Pending'}
                  </Text>
                </View>
                {!serviceRequest.adminFinalPrice && (
                  <Text style={{ fontSize: 12, color: mutedText, marginTop: spacing.xs, fontFamily: fonts.medium }}>
                    Final price will be set by admin after service completion
                  </Text>
                )}
                {serviceRequest.adminFinalPrice && (
                  <Text style={{ fontSize: 12, color: colors.success, marginTop: spacing.xs }}>
                    ✓ Final price confirmed by admin
                  </Text>
                )}
              </View>

              {/* Payment Breakdown (if final price is set and payment is completed) */}
              {serviceRequest.paymentBreakdown && serviceRequest.adminFinalPrice && (
                <View style={{ 
                  marginTop: spacing.md, 
                  padding: spacing.sm, 
                  backgroundColor: colors.primary + '10', 
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.primary + '30'
                }}>
                  <Text style={{ fontSize: 12, fontFamily: fonts.semibold, color: colors.primary, marginBottom: spacing.sm }}>
                    Payment Distribution
                  </Text>

                  <View style={{ gap: spacing.xs }}>
                    <View style={styles.paymentRow}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontFamily: fonts.medium }}>Total Amount to be Paid:</Text>
                      <Text style={{ fontSize: 12, fontFamily: fonts.semibold, color: colors.primary }}>
                        ₹{serviceRequest.paymentBreakdown.totalCost}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontFamily: fonts.medium }}>Technician Earnings (80%):</Text>
                      <Text style={{ fontSize: 12, fontFamily: fonts.semibold, color: colors.primary }}>
                        ₹{serviceRequest.paymentBreakdown.technicianEarnings}
                      </Text>
                    </View>
                    <View style={styles.paymentRow}>
                      <Text style={{ fontSize: 12, color: colors.primary, fontFamily: fonts.medium }}>Platform Fee (20%):</Text>
                      <Text style={{ fontSize: 12, fontFamily: fonts.semibold, color: colors.primary }}>
                        ₹{serviceRequest.paymentBreakdown.companyCommission}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Payment History */}
          {paymentHistory.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              {paymentHistory.map((payment, index) => (
                <View key={payment._id || index} style={styles.paymentRow}>
                  <View>
                    <Text style={styles.detailValue}>{payment.paymentMethod} Payment</Text>
                    <Text style={[styles.detailLabel, { fontSize: 12 }]}>
                      {new Date(payment.createdAt).toLocaleDateString()} at {' '}
                      {new Date(payment.createdAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.detailValue}>₹{payment.amount.toFixed(2) || '0.00'}</Text>
                    <Text style={[
                      { fontSize: 12, fontWeight: '600' },
                      payment.status === 'Completed' ? { color: colors.success } :
                      payment.status === 'Failed' ? { color: colors.error } :
                      { color: colors.warning }
                    ]}>
                      {payment.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Payment History</Text>
              <Text style={styles.detailLabel}>No payment history available</Text>
            </View>
          )
        }

          {/* Actions */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Actions</Text>
            
            {/* Cancel button for pending/assigned requests */}
            {(serviceRequest.status === 'Pending' || serviceRequest.status === 'Assigned') && (
              <TouchableOpacity 
                style={[styles.actionButton, { borderColor: colors.error, marginBottom: spacing.sm }]}
                onPress={() => cancelServiceRequest(serviceRequest._id)}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Icon name="x-circle" size={18} color={colors.error} />
                )}
                <Text style={[styles.actionButtonText, { color: colors.error }]}>
                  Cancel Request
                </Text>
              </TouchableOpacity>
            )}

            {/* Payment section for completed requests */}
            {serviceRequest.status === 'Completed' &&
              serviceRequest.paymentStatus !== 'completed' && (
                <View style={styles.paymentSection}>
                  {serviceRequest.adminFinalPrice ? (
                    <View>
                      {(() => {
                        const amountBreakdown = calculateTotalPaymentAmount(serviceRequest);
                        return (
                          <View>
                            <View style={styles.priceBreakdown}>
                              <View style={styles.priceRow}>
                                <Text style={styles.priceLabel}>Base Price:</Text>
                                <Text style={styles.priceValue}>
                                  ₹{amountBreakdown.baseAmount.toFixed(2)}
                                </Text>
                              </View>
                              {amountBreakdown.gstAmount > 0 && (
                                <View style={styles.priceRow}>
                                  <Text style={styles.priceLabel}>GST (18%):</Text>
                                  <Text style={styles.priceValue}>
                                    ₹{amountBreakdown.gstAmount.toFixed(2)}
                                  </Text>
                                </View>
                              )}
                              <View style={styles.totalPriceRow}>
                                <Text style={styles.totalPriceLabel}>Total Amount:</Text>
                                <Text style={styles.totalPriceValue}>
                                  ₹{amountBreakdown.totalAmount.toFixed(2)}
                                </Text>
                              </View>
                            </View>
                            <TouchableOpacity 
                              style={[styles.actionButton, { backgroundColor: colors.success, borderColor: colors.success }]}
                              onPress={() => {
                                 setShowPaymentModal(true);
                                 console.log(showPaymentModal);
                                 return;
                              }}
                            >
                              <Icon name="credit-card" size={18} color="#FFFFFF" />
                              <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                                Pay ₹{amountBreakdown.totalAmount.toFixed(2)} with Cashfree
                              </Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })()}
                    </View>
                  ) : (
                    <View style={styles.awaitingPriceContainer}>
                      <Text style={styles.awaitingPriceTitle}>Awaiting Final Price</Text>
                      {serviceRequest.calculatedPricing?.finalChargeRange && (
                        <Text style={styles.priceRangeText}>
                          Price Range: ₹{serviceRequest.calculatedPricing.finalChargeRange.min} - ₹{serviceRequest.calculatedPricing.finalChargeRange.max}
                        </Text>
                      )}
                      <Text style={styles.awaitingPriceDescription}>
                        Admin will set the final price. You can pay via Cashfree once confirmed.
                      </Text>
                    </View>
                  )}
                </View>
              )}

            {/* Review button for completed requests */}
            {serviceRequest.status === 'Completed' && 
              serviceRequest.paymentStatus === 'completed' && 
              !hasReviewed && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setShowReviewForm(true)}
              >
                <Icon name="star" size={18} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                  Leave Review
                </Text>
              </TouchableOpacity>
            )}

            {/* Warranty Claim button for completed requests with active warranty */}
            {serviceRequest.status === 'Completed' && 
              serviceRequest.warrantyStatus === 'active' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: warrantyAccent, borderColor: warrantyAccent }]}
                onPress={() => setShowWarrantyClaimModal(true)}
              >
                <Icon name="shield" size={18} color="#FFFFFF" />
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>
                  Raise Warranty Claim
                </Text>
              </TouchableOpacity>
            )}

          </View>
        </ScrollView>
      </View>

      {/* Review Modal */}
      <Modal
        visible={showReviewForm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReviewForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Leave a Review</Text>
            
            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={styles.starButton}
                  onPress={() => setReviewRating(rating)}
                >
                  <Icon 
                    name="star" 
                    size={24} 
                    color={rating <= reviewRating ? colors.warning : colors.border} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Share your experience..."
              placeholderTextColor={mutedText}
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.actionButton, { flex: 1 }]}
                onPress={() => setShowReviewForm(false)}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary, borderColor: colors.primary, flex: 1 }]}
                onPress={handleReviewSubmit}
              >
                <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Warranty Claim Modal */}
      <Modal
        visible={showWarrantyClaimModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWarrantyClaimModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Raise Warranty Claim</Text>
              <TouchableOpacity onPress={() => setShowWarrantyClaimModal(false)}>
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
              <View style={{ backgroundColor: colors.warning + '10', padding: spacing.sm, borderRadius: 8, marginBottom: spacing.md }}>
                <Text style={{ fontSize: 13, color: colors.warning, fontWeight: '600', marginBottom: 4 }}>Note</Text>
                <Text style={{ fontSize: 12, color: colors.warning, lineHeight: 18 }}>
                  Service warranty covers service charges only for the exact same issue reported previously. If it is a different issue, it will be treated as a new chargeable request.
                </Text>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                Is this the same issue as your original repair?
              </Text>

              <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderWidth: 1,
                    borderColor: isSameIssue === true ? colors.primary : colors.border,
                    backgroundColor: isSameIssue === true ? colors.primary + '10' : colors.card,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setIsSameIssue(true)}
                >
                  <Text style={{ fontSize: 14, fontWeight: isSameIssue === true ? 'bold' : '500', color: isSameIssue === true ? colors.primary : colors.text }}>
                    Yes, same issue
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    padding: spacing.sm,
                    borderWidth: 1,
                    borderColor: isSameIssue === false ? colors.error : colors.border,
                    backgroundColor: isSameIssue === false ? colors.error + '10' : colors.card,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => setIsSameIssue(false)}
                >
                  <Text style={{ fontSize: 14, fontWeight: isSameIssue === false ? 'bold' : '500', color: isSameIssue === false ? colors.error : colors.text }}>
                    No, different issue
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.sm }}>
                Please describe the issue you are facing:
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Details about the problem..."
                placeholderTextColor={mutedText}
                value={warrantyIssueDescription}
                onChangeText={setWarrantyIssueDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  { 
                    backgroundColor: warrantyAccent, 
                    borderColor: warrantyAccent,
                    marginTop: spacing.md,
                    opacity: isSubmittingWarranty || isSameIssue === null ? 0.7 : 1 
                  }
                ]}
                onPress={handleRaiseWarrantyClaim}
                disabled={isSubmittingWarranty || isSameIssue === null}
              >
                {isSubmittingWarranty ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Submit Claim Request</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="x" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {serviceRequest.assignedVendor ? (
              calculateTotalPaymentAmount(serviceRequest).totalAmount > 0 ? (
                <PaymentForm
                  serviceRequestId={serviceRequest._id}
                  vendorId={serviceRequest.assignedVendor._id}
                  amount={calculateTotalPaymentAmount(serviceRequest).totalAmount}
                  onPaymentComplete={() => {
                    setShowPaymentModal(false);
                    // Refresh service request to update payment status
                    fetchServiceRequest();
                    fetchPaymentHistory();
                  }}
                  onCancel={() => setShowPaymentModal(false)}
                />
              ) : (
                <View style={{ alignItems: 'center', padding: spacing.lg }}>
                  <Text style={{ fontSize: 16, color: colors.warning, fontFamily: fonts.semibold, marginBottom: spacing.sm }}>
                    No estimated cost available for this service
                  </Text>
                  <View style={{
                    backgroundColor: colors.warning + '10',
                    borderWidth: 1,
                    borderColor: colors.warning + '30',
                    borderRadius: 8,
                    padding: spacing.sm,
                    marginBottom: spacing.md,
                  }}>
                    <Text style={{ fontSize: 14, color: colors.warning, marginBottom: spacing.sm, fontFamily: fonts.medium }}>
                      The vendor hasn't provided an estimated cost yet. Please contact the vendor directly or wait for them to update the cost.
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.warning, fontFamily: fonts.medium }}>
                      Vendor Service Charge: ₹{serviceRequest.vendorServiceCharge || 'Not set'}
                      {'\n'}
                      Estimated Cost: ₹{serviceRequest.estimatedCost || 'Not set'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: spacing.md,
                    }}
                    onPress={() => {
                      
                      setShowPaymentModal(false)
                    }}
                  >
                    <Text style={{ fontSize: 14, color: bodyColor, fontFamily: fonts.medium }}>
                      Close
                    </Text>
                  </TouchableOpacity>
                </View>
              )
            ) : (
              <View style={{ alignItems: 'center', padding: spacing.lg }}>
                <Text style={{ fontSize: 16, color: colors.error, fontFamily: fonts.semibold, marginBottom: spacing.sm }}>
                  Unable to load payment form. Missing required information:
                </Text>
                <View style={{ alignItems: 'flex-start', marginBottom: spacing.sm }}>
                  {!serviceRequest.assignedVendor && (
                    <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>
                      • No vendor assigned to this service
                    </Text>
                  )}
                  {(!serviceRequest.vendorServiceCharge || serviceRequest.vendorServiceCharge <= 0) &&
                   (!serviceRequest.estimatedCost || serviceRequest.estimatedCost <= 0) && (
                    <Text style={{ fontSize: 14, color: mutedText, fontFamily: fonts.medium }}>
                      • No cost information available (Vendor Charge: ₹{serviceRequest.vendorServiceCharge || 'Not set'}, Estimated: ₹{serviceRequest.estimatedCost || 'Not set'})
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: mutedText, textAlign: 'center', fontFamily: fonts.medium }}>
                  Please contact support if this issue persists.
                </Text>
                <View style={{
                  backgroundColor: colors.muted + '20',
                  borderRadius: 8,
                  padding: spacing.sm,
                  marginTop: spacing.md,
                }}>
                  <Text style={{ fontSize: 10, color: mutedText, fontFamily: fonts.medium }}>
                    Debug Info: Service ID: {serviceRequest._id?.slice(-8)}, Vendor: {serviceRequest.assignedVendor ? 'Assigned' : 'Not assigned'}, Vendor Charge: ₹{serviceRequest.vendorServiceCharge || 'Not set'}, Estimated: ₹{serviceRequest.estimatedCost || 'Not set'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Cancel Dialog */}
      <Modal
        visible={showCustomCancelDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomCancelDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customCancelDialog}>
            {/* Dialog Header with Warning Icon */}
            <View style={styles.cancelDialogHeader}>
              <View style={styles.warningIconContainer}>
                <Icon name="alert-triangle" size={24} color="#DC2626" />
              </View>
              <Text style={styles.cancelDialogTitle}>Cancel Service Request?</Text>
            </View>

            {/* Dialog Content */}
            <Text style={styles.cancelDialogMessage}>
              Are you sure you want to cancel this service request? This action cannot be undone.
            </Text>

            {/* Dialog Actions */}
            <View style={styles.cancelDialogActions}>
              <TouchableOpacity
                style={styles.cancelDialogGoBackButton}
                onPress={() => setShowCustomCancelDialog(false)}
                disabled={isUpdatingStatus}
              >
                <Icon name="x" size={16} color={bodyColor} />
                <Text style={styles.cancelDialogGoBackText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelDialogConfirmButton}
                onPress={handleConfirmCancel}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="check" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.cancelDialogConfirmText}>Yes, Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseArea}
            activeOpacity={1}
            onPress={() => setShowImageModal(false)}
          >
            <TouchableOpacity
              style={styles.imageModalCloseButton}
              onPress={() => setShowImageModal(false)}
            >
              <Icon name="x" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>
          
          <View style={styles.imageModalContent}>
            <Image
              source={{ uri: serviceRequest.issueImages?.[selectedImageIndex] || '' }}
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            {serviceRequest.issueImages && serviceRequest.issueImages.length > 1 && (
              <View style={styles.imageCounter}>
                <Text style={styles.imageCounterText}>
                  {selectedImageIndex + 1} / {serviceRequest.issueImages.length}
                </Text>
              </View>
            )}
          </View>
          
          {serviceRequest.issueImages && serviceRequest.issueImages.length > 1 && (
            <View style={styles.imageNavigation}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                disabled={selectedImageIndex === 0}
              >
                <Icon name="chevron-left" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setSelectedImageIndex(Math.min((serviceRequest.issueImages?.length || 1) - 1, selectedImageIndex + 1))}
                disabled={selectedImageIndex === (serviceRequest.issueImages?.length || 1) - 1}
              >
                <Icon name="chevron-right" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaProvider>
  );
}
