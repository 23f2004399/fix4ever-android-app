import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../core/theme';
import { requestWithAuth } from '../../core/api';
import { getStoredToken } from '../../core/storage';
import { config } from '../../core/config';
import {
  CFPaymentGatewayService,
  CFErrorResponse,
} from 'react-native-cashfree-pg-sdk';

import {
  CFEnvironment,
  CFSession,
  CFDropCheckoutPayment,
  CFPaymentComponentBuilder,
  CFPaymentModes,
  CFThemeBuilder,
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

  const [warrantyPlan, setWarrantyPlan] = useState<'None' | '1 Month' | '2 Months' | '3 Months'>('None');
  const [warrantyAcceptedTerms, setWarrantyAcceptedTerms] = useState(false);

  const getWarrantyPrice = () => {
    if (warrantyPlan === '1 Month') return 399;
    if (warrantyPlan === '2 Months') return 699;
    if (warrantyPlan === '3 Months') return 999;
    return 0;
  };

  const getWarrantyValidityDays = () => {
    if (warrantyPlan === '1 Month') return 30;
    if (warrantyPlan === '2 Months') return 60;
    if (warrantyPlan === '3 Months') return 90;
    return 0;
  };

  const totalAmount = amount + getWarrantyPrice();

  const activePaymentLinkRef = useRef<string | null>(null);

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
        console.log('Payment onError details:', {
          message: error.getMessage(),
          code: error.getCode(),
          type: error.getType(),
          status: error.getStatus(),
          orderID,
        });
        setIsProcessing(false);
        const msg = (error.getMessage() || '').toLowerCase();
        const code = (error.getCode() || '').toLowerCase();
        const isCancelled =
          msg.includes('cancel') ||
          msg.includes('back') ||
          msg.includes('dismiss') ||
          msg.includes('user_back') ||
          msg.includes('closed') ||
          code.includes('cancel') ||
          code.includes('user_back');
        if (!isCancelled) {
          const detailMsg = error.getCode()
            ? `Error [${error.getCode()}]: ${error.getMessage()}`
            : error.getMessage() || 'Payment could not be completed. Please try again.';
          Alert.alert('Payment Failed', detailMsg);
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
    if (totalAmount <= 0) {
      Alert.alert('Error', 'Invalid payment amount');
      return;
    }

    if (warrantyPlan !== 'None' && !warrantyAcceptedTerms) {
      Alert.alert('Terms Required', 'Please accept the warranty terms before proceeding.');
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
            amount: totalAmount,
            paymentMethod: 'Cashfree',
            warrantyAddonSelected: warrantyPlan !== 'None',
            warrantyPlanName: warrantyPlan,
            warrantyAmount: getWarrantyPrice(),
            warrantyValidityDays: getWarrantyValidityDays(),
          },
        }
      );

      console.log('Payment response:', response.data);

      if (response.data?.success && response.data.data.paymentSessionId && response.data.data.orderId) {
        // Step 2: Create CFSession object and initiate payment
        const sessionId = response.data.data.paymentSessionId;
        const orderId = response.data.data.orderId;
        const transactionId = response.data.data.transactionId;
        const paymentLink = response.data.data.paymentLink;

        if (paymentLink) {
          activePaymentLinkRef.current = paymentLink;
        }

        console.log(orderId);
        setPaymentSessionId(sessionId);
        setOrderId(orderId);
        setTransactionId(transactionId || '');

        try {
          // Create CFSession object using constructor
          const session = new CFSession(
            sessionId,
            orderId,
            CFEnvironment[config.CASHFREE_ENVIRONMENT]
          );
          setCFSession(session);

          // Build explicit supported payment components (CARD, UPI, Netbanking, Wallet)
          const components = new CFPaymentComponentBuilder()
            .add(CFPaymentModes.CARD)
            .add(CFPaymentModes.UPI)
            .add(CFPaymentModes.NB)
            .add(CFPaymentModes.WALLET)
            .build();

          // Build Drop Checkout payment object with explicit components
          const dropPayment = new CFDropCheckoutPayment(session, components, null);

          console.log('Opening Cashfree Drop Checkout with session:', sessionId);

          // Initiate native payment using Cashfree Drop SDK
          CFPaymentGatewayService.doPayment(dropPayment);

          
          
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
    <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.sm }}>
      <View style={{ gap: spacing.lg }}>
        <View style={{ alignItems: 'center', marginTop: spacing.xs }}>
          <Icon name="shield" size={32} color={colors.primary} style={{ marginBottom: spacing.sm }} />
          <Text style={{ fontSize: 15, color: colors.mutedForeground, textAlign: 'center', paddingHorizontal: spacing.xl }}>
            Secure, encrypted transactions powered by Cashfree.
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
              Service charge {warrantyPlan !== 'None' ? `+ ${warrantyPlan} Warranty` : ''}
            </Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.primary }}>
            ₹{totalAmount.toFixed(2)}
          </Text>
        </View>

        {/* Service Warranty Add-on */}
        <View style={{ marginBottom: spacing.md }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground, marginBottom: spacing.sm }}>
            Service Warranty Add-on
          </Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: spacing.md }}>
            Protect your repair service with Fix4Ever service warranty. Covers service charges only for the same issue.
          </Text>

          {/* Plan Selection Cards */}
          <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
            {[
              { id: 'None', label: 'No Warranty', price: 0 },
              { id: '1 Month', label: '1 Month', price: 399 },
              { id: '2 Months', label: '2 Months', price: 699 },
              { id: '3 Months', label: '3 Months', price: 999 },
            ].map((plan) => {
              const isSelected = warrantyPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => {
                    setWarrantyPlan(plan.id as any);
                    if (plan.id === 'None') setWarrantyAcceptedTerms(false);
                  }}
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    padding: spacing.sm,
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: 8,
                    backgroundColor: isSelected ? colors.primary + '10' : colors.card,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: isSelected ? 'bold' : '500', color: isSelected ? colors.primary : colors.foreground }}>
                    {plan.label}
                  </Text>
                  {plan.price > 0 && (
                    <Text style={{ fontSize: 12, color: isSelected ? colors.primary : colors.mutedForeground, marginTop: 4 }}>
                      +₹{plan.price}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mandatory Checkbox */}
          {warrantyPlan !== 'None' && (
            <TouchableOpacity
              onPress={() => setWarrantyAcceptedTerms(!warrantyAcceptedTerms)}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                marginTop: spacing.md,
                gap: spacing.sm,
                backgroundColor: colors.muted + '10',
                padding: spacing.sm,
                borderRadius: 8,
              }}
            >
              <Icon 
                name={warrantyAcceptedTerms ? "check-square" : "square"} 
                size={20} 
                color={warrantyAcceptedTerms ? colors.primary : colors.mutedForeground} 
                style={{ marginTop: 2 }}
              />
              <Text style={{ fontSize: 12, color: colors.foreground, flex: 1, lineHeight: 18 }}>
                I understand this warranty covers service charges only for the same issue and does not cover parts or new issues.
              </Text>
            </TouchableOpacity>
          )}
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
              backgroundColor: colors.primary,
              borderRadius: 12,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  Processing...
                </Text>
              </>
            ) : (
              <>
                <Icon name="lock" size={18} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                  Pay ₹{totalAmount.toFixed(2)}
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
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.foreground }}>
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
    </ScrollView>
  );
}
