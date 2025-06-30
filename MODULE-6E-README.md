# Module 6e: Address Data Model & API Setup

## Overview
Module 6e establishes the database schema and API infrastructure for address persistence in both visitor and authenticated user flows. This groundwork enables checkout address persistence in subsequent modules.

## Database Schema Changes

### Required SQL Updates
Apply the schema changes in `supabase-schema/address-fields.sql`:

```sql
-- Add address columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_country TEXT;
```

### Data Architecture
- **Visitors**: Address data stored directly in `visitors` table columns
- **Authenticated Users**: Address data stored in their linked visitor record (via `user_id` field)
- **Consistent Access**: Both visitor and user flows access address data through the same table structure

## API Endpoints

### `/api/visitor/updateAddress` (POST)
- **Authentication**: Visitor JWT token via `Authorization: Bearer <token>`
- **Payload**: `{ address: { street?, city?, state?, postal_code?, country? } }`
- **Response**: `{ success: boolean, message: string, address: AddressData }`

### `/api/user/updateAddress` (POST)
- **Authentication**: Supabase session token via `Authorization: Bearer <token>`
- **Payload**: `{ address: { street?, city?, state?, postal_code?, country? } }`
- **Response**: `{ success: boolean, message: string, address: AddressData, user_id: string }`

## Type Definitions

### Shared Types (`lib/types/address.ts`)
```typescript
interface AddressData {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

interface VisitorAddressFields {
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
}
```

### Helper Functions
- `addressDataToFields()`: Convert frontend format to database fields
- `fieldsToAddressData()`: Convert database fields to frontend format
- `isValidAddress()`: Validate address completeness
- `formatAddress()`: Format address for display

## Frontend Integration

### VisitorContext Updates
- `VisitorData` interface now extends `VisitorAddressFields`
- Address fields included in visitor data queries
- Ready for TanStack Query/Mutation integration in modules 6f.1 and 6f.2

## Testing

### Manual Testing
Use the test script: `scripts/test-address-endpoints.js`

1. Apply database schema changes
2. Get valid JWT tokens from your application
3. Update token placeholders in test script
4. Run: `node scripts/test-address-endpoints.js`

### Expected Behavior
- Endpoints should accept address data and log to console
- Database updates should succeed without errors
- No impact on existing cart sync or contact info functionality

## Console Logging
- `📍 Module 6e: Updating address for visitor/user [ID]`
- `💾 Module 6e: Address updated for visitor/user: [ID]`

## Next Steps
- **Module 6f.1**: TanStack Query integration for address fetching
- **Module 6f.2**: TanStack Mutation integration for address updates
- **Address persistence**: Will be used in checkout flow enhancement

## Compatibility
- ✅ No breaking changes to existing modules (1-6d)
- ✅ TanStack Query/Mutation ready
- ✅ Follows established JWT verification patterns
- ✅ Compatible with visitor/user merge flow 