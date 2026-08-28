import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { AppointmentsScreen } from '../features/appointments/AppointmentsScreen';
import { ConsultTabScreen } from '../features/consult/ConsultTabScreen';
import { PatientsScreen } from '../features/patients/PatientsScreen';
import { AccountScreen } from '../features/account/AccountScreen';
import { BottomTabBar } from '../components/navigation/BottomTabBar';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={props => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Appointments" component={AppointmentsScreen} />
      <Tab.Screen name="Consult" component={ConsultTabScreen} />
      <Tab.Screen name="Patients" component={PatientsScreen} />
      <Tab.Screen name="Profile" component={AccountScreen} />
    </Tab.Navigator>
  );
}

