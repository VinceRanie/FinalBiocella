"use client";

import { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getUserRole, isAuthenticated } from "@/app/utils/authUtil";

const normalizeRole = (role: string | null) => (role || "").trim().toLowerCase();

export default function ScanSpecimenRedirectClient() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const specimenId = params?.id;

    if (!isAuthenticated()) {
      router.replace("/Login");
      return;
    }

    if (!specimenId) {
      router.replace("/");
      return;
    }

    const role = normalizeRole(getUserRole());
    const token = searchParams.get("token");
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";

    if (role === "admin") {
      router.replace(`/AdminUI/AdminDashBoard/Features/AdminCollection/specimen/${specimenId}${tokenQuery}`);
      return;
    }

    if (role === "ra" || role === "staff") {
      router.replace(`/RAStaffUI/RAStaffDashBoard/Features/RAStaffCollection/specimen/${specimenId}${tokenQuery}`);
      return;
    }

    router.replace(`/UsersUI/UsersDashBoard/Features/UserCollection/specimen/${specimenId}${tokenQuery}`);
  }, [params, router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-700">Redirecting to specimen details...</p>
    </div>
  );
}
