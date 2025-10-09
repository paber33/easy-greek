'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProfileContextType, ProfileId } from '@/types/profile';
import { DEFAULT_PROFILES, getCurrentProfileId, setCurrentProfileId } from '@/lib/profiles';
import { migrateLegacyData } from '@/lib/migration';

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

interface ProfileProviderProps {
  children: ReactNode;
}

export function ProfileProvider({ children }: ProfileProviderProps) {
  const [currentProfileId, setCurrentProfileIdState] = useState<ProfileId | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeProfile = async () => {
      try {
        // Проверяем и выполняем миграцию если нужно
        await migrateLegacyData();
        
        // Загружаем текущий профиль
        const profileId = getCurrentProfileId();
        setCurrentProfileIdState(profileId);
      } catch (error) {
        console.error('Failed to initialize profile:', error);
        setCurrentProfileIdState('test'); // fallback
      } finally {
        setIsLoading(false);
      }
    };

    initializeProfile();
  }, []);

  const handleSetCurrentProfileId = (profileId: ProfileId) => {
    setCurrentProfileIdState(profileId);
    setCurrentProfileId(profileId);
  };

  const value: ProfileContextType = {
    currentProfileId,
    setCurrentProfileId: handleSetCurrentProfileId,
    profiles: DEFAULT_PROFILES,
    isLoading,
  };

  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextType {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

/**
 * Хук для получения текущего profileId с проверкой
 */
export function useCurrentProfileId(): ProfileId | null {
  const { currentProfileId } = useProfile();
  return currentProfileId;
}
