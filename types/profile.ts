export interface Profile {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
}

export type ProfileId = 'pavel' | 'aleksandra' | 'test';

export interface ProfileContextType {
  currentProfileId: ProfileId | null;
  setCurrentProfileId: (profileId: ProfileId) => void;
  profiles: Profile[];
  isLoading: boolean;
}
