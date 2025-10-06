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
 * Convenience hook that extracts the current profile ID.
 * Returns null if no profile is active (for SSR compatibility).
 * 
 * @example
 * ```typescript
 * const profileId = useCurrentProfileId();
 * if (profileId) {
 *   const cards = await LocalCardsRepository.list(profileId);
 * }
 * ```
 * 
 * @returns Current profile ID or null
 */
export const useCurrentProfileId = () => {
  const { currentProfileId } = useProfile();
  return currentProfileId;
};
