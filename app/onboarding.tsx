import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Keyboard,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { colors, gradients } from '../constants/Colors';
import { profileService } from '../services/api';

const { width } = Dimensions.get('window');

interface OnboardingData {
  goal?: string;
  dietPreference?: string;
  weight?: string;
  height?: string;
  gender?: string;
  date_of_birth?: string;
  activityLevel?: string;
  allergies?: string[];
}

const goalOptions = [
  { id: 'lose_weight', title: 'Lose Weight', icon: '🎯', color: '#ef4444' },
  { id: 'gain_muscle', title: 'Gain Muscle', icon: '💪', color: '#10b981' },
  { id: 'maintain_weight', title: 'Maintain Weight', icon: '⚖️', color: '#f97316' }
];

const dietOptions = [
  { id: 'keto', title: 'Keto', description: 'Low carb, high fat', image: '🥑' },
  { id: 'vegan', title: 'Vegan', description: 'Plant-based only', image: '🌱' },
  { id: 'vegetarian', title: 'Vegetarian', description: 'No meat', image: '🥗' },
  { id: 'paleo', title: 'Paleo', description: 'Whole foods', image: '🥩' },
  { id: 'mediterranean', title: 'Mediterranean', description: 'Balanced diet', image: '🫒' },
  { id: 'none', title: 'No Preference', description: 'All foods', image: '🍽️' }
];

const activityOptions = [
  { id: 'sedentary', title: 'Sedentary', description: 'Little to no exercise', multiplier: 1.2 },
  { id: 'light', title: 'Lightly Active', description: 'Light exercise 1-3 days/week', multiplier: 1.375 },
  { id: 'moderate', title: 'Moderately Active', description: 'Moderate exercise 3-5 days/week', multiplier: 1.55 },
  { id: 'very_active', title: 'Very Active', description: 'Hard exercise 6-7 days/week', multiplier: 1.725 }
];

