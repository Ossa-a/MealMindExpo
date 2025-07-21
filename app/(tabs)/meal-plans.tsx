import { API_URL } from '@env';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, gradients } from '../../constants/Colors';
import { mealPlanService } from '../../services/api';
import { getToken } from '../../services/tokenStorage';

interface MealPlan {
  id: string;
  name: string;
  date: string;
  meals: {
    breakfast: Meal[];
    lunch: Meal[];
    dinner: Meal[];
    snacks: Meal[];
  };
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  isActive: boolean;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  image?: string;
}

export default function MealPlansScreen() {
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<any>(null);
  const [showMealModal, setShowMealModal] = useState(false);
  const [eatenMeals, setEatenMeals] = useState<{ [mealId: string]: boolean }>({});

  useEffect(() => {
    loadCurrentPlan();
    // Load eatenMeals from storage on mount
    AsyncStorage.getItem('eatenMeals').then(data => {
      if (data) setEatenMeals(JSON.parse(data));
    });
  }, []);

  // Persist eatenMeals to storage whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('eatenMeals', JSON.stringify(eatenMeals));
  }, [eatenMeals]);

  const loadCurrentPlan = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/meal-plan/current`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setCurrentPlan(data.plan);
    } catch (error) {
      console.error('Failed to load current meal plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCurrentPlan();
    setRefreshing(false);
  };

  const generateNewPlan = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await mealPlanService.generateMealPlan();
      await loadCurrentPlan();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to generate meal plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Group meals by day_of_week and meal_type
  const groupMealsByDay = (meals: any[] = []) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const grouped: Record<string, any[]> = {};
    for (let i = 1; i <= 7; i++) {
      grouped[days[i - 1]] = [];
    }
    meals.forEach(meal => {
      const dayIdx = meal.pivot?.day_of_week || 1;
      const dayName = days[dayIdx - 1];
      if (grouped[dayName]) grouped[dayName].push(meal);
    });
    return grouped;
  };

  // Helper to get meal type label
  const mealTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Breakfast';
      case 'lunch': return 'Lunch';
      case 'dinner': return 'Dinner';
      case 'snack': return 'Snack';
      default: return type;
    }
  };

  // Calculate total calories eaten for today
  const getTodayIndex = () => {
    // JS: 0=Sunday, 1=Monday, ..., 6=Saturday; API: 1=Monday, ..., 7=Sunday
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay; // convert JS Sunday (0) to 7
  };
  const todayIdx = getTodayIndex();
  const totalCaloriesEatenToday = currentPlan?.meals?.reduce((sum: number, meal: any) => {
    return (eatenMeals[meal.id] && meal.pivot?.day_of_week === todayIdx) ? sum + (meal.calories || 0) : sum;
  }, 0) || 0;

  // Modal for meal details
  const renderMealModal = () => (
    <Modal visible={showMealModal} animationType="slide" transparent onRequestClose={() => setShowMealModal(false)}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowMealModal(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ backgroundColor: '#222', borderRadius: 16, padding: 24, width: '90%' }}
          onPress={e => e.stopPropagation && e.stopPropagation()}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20, marginBottom: 8 }}>{selectedMeal?.title}</Text>
          <Text style={{ color: Colors.primary[500], fontWeight: 'bold', marginBottom: 8 }}>{mealTypeLabel(selectedMeal?.meal_type)}</Text>
          <Text style={{ color: '#ccc', marginBottom: 8 }}>{selectedMeal?.description}</Text>
          <Text style={{ color: '#ccc', fontSize: 12, marginBottom: 8 }}>Calories: {selectedMeal?.calories} | Protein: {selectedMeal?.protein}g | Carbs: {selectedMeal?.carbs}g | Fats: {selectedMeal?.fats}g</Text>
          <Text style={{ color: '#ccc', fontWeight: 'bold', marginTop: 8 }}>Ingredients:</Text>
          <Text style={{ color: '#ccc', marginBottom: 8 }}>{selectedMeal?.ingredients?.join(', ')}</Text>
          <Text style={{ color: '#ccc', fontWeight: 'bold', marginTop: 8 }}>Instructions:</Text>
          <Text style={{ color: '#ccc', marginBottom: 16 }}>{selectedMeal?.instructions}</Text>
          <TouchableOpacity onPress={() => setShowMealModal(false)} style={{ alignSelf: 'flex-end', marginTop: 8 }}>
            <Text style={{ color: Colors.primary[500], fontWeight: 'bold', fontSize: 16 }}>Close</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Current Meal Plan</Text>
            <Text style={styles.headerSubtitle}>Your AI-powered nutrition plan for the week</Text>
          </View>
          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateNewPlan}
            disabled={isGenerating}
          >
            <LinearGradient colors={gradients.primary} style={styles.generateButtonGradient}>
              <Ionicons name="add" size={20} color="white" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading meal plan...</Text>
        </View>
      ) : !currentPlan ? (
        <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🍽️</Text>
          <Text style={styles.emptyStateTitle}>No Meal Plan Yet</Text>
          <Text style={styles.emptyStateText}>
            Generate your first AI-powered meal plan to get started with healthy eating!
          </Text>
          <TouchableOpacity
            style={styles.generateFirstButton}
            onPress={generateNewPlan}
            disabled={isGenerating}
          >
            <LinearGradient colors={gradients.primary} style={styles.generateFirstButtonGradient}>
              <Text style={styles.generateFirstButtonText}>
                {isGenerating ? 'Generating...' : 'Generate First Plan'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>
            Week of {currentPlan.week_start_date?.split('T')[0]}
          </Text>
          <Text style={{ color: '#22c55e', fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
            Total Calories Eaten Today: {totalCaloriesEatenToday}
          </Text>
          {Object.entries(groupMealsByDay(currentPlan.meals)).map(([day, meals]) => (
            <View key={day} style={{ marginBottom: 32 }}>
              <Text style={{ color: Colors.primary[500], fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>{day}</Text>
              {meals.length === 0 ? (
                <Text style={{ color: '#ccc', fontStyle: 'italic' }}>No meals planned.</Text>
              ) : (
                meals.map(meal => (
                  <View key={meal.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: eatenMeals[meal.id] ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 12 }}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => { setSelectedMeal(meal); setShowMealModal(true); }}>
                      <Text style={{ color: eatenMeals[meal.id] ? '#22c55e' : 'white', fontWeight: 'bold', fontSize: 15, textDecorationLine: eatenMeals[meal.id] ? 'line-through' : 'none' }}>{meal.title}</Text>
                      <Text style={{ color: '#ccc', fontSize: 13 }}>{mealTypeLabel(meal.meal_type)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setEatenMeals(prev => ({ ...prev, [meal.id]: !prev[meal.id] }))}
                      style={{ marginLeft: 10, backgroundColor: eatenMeals[meal.id] ? '#22c55e' : '#333', borderRadius: 16, padding: 8 }}
                    >
                      <Ionicons name={eatenMeals[meal.id] ? 'checkmark-done' : 'checkmark-outline'} size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
      {showMealModal && renderMealModal()}
    </LinearGradient>
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
  generateButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  generateButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealPlanCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  mealPlanGradient: {
    padding: 20,
  },
  mealPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  mealPlanName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  mealPlanDate: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: Colors.accent[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  nutritionSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  mealTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  mealType: {
    alignItems: 'center',
    flex: 1,
  },
  mealTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
  },
  viewPlanButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  viewPlanButtonText: {
    color: Colors.primary[500],
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  generateFirstButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
  },
  generateFirstButtonGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  generateFirstButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});