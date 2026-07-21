import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/lib/stores/auth.store';

// Screens
import LoginScreen from '@/screens/auth/login';
import RegisterScreen from '@/screens/auth/register';
import DashboardScreen from '@/screens/dashboard';
import GameScreen from '@/screens/game';
import LeaderboardScreen from '@/screens/leaderboard';
import ProfileScreen from '@/screens/profile';
import ChatScreen from '@/screens/chat';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * AuthStack - Login/Register
 */
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#111827' },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

/**
 * AppStack - Logged in
 */
function AppStack() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1f2937' },
        headerTintColor: '#fff',
        tabBarStyle: { backgroundColor: '#1f2937', borderTopColor: '#374151' },
        tabBarActiveTintColor: '#fbbf24',
        tabBarInactiveTintColor: '#9ca3af',
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Carteira',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Game"
        component={GameScreen}
        options={{
          title: 'Jogo',
          tabBarLabel: 'Poker',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🎰</Text>,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Rankings',
          tabBarLabel: 'Rankings',
          tabBarIcon: ({ color }) => <Text style={{ color }}>🏆</Text>,
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
          tabBarLabel: 'Chat',
          tabBarIcon: ({ color }) => <Text style={{ color }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color }) => <Text style={{ color }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * RootNavigator
 */
function RootNavigator() {
  const { isAuthenticated, refreshToken } = useAuthStore();

  useEffect(() => {
    refreshToken();
  }, []);

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return <RootNavigator />;
}
