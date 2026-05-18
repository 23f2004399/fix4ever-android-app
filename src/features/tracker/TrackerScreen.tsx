import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Pressable,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import PaymentForm from '../service-requests/PaymentForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';

import { useTheme } from '../../core/theme';
import { Button } from '../../core/components';
import { getStoredToken } from '../../core/storage';
import { requestWithAuth } from '../../core/api';
import { config } from '../../core/config';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';

type TrackerStatus = 'Pending' | 'Assigned' | 'In Progress' | 'Completed' | 'Cancelled' | 'Expired';

interface TrackerRequest {
  _id: string;
  brand: string;
  model: string;
  problemDescription: string;
  problemType?: string;
  knowsProblem?: boolean;
  mainProblem?: { id?: string; title?: string };
  subProblem?: { id?: string; title?: string };
  issueLevel?: string;
  priority?: string;
  status: string;
  createdAt: string;
  address?: string;
  city?: string;
  budget?: number;
  estimatedCost?: number;
  vendorServiceCharge?: number;
  adminFinalPrice?: number;
  paymentStatus?: string;
  serviceType?: string;
  assignedVendor?: { _id: string } | null;
  calculatedPricing?: {
    finalChargeRange?: { min: number; max: number };
    netChargeRange?: { min: number; max: number };
    serviceTypeFee?: number;
    urgencyFee?: number;
    warrantyFee?: number;
    dataSafetyFee?: number;
  } | null;
  relationalBehaviors?: {
    id?: string;
    title?: string;
    pricing?: { min_price: number; max_price: number; currency?: string };
  }[];
}

interface TrackerResponse {
  success: boolean;
  data?: TrackerRequest[];
  requests?: TrackerRequest[];
}

const STATUS_STEPS = [
  'Request Submitted',
  'Technician Assigned',
  'Work Started',
  'Diagnosis Complete',
  'Parts Required',
  'Awaiting Parts',
  'Repair Complete',
  'Quality Check',
  'Ready for Pickup',
  'Completed',
] as const;

const normalizeStatus = (status: string): TrackerStatus => {
  const value = (status || '').toLowerCase().trim();

  if (value.includes('cancel')) return 'Cancelled';
  if (value.includes('expire')) return 'Expired';
  if (value.includes('complete')) return 'Completed';
  if (value === 'repair done' || value === 'device delivered' || value === 'delivered') {
    return 'Completed';
  }
  if (value.includes('progress') || value.includes('started') || value.includes('repair')) {
    return 'In Progress';
  }
  if (value.includes('assign') || value.includes('accepted')) return 'Assigned';
  return 'Pending';
};

const isOngoingStatus = (status: TrackerStatus): boolean => {
  return status === 'Pending' || status === 'Assigned' || status === 'In Progress' || status === 'Completed';
};

const getProgressPercentage = (status: TrackerStatus, rawStatus: string): number => {
  const normalizedRaw = (rawStatus || '').toLowerCase();

  if (status === 'Completed' || status === 'Cancelled' || status === 'Expired') return 100;
  if (normalizedRaw.includes('quality check')) return 85;
  if (normalizedRaw.includes('repair complete')) return 78;
  if (normalizedRaw.includes('awaiting parts') || normalizedRaw.includes('parts required')) return 60;
  if (normalizedRaw.includes('diagnosis')) return 52;
  if (status === 'In Progress') return 65;
  if (status === 'Assigned') return 35;
  return 15;
};

const getCurrentTimelineIndex = (status: string): number => {
  const value = (status || '').toLowerCase();

  if (value.includes('completed')) return 9;
  if (value.includes('ready for pickup')) return 8;
  if (value.includes('quality check')) return 7;
  if (value.includes('repair complete')) return 6;
  if (value.includes('awaiting parts') || value.includes('parts ordered')) return 5;
  if (value.includes('parts required')) return 4;
  if (value.includes('diagnosis')) return 3;
  if (value.includes('repair done') || value.includes('device delivered') || value.includes('delivered')) {
    return 8;
  }
  if (value.includes('work started') || value.includes('in progress') || value.includes('repair')) {
    return 2;
  }
  if (value.includes('assigned')) return 1;
  return 0;
};

