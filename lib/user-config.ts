export interface UserConfig {
  id: 'pavel' | 'aleksandra' | 'test'
  name: string
  email: string
  password: string
  avatar: string
  color: string
}

export const USER_CONFIGS: UserConfig[] = [
  {
    id: 'pavel',
    name: 'Pavel',
    email: 'pavel@easy-greek.com',
    password: 'pavel123456',
    avatar: '👨‍💻',
    color: 'blue'
  },
  {
    id: 'aleksandra',
    name: 'Aleksandra',
    email: 'aleksandra@easy-greek.com',
    password: 'aleksandra123456',
    avatar: '👩‍💻',
    color: 'pink'
  },
  {
    id: 'test',
    name: 'Test User',
    email: 'test@easy-greek.com',
    password: 'test123456',
    avatar: '🧪',
    color: 'green'
  }
]

export function getUserConfig(userId: 'pavel' | 'aleksandra' | 'test'): UserConfig {
  return USER_CONFIGS.find(config => config.id === userId)!
}

export function getCurrentUserFromEmail(email: string): 'pavel' | 'aleksandra' | 'test' | null {
  if (email === 'pavel@easy-greek.com') return 'pavel'
  if (email === 'aleksandra@easy-greek.com') return 'aleksandra'
  if (email === 'test@easy-greek.com') return 'test'
  return null
}
