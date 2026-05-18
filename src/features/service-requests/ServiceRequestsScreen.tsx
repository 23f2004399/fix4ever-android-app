import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Button, ServiceRequestTimer } from '../../core/components';
import { useFocusEffect } from '@react-navigation/native';

import { getStoredToken } from '../../core/storage';
import { config } from '../../core/config';
import { requestWithAuth } from '../../core/api';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../home/HomeScreen';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';


export interface ServiceRequest {
  _id: string;
  brand: string;
  model: string;
  deviceType?: string;
  category?: string;
  problemType: string;
  status: string;
  priority?: string;
  urgency?: string;
  createdAt: string;
  updatedAt: string;
  preferredDate?: string;
  preferredTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  scheduleStatus?: 'pending' | 'proposed' | 'accepted' | 'rejected' | 'scheduled';
  scheduleNotes?: string;
  availableSlots?: string[];
  budget?: number;
  estimatedCost?: number;
  vendorServiceCharge?: number;
  city?: string;
  address?: string;
  assignedTechnician?: {
    pocInfo: {
      fullName: string;
    };
  };
  assignedVendor?: any;
  issueImages?: string[];
  paymentStatus?: string;
  timerExpiresAt?: string;
  isTimerActive?: boolean;
  completedAt?: string;
  adminFinalPrice?: number;
  // Additional fields for timer functionality
  userName?: string;
  userPhone?: string;
  requestType?: string;
  serviceType?: string;
  beneficiaryName?: string;
  beneficiaryPhone?: string;
  isUrgent?: boolean;
  issueLevel?: string;
  wantsWarranty?: boolean;
  wantsDataSafety?: boolean;
  calculatedPricing?: any;
  latitude?: number;
  longitude?: number;
  location?: any;
}

interface ServiceRequestResponse {
  success: boolean;
  requests: ServiceRequest[];
}

