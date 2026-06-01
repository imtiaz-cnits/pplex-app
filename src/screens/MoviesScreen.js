import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import TopBar from '../components/TopBar';

const { width } = Dimensions.get('window');

export default function MoviesScreen({ navigation }) {
  const { colors, theme } = useTheme();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = () => {
    if (email.trim() === '' || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }
    Keyboard.dismiss();
    setSubscribed(true);
  };

  const upcomingFeatures = [
    { icon: 'film', title: '5000+ Blockbusters & VOD', desc: 'Huge library of Bengali, Hindi, and Hollywood titles.' },
    { icon: 'video', title: '4K HDR & Dolby Atmos Sound', desc: 'Immersive cinema quality streaming right in your hand.' },
    { icon: 'tv', title: 'Smart TV Chromecast Casting', desc: 'Cast movies directly to your TV screen with one tap.' },
    { icon: 'download-cloud', title: 'Offline Offline Downloads', desc: 'Save movies on high-speed internet and watch later.' }
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.phBg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} backgroundColor={colors.phBg} />
      <TopBar navigation={navigation} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Hero Banner Grid/Pattern */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={colors.primaryGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroBadge}
            >
              <Text style={styles.badgeText}>COMMITTED TO QUALITY</Text>
            </LinearGradient>

            <Text style={[styles.mainTitle, { color: colors.text }]}>
              Movies & VOD Database
            </Text>
            <Text style={[styles.subTitle, { color: colors.textSec }]}>
              We are working hard to build a premium video-on-demand database server. Stay tuned!
            </Text>

            {/* Launch Status Card */}
            <View style={[styles.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.statusHeader}>
                <View style={styles.pulseContainer}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
                  <View style={[styles.pulseRing, { borderColor: colors.primary }]} />
                </View>
                <Text style={[styles.statusTitle, { color: colors.text }]}>Development In Progress</Text>
              </View>
              <Text style={[styles.statusDesc, { color: colors.textSec }]}>
                Database migration and high-speed local media server integration are currently ongoing.
              </Text>
            </View>
          </View>

          {/* Core Feature Highlights */}
          <View style={styles.featuresSection}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Key Highlights</Text>
            {upcomingFeatures.map((f, i) => (
              <View key={i} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
                <View style={[styles.featureIconContainer, { backgroundColor: theme === 'light' ? '#FFEBEB' : 'rgba(255, 0, 0, 0.1)' }]}>
                  <Feather name={f.icon} size={18} color={colors.primary} />
                </View>
                <View style={styles.featureDetails}>
                  <Text style={[styles.featureTitle, { color: colors.text }]}>{f.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textSec }]}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Premium Subscription Hook Form */}
          <View style={[styles.newsletterSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="movie-filter" size={38} color={colors.primary} style={styles.newsIcon} />
            <Text style={[styles.newsTitle, { color: colors.text }]}>Request Access & Updates</Text>
            <Text style={[styles.newsDesc, { color: colors.textSec }]}>
              Subscribe to get notified as soon as our premium media database server goes live.
            </Text>

            {!subscribed ? (
              <View style={styles.formContainer}>
                <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.bg }]}>
                  <Feather name="mail" size={16} color={colors.textSec} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your email address"
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
                    style={styles.actionBtn}
                  >
                    <Text style={styles.actionText}>Get Early Access</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.successWrapper}>
                <Feather name="check-circle" size={24} color="#4CAF50" style={{ marginBottom: 6 }} />
                <Text style={[styles.successTitle, { color: colors.text }]}>Successfully Subscribed!</Text>
                <Text style={[styles.successDesc, { color: colors.textSec }]}>
                  We have added <Text style={{ fontWeight: 'bold' }}>{email}</Text> to our database list.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 110, // scroll fully behind floating navigation
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  heroBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '850',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statusCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 15,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseContainer: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    position: 'relative',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    opacity: 0.6,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '750',
  },
  statusDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  featuresSection: {
    marginVertical: 15,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureDetails: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  newsletterSection: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  newsIcon: {
    marginBottom: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  newsDesc: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  formContainer: {
    width: '100%',
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
    fontSize: 12.5,
    height: '100%',
  },
  actionBtn: {
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  successWrapper: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  successDesc: {
    fontSize: 11.5,
    textAlign: 'center',
    marginTop: 4,
  },
});
