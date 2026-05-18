import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import Icon from 'react-native-vector-icons/Feather';
import type { User } from '../api/auth';

type AppBarProps = {
  isLoggedIn: boolean;
  user?: User | null;
  onLoginPress: () => void;
  onSignupPress: () => void;
  onProfilePress: () => void;
  onNotificationsPress: () => void;
  onLogoutPress: () => void;
  onOpenTerms?: () => void;
};

export function AppBar({
  isLoggedIn,
  user,
  onLoginPress,
  onSignupPress,
  onProfilePress,
  onNotificationsPress,
  onLogoutPress,
  onOpenTerms,
}: AppBarProps) {
  const insets = useSafeAreaInsets();
  const { colors, spacing, typography } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(menuAnim, {
      toValue: menuOpen ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 120,
    }).start();
  }, [menuOpen, menuAnim]);

  const menuTranslateY = menuAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 0],
  });

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={[styles.barRow, { paddingBottom: spacing.sm, justifyContent: 'center' }]}>
        {/* <View style={[styles.logoRow, { position: 'absolute', left: 0, right: 0, justifyContent: 'center' }]}>
          <Text style={[styles.brand, { color: colors.foreground, fontFamily: 'Montserrat-Bold' }]}>
            fix4ever
          </Text>
        </View> */}
        <View style={[styles.actionsRow, { marginLeft: 'auto' }]}>          
          
          {isLoggedIn ? (
            <>
                    <TouchableOpacity
                onPress={onNotificationsPress}
                activeOpacity={0.8}
                style={[
                  styles.iconButton,
                  { backgroundColor: `${colors.primary}10` },
                ]}
              >
            <Icon name="bell" size={18} color={colors.primary} />
          </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMenuOpen(v => !v)}
              activeOpacity={0.8}
              style={[
                styles.profileAvatar,
                { 
                  borderColor: colors.primary, 
                  backgroundColor: colors.card,
                  shadowColor: colors.primary,
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
            >
              {user && user.username ? (
                <Text style={[
                  styles.initialText, 
                  { color: colors.primary, fontFamily: 'Montserrat-Bold' }
                ]}>
                  {user.username.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Icon name="user" size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
            </>
            
          ) : (
            <>
              <TouchableOpacity
                onPress={onLoginPress}
                activeOpacity={0.8}
                style={[
                  styles.chip,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.card,
                  },
                ]}
              >
                <Icon
                  name="log-in"
                  size={14}
                  color={colors.mutedForeground}
                  style={styles.chipIcon}
                />
                <Text
                  style={[
                    typography.label,
                    styles.chipText,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Log in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onSignupPress}
                activeOpacity={0.9}
                style={[
                  styles.chip,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Icon
                  name="user-plus"
                  size={14}
                  color={colors.primaryForeground}
                  style={styles.chipIcon}
                />
                <Text
                  style={[
                    typography.label,
                    styles.chipText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Sign up
                </Text>
              </TouchableOpacity>
            </>
          )}
          
        </View>
      </View>
      {isLoggedIn && (
        <Modal
          visible={menuOpen}
          transparent
          animationType="none"
          onRequestClose={() => setMenuOpen(false)}
        >
          <View style={styles.modalLayer} pointerEvents="box-none">
            <Pressable style={styles.backdrop} onPress={() => setMenuOpen(false)} />
            <Animated.View
              style={[
                styles.dropdown,
                {
                  opacity: menuAnim,
                  transform: [{ translateY: menuTranslateY }],
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setMenuOpen(false);
                  onProfilePress();
                }}
              >
                <Icon
                  name="user"
                  size={16}
                  color={colors.foreground}
                  style={styles.menuIcon}
                />
                <Text style={[typography.bodySmall, styles.menuText]}>
                  Profile & settings
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setMenuOpen(false);
                  onNotificationsPress();
                }}
              >
                <Icon
                  name="bell"
                  size={16}
                  color={colors.foreground}
                  style={styles.menuIcon}
                />
                <Text style={[typography.bodySmall, styles.menuText]}>
                  Notifications
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setMenuOpen(false);
                  onOpenTerms?.();
                }}
              >
                <Icon
                  name="file-text"
                  size={16}
                  color={colors.foreground}
                  style={styles.menuIcon}
                />
                <Text style={[typography.bodySmall, styles.menuText]}>
                  Terms & policies
                </Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.8}
                onPress={() => {
                  setMenuOpen(false);
                  onLogoutPress();
                }}
              >
                <Icon
                  name="log-out"
                  size={16}
                  color={colors.destructive}
                  style={styles.menuIcon}
                />
                <Text
                  style={[
                    typography.bodySmall,
                    styles.menuText,
                    { color: colors.destructive },
                  ]}
                >
                  Log out
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 20 },
  brand: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginLeft: 4,
  },
  initialText: {
    fontSize: 16,
    lineHeight: 20,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
  },
  dropdown: {
    position: 'absolute',
    top: 45,
    zIndex: 1000,
    right: 5,
    marginTop: 4,
    alignSelf: 'flex-end',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  modalLayer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  menuIcon: {
    marginRight: 8,
  },
  menuText: {
    fontSize: 13,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
});
