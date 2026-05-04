import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { SimulatorProvider } from '@/context/SimulatorContext';
import { ThemeProvider, useThemeContext } from '@/context/ThemeContext';
import OnboardingModal from '@/components/OnboardingModal';

const ONBOARDING_KEY = 'playarm_onboarding_done';

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppLayout />
    </ThemeProvider>
  );
}

function AppLayout() {
  const { colorScheme } = useThemeContext();
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
      <NavThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
        <OnboardingModal visible={showOnboarding} onDone={handleOnboardingDone} />
      </NavThemeProvider>
    </SimulatorProvider>
  );
}
