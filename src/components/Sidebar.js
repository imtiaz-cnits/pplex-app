import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  Easing,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import { USER_PROFILE } from '../constants/mockData';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logo from './Logo';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

export default function Sidebar({ visible, onClose, navigation }) {
  const { colors } = useTheme();
  const { showComingSoon } = useOverlays();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible]);

  const handleMenuPress = (item) => {
    onClose();
    if (item.screen === 'Profile' && item.label === 'My Profile') {
      if (navigation) {
        navigation.navigate('Profile');
      }
    } else {
      showComingSoon(item.label);
    }
  };

  const menuItems = [
    { label: 'My Profile', icon: 'user', screen: 'Profile' },
    { label: 'Notifications', icon: 'bell', screen: 'Notifications' },
    { label: 'Favorites', icon: 'heart', screen: 'Favorites' },
    { label: 'Subscription', icon: 'credit-card', screen: 'Subscription' },
    { label: 'Settings', icon: 'settings', screen: 'Settings' },
    { label: 'Help & Support', icon: 'help-circle', screen: 'Help' },
  ];

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.container}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Drawer Content */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: colors.phBg,
              borderRightColor: colors.border,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Header (Primary Gradient) */}
          <LinearGradient
            colors={colors.primaryGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.header, { paddingTop: Math.max(40, insets.top + 10) }]}
          >
            <View style={styles.headerTop}>
              <View style={styles.avatarContainer}>
                <Image source={{ uri: USER_PROFILE.avatar }} style={styles.avatar} />
              </View>
              <View style={styles.logoWrapper}>
                <Logo color="green" theme="dark" width={124} height={36} />
              </View>
            </View>
            <Text style={styles.name}>{USER_PROFILE.name}</Text>
            <Text style={styles.email}>{USER_PROFILE.email}</Text>
          </LinearGradient>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleMenuPress(item)}
              >
                <Feather name={item.icon} size={20} color={colors.textSec} style={styles.menuIcon} />
                <Text style={[styles.menuLabel, { color: colors.text }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.7}
              onPress={onClose}
            >
              <Feather name="log-out" size={20} color="#ff5252" style={styles.menuIcon} />
              <Text style={[styles.menuLabel, { color: '#ff5252', fontWeight: 'bold' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    borderRightWidth: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    paddingHorizontal: 25,
    paddingBottom: 25,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  logoWrapper: {
    marginTop: 5,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 12,
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  email: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  menuContainer: {
    flex: 1,
    paddingTop: 20,
    paddingHorizontal: 15,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginVertical: 2.5,
    borderRadius: 12,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
});
