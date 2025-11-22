import { useState } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminGuard, useAdminSession } from '../components/AdminGuard';

type ViewMode = 'orders' | 'visitors';

interface ShipmentOrder {
  order_id: string;
  order_type: string | null;
  created_at: string | null;
  intended_type: string | null;
  initial_order: boolean;
  status: string;
  recipient_name: string;
  phone_number: string | null;
  order_info: any;
  email: string | null;
  sample_note: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  gift: boolean;
  fulfilled_at: string | null;
}

interface ShipmentOrdersResponse {
  orders: ShipmentOrder[];
  total: number;
}

interface Visitor {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  cart: any;
  street: string | null;
  unit: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  user_id: string | null;
  stripe_cust_id: string | null;
}

interface VisitorsResponse {
  visitors: Visitor[];
  total: number;
}

// Fetch shipment orders with filters
const fetchShipmentOrders = async (filters: any): Promise<ShipmentOrdersResponse> => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.append(key, value as string);
    }
  });

  const token = localStorage.getItem('adminToken');
  const response = await fetch(`/api/admin/shipmentOrders?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch shipment orders');
  }
  return response.json();
};

// Update shipment order fulfillment
const updateShipmentOrder = async ({ order_id, fulfilled_at }: { order_id: string; fulfilled_at: string | null }) => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch('/api/admin/shipmentOrders', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ order_id, fulfilled_at }),
  });

  if (!response.ok) {
    throw new Error('Failed to update shipment order');
  }

  return response.json();
};

// Fetch visitors with filters
const fetchVisitors = async (filters: any): Promise<VisitorsResponse> => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'all') {
      params.append(key, value as string);
    }
  });

  console.log('🔍 Fetching visitors with filters:', filters);
  console.log('🔍 URL params:', params.toString());

  const token = localStorage.getItem('adminToken');
  const response = await fetch(`/api/admin/visitors?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to fetch visitors:', response.status, errorText);
    throw new Error('Failed to fetch visitors');
  }
  const data = await response.json();
  console.log('✅ Visitors data received:', data);
  return data;
};

// Update visitor data
const updateVisitor = async ({ visitor_id, ...updateData }: { visitor_id: string; [key: string]: any }) => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch('/api/admin/visitors', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ visitor_id, ...updateData }),
  });

  if (!response.ok) {
    throw new Error('Failed to update visitor');
  }

  return response.json();
};

// Bulk update shipment orders fulfillment
const bulkUpdateShipmentOrders = async ({ order_ids, fulfilled_at }: { order_ids: string[]; fulfilled_at: string | null }) => {
  const token = localStorage.getItem('adminToken');
  const response = await fetch('/api/admin/shipmentOrders/bulk', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ order_ids, fulfilled_at }),
  });

  if (!response.ok) {
    throw new Error('Failed to bulk update shipment orders');
  }

  return response.json();
};

