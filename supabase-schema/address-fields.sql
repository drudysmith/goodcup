-- Module 6e: Address Data Model Schema Updates
-- Add address fields to the visitors table to support address persistence

-- Add address columns to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_state TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_postal_code TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS address_country TEXT;

-- Add indexes for common address queries
CREATE INDEX IF NOT EXISTS idx_visitors_address_city ON visitors(address_city);
CREATE INDEX IF NOT EXISTS idx_visitors_address_state ON visitors(address_state);
CREATE INDEX IF NOT EXISTS idx_visitors_address_country ON visitors(address_country);

-- Update RLS policies if needed (assuming RLS is already configured for visitors table)
-- No additional RLS changes needed as address fields follow the same access pattern as other visitor fields

-- Optional: Add constraints for data validation
-- ALTER TABLE visitors ADD CONSTRAINT check_address_postal_code_format CHECK (address_postal_code ~ '^[A-Za-z0-9\s\-]+$');

-- Note: For users, address data is stored in their associated visitor record (user_id field)
-- This follows the existing pattern where authenticated users have their data linked via visitors.user_id 