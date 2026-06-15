import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../../core/theme/ThemeContext';
import { privacyPolicyText, termsAndConditionsText } from './policyContent';

export default function TermsAndPoliciesScreen() {
  const navigation = useNavigation();
  const { isDark, colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>('terms');

  const content = activeTab === 'terms' ? termsAndConditionsText : privacyPolicyText;

  // Helper to render text beautifully by splitting newlines and identifying headers
  const renderTextContent = (text: string) => {
    return text.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        return <View key={index} style={{ height: 12 }} />;
      }

      // If it starts with a number followed by a dot (e.g. "1. " or "2.1 ")
      const isHeader = /^\d+(\.\d+)?\.\s/.test(trimmedLine) || trimmedLine === 'Privacy Policy' || trimmedLine === 'Terms & Conditions';
      
      // If it's a bullet point
      const isBullet = trimmedLine.startsWith('•');

      if (isHeader) {
        return (
          <Text key={index} style={[styles.heading, { color: colors.text }]}>
            {trimmedLine}
          </Text>
        );
      }

      if (isBullet) {
        return (
          <View key={index} style={styles.bulletRow}>
            <Text style={[styles.bulletPoint, { color: colors.text }]}>•</Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {trimmedLine.substring(1).trim()}
            </Text>
          </View>
        );
      }

      return (
        <Text key={index} style={[styles.bodyText, { color: colors.textSecondary }]}>
          {trimmedLine}
        </Text>
      );
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: isDark ? '#333' : '#E5E7EB' }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Terms & Policies</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.tabsContainer}>
        <View style={[styles.segmentedControl, { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }]}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'terms' && [styles.activeTab, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('terms')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'terms' ? '#FFF' : colors.textSecondary }]}>Terms & Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'privacy' && [styles.activeTab, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('privacy')}
          >
            <Text style={[styles.tabText, { color: activeTab === 'privacy' ? '#FFF' : colors.textSecondary }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF' }]}>
          {renderTextContent(content)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        marginTop: 0,
      },
      android: {
        marginTop: 10,
      }
    })
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heading: {
    fontSize: 17,
    fontFamily: 'Inter-SemiBold',
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 8,
    lineHeight: 24,
  },
  bodyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 8,
  },
  bulletPoint: {
    fontSize: 14,
    marginRight: 8,
    lineHeight: 22,
  }
});
