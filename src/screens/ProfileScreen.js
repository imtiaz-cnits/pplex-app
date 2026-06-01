import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useOverlays } from '../context/OverlayContext';
import TopBar from '../components/TopBar';
import Preloader from '../components/Preloader';
import { USER_PROFILE } from '../constants/mockData';

export default function ProfileScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const { showComingSoon } = useOverlays();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setLoading(true);
      const timer = setTimeout(() => {
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, [navigation]);

  const handleCallHelpline = () => {
    const url = `tel:${USER_PROFILE.helpline}`;
    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          Alert.alert('Helpline', `Call helpline at ${USER_PROFILE.helpline}`);
        } else {
          return Linking.openURL(url);
        }
      })
      .catch((err) => console.error('An error occurred:', err));
  };

  const handleTilePress = (title) => {
    showComingSoon(title);
  };

  const packageProgress = USER_PROFILE.remainingDays / USER_PROFILE.totalDays;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Info Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarRing, { borderColor: colors.primary }]}>
            <Image source={{ uri: USER_PROFILE.avatar }} style={styles.avatar} />
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>{USER_PROFILE.name}</Text>
          <Text style={[styles.profileMail, { color: colors.textSec }]}>{USER_PROFILE.email}</Text>
        </View>

        {/* Package Active Bar */}
        <View style={[styles.pkgBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.pkgTop}>
            <View>
              <Text style={styles.pkgSubText}>Active Package</Text>
              <Text style={[styles.pkgName, { color: colors.text }]}>{USER_PROFILE.activePackage}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.pkgSubText}>Expires On</Text>
              <Text style={[styles.pkgExp, { color: colors.text }]}>{USER_PROFILE.expiresOn}</Text>
            </View>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: colors.primary,
                  width: `${packageProgress * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[styles.progressNote, { color: colors.textSec }]}>
            {USER_PROFILE.remainingDays} Days Remaining
          </Text>
        </View>

        {/* Grid of Action Tiles */}
        <View style={styles.tilesGrid}>
          {/* Recharge Tile */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => handleTilePress('Recharge')}
          >
            <MaterialCommunityIcons name="currency-bdt" size={28} color={colors.primary} />
            <Text style={[styles.tileLabel, { color: colors.textSec }]}>Recharge</Text>
            <Text style={[styles.tileValue, { color: colors.text }]}>Make Payment</Text>
          </TouchableOpacity>

          {/* Package Tile */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => handleTilePress('Package Manager')}
          >
            <Feather name="list" size={26} color="#1a78c2" style={{ marginVertical: 1 }} />
            <Text style={[styles.tileLabel, { color: colors.textSec }]}>Package</Text>
            <Text style={[styles.tileValue, { color: colors.text }]}>View & Change</Text>
          </TouchableOpacity>

          {/* Support Ticket Tile */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => handleTilePress('Support')}
          >
            <Feather name="alert-circle" size={26} color="#e53935" style={{ marginVertical: 1 }} />
            <Text style={[styles.tileLabel, { color: colors.textSec }]}>Problem</Text>
            <Text style={[styles.tileValue, { color: colors.text }]}>Support</Text>
          </TouchableOpacity>

          {/* History Tile */}
          <TouchableOpacity
            style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}
            activeOpacity={0.7}
            onPress={() => handleTilePress('Payment History')}
          >
            <MaterialCommunityIcons name="history" size={28} color="#ff9800" style={{ marginVertical: 0 }} />
            <Text style={[styles.tileLabel, { color: colors.textSec }]}>History</Text>
            <Text style={[styles.tileValue, { color: colors.text }]}>Payment Record</Text>
          </TouchableOpacity>
        </View>

        {/* Helpline Banner */}
        <View style={[styles.helpBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="phone-call" size={26} color={colors.primary} />
          <View style={styles.helpInfo}>
            <Text style={[styles.helpLabel, { color: colors.textSec }]}>Helpline</Text>
            <Text style={[styles.helpNumber, { color: colors.text }]}>{USER_PROFILE.helpline}</Text>
          </View>
          <TouchableOpacity
            style={[styles.callBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            onPress={handleCallHelpline}
          >
            <Text style={styles.callBtnText}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Preloader visible={loading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100, // space for bottom tab navigator
  },
  profileHeader: {
    alignItems: 'center',
    marginVertical: 15,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    padding: 3,
    marginBottom: 12,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    resizeMode: 'cover',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileMail: {
    fontSize: 12,
    marginTop: 2,
  },
  pkgBar: {
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginVertical: 10,
  },
  pkgTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pkgSubText: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
  },
  pkgName: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  pkgExp: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressNote: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginVertical: 15,
  },
  tile: {
    width: '48%',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  tileLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  tileValue: {
    fontSize: 13,
    fontWeight: '750',
  },
  helpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  helpInfo: {
    flex: 1,
    marginLeft: 15,
  },
  helpLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  helpNumber: {
    fontSize: 14,
    fontWeight: '750',
    marginTop: 2,
  },
  callBtn: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  callBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
