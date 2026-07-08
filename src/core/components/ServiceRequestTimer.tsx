import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../core/theme';
import { useNavigation } from '@react-navigation/native';
import { requestWithAuth, saveDraftServiceRequest } from '../../core/api';
import { getStoredToken } from '../../core/storage';
import { ThemedAlertDialog } from '../../core/components/ThemedAlertDialog';
import { Button } from './Button';

interface ServiceRequestTimerProps {
  serviceRequest: {
    _id: string;
    status: string;
    brand: string;
    model: string;
    problemType: string;
    address?: string;
    city?: string;
    timerExpiresAt?: string;
    isTimerActive?: boolean;
    createdAt: string;
    userName?: string;
    userPhone?: string;
    requestType?: string;
    serviceType?: string;
    beneficiaryName?: string;
    beneficiaryPhone?: string;
    preferredDate?: string;
    preferredTime?: string;
    budget?: number;
    priority?: string;
    isUrgent?: boolean;
    issueLevel?: string;
    urgency?: string;
    wantsWarranty?: boolean;
    wantsDataSafety?: boolean;
    calculatedPricing?: any;
    latitude?: number;
    longitude?: number;
    location?: any;
  };
}

const RETRY_REASONS = [
  { id: 'no_response', label: 'No technicians responded', icon: 'clock' },
  { id: 'wrong_location', label: 'Wrong location entered', icon: 'map-pin' },
  { id: 'wrong_device', label: 'Wrong device details', icon: 'monitor' },
  { id: 'urgent_need', label: 'Need urgent service', icon: 'alert-circle' },
  { id: 'price_issue', label: 'Price too high', icon: 'dollar-sign' },
  { id: 'other', label: 'Other reason', icon: 'help-circle' },
];

