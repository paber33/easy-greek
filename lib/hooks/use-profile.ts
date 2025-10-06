import { useProfile as useProfileContext } from '@/app/providers/ProfileProvider';

/**
 * Custom hook for profile management
 * 
 * Provides access to current profile and profile switching functionality.
 * Must be used within a ProfileProvider context.
 * 
 * @example
 * ```typescript
 * const { currentProfileId, switchProfile, isLoading } = useProfile();
 * ```
 * 
 * @returns Profile context with current profile and management functions
 * @throws Error if used outside ProfileProvider
 */
export const useProfile = () => {
  const context = useProfileContext();
  
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  
  return context;
};

/**
 * Hook to get current profile ID with validation
 * 
 * Convenience hook that extracts and validates the current profile ID.
 * Throws an error if no profile is active.
 * 
 * @example
 * ```typescript
 * const profileId = useCurrentProfileId();
 * const cards = await LocalCardsRepository.list(profileId);
 * ```
 * 
 * @returns Current profile ID
 * @throws Error if no active profile
 */
export const useCurrentProfileId = () => {
  const { currentProfileId } = useProfile();
  
  if (!currentProfileId) {
    throw new Error('No active profile. Make sure ProfileProvider is initialized.');
  }
  
  return currentProfileId;
};
