"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUserRole, isAuthenticated } from "@/app/utils/authUtil";

const normalizeRole = (role: string | null) => (role || "").trim().toLowerCase();

export default function ScanBatchRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const batchId = params?.id;

    if (!isAuthenticated()) {
      router.replace("/Login");
      return;
    }

    if (!batchId) {
      router.replace("/");
      return;
    }

    const role = normalizeRole(getUserRole());

    if (role === "admin") {
      router.replace(`/AdminUI/AdminDashBoard/Features/AdminInventory/batch/${batchId}`);
      return;
    }

    if (role === "ra" || role === "staff") {
      router.replace(`/RAStaffUI/RAStaffDashBoard/Features/RAStaffInventory/batch/${batchId}`);
      return;
    }

    router.replace(`/UsersUI/UsersDashBoard/Features/UserInventory/batch/${batchId}`);
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-700">Redirecting to batch details...</p>
    </div>
  );
}
