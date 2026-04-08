import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SimulatorProvider } from '@/context/SimulatorContext';
import OnboardingModal from '@/components/OnboardingModal';

const ONBOARDING_KEY = 'playarm_onboarding_done';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then(val => {
      if (!val) setShowOnboarding(true);
    }).catch(() => {});
  }, []);

  function handleOnboardingDone() {
    setShowOnboarding(false);
    AsyncStorage.setItem(ONBOARDING_KEY, '1').catch(() => {});
  }

  return (
    <SimulatorProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <OnboardingModal visible={showOnboarding} onDone={handleOnboardingDone} />
      </ThemeProvider>
    </SimulatorProvider>
  );
}
