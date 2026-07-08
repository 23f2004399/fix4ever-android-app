import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../core/theme';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';
import { useAuth } from '../../lib/contexts/auth-context';
import { updateProfile } from '../../core/api';
import { getStoredToken } from '../../core/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AccountScreenProps = {
  onLogout: () => void;
};

const fonts = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semibold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
} as const;

export function AccountScreen({ onLogout }: AccountScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, isDark } = useTheme();
  const { user, setUser } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.username || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const profileCardColor = isDark ? '#1C3D63' : '#01325d';
  const pageSubtle = isDark ? '#B9C6DA' : '#2E2E2E';
  const buttonBgColor = isDark ? '#2B5F91' : profileCardColor;
  const containerBg = isDark ? '#242D3B' : colors.background;
  const titleColor = isDark ? '#F3F7FF' : '#082c50';
  const labelColor = isDark ? '#D4E0F0' : '#D8E2F0';
  const inputBgColor = isDark ? '#152C48' : '#002244';

  const handleSave = async () => {
    setErrorMsg('');
    if (!editName.trim()) {
      setErrorMsg('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      const token = await getStoredToken();
      if (!token) throw new Error('Not authenticated');

      const { data, error } = await updateProfile(token, {
        username: editName.trim(),
        phone: editPhone.trim(),
      });

      if (error) {
        setErrorMsg(error.message);
      } else if (data?.success && data?.user) {
        const updatedUser = { ...user, ...data.user };
        // @ts-ignore
        setUser(updatedUser);
        await AsyncStorage.setItem('@fix4ever/auth_user', JSON.stringify(updatedUser));
        setIsEditing(false);
      } else {
        setErrorMsg('Failed to update profile');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(user?.username || '');
    setEditPhone(user?.phone || '');
    setErrorMsg('');
    setIsEditing(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: containerBg,
    },
    scroll: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxl + (Platform.OS === 'android' ? 300 : 0),
      alignItems: 'center',
    },
    logoCircle: {
      width: 130,
      height: 130,
      borderRadius: 65,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      shadowColor: '#000000',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 5 },
      elevation: 6,
    },
    logoClip: {
      width: 130,
      height: 130,
      borderRadius: 65,
      overflow: 'hidden',
      backgroundColor: profileCardColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoText: {
      fontSize: 58,
      color: '#FFFFFF',
      letterSpacing: -2.3,
      fontFamily: fonts.bold,
    },
    logoIcon: {
      width: 150,
      height: 150,
    },
    title: {
      fontSize: 48,
      lineHeight: 48,
      letterSpacing: -2.4,
      fontFamily: fonts.bold,
      color: titleColor,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 18,
      lineHeight: 20,
      letterSpacing: -0.18,
      color: pageSubtle,
      fontFamily: fonts.medium,
      marginBottom: 22,
    },
    card: {
      width: 336,
      backgroundColor: profileCardColor,
      paddingHorizontal: 28,
      paddingVertical: 26,
      borderRadius: 16,
      marginBottom: 22,
      alignSelf: 'center',
      shadowColor: '#000000',
      shadowOpacity: isDark ? 0.28 : 0.18,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 7,
      justifyContent: 'center',
      overflow: 'hidden',
    },
    row: { marginBottom: 22 },
    label: {
      fontSize: 15,
      lineHeight: 20,
      color: labelColor,
      fontFamily: fonts.medium,
      marginBottom: 6,
    },
    value: {
      fontSize: 18,
      lineHeight: 24,
      color: '#FFFFFF',
      fontFamily: fonts.medium,
    },
    textInput: {
      fontSize: 18,
      color: '#FFFFFF',
      fontFamily: fonts.medium,
      backgroundColor: inputBgColor,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 8,
    },
    editButton: {
      position: 'absolute',
      right: 28,
      top: 26,
      zIndex: 10,
    },
    editButtonText: {
      color: '#9BC7FF',
      fontFamily: fonts.semibold,
      fontSize: 16,
    },
    errorText: {
      color: '#F87171',
      fontSize: 14,
      fontFamily: fonts.medium,
      marginTop: -10,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 12,
      width: 336,
      alignSelf: 'center',
      marginBottom: 22,
    },
    saveButton: {
      flex: 1,
      height: 52,
      backgroundColor: buttonBgColor,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000000',
      shadowOpacity: isDark ? 0.22 : 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    cancelButton: {
      flex: 1,
      height: 52,
      backgroundColor: 'transparent',
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: buttonBgColor,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      color: '#FFFFFF',
      fontFamily: fonts.semibold,
      fontSize: 16,
    },
    cancelText: {
      color: buttonBgColor,
      fontFamily: fonts.semibold,
      fontSize: 16,
    },
    logoutButton: {
      width: 336,
      height: 52,
      backgroundColor: buttonBgColor,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 22,
      alignSelf: 'center',
      shadowColor: '#000000',
      shadowOpacity: isDark ? 0.22 : 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },
    logoutText: {
      fontSize: 16,
      lineHeight: 18,
      color: '#FFFFFF',
      fontFamily: fonts.medium,
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
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.illustrationBehind} pointerEvents="none">
        <MobileLaptop width={600} height={220} />
      </View>
      <View style={styles.leftDecoration} pointerEvents="none">
        <Image source={require('../../assets/icons/icon5.png')} style={styles.leftDecorationImage} resizeMode="contain" />
      </View>
      <View style={styles.rightDecoration} pointerEvents="none">
        <Image source={require('../../assets/icons/icon3.png')} style={styles.rightDecorationImage} resizeMode="contain" />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoCircle}>
          <View style={styles.logoClip}>
            <Image
              source={require('../../assets/icons/blue_icon.png')}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          </View>
        </View>
        <Text style={styles.title}>Account</Text>
        <Text style={styles.subtitle}>Your personal details</Text>
        
        <View style={styles.card}>
          {!isEditing && (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton} activeOpacity={0.7}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor="#A1A1AA"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{user?.username || '-'}</Text>
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>
              Email {isEditing && <Text style={{ fontSize: 11, opacity: 0.7 }}>(Read-only)</Text>}
            </Text>
            <Text 
              style={[styles.value, isEditing && { opacity: 0.5 }]} 
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              {user?.email || '-'}
            </Text>
          </View>

          <View style={[styles.row, { marginBottom: 0 }]}>
            <Text style={styles.label}>Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.textInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone number"
                placeholderTextColor="#A1A1AA"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{user?.phone || '-'}</Text>
            )}
          </View>

          {isEditing && errorMsg ? (
            <Text style={[styles.errorText, { marginTop: 16 }]}>{errorMsg}</Text>
          ) : null}
        </View>

        {isEditing ? (
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={handleCancel} activeOpacity={0.85} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.85} style={styles.saveButton} disabled={isSaving}>
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={onLogout} activeOpacity={0.85} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