export function ServiceRequestTimer({ serviceRequest }: ServiceRequestTimerProps) {
  const navigation = useNavigation<any>();
  const { colors, typography, isDark } = useTheme();
  const fonts = {
    medium: 'Montserrat-Medium',
    semibold: 'Montserrat-SemiBold',
    bold: 'Montserrat-Bold',
  } as const;

  const primaryBlue = isDark ? '#2B5F91' : '#01325D';
  const waitingStripBg = isDark ? '#33465F' : '#FFFFFF';
  const waitingStripBorder = isDark ? '#51698A' : '#D4DEEA';
  const waitingDot = isDark ? '#6DD89A' : '#299C61';
  const timerSuccess = isDark ? '#86E0B1' : '#147D47';
  const timerWarning = isDark ? '#F6C887' : '#B96800';
  const countdownCaption = isDark ? '#C2D0E2' : '#5F6E82';
  const outlineBorder = isDark ? '#60748F' : '#CBD6E5';
  const outlineText = isDark ? '#EAF1FB' : '#18263A';
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
    total: number;
  }>({ hours: 0, minutes: 0, seconds: 0, total: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isModifying, setIsModifying] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showModifyAlert, setShowModifyAlert] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  // Calculate time left
  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!serviceRequest || !serviceRequest.timerExpiresAt || !serviceRequest.isTimerActive) {
        setIsExpired(true);
        return;
      }

      const now = new Date().getTime();
      const expiryTime = new Date(serviceRequest.timerExpiresAt).getTime();
      const difference = expiryTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ hours, minutes, seconds, total: difference });
        setIsExpired(false);
      } else {
        setIsExpired(true);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, total: 0 });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [serviceRequest.timerExpiresAt, serviceRequest.isTimerActive]);

  const cloneAndNavigate = async (actionName: string) => {
    try {
      const token = await getStoredToken();
      if (!token) throw new Error('No authentication token found');

      // 1. Build and save the Draft FIRST to ensure data is safely backed up
      const draftPayload = {
        createNew: true,
        brand: serviceRequest.brand,
        model: serviceRequest.model,
        problemType: serviceRequest.problemType,
        problemDescription: serviceRequest.problemDescription,
        address: serviceRequest.address,
        city: serviceRequest.city,
        userName: serviceRequest.userName,
        userPhone: serviceRequest.userPhone,
        requestType: serviceRequest.requestType,
        serviceType: serviceRequest.serviceType,
        beneficiaryName: serviceRequest.beneficiaryName,
        beneficiaryPhone: serviceRequest.beneficiaryPhone,
        preferredDate: serviceRequest.preferredDate,
        preferredTime: serviceRequest.preferredTime,
        budget: serviceRequest.budget,
        priority: serviceRequest.priority,
        isUrgent: serviceRequest.isUrgent,
        issueLevel: serviceRequest.issueLevel,
        urgency: serviceRequest.urgency,
        wantsWarranty: serviceRequest.wantsWarranty,
        wantsDataSafety: serviceRequest.wantsDataSafety,
        calculatedPricing: serviceRequest.calculatedPricing,
        knowsProblem: (serviceRequest as any).knowsProblem !== undefined 
          ? (serviceRequest as any).knowsProblem 
          : !!((serviceRequest as any).mainProblem?.title || (serviceRequest as any).mainProblem?.id),
        selectedProblem: {
          mainProblem: (serviceRequest as any).mainProblem,
          subProblem: (serviceRequest as any).subProblem,
          relationalBehaviors: (serviceRequest as any).relationalBehaviors,
        },
        issueImages: (serviceRequest as any).issueImages,
        location: serviceRequest.location || {
          lat: serviceRequest.latitude,
          lng: serviceRequest.longitude,
          latitude: serviceRequest.latitude,
          longitude: serviceRequest.longitude,
        },
      };

      const draftRes = await saveDraftServiceRequest(draftPayload);
      
      if (draftRes.error) {
        throw new Error(`Failed to create a draft for ${actionName}`);
      }

      const savedDraft = draftRes.data?.draft || draftRes.data?.data?.draft;
      const newDraftId = 
        savedDraft?._id || savedDraft?.id || savedDraft?.draftId ||
        draftRes.data?.data?._id || draftRes.data?.data?.id || draftRes.data?.data?.draftId ||
        draftRes.data?.draftId || draftRes.data?.id || draftRes.data?._id;

      if (!newDraftId) {
        throw new Error(`Could not retrieve new draft ID for ${actionName}. Server response: ` + JSON.stringify(draftRes.data));
      }

      // 2. Draft is safely saved! Now attempt to hard delete the old request
      const cancelRes = await requestWithAuth(
        `/service-requests/${serviceRequest._id}/cancel?action=supersede`,
        token,
        { method: 'PATCH' }
      );
      if (cancelRes.error && cancelRes.error.message && !cancelRes.error.message.includes('Only pending')) {
        console.warn('Cancel warning:', cancelRes.error.message);
      }

      // 3. Navigate to Stack with the new draftId
      navigation.navigate('ServiceRequestStack', { draftId: newDraftId });

    } catch (error: any) {
      console.error(`Error ${actionName} service request:`, error);
      Alert.alert('Error', error.message || `Failed to open ${actionName} form`);
    }
  };

  const handleRetry = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for retrying');
      return;
    }

    setIsRetrying(true);
    setShowRetryModal(false);
    await cloneAndNavigate('retry');
    setSelectedReason('');
    setIsRetrying(false);
  };

  const handleModify = () => {
    setShowModifyAlert(true);
  };

  const handleConfirmModify = async () => {
    setIsModifying(true);
    await cloneAndNavigate('modification');
    setIsModifying(false);
  };

  const getTimerColor = () => {
    if (isExpired) return colors.error;
    if (timeLeft.total < 5 * 60 * 1000) return timerWarning; // Less than 5 minutes
    if (timeLeft.total < 10 * 60 * 1000) return timerWarning; // Less than 10 minutes
    return timerSuccess;
  };

  const getStatusBadge = () => {
    if (!serviceRequest) return null;

    if (isExpired) {
      return { text: 'Expired', color: colors.error };
    }
    if (serviceRequest.status === 'Assigned') {
      return { text: 'Assigned', color: timerSuccess };
    }
    return { text: 'Waiting', color: primaryBlue };
  };

  // Don't render if serviceRequest is not available or it's actively being worked on (in progress/completed)
  if (!serviceRequest || !['Pending', 'Expired', 'Cancelled'].includes(serviceRequest.status)) {
    return null;
  }

  const statusBadge = getStatusBadge() ?? { text: 'Waiting', color: primaryBlue };

  const styles = StyleSheet.create({
    container: {
      marginTop: 8,
    },
    timerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: waitingStripBg,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: waitingStripBorder,
    },
    timerHeaderText: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    timerIcon: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: waitingDot,
    },
    timerLabel: {
      ...typography.body,
      fontSize: 15,
      color: outlineText,
      fontFamily: fonts.semibold,
      lineHeight: 20,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: isExpired ? colors.error + '1A' : primaryBlue + '1A',
    },
    statusBadgeText: {
      ...typography.caption,
      fontSize: 11,
      color: statusBadge.color,
      fontFamily: fonts.semibold,
    },
    countdownContainer: {
      alignItems: 'center',
      paddingVertical: 14,
    },
    countdownText: {
      ...typography.title,
      fontSize: 32,
      lineHeight: 38,
      color: getTimerColor(),
      fontFamily: fonts.bold,
      letterSpacing: 1,
      textAlign: 'center',
    },
    countdownSubtext: {
      ...typography.bodySmall,
      fontSize: 14,
      lineHeight: 18,
      color: countdownCaption,
      marginTop: 6,
      textAlign: 'center',
      fontFamily: fonts.medium,
    },
    expiredContainer: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    expiredText: {
      ...typography.subtitle,
      fontSize: 16,
      color: colors.error,
      fontWeight: '600',
      marginBottom: 4,
    },
    expiredSubtext: {
      ...typography.caption,
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: outlineBorder,
      backgroundColor: isDark ? '#2C394A' : '#FFFFFF',
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      ...typography.body,
      fontSize: 14,
      color: outlineText,
      fontFamily: fonts.semibold,
      lineHeight: 17,
    },
    actionButtonIcon: {
      marginRight: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 20,
      width: '100%',
      maxWidth: 320,
    },
    modalTitle: {
      ...typography.subtitle,
      fontSize: 18,
      color: colors.foreground,
      marginBottom: 16,
      fontWeight: '600',
    },
    reasonButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 8,
    },
    reasonButtonSelected: {
      borderColor: primaryBlue,
      backgroundColor: primaryBlue + '10',
    },
    reasonIcon: {
      fontSize: 20,
      marginRight: 12,
    },
    reasonText: {
      ...typography.body,
      fontSize: 14,
      color: colors.foreground,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonCancel: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border,
    },
    modalButtonConfirm: {
      backgroundColor: primaryBlue,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    modalButtonText: {
      ...typography.bodySmall,
      fontSize: 14,
      fontWeight: '500',
    },
    modalButtonTextCancel: {
      color: colors.foreground,
    },
    modalButtonTextConfirm: {
      color: '#FFFFFF',
    },
  });

  return (
    <View style={styles.container}>
      {/* Timer Header */}
      <View style={styles.timerHeader}>
        <View style={styles.timerHeaderText}>
          <View style={styles.timerIcon} />
          <Text style={styles.timerLabel}>
            {serviceRequest.status === 'Cancelled' 
              ? 'Request Cancelled' 
              : isExpired || serviceRequest.status === 'Expired' 
                ? 'Timer Expired' 
                : 'Waiting for Technicians'}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{statusBadge?.text}</Text>
        </View>
      </View>

      {/* Timer Countdown */}
      <View style={styles.countdownContainer}>
        {isExpired || ['Expired', 'Cancelled'].includes(serviceRequest.status) ? (
          <View style={styles.expiredContainer}>
            <Text style={styles.expiredText}>
              {serviceRequest.status === 'Cancelled' ? 'Request Cancelled' : 'Timer Expired'}
            </Text>
            <Text style={styles.expiredSubtext}>
              {serviceRequest.status === 'Cancelled' 
                ? 'This request was cancelled by the system or a technician' 
                : 'No technicians accepted your request in time'}
            </Text>
          </View>
        ) : (
          <View>
            <Text style={styles.countdownText}>
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </Text>
            <Text style={styles.countdownSubtext}>
              Technicians are reviewing your request
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {isExpired || ['Expired', 'Cancelled'].includes(serviceRequest.status) ? (
          <TouchableOpacity
            onPress={() => setShowRetryModal(true)}
            disabled={isRetrying || isModifying}
            style={[
              styles.actionButton,
              (isRetrying || isModifying) && styles.actionButtonDisabled,
            ]}
          >
            {isRetrying ? (
              <Text style={styles.actionButtonText}>Retrying...</Text>
            ) : (
              <>
                <Icon
                  name="rotate-ccw"
                  size={14}
                  color={outlineText}
                  style={styles.actionButtonIcon}
                />
                <Text style={styles.actionButtonText}>Retry</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleModify}
            disabled={isRetrying || isModifying}
            style={[
              styles.actionButton,
              (isRetrying || isModifying) && styles.actionButtonDisabled,
            ]}
          >
            {isModifying ? (
              <Text style={styles.actionButtonText}>Modifying...</Text>
            ) : (
              <>
                <Icon
                  name="edit-2"
                  size={14}
                  color={outlineText}
                  style={styles.actionButtonIcon}
                />
                <Text style={styles.actionButtonText}>Modify</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Retry Reason Modal */}
      <Modal
        visible={showRetryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRetryModal(false);
          setSelectedReason('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Why do you want to retry?</Text>
            
            {RETRY_REASONS.map(reason => (
              <TouchableOpacity
                key={reason.id}
                onPress={() => setSelectedReason(reason.id)}
                style={[
                  styles.reasonButton,
                  selectedReason === reason.id && styles.reasonButtonSelected,
                ]}
              >
                <Icon 
                  name={(reason as any).icon} 
                  size={18} 
                  color={selectedReason === reason.id ? primaryBlue : colors.mutedForeground} 
                  style={{ marginRight: 12 }} 
                />
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setShowRetryModal(false);
                  setSelectedReason('');
                }}
                style={{ flex: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : colors.card, borderColor: isDark ? 'rgba(255,255,255,0.1)' : colors.border }}
                textStyle={{ color: colors.foreground }}
              />
              <Button
                title={isRetrying ? 'Retrying...' : 'Retry'}
                variant="primary"
                onPress={handleRetry}
                disabled={!selectedReason || isRetrying}
                loading={isRetrying}
                style={{ flex: 1, backgroundColor: primaryBlue }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modify Confirmation Alert */}
      <ThemedAlertDialog
        visible={showModifyAlert}
        title="Modify Request"
        message="Are you sure you want to modify this request? The current request will be cancelled and you will need to submit a new one."
        variant="warning"
        onDismiss={() => setShowModifyAlert(false)}
        buttons={[
          { text: 'No, Keep It', variant: 'secondary' },
          {
            text: 'Yes, Modify',
            variant: 'primary',
            onPress: handleConfirmModify,
          },
        ]}
      />
    </View>
  );
}
