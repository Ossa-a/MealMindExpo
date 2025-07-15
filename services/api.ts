import { API_URL } from '@env';
import { router } from 'expo-router';
import { deleteToken, getToken, setToken } from './tokenStorage';

const API_BASE_URL = API_URL; // Update for production

class APIClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const token = await getToken();
    const config: RequestInit = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const responseBody = await response.text();
      if (!response.ok) {
        if (response.status === 401) {
          await deleteToken();
          router.replace('/');
          throw new Error('Session expired');
        }
        let errorData;
        try {
          errorData = JSON.parse(responseBody);
        } catch {
          errorData = { message: responseBody };
        }
        throw new Error(errorData.message || 'Request failed');
      }
      return responseBody ? JSON.parse(responseBody) : {};
    } catch (error) {
      throw error;
    }
  }

  // Auth methods
  async login(credentials: { email: string; password: string }) {
    const result = await this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (result.access_token) {
      await setToken(result.access_token);
    }
    return result;
  }

  async register(userData: { name: string; email: string; password: string; password_confirmation: string }) {
    const result = await this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (result.access_token) {
      await setToken(result.access_token);
    }
    return result;
  }

  async getProfile() {
    return this.request('/api/profile');
  }

  // Profile methods
  async createProfile(profileData: any) {
    return this.request('/api/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(profileData: any) {
    return this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  // Meal plan methods
  async generateMealPlan() {
    return this.request('/api/meal-plan/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getMealPlans() {
    return this.request('/api/meal-plans');
  }

  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }
}

export const authService = new APIClient();
export const profileService = new APIClient();
export const mealPlanService = new APIClient();