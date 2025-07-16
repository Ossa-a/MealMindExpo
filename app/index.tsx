import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors, gradients } from '../constants/Colors';
import { authService } from '../services/api';

export default function LoginScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    console.log('Login/Register button pressed');
    try {
      setIsLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      if (isLogin) {
        console.log('About to call authService.login');
        const response = await authService.login({ email, password });
        if (response.access_token) {
          // Token is already set in the API client
          try {
            const profile = await authService.getProfile();
            if (profile) {
              router.replace('/(tabs)/dashboard');
            } else {
              router.replace('/onboarding');
            }
          } catch (error) {
            // If profile not found, go to onboarding
            if (error instanceof Error && error.message === 'Profile not found') {
              router.replace('/onboarding');
            } else {
              Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
            }
          }
        } else {
          Alert.alert('Error', 'Login failed. Please check your credentials.');
        }
      } else {
        if (password !== confirmPassword) {
          Alert.alert('Error', 'Passwords do not match');
          return;
        }
        if (!name) {
          Alert.alert('Error', 'Please enter your name');
          return;
        }
        console.log('About to call authService.register');
        const response = await authService.register({
          name,
          email,
          password,
          password_confirmation: confirmPassword,
        });
        if (response.access_token) {
          router.replace('/onboarding');
        } else {
          Alert.alert('Error', 'Registration failed. Please try again.');
        }
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!isAvailable) return;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access MealMind',
        fallbackLabel: 'Use passcode',
      });

      if (result.success) {
        const token = await SecureStore.getItemAsync('auth_token');
        if (token) {
          router.replace('/(tabs)/dashboard');
        }
      }
    } catch (error) {
      console.log('Biometric auth error:', error);
    }
  };

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
          <Text style={styles.title}>🍽️ MealMind</Text>
          <Text style={styles.subtitle}>AI-Powered Meal Planning</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400)} style={styles.formContainer}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, isLogin && styles.activeToggle]}
              onPress={() => setIsLogin(true)}
            >
              <Text style={[styles.toggleText, isLogin && styles.activeToggleText]}>
                Login
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !isLogin && styles.activeToggle]}
              onPress={() => setIsLogin(false)}
            >
              <Text style={[styles.toggleText, !isLogin && styles.activeToggleText]}>
                Register
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            {!isLogin && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor="#666"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#666"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#666"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.authButton}
            onPress={handleAuth}
            disabled={isLoading}
          >
            <LinearGradient colors={gradients.primary} style={styles.buttonGradient}>
              <Text style={styles.buttonText}>
                {isLoading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {isLogin && (
            <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricAuth}>
              <Text style={styles.biometricText}>Use Face ID / Touch ID</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 25,
    padding: 4,
    marginBottom: 30,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
  },
  activeToggle: {
    backgroundColor: colors.primary[500],
  },
  toggleText: {
    color: '#ccc',
    fontWeight: '600',
  },
  activeToggleText: {
    color: 'white',
  },
  inputContainer: {
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    color: 'white',
    fontSize: 16,
  },
  authButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  biometricButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  biometricText: {
    color: colors.primary[500],
    fontSize: 16,
  },
});