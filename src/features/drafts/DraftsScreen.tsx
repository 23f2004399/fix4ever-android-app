import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import MobileLaptop from '../../assets/icons/mobile-laptop.svg';
import { useTheme } from '../../core/theme';
import { Button } from '../../core/components';
import {
  deleteDraftServiceRequest,
  DraftServiceRequest,
  getMyDraftServiceRequests,
} from '../../core/api';

type DraftCard = {
  id: string;
  title: string;
  brand: string;
  model: string;
  issueType: string;
  description: string;
  completionPercentage: number;
  lastSaved: string;
};


const formatDateTime = (value?: string): string => {
  if (!value) {
    return 'Just now';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toDraftCard = (draft: DraftServiceRequest): DraftCard => {
  const serverCompletion = Number(draft.completionPercentage);
  const completionPercentage = Math.max(0, Math.min(100, Math.round(serverCompletion)))
  const titleParts = [draft.brand, draft.model].filter(Boolean);
  const title = draft.title || (titleParts.length ? titleParts.join(' ') : 'Untitled Draft');

  return {
    id: draft._id || draft.id || '',
    title,
    brand: draft.brand || '-',
    model: draft.model || '-',
    issueType: draft.problemType || 'Not specified',
    description: draft.problemDescription || 'No description yet',
    completionPercentage,
    lastSaved: formatDateTime(draft.updatedAt || draft.createdAt),
  };
};

export function DraftsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { spacing, typography, isDark } = useTheme();
  const [drafts, setDrafts] = useState<DraftCard[]>([]);
  const [loading, setLoading] = useState(false);

  const brandBlue = '#01325D';
  const primaryBlue = isDark ? '#1C4E7E' : brandBlue;
  const screenBg = isDark ? '#242D3B' : '#FFFFFF';
  const headingColor = isDark ? '#F3F7FF' : '#082C50';
  const subtitleColor = isDark ? '#C6D4E8' : '#5B6B80';
  const mutedText = isDark ? '#D0D8E5' : '#3A3A3A';
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

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMyDraftServiceRequests();
      const rows = response.data?.drafts || response.data?.data?.drafts || [];
      const mapped = Array.isArray(rows)
        ? rows.map(toDraftCard).filter((row) => Boolean(row.id))
        : [];
      setDrafts(mapped);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDrafts();
    }, [loadDrafts])
  );

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 75) return isDark ? '#87E0B2' : '#14804A';
    if (percentage >= 50) return isDark ? '#FFD7A3' : '#B96800';
    return isDark ? '#C7D2E2' : '#6B7788';
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
          color: subtitleColor,
          fontFamily: fonts.medium,
        },
        expiryNote: {
          ...typography.body,
          color: mutedText,
          marginTop: spacing.xs,
          fontFamily: fonts.medium,
          fontSize: 13,
          lineHeight: 18,
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
          borderWidth: 0,
        },
        createRequestButtonText: {
          color: '#FFFFFF',
          fontFamily: fonts.semibold,
          fontSize: 16,
          lineHeight: 20,
        },
        draftCard: {
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
        draftHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: spacing.md,
        },
        draftTitle: {
          color: headingColor,
          flex: 1,
          marginRight: spacing.sm,
          fontFamily: fonts.bold,
          fontSize: 18,
          lineHeight: 24,
          textTransform: 'uppercase',
        },
        completionBadge: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 8,
        },
        completionText: {
          color: bodyText,
          fontFamily: fonts.semibold,
          fontSize: 12,
          lineHeight: 16,
        },
        draftDetails: {
          gap: spacing.sm,
          marginBottom: spacing.md,
        },
        detailRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        detailLabel: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 15,
          lineHeight: 20,
        },
        detailValue: {
          color: bodyText,
          fontFamily: fonts.semibold,
          fontSize: 15,
          lineHeight: 20,
          flex: 1,
          textAlign: 'right',
          marginLeft: spacing.md,
        },
        description: {
          color: labelColor,
          marginBottom: spacing.md,
          fontFamily: fonts.medium,
          fontSize: 14,
          lineHeight: 20,
        },
        progressBar: {
          height: 4,
          backgroundColor: cardBorder,
          borderRadius: 2,
          marginBottom: spacing.md,
          overflow: 'hidden',
        },
        progressFill: {
          height: '100%',
          borderRadius: 2,
        },
        draftFooter: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: cardBorder,
        },
        lastSaved: {
          color: labelColor,
          fontFamily: fonts.medium,
          fontSize: 12,
          lineHeight: 16,
          flex: 1,
          paddingRight: spacing.sm,
        },
        actions: {
          flexDirection: 'row',
          gap: spacing.sm,
        },
        actionButton: {
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          borderRadius: 8,
        },
        editButton: {
          backgroundColor: isDark ? 'rgba(156,206,255,0.2)' : 'rgba(1,50,93,0.12)',
        },
        deleteButton: {
          backgroundColor: isDark ? 'rgba(255,122,122,0.2)' : 'rgba(220,38,38,0.12)',
        },
        actionText: {
          fontFamily: fonts.semibold,
          fontSize: 12,
          lineHeight: 16,
        },
        editText: {
          color: isDark ? '#9BC7FF' : primaryBlue,
        },
        deleteText: {
          color: isDark ? '#FF9E9E' : '#B42318',
        },
        loadingState: {
          alignItems: 'center',
          paddingVertical: spacing.xl,
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
      mutedText,
      primaryBlue,
      cardBg,
      bodyText,
      labelColor,
      fonts,
    ]
  );

  const handleEditDraft = (draftId: string) => {
    if (typeof navigation.push === 'function') {
      navigation.push('ServiceRequestStack', { draftId });
      return;
    }
    navigation.navigate('ServiceRequestStack', { draftId });
  };

  const handleDeleteDraft = (draftId: string) => {
    Alert.alert('Delete Draft', 'Are you sure you want to delete this draft?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const response = await deleteDraftServiceRequest(draftId);
          if (response.data?.success) {
            setDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
            return;
          }
          Alert.alert('Error', response.error?.message || 'Failed to delete draft');
        },
      },
    ]);
  };

  const subtitle = useMemo(() => {
    if (loading) {
      return 'Loading your saved drafts...';
    }
    return 'Continue working on your saved requests';
  }, [loading]);

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
          <Text style={styles.title}>Drafts</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {drafts.length > 0 && (
            <Text style={styles.expiryNote}>Drafts automatically expire after 7 days</Text>
          )}
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
            onRefresh={loadDrafts}
            tintColor={primaryBlue}
            colors={[primaryBlue]}
            progressBackgroundColor={cardBg}
          />
        }
      >

        {loading && drafts.length === 0 ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={primaryBlue} />
          </View>
        ) : drafts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Drafts</Text>
            <Text style={styles.emptySubtitle}>
              You don't have any saved drafts. Start creating a new request and save it as a draft.
            </Text>
          </View>
        ) : (
          drafts.map((draft) => (
            <View key={draft.id} style={styles.draftCard}>
              <View style={styles.draftHeader}>
                <Text style={styles.draftTitle}>{draft.title}</Text>
                <View
                  style={[
                    styles.completionBadge,
                    { backgroundColor: `${getCompletionColor(draft.completionPercentage)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.completionText,
                      { color: getCompletionColor(draft.completionPercentage) },
                    ]}
                  >
                    {draft.completionPercentage}%
                  </Text>
                </View>
              </View>

              <View style={styles.draftDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Device</Text>
                  <Text style={styles.detailValue}>{draft.brand} {draft.model}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Issue</Text>
                  <Text style={styles.detailValue}>{draft.issueType}</Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>
                {draft.description}
              </Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${draft.completionPercentage}%`,
                      backgroundColor: getCompletionColor(draft.completionPercentage),
                    },
                  ]}
                />
              </View>

              <View style={styles.draftFooter}>
                <Text style={styles.lastSaved}>Last saved: {draft.lastSaved}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => handleEditDraft(draft.id)}
                  >
                    <Text style={[styles.actionText, styles.editText]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteDraft(draft.id)}
                  >
                    <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
