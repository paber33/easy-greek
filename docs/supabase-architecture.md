# 🏗️ Supabase Architecture Documentation

This document describes the complete architecture of the Easy Greek application using Supabase as the backend service.

## Overview

The application has been migrated from localStorage-based storage to a fully cloud-based architecture using Supabase for:

- **Authentication**: User management and session handling
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Live data synchronization
- **Storage**: File storage for audio/images (future)

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   PostgreSQL    │
│   (Next.js)     │    │   (Backend)     │    │   (Database)    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • React Components│    │ • Auth Service  │    │ • Tables        │
│ • Supabase Client│◄──►│ • API Gateway   │◄──►│ • RLS Policies  │
│ • Repositories   │    │ • Real-time     │    │ • Functions     │
│ • Hooks          │    │ • Storage       │    │ • Triggers      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Database Schema

### Tables

#### 1. `cards` - Flashcard Storage

```sql
CREATE TABLE cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  greek TEXT NOT NULL,
  translation TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('new', 'learning', 'review', 'relearning')),
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  difficulty DECIMAL(3,1) DEFAULT 6.0,
  stability DECIMAL(5,2) DEFAULT 0,
  ease DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  last_review TIMESTAMPTZ,
  due TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  current_step INTEGER,
  learning_step_index INTEGER,
  is_leech BOOLEAN DEFAULT false,
  examples TEXT[],
  notes TEXT,
  pronunciation TEXT,
  audio_url TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, greek, translation)
);
```

#### 2. `session_logs` - Study Session History

```sql
CREATE TABLE session_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_reviewed INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  new_cards INTEGER DEFAULT 0,
  review_cards INTEGER DEFAULT 0,
  learning_cards INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

#### 3. `user_configs` - User Settings

```sql
CREATE TABLE user_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_new INTEGER DEFAULT 10,
  daily_reviews INTEGER DEFAULT 120,
  learning_steps_min INTEGER[] DEFAULT '{1, 10}',
  r_target JSONB DEFAULT '{"again": 0.95, "hard": 0.90, "good": 0.85, "easy": 0.80}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `sessions` - Active Study Sessions

