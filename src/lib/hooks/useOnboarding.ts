import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'brain-onboarding-completed';

export const useOnboarding = () => {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(() => {
    // Проверяем localStorage при инициализации
    const completed = localStorage.getItem(ONBOARDING_KEY);
    return completed === 'true';
  });

  const [showOnboarding, setShowOnboarding] = useState<boolean>(!isOnboardingCompleted);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsOnboardingCompleted(true);
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsOnboardingCompleted(false);
    setShowOnboarding(true);
  };

  return {
    isOnboardingCompleted,
    showOnboarding,
    completeOnboarding,
    resetOnboarding,
  };
};
