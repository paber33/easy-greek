import { Profile, ProfileId } from '@/types/profile';

export const DEFAULT_PROFILES: Profile[] = [
  { 
    id: "test", 
    name: "Test User",
    avatar: "🧪",
    color: "green"
  },
  { 
    id: "pavel", 
    name: "Pavel",
    avatar: "👨‍💻",
    color: "blue"
  },
  { 
    id: "aleksandra", 
    name: "Aleksandra",
    avatar: "👩‍💻", 
    color: "pink"
  },
];

export const DEFAULT_PROFILE_ID: ProfileId = "test";

/**
 * Получает профиль по ID
 */
export const getProfileById = (profileId: ProfileId): Profile | undefined => {
  return DEFAULT_PROFILES.find(p => p.id === profileId);
};

/**
 * Получает текущий активный профиль из localStorage
 */
export const getCurrentProfileId = (): ProfileId | null => {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem("greek-mvp:currentProfile");
    if (stored && (stored === "pavel" || stored === "aleksandra" || stored === "test")) {
      return stored as ProfileId;
    }
  } catch (error) {
    console.error('Failed to get current profile:', error);
  }
  
  return DEFAULT_PROFILE_ID;
};

/**
 * Сохраняет текущий активный профиль в localStorage
 */
export const setCurrentProfileId = (profileId: ProfileId): void => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem("greek-mvp:currentProfile", profileId);
  } catch (error) {
    console.error('Failed to set current profile:', error);
  }
};
