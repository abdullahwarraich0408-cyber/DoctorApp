import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../lib/auth/AuthContext';
import { LoginScreen } from '../features/auth/LoginScreen';
import { OnboardingScreen, hasCompletedOnboarding } from '../features/onboarding';
import { MainTabs } from './MainTabs';
import { AppointmentDetailScreen } from '../features/appointments/AppointmentDetailScreen';
import { ConsultationScreen } from '../features/consult/ConsultationScreen';
import { ChatScreen } from '../features/chat/ChatScreen';
import { VideoConsultScreen } from '../features/consult/VideoConsultScreen';
import { PrescriptionScreen } from '../features/prescription/PrescriptionScreen';
import { PatientDetailScreen } from '../features/patients/PatientDetailScreen';
import { ScheduleScreen } from '../features/schedule/ScheduleScreen';
import { SettingsScreen } from '../features/account/SettingsScreen';
import { NotificationsScreen } from '../features/account/NotificationsScreen';
import { FollowUpsScreen } from '../features/followups/FollowUpsScreen';
import { colors } from '../theme';
import type { AuthStackParamList, RootStackParamList } from './types';

const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const AppStackNav = createNativeStackNavigator<RootStackParamList>();

function AuthStack({
  initialRouteName,
  onOnboardingComplete,
}: {
  initialRouteName: keyof AuthStackParamList;
  onOnboardingComplete: () => void;
}) {
  return (
    <AuthStackNav.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}>
      <AuthStackNav.Screen
        name="Onboarding"
        options={{ gestureEnabled: false, animation: 'fade' }}>
        {({ navigation }) => (
          <OnboardingScreen
            onComplete={() => {
              onOnboardingComplete();
              navigation.replace('Login');
            }}
          />
        )}
      </AuthStackNav.Screen>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
    </AuthStackNav.Navigator>
  );
}

function AppStack() {
  return (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AppStackNav.Screen name="Main" component={MainTabs} />
      <AppStackNav.Screen name="AppointmentDetail" component={AppointmentDetailScreen} />
      <AppStackNav.Screen name="Consultation" component={ConsultationScreen} />
      <AppStackNav.Screen name="Chat" component={ChatScreen} />
      <AppStackNav.Screen name="Video" component={VideoConsultScreen} />
      <AppStackNav.Screen name="Prescription" component={PrescriptionScreen} />
      <AppStackNav.Screen name="PatientDetail" component={PatientDetailScreen} />
      <AppStackNav.Screen name="Schedule" component={ScheduleScreen} />
      <AppStackNav.Screen name="Settings" component={SettingsScreen} />
      <AppStackNav.Screen name="Notifications" component={NotificationsScreen} />
      <AppStackNav.Screen name="FollowUps" component={FollowUpsScreen} />
    </AppStackNav.Navigator>
  );
}


export function AppNavigator() {
  const { ready, isAuthenticated } = useAuth();
  const [onboardingReady, setOnboardingReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const finish = (show: boolean) => {
      if (cancelled) return;
      setShowOnboarding(show);
      setOnboardingReady(true);
    };
    const timeout = setTimeout(() => finish(true), 1200);

    hasCompletedOnboarding()
      .then(done => {
        clearTimeout(timeout);
        finish(!done);
      })
      .catch(() => {
        clearTimeout(timeout);
        finish(true);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  const finishOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  if (!ready || !onboardingReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.mist,
        }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const authStart: keyof AuthStackParamList = showOnboarding
    ? 'Onboarding'
    : 'Login';

  return (
    <NavigationContainer
      key={isAuthenticated ? 'app' : showOnboarding ? 'onboarding' : 'auth'}>
      {isAuthenticated ? (
        <AppStack />
      ) : (
        <AuthStack
          initialRouteName={authStart}
          onOnboardingComplete={finishOnboarding}
        />
      )}
    </NavigationContainer>
  );
}
