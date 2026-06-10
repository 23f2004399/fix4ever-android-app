import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../core/theme';

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

  const handleRetry = async () => {
    if (!selectedReason) {
      Alert.alert('Error', 'Please select a reason for retrying');
      return;
    }

    setIsRetrying(true);
    try {
      // TODO: Navigate to service request form with pre-filled data for retry
      // This would typically use React Navigation
      console.log('Retrying service request with reason:', selectedReason);
      
      setShowRetryModal(false);
      setSelectedReason('');
      
      Alert.alert('Success', 'Opening service request form for retry...');
    } catch (error) {
      console.error('Error retrying service request:', error);
      Alert.alert('Error', 'Failed to open retry form');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleModify = () => {
    setIsModifying(true);
    try {
      // TODO: Navigate to service request form with pre-filled data for modify mode
      // This would typically use React Navigation
      console.log('Modifying service request:', serviceRequest._id);
      
      Alert.alert('Success', 'Opening modification form...');
    } catch (error) {
      console.error('Error modifying service request:', error);
      Alert.alert('Error', 'Failed to open modification form');
    } finally {
      setIsModifying(false);
    }
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

  // Don't render if serviceRequest is not available or not pending
  if (!serviceRequest || serviceRequest.status !== 'Pending' || !serviceRequest.isTimerActive) {
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
          <Text style={styles.timerLabel}>Waiting for Technicians</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>{statusBadge?.text}</Text>
        </View>
      </View>

      {/* Timer Countdown */}
      <View style={styles.countdownContainer}>
        {isExpired ? (
          <View style={styles.expiredContainer}>
            <Text style={styles.expiredText}>Timer Expired</Text>
            <Text style={styles.expiredSubtext}>
              No technicians accepted your request in time
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
                  name={reason.icon} 
                  size={18} 
                  color={selectedReason === reason.id ? primaryBlue : colors.mutedForeground} 
                  style={{ marginRight: 12 }} 
                />
                <Text style={styles.reasonText}>{reason.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => {
                  setShowRetryModal(false);
                  setSelectedReason('');
                }}
                style={[styles.modalButton, styles.modalButtonCancel]}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextCancel]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRetry}
                disabled={!selectedReason || isRetrying}
                style={[styles.modalButton, styles.modalButtonConfirm, (!selectedReason || isRetrying) && styles.actionButtonDisabled]}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextConfirm]}>
                  {isRetrying ? 'Retrying...' : 'Retry'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
