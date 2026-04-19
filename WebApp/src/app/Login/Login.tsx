"use client";

import { useState } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { setAuthToken, setUserData, redirectByRole } from '@/app/utils/authUtil';

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); 
    setMessage(null); 

    try {
      const response = await fetch("/biocella/API/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: formData.email, password: formData.password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (data?.token && data?.userId && data?.email && data?.role) {
          setAuthToken(data.token);
          setUserData({
            userId: data.userId,
            email: data.email,
            role: data.role,
          });
        }

        setMessage({ text: data.message || 'Login successful!', type: 'success' });

        // Redirect based on role
        redirectByRole(router, data.role);
      } else {
        setMessage({ text: data.message || 'Invalid credentials. Please try again.', type: 'error' });
      }
    } catch (error) {
      console.error('Network or unexpected error during login:', error);
      setMessage({ text: 'An unexpected error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 ease-in-out duration-300">
      {/* Left: Image Section */}
      <div className="relative hidden md:block">
        <Image
          src="/UI/img/Biobuilding.webp"
          alt="USC Biology Building (Arnoldus Science Building)"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/10" />
      </div>

      {/* Right: Form Section */}
      <div className="bg-gradient-to-br from-background to-secondary/30 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <div className="space-y-1 pb-6">
            <h2 className="text-2xl font-bold text-center text-[#113F67]">
              Welcome Back
            </h2>
            <p className="text-center text-gray-600">
              Sign in to your account to continue
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-[#113F67]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#113F67] h-4 w-4" />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="text-[#113F67] w-full pl-10 pr-3 py-2 border border-[#113F67] rounded-md focus:ring-2 focus:ring-[#113F67] focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-[#113F67]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#113F67] h-4 w-4" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="text-[#113F67] w-full pl-10 pr-10 py-2 border border-[#113F67] rounded-md focus:ring-2 focus:ring-[#113F67] focus:border-transparent transition-all duration-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={formData.rememberMe}
                  onChange={(e) => handleInputChange('rememberMe', e.target.checked)}
                  className="rounded border-gray-300 text-[#113F67] focus:ring-[#113F67]"
                />
                <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="text-sm text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors cursor-pointer hover:underline"
                onClick={() => router.push('/forgot-password')}
              >
                Forgot password?
              </button>
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
              disabled={loading} // Disable button while loading
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
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
              Don&apos;t have an account?{' '}

              <button
                className="text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors cursor-pointer hover:underline"
                onClick={()=>router.push("/signup")}
              >Sign up</button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
