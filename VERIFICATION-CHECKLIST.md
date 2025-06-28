# 🔍 Verification Checklist - Modules 1-4

## ✅ Module 1: Visitor ID Handling

### Test: New Visitor
1. Open browser dev tools → Application → Local Storage
2. Delete `visitor_id` key (if present)
3. Refresh the page
4. **Check Console**: Should see `🆕 No visitor_id found in storage — generated new one: <uuid>`
5. **Check Local Storage**: Should see new `visitor_id` key with UUID value

### Test: Returning Visitor ID
1. Refresh the page again (don't clear storage)
2. **Check Console**: Should see `✅ Found existing visitor_id in localStorage: <uuid>`
3. **Verify**: Same UUID as before

---

## ✅ Module 2: Visitor Registration & JWT

### Test: JWT Registration Flow
1. Delete both `visitor_id` and `visitor_jwt` from localStorage
2. Refresh the page
3. **Check Console**: Should see sequence:
   - `🆕 No visitor_id found in storage — generated new one: <uuid>`
   - `📡 Sending visitor_id to backend for registration: <uuid>`
   - `✅ Visitor registered — JWT received`
   - `💾 Stored visitor_jwt in localStorage`
4. **Check Local Storage**: Should now have both `visitor_id` and `visitor_jwt`
5. **Verify JWT**: Should be a long string starting with `eyJ`

---

## ✅ Module 3: Returning Visitor Validation

### Test: Valid JWT Flow
1. Keep both `visitor_id` and `visitor_jwt` in localStorage
2. Refresh the page
3. **Check Console**: Should see:
   - `✅ Found existing visitor_id in localStorage: <uuid>`
   - `🔁 Found visitor_id + JWT in localStorage — verifying with backend`
   - `✅ Valid JWT — visitor authed`

### Test: Invalid JWT Handling
1. Edit `visitor_jwt` in localStorage (corrupt it by changing a few characters)
2. Refresh the page
3. **Check Console**: Should see:
   - `⚠️ Invalid JWT — clearing localStorage, restarting auth`
   - App should restart with new visitor_id and JWT
4. **Check Local Storage**: Should have new `visitor_id` and `visitor_jwt`

---

## ✅ Module 4: Contact Info Merge

### Test: Contact Info Popup Trigger
1. Ensure you have a valid visitor_id + JWT
2. Add some items to cart (if products are loaded)
3. Hover over the cart icon
4. **Check Console**: Should see `🛒 User triggered contact info collection`
5. **Visual**: Contact info popup should appear

### Test: Contact Info Submission (New Email)
1. Fill in the contact info popup with a NEW email address
2. Submit the form
3. **Check Console**: Should see:
   - `📨 Contact info submitted from popup`
   - `🔄 Flushing cart updates before identity merge...`
   - `✅ Cart flushed - proceeding with identity merge`
   - `📝 Enriched visitor_id <uuid> with contact info`
   - `✅ Contact info merge completed successfully`

### Test: Contact Info Submission (Existing Email)
1. Note your current visitor_id
2. Use an email that was previously submitted by another visitor
3. Submit the form
4. **Check Console**: Should see:
   - `🔄 Merging visitor <old_id> into existing record <new_id>`
   - `🔁 Merge result: updated visitor_id <new_id> and JWT`
   - Cart should be merged between visitors
5. **Check Local Storage**: visitor_id should change to the merged one

---

## 🛒 Cart Functionality

### Test: Cart Hydration from Database
1. Add items to cart
2. Wait for auto-sync (watch console for `🛒 Cart synced to database`)
3. Clear localStorage completely
4. Refresh and go through auth flow
5. **Check Console**: Should see `🛒 Hydrating cart store with X items from database`
6. **Visual**: Cart should contain same items as before

### Test: Cart Merge During Identity Resolution
1. Start as new visitor, add items to cart
2. Submit contact info with email that matches existing visitor with cart items
3. **Check Console**: Should see cart merge logs
4. **Visual**: Cart should contain items from both visitors

---

## 🔧 API Endpoint Tests

### Test: `/api/visitor/init`
```bash
curl -X POST http://localhost:3000/api/visitor/init \
  -H "Content-Type: application/json" \
  -d '{"visitor_id": "test-uuid-123"}'
```
**Expected**: JWT response

### Test: `/api/visitor/validate`
```bash
curl -X GET http://localhost:3000/api/visitor/validate \
  -H "Authorization: Bearer <your_jwt_here>"
```
**Expected**: Visitor data response

### Test: `/api/visitor/identify`
```bash
curl -X POST http://localhost:3000/api/visitor/identify \
  -H "Content-Type: application/json" \
  -d '{"visitor_id": "test-uuid", "email": "test@example.com"}'
```
**Expected**: Identity resolution response

---

## 🚨 Known Issues to Watch For

### Issue: Cart Not Hydrating
- **Symptom**: Console shows cart data but cart UI is empty
- **Check**: Verify `hydrateCartFromDatabase()` is being called
- **Fix**: Ensure cart store actions are working properly

### Issue: JWT Validation Failing
- **Symptom**: Constant localStorage clearing and restart loops
- **Check**: Verify JWT secret matches between frontend and backend
- **Fix**: Check environment variables

### Issue: Identity Merge Not Working
- **Symptom**: New visitor created instead of merging
- **Check**: Email matching logic in `/api/visitor/identify`
- **Fix**: Verify database queries and email normalization

### Issue: Cart Lost During Merge
- **Symptom**: Cart empty after contact info submission
- **Check**: Verify cart flush timing and merge logic
- **Fix**: Ensure `syncCartToDatabase` completes before merge

---

## ✅ Success Indicators

If all tests pass, you should see:
- [ ] Clean console logs with proper emoji prefixes
- [ ] Persistent visitor identity across page refreshes
- [ ] Working JWT validation and refresh
- [ ] Contact info collection triggers correctly
- [ ] Identity merging works for duplicate emails
- [ ] Cart persists through all auth transitions
- [ ] Graceful error handling (no app crashes)

---

## 🔄 Quick Reset for Clean Testing

```javascript
// Run in browser console to reset everything
localStorage.clear();
location.reload();
```

This will start you with a completely fresh visitor state for testing.

---

**⚡ Pro Tip**: Keep browser dev tools open with console visible during all testing. The emoji-prefixed logs tell you exactly what's happening at each step! 