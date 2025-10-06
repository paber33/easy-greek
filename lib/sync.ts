import { supabase, isSupabaseConfigured } from './supabase'
import { Card, SessionSummary, SRSConfig, CardStatus } from '@/types'
import { Database } from '@/types'

type CardRow = Database['public']['Tables']['cards']['Row']
type SessionLogRow = Database['public']['Tables']['session_logs']['Row']
type ConfigRow = Database['public']['Tables']['user_configs']['Row']

export class SyncService {
  private isOnline = false
  private syncQueue: Array<() => Promise<void>> = []
  private isProcessingQueue = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine
      window.addEventListener('online', () => {
        this.isOnline = true
        this.processQueue()
      })
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  async syncCards(cards: Card[]): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping sync')
      return
    }
    
    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncCards(cards))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    console.log('syncCards called for user:', user.id, user.email)

    try {
      // Преобразуем локальные карточки в формат Supabase
      const cardsToSync = cards.map(card => ({
        user_id: user.id,
        greek: card.greek,
        translation: card.translation,
        tags: card.tags || [],
        status: card.status,
        reps: card.reps,
        lapses: card.lapses,
        ease: card.ease,
        interval_days: card.interval,
        last_review: card.lastReview || null,
        due: card.due,
        correct: card.correct,
        incorrect: card.incorrect,
        learning_step_index: card.learningStepIndex || null,
        is_leech: card.isLeech || false,
        // Новые поля для дополнительного контента
        examples: card.examples || null,
        notes: card.notes || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audioUrl || null,
        image_url: card.imageUrl || null,
        // Legacy поля для обратной совместимости
        difficulty: card.difficulty || null,
        stability: card.stability || null,
        current_step: card.currentStep || null,
      }))

      // Upsert карточки
      const { error } = await supabase
        .from('cards')
        .upsert(cardsToSync as any, { 
          onConflict: 'user_id,greek,translation',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Failed to sync cards:', error)
        throw error
      }

      console.log(`Synced ${cards.length} cards to Supabase`)
    } catch (error) {
      console.error('Error syncing cards:', error)
      throw error
    }
  }

  async syncCardsForPartner(cards: Card[], partnerName: string): Promise<void> {
    console.log('syncCardsForPartner called with:', { cardsCount: cards.length, partnerName })
    
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping partner sync')
      return
    }
    
    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncCardsForPartner(cards, partnerName))
      return
    }

    try {
      // Получаем ID партнера по имени
      const partnerUserId = await this.getPartnerUserId(partnerName)
      if (!partnerUserId) {
        throw new Error(`Пользователь ${partnerName} не найден`)
      }

      // Преобразуем карточки для партнера
      const cardsToSync = cards.map(card => ({
        user_id: partnerUserId,
        greek: card.greek,
        translation: card.translation,
        tags: card.tags || [],
        status: card.status,
        reps: card.reps,
        lapses: card.lapses,
        ease: card.ease,
        interval_days: card.interval,
        last_review: card.lastReview || null,
        due: card.due,
        correct: card.correct,
        incorrect: card.incorrect,
        learning_step_index: card.learningStepIndex || null,
        is_leech: card.isLeech || false,
        // Новые поля для дополнительного контента
        examples: card.examples || null,
        notes: card.notes || null,
        pronunciation: card.pronunciation || null,
        audio_url: card.audioUrl || null,
        image_url: card.imageUrl || null,
        // Legacy поля для обратной совместимости
        difficulty: card.difficulty || null,
        stability: card.stability || null,
        current_step: card.currentStep || null,
      }))

      // Upsert карточки для партнера
      const { error } = await supabase
        .from('cards')
        .upsert(cardsToSync as any, { 
          onConflict: 'user_id,greek,translation',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Failed to sync cards for partner:', error)
        throw error
      }

      console.log(`Synced ${cards.length} cards to Supabase for ${partnerName}`)
    } catch (error) {
      console.error('Error syncing cards for partner:', error)
      throw error
    }
  }

  private async getPartnerUserId(partnerName: string): Promise<string | null> {
    try {
      // Получаем пользователей из Supabase auth
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      
      if (error) {
        console.error('Error fetching users:', error)
        return null
      }

      // Ищем пользователя по email или metadata
      const partner = users.find(user => {
        // Проверяем email
        if (user.email?.toLowerCase().includes(partnerName.toLowerCase())) {
          return true
        }
        // Проверяем metadata
        if (user.user_metadata?.name === partnerName) {
          return true
        }
        return false
      })

      return partner?.id || null
    } catch (error) {
      console.error('Error getting partner user ID:', error)
      return null
    }
  }

  async syncSessionLogs(logs: SessionSummary[]): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping sync')
      return
    }
    
    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncSessionLogs(logs))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const logsToSync = logs.map(log => ({
        user_id: user.id,
        date: log.date,
        total_reviewed: log.totalReviewed,
        correct: log.correct,
        incorrect: log.incorrect,
        new_cards: log.newCards,
        review_cards: log.reviewCards,
        learning_cards: log.learningCards,
        accuracy: log.accuracy,
      }))

      const { error } = await supabase
        .from('session_logs')
        .upsert(logsToSync as any, { 
          onConflict: 'user_id,date',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Failed to sync logs:', error)
        throw error
      }

      console.log(`Synced ${logs.length} session logs to Supabase`)
    } catch (error) {
      console.error('Error syncing logs:', error)
      throw error
    }
  }

  async syncConfig(config: SRSConfig): Promise<void> {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, skipping sync')
      return
    }
    
    if (!this.isOnline) {
      this.syncQueue.push(() => this.syncConfig(config))
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_configs')
        .upsert({
          user_id: user.id,
          daily_new: config.DAILY_NEW,
          daily_reviews: config.DAILY_REVIEWS,
          learning_steps_min: config.LEARNING_STEPS_MIN,
          r_target: config.R_TARGET,
        } as any, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('Failed to sync config:', error)
        throw error
      }

      console.log('Synced config to Supabase')
    } catch (error) {
      console.error('Error syncing config:', error)
      throw error
    }
  }

  async loadUserData(): Promise<{ cards: Card[], logs: SessionSummary[], config: SRSConfig } | null> {
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured, cannot load user data')
      return null
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    try {
      // Загружаем карточки
      const { data: cardsData, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')

      if (cardsError) throw cardsError

      // Загружаем логи
      const { data: logsData, error: logsError } = await supabase
        .from('session_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(90)

      if (logsError) throw logsError

      // Загружаем конфиг
      const { data: configData, error: configError } = await supabase
        .from('user_configs')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (configError && configError.code !== 'PGRST116') throw configError

      // Преобразуем данные в локальный формат
      const cards: Card[] = cardsData?.map((row: any) => ({
        id: row.id,
        greek: row.greek,
        translation: row.translation,
        tags: row.tags,
        status: row.status as CardStatus,
        reps: row.reps,
        lapses: row.lapses,
        difficulty: row.difficulty,
        stability: row.stability,
        lastReview: row.last_review || undefined,
        due: row.due,
        correct: row.correct,
        incorrect: row.incorrect,
        currentStep: row.current_step || undefined,
        isLeech: row.is_leech,
      })) || []

      const logs: SessionSummary[] = logsData?.map((row: any) => ({
        date: row.date,
        totalReviewed: row.total_reviewed,
        correct: row.correct,
        incorrect: row.incorrect,
        newCards: row.new_cards,
        reviewCards: row.review_cards,
        learningCards: row.learning_cards,
        accuracy: row.accuracy,
      })) || []

      const config: SRSConfig = configData ? {
        DAILY_NEW: (configData as any).daily_new,
        DAILY_REVIEWS: (configData as any).daily_reviews,
        LEARNING_STEPS_MIN: (configData as any).learning_steps_min,
        R_TARGET: (configData as any).r_target,
      } : {
        DAILY_NEW: 10,
        DAILY_REVIEWS: 120,
        LEARNING_STEPS_MIN: [1, 10],
        R_TARGET: { again: 0.95, hard: 0.90, good: 0.85, easy: 0.80 },
      }

      console.log(`Loaded ${cards.length} cards, ${logs.length} logs from Supabase`)
      return { cards, logs, config }
    } catch (error) {
      console.error('Failed to load user data:', error)
      return null
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || !this.isOnline) return
    
    this.isProcessingQueue = true
    
    while (this.syncQueue.length > 0 && this.isOnline) {
      const syncTask = this.syncQueue.shift()
      if (syncTask) {
        try {
          await syncTask()
        } catch (error) {
          console.error('Sync task failed:', error)
          // Можно добавить retry логику
        }
      }
    }
    
    this.isProcessingQueue = false
  }

  // Метод для принудительной синхронизации всех данных
  async forceSyncAll(cards: Card[], logs: SessionSummary[], config: SRSConfig): Promise<void> {
    try {
      await Promise.all([
        this.syncCards(cards),
        this.syncSessionLogs(logs),
        this.syncConfig(config)
      ])
      console.log('Force sync completed successfully')
    } catch (error) {
      console.error('Force sync failed:', error)
      throw error
    }
  }
}

export const syncService = new SyncService()