```sql
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  reviewed_count INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `daily_logs` - Daily Statistics

```sql
CREATE TABLE daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  reviewed_count INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, day)
);
```

### Row Level Security (RLS) Policies

All tables have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Example policy for cards table
CREATE POLICY "cards_owner_all" ON cards
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

This ensures:

- Users can only SELECT, INSERT, UPDATE, DELETE their own records
- No cross-user data access is possible
- Database-level security enforcement

### Indexes

Performance indexes are created for common query patterns:

```sql
CREATE INDEX idx_cards_user_id ON cards(user_id);
CREATE INDEX idx_cards_user_status_due ON cards(user_id, status, due);
CREATE INDEX idx_session_logs_user_date ON session_logs(user_id, date);
```

## Application Architecture

### Repository Pattern

The application uses a repository pattern to abstract data access:

```
lib/repositories/supabase/
├── cards-repository.ts      # Card CRUD operations
├── logs-repository.ts       # Session logs and daily logs
├── settings-repository.ts   # User configuration
├── sessions-repository.ts   # Active sessions
└── supabase-repository.ts   # Main repository coordinator
```

### Storage Service

The main storage service (`lib/core/supabase-storage.ts`) provides:

- High-level API for data operations
- Automatic migration from localStorage
- Error handling and retry logic
- Offline mode support

### Migration System

The migration system (`lib/migration/localStorage-to-supabase.ts`) handles:

- One-time migration from localStorage to Supabase
- Data validation and cleanup
- Backup creation before migration
- Rollback capabilities

## Security Model

### Authentication Flow

1. **User Registration/Login**: Handled by Supabase Auth
2. **JWT Tokens**: Automatic token refresh and validation
3. **Session Management**: Persistent sessions across browser restarts
4. **Logout**: Complete session cleanup

### Data Isolation

- **User ID Filtering**: All queries automatically filtered by `auth.uid()`
- **RLS Policies**: Database-level security enforcement
- **API Security**: No direct database access from frontend
- **Token Validation**: All requests validated by Supabase

### Data Validation

- **Database Constraints**: CHECK constraints on all tables
- **Type Safety**: TypeScript interfaces for all data structures
- **Input Validation**: Client-side validation before API calls
- **Error Handling**: Graceful error handling and user feedback

## Performance Optimizations

### Database Optimizations

- **Indexes**: Strategic indexes on frequently queried columns
- **Connection Pooling**: Supabase handles connection pooling
- **Query Optimization**: Efficient queries with proper filtering
- **Caching**: Supabase provides built-in caching

### Application Optimizations

- **Lazy Loading**: Components loaded on demand
- **Data Pagination**: Large datasets paginated
- **Optimistic Updates**: UI updates before server confirmation
- **Error Boundaries**: Graceful error handling

## Monitoring and Logging

### Supabase Dashboard

- **Database Metrics**: Query performance and usage
- **Authentication Logs**: User login/logout events
- **API Usage**: Request counts and response times
- **Error Tracking**: Failed requests and errors

### Application Logging

- **Console Logging**: Development debugging
- **Error Tracking**: User-facing error messages
- **Performance Monitoring**: Load times and user interactions
- **Analytics**: User behavior and feature usage

## Deployment Architecture

### Environment Configuration

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Production Considerations

- **Environment Variables**: Secure configuration management
- **CDN**: Static assets served via CDN
- **SSL/TLS**: All communications encrypted
- **Backup Strategy**: Regular database backups
- **Monitoring**: Production monitoring and alerting

## Data Flow

### Typical User Operation Flow

1. **User Action**: User performs action (e.g., adds card)
2. **Repository Call**: Frontend calls repository method
3. **Supabase Client**: Repository uses Supabase client
4. **API Request**: Request sent to Supabase API
5. **RLS Check**: Row Level Security validates access
6. **Database Operation**: PostgreSQL executes query
7. **Response**: Data returned to frontend
8. **UI Update**: Frontend updates user interface

### Error Handling Flow

1. **Error Detection**: Error caught at repository level
2. **Error Classification**: Error type determined
3. **User Notification**: Appropriate message shown to user
4. **Retry Logic**: Automatic retry for transient errors
5. **Fallback**: Graceful degradation for persistent errors

## Migration Strategy

### From localStorage to Supabase

1. **Detection**: Check for existing localStorage data
2. **Backup**: Create backup of localStorage data
3. **Migration**: Transfer data to Supabase
4. **Validation**: Verify data integrity
5. **Cleanup**: Remove localStorage data
6. **Verification**: Confirm migration success

### Rollback Plan

- **Backup Retention**: Keep localStorage backups
- **Migration Logs**: Track migration progress
- **Error Recovery**: Handle migration failures
- **Data Restoration**: Restore from backup if needed

## Testing Strategy

### Unit Tests

- **Repository Tests**: Test individual repository methods
- **Data Isolation**: Verify user data separation
- **Error Handling**: Test error scenarios
- **Mocking**: Mock Supabase responses

### Integration Tests

- **End-to-End**: Full user workflows
- **Data Persistence**: Verify data storage
- **Authentication**: Test login/logout flows
- **Cross-User**: Verify data isolation

### Manual Testing

- **Smoke Tests**: Basic functionality verification
- **User Scenarios**: Real-world usage patterns
- **Edge Cases**: Boundary condition testing
- **Performance**: Load and stress testing

## Future Enhancements

### Planned Features

- **Real-time Sync**: Live updates across devices
- **File Storage**: Audio and image support
- **Advanced Analytics**: Detailed learning statistics
- **Social Features**: Shared decks and collaboration
- **Mobile App**: Native mobile applications

### Scalability Considerations

- **Database Sharding**: Horizontal scaling strategy
- **Caching Layer**: Redis for frequently accessed data
- **CDN Integration**: Global content delivery
- **Microservices**: Service decomposition for growth

## Troubleshooting Guide

### Common Issues

1. **Authentication Errors**
   - Check environment variables
   - Verify Supabase project status
   - Check browser console for errors

2. **Data Not Loading**
   - Verify RLS policies
   - Check network connectivity
   - Review Supabase logs

3. **Migration Issues**
   - Check localStorage data format
   - Verify user authentication
   - Review migration logs

### Debug Tools

- **Supabase Dashboard**: Database and auth monitoring
- **Browser DevTools**: Network and console debugging
- **SQL Editor**: Direct database queries
- **Logs**: Application and server logs

## Conclusion

The Supabase architecture provides a robust, scalable, and secure foundation for the Easy Greek application. The combination of PostgreSQL with RLS, Supabase Auth, and the repository pattern ensures data isolation, security, and maintainability while providing excellent developer and user experiences.

Key benefits:

- ✅ **Complete Data Isolation**: Users cannot access each other's data
- ✅ **Scalable Architecture**: Can handle growth and additional features
- ✅ **Security First**: Database-level security with RLS
- ✅ **Developer Experience**: Type-safe, well-documented APIs
- ✅ **User Experience**: Fast, reliable, and responsive application