const formatDateTime = (value?: string): string => {
  if (!value) return 'N/A';

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount: number): string => {
  return `INR ${amount.toLocaleString('en-IN')}`;
};

const GST_RATE = 0.18;
const calcGST = (base: number) => {
  const gst = Math.round(base * GST_RATE * 100) / 100;
  return { base, gst, total: Math.round((base + gst) * 100) / 100 };
};

export function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { spacing, typography, isDark } = useTheme();
  const [requests, setRequests] = useState<TrackerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TrackerRequest | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const brandBlue = '#01325D';
  const primaryBlue = isDark ? '#1C4E7E' : brandBlue;
  const screenBg = isDark ? '#242D3B' : '#FFFFFF';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const subtitleColor = isDark ? '#C6D4E8' : '#5B6B80';
  const cardBg = isDark ? '#2D394A' : '#FFFFFF';
  const cardBorder = isDark ? '#3F5169' : '#E4E9F1';
  const labelColor = isDark ? '#B7C4D8' : '#667085';
  const bodyText = isDark ? '#F2F6FD' : '#111827';

  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const getTrackerRequests = useCallback(async () => {
    setLoading(true);

    const token = await getStoredToken();
    if (!token) {
      setRequests([]);
      setLoading(false);
      navigation.replace('Auth', { screen: 'Login' });
      return;
    }

    try {
      const response = await requestWithAuth<TrackerResponse>('/service-requests/my-requests', token);

      if (response.data?.success) {
        const dataRows =
          response.data.data && response.data.data.length > 0
            ? response.data.data
            : response.data.requests || [];

        const ongoing = dataRows
          .filter((item) => isOngoingStatus(normalizeStatus(item.status)))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setRequests(ongoing);
      } else {
        setRequests([]);
      }
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  React.useEffect(() => {
    getTrackerRequests();
  }, [getTrackerRequests]);

  const simulatePaymentReady = useCallback(async (requestId: string) => {
    setIsSimulating(true);
    try {
      const token = await getStoredToken();
      if (!token) return;
      const response = await requestWithAuth(
        `/service-requests/${requestId}/simulate-payment-ready`,
        token,
        { method: 'POST' }
      );
      if (response.data?.success) {
        Alert.alert('Test Mode', response.data.message);
        await getTrackerRequests();
        // Re-select updated request
        setSelectedRequest(prev =>
          prev?._id === requestId
            ? { ...prev, status: 'Ready for Pickup', adminFinalPrice: response.data.data.adminFinalPrice, paymentStatus: 'pending', assignedVendor: response.data.data.assignedVendor ? { _id: response.data.data.assignedVendor } : prev.assignedVendor }
            : prev
        );
      }
    } catch (e) {
      Alert.alert('Error', 'Could not simulate payment ready state');
    } finally {
      setIsSimulating(false);
    }
  }, [getTrackerRequests]);

  const isPaymentDue = (request: TrackerRequest) => {
    const status = (request.status || '').toLowerCase();
    const isReadyStatus =
      status === 'repair done' ||
      status === 'device delivered' ||
      status === 'delivered' ||
      status === 'completed';
    return isReadyStatus && !!request.adminFinalPrice && request.paymentStatus !== 'completed';
  };

  const getStatusChipColors = (status: TrackerStatus) => {
    switch (status) {
      case 'Completed':
        return {
          bg: isDark ? 'rgba(135,224,178,0.2)' : 'rgba(20,128,74,0.12)',
          text: isDark ? '#87E0B2' : '#14804A',
        };
      case 'In Progress':
        return {
          bg: isDark ? 'rgba(255,215,163,0.2)' : 'rgba(185,104,0,0.12)',
          text: isDark ? '#FFD7A3' : '#B96800',
        };
      case 'Assigned':
        return {
          bg: isDark ? 'rgba(140,183,232,0.2)' : 'rgba(1,50,93,0.12)',
          text: isDark ? '#8CB7E8' : '#01325D',
        };
      case 'Cancelled':
        return {
          bg: isDark ? 'rgba(255,122,122,0.2)' : 'rgba(180,35,24,0.12)',
          text: isDark ? '#FF9E9E' : '#B42318',
        };
      case 'Expired':
        return {
          bg: isDark ? 'rgba(199,210,226,0.2)' : 'rgba(107,119,136,0.15)',
          text: isDark ? '#C7D2E2' : '#6B7788',
        };
      default:
        return {
          bg: isDark ? 'rgba(199,210,226,0.2)' : 'rgba(107,119,136,0.15)',
          text: isDark ? '#C7D2E2' : '#6B7788',
        };
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 75) return isDark ? '#87E0B2' : '#14804A';
    if (progress >= 50) return isDark ? '#FFD7A3' : '#B96800';
    return isDark ? '#8CB7E8' : primaryBlue;
  };

  const getPricingRows = (request: TrackerRequest) => {
    const cp = request.calculatedPricing;

    if (cp) {
      const rows = [
        cp.netChargeRange
          ? { label: 'Base Service Charge', amount: -1, range: cp.netChargeRange }
          : cp.finalChargeRange
            ? { label: 'Estimated Charge', amount: -1, range: cp.finalChargeRange }
            : null,
        cp.serviceTypeFee
          ? { label: 'Service Type Fee', amount: cp.serviceTypeFee }
          : null,
        cp.urgencyFee
          ? { label: 'Urgency Charges', amount: cp.urgencyFee }
          : null,
        cp.warrantyFee
          ? { label: 'Extended Warranty', amount: cp.warrantyFee }
          : null,
        cp.dataSafetyFee
          ? { label: 'Data Safety & Backup', amount: cp.dataSafetyFee }
          : null,
      ].filter(Boolean) as { label: string; amount: number; range?: { min: number; max: number } }[];

      const totalRow = request.adminFinalPrice
        ? request.adminFinalPrice
        : cp.finalChargeRange
          ? -1
          : 0;

      return { rows, total: totalRow, finalChargeRange: cp.finalChargeRange };
    }

    // Fall back to relationalBehaviors pricing
    const rb = request.relationalBehaviors?.[0]?.pricing;
    if (rb) {
      return {
        rows: [
          {
            label: request.relationalBehaviors![0].title || 'Repair / Replacement',
            amount: -1,
            range: { min: rb.min_price, max: rb.max_price },
          },
        ],
        total: -1,
        finalChargeRange: { min: rb.min_price, max: rb.max_price },
      };
    }

    const fallback = Number(request.estimatedCost || request.vendorServiceCharge || request.budget || 0);
    return {
      rows: fallback > 0 ? [{ label: 'Estimated Cost', amount: fallback }] : [],
      total: Number(request.adminFinalPrice || fallback),
      finalChargeRange: undefined,
    };
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: screenBg,
        },
        fixedTop: {
          paddingTop: insets.top + spacing.lg,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          backgroundColor: screenBg,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        },
        scroll: {
          flex: 1,
          backgroundColor: 'transparent',
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxl,
        },
        header: {
          marginBottom: spacing.md,
        },
        title: {
          ...typography.title,
          fontSize: 30,
          color: headingColor,
          marginBottom: spacing.xs,
          fontFamily: fonts.bold,
        },
        subtitle: {
          ...typography.body,
          color: subtitleColor,
          fontFamily: fonts.medium,
        },
        createButton: {
          marginBottom: spacing.xs,
        },
        createRequestButton: {
          borderRadius: 14,
          minHeight: 56,
          backgroundColor: primaryBlue,
          shadowColor: '#000000',
          shadowOpacity: isDark ? 0.26 : 0.16,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 4,
        },
        createRequestButtonText: {
          color: '#FFFFFF',
          fontFamily: fonts.semibold,
          fontSize: 16,
          lineHeight: 20,
        },
        trackerCard: {
          backgroundColor: cardBg,
          padding: spacing.lg,
          borderRadius: 18,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: cardBorder,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: isDark ? 0.18 : 0.08,
          shadowRadius: 14,
          elevation: 4,
        },
        trackerHeader: {
          marginBottom: spacing.md,
        },
        trackerTitle: {
          color: headingColor,
          marginBottom: spacing.xs,
          fontFamily: fonts.bold,
          fontSize: 18,
          lineHeight: 24,
        },
        description: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 14,
          lineHeight: 20,
          marginBottom: spacing.sm,
        },
        trackerMeta: {
          flexDirection: 'row',
          justifyContent: 'space-between',
        },
        metaItem: {
          flex: 1,
        },
        metaLabel: {
          color: labelColor,
          marginBottom: 2,
          fontFamily: fonts.medium,
          fontSize: 12,
          lineHeight: 16,
        },
        metaValue: {
          color: bodyText,
          fontFamily: fonts.semibold,
          fontSize: 14,
          lineHeight: 20,
        },
        progressSection: {
          marginBottom: spacing.md,
        },
        progressHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.sm,
        },
        progressLabel: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 14,
          lineHeight: 20,
        },
        progressPercentage: {
          color: bodyText,
          fontFamily: fonts.semibold,
          fontSize: 14,
          lineHeight: 20,
        },
        progressBar: {
          height: 8,
          backgroundColor: cardBorder,
          borderRadius: 4,
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          borderRadius: 4,
        },
        cardStatusRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        statusChip: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 999,
        },
        statusChipText: {
          fontFamily: fonts.semibold,
          fontSize: 12,
          lineHeight: 16,
        },
        viewDetailsButton: {
          borderRadius: 10,
          borderWidth: 1,
          borderColor: primaryBlue,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs,
        },
        viewDetailsText: {
          color: primaryBlue,
          fontFamily: fonts.semibold,
          fontSize: 13,
          lineHeight: 18,
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
        emptyState: {
          alignItems: 'center',
          paddingVertical: spacing.xl,
          backgroundColor: cardBg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: cardBorder,
          paddingHorizontal: spacing.lg,
        },
        emptyTitle: {
          fontSize: 20,
          lineHeight: 26,
          color: headingColor,
          marginBottom: spacing.sm,
          fontFamily: fonts.bold,
        },
        emptySubtitle: {
          fontSize: 14,
          lineHeight: 21,
          color: subtitleColor,
          textAlign: 'center',
          fontFamily: fonts.medium,
        },
        modalOverlay: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        modalCard: {
          backgroundColor: cardBg,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: cardBorder,
          maxHeight: '85%',
          overflow: 'hidden',
        },
        modalScroll: {
          padding: spacing.lg,
        },
        modalHeaderRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.md,
        },
        modalTitleWrap: {
          flex: 1,
          paddingRight: spacing.md,
        },
        modalTitle: {
          color: headingColor,
          fontFamily: fonts.bold,
          fontSize: 20,
          lineHeight: 26,
          marginBottom: spacing.xs,
        },
        modalRequestId: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 13,
          lineHeight: 18,
        },
        closeButton: {
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isDark ? 'rgba(199,210,226,0.18)' : 'rgba(107,119,136,0.12)',
        },
        modalSectionTitle: {
          color: headingColor,
          fontFamily: fonts.semibold,
          fontSize: 16,
          lineHeight: 22,
          marginBottom: spacing.sm,
          marginTop: spacing.sm,
        },
        statusSteps: {
          gap: spacing.xs,
        },
        timelineRow: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          marginBottom: spacing.xs,
        },
        timelineIconWrap: {
          width: 20,
          alignItems: 'center',
          marginRight: spacing.sm,
          marginTop: 1,
        },
        timelineTextWrap: {
          flex: 1,
        },
        timelineText: {
          fontFamily: fonts.medium,
          fontSize: 13,
          lineHeight: 18,
        },
        currentStatusTag: {
          fontFamily: fonts.medium,
          fontSize: 11,
          lineHeight: 16,
          color: primaryBlue,
          marginTop: 2,
        },
        detailsSplitRow: {
          flexDirection: 'row',
          gap: spacing.md,
          marginTop: spacing.xs,
        },
        detailsCol: {
          flex: 1,
        },
        detailsSubTitle: {
          color: headingColor,
          fontFamily: fonts.semibold,
          fontSize: 15,
          lineHeight: 20,
          marginBottom: spacing.xs,
        },
        detailsLine: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 13,
          lineHeight: 19,
          marginBottom: 2,
        },
        detailsLineValue: {
          color: bodyText,
          fontFamily: fonts.semibold,
          fontSize: 13,
          lineHeight: 19,
        },
        locationText: {
          color: bodyText,
          fontFamily: fonts.medium,
          fontSize: 13,
          lineHeight: 19,
        },
        pricingTable: {
          borderWidth: 1,
          borderColor: cardBorder,
          borderRadius: 10,
          overflow: 'hidden',
          marginTop: spacing.xs,
        },
        pricingRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: cardBorder,
        },
        pricingLabel: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 13,
          lineHeight: 18,
        },
        pricingValue: {
          color: bodyText,
          fontFamily: fonts.semibold,
          fontSize: 13,
          lineHeight: 18,
        },
        pricingTotalRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: isDark ? 'rgba(199,210,226,0.12)' : 'rgba(1,50,93,0.06)',
        },
        pricingTotalLabel: {
          color: headingColor,
          fontFamily: fonts.semibold,
          fontSize: 13,
          lineHeight: 18,
        },
        pricingTotalValue: {
          color: headingColor,
          fontFamily: fonts.bold,
          fontSize: 14,
          lineHeight: 18,
        },
        paymentDueBox: {
          marginTop: spacing.md,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: isDark ? '#FFD7A3' : '#F59E0B',
          backgroundColor: isDark ? 'rgba(255,215,163,0.12)' : 'rgba(245,158,11,0.08)',
          padding: spacing.md,
        },
        paymentDueTitle: {
          color: isDark ? '#FFD7A3' : '#B45309',
          fontFamily: fonts.bold,
          fontSize: 15,
          marginBottom: spacing.xs,
        },
        paymentDueAmount: {
          color: isDark ? '#FFD7A3' : '#B45309',
          fontFamily: fonts.semibold,
          fontSize: 14,
          marginBottom: spacing.sm,
        },
        payNowButton: {
          backgroundColor: isDark ? '#FFD7A3' : '#F59E0B',
          borderRadius: 10,
          paddingVertical: spacing.sm,
          alignItems: 'center',
        },
        payNowText: {
          color: isDark ? '#1A1A1A' : '#FFFFFF',
          fontFamily: fonts.bold,
          fontSize: 15,
        },
        testButton: {
          marginTop: spacing.md,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: isDark ? '#B8C8DE' : '#94A3B8',
          borderStyle: 'dashed',
          paddingVertical: spacing.sm,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.xs,
        },
        testButtonText: {
          color: isDark ? '#B8C8DE' : '#64748B',
          fontFamily: fonts.medium,
          fontSize: 12,
        },
      }),
    [
      spacing,
      typography,
      insets,
      isDark,
      screenBg,
      cardBorder,
      headingColor,
      subtitleColor,
      primaryBlue,
      cardBg,
      labelColor,
      bodyText,
      fonts,
    ]
  );

  return (
    <View style={styles.container}>
      <View style={styles.illustrationBehind} pointerEvents="none">
        <MobileLaptop width={600} height={220} />
      </View>
      <View style={styles.leftDecoration} pointerEvents="none">
        <Image source={require('../../assets/icons/icon5.png')} style={styles.leftDecorationImage} resizeMode="contain" />
      </View>
      <View style={styles.rightDecoration} pointerEvents="none">
        <Image source={require('../../assets/icons/icon3.png')} style={styles.rightDecorationImage} resizeMode="contain" />
      </View>
      <View style={styles.fixedTop}>
        <View style={styles.header}>
          <Text style={styles.title}>Request Tracker</Text>
          <Text style={styles.subtitle}>Monitor the progress of your service requests</Text>
        </View>

        <View style={styles.createButton}>
          <Button
            title="Create New Request"
            variant="primary"
            style={styles.createRequestButton}
            textStyle={styles.createRequestButtonText}
            onPress={() => {
              navigation.navigate('ServiceRequestStack');
            }}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={getTrackerRequests}
            tintColor={primaryBlue}
            colors={[primaryBlue]}
            progressBackgroundColor={cardBg}
          />
        }
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Service Requests</Text>
            <Text style={styles.emptySubtitle}>
              You haven't created any service requests yet. Create one to get started!
            </Text>
          </View>
        ) : (
          requests.map((request) => {
            const normalizedStatus = normalizeStatus(request.status);
            const progress = getProgressPercentage(normalizedStatus, request.status);
            const chip = getStatusChipColors(normalizedStatus);

            return (
              <TouchableOpacity key={request._id} style={styles.trackerCard} activeOpacity={0.9}>
                <View style={styles.trackerHeader}>
                  <Text style={styles.trackerTitle}>{request.brand} {request.model}</Text>
                  <Text style={styles.description} numberOfLines={2}>
                    {request.problemDescription || 'No description available'}
                  </Text>
                  <View style={styles.trackerMeta}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Ticket Time</Text>
                      <Text style={styles.metaValue}>{formatDateTime(request.createdAt)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={styles.progressPercentage}>{progress}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: getProgressColor(progress),
                        },
                      ]}
                    />
                  </View>
                </View>

                <View style={styles.cardStatusRow}>
                  <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
                    <Text style={[styles.statusChipText, { color: chip.text }]}>{normalizedStatus}</Text>
                  </View>

                  <Pressable style={styles.viewDetailsButton} onPress={() => setSelectedRequest(request)}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                  </Pressable>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={selectedRequest !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedRequest && (() => {
              const statusLabel = normalizeStatus(selectedRequest.status);
              const timelineIndex = getCurrentTimelineIndex(selectedRequest.status);
              const pricing = getPricingRows(selectedRequest);
              const location = [selectedRequest.address, selectedRequest.city]
                .filter(Boolean)
                .join(', ') || 'N/A';

              return (
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  <View style={styles.modalHeaderRow}>
                    <View style={styles.modalTitleWrap}>
                      <Text style={styles.modalTitle}>{selectedRequest.brand} {selectedRequest.model}</Text>
                      <Text style={styles.modalRequestId}>Request ID: {selectedRequest._id}</Text>
                    </View>
                    <Pressable style={styles.closeButton} onPress={() => setSelectedRequest(null)}>
                      <Icon name="x" size={16} color={labelColor} />
                    </Pressable>
                  </View>

                  <Text style={styles.modalSectionTitle}>Status Timeline</Text>
                  <View style={styles.statusSteps}>
                    {STATUS_STEPS.map((step, index) => {
                      const isCurrent = index === timelineIndex;
                      const stepColor = isCurrent ? bodyText : labelColor;
                      const iconColor = isCurrent ? primaryBlue : labelColor;

                      return (
                        <View key={step} style={styles.timelineRow}>
                          <View style={styles.timelineIconWrap}>
                            <Icon name={isCurrent ? 'check-circle' : 'circle'} size={14} color={iconColor} />
                          </View>
                          <View style={styles.timelineTextWrap}>
                            <Text style={[styles.timelineText, { color: stepColor }]}>{step}</Text>
                            {isCurrent ? <Text style={styles.currentStatusTag}>Current status</Text> : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.detailsSplitRow}>
                    <View style={styles.detailsCol}>
                      <Text style={styles.detailsSubTitle}>Request Details</Text>
                      <Text style={styles.detailsLine}>
                        Problem: <Text style={styles.detailsLineValue}>{selectedRequest.mainProblem?.title || selectedRequest.problemDescription || 'N/A'}</Text>
                      </Text>
                      <Text style={styles.detailsLine}>
                        Type: <Text style={styles.detailsLineValue}>{selectedRequest.subProblem?.title || (selectedRequest.knowsProblem ? 'Known Problem' : 'Needs Identification')}</Text>
                      </Text>
                      <Text style={styles.detailsLine}>
                        Level: <Text style={styles.detailsLineValue}>{selectedRequest.issueLevel || selectedRequest.priority || statusLabel}</Text>
                      </Text>
                      <Text style={styles.detailsLine}>
                        Created: <Text style={styles.detailsLineValue}>{formatDateTime(selectedRequest.createdAt)}</Text>
                      </Text>
                    </View>

                    <View style={styles.detailsCol}>
                      <Text style={styles.detailsSubTitle}>Location</Text>
                      <Text style={styles.locationText}>{location}</Text>
                    </View>
                  </View>

                  {/* Payment Due Section */}
                  {isPaymentDue(selectedRequest) && (() => {
                    const gst = calcGST(selectedRequest.adminFinalPrice!);
                    return (
                      <View style={styles.paymentDueBox}>
                        <Text style={styles.paymentDueTitle}>Payment Required</Text>
                        <View style={{ marginVertical: 6, gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.paymentDueAmount}>Service Charge</Text>
                            <Text style={styles.paymentDueAmount}>₹{gst.base.toFixed(2)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.paymentDueAmount}>GST (18%)</Text>
                            <Text style={styles.paymentDueAmount}>₹{gst.gst.toFixed(2)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 4 }}>
                            <Text style={[styles.paymentDueAmount, { fontWeight: '700' }]}>Total</Text>
                            <Text style={[styles.paymentDueAmount, { fontWeight: '700' }]}>₹{gst.total.toFixed(2)}</Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.payNowButton}
                          onPress={() => setShowPaymentModal(true)}
                        >
                          <Text style={styles.payNowText}>Pay Now ₹{gst.total.toFixed(2)}</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}

                  {/* DEV TEST BUTTON — only visible when DEV_MODE is on */}
                  {config.DEV_MODE && !isPaymentDue(selectedRequest) && selectedRequest.paymentStatus !== 'completed' && (
                    <TouchableOpacity
                      style={styles.testButton}
                      onPress={() => simulatePaymentReady(selectedRequest._id)}
                      disabled={isSimulating}
                    >
                      {isSimulating
                        ? <ActivityIndicator size="small" color={labelColor} />
                        : <Icon name="zap" size={12} color={labelColor} />}
                      <Text style={styles.testButtonText}>
                        {isSimulating ? 'Simulating...' : '[DEV] Simulate Ready for Payment'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.modalSectionTitle}>Pricing Summary</Text>
                  <View style={styles.pricingTable}>
                    {pricing.rows.length === 0 ? (
                      <View style={styles.pricingRow}>
                        <Text style={styles.pricingLabel}>No pricing data available yet</Text>
                      </View>
                    ) : (
                      pricing.rows.map((item, index) => (
                        <View
                          key={item.label}
                          style={[
                            styles.pricingRow,
                            index === pricing.rows.length - 1 ? { borderBottomWidth: 0 } : undefined,
                          ]}
                        >
                          <Text style={styles.pricingLabel}>{item.label}</Text>
                          <Text style={styles.pricingValue}>
                            {item.range
                              ? `₹${item.range.min} – ₹${item.range.max}`
                              : formatCurrency(item.amount)}
                          </Text>
                        </View>
                      ))
                    )}
                    <View style={styles.pricingTotalRow}>
                      <Text style={styles.pricingTotalLabel}>Total</Text>
                      <Text style={styles.pricingTotalValue}>
                        {pricing.total === -1 && pricing.finalChargeRange
                          ? `₹${pricing.finalChargeRange.min} – ₹${pricing.finalChargeRange.max}`
                          : pricing.total > 0
                            ? formatCurrency(pricing.total)
                            : 'Pending'}
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={[styles.modalOverlay, { justifyContent: 'flex-end', paddingHorizontal: 0 }]}>
          <View style={[styles.modalCard, { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, maxHeight: '90%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: cardBorder }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Complete Payment</Text>
              <Pressable style={styles.closeButton} onPress={() => setShowPaymentModal(false)}>
                <Icon name="x" size={16} color={labelColor} />
              </Pressable>
            </View>
            <ScrollView style={{ padding: spacing.lg }}>
              {selectedRequest && (
                <PaymentForm
                  serviceRequestId={selectedRequest._id}
                  vendorId={selectedRequest.assignedVendor?._id || selectedRequest._id}
                  amount={calcGST(selectedRequest.adminFinalPrice || 0).total}
                  onPaymentComplete={() => {
                    setShowPaymentModal(false);
                    setSelectedRequest(null);
                    getTrackerRequests();
                  }}
                  onCancel={() => setShowPaymentModal(false)}
                />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
