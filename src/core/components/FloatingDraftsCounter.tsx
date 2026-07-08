import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  DeviceEventEmitter
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Feather';
import { useTheme } from '../theme';
import { getMyDraftServiceRequests } from '../api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/contexts/auth-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUBBLE_SIZE = 60;
const DISMISS_ZONE_HEIGHT = 120;

export function FloatingDraftsCounter() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [draftCount, setDraftCount] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOverDismissZone, setIsOverDismissZone] = useState(false);
  
  // Start positioned bottom-right, just above the tab bar
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - BUBBLE_SIZE - 20, y: SCREEN_HEIGHT - 200 })).current;
  const dismissZoneOpacity = useRef(new Animated.Value(0)).current;

  // Refresh Drafts
  const fetchDrafts = async () => {
    if (!user) return;
    try {
      const response = await getMyDraftServiceRequests();
      const rows = response.data?.drafts || response.data?.data?.drafts || [];
      const count = Array.isArray(rows) ? rows.filter((r: any) => Boolean(r.id || r._id)).length : 0;
      setDraftCount(count);
    } catch (e) {
      console.log('Failed to fetch drafts count', e);
    }
  };

  useEffect(() => {
    fetchDrafts();
    const subscription = DeviceEventEmitter.addListener('refresh_drafts', fetchDrafts);
    return () => subscription.remove();
  }, [user]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only start dragging if the user moves it a bit (distinguish from tap)
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value
        });
        pan.setValue({ x: 0, y: 0 });
        
        Animated.spring(dismissZoneOpacity, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        
        // Check if over dismiss zone
        const currentY = (pan.y as any)._value + gestureState.dy + (pan.y as any)._offset;
        if (currentY > SCREEN_HEIGHT - DISMISS_ZONE_HEIGHT - BUBBLE_SIZE) {
          setIsOverDismissZone(true);
        } else {
          setIsOverDismissZone(false);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        setIsDragging(false);
        
        Animated.spring(dismissZoneOpacity, {
          toValue: 0,
          useNativeDriver: true,
        }).start();

        const finalY = (pan.y as any)._value;
        const finalX = (pan.x as any)._value;

        // Dismiss logic
        if (finalY > SCREEN_HEIGHT - DISMISS_ZONE_HEIGHT - BUBBLE_SIZE) {
          Animated.spring(pan, {
            toValue: { x: SCREEN_WIDTH / 2 - BUBBLE_SIZE / 2, y: SCREEN_HEIGHT + 100 },
            useNativeDriver: false,
          }).start(() => {
            setIsDismissed(true);
          });
          return;
        }

        // Snap to edge logic
        const snapX = finalX > SCREEN_WIDTH / 2 - BUBBLE_SIZE / 2 ? SCREEN_WIDTH - BUBBLE_SIZE - 20 : 20;
        
        // Prevent going off top or bottom
        let snapY = finalY;
        if (finalY < insets.top + 20) snapY = insets.top + 20;
        if (finalY > SCREEN_HEIGHT - insets.bottom - BUBBLE_SIZE - 80) snapY = SCREEN_HEIGHT - insets.bottom - BUBBLE_SIZE - 80;

        Animated.spring(pan, {
          toValue: { x: snapX, y: snapY },
          useNativeDriver: false,
          friction: 7,
          tension: 50,
        }).start();
      }
    })
  ).current;

  const handlePress = () => {
    // Navigate to Drafts tab through the nested navigators
    navigation.navigate('MainApp', { 
      screen: 'Main', 
      params: { screen: 'Drafts' } 
    });
  };

  if (!user || draftCount === 0 || isDismissed) {
    return null;
  }

  return (
    <>
      <Animated.View
        style={[
          styles.bubbleContainer,
          pan.getLayout(),
          { opacity: isDragging && isOverDismissZone ? 0.5 : 1 }
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity 
          style={[styles.bubble, { backgroundColor: isDark ? '#1C4E7E' : '#01325D' }]} 
          onPress={handlePress}
          activeOpacity={0.8}
        >
          <Icon name="file-plus" size={24} color="#FFF" />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{draftCount}</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>

      <Animated.View 
        style={[
          styles.dismissZone, 
          { 
            opacity: dismissZoneOpacity,
            paddingBottom: insets.bottom + 20,
            backgroundColor: isOverDismissZone ? 'rgba(239, 68, 68, 0.9)' : 'rgba(0, 0, 0, 0.6)'
          }
        ]}
        pointerEvents="none"
      >
        <Icon 
          name="x-circle" 
          size={isOverDismissZone ? 40 : 32} 
          color="#FFF" 
        />
        <Text style={styles.dismissText}>
          {isOverDismissZone ? 'Release to dismiss' : 'Drag here to dismiss'}
        </Text>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    position: 'absolute',
    zIndex: 9999,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  },
  bubble: {
    width: '100%',
    height: '100%',
    borderRadius: BUBBLE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dismissZone: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: DISMISS_ZONE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  dismissText: {
    color: '#FFF',
    marginTop: 8,
    fontWeight: '600',
    fontSize: 14,
  }
});