export default function AdminDashboard() {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  const [darkMode, setDarkMode] = useState(false);
  const { adminSession, logout } = useAdminSession();
  const [condensedView, setCondensedView] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [bulkFulfilledAt, setBulkFulfilledAt] = useState('');
  const [filters, setFilters] = useState({
    order_type: 'all',
    intended_type: 'all',
    initial_order: 'all',
    status: 'all',
    created_at_start: '',
    created_at_end: '',
  });
  const [visitorFilters, setVisitorFilters] = useState({
    has_account: 'all',
    has_email: 'all',
    has_cart: 'all',
    search: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const queryClient = useQueryClient();

  // Fetch shipment orders
  const { data: ordersData, isLoading: ordersLoading, error: ordersError } = useQuery({
    queryKey: ['shipmentOrders', filters, currentPage],
    queryFn: () => fetchShipmentOrders({ ...filters, page: currentPage, limit: itemsPerPage }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: viewMode === 'orders',
  });

  // Fetch visitors
  const { data: visitorsData, isLoading: visitorsLoading, error: visitorsError } = useQuery({
    queryKey: ['visitors', visitorFilters, currentPage],
    queryFn: () => fetchVisitors({ ...visitorFilters, page: currentPage, limit: itemsPerPage }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: viewMode === 'visitors',
  });

  // Update fulfillment mutation
  const updateFulfillmentMutation = useMutation({
    mutationFn: updateShipmentOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentOrders'] });
    },
  });

  // Update visitor mutation
  const updateVisitorMutation = useMutation({
    mutationFn: updateVisitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });

  // Bulk update fulfillment mutation
  const bulkUpdateFulfillmentMutation = useMutation({
    mutationFn: bulkUpdateShipmentOrders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipmentOrders'] });
      setSelectedOrders([]);
      setBulkFulfilledAt('');
    },
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleVisitorFilterChange = (key: string, value: string) => {
    setVisitorFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleFulfillmentUpdate = (orderId: string, fulfilledAt: string | null) => {
    updateFulfillmentMutation.mutate({ order_id: orderId, fulfilled_at: fulfilledAt });
  };

  const handleVisitorUpdate = (visitorId: string, updateData: any) => {
    updateVisitorMutation.mutate({ visitor_id: visitorId, ...updateData });
  };

  const handleOrderSelect = (orderId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (isSelected: boolean) => {
    if (isSelected) {
      const allOrderIds = ordersData?.orders.map(order => order.order_id) || [];
      setSelectedOrders(allOrderIds);
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBulkUpdate = () => {
    if (selectedOrders.length === 0 || !bulkFulfilledAt) return;
    
    const fulfilledAtISO = new Date(bulkFulfilledAt).toISOString();
    bulkUpdateFulfillmentMutation.mutate({ 
      order_ids: selectedOrders, 
      fulfilled_at: fulfilledAtISO 
    });
  };

  const handleBulkClearFulfillment = () => {
    if (selectedOrders.length === 0) return;
    
    bulkUpdateFulfillmentMutation.mutate({ 
      order_ids: selectedOrders, 
      fulfilled_at: null 
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAddress = (order: ShipmentOrder) => {
    const parts = [
      order.address_line1,
      order.address_line2,
      order.city,
      order.state,
      order.postal_code,
      order.country
    ].filter(Boolean);
    return parts.join(', ');
  };

  const currentData = viewMode === 'orders' ? ordersData : visitorsData;
  const isLoading = viewMode === 'orders' ? ordersLoading : visitorsLoading;
  const error = viewMode === 'orders' ? ordersError : visitorsError;
  const totalPages = Math.ceil((currentData?.total || 0) / itemsPerPage);

  // Helper functions for consistent dark mode styling
  const getLabelClasses = () => `block text-sm font-semibold mb-1 transition-colors duration-200 ${
    darkMode ? 'text-gray-200' : 'text-gray-800'
  }`;
  
  const getInputClasses = () => `w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
    darkMode 
      ? 'bg-gray-700 border-gray-500 text-white placeholder-gray-300' 
      : 'bg-white border-gray-400 text-gray-900 placeholder-gray-600'
  }`;
  
  const getCardClasses = () => `rounded-lg shadow-lg p-6 mb-6 transition-colors duration-200 ${
    darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
  }`;

  return (
    <AdminGuard>
      <div className={`min-h-screen transition-colors duration-200 ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className={`text-3xl font-bold transition-colors duration-200 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>Admin Dashboard</h1>
              <p className={`mt-2 transition-colors duration-200 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {viewMode === 'orders' 
                  ? 'Manage shipment orders and fulfillment status'
                  : 'Manage visitor accounts and information'
                }
              </p>
              {/* Navigation Links */}
              <div className="flex space-x-4 mt-4">
                <button
                  onClick={() => router.push('/adminDashboard')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    darkMode 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  Admin Dashboard
                </button>
                <button
                  onClick={() => router.push('/data')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    darkMode 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Data Dashboard
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Admin Info */}
              {adminSession && (
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-medium">{adminSession.name || adminSession.email}</span>
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    adminSession.role === 'super_admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {adminSession.role}
                  </span>
                </div>
              )}
              
              {/* Logout Button */}
              <button
                onClick={logout}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  darkMode 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title="Logout"
              >
                Logout
              </button>
              
              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors duration-200 ${
                  darkMode 
                    ? 'bg-gray-700 text-yellow-400 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </button>
              {/* View Mode Toggle */}
              <div className={`flex rounded-lg p-1 transition-colors duration-200 ${
                darkMode ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => {
                    setViewMode('orders');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'orders'
                      ? darkMode 
                        ? 'bg-gray-600 text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm'
                      : darkMode
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Shipment Orders
                </button>
                <button
                  onClick={() => {
                    setViewMode('visitors');
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'visitors'
                      ? darkMode 
                        ? 'bg-gray-600 text-white shadow-sm'
                        : 'bg-white text-gray-900 shadow-sm'
                      : darkMode
                        ? 'text-gray-300 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Visitors
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Condensed View Toggle and Bulk Actions (for Orders) */}
        {viewMode === 'orders' && (
          <div className={getCardClasses()}>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* View Toggle */}
              <div className="flex items-center space-x-4">
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>View:</span>
                <button
                  onClick={() => setCondensedView(!condensedView)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    condensedView
                      ? darkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                      : darkMode
                        ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {condensedView ? 'Condensed' : 'Detailed'}
                </button>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${
                    darkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    {selectedOrders.length} selected
                  </span>
                </div>
                
                {selectedOrders.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="datetime-local"
                      value={bulkFulfilledAt}
                      onChange={(e) => setBulkFulfilledAt(e.target.value)}
                      className={`border rounded px-2 py-1 text-sm ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                    <button
                      onClick={() => {
                        const now = new Date();
                        // Format to local datetime-local format
                        const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
                          .toISOString()
                          .slice(0, 16);
                        setBulkFulfilledAt(localDateTime);
                      }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        darkMode 
                          ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Now
                    </button>
                    <button
                      onClick={handleBulkUpdate}
                      disabled={!bulkFulfilledAt || bulkUpdateFulfillmentMutation.isPending}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set Fulfilled
                    </button>
                    <button
                      onClick={handleBulkClearFulfillment}
                      disabled={bulkUpdateFulfillmentMutation.isPending}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Clear Fulfilled
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={getCardClasses()}>
          <h2 className={`text-lg font-semibold mb-4 transition-colors duration-200 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>Filters</h2>
          {viewMode === 'orders' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={getLabelClasses()}>Order Type</label>
                <select
                  value={filters.order_type}
                  onChange={(e) => handleFilterChange('order_type', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Types</option>
                  <option value="subscription">Subscription</option>
                  <option value="payment">One-time Payment</option>
                  <option value="null">No Type</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Intended Type</label>
                <select
                  value={filters.intended_type}
                  onChange={(e) => handleFilterChange('intended_type', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Intended Types</option>
                  <option value="subscription">Subscription</option>
                  <option value="one_off">One-off</option>
                  <option value="null">No Intended Type</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Initial Order</label>
                <select
                  value={filters.initial_order}
                  onChange={(e) => handleFilterChange('initial_order', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Orders</option>
                  <option value="true">Initial Orders Only</option>
                  <option value="false">Non-Initial Orders</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Created After</label>
                <input
                  type="date"
                  value={filters.created_at_start}
                  onChange={(e) => handleFilterChange('created_at_start', e.target.value)}
                  className={getInputClasses()}
                />
              </div>

              <div>
                <label className={getLabelClasses()}>Created Before</label>
                <input
                  type="date"
                  value={filters.created_at_end}
                  onChange={(e) => handleFilterChange('created_at_end', e.target.value)}
                  className={getInputClasses()}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={getLabelClasses()}>Has Account</label>
                <select
                  value={visitorFilters.has_account}
                  onChange={(e) => handleVisitorFilterChange('has_account', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Visitors</option>
                  <option value="true">With Account</option>
                  <option value="false">Without Account</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Has Email</label>
                <select
                  value={visitorFilters.has_email}
                  onChange={(e) => handleVisitorFilterChange('has_email', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Visitors</option>
                  <option value="true">With Email</option>
                  <option value="false">Without Email</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Has Cart</label>
                <select
                  value={visitorFilters.has_cart}
                  onChange={(e) => handleVisitorFilterChange('has_cart', e.target.value)}
                  className={getInputClasses()}
                >
                  <option value="all">All Visitors</option>
                  <option value="true">With Cart Items</option>
                  <option value="false">Empty Cart</option>
                </select>
              </div>

              <div>
                <label className={getLabelClasses()}>Search</label>
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={visitorFilters.search}
                  onChange={(e) => handleVisitorFilterChange('search', e.target.value)}
                  className={getInputClasses()}
                />
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className={getCardClasses()}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-lg font-semibold transition-colors duration-200 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {viewMode === 'orders' ? 'Shipment Orders' : 'Visitors'}
              </h2>
              <p className={`text-sm transition-colors duration-200 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {isLoading ? 'Loading...' : `${currentData?.total || 0} total ${viewMode === 'orders' ? 'orders' : 'visitors'}`}
              </p>
            </div>
            {error && (
              <div className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                Error loading {viewMode}: {error.message}
              </div>
            )}
          </div>
        </div>

        {/* Data Table */}
        {isLoading ? (
          <div className={getCardClasses()}>
            <div className={`text-center transition-colors duration-200 ${
              darkMode ? 'text-gray-300' : 'text-gray-500'
            }`}>Loading {viewMode}...</div>
          </div>
        ) : viewMode === 'orders' ? (
          <div className={`rounded-lg shadow-lg overflow-hidden transition-colors duration-200 ${
            darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
          }`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.length === ordersData?.orders.length && ordersData?.orders.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded"
                      />
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      {condensedView ? 'Order' : 'Order Details'}
                    </th>
                    {!condensedView && (
                      <>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          darkMode ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          Customer Info
                        </th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                          darkMode ? 'text-gray-200' : 'text-gray-600'
                        }`}>
                          Address
                        </th>
                      </>
                    )}
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      Status & Fulfillment
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors duration-200 ${
                  darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
                }`}>
                  {ordersData?.orders.map((order) => (
                    <tr key={order.order_id} className={`transition-colors duration-200 ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.order_id)}
                          onChange={(e) => handleOrderSelect(order.order_id, e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className={`px-6 ${condensedView ? 'py-2' : 'py-4'}`}>
                        <div className="text-sm">
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            ID: {condensedView ? order.order_id.substring(0, 8) + '...' : order.order_id}
                          </div>
                          {condensedView ? (
                            <>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                {order.recipient_name} • {order.email || 'No email'}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                {formatDate(order.created_at)} • {order.status}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Created: {formatDate(order.created_at)}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Type: {order.order_type || 'N/A'}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Intended: {order.intended_type || 'N/A'}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Initial: {order.initial_order ? 'Yes' : 'No'}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                Gift: {order.gift ? 'Yes' : 'No'}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                      {!condensedView && (
                        <>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                {order.recipient_name}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                {order.email || 'No email'}
                              </div>
                              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                                {order.phone_number || 'No phone'}
                              </div>
                              {order.sample_note && (
                                <div className={`mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <span className="font-medium">Note:</span> {order.sample_note}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {formatAddress(order)}
                            </div>
                          </td>
                        </>
                      )}
                      <td className={`px-6 ${condensedView ? 'py-2' : 'py-4'}`}>
                        <div className="text-sm">
                          <div className="mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              order.status === 'paid' ? 'bg-green-100 text-green-800' :
                              order.status === 'fulfilled' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          {!condensedView && (
                            <>
                              <div className="mb-2">
                                <label className={`block text-xs font-medium mb-1 ${
                                  darkMode ? 'text-gray-200' : 'text-gray-700'
                                }`}>
                                  Fulfilled At
                                </label>
                                <input
                                  type="datetime-local"
                                  value={order.fulfilled_at ? order.fulfilled_at.slice(0, 16) : ''}
                                  onChange={(e) => {
                                    const value = e.target.value ? new Date(e.target.value).toISOString() : null;
                                    handleFulfillmentUpdate(order.order_id, value);
                                  }}
                                  className={`w-full border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                    darkMode 
                                      ? 'bg-gray-700 border-gray-600 text-white' 
                                      : 'bg-white border-gray-300 text-gray-900'
                                  }`}
                                />
                              </div>
                              {updateFulfillmentMutation.isPending && (
                                <div className="text-xs text-blue-600">Updating...</div>
                              )}
                            </>
                          )}
                          {condensedView && order.fulfilled_at && (
                            <div className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Fulfilled: {formatDate(order.fulfilled_at)}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className={`rounded-lg shadow-lg overflow-hidden transition-colors duration-200 ${
            darkMode ? 'bg-gray-800 border border-gray-600' : 'bg-white border border-gray-300'
          }`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      Visitor Details
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      Contact Info
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      Address
                    </th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                      darkMode ? 'text-gray-200' : 'text-gray-600'
                    }`}>
                      Cart & Account Status
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y transition-colors duration-200 ${
                  darkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-200'
                }`}>
                  {visitorsData?.visitors.map((visitor) => (
                    <tr key={visitor.id} className={`transition-colors duration-200 ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            ID: {visitor.id.substring(0, 8)}...
                          </div>
                          {visitor.stripe_cust_id && (
                            <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                              Stripe: {visitor.stripe_cust_id.substring(0, 12)}...
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {visitor.name || 'No name'}
                          </div>
                          <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {visitor.email || 'No email'}
                          </div>
                          <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                            {visitor.phone || 'No phone'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {visitor.street || visitor.city || visitor.state ? 
                            [visitor.street, visitor.unit, visitor.city, visitor.state, visitor.postal_code, visitor.country]
                              .filter(Boolean).join(', ') || 'No address'
                            : 'No address'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              visitor.user_id ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {visitor.user_id ? 'Has Account' : 'Guest'}
                            </span>
                          </div>
                          <div className="mb-2">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              visitor.cart && visitor.cart !== null && typeof visitor.cart === 'object' && Object.keys(visitor.cart).length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {visitor.cart && visitor.cart !== null && typeof visitor.cart === 'object' && Object.keys(visitor.cart).length > 0 ? 'Has Cart' : 'Empty Cart'}
                            </span>
                          </div>
                          {updateVisitorMutation.isPending && (
                            <div className="text-xs text-blue-600">Updating...</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={getCardClasses()}>
            <div className="flex items-center justify-between">
              <div className={`text-sm transition-colors duration-200 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'border-gray-600 text-gray-200 bg-gray-700 hover:bg-gray-600' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 border rounded-md text-sm font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    darkMode 
                      ? 'border-gray-600 text-gray-200 bg-gray-700 hover:bg-gray-600' 
                      : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </AdminGuard>
  );
}