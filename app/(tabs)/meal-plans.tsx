import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
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

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      const res = await fetch(`${process.env.API_URL || ''}/api/meal-plan/current`, {
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

  // Group meals by meal_type for display
  const groupMealsByType = (meals: any[] = []) => {
    const grouped: Record<string, any[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    meals.forEach(meal => {
      const type = meal.meal_type === 'snack' ? 'snack' : meal.meal_type;
      if (grouped[type]) grouped[type].push(meal);
    });
    return grouped;
  };

  const renderMeal = (meal: any) => (
    <View key={meal.id} style={{ marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>{meal.title}</Text>
      <Text style={{ color: '#ccc', marginBottom: 4 }}>{meal.description}</Text>
      <Text style={{ color: '#ccc', fontSize: 12 }}>Calories: {meal.calories} | Protein: {meal.protein}g | Carbs: {meal.carbs}g | Fats: {meal.fats}g</Text>
      <Text style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Ingredients: {meal.ingredients?.join(', ')}</Text>
      <Text style={{ color: '#ccc', fontSize: 12, marginTop: 4 }}>Instructions: {meal.instructions}</Text>
    </View>
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
          {Object.entries(groupMealsByType(currentPlan.meals)).map(([type, meals]) => (
            <View key={type} style={{ marginBottom: 24 }}>
              <Text style={{ color: Colors.primary[500], fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              {meals.length === 0 ? (
                <Text style={{ color: '#ccc', fontStyle: 'italic' }}>No meals planned.</Text>
              ) : (
                meals.map(renderMeal)
              )}
            </View>
          ))}
        </ScrollView>
      )}
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