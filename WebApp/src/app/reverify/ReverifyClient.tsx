"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ReverifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  useEffect(() => {
    if (!email) {
      router.replace("/Login");
      return;
    }

    window.location.href = `/API/auth/google-reverify?email=${encodeURIComponent(email)}`;
  }, [email, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto mb-4" />
        <p className="text-[#113F67] font-medium">Redirecting you to re-verify your account...</p>
      </div>
    </div>
  );
}
