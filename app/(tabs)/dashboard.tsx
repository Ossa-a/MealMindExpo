import { API_URL } from '@env';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Colors, gradients } from '../../constants/Colors';
import { mealPlanService, profileService } from '../../services/api';
import { deleteToken, getToken } from '../../services/tokenStorage';

const { width } = Dimensions.get('window');

interface DashboardStats {
  caloriesConsumed: number;
  caloriesTarget: number;
  dailyCaloriesTarget: number;
  mealsPlanned: number;
  streakDays: number;
  protein: number;
  carbs: number;
  fat: number;
}

export default function DashboardScreen() {
  const [stats, setStats] = useState<DashboardStats>({
    caloriesConsumed: 0,
    caloriesTarget: 2000,
    dailyCaloriesTarget: 2000,
    mealsPlanned: 0,
    streakDays: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [name, setName] = useState('');
  const router = useRouter();
  const [eatenMeals, setEatenMeals] = useState<{ [mealId: string]: boolean }>({});
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [showTrackMealModal, setShowTrackMealModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
    loadEatenMeals();
    loadCurrentPlan();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Fetch user name from /api/user
      const userResponse = await fetch(`${process.env.API_URL || ''}/api/user`, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(await getToken() ? { 'Authorization': `Bearer ${await getToken()}` } : {}),
        },
      });
      const userData = await userResponse.json();
      setName(userData.user?.name || '');

      const profile = await profileService.getProfile();
      // Map profile fields to stats as needed
      setStats({
        caloriesConsumed: profile.calories_consumed || 0,
        caloriesTarget: profile.calories_target || 2000,
        dailyCaloriesTarget: profile.daily_calories_target || 2000,
        mealsPlanned: profile.meals_planned || 0,
        streakDays: profile.streak_days || 0,
        protein: profile.protein || 0,
        carbs: profile.carbs || 0,
        fat: profile.fat || 0,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const loadEatenMeals = async () => {
    const data = await AsyncStorage.getItem('eatenMeals');
    if (data) setEatenMeals(JSON.parse(data));
  };

  const loadCurrentPlan = async () => {
    try {
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
    }
  };

  // Calculate total calories eaten for today
  const getTodayIndex = () => {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 7 : jsDay;
  };
  const todayIdx = getTodayIndex();
  const totalCaloriesEatenToday = currentPlan?.meals?.reduce((sum: number, meal: any) => {
    return (eatenMeals[meal.id] && meal.pivot?.day_of_week === todayIdx) ? sum + (meal.calories || 0) : sum;
  }, 0) || 0;

  // Calculate meals planned for today
  const mealsPlannedToday = currentPlan?.meals?.filter((meal: any) => 
    meal.pivot?.day_of_week === todayIdx
  ).length || 0;

  // Calculate day streak based on eaten meals
  const calculateDayStreak = () => {
    if (!eatenMeals || Object.keys(eatenMeals).length === 0) return 0;
    
    // Get all unique dates where meals were eaten
    const eatenDates = new Set<string>();
    currentPlan?.meals?.forEach((meal: any) => {
      if (eatenMeals[meal.id]) {
        // Convert day_of_week to actual date (simplified - assumes current week)
        const today = new Date();
        const dayOffset = (meal.pivot?.day_of_week || 1) - todayIdx;
        const mealDate = new Date(today);
        mealDate.setDate(today.getDate() + dayOffset);
        eatenDates.add(mealDate.toDateString());
      }
    });
    
    // Count consecutive days (simplified calculation)
    return eatenDates.size;
  };

  const dayStreak = calculateDayStreak();

  // Use dailyCaloriesTarget from profile as max calories
  const maxCalories = stats.dailyCaloriesTarget || stats.caloriesTarget;

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const generateMealPlan = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      await mealPlanService.generateMealPlan();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Refresh dashboard data
      await loadDashboardData();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Failed to generate meal plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Make the calorie progress bar dynamic based on actual calories eaten today and the dynamic maxCalories
  const calorieProgress = maxCalories > 0 ? (totalCaloriesEatenToday / maxCalories) * 100 : 0;

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

  // Get today's meals
  const getTodayMeals = () => {
    if (!currentPlan?.meals) return [];
    const todayIdx = getTodayIndex();
    return currentPlan.meals.filter((meal: any) => meal.pivot?.day_of_week === todayIdx);
  };

  const handleTrackMeal = () => {
    setShowTrackMealModal(true);
  };

  const toggleMealEaten = (mealId: string) => {
    setEatenMeals(prev => ({ ...prev, [mealId]: !prev[mealId] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render track meal modal
  const renderTrackMealModal = () => (
    <Modal 
      visible={showTrackMealModal} 
      animationType="slide" 
      transparent 
      onRequestClose={() => setShowTrackMealModal(false)}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setShowTrackMealModal(false)}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ backgroundColor: '#222', borderRadius: 16, padding: 24, width: '90%', maxHeight: '80%' }}
          onPress={e => e.stopPropagation && e.stopPropagation()}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>Track Today's Meals</Text>
            <TouchableOpacity onPress={() => setShowTrackMealModal(false)}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            {getTodayMeals().length === 0 ? (
              <Text style={{ color: '#ccc', textAlign: 'center', fontStyle: 'italic' }}>
                No meals planned for today. Generate a meal plan first!
              </Text>
            ) : (
              getTodayMeals().map((meal: any) => (
                <View 
                  key={meal.id} 
                  style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    marginBottom: 12, 
                    backgroundColor: eatenMeals[meal.id] ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.08)', 
                    borderRadius: 8, 
                    padding: 12 
                  }}
                >
                  <TouchableOpacity style={{ flex: 1 }}>
                    <Text style={{ 
                      color: eatenMeals[meal.id] ? '#22c55e' : 'white', 
                      fontWeight: 'bold', 
                      fontSize: 15, 
                      textDecorationLine: eatenMeals[meal.id] ? 'line-through' : 'none' 
                    }}>
                      {meal.title}
                    </Text>
                    <Text style={{ color: '#ccc', fontSize: 13 }}>
                      {mealTypeLabel(meal.meal_type)} • {meal.calories} cal
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => toggleMealEaten(meal.id)}
                    style={{ 
                      marginLeft: 10, 
                      backgroundColor: eatenMeals[meal.id] ? '#22c55e' : '#333', 
                      borderRadius: 16, 
                      padding: 8 
                    }}
                  >
                    <Ionicons 
                      name={eatenMeals[meal.id] ? 'checkmark-done' : 'checkmark-outline'} 
                      size={20} 
                      color="white" 
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
          
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Text style={{ color: '#ccc', fontSize: 14, textAlign: 'center' }}>
              Total calories eaten today: {totalCaloriesEatenToday}
            </Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={styles.greeting}>Good morning{name ? `, ${name}` : ''}! 👋</Text>
              <Text style={styles.subtitle}>Ready to plan your meals?</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Remove profile icon button */}
              <TouchableOpacity onPress={async () => {
                await deleteToken();
                router.replace('/');
              }} style={{ padding: 8 }}>
                <Ionicons name="log-out-outline" size={28} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Calorie Tracking Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.calorieCard}>
          <LinearGradient colors={gradients.card} style={styles.cardGradient}>
            <View style={styles.calorieHeader}>
              <Text style={styles.cardTitle}>Today's Calories</Text>
              <Text style={styles.caloriePercentage}>{Math.round(calorieProgress)}%</Text>
            </View>
            
            <View style={styles.calorieNumbers}>
              <Text style={styles.caloriesConsumed}>{totalCaloriesEatenToday}</Text>
              <Text style={styles.caloriesSeparator}>/</Text>
              <Text style={styles.caloriesTarget}>{maxCalories}</Text>
            </View>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[ 
                    styles.progressBarFill,
                    { width: `${Math.min(calorieProgress, 100)}%` }
                  ]} 
                />
              </View>
            </View>

            {/* Macros */}
            <View style={styles.macrosContainer}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{stats.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{stats.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{stats.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={generateMealPlan}
            disabled={isGenerating}
          >
            <LinearGradient colors={gradients.primary} style={styles.actionButtonGradient}>
              <Text style={styles.actionButtonIcon}>✨</Text>
              <Text style={styles.actionButtonText}>
                {isGenerating ? 'Generating...' : 'Generate Plan'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleTrackMeal}
          >
            <LinearGradient colors={gradients.secondary} style={styles.actionButtonGradient}>
              <Text style={styles.actionButtonIcon}>📱</Text>
              <Text style={styles.actionButtonText}>Track Meal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats Grid */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.statsGrid}>
          <View style={styles.statCard}>
            <LinearGradient colors={gradients.card} style={styles.statCardGradient}>
              <Text style={styles.statNumber}>{mealsPlannedToday}</Text>
              <Text style={styles.statLabel}>Meals Planned</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={gradients.card} style={styles.statCardGradient}>
              <Text style={styles.statNumber}>{dayStreak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Recent Activity */}
        <Animated.View entering={FadeInDown.delay(500)} style={styles.recentActivity}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <LinearGradient colors={gradients.card} style={styles.activityCardGradient}>
              <Text style={styles.activityText}>No recent activity</Text>
              <Text style={styles.activitySubtext}>Start tracking meals to see your progress</Text>
            </LinearGradient>
          </View>
        </Animated.View>
      </ScrollView>
      {showTrackMealModal && renderTrackMealModal()}
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
  },
  calorieCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 20,
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  caloriePercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary[500],
  },
  calorieNumbers: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 20,
  },
  caloriesConsumed: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  caloriesSeparator: {
    fontSize: 24,
    color: '#666',
    marginHorizontal: 10,
  },
  caloriesTarget: {
    fontSize: 24,
    color: '#ccc',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 4,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  macroLabel: {
    fontSize: 12,
    color: '#ccc',
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionButtonGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 15,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  statCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  recentActivity: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  activityCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  activityCardGradient: {
    padding: 20,
    alignItems: 'center',
  },
  activityText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  activitySubtext: {
    fontSize: 14,
    color: '#ccc',
  },
});