"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import FinalizeSignup from "./FinalizeSignup";

function FinalizeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const verified = searchParams.get("verified");
  const error = searchParams.get("error");
  const firstName = searchParams.get("first_name") || "";
  const lastName = searchParams.get("last_name") || "";
  const photo = searchParams.get("photo") || "";
  const email = searchParams.get("email") || "";
  const role = searchParams.get("role") || "student";

  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // If there's an error from OAuth callback
    if (error) {
      setStatus("error");
      setErrorMsg(error);
      return;
    }

    // If already verified via Google OAuth, show the form
    if (verified === "true" && token && email) {
      setStatus("verified");
      return;
    }

    // First visit from email link: verify token then redirect to Google OAuth
    if (token && !verified) {
      (async () => {
        try {
          const res = await fetch(`/API/auth/verify-token?token=${token}`);
          const data = await res.json();

          if (!res.ok) {
            setStatus("error");
            setErrorMsg(data.message || "This registration link has expired or is invalid.");
            return;
          }

          // Token is valid — redirect to Google OAuth
          window.location.href = `/API/auth/google?token=${token}`;
        } catch {
          setStatus("error");
          setErrorMsg("Failed to verify your registration link. Please request a new one.");
        }
      })();
      return;
    }

    // No token at all
    setStatus("error");
    setErrorMsg("No registration token provided. Please use the link from your email.");
  }, [token, verified, error, email]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto mb-4" />
          <p className="text-[#113F67] font-medium">Verifying your account...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
        <div className="relative hidden md:block">
          <Image src="/UI/img/BioOffice.webp" alt="Laboratory Background" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/70" />
        </div>

        <div className="flex items-center justify-center p-6">
          <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">✕</div>
              <h2 className="text-xl font-bold text-[#113F67] mb-2">Link Expired or Invalid</h2>
              <p className="text-gray-600 mb-6">{errorMsg || "This token has expired. Please request a new one."}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a
                  href="/signup"
                  className="inline-block bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-6 rounded transition-colors"
                >
                  Back to Signup
                </a>
                <a
                  href="/Login"
                  className="inline-block border border-[#113F67] text-[#113F67] hover:bg-[#113F67]/10 font-medium py-2 px-6 rounded transition-colors"
                >
                  Back to Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FinalizeSignup
      token={token!}
      firstName={firstName}
      lastName={lastName}
      photo={photo}
      email={email}
      role={role}
    />
  );
}

export default function FinalizeSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67]" />
        </div>
      }
    >
      <FinalizeContent />
    </Suspense>
  );
}
