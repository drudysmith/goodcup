// Module 6e: Shared address type definitions
// Used across visitor and user address endpoints and frontend components

export interface AddressData {
  street?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface VisitorAddressFields {
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
}

// Helper function to convert between frontend AddressData and database VisitorAddressFields
export const addressDataToFields = (address: AddressData): Partial<VisitorAddressFields> => ({
  address_street: address.street,
  address_city: address.city,
  address_state: address.state,
  address_postal_code: address.postal_code,
  address_country: address.country
});

// Helper function to convert from database fields to frontend format
export const fieldsToAddressData = (fields: VisitorAddressFields): AddressData => ({
  street: fields.address_street || undefined,
  city: fields.address_city || undefined,
  state: fields.address_state || undefined,
  postal_code: fields.address_postal_code || undefined,
  country: fields.address_country || undefined
});

// Validation helper for address data
export const isValidAddress = (address: AddressData): boolean => {
  return !!(address.street && address.city && address.state && address.postal_code && address.country);
};

// Get a formatted address string for display
export const formatAddress = (address: AddressData): string => {
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postal_code,
    address.country
  ].filter(Boolean);
  
  return parts.join(', ');
}; 