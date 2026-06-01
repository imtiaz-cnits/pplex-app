import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Easing,
  Platform,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.85;

// Reliable status-bar height for Android (insets can be 0 inside Modals)
const STATUSBAR_H =
  Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0;

// ── Notification type map (English only) ─────────────────
const TYPE_MAP = {
  alert:          { icon: 'alert-circle',   accent: '#FF0000' },
  sports:         { icon: 'activity',        accent: '#00b894' },
  promo:          { icon: 'tag',             accent: '#f39c12' },
  movie:          { icon: 'film',            accent: '#a29bfe' },
  info:           { icon: 'info',            accent: '#74b9ff' },
  channel_update: { icon: 'tv',             accent: '#FF0000' },
  app_update:     { icon: 'download-cloud', accent: '#00cec9' },
  system:         { icon: 'settings',        accent: '#b2bec3' },
  default:        { icon: 'bell',            accent: '#aaaaaa' },
};

function resolveType(noti) {
  if (!noti) return TYPE_MAP.default;
  const key = (noti.type || '').toLowerCase().replace(/[\s-]/g, '_');
  if (TYPE_MAP[key]) return TYPE_MAP[key];
  const t = (noti.title || '').toLowerCase();
  if (t.includes('channel'))                                  return TYPE_MAP.channel_update;
  if (t.includes('update') || t.includes('version'))         return TYPE_MAP.app_update;
  if (t.includes('sport') || t.includes('cricket') || t.includes('match') || t.includes('live'))
                                                              return TYPE_MAP.sports;
  if (t.includes('movie') || t.includes('film') || t.includes('drama') || t.includes('series'))
                                                              return TYPE_MAP.movie;
  if (t.includes('subscription') || t.includes('offer') || t.includes('renew') || t.includes('promo'))
                                                              return TYPE_MAP.promo;
  if (t.includes('alert') || t.includes('warning') || t.includes('maintenance'))
                                                              return TYPE_MAP.alert;
  if (t.includes('system') || t.includes('security'))        return TYPE_MAP.system;
  return TYPE_MAP.info;
}

function timeAgo(timestamp) {
  if (!timestamp) return 'Just now';
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationDrawer({ visible, onClose }) {
  const { colors, theme } = useTheme();
  const { notifications, fetchNotifications } = useOverlays();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(DRAWER_WIDTH)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const [readIds, setReadIds]       = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const isDark = theme === 'dark';

  // Safe top = max of insets.top (iOS) and StatusBar.currentHeight (Android)
  const safeTop = Math.max(insets.top, STATUSBAR_H);

  // Theme-derived colors
  const drawerBg     = colors.surface;
  const itemUnreadBg = isDark ? '#1a0000' : '#fff5f5';
  const dividerCol   = colors.border;
  const iconBg       = isDark ? '#1e1e1e' : '#f0f0f0';
  const markAllBg    = isDark ? '#1a0000' : '#fff0f0';

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 340,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.55,
          duration: 340,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: DRAWER_WIDTH,
          duration: 280,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.4, 0, 0.2, 1),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible]);

  const unreadCount = notifications.filter(n => !readIds.has(String(n.id))).length;

  const markAllRead = () =>
    setReadIds(new Set(notifications.map(n => String(n.id))));

  const markOneRead = id =>
    setReadIds(prev => new Set([...prev, String(id)]));

  const handleRefresh = async () => {
    setRefreshing(true);
    if (fetchNotifications) await fetchNotifications();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const cfg    = resolveType(item);
    const isRead = readIds.has(String(item.id));

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => markOneRead(item.id)}
        style={[
          styles.notiItem,
          { backgroundColor: isRead ? 'transparent' : itemUnreadBg },
        ]}
      >
        {/* Type icon */}
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={cfg.icon} size={18} color={cfg.accent} />
        </View>

        {/* Content */}
        <View style={styles.notiContent}>
          <View style={styles.notiTop}>
            <Text
              style={[
                styles.notiTitle,
                { color: isRead ? colors.textSec : colors.text },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!isRead && (
              <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
          </View>
          <Text
            style={[
              styles.notiDesc,
              { color: isRead ? (isDark ? '#555' : '#ccc') : colors.textSec },
            ]}
            numberOfLines={2}
          >
            {item.description}
          </Text>
          <Text style={[styles.notiTime, { color: isDark ? '#444' : '#c0c0c0' }]}>
            {timeAgo(item.timestamp)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      <StatusBar
        backgroundColor="transparent"
        barStyle={isDark ? 'light-content' : 'dark-content'}
        translucent
      />

      <View style={styles.root}>
        {/* Dim backdrop */}
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        {/* Sliding drawer */}
        <Animated.View
          style={[
            styles.drawer,
            {
              backgroundColor: drawerBg,
              borderLeftColor: dividerCol,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* ── Status-bar spacer ── */}
          <View style={{ height: safeTop }} />

          {/* ── Header ── */}
          <View style={[styles.header, { borderBottomColor: dividerCol }]}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Text style={[styles.unreadLabel, { color: colors.primary }]}>
                  {unreadCount} unread
                </Text>
              )}
            </View>

            <View style={styles.headerRight}>
              {unreadCount > 0 && (
                <TouchableOpacity
                  onPress={markAllRead}
                  style={[styles.markAllBtn, { backgroundColor: markAllBg }]}
                >
                  <Text style={[styles.markAllText, { color: colors.primary }]}>
                    Mark all read
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Feather name="x" size={20} color={colors.textSec} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Notification list ── */}
          <FlatList
            data={notifications}
            keyExtractor={item => String(item.id ?? Math.random())}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={[styles.emptyIconCircle, { backgroundColor: iconBg }]}>
                  <Feather name="bell-off" size={28} color={colors.textSec} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  All caught up!
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSec }]}>
                  No new notifications
                </Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    borderLeftWidth: 1,
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  unreadLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: { padding: 4 },
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 40,
    gap: 2,
  },
  notiItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  notiContent: { flex: 1 },
  notiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notiTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  notiDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 5,
  },
  notiTime: { fontSize: 11 },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyDesc: { fontSize: 13 },
});
