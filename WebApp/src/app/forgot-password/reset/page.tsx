"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";

interface ResetDetails {
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  course: string;
  profile_photo: string;
}

function ForgotResetContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [details, setDetails] = useState<ResetDetails | null>(null);
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);

  const hasMinLength = password.length >= 8;
  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setStatus("error");
        setErrorMsg("Missing reset token. Please use the link from your email.");
        return;
      }

      try {
        const res = await fetch(`/API/auth/reset-password/details?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          setStatus("error");
          setErrorMsg(data.message || "Invalid or expired reset link.");
        } else {
          setDetails(data);
          setStatus("verified");
        }
      } catch {
        setStatus("error");
        setErrorMsg("Failed to verify reset link. Please try again.");
      }
    };

    load();
  }, [token]);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // When returning via browser back/forward cache, reload to re-validate token state.
      if (event.persisted) {
        window.location.reload();
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== retypePassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      setMessage({
        text: "Password must be at least 8 characters with at least one uppercase, one lowercase, and one number.",
        type: "error",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/API/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password, retypePassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: data.message || "Password reset successful.", type: "success" });
        setTimeout(() => {
          // Replace history entry so browser back does not return to a reusable reset form.
          window.location.replace("/Login");
        }, 1800);
      } else {
        setMessage({ text: data.message || "Failed to reset password.", type: "error" });
      }
    } catch {
      setMessage({ text: "Unexpected error while resetting password.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      <div className="relative hidden md:block">
        <Image src="/UI/img/BioOffice.webp" alt="Laboratory Background" fill className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/70" />
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
          {status === "loading" && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto mb-4" />
              <p className="text-[#113F67] font-medium">Verifying reset link...</p>
            </div>
          )}

          {status === "error" && (
            <div className="text-center">
              <div className="text-red-500 text-5xl mb-4">✕</div>
              <h2 className="text-xl font-bold text-[#113F67] mb-2">Link Expired or Invalid</h2>
              <p className="text-gray-600 mb-6">{errorMsg}</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <a
                  href="/forgot-password"
                  className="inline-block bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-6 rounded transition-colors"
                >
                  Request New Link
                </a>
                <a
                  href="/Login"
                  className="inline-block border border-[#113F67] text-[#113F67] hover:bg-[#113F67]/10 font-medium py-2 px-6 rounded transition-colors"
                >
                  Back to Login
                </a>
              </div>
            </div>
          )}

          {status === "verified" && (
            <>
              <div className="pb-6 text-left">
                <Image src="/UI/img/logo-biocella.png" alt="USC Biology Department Office" width={120} height={40} />
                <h2 className="text-2xl font-bold text-[#113F67] mt-4">Reset Password</h2>
                <p className="text-sm text-gray-600">Account details are loaded from your registration record.</p>
              </div>

              {details?.profile_photo && (
                <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                  <Image
                    src={details.profile_photo}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="rounded-full border-2 border-[#113F67]"
                    referrerPolicy="no-referrer"
                    unoptimized
                  />
                  <div>
                    <p className="font-semibold text-[#113F67]">{details.first_name} {details.last_name}</p>
                    <p className="text-sm text-gray-500">{details.email}</p>
                  </div>
                </div>
              )}

              {message && (
                <div className={`mb-4 text-center text-sm p-3 rounded ${message.type === "error" ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"}`}>
                  {message.text}
                </div>
              )}

              {details && (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">First Name</label>
                    <input type="text" value={details.first_name} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Last Name</label>
                    <input type="text" value={details.last_name} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Email</label>
                    <input type="email" value={details.email} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Department</label>
                    <input type="text" value={details.department} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Program</label>
                    <input type="text" value={details.course} readOnly className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500" />
                  </div>
                  <div className="col-span-full rounded-md border border-[#113F67]/20 bg-[#113F67]/5 px-3 py-2 text-sm">
                    <p className="mb-1 text-[#113F67] font-medium">New password cannot be the same as the old password.</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li className={hasMinLength ? "text-green-600" : "text-red-600"}>At least 8 characters long</li>
                      <li className={hasLowercase ? "text-green-600" : "text-red-600"}>Has a lowercase letter</li>
                      <li className={hasUppercase ? "text-green-600" : "text-red-600"}>Has an uppercase letter</li>
                      <li className={hasNumber ? "text-green-600" : "text-red-600"}>Has a number</li>
                    </ul>
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Password</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-[#113F67] rounded-md px-3 py-2 text-[#113F67] caret-[#113F67] focus:ring-2 focus:ring-[#113F67] focus:border-transparent" required />
                  </div>
                  <div>
                    <label className="text-sm text-gray-700">Retype Password</label>
                    <input type="password" value={retypePassword} onChange={(e) => setRetypePassword(e.target.value)} className="w-full border border-[#113F67] rounded-md px-3 py-2 text-[#113F67] caret-[#113F67] focus:ring-2 focus:ring-[#113F67] focus:border-transparent" required />
                  </div>

                  <div className="col-span-full flex justify-center pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-6 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {loading ? "Saving..." : "Reset Password"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotResetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto mb-4" />
            <p className="text-[#113F67] font-medium">Loading reset page...</p>
          </div>
        </div>
      }
    >
      <ForgotResetContent />
    </Suspense>
  );
}
