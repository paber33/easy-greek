# 🔥 Smoke Tests for Supabase Data Isolation

This document provides manual testing steps to verify that Pavel and Aleksandra have completely isolated data in Supabase.

## Prerequisites

1. **Supabase Setup**: Ensure Supabase is configured with environment variables
2. **Database Schema**: Run the migration `supabase/migrations/001_initial_schema.sql`
3. **User Accounts**: Pavel and Aleksandra accounts exist in Supabase Auth
4. **RLS Policies**: Row Level Security is enabled and working

## Test Scenarios

### 1. Pavel Flow - Initial Setup

**Steps:**

1. Open the application in a browser
2. Login as Pavel:
   - Email: `pavel@example.com`
   - Password: `password123`
3. Verify login success - should see "Добро пожаловать, Pavel! 👋"
4. Check that you're on the main dashboard

**Expected Results:**

- ✅ Login successful
- ✅ User name shows "Pavel" in header
- ✅ No localStorage data warnings in console

### 2. Pavel Data Creation

**Steps:**

1. Click "Add Card" button
2. Add a new Greek word:
   - Greek: `Pavel Test Word`
   - Translation: `Тестовое слово Павла`
   - Tags: `test, pavel`
3. Save the card
4. Verify card appears in the list
5. Start a study session
6. Review the card with "Good" rating
7. Finish the session
8. Go to Logs page
9. Verify session log appears

**Expected Results:**

- ✅ Card saved successfully
- ✅ Card visible in Pavel's card list
- ✅ Session completed successfully
- ✅ Log entry created for today
- ✅ All data stored in Supabase (check browser dev tools Network tab)

### 3. Pavel Settings

**Steps:**

1. Go to Settings page
2. Change Daily New Cards to `20`
3. Change Daily Reviews to `150`
4. Save settings
5. Refresh the page
6. Verify settings persisted

**Expected Results:**

- ✅ Settings saved successfully
- ✅ Settings persist after page refresh
- ✅ Settings stored in Supabase `user_configs` table

### 4. Logout and Aleksandra Login

**Steps:**

1. Click Logout button
2. Verify redirected to login screen
3. Login as Aleksandra:
   - Email: `aleksandra@example.com`
   - Password: `password123`
4. Verify login success - should see "Добро пожаловать, Aleksandra! 👋"

**Expected Results:**

- ✅ Logout successful
- ✅ Login as Aleksandra successful
- ✅ User name shows "Aleksandra" in header

### 5. Aleksandra Data Isolation

**Steps:**

1. Check the card list - should be empty or show only Aleksandra's cards
2. Verify Pavel's "Pavel Test Word" is NOT visible
3. Add Aleksandra's own card:
   - Greek: `Aleksandra Test Word`
   - Translation: `Тестовое слово Александры`
   - Tags: `test, aleksandra`
4. Save the card
5. Start a study session
6. Review the card with "Easy" rating
7. Finish the session
8. Go to Logs page
9. Verify only Aleksandra's session log appears

**Expected Results:**

- ✅ Pavel's data is completely hidden from Aleksandra
- ✅ Only Aleksandra's card is visible
- ✅ Only Aleksandra's session log is visible
- ✅ No cross-contamination of data

### 6. Aleksandra Settings

**Steps:**

