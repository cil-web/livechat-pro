/**
 * Auth Store - Zustand ile state yönetimi
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export const useAuthStore = create((set, get) => ({
  // State
  isAuthenticated: false,
  operator: null,
  token: null,
  isLoading: false,
  error: null,

  // Actions
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const operatorData = await SecureStore.getItemAsync('operator_data');
      
      if (token && operatorData) {
        set({
          isAuthenticated: true,
          token,
          operator: JSON.parse(operatorData),
        });
      }
    } catch (error) {
      console.error('Auth check error:', error);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });

    try {
      // Demo login - Gerçek uygulamada API'ye istek atılacak
      // const response = await fetch(`${API_URL}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password }),
      // });

      // Demo için basit doğrulama
      if (email && password) {
        const operator = {
          id: 'op_' + Date.now(),
          name: email.split('@')[0],
          email,
          avatar: null,
          role: 'operator',
        };

        const token = 'demo_token_' + Date.now();

        await SecureStore.setItemAsync('auth_token', token);
        await SecureStore.setItemAsync('operator_data', JSON.stringify(operator));

        set({
          isAuthenticated: true,
          operator,
          token,
          isLoading: false,
        });

        return { success: true };
      } else {
        throw new Error('Email ve şifre gerekli');
      }
    } catch (error) {
      set({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
      await SecureStore.deleteItemAsync('operator_data');
      
      set({
        isAuthenticated: false,
        operator: null,
        token: null,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  updateProfile: async (updates) => {
    try {
      const currentOperator = get().operator;
      const updatedOperator = { ...currentOperator, ...updates };
      
      await SecureStore.setItemAsync('operator_data', JSON.stringify(updatedOperator));
      
      set({ operator: updatedOperator });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  setStatus: (status) => {
    const operator = get().operator;
    if (operator) {
      set({ operator: { ...operator, status } });
    }
  },
}));
