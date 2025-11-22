# Data Dashboard Page

## Overview
The `/data` page is a protected admin-only page that displays visitor data from the database. It reuses the existing admin authentication system and provides a clean interface for viewing visitor records.

## Features

### Authentication
- **Protected Route**: Uses the same `AdminGuard` component as the admin dashboard
- **Admin Only**: Requires valid admin credentials to access
- **Session Management**: Integrates with the existing admin authentication system

### Data Display
- **Visitor Records**: Shows visitor information from the `visitors` table
- **Pagination**: Handles large datasets with configurable page size (50 records per page)
- **Statistics Cards**: Displays total visitors, current page, page size, and records shown
- **Responsive Table**: Clean table layout with hover effects

### Navigation
- **Cross-Page Navigation**: Easy switching between Admin Dashboard and Data Dashboard
- **Consistent UI**: Matches the design patterns of the admin dashboard
- **Breadcrumb Style**: Clear indication of current page location

## Technical Implementation

### File Structure
```
pages/
├── data.tsx                    # Main data page component
├── adminDashboard.tsx          # Admin dashboard (updated with navigation)
└── api/admin/
    └── visitors.ts             # API endpoint for visitor data
```

### Key Components
- **AdminGuard**: Route protection wrapper
- **useAdminSession**: Hook for admin session management
- **useQuery**: TanStack Query for data fetching and caching
- **Responsive Design**: Tailwind CSS for styling

### Data Flow
1. User navigates to `/data`
2. `AdminGuard` checks authentication
3. If authenticated, page loads and fetches visitor data
4. Data is displayed in a paginated table format
5. Navigation links allow switching between admin pages

## Usage

### Accessing the Page
1. Login to admin system at `/admin/login`
2. Navigate to `/data` or use the navigation links
3. View visitor data with pagination controls

### Navigation
- **Admin Dashboard**: Switch to the main admin dashboard
- **Data Dashboard**: Current page (highlighted)
- **Logout**: End admin session

## Security
- **Route Protection**: Unauthenticated users are redirected to login
- **API Protection**: All admin endpoints require valid JWT tokens
- **Session Validation**: Server-side verification of admin credentials

## Dependencies
- **TanStack Query**: For data fetching and state management
- **AdminGuard**: For route protection and authentication
- **Tailwind CSS**: For styling and responsive design
- **Next.js**: For routing and API endpoints

## Future Enhancements
- **Filtering**: Add search and filter capabilities
- **Export**: CSV/Excel export functionality
- **Real-time Updates**: WebSocket integration for live data
- **Advanced Analytics**: Charts and data visualization
- **Bulk Operations**: Mass update capabilities for visitor records
