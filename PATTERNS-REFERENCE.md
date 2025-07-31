# 🎨 Patterns & Conventions Reference

## 📝 Console Logging Standards

### Established Emoji System
```typescript
console.log('🆕 New/Generate operation');       // Something new created
console.log('✅ Success operation');            // Operation completed successfully  
console.log('⚠️ Warning/Fallback');             // Warning or fallback triggered
console.log('📡 API call');                     // Network request initiated
console.log('🛒 Cart operation');               // Cart-related activity
console.log('🔁 State update/transition');      // State change or update
console.log('💾 Storage operation');            // localStorage read/write
console.log('🔄 Sync/merge operation');         // Data synchronization
console.log('🔍 Debug/inspection');             // Debugging info
console.log('📨 Form submission');              // User form submission
console.log('🗄️ Database operation');           // Direct database interaction
console.log('🔐 Authentication/JWT');           // Auth-related operations
```

### Log Format Standards
```typescript
// ✅ Good - Clear, actionable, with context
console.log('🔁 Updating visitor identity:', {
  oldVisitorId: visitorId ? visitorId.substring(0, 4) + '...' : null,
  newVisitorId: newVisitorId ? newVisitorId.substring(0, 4) + '...' : null,
  newJwt: '***' + newJwt.slice(-8)  // Show partial JWT for debugging
});

// ✅ Good - Sequential operations with status
console.log('📡 Sending visitor_id to backend for registration:', currentVisitorId ? currentVisitorId.substring(0, 4) + '...' : null);
// ... operation happens ...
console.log('✅ Visitor registered — JWT received');

// ❌ Avoid - Too generic
console.log('updating visitor');

// ❌ Avoid - No context
console.log('error', error);
```

---

## 🏛️ API Patterns

### Response Structure Standard
```typescript
// Success responses
interface SuccessResponse {
  success?: boolean;          // Optional success flag
  [key: string]: any;         // Actual data
}

// Error responses  
interface ErrorResponse {
  error: string;              // Human-readable error message
}

// Example: /api/visitor/identify
interface IdentifyResponse {
  success: boolean;
  visitor_id: string;
  jwt: string;
  merged?: boolean;           // Optional flags
  visitor?: VisitorData;      // Optional nested data
}
```

### JWT Handling Pattern
```typescript
// ✅ Always use Authorization header
headers: {
  'Authorization': `Bearer ${jwt}`,
  'Content-Type': 'application/json',
}

// ✅ Consistent JWT validation
const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET);
if (decoded.visitor_id !== expectedVisitorId) {
  return res.status(401).json({ error: 'Invalid token' });
}
```

### Error Handling Pattern
```typescript
// ✅ Graceful degradation
try {
  const response = await fetch('/api/visitor/validate', {
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
  
  if (response.ok) {
    // Success path
  } else {
    // Graceful failure - clear and restart
    console.log('⚠️ Invalid JWT — clearing localStorage, restarting auth');
    localStorage.removeItem('visitor_id');
    localStorage.removeItem('visitor_jwt');
    // App continues working
  }
} catch (error) {
  console.error('Error validating visitor:', error);
  // On network error, proceed with existing state (offline capability)
}
```

---

## 🏪 State Management Patterns

### Context Provider Pattern
```typescript
// ✅ Established pattern for visitor context
interface VisitorContextType {
  // State
  visitorId: string | null;
  jwt: string | null;
  isReady: boolean;
  
  // Actions
  updateVisitorIdentity: (id: string, jwt: string, data: VisitorData) => void;
  syncCartToDatabase: (cart: object, jwt: string) => Promise<void>;
}

// ✅ Hook pattern with error boundaries
export const useVisitor = () => {
  const context = useContext(VisitorContext);
  if (context === undefined) {
    throw new Error('useVisitor must be used within a VisitorProvider');
  }
  return context;
};
```

### TanStack Store Pattern
```typescript
// ✅ Store definition
const cartStore = new Store({
  items: initialItems,
});

// ✅ Action functions outside store
const addItem = (item: CartItem) => {
  cartStore.setState((state) => ({
    items: [...state.items, item]
  }));
};

// ✅ Hook that combines state + actions
export const useCartStore = <T>(selector: (state: CartState) => T) => {
  const storeState = useStore(cartStore);
  const fullState: CartState = {
    items: storeState.items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
  return selector(fullState);
};
```

---

## 🔄 Data Flow Patterns

### Cart Synchronization Pattern
```typescript
// ✅ Always flush before identity operations
const handleContactInfoSubmit = async (contactInfo) => {
  // 1. Flush current state to database
  await syncCartToDatabase(items, jwt);
  
  // 2. Perform identity operation
  const response = await fetch('/api/visitor/identify', { ... });
  
  // 3. Update local state with result
  updateVisitorIdentity(data.visitor_id, data.jwt, data.visitor);
};
```

### Identity Resolution Pattern
```typescript
// ✅ Merge logic with array deduplication
const mergedCart = [...existingCart, ...currentCart].reduce<CartItem[]>((acc, item) => {
  const found = acc.find(i => i.priceId === item.priceId);
  if (found) {
    found.quantity += item.quantity;  // Merge quantities
  } else {
    acc.push({ ...item });           // Add new item
  }
  return acc;
}, []);
```