const allergyOptions = [
  'Gluten',
  'Dairy',
  'Nuts',
  'Eggs',
  'Soy',
  'Shellfish',
  'Fish',
  'Sesame'
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<OnboardingData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateFormData = (key: keyof OnboardingData, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep + 1);
    } else {
      submitOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep - 1);
    }
  };

  const submitOnboarding = async () => {
    try {
      setIsSubmitting(true);
      // Validation for required fields
      const requiredFields = [
        { key: 'goal', label: 'fitness goal' },
        { key: 'dietPreference', label: 'dietary preference' },
        { key: 'weight', label: 'weight' },
        { key: 'height', label: 'height' },
        { key: 'gender', label: 'gender' },
        { key: 'date_of_birth', label: 'date of birth' },
        { key: 'activityLevel', label: 'activity level' }
      ];
      const missing = requiredFields.filter(f => !(formData as any)[f.key]);
      if (missing.length > 0) {
        const message = 'Please specify your ' + missing.map(f => f.label).join(', ') + '.';
        alert(message);
        setIsSubmitting(false);
        return;
      }
      const payload = {
        goals: formData.goal,
        diet_type: formData.dietPreference,
        allergies: formData.allergies,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        height: formData.height ? parseFloat(formData.height) : undefined,
        activity_level: formData.activityLevel,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
      };
      await profileService.createProfile(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Onboarding error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What's your goal?</Text>
            <View style={styles.optionsContainer}>
              {goalOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.goalCard,
                    formData.goal === option.id && styles.selectedCard
                  ]}
                  onPress={() => updateFormData('goal', option.id)}
                >
                  <Text style={styles.goalIcon}>{option.icon}</Text>
                  <Text style={styles.goalTitle}>{option.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      case 1:
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Choose your diet preference</Text>
            <ScrollView style={styles.dietScrollView}>
              <View style={styles.dietGrid}>
                {dietOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.dietCard,
                      formData.dietPreference === option.id && styles.selectedCard
                    ]}
                    onPress={() => updateFormData('dietPreference', option.id)}
                  >
                    <Text style={styles.dietEmoji}>{option.image}</Text>
                    <Text style={styles.dietTitle}>{option.title}</Text>
                    <Text style={styles.dietDescription}>{option.description}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        );

      case 2:
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.weight || ''}
                onChangeText={text => updateFormData('weight', text.replace(/[^0-9.]/g, ''))}
                placeholder="Enter your weight"
                placeholderTextColor="#ccc"
              />

              <Text style={styles.inputLabel}>Height (cm)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.height || ''}
                onChangeText={text => updateFormData('height', text.replace(/[^0-9.]/g, ''))}
                placeholder="Enter your height"
                placeholderTextColor="#ccc"
              />

              <Text style={styles.inputLabel}>Gender</Text>
              <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                {['male', 'female', 'other'].map(gender => (
                  <TouchableOpacity
                    key={gender}
                    style={[
                      styles.genderButton,
                      formData.gender === gender && styles.selectedCard
                    ]}
                    onPress={() => updateFormData('gender', gender)}
                  >
                    <Text style={{ color: 'white' }}>{gender.charAt(0).toUpperCase() + gender.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: formData.date_of_birth ? 'white' : '#ccc' }}>
                  {formData.date_of_birth || 'Select date'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.date_of_birth ? new Date(formData.date_of_birth) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      // Format as YYYY-MM-DD
                      const iso = selectedDate.toISOString().split('T')[0];
                      updateFormData('date_of_birth', iso);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}
            </View>
          </Animated.View>
        );

      case 3:
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>How active are you?</Text>
            <View style={styles.activityContainer}>
              {activityOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.activityCard,
                    formData.activityLevel === option.id && styles.selectedCard
                  ]}
                  onPress={() => updateFormData('activityLevel', option.id)}
                >
                  <Text style={styles.activityTitle}>{option.title}</Text>
                  <Text style={styles.activityDescription}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        );

      case 4:
        return (
          <Animated.View entering={FadeInRight} exiting={FadeOutLeft} style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Any allergies or restrictions?</Text>
            <Text style={styles.allergyNote}>Select any allergies or dietary restrictions</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 20 }}>
              {allergyOptions.map(option => {
                const selected = formData.allergies?.includes(option);
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.allergyButton,
                      selected && styles.selectedCard
                    ]}
                    onPress={() => {
                      let newAllergies = formData.allergies || [];
                      if (selected) {
                        newAllergies = newAllergies.filter(a => a !== option);
                      } else {
                        newAllergies = [...newAllergies, option];
                      }
                      updateFormData('allergies', newAllergies);
                    }}
                  >
                    <Text style={{ color: 'white' }}>{option}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <LinearGradient colors={gradients.background} style={styles.container}>
        <View style={styles.header}>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${((currentStep + 1) / 5) * 100}%` }]} />
          </View>
          <Text style={styles.stepCounter}>{currentStep + 1} of 5</Text>
        </View>

        <View style={styles.content}>
          {renderStep()}
        </View>

        <View style={styles.navigation}>
          {currentStep > 0 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.nextButton}
            onPress={nextStep}
            disabled={isSubmitting}
          >
            <LinearGradient colors={gradients.primary} style={styles.nextButtonGradient}>
              <Text style={styles.nextButtonText}>
                {currentStep === 4 ? (isSubmitting ? 'Creating...' : 'Complete') : 'Next'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    marginBottom: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: 2,
  },
  stepCounter: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 40,
  },
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  goalCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: {
    borderColor: colors.primary[500],
    backgroundColor: 'rgba(249,115,22,0.2)',
  },
  goalIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  goalTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  dietScrollView: {
    flex: 1,
  },
  dietGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dietCard: {
    width: (width - 60) / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dietEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  dietTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dietDescription: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    color: 'white',
    fontSize: 16,
  },
  activityContainer: {
    flex: 1,
  },
  activityCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activityTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  activityDescription: {
    color: '#ccc',
    fontSize: 14,
  },
  allergyNote: {
    color: '#ccc',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  genderButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  backButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
  },
  nextButton: {
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    marginLeft: 20,
  },
  nextButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  allergyButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    margin: 5,
  },
});