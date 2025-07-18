import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, gradients } from '../../constants/Colors';
import { profileService } from '../../services/api';
import { deleteToken, getToken } from '../../services/tokenStorage';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  weight?: number;
  height?: number;
  gender?: string;
  dateOfBirth?: string;
  goal?: string;
  dietPreference?: string;
  activityLevel?: string;
  allergies?: string[];
  dailyCaloriesTarget?: number;
  notifications?: {
    mealReminders: boolean;
    weeklyReports: boolean;
    achievements: boolean;
  };
  biometricEnabled?: boolean;
}

const goalOptions = [
  { id: 'lose_weight', title: 'Lose Weight', icon: '🎯' },
  { id: 'gain_muscle', title: 'Gain Muscle', icon: '💪' },
  { id: 'maintain_weight', title: 'Maintain Weight', icon: '⚖️' }
];

const dietOptions = [
  { id: 'keto', title: 'Keto', icon: '🥑' },
  { id: 'vegan', title: 'Vegan', icon: '🌱' },
  { id: 'vegetarian', title: 'Vegetarian', icon: '🥗' },
  { id: 'paleo', title: 'Paleo', icon: '🥩' },
  { id: 'mediterranean', title: 'Mediterranean', icon: '🫒' },
  { id: 'none', title: 'No Preference', icon: '🍽️' }
];

