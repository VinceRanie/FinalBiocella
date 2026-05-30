'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, FileText, CheckCircle, Mail, User } from 'lucide-react';

interface AppointmentFormData {
  requester_name: string;
  requester_email: string;
  requester_phone: string;
  department: string;
  date: string;
  time: string;
  purpose: string;
  website: string;
}

export default function AppointmentBooking() {
  const [formData, setFormData] = useState<AppointmentFormData>({
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    department: 'External Visitor',
    date: '',
    time: '',
    purpose: '',
    website: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [error, setError] = useState('');

  const toSqlDateTime = (date: string, time: string) => `${date} ${time}:00`;

  const parseMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatMinutes = (minutes: number) => {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hours = Math.floor(normalized / 60);
    const mins = normalized % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const getNextAvailableOneHourSlot = (afterTime: string) => {
    const slots = Array.isArray(availability?.timeSlots) ? [...availability.timeSlots] : [];
    const afterMinutes = parseMinutes(afterTime);

    const nextSlot = slots
      .filter((slot: any) => slot.available && !slot.booked)
      .map((slot: any) => slot.time)
      .sort((a: string, b: string) => parseMinutes(a) - parseMinutes(b))
      .find((slotTime: string) => parseMinutes(slotTime) >= afterMinutes);

    if (!nextSlot) return null;

    return `${formatMinutes(parseMinutes(nextSlot))} - ${formatMinutes(parseMinutes(nextSlot) + 60)}`;
  };

  const loadAvailability = async (date: string) => {
    if (!date) return;
    setLoadingAvailability(true);
    try {
      const res = await fetch(`/API/appointments/availability?date=${date}`);
      if (!res.ok) {
        setAvailability(null);
        return;
      }
      const data = await res.json();
      setAvailability(data);
    } catch {
      setAvailability(null);
    } finally {
      setLoadingAvailability(false);
    }
  };

  useEffect(() => {
    if (formData.date) {
      loadAvailability(formData.date);
    } else {
      setAvailability(null);
    }
  }, [formData.date]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.requester_name || !formData.requester_email || !formData.date || !formData.time || !formData.purpose) {
      setError('Please complete all required fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (availability?.unavailable) {
        setError('This date is unavailable. Please choose another date.');
        return;
      }

      const slots = Array.isArray(availability?.timeSlots) ? availability.timeSlots : [];
      if (slots.length > 0) {
        const selectedStart = parseMinutes(formData.time);
        const selectedEnd = selectedStart + 60;
        const hasOverlap = slots.some((slot: any) => {
          const slotStart = parseMinutes(slot.time);
          const slotEnd = slotStart + 60;
          const booked = !slot.available || slot.booked;
          return booked && selectedStart < slotEnd && selectedEnd > slotStart;
        });

        if (hasOverlap) {
          const nextRange = getNextAvailableOneHourSlot(formData.time);
          setError(nextRange
            ? `Selected time overlaps with an existing appointment. Next available slot: ${nextRange}.`
            : 'Selected time overlaps with an existing appointment. Please choose another time.');
          return;
        }
      }

      const startDateTime = `${formData.date}T${formData.time}:00`;
      const start = new Date(startDateTime);

      if (Number.isNaN(start.getTime())) {
        setError('Please select a valid date and time.');
        return;
      }

      const [hours, minutes] = formData.time.split(':').map(Number);
      const end = new Date(Number(formData.date.slice(0, 4)), Number(formData.date.slice(5, 7)) - 1, Number(formData.date.slice(8, 10)), hours, minutes, 0);
      end.setHours(end.getHours() + 1);
      const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
      const endTime = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}:${String(end.getSeconds()).padStart(2, '0')}`;

      const response = await fetch('/API/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment_source: 'outsider',
          requester_name: formData.requester_name,
          requester_email: formData.requester_email,
          requester_phone: formData.requester_phone || null,
          department: formData.department || 'External Visitor',
          purpose: formData.purpose,
          date: toSqlDateTime(formData.date, formData.time),
          end_time: `${endDate} ${endTime}`,
          website: formData.website
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Unable to submit appointment.');
        return;
      }

      setSubmitted(true);
      setFormData({
        requester_name: '',
        requester_email: '',
        requester_phone: '',
        department: 'External Visitor',
        date: '',
        time: '',
        purpose: '',
        website: '',
      });
      setTimeout(() => setSubmitted(false), 4500);
    } catch (err) {
      setError('Network error while submitting appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const router = useRouter();

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 ease-in-out duration-300">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#113F67] p-6 text-white">
          <h1 className="text-2xl font-bold">Book An External Appointment</h1>
          <p className="text-sm opacity-80 mt-1">
            For visitors outside USC. No login required.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

{submitted && (
  <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
    <CheckCircle size={18} />
    Appointment submitted. We will review and send updates by email.
  </div>
)}

{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
    {error}
  </div>
)}

{/* Email + Name */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  
  {/* Email */}
  <div>
    <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
      <Mail size={16} /> Email
    </label>
    <input
      type="email"
      name="requester_email"
      value={formData.requester_email}
      onChange={handleChange}
      required
      className="w-full border border-[#113F67]/30 rounded-md px-3 py-2  focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
    />
  </div>

  {/* Name */}
  <div>
    <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
      <User size={16} /> Name
    </label>
    <input
      type="text"
      name="requester_name"
      value={formData.requester_name}
      onChange={handleChange}
      required
      className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
    />
  </div>

</div>

<div>
  <label className="text-sm font-semibold text-[#113F67] mb-1 block">
    Phone (optional)
  </label>
  <input
    type="text"
    name="requester_phone"
    value={formData.requester_phone}
    onChange={handleChange}
    className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
  />
</div>

<div className="hidden" aria-hidden="true">
  <label htmlFor="website">Website</label>
  <input
    id="website"
    type="text"
    name="website"
    value={formData.website}
    onChange={handleChange}
    tabIndex={-1}
    autoComplete="off"
  />
</div>

{/* Date */}
<div>
  <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
    <Calendar size={16} /> Date
  </label>
  <input
    type="date"
    name="date"
    value={formData.date}
    onChange={handleChange}
    required
    className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
  />
</div>

{/* Time */}
<div>
  <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
    <Clock size={16} /> Time
  </label>
  <input
    type="time"
    name="time"
    value={formData.time}
    onChange={handleChange}
    required
    className="w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30"
  />
  {loadingAvailability && (
    <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
  )}
  {availability?.unavailable && (
    <p className="text-xs text-red-600 mt-1">This date is unavailable. Please choose another date.</p>
  )}
      {loadingAvailability && (
        <p className="text-xs text-gray-500 mt-1">Checking availability...</p>
      )}
      {availability?.unavailable && (
        <p className="text-xs text-red-600 mt-1">This date is unavailable. Please choose another date.</p>
      )}
</div>

{/* Purpose */}
<div>
  <label className="text-sm font-semibold text-[#113F67] flex items-center gap-2 mb-1">
    <FileText size={16} /> Purpose
  </label>
  <textarea
    name="purpose"
    value={formData.purpose}
    onChange={handleChange}
    required
    rows={4}
    placeholder="Tell us the reason for your appointment..."
    className="text-[#113F67] w-full border border-[#113F67]/30 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#113F67]/30 resize-none"
  />
</div>

{/* Button */}
<button
  type="submit"
  disabled={loading}
  className="cursor-pointer w-full bg-[#113F67] hover:bg-[#0d2f4d] text-white font-semibold py-2 rounded-md transition disabled:opacity-60"
>
  {loading ? 'Submitting...' : 'Submit Appointment'}
</button>
</form>
       
        {/* Footer */}
        <div className="border-t border-[#113F67] text-center text-xs text-gray-500 py-4 bg-gray-50">
        We usually confirm within 24 hours.
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
                type="button"
                className="text-[#113F67] hover:text-[#0a2a4a] font-medium transition-colors cursor-pointer hover:underline"
                onClick={() => router.push('/signup')}
              >Sign up</button>
            </p>
          </div>
        </div>
      </div>
    </div>

      {/* Right: Form Section */}
      <div className="relative hidden md:block">
        <Image
          src="/UI/img/BioOffice.webp"
          alt="USC Biology Laboratory (Arnoldus Science Building)"
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent to-background/10" />
      </div>
    </div>
  );
}
