"use client";

import { useState } from "react";
import Image from "next/image";
import SearchableSelect from "@/app/components/SearchableSelect";
import { departments, getProgramsForDepartment } from "@/app/components/departmentPrograms";

interface FinalizeSignupProps {
  token: string;
  firstName: string;
  lastName: string;
  photo: string;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  student: "Student",
  faculty: "Faculty",
  staff: "Research Assistant",
};

export default function FinalizeSignup({
  token,
  firstName,
  lastName,
  photo,
  email,
  role,
}: FinalizeSignupProps) {
  const [formData, setFormData] = useState({
    department: "",
    course: "",
    password: "",
    retypePassword: "",
  });

  const [message, setMessage] = useState<{ text: string; type: "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(false);

  const hasMinLength = formData.password.length >= 8;
  const hasLowercase = /[a-z]/.test(formData.password);
  const hasUppercase = /[A-Z]/.test(formData.password);
  const hasNumber = /\d/.test(formData.password);
  const availablePrograms = getProgramsForDepartment(formData.department);
  const normalizedRole = String(role || "student").toLowerCase();
  const roleDisplay = roleLabels[normalizedRole] || normalizedRole;

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password !== formData.retypePassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    if (formData.password.length < 8) {
      setMessage({
        text: "Password must be at least 8 characters with at least one uppercase, one lowercase, and one number.",
        type: "error",
      });
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      setMessage({
        text: "Password must include at least one uppercase, one lowercase, and one number.",
        type: "error",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/API/auth/finalize-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          email,
          first_name: firstName,
          last_name: lastName,
          profile_photo: photo,
          department: formData.department,
          course: formData.course,
          password: formData.password,
          retypePassword: formData.retypePassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ text: data.message || "Account setup complete!", type: "success" });
        setTimeout(() => {
          window.location.href = "/Login";
        }, 2000);
      } else {
        setMessage({ text: data.message || "Something went wrong.", type: "error" });
      }
    } catch (error) {
      console.error("Finalize signup error:", error);
      setMessage({ text: "Something went wrong. Please try again.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white">
      {/* Left Side Image */}
      <div className="relative hidden md:block">
        <Image
          src="/UI/img/BioOffice.webp"
          alt="USC Biology Department Office"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/70" />
      </div>

      {/* Right Side Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-8">
          <div className="pb-6 text-left">
            <Image src="/UI/img/logo-biocella.png" alt="Logo" width={120} height={40} />
            <h2 className="text-2xl font-bold text-[#113F67] mt-4">Complete Your Signup</h2>
            <p className="text-sm text-gray-600">Your identity has been verified via Google. Fill in the remaining details below.</p>
          </div>

          {/* Profile photo from Google */}
          {photo && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <img
                src={photo}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-[#113F67]"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="font-semibold text-[#113F67]">{firstName} {lastName}</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>
          )}

          {message && (
            <div
              className={`mb-4 text-center text-sm p-3 rounded ${
                message.type === "error"
                  ? "text-red-600 bg-red-50"
                  : "text-green-600 bg-green-50"
              }`}
            >
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Read-only fields from Google */}
            <div>
              <label className="text-sm text-gray-500">First Name</label>
              <input
                type="text"
                value={firstName}
                readOnly
                className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Last Name</label>
              <input
                type="text"
                value={lastName}
                readOnly
                className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <input
                type="email"
                value={email}
                readOnly
                className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <input
                type="text"
                value={roleDisplay}
                readOnly
                className="w-full border rounded-md px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Editable fields */}
            <div>
              <SearchableSelect
                label="Department"
                value={formData.department}
                options={departments}
                placeholder="Search department"
                onChange={(value) => {
                  handleChange("department", value);
                  handleChange("course", "");
                }}
              />
            </div>
            <div>
              <SearchableSelect
                label="Program"
                value={formData.course}
                options={availablePrograms}
                placeholder={formData.department ? "Search program" : "Select department first"}
                disabled={!formData.department}
                autoFocus={!!formData.department}
                onChange={(value) => handleChange("course", value)}
              />
            </div>

            <div className="col-span-full rounded-md border border-[#113F67]/20 bg-[#113F67]/5 px-3 py-2 text-sm">
              <p className="mb-1 text-[#113F67] font-medium">Please create a password with:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li className={hasMinLength ? "text-green-600" : "text-red-600"}>At least 8 characters long</li>
                <li className={hasLowercase ? "text-green-600" : "text-red-600"}>Has a lowercase letter</li>
                <li className={hasUppercase ? "text-green-600" : "text-red-600"}>Has an uppercase letter</li>
                <li className={hasNumber ? "text-green-600" : "text-red-600"}>Has a number</li>
              </ul>
            </div>

            {/* Password Fields */}
            <div>
              <label className="text-sm text-gray-700">Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full border border-[#113F67] rounded-md px-3 py-2 text-[#113F67] focus:ring-2 focus:ring-[#113F67] focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-700">Retype Password</label>
              <input
                type="password"
                placeholder="Retype password"
                value={formData.retypePassword}
                onChange={(e) => handleChange("retypePassword", e.target.value)}
                className="w-full border border-[#113F67] rounded-md px-3 py-2 text-[#113F67] focus:ring-2 focus:ring-[#113F67] focus:border-transparent"
                required
              />
            </div>

            {/* Agreement and Submit */}
            <div className="col-span-full pt-2">
              <label className="flex items-start space-x-2 text-sm text-gray-600">
                <input type="checkbox" className="mt-1" required />
                <span>By signing up, you agree to our Terms of Service and responsible account use.</span>
              </label>
            </div>

            <div className="col-span-full flex justify-center pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#113F67] hover:bg-[#0a2a4a] text-white font-medium py-2 px-6 rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? "Saving..." : "Complete Registration"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