const activityOptions = [
  { id: 'sedentary', title: 'Sedentary' },
  { id: 'light', title: 'Lightly Active' },
  { id: 'moderate', title: 'Moderately Active' },
  { id: 'very_active', title: 'Very Active' }
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      // Fetch user info
      const userRes = await fetch(`${process.env.API_URL || ''}/api/user`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(await getToken() ? { 'Authorization': `Bearer ${await getToken()}` } : {}),
        },
      });
      const userData = await userRes.json();
      // Fetch profile info
      const profileData = await profileService.getProfile();
      setProfile({
        id: profileData.id,
        name: userData.user?.name || '',
        email: userData.user?.email || '',
        weight: profileData.weight,
        height: profileData.height,
        gender: profileData.gender,
        dateOfBirth: profileData.date_of_birth ? profileData.date_of_birth.split('T')[0] : '',
        goal: profileData.goals,
        dietPreference: profileData.diet_type,
        allergies: profileData.allergies || [],
        activityLevel: profileData.activity_level,
        dailyCaloriesTarget: profileData.daily_calories_target,
        notifications: {
          mealReminders: false,
          weeklyReports: false,
          achievements: false,
        },
        biometricEnabled: false,
      });
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;
    try {
      setIsSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Map frontend fields to backend keys
      const payload = {
        name: profile.name,
        weight: profile.weight,
        height: profile.height,
        goals: profile.goal,
        diet_type: profile.dietPreference,
        allergies: profile.allergies,
        activity_level: profile.activityLevel,
        daily_calories_target: profile.dailyCaloriesTarget,
        gender: profile.gender, // always include
        date_of_birth: profile.dateOfBirth, // always include
        email: profile.email, // always include if backend expects it
      };
      await profileService.updateProfile(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update profile');
      console.error('Profile update error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = (key: keyof UserProfile, value: any) => {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  };

  const updateNotificationSetting = (key: string, value: boolean) => {
    if (!profile) return;
    setProfile({
      ...profile,
      notifications: {
        mealReminders: profile.notifications?.mealReminders ?? false,
        weeklyReports: profile.notifications?.weeklyReports ?? false,
        achievements: profile.notifications?.achievements ?? false,
        [key]: value
      }
    });
  };

  const toggleBiometric = async () => {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      if (!isAvailable) {
        Alert.alert('Not Available', 'Biometric authentication is not available on this device');
        return;
      }

      const newValue = !profile?.biometricEnabled;
      updateProfile('biometricEnabled', newValue);
      
      if (newValue) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable biometric authentication for MealMind',
        });
        
        if (!result.success) {
          updateProfile('biometricEnabled', false);
        }
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await deleteToken();
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const renderOptionModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: any[],
    currentValue: string | undefined,
    onSelect: (value: string) => void
  ) => (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalOptions}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.modalOption,
                  currentValue === option.id && styles.selectedModalOption
                ]}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
              >
                {option.icon && <Text style={styles.modalOptionIcon}>{option.icon}</Text>}
                <Text style={styles.modalOptionText}>{option.title}</Text>
                {currentValue === option.id && (
                  <Ionicons name="checkmark" size={20} color={Colors.primary[500]} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </LinearGradient>
    );
  }

  if (!profile) {
    return (
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>{profile.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons 
                name={isEditing ? "close" : "pencil"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Personal Information */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.card}>
            <LinearGradient colors={gradients.card} style={styles.cardGradient}>
              {isEditing ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <Text style={styles.profileValue}>{profile.name || '-'}</Text>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <Text style={styles.profileValue}>{profile.name || '-'}</Text>
                </View>
              )}

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Weight (kg)</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={profile.weight?.toString() || ''}
                    onChangeText={(text) => updateProfile('weight', parseFloat(text) || 0)}
                    placeholder="70"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    editable={isEditing}
                    accessibilityLabel="Weight"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={[styles.input, !isEditing && styles.inputDisabled]}
                    value={profile.height?.toString() || ''}
                    onChangeText={(text) => updateProfile('height', parseFloat(text) || 0)}
                    placeholder="170"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    editable={isEditing}
                    accessibilityLabel="Height"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Daily Calorie Target</Text>
                <TextInput
                  style={[styles.input, !isEditing && styles.inputDisabled]}
                  value={profile.dailyCaloriesTarget?.toString() || ''}
                  onChangeText={(text) => updateProfile('dailyCaloriesTarget', parseFloat(text) || 0)}
                  placeholder="2000"
                  placeholderTextColor="#666"
                  keyboardType="numeric"
                  editable={isEditing}
                  accessibilityLabel="Daily Calorie Target"
                />
              </View>
              {isEditing ? (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={profile.dateOfBirth || ''}
                      onChange={e => updateProfile('dateOfBirth', e.target.value)}
                      style={{
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        borderBottom: '1px solid #ccc',
                        fontSize: 16,
                        padding: 10,
                        marginBottom: 15,
                        width: '100%',
                      }}
                      aria-label="Date of Birth"
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.input}
                      onPress={() => setShowDatePicker(true)}
                      accessibilityLabel="Select date of birth"
                    >
                      <Text style={{ color: profile.dateOfBirth ? 'white' : '#ccc' }}>
                        {profile.dateOfBirth || 'Select date'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Date of Birth</Text>
                  <Text style={styles.profileValue}>{profile.dateOfBirth || '-'}</Text>
                </View>
              )}
              {showDatePicker && Platform.OS !== 'web' && (
                <DateTimePicker
                  value={profile.dateOfBirth ? new Date(profile.dateOfBirth) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      // Format as YYYY-MM-DD
                      const iso = selectedDate.toISOString().split('T')[0];
                      updateProfile('dateOfBirth', iso);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Goals & Preferences */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>Goals & Preferences</Text>
          
          <View style={styles.card}>
            <LinearGradient colors={gradients.card} style={styles.cardGradient}>
              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => isEditing && setShowGoalModal(true)}
                disabled={!isEditing}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionIcon}>
                    {goalOptions.find(g => g.id === profile.goal)?.icon || '🎯'}
                  </Text>
                  <View>
                    <Text style={styles.optionLabel}>Goal</Text>
                    <Text style={styles.optionValue}>
                      {goalOptions.find(g => g.id === profile.goal)?.title || 'Not set'}
                    </Text>
                  </View>
                </View>
                {isEditing && <Ionicons name="chevron-forward" size={20} color="#666" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => isEditing && setShowDietModal(true)}
                disabled={!isEditing}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionIcon}>
                    {dietOptions.find(d => d.id === profile.dietPreference)?.icon || '🍽️'}
                  </Text>
                  <View>
                    <Text style={styles.optionLabel}>Diet Preference</Text>
                    <Text style={styles.optionValue}>
                      {dietOptions.find(d => d.id === profile.dietPreference)?.title || 'Not set'}
                    </Text>
                  </View>
                </View>
                {isEditing && <Ionicons name="chevron-forward" size={20} color="#666" />}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionRow}
                onPress={() => isEditing && setShowActivityModal(true)}
                disabled={!isEditing}
              >
                <View style={styles.optionLeft}>
                  <Text style={styles.optionIcon}>🏃‍♂️</Text>
                  <View>
                    <Text style={styles.optionLabel}>Activity Level</Text>
                    <Text style={styles.optionValue}>
                      {activityOptions.find(a => a.id === profile.activityLevel)?.title || 'Not set'}
                    </Text>
                  </View>
                </View>
                {isEditing && <Ionicons name="chevron-forward" size={20} color="#666" />}
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Notifications */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          
          <View style={styles.card}>
            <LinearGradient colors={gradients.card} style={styles.cardGradient}>
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Text style={styles.switchIcon}>🔔</Text>
                  <View>
                    <Text style={styles.switchLabel}>Meal Reminders</Text>
                    <Text style={styles.switchDescription}>Get reminded about meal times</Text>
                  </View>
                </View>
                <Switch
                  value={profile.notifications?.mealReminders || false}
                  onValueChange={(value) => updateNotificationSetting('mealReminders', value)}
                  trackColor={{ false: '#666', true: Colors.primary[500] }}
                  thumbColor="white"
                  accessibilityLabel="Meal Reminders"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Text style={styles.switchIcon}>📊</Text>
                  <View>
                    <Text style={styles.switchLabel}>Weekly Reports</Text>
                    <Text style={styles.switchDescription}>Receive weekly progress reports</Text>
                  </View>
                </View>
                <Switch
                  value={profile.notifications?.weeklyReports || false}
                  onValueChange={(value) => updateNotificationSetting('weeklyReports', value)}
                  trackColor={{ false: '#666', true: Colors.primary[500] }}
                  thumbColor="white"
                  accessibilityLabel="Weekly Reports"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Text style={styles.switchIcon}>🏆</Text>
                  <View>
                    <Text style={styles.switchLabel}>Achievements</Text>
                    <Text style={styles.switchDescription}>Get notified about achievements</Text>
                  </View>
                </View>
                <Switch
                  value={profile.notifications?.achievements || false}
                  onValueChange={(value) => updateNotificationSetting('achievements', value)}
                  trackColor={{ false: '#666', true: Colors.primary[500] }}
                  thumbColor="white"
                  accessibilityLabel="Achievements"
                />
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Security */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          
          <View style={styles.card}>
            <LinearGradient colors={gradients.card} style={styles.cardGradient}>
              <View style={styles.switchRow}>
                <View style={styles.switchLeft}>
                  <Text style={styles.switchIcon}>🔐</Text>
                  <View>
                    <Text style={styles.switchLabel}>Biometric Authentication</Text>
                    <Text style={styles.switchDescription}>Use Face ID or Touch ID</Text>
                  </View>
                </View>
                <Switch
                  value={profile.biometricEnabled || false}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: '#666', true: Colors.primary[500] }}
                  thumbColor="white"
                  accessibilityLabel="Biometric Authentication"
                />
              </View>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInDown.delay(600)} style={styles.actionButtons}>
          {isEditing ? (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveProfile}
              disabled={isSaving}
            >
              <LinearGradient colors={gradients.primary} style={styles.saveButtonGradient}>
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modals */}
      {renderOptionModal(
        showGoalModal,
        () => setShowGoalModal(false),
        'Select Your Goal',
        goalOptions,
        profile.goal,
        (value) => updateProfile('goal', value)
      )}

      {renderOptionModal(
        showDietModal,
        () => setShowDietModal(false),
        'Select Diet Preference',
        dietOptions,
        profile.dietPreference,
        (value) => updateProfile('dietPreference', value)
      )}

      {renderOptionModal(
        showActivityModal,
        () => setShowActivityModal(false),
        'Select Activity Level',
        activityOptions,
        profile.activityLevel,
        (value) => updateProfile('activityLevel', value)
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#ccc',
    marginTop: 2,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    fontSize: 16,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: '#ccc',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  optionLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionValue: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  switchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  switchLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  switchDescription: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.secondary[500],
  },
  logoutButtonText: {
    color: Colors.secondary[500],
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.neutral[800],
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOptions: {
    flex: 1,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  selectedModalOption: {
    backgroundColor: 'rgba(249,115,22,0.1)',
  },
  modalOptionIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  modalOptionText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  profileValue: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
});