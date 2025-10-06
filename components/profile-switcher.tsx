'use client'

import { useState } from 'react';
import { useProfile, useCurrentProfileId } from '@/app/providers/ProfileProvider';
import { ProfileId } from '@/types/profile';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { ChevronDown, User, LogOut } from 'lucide-react';

export function ProfileSwitcher() {
  const { currentProfileId, setCurrentProfileId, profiles, isLoading: profileLoading } = useProfile();
  const [isLoading, setIsLoading] = useState(false);

  if (profileLoading || !currentProfileId) {
    return null;
  }

  const currentProfile = profiles.find(p => p.id === currentProfileId);

  const handleProfileSwitch = async (profileId: string) => {
    if (currentProfileId === profileId) return;

    setIsLoading(true);
    try {
      setCurrentProfileId(profileId as ProfileId);
      toast.success(`✅ Переключение на ${profiles.find(p => p.id === profileId)?.name}`);
    } catch (error: any) {
      console.error('Profile switch failed:', error);
      toast.error(`Ошибка: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <User className="h-4 w-4 mr-2" />
          {currentProfile?.avatar} {currentProfile?.name}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
          Переключить профиль
        </div>
        <DropdownMenuSeparator />
        
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => handleProfileSwitch(profile.id)}
            className="cursor-pointer"
            disabled={isLoading}
          >
            <span className="mr-2">{profile.avatar}</span>
            {profile.name}
            {currentProfileId === profile.id && (
              <span className="ml-auto text-xs text-muted-foreground">✓</span>
            )}
          </DropdownMenuItem>
        ))}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            toast.info('Выход из профиля не требуется - просто переключитесь на другой профиль');
          }}
          className="cursor-pointer text-muted-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Справка
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
