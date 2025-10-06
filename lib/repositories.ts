import { Card, SessionSummary, SRSConfig } from '@/types';
import { ProfileId } from '@/types/profile';

/**
 * Интерфейс репозитория для карточек
 */
export interface CardsRepository {
  list(profileId: ProfileId): Promise<Card[]>;
  upsert(profileId: ProfileId, card: Card): Promise<void>;
  bulkSave(profileId: ProfileId, cards: Card[]): Promise<void>;
  remove(profileId: ProfileId, id: string): Promise<void>;
  clear(profileId: ProfileId): Promise<void>;
}

/**
 * Интерфейс репозитория для логов сессий
 */
export interface LogsRepository {
  list(profileId: ProfileId): Promise<SessionSummary[]>;
  append(profileId: ProfileId, log: SessionSummary): Promise<void>;
  clear(profileId: ProfileId): Promise<void>;
}

/**
 * Интерфейс репозитория для настроек
 */
export interface ConfigRepository {
  get(profileId: ProfileId): Promise<SRSConfig>;
  save(profileId: ProfileId, config: SRSConfig): Promise<void>;
}

/**
 * Интерфейс репозитория для текущей сессии
 */
export interface SessionRepository {
  get(profileId: ProfileId): Promise<SessionState | null>;
  save(profileId: ProfileId, session: SessionState): Promise<void>;
  clear(profileId: ProfileId): Promise<void>;
}

export interface SessionState {
  currentCardIndex: number;
  queue: Card[];
  sessionStartTime: string;
  totalReviewed: number;
  correct: number;
  incorrect: number;
}

/**
 * Главный интерфейс репозитория
 */
export interface Repository {
  cards: CardsRepository;
  logs: LogsRepository;
  config: ConfigRepository;
  session: SessionRepository;
}
