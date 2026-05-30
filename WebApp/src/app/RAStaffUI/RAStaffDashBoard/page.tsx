'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/app/hooks/useProtectedRoute';

export default function RAStaffDashboard() {
  const router = useRouter();
  
  // Protect the route - only RA/Staff can access
  useProtectedRoute({ requiredRole: 'staff' });

  useEffect(() => {
    // Auto-redirect to collection on load
    router.replace('/RAStaffUI/RAStaffDashBoard/Features/RAStaffCollection');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse">
        <h1 className="text-4xl font-bold text-[#113F67]">Loading...</h1>
      </div>
    </div>
  );
}
