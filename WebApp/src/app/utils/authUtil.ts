// Authentication utilities for managing JWT tokens and user data

export interface AuthUser {
  userId: number;
  email: string;
  role: 'admin' | 'student' | 'faculty' | 'staff' | 'ra'; // 'staff' is DB value, 'ra' kept for backward compatibility
}

export interface AuthResponse {
  message: string;
  token: string;
  role: string;
  userId: number;
  email: string;
  statusCode: number;
}

/**
 * Store authentication token in localStorage
 */
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
  }
};

/**
 * Get authentication token from localStorage
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('authToken');
  }
  return null;
};

/**
 * Store user data in localStorage
 */
export const setUserData = (user: AuthUser): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('userData', JSON.stringify(user));
  }
};

/**
 * Get user data from localStorage
 */
export const getUserData = (): AuthUser | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
};

/**
 * Get user role from localStorage
 */
export const getUserRole = (): string | null => {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role;
    }
  }
  return null;
};

/**
 * Clear authentication data from localStorage
 */
export const clearAuthData = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('userEmail');
    const isHttps = window.location.protocol === 'https:';
    const secureFlag = isHttps ? '; Secure' : '';
    document.cookie = `auth_token=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return getAuthToken() !== null;
};

/**
 * Get authorization header for API requests
 */
export const getAuthHeader = (): { Authorization: string } | {} => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Redirect based on user role
 */
export const redirectByRole = (router: any, role: string | null = null): void => {
  const userRole = role || getUserRole();
  const normalizedRole = (userRole || '').toString().trim().toLowerCase();
  
  if (normalizedRole === 'admin') {
    router.push('/AdminUI/AdminDashBoard');
  } else if (normalizedRole === 'ra' || normalizedRole === 'staff') {
    router.push('/RAStaffUI/RAStaffDashBoard');
  } else {
    // Default student/faculty path goes directly to collections.
    router.push('/UsersUI/UsersDashBoard/Features/UserCollection');
  }
};

/**
 * Make authenticated API request
 */
export const authenticatedFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  return fetch(url, {
    ...options,
    headers,
  });
};
