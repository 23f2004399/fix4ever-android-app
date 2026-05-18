import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import { Button } from '../../core/components';
import { getStoredToken } from '../../core/storage';
import { requestWithAuth } from '../../core/api';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';

interface ServiceRequestHistoryItem {
  _id: string;
  brand: string;
  model: string;
  problemDescription: string;
  problemType?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  address: string;
  city: string;
  priority: string;
  isUrgent: boolean;
}

interface ServiceRequestHistoryResponse {
  success: boolean;
  message?: string;
  data?: ServiceRequestHistoryItem[];
  requests?: ServiceRequestHistoryItem[];
  count?: number;
}

export function CreateRequestScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { spacing, typography, isDark } = useTheme();

  const brandBlue = '#01325D';
  const primaryBlue = isDark ? '#1C4E7E' : brandBlue;
  const screenBg = isDark ? '#242D3B' : '#FFFFFF';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const mutedText = isDark ? '#D0D8E5' : '#3A3A3A';
  const cardBg = isDark ? '#2D394A' : '#FFFFFF';
  const cardBorder = isDark ? '#3F5169' : '#E4E9F1';
  const labelColor = isDark ? '#D5E1F1' : '#667085';
  const bodyText = isDark ? '#F2F6FD' : '#111827';

  const [serviceHistory, setServiceHistory] = useState<ServiceRequestHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fonts = {
    regular: 'Montserrat-Regular',
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return isDark ? '#87E0B2' : '#14804A';
      case 'In Progress':
        return isDark ? '#FFD7A3' : '#B96800';
      case 'Pending':
        return isDark ? '#C7D2E2' : '#6B7788';
      default:
        return isDark ? '#C7D2E2' : '#6B7788';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getServiceHistory = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoadingHistory(true);
    }

    const token = await getStoredToken();
    if (!token) {
      setServiceHistory([]);
      setLoadingHistory(false);
      setRefreshing(false);
      (navigation as any).replace('Auth', { screen: 'Login' });
      return;
    }

    try {
      const response = await requestWithAuth<ServiceRequestHistoryResponse>(
        '/service-requests/my-requests',
        token
      );

      if (response.data?.success) {
        const rawHistory =
          response.data.data && response.data.data.length > 0
            ? response.data.data
            : response.data.requests || [];

        const sortedHistory = [...rawHistory].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setServiceHistory(sortedHistory);
      } else {
        setServiceHistory([]);
      }
    } catch (error) {
      console.error('Error fetching service history:', error);
      setServiceHistory([]);
    } finally {
      setLoadingHistory(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    getServiceHistory();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      getServiceHistory(true);
    }, [])
  );

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
              color: mutedText,
            fontFamily: fonts.medium,
          },
          historySectionHeader: {
            marginBottom: spacing.md,
          },
          historySectionTitle: {
            ...typography.subtitle,
              color: headingColor,
            fontFamily: fonts.semibold,
          },
          requestCard: {
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
          requestHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing.md,
          },
          requestTitle: {
            flex: 1,
            paddingRight: spacing.md,
          },
          deviceModel: {
              color: headingColor,
            fontSize: 18,
            lineHeight: 24,
            marginBottom: spacing.xs,
            fontFamily: fonts.bold,
            textTransform: 'uppercase',
          },
          issueDescription: {
              color: labelColor,
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
            gap: spacing.sm,
          },
          detailRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          detailLabel: {
            fontSize: 15,
            lineHeight: 20,
              color: labelColor,
            fontFamily: fonts.medium,
          },
          detailValue: {
            fontSize: 15,
            lineHeight: 20,
              color: bodyText,
            fontFamily: fonts.semibold,
          },
          urgentText: {
            color: isDark ? '#FFD7A3' : '#B96800',
          },
          alternativeRequestContainer: {
            marginBottom: 0,
          },
            createRequestButton: {
              borderRadius: 12,
              minHeight: 56,
              backgroundColor: primaryBlue,
              shadowColor: '#000000',
              shadowOpacity: isDark ? 0.2 : 0.14,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
              borderWidth: 0,
            },
            createRequestButtonText: {
              color: '#FFFFFF',
              fontFamily: fonts.semibold,
              fontSize: 16,
              lineHeight: 18,
            },
          historyLoading: {
            marginTop: spacing.md,
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
              color: mutedText,
            textAlign: 'center',
            fontFamily: fonts.medium,
          },
        }),
    [
      spacing,
      typography,
      insets,
      isDark,
      screenBg,
      headingColor,
      mutedText,
      cardBg,
      cardBorder,
      labelColor,
      bodyText,
      primaryBlue,
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
          <Text style={styles.title}>New Service Request</Text>
          <Text style={styles.subtitle}>Create a request and review your service history</Text>
        </View>

        <View style={styles.alternativeRequestContainer}>
          <Button
            title="Start New Service Request"
            onPress={() => (navigation as any).navigate('ServiceRequestStack')}
            variant="primary"
            style={styles.createRequestButton}
            textStyle={styles.createRequestButtonText}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => getServiceHistory(true)}
            tintColor={primaryBlue}
            colors={[primaryBlue]}
            progressBackgroundColor={cardBg}
          />
        }
      >

        <View style={styles.historySectionHeader}>
          <Text style={styles.historySectionTitle}>Your Service History</Text>
        </View>

        {loadingHistory ? (
          <ActivityIndicator
            style={styles.historyLoading}
            size="large"
            color={primaryBlue}
          />
        ) : serviceHistory.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Service History Yet</Text>
            <Text style={styles.emptySubtitle}>
              Your past service requests will appear here once you create one.
            </Text>
          </View>
        ) : (
          serviceHistory.map((request) => (
            <TouchableOpacity
              key={request._id}
              style={styles.requestCard}
              onPress={() => (navigation as any).navigate('ServiceRequestDetails', { serviceRequest: request })}
              activeOpacity={0.8}
            >
              <View style={styles.requestHeader}>
                <View style={styles.requestTitle}>
                  <Text style={styles.deviceModel}>
                    {request.brand?.toUpperCase()} {request.model}
                  </Text>
                  <Text style={styles.issueDescription}>
                    {request.problemDescription || request.problemType || 'Unknown issue'}
                  </Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={[styles.statusText, { color: getStatusColor(request.status) }]}>
                    {request.status}
                  </Text>
                </View>
              </View>

              <View style={styles.requestDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(request.createdAt)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{request.city || request.address || 'N/A'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Priority</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      request.isUrgent ? styles.urgentText : undefined,
                    ]}
                  >
                    {request.isUrgent ? 'Urgent' : request.priority || 'medium'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
