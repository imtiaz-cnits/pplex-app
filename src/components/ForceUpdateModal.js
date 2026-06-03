import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Linking,
  StyleSheet,
  BackHandler,
  StatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ForceUpdateModal({ visible, downloadUrl, latestVersionName }) {
  const { colors, theme } = useTheme();

  useEffect(() => {
    if (!visible) return;

    // Block Android hardware back button
    const backAction = () => {
      // Return true to prevent default back action
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [visible]);

  const handleUpdatePress = async () => {
    try {
      if (downloadUrl) {
        await Linking.openURL(downloadUrl);
      }
    } catch (err) {
      console.log('Failed to open download URL:', err.message);
    }
  };

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {
        // Prevent dismissal on Android TV / hardware back
      }}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.95)' }]}>
        <StatusBar barStyle="light-content" backgroundColor="rgba(0, 0, 0, 0.95)" />
        <View style={[styles.card, { backgroundColor: '#111111', borderColor: colors.primary }]}>
          {/* Warning Icon with pulse styling */}
          <View style={[styles.iconWrapper, { backgroundColor: 'rgba(255, 0, 0, 0.1)' }]}>
            <Feather name="download-cloud" size={42} color={colors.primary} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Update Required!</Text>

          {/* Description */}
          <Text style={styles.description}>
            Please update the app to v{latestVersionName || 'latest'} to enjoy uninterrupted live TV and new features.
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
            hasTVPreferredFocus={true}
            onPress={handleUpdatePress}
          >
            <Feather name="download" size={18} color="#fff" style={styles.btnIcon} />
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1.5,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 20,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  btnIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
