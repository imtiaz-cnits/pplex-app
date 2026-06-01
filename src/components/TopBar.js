import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import Logo from './Logo';

export default function TopBar({ back = false, navigation }) {
  const { colors, theme, toggleTheme } = useTheme();
  const { setSidebarOpen, setSearchOpen, setNotiOpen } = useOverlays();

  return (
    <View style={[styles.container, { backgroundColor: colors.phBg, borderBottomColor: colors.border }]}>
      <View style={styles.leftSection}>
        {back ? (
          <TouchableOpacity onPress={() => navigation && navigation.goBack()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSidebarOpen(true)} style={styles.iconBtn}>
            <Feather name="menu" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={[
          styles.logoWrapper,
          {
            backgroundColor: theme === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'transparent',
            borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            borderWidth: theme === 'dark' ? 1 : 0
          }
        ]}>
          <Logo color="green" width={90} height={24} />
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Theme Toggle */}
        <TouchableOpacity onPress={toggleTheme} style={styles.iconBtn}>
          <Feather name={theme === 'light' ? 'moon' : 'sun'} size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Search */}
        <TouchableOpacity onPress={() => setSearchOpen(true)} style={styles.iconBtn}>
          <Feather name="search" size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Notification */}
        <TouchableOpacity onPress={() => setNotiOpen(true)} style={styles.iconBtn}>
          <View style={styles.notiWrapper}>
            <Feather name="bell" size={20} color={colors.text} />
            <View style={styles.badge} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    elevation: 2,
    ...Platform.select({
      web: {
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 10,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBtn: {
    padding: 6,
  },
  notiWrapper: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 7,
    height: 7,
    backgroundColor: '#ff5252',
    borderRadius: 3.5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});