### Hydration Pattern
```typescript
// ✅ Clear-then-populate pattern
const hydrateCartFromDatabase = (cartData: any[]) => {
  if (!Array.isArray(cartData) || cartData.length === 0) {
    console.log('🛒 No cart data to hydrate');
    return;
  }

  // Clear existing to avoid duplicates
  cartActions.clearCart();
  
  // Populate with database data
  cartData.forEach((item: any) => {
    if (item.priceId && item.quantity) {
      cartActions.addItem({
        productId: item.productId || '',
        priceId: item.priceId,
        quantity: item.quantity
      });
    }
  });
};
```

---

## 🎨 UI/UX Patterns

### Loading State Pattern
```typescript
// ✅ Ready state pattern for visitor context
const { visitorId, jwt, isReady } = useVisitor();

// Don't render sensitive UI until visitor is ready
if (!isReady) {
  return <LoadingSpinner />;
}

// Safe to use visitor data
return <App visitorId={visitorId} />;
```

### Conditional Trigger Pattern
```typescript
// ✅ Contact info popup trigger logic
useEffect(() => {
  if (cartHovered && visitorReady && visitorData) {
    const hasContactInfo = visitorData.email || visitorData.phone || visitorData.name;
    if (!hasContactInfo) {
      console.log('🛒 User triggered contact info collection');
      setShowContactPopup(true);
    }
  }
}, [cartHovered, visitorReady, visitorData]);
```

---

## 🔒 Security Patterns

### JWT Security
```typescript
// ✅ Never log full JWTs
console.log('JWT received:', '***' + jwt.slice(-8));

// ✅ Validate JWT structure before use
if (!jwt || !jwt.startsWith('eyJ')) {
  console.log('⚠️ Invalid JWT format');
  return;
}

// ✅ Handle expired tokens gracefully
if (jwtError.name === 'TokenExpiredError') {
  console.log('⚠️ JWT expired — clearing localStorage, restarting auth');
  localStorage.clear();
  window.location.reload();
}
```

### Input Validation
```typescript
// ✅ Validate required fields
if (!visitor_id || !email) {
  return res.status(400).json({ error: 'visitor_id and email are required' });
}

// ✅ Sanitize inputs
email: email.trim().toLowerCase(),
phone: phone?.trim() || null,
name: name?.trim() || null,
```

---

## 📦 Import/Export Patterns

### File Structure Convention
```typescript
// ✅ API files
import { supabaseServiceRole } from '../../../lib/supabaseClient';  // Use shared client
import type { NextApiRequest, NextApiResponse } from 'next';

// ✅ Component files  
import React, { useState, useEffect } from 'react';
import { useVisitor } from '../lib/contexts/VisitorContext';

// ✅ No unused imports - remove immediately
// ❌ import { useEffect } from 'react';  // if useEffect not used
```

### Export Patterns
```typescript
// ✅ Named exports for utilities
export const hydrateCartFromDatabase = (cartData: any[]) => { ... };
export const useVisitor = () => { ... };

// ✅ Default exports for components/pages  
export default function ContactInfoPopup() { ... }
export default async function handler(req: NextApiRequest, res: NextApiResponse) { ... }
```

---

## 🚀 Performance Patterns

### Debouncing Pattern
```typescript
// ✅ Debounce cart sync to avoid rapid API calls
useEffect(() => {
  if (cartSyncTimeoutRef.current) {
    clearTimeout(cartSyncTimeoutRef.current);
  }
  
  cartSyncTimeoutRef.current = setTimeout(() => {
    syncCartToDatabase(cartItems, jwt);
  }, 1000);  // 1 second debounce
  
  return () => {
    if (cartSyncTimeoutRef.current) {
      clearTimeout(cartSyncTimeoutRef.current);
    }
  };
}, [cartItems, jwt]);
```

### Memoization Pattern
```typescript
// ✅ Memoize expensive computations
const cartTotal = useMemo(() => {
  return items.reduce((sum, item) => {
    const price = getPrice(item.priceId);
    return sum + (price * item.quantity);
  }, 0);
}, [items]);
```

---

## 🔗 Integration Patterns

### Stripe Integration Preparation
```typescript
// ✅ Include visitor_id in Stripe metadata
const session = await stripe.checkout.sessions.create({
  metadata: {
    visitor_id: visitorId,
    // ... other metadata
  },
  // ... session config
});
```

### TanStack Query Pattern
```typescript
// ✅ Query pattern to follow
const { data: visitorData, isLoading } = useQuery({
  queryKey: ['visitor', visitorId],
  queryFn: () => fetchVisitorData(visitorId),
  enabled: !!visitorId && !!jwt,  // Only run when authenticated
  staleTime: 5 * 60 * 1000,       // 5 minutes
  retry: (failureCount, error) => {
    // Don't retry on auth errors
    if (error.status === 401) return false;
    return failureCount < 2;
  }
});
```

---

**🎯 Remember**: These patterns are validated across Modules 1‑8 and the checkout modules A‑D. Follow them consistently and extend them rather than creating new patterns. The TanStack store and query approach is the standard going forward.**
