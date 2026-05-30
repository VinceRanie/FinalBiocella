// Hook for checking authentication and redirecting unauthenticated users
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, getUserRole } from '@/app/utils/authUtil';

interface ProtectedRouteOptions {
  requiredRole?: 'admin' | 'ra' | 'student' | 'staff';
  redirectTo?: string;
}

/**
 * Hook to protect routes that require authentication
 * @param options - Configuration options for route protection
 */
export const useProtectedRoute = (options?: ProtectedRouteOptions) => {
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    const userRole = getUserRole();

    // Check if user is authenticated
    if (!token) {
      router.push(options?.redirectTo || '/Login');
      return;
    }

    // Check if route requires specific role
    if (options?.requiredRole && userRole !== options.requiredRole) {
      router.push('/'); // Redirect to home or unauthorized page
      return;
    }
  }, [router, options?.requiredRole, options?.redirectTo]);
};

/**
 * Hook to check if user is authenticated
 */
export const useAuth = () => {
  const token = getAuthToken();
  const userRole = getUserRole();
  const isAuthenticated = token !== null;

  return {
    isAuthenticated,
    token,
    userRole,
  };
};