1. Go to Settings page
2. Verify settings are default (not Pavel's values)
3. Change Daily New Cards to `15`
4. Save settings
5. Verify settings are different from Pavel's

**Expected Results:**

- ✅ Settings are independent from Pavel's
- ✅ Default values shown initially
- ✅ Aleksandra's settings saved separately

### 7. Return to Pavel - Data Persistence

**Steps:**

1. Logout from Aleksandra
2. Login as Pavel again
3. Verify Pavel's data is still there:
   - "Pavel Test Word" card is visible
   - Pavel's session log is visible
   - Pavel's settings (Daily New: 20) are restored
4. Verify Aleksandra's data is NOT visible

**Expected Results:**

- ✅ Pavel's data completely restored
- ✅ Aleksandra's data completely hidden
- ✅ No data loss or mixing

### 8. Cross-User Data Verification

**Steps:**

1. In Pavel's account, try to access data that should belong to Aleksandra
2. Check browser dev tools Network tab for API calls
3. Verify all API calls include Pavel's user_id
4. Verify no data from other users is returned

**Expected Results:**

- ✅ All API calls filtered by user_id
- ✅ No unauthorized data access
- ✅ RLS policies working correctly

### 9. Page Refresh and Persistence

**Steps:**

1. In Pavel's account, refresh the page
2. Verify all data loads correctly
3. Verify user remains logged in
4. Repeat for Aleksandra's account

**Expected Results:**

- ✅ Data persists after page refresh
- ✅ User session maintained
- ✅ No data loss

### 10. Offline Mode Testing

**Steps:**

1. In Pavel's account, disconnect internet
2. Try to add a new card
3. Verify error message appears
4. Verify app doesn't crash
5. Reconnect internet
6. Verify retry functionality works

**Expected Results:**

- ✅ Graceful error handling in offline mode
- ✅ App doesn't crash
- ✅ Retry functionality works when online

## Database Verification

### Check Supabase Dashboard

1. **Authentication → Users**
   - Verify Pavel and Aleksandra users exist
   - Check user IDs are different

2. **Database → Tables**
   - **cards table**: Verify each card has correct user_id
   - **session_logs table**: Verify logs are separated by user_id
   - **user_configs table**: Verify separate configs for each user
   - **sessions table**: Verify active sessions are user-specific

3. **Database → Policies**
   - Verify RLS policies are enabled
   - Test policies by trying to access other user's data

### SQL Queries for Verification

```sql
-- Check cards isolation
SELECT user_id, greek, translation FROM cards ORDER BY user_id, created_at;

-- Check session logs isolation
SELECT user_id, date, total_reviewed FROM session_logs ORDER BY user_id, date DESC;

-- Check user configs isolation
SELECT user_id, daily_new, daily_reviews FROM user_configs ORDER BY user_id;

-- Test RLS (should only return current user's data)
SELECT * FROM cards;
SELECT * FROM session_logs;
SELECT * FROM user_configs;
```

## Troubleshooting

### Common Issues

1. **"User not authenticated" errors**
   - Check Supabase Auth configuration
   - Verify environment variables
   - Check browser console for auth errors

2. **Data not loading**
   - Check Network tab for failed API calls
   - Verify RLS policies are correct
   - Check Supabase logs for errors

3. **Data mixing between users**
   - Verify RLS policies are enabled
   - Check that all queries include user_id filter
   - Test with SQL queries in Supabase dashboard

4. **Migration issues**
   - Check if localStorage data was properly migrated
   - Verify migration completed successfully
   - Check browser console for migration errors

### Debug Commands

```javascript
// Check current user in browser console
const {
  data: { user },
} = await supabase.auth.getUser();
console.log("Current user:", user);

// Check user's cards
const { data: cards } = await supabase.from("cards").select("*");
console.log("User cards:", cards);

// Check user's logs
const { data: logs } = await supabase.from("session_logs").select("*");
console.log("User logs:", logs);

// Check user's config
const { data: config } = await supabase.from("user_configs").select("*");
console.log("User config:", config);
```

## Success Criteria

All tests must pass for the implementation to be considered successful:

- ✅ **Complete Data Isolation**: Pavel and Aleksandra cannot see each other's data
- ✅ **Persistent Storage**: All data stored in Supabase, not localStorage
- ✅ **RLS Security**: Row Level Security prevents unauthorized access
- ✅ **Session Management**: User sessions work correctly
- ✅ **Offline Handling**: App handles offline mode gracefully
- ✅ **Migration Success**: localStorage data migrated to Supabase
- ✅ **No Data Loss**: All existing data preserved during migration

## Notes

- This smoke test should be run after any changes to the data layer
- All tests should be run in both development and production environments
- Consider running these tests with different browsers to ensure compatibility
- Document any issues found during testing for future reference