export function ServiceRequestsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { colors, spacing, typography, isDark } = useTheme();

  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const primaryBlue = isDark ? '#1C4E7E' : '#01325D';
  const screenBg = isDark ? '#242D3B' : '#FFFFFF';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const subtitleColor = isDark ? '#C6D4E8' : '#5B6B80';
  const cardBg = isDark ? '#2D394A' : '#FFFFFF';
  const cardBorder = isDark ? '#3F5169' : '#E4E9F1';
  const statusColor = isDark ? '#C7D2E2' : '#6B7788';
  const mutedLabel = isDark ? '#B7C4D8' : '#667085';
  const bodyText = isDark ? '#F2F6FD' : '#111827';

  const getServiceRequests = async () => {
      const token: string | null = await getStoredToken();
      if (!token) {
          setLoading(false);
          // Redirect to login screen when no token found
          navigation.replace('Auth', { screen: 'Login' });
          return;
      }
      try {
        const response = await requestWithAuth<ServiceRequestResponse>('/service-requests/my-requests', token);
        console.log(response)
        if (response.data?.success) {
          const data = response.data.requests;
          setServiceRequests(data);
        }

        return response; 
      } catch (error) {
        console.error('Error fetching service requests:', error);
      } finally {
        setLoading(false);
      }
  }


  useEffect(() => {
    getServiceRequests();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      getServiceRequests();
    }, [])
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return isDark ? '#87E0B2' : '#14804A';
      case 'In Progress':
        return isDark ? '#FFD7A3' : '#B96800';
      case 'Pending':
        return statusColor;
      default:
        return statusColor;
    }
  };

    const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const styles = useMemo(
      ()=>
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
            paddingBottom: insets.bottom + spacing.xl,
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
          requestCard: {
            backgroundColor: cardBg,
            padding: spacing.lg,
            borderRadius: 18,
            marginBottom: spacing.md + spacing.xs,
            borderWidth: 1,
            borderColor: cardBorder,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 14,
            elevation: 4,
          },
          requestHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.md + 2,
          },
          requestTitle: {
            flex: 1,
            paddingRight: spacing.md,
          },
          deviceModel: {
            color: headingColor,
            fontSize: 18,
            lineHeight: 24,
            letterSpacing: -0.2,
            marginBottom: spacing.xs,
            fontFamily: fonts.bold,
            textTransform: 'uppercase',
          },
          issueDescription: {
            color: mutedLabel,
            fontSize: 14,
            lineHeight: 20,
            fontFamily: fonts.medium,
          },
          statusBadge: {
            paddingHorizontal: spacing.xs,
            paddingVertical: spacing.xs,
          },
          statusText: {
            fontSize: 14,
            lineHeight: 18,
            fontFamily: fonts.semibold,
            fontStyle: 'italic',
          },
          requestDetails: {
            gap: spacing.sm + 2,
          },
          detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          detailLabel: {
            fontSize: 16,
            lineHeight: 22,
            color: mutedLabel,
            fontFamily: fonts.medium,
          },
          detailValue: {
            fontSize: 16,
            lineHeight: 22,
            color: bodyText,
            fontFamily: fonts.semibold,
          },
          createButton: {
            marginBottom: spacing.lg + spacing.xs,
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
            paddingVertical: spacing.xxl,
            backgroundColor: cardBg,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: cardBorder,
            paddingHorizontal: spacing.lg,
          },
          emptyTitle: {
            fontSize: 22,
            lineHeight: 28,
            color: headingColor,
            marginBottom: spacing.sm,
            fontFamily: fonts.bold,
          },
          emptySubtitle: {
            fontSize: 15,
            lineHeight: 22,
            color: subtitleColor,
            textAlign: 'center',
            fontFamily: fonts.medium,
          },
        })
      ,[spacing, typography, insets, screenBg, headingColor, subtitleColor, cardBg, cardBorder, mutedLabel, bodyText, primaryBlue, isDark, fonts])

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
          <Text style={styles.title}>Service Requests</Text>
          <Text style={styles.subtitle}>Track and manage your repair requests</Text>
        </View>

        <View style={styles.createButton}>
          <Button
            title="Create New Request"
            variant="primary"
            style={styles.createRequestButton}
            textStyle={styles.createRequestButtonText}
            onPress={  (() => {
              navigation.navigate('ServiceRequestStack');
          })}
          />
        </View>

        {/* DEV: only shown when config.DEV_MODE is on */}
        {config.DEV_MODE && <TouchableOpacity
          onPress={() =>
            (navigation as any).navigate('OnsiteChat', {
              serviceRequest: {
                _id: 'dev-test-001',
                brand: 'Dell',
                model: 'Inspiron 15',
                serviceType: 'onsite',
                preferredDate: '2026-05-15',
                preferredTime: '11:00 AM',
                assignedTechnician: {
                  _id: 'tech-001',
                  pocInfo: {
                    fullName: 'Rahul Sharma',
                    email: 'rahul@fix4ever.in',
                    phone: '9876543210',
                  },
                },
              },
            })
          }
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.warning,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.warning, fontSize: 12, fontFamily: 'Montserrat-Medium' }}>
            [DEV] Test Onsite Chat
          </Text>
        </TouchableOpacity>}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={getServiceRequests}
            tintColor={primaryBlue}
            colors={[primaryBlue]}
            progressBackgroundColor={cardBg}
          />
        }
      >
        

        {serviceRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Service Requests</Text>
            <Text style={styles.emptySubtitle}>
              You haven't created any service requests yet. Tap the button above to get started.
            </Text>
          </View>
        ) : (
          serviceRequests.map((request) => (
            <TouchableOpacity 
              key={request._id} 
              style={styles.requestCard}
              onPress={() => (navigation as any).navigate('ServiceRequestDetails', { serviceRequest: request })}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestTitle}>
                  <Text style={styles.deviceModel}>{request.brand?.toUpperCase()} {request.model}</Text>
                  <Text style={styles.issueDescription}>{request.problemType}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {request.status}
                  </Text>
                </View>
              </View>
              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
                </View>
                {request.category && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Category:</Text>
                    <Text style={styles.detailValue}>{request.category}</Text>
                  </View>
                )}
                {request.status === 'Pending' &&
                  request.isTimerActive &&
                  request.timerExpiresAt && (
                    <ServiceRequestTimer serviceRequest={request} />
                  )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

