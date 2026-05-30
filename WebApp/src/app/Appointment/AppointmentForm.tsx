'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserData } from '@/app/utils/authUtil';

interface AppointmentFormData {
  student_id: string;
  department: string;
  purpose: string;
  date: string;
}

export default function AppointmentForm() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [formData, setFormData] = useState<AppointmentFormData>({
    student_id: '',
    department: '',
    purpose: '',
    date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const formatLocalDateTime = (value: string) => {
    if (!value) return value;
    return `${value.replace('T', ' ')}:00`;
  };

  const getLocalDateTimeMin = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const user = getUserData();
      if (user?.userId) {
        setUserId(user.userId);
      }
    }
  }, [isMounted]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!userId) {
        setError('User not authenticated. Please log in first.');
        return;
      }

      const response = await fetch('/API/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          date: formatLocalDateTime(formData.date),
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Appointment request submitted successfully! You will receive an email once it is reviewed.');
        setFormData({
          student_id: '',
          department: '',
          purpose: '',
          date: '',
        });

        setTimeout(() => {
          router.push('/UsersUI/appointments');
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit appointment request');
      }
    } catch (err) {
      setError('An error occurred while submitting your request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#f4f8fb] to-[#eaf1f8] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-[#113F67]/10 overflow-hidden">

        {/* Header */}
        <div className="bg-[#113F67] px-8 py-6 text-white">
          <h2 className="text-2xl font-bold tracking-tight">
            Request an Appointment
          </h2>
          <p className="text-sm opacity-80 mt-1">
            Fill out the form below to schedule your visit
          </p>
        </div>

        <div className="p-8">

          {/* Alerts */}
          {error && (
            <div className="mb-5 p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm shadow-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 rounded-lg border border-[#113F67]/30 bg-[#113F67]/10 text-[#113F67] text-sm shadow-sm">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Student ID */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#113F67]">
                Student ID *
              </label>
              <input
                type="text"
                id="student_id"
                name="student_id"
                value={formData.student_id}
                onChange={handleChange}
                required
                placeholder="Enter your student ID"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#113F67]/40 focus:border-[#113F67] transition"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#113F67]">
                Department *
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#113F67]/40 focus:border-[#113F67] transition"
              >
                <option value="">Select a department</option>
                <option value="Biology">Biology</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Microbiology">Microbiology</option>
                <option value="Biochemistry">Biochemistry</option>
                <option value="Research">Research</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#113F67]">
                Purpose of Visit *
              </label>
              <textarea
                id="purpose"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Please describe the purpose of your visit"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#113F67]/40 focus:border-[#113F67] transition resize-none"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#113F67]">
                Preferred Date & Time *
              </label>
              <input
                type="datetime-local"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                min={getLocalDateTimeMin()}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#113F67]/40 focus:border-[#113F67] transition"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#113F67] text-white py-3 rounded-lg font-semibold hover:bg-[#0d2f4d] shadow-md hover:shadow-lg transition disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>

              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 border border-[#113F67]/30 text-[#113F67] py-3 rounded-lg font-semibold hover:bg-[#113F67]/10 transition"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Info Box */}
          <div className="mt-8 p-5 bg-[#113F67]/10 border border-[#113F67]/20 rounded-xl">
            <h3 className="font-semibold text-[#113F67] mb-2">
              What happens next?
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>Your request will be reviewed by our admin team</li>
              <li>You'll receive an email notification with the decision</li>
              <li>If approved, you'll get a QR code to present when you arrive</li>
              <li>Please arrive on time for your scheduled appointment</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}