import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../core/theme';
import { requestWithAuth } from '../../core/api';
import { getStoredToken } from '../../core/storage';
import {
  CFPaymentGatewayService,
  CFErrorResponse,
} from 'react-native-cashfree-pg-sdk';

import {
  CFEnvironment,
  CFSession,
} from 'cashfree-pg-api-contract';


interface PaymentFormProps {
  serviceRequestId: string;
  vendorId: string;
  amount: number;
  onPaymentComplete?: () => void;
  onCancel?: () => void;
}

interface PaymentResponse {
  success: boolean;
  data: {
    transactionId?: string;
    paymentSessionId?: string;
    paymentLink?: string;
    orderId?: string;
    status?: string;
  };
}

export default function PaymentForm({
  serviceRequestId,
  vendorId,
  amount,
  onPaymentComplete,
  onCancel,
}: PaymentFormProps) {
  const { colors, spacing } = useTheme();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [paymentSessionId, setPaymentSessionId] = useState<string>('');
  const [cfSession, setCFSession] = useState<CFSession | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    // Set up payment callbacks
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log('Payment verified for order:', orderID);

        // Call callback API with orderId
        const handleCallback = async () => {
          try {
            const token = await getStoredToken();
            if (!token) {
              console.error('No authentication token found for callback');
              return;
            }

            const callbackResponse = await requestWithAuth(
              `/payment-transactions/mcallback?orderId=${orderID}`,
              token,
              {
                method: 'GET',
              }
            );
            
            console.log('Callback API response:', callbackResponse.data);
            
            setIsSuccess(true);
            setIsProcessing(false);
            setTransactionId(orderID);
            onPaymentComplete?.();
          } catch (callbackError: any) {
            console.error('Callback API error:', callbackError);
            // Still mark as success since payment was verified, even if callback failed
            setIsSuccess(true);
            setIsProcessing(false);
            setTransactionId(orderID);
            onPaymentComplete?.();
          }
        };

        handleCallback();
      },
    
      onError: (error: CFErrorResponse, orderID: string) => {
        console.log('Payment onError:', error, 'Order ID:', orderID);
        setIsProcessing(false);
        const msg = (error.message || '').toLowerCase();
        const isCancelled =
          msg.includes('cancel') ||
          msg.includes('back') ||
          msg.includes('dismiss') ||
          msg.includes('user_back') ||
          msg.includes('closed');
        if (!isCancelled) {
          Alert.alert('Payment Failed', error.message || 'Payment could not be completed. Please try again.');
        }
        // Cancellation: silently reset — user chose to go back, no alert needed
      },
    });

    // Cleanup callback on unmount
    return () => {
      CFPaymentGatewayService.removeCallback();
    };
  }, [onPaymentComplete]);

  const handlePayment = async () => {
    if (amount <= 0) {
      Alert.alert('Error', 'Invalid payment amount');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create payment session on backend
      console.log('Creating payment session with:', { serviceRequestId, vendorId, amount });
      
      const token = await getStoredToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await requestWithAuth<PaymentResponse>(
        '/payment-transactions/pay',
        token,
        {
          method: 'POST',
          body: {
            serviceRequestId,
            vendorId,
            amount,
            paymentMethod: 'Cashfree',
          },
        }
      );

      console.log('Payment response:', response.data);

      if (response.data?.success && response.data.data.paymentSessionId && response.data.data.orderId) {
        // Step 2: Create CFSession object and initiate payment
        const sessionId = response.data.data.paymentSessionId;
        const orderId = response.data.data.orderId;
        const transactionId = response.data.data.transactionId;
        console.log(orderId)
        setPaymentSessionId(sessionId);
        setOrderId(orderId);
        setTransactionId(transactionId);

        try {
          // Create CFSession object using constructor
          const session = new CFSession(
            sessionId,
            orderId,
            CFEnvironment.SANDBOX
          );
          setCFSession(session);

          console.log('Opening Cashfree checkout with session:', sessionId);

          // Initiate payment using Cashfree SDK
          CFPaymentGatewayService.doWebPayment(session);

          
          
          // Note: The actual result will be handled by the callbacks set in useEffect
          // So we don't need to handle success/error here directly
          
        } catch (sessionError: any) {
          console.error('CFSession creation error:', sessionError);
          Alert.alert('Payment Error', sessionError.message || 'Failed to create payment session');
          setIsProcessing(false);
        }
      } else if (response.data?.success && response.data.data?.paymentLink) {
        // Fallback: If payment link is provided instead of session ID
        console.log('Payment link available:', response.data.data.paymentLink);
        Alert.alert(
          'Payment Link',
          'A payment link has been generated. Please complete the payment using the provided link.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Here you could open the payment link in a web view
                setIsProcessing(false);
              },
            },
          ]
        );
      } else {
        console.error('Invalid response:', response.data);
        Alert.alert('Error', 'Payment session creation failed');
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.response?.data?.message || 'Payment failed. Please try again.';
      Alert.alert('Payment Error', errorMessage);
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <View style={{ alignItems: 'center', padding: spacing.lg }}>
        <Icon name="check-circle" size={64} color={colors.success} />
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.success, marginTop: spacing.md }}>
          Payment Successful!
        </Text>
        <Text style={{ fontSize: 16, color: colors.success, marginTop: spacing.sm, textAlign: 'center' }}>
          Your payment has been processed successfully.
        </Text>
        <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: spacing.sm }}>
          Transaction ID: {transactionId || 'Processing...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: spacing.sm }}>
          Complete Payment
        </Text>
        <Text style={{ fontSize: 14, color: colors.mutedForeground }}>
          Secure payment powered by Cashfree
        </Text>
      </View>

      <View style={{
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: spacing.md,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
          <Icon name="credit-card" size={20} color={colors.primary} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.foreground }}>
            Payment Details
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: colors.muted + '20',
          padding: spacing.sm,
          borderRadius: 8,
          marginBottom: spacing.md,
        }}>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.foreground }}>
              Total Amount
            </Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
              Service charge
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
            ₹{amount.toFixed(2)}
          </Text>
        </View>

        <View style={{
          backgroundColor: colors.primary + '10',
          borderWidth: 1,
          borderColor: colors.primary + '30',
          borderRadius: 8,
          padding: spacing.sm,
          marginBottom: spacing.md,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            <View style={{
              backgroundColor: colors.primary + '20',
              padding: spacing.xs,
              borderRadius: 12,
            }}>
              <Icon name="credit-card" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                Cashfree Payment Gateway
              </Text>
              <Text style={{ fontSize: 12, color: colors.primary }}>
                Secure and reliable payment processing
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.foreground }}>Credit/Debit Cards</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.foreground }}>UPI Payments</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.foreground }}>Net Banking</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Icon name="check-circle" size={16} color={colors.success} />
              <Text style={{ fontSize: 12, color: colors.foreground }}>Digital Wallets</Text>
            </View>
          </View>

          <Text style={{ fontSize: 10, color: colors.mutedForeground, fontStyle: 'italic' }}>
            Click "Pay Now" to open secure Cashfree checkout
          </Text>
        </View>

        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.success + '10',
          borderWidth: 1,
          borderColor: colors.success + '30',
          borderRadius: 8,
          padding: spacing.sm,
          marginBottom: spacing.md,
        }}>
          <Icon name="shield" size={16} color={colors.success} />
          <Text style={{ fontSize: 12, color: colors.success, flex: 1 }}>
            Your payment information is encrypted and secure
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.sm }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              backgroundColor: colors.success,
              borderRadius: 8,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
            }}
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                  Processing...
                </Text>
              </>
            ) : (
              <>
                <Icon name="lock" size={16} color="#FFFFFF" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                  Pay Now ₹{amount.toFixed(2)}
                </Text>
              </>
            )}
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 8,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
              }}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <Text style={{ fontSize: 14, color: colors.foreground }}>
                Cancel
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={{ fontSize: 12, color: colors.mutedForeground, textAlign: 'center' }}>
        By completing this payment, you agree to our terms of service
      </Text>
    </View>
  );
}
