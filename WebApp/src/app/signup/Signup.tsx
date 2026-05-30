"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
// import { useRouter } from "next/router";
import { useRouter } from "next/navigation";

export default function SignupForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    console.log("Signup attempt:", formData);

    try {
      const response = await fetch("/API/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message || 'Registration successful! Check your email for the finalize setup link.', type: 'success' });
      } else {
        setMessage({ text: data.message || 'Registration failed. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Network or unexpected error during signup:', error);
      setMessage({ text: 'An unexpected error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      {/* Left: Form */}
      <div className="bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-1 pb-6">
            <h2 className="text-2xl font-bold text-center text-[#113F67]">
              Biocella
            </h2>
            <p className="text-center text-gray-600">
              Register your USC email to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#113F67]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  placeholder="usc.edu.ph"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="text-[#113F67] w-full pl-10 pr-3 py-2 border border-[#113F67] rounded-md focus:ring-2 focus:ring-[#113F67] focus:border-transparent transition-all duration-200 text-left placeholder:text-right"
                  required
                />
              </div>
            </div>

            {/* Message Display Area */}
            {message && (
              <p className={`text-center text-sm ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                {message.text}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#113F67] text-white py-2 px-4 rounded-md hover:bg-[#0a2a4a] transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </form>

          {/* Login Redirect */}
          <div className="text-center pt-4 border-t border-gray-200">
            <button
              type="button"
              className="text-sm text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors cursor-pointer hover:underline"
              onClick={() => router.push('/')}
            >
              Back to Homepage
            </button>
            <p className="text-sm text-gray-400 mt-2">or</p>
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/Login"
                className="text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors"
                onClick={() => console.log("Redirect to login")}
              >
                Log in
              </Link>
            </p>

          </div>
        </div>
      </div>
      {/* Right: Image Section */}
      <div className="relative hidden md:block">
        <Image
    src="/UI/img/BioOffice.webp"
          alt="USC Biology Department Office"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/10" />
      </div>
    </div>
  );
}
