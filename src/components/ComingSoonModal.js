import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
  Dimensions,
  Platform,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function ComingSoonModal({ visible, featureName = 'This Feature', onClose }) {
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSubscribed(false);
      setEmail('');
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0.6,
          duration: 300,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    }
  }, [visible]);

  const handleSubscribe = () => {
    if (email.trim() === '' || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    Keyboard.dismiss();
    setSubscribed(true);
  };

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* Backdrop */}
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: fadeAnim,
              },
            ]}
          />

          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Header Icon */}
              <View style={[styles.iconContainer, { backgroundColor: colors.border }]}>
                <LinearGradient
                  colors={colors.primaryGrad}
                  style={styles.iconGradient}
                >
                  <MaterialCommunityIcons name="clock-fast" size={32} color="#fff" />
                </LinearGradient>
              </View>

              {/* Title & Description */}
              <Text style={[styles.title, { color: colors.text }]}>Coming Soon!</Text>
              <Text style={[styles.featureText, { color: colors.primary }]}>{featureName}</Text>
              <Text style={[styles.description, { color: colors.textSec }]}>
                We are currently working hard to integrate this module with our backend databases. This feature will be available in the next release.
              </Text>

              {/* Form or Success State */}
              {!subscribed ? (
                <View style={styles.form}>
                  <Text style={[styles.notifyLabel, { color: colors.text }]}>Get Notified When Launching</Text>
                  <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                    <Feather name="mail" size={16} color={colors.textSec} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      placeholder="Enter your email"
                      placeholderTextColor={colors.placeholder}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <TouchableOpacity activeOpacity={0.8} onPress={handleSubscribe}>
                    <LinearGradient
                      colors={colors.primaryGrad}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.subscribeBtn}
                    >
                      <Text style={styles.subscribeText}>Notify Me</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ) : (
                <Animated.View style={styles.successContainer}>
                  <View style={styles.checkIcon}>
                    <Feather name="check" size={24} color="#4CAF50" />
                  </View>
                  <Text style={[styles.successTitle, { color: colors.text }]}>You're on the list!</Text>
                  <Text style={[styles.successSub, { color: colors.textSec }]}>
                    We'll email you at <Text style={{ fontWeight: 'bold' }}>{email}</Text> as soon as this feature is live.
                  </Text>
                </Animated.View>
              )}

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.closeBtn, { borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.closeBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  modalCard: {
    width: width * 0.85,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 20px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
    }),
    elevation: 10,
  },
  iconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '850',
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 10,
  },
  form: {
    width: '100%',
    marginTop: 20,
  },
  notifyLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputWrapper: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  subscribeBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  checkIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  successTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  successSub: {
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 6,
  },
  closeBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  closeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
