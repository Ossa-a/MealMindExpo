import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors, gradients } from '../../constants/Colors';
import { mealPlanService, profileService } from '../../services/api';

const { width } = Dimensions.get('window');

interface DashboardStats {
  caloriesConsumed: number;
  caloriesTarget: number;
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
    mealsPlanned: 0,
    streakDays: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const profile = await profileService.getProfile();
      // Map profile fields to stats as needed
      setStats({
        caloriesConsumed: profile.calories_consumed || 0,
        caloriesTarget: profile.calories_target || 2000,
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

  const calorieProgress = stats.caloriesTarget > 0 ? (stats.caloriesConsumed / stats.caloriesTarget) * 100 : 0;

  return (
    <LinearGradient colors={gradients.background} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
          <Text style={styles.greeting}>Good morning! 👋</Text>
          <Text style={styles.subtitle}>Ready to plan your meals?</Text>
        </Animated.View>

        {/* Calorie Tracking Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.calorieCard}>
          <LinearGradient colors={gradients.card} style={styles.cardGradient}>
            <View style={styles.calorieHeader}>
              <Text style={styles.cardTitle}>Today's Calories</Text>
              <Text style={styles.caloriePercentage}>{Math.round(calorieProgress)}%</Text>
            </View>
            
            <View style={styles.calorieNumbers}>
              <Text style={styles.caloriesConsumed}>{stats.caloriesConsumed}</Text>
              <Text style={styles.caloriesSeparator}>/</Text>
              <Text style={styles.caloriesTarget}>{stats.caloriesTarget}</Text>
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

          <TouchableOpacity style={styles.actionButton}>
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
              <Text style={styles.statNumber}>{stats.mealsPlanned}</Text>
              <Text style={styles.statLabel}>Meals Planned</Text>
            </LinearGradient>
          </View>

          <View style={styles.statCard}>
            <LinearGradient colors={gradients.card} style={styles.statCardGradient}>
              <Text style={styles.statNumber}>{stats.streakDays}</Text>
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
    color: colors.primary[500],
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
    backgroundColor: colors.primary[500],
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