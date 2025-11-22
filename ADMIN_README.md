# Admin Authentication System

This document describes the admin authentication system for the GoodCup admin dashboard.

## Overview

The admin system provides secure access to administrative functions including:
- Viewing and managing shipment orders
- Viewing and managing visitor accounts
- Bulk operations on orders
- Secure authentication with JWT tokens

## Architecture

### Components

1. **AdminGuard** (`components/AdminGuard.tsx`) - React context provider and route protection
2. **Admin Login Page** (`pages/admin/login.tsx`) - Authentication interface
3. **Admin Dashboard** (`pages/adminDashboard.tsx`) - Main admin interface
4. **Authentication APIs** (`pages/api/admin/auth/`) - Backend authentication endpoints
5. **Protected Admin APIs** - All admin endpoints require valid JWT tokens

### Authentication Flow

1. Admin navigates to `/admin/login`
2. Enters email/password credentials
3. System verifies against `admins` table using bcrypt
4. JWT token generated and stored in localStorage
5. Admin redirected to `/adminDashboard`
6. All subsequent API calls include JWT token in Authorization header
7. Server validates JWT token before processing requests

## Database Schema

The system uses the existing `admins` table:

```sql
CREATE TABLE public.admins (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  name text NULL,
  role text NULL DEFAULT 'admin'::text,
  is_active boolean NULL DEFAULT true,
  last_login_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_email_key UNIQUE (email),
  CONSTRAINT admins_role_check CHECK (
    (role = ANY (ARRAY['admin'::text, 'super_admin'::text]))
  )
);
```

## Setup Instructions

### 1. Create Admin Users

Use the provided script to generate hashed passwords:

```bash
node scripts/createAdmin.js <email> <password> [name] [role]
```

Example:
```bash
node scripts/createAdmin.js admin@goodcup.com mypassword "Admin User" admin
```

### 2. Insert Admin User

Copy the generated SQL and run it in your database:

```sql
INSERT INTO admins (email, password_hash, name, role, is_active) VALUES (
  'admin@goodcup.com',
  '$2b$12$9qJKwljs4wx6xdaW9bbyOOzgQd5EsG43mp8oAa0Fvl1I760Ot68Te',
  'Admin User',
  'admin',
  true
);
```

### 3. Environment Variables

Ensure these environment variables are set:

```bash
# Required for JWT token generation
ADMIN_JWT_SECRET=your-secret-key-here

# Or use existing Supabase JWT secret
SUPABASE_JWT_SECRET=your-supabase-secret
```

## Usage

### Accessing the Admin Dashboard

1. Navigate to `/admin/login`
2. Enter admin credentials
3. Upon successful login, you'll be redirected to `/adminDashboard`

### Features

- **Shipment Orders Management**: View, filter, and update order fulfillment status
- **Visitors Management**: View and manage visitor account information
- **Bulk Operations**: Update multiple orders simultaneously
- **Dark Mode**: Toggle between light and dark themes
- **Condensed View**: Switch between detailed and compact order displays

### Security Features

- JWT-based authentication with 24-hour expiration
- bcrypt password hashing (12 salt rounds)
- Protected API endpoints requiring valid admin tokens
- Role-based access control (admin/super_admin)
- Automatic logout on token expiration

## API Endpoints

### Authentication
- `POST /api/admin/auth/login` - Admin login
- `POST /api/admin/auth/logout` - Admin logout
- `GET /api/admin/auth/verify` - Token verification (internal)

### Shipment Orders
- `GET /api/admin/shipmentOrders` - Fetch orders with filters
- `PATCH /api/admin/shipmentOrders` - Update individual order
- `PATCH /api/admin/shipmentOrders/bulk` - Bulk update orders

### Visitors
- `GET /api/admin/visitors` - Fetch visitors with filters
- `PATCH /api/admin/visitors` - Update visitor information

All endpoints require valid admin JWT token in Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Troubleshooting

### Common Issues

1. **"Admin access required" error**
   - Check that JWT token is valid and not expired
   - Verify token is included in Authorization header
   - Ensure admin account exists and is active

2. **Login fails**
   - Verify email exists in admins table
   - Check password_hash was generated with bcrypt
   - Ensure admin account is_active = true

3. **JWT verification fails**
   - Verify ADMIN_JWT_SECRET environment variable is set
   - Check token hasn't expired (24-hour limit)
   - Ensure token type is 'admin'

### Debug Mode

The system includes extensive console logging for debugging:
- API calls and responses
- Authentication flow
- Error details

Check browser console and server logs for detailed information.

## Security Considerations

- Use strong passwords for admin accounts
- Regularly rotate JWT secrets
- Monitor admin login attempts
- Consider implementing rate limiting
- Use HTTPS in production
- Regularly audit admin access logs

## Future Enhancements

- Two-factor authentication (2FA)
- Session management and token refresh
- Admin activity logging
- IP-based access restrictions
- Password reset functionality
- Admin user management interface
