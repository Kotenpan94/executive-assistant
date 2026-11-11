import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import NowScreen from '../screens/NowScreen';
import UploadScreen from '../screens/UploadScreen';

// Auth gating is off for now (no backend yet). AuthContext/AuthScreen are
// kept in src/ for when it's wired back in.

export type TabParamList = {
  Now: undefined;
  Upload: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#4a6cf7',
          tabBarIconStyle: { display: 'none' },
          tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
        }}
      >
        <Tab.Screen name="Now" component={NowScreen} />
        <Tab.Screen name="Upload" component={UploadScreen} options={{ title: 'Add' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
