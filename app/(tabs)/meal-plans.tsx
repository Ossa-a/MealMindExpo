import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, gradients } from '../../constants/Colors';
import { mealPlanService } from '../../services/api';

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
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    try {
      setIsLoading(true);
      const data = await mealPlanService.getMealPlans();
      setMealPlans(data);
    } catch (error) {
      console.error('Failed to load meal plans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMealPlans();
    setRefreshing(false);
  };

  const generateNewPlan = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await mealPlanService.generateMealPlan();
      await loadMealPlans();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to generate meal plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderMealPlan = ({ item }: { item: MealPlan }) => (
    <Animated.View entering={FadeInDown} style={styles.mealPlanCard}>
      <LinearGradient colors={gradients.card} style={styles.mealPlanGradient}>
        <View style={styles.mealPlanHeader}>
          <View>
            <Text style={styles.mealPlanName}>{item.name}</Text>
            <Text style={styles.mealPlanDate}>{item.date}</Text>
          </View>
          {item.isActive && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>

        <View style={styles.nutritionSummary}>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalCalories}</Text>
            <Text style={styles.nutritionLabel}>Calories</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalProtein}g</Text>
            <Text style={styles.nutritionLabel}>Protein</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalCarbs}g</Text>
            <Text style={styles.nutritionLabel}>Carbs</Text>
          </View>
          <View style={styles.nutritionItem}>
            <Text style={styles.nutritionValue}>{item.totalFat}g</Text>
            <Text style={styles.nutritionLabel}>Fat</Text>
          </View>
        </View>

        <View style={styles.mealTypes}>
          <View style={styles.mealType}>
            <Text style={styles.mealTypeIcon}>🌅</Text>
            <Text style={styles.mealTypeText}>
              {item.meals.breakfast.length} Breakfast
            </Text>
          </View>
          <View style={styles.mealType}>
            <Text style={styles.mealTypeIcon}>☀️</Text>
            <Text style={styles.mealTypeText}>
              {item.meals.lunch.length} Lunch
            </Text>
          </View>
          <View style={styles.mealType}>
            <Text style={styles.mealTypeIcon}>🌙</Text>
            <Text style={styles.mealTypeText}>
              {item.meals.dinner.length} Dinner
            </Text>
          </View>
          <View style={styles.mealType}>
            <Text style={styles.mealTypeIcon}>🍎</Text>
            <Text style={styles.mealTypeText}>
              {item.meals.snacks.length} Snacks
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewPlanButton}
          onPress={() => router.push(`/meal-plan/${item.id}`)}
        >
          <Text style={styles.viewPlanButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.primary[500]} />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View entering={FadeInDown.delay(300)} style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>🍽️</Text>
      <Text style={styles.emptyStateTitle}>No Meal Plans Yet</Text>
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
  );

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      {/* Header */}
      <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Meal Plans</Text>
            <Text style={styles.headerSubtitle}>AI-powered nutrition planning</Text>
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
          <Text style={styles.loadingText}>Loading meal plans...</Text>
        </View>
      ) : mealPlans.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={mealPlans}
          renderItem={renderMealPlan}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
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