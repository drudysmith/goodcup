import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/router';

interface AdminSession {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AdminContextType {
  adminSession: AdminSession | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const adminData = localStorage.getItem('adminSession');

    if (token && adminData) {
      const validateSession = async () => {
        try {
          const session = JSON.parse(adminData) as AdminSession;
          const response = await fetch('/api/admin/auth/verify', {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!response.ok) throw new Error('Admin session expired');
          setAdminSession(session);
        } catch (error) {
          console.info('Admin session is no longer valid:', error);
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminSession');
        } finally {
          setIsLoading(false);
        }
      };

      validateSession();
      return;
    }

    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.token && data.admin) {
        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('adminSession', JSON.stringify(data.admin));
        setAdminSession(data.admin);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminSession');
    setAdminSession(null);
    router.push('/admin');
  };

  return (
    <AdminContext.Provider value={{ adminSession, login, logout, isLoading }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminSession() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminSession must be used within AdminProvider');
  }
  return context;
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { adminSession, isLoading } = useAdminSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !adminSession) {
      router.push('/admin');
    }
  }, [adminSession, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!adminSession) {
    return null; // Router will redirect to login
  }

  return <>{children}</>;
}
