'use client';

import { useState, useEffect } from 'react';
import { format, addDays, parse } from 'date-fns';
import { API_URL } from '@/config/api';
import { getUserData } from '@/app/utils/authUtil';
import Modal from '@/app/components/Modal';

interface Appointment {
  appointment_id: number;
  user_id: number;
  student_id: string;
  department: string;
  purpose: string;
  date: string;
  end_time?: string | null;
  status: 'pending' | 'approved' | 'denied' | 'ongoing' | 'visited';
  qr_code: string | null;
  created_at: string;
  pending_at: string | null;
  approved_at: string | null;
  denied_at: string | null;
  ongoing_at: string | null;
  visited_at: string | null;
  denial_reason: string | null;
  admin_remarks: string | null;
}

type TabType = 'pending' | 'approved' | 'denied' | 'visited';

export default function UserAppointmentDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ department: '', date: '', time: '', purpose: '' });
  const [sameDayAppointments, setSameDayAppointments] = useState<Appointment[]>([]);
  const [timeConflict, setTimeConflict] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [modalConfig, setModalConfig] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);

  // Define availability rules
  const blockedWeekdays = [0]; // 0 = Sunday
  const blockedDates: string[] = []; // Add specific YYYY-MM-DD dates if admins block certain days
  const minDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const extractStudentId = (email: string): string => {
    if (!email) return '';
    const parts = email.split('@');
    return parts[0];
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved & Ongoing' },
    { key: 'denied', label: 'Denied' },
    { key: 'visited', label: 'Visited' },
  ];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const user = getUserData();
      if (user?.userId) {
        setUserId(user.userId);
      }
      if (user?.email) {
        setUserEmail(user.email);
      }
      fetchAppointments();
    }
  }, [isMounted]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      // Assuming GET /appointments returns all, and we should just show them 
      // since the backend might filter by token later, or we can just show all for demo
      const res = await fetch(`${API_URL}/appointments`);
      const data = await res.json();
      if (data.data) {
        setAppointments(data.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const isDateBlocked = (dateStr: string) => {
    if (!dateStr) return false;
    if (blockedDates.includes(dateStr)) return true;
    const dt = new Date(dateStr);
    const today = new Date();
    const isPastOrToday = dt.setHours(0,0,0,0) <= today.setHours(0,0,0,0);
    return isPastOrToday || blockedWeekdays.includes(dt.getDay());
  };

  const loadConflictsForDate = async (dateStr: string) => {
    if (!dateStr) return;
    setCheckingAvailability(true);
    try {
      // Reuse cached appointments instead of extra fetch if already loaded
      let current = appointments;
      if (!appointments.length) {
        const res = await fetch(`${API_URL}/appointments`);
        const data = await res.json();
        current = data.data || [];
        setAppointments(current);
      }

      const sameDay = current.filter((app) => {
        const appDate = new Date(app.date);
        const appDay = format(appDate, 'yyyy-MM-dd');
        return appDay === dateStr && (app.status === 'approved' || app.status === 'ongoing');
      });

      setSameDayAppointments(sameDay);
    } catch (error) {
      console.error('Error checking availability:', error);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const parseTimeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const hasTimeConflict = (dateStr: string, timeStr: string) => {
    if (!dateStr || !timeStr) return false;

    const requestedStart = parseTimeToMinutes(timeStr);
    const requestedEnd = requestedStart + 60;

    return sameDayAppointments.some((app) => {
      const appointmentStart = new Date(app.date);
      const appointmentEnd = app.end_time
        ? new Date(app.end_time)
        : new Date(appointmentStart.getTime() + 60 * 60 * 1000);

      const startMinutes = appointmentStart.getHours() * 60 + appointmentStart.getMinutes();
      const endMinutes = appointmentEnd.getHours() * 60 + appointmentEnd.getMinutes();

      return requestedStart < endMinutes && requestedEnd > startMinutes;
    });
  };

  const handleBook = async () => {
    if (!userId) {
      setModalConfig({ type: 'error', title: 'Authentication Error', message: 'User not authenticated' });
      return;
    }

    if (!form.date || !form.time) {
      setModalConfig({ type: 'error', title: 'Missing Information', message: 'Please select a date and time.' });
      return;
    }

    if (isDateBlocked(form.date)) {
      setModalConfig({ type: 'error', title: 'Date Unavailable', message: 'Selected date is unavailable. Please pick another day.' });
      return;
    }

    if (hasTimeConflict(form.date, form.time)) {
      setModalConfig({ type: 'error', title: 'Time Conflict', message: 'That time slot is already taken. Please choose another time.' });
      return;
    }

    try {
      const dateTime = `${form.date}T${form.time}`;
      const studentId = extractStudentId(userEmail);
      const res = await fetch(`${API_URL}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          student_id: studentId,
          department: form.department,
          date: dateTime,
          purpose: form.purpose
        })
      });
      if(res.ok) {
        setShowModal(false);
        setForm({ department: '', date: '', time: '', purpose: '' });
        setSameDayAppointments([]);
        setTimeConflict(false);
        fetchAppointments();
      } else {
        setModalConfig({ type: 'error', title: 'Booking Failed', message: 'Failed to create appointment' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'denied': return 'bg-red-100 text-red-800';
      case 'ongoing': return 'bg-blue-100 text-blue-800';
      case 'visited': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredAppointments = appointments.filter(app => {
    if (activeTab === 'approved') return app.status === 'approved' || app.status === 'ongoing';
    return app.status === activeTab;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Appointments</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#113F67] text-white px-4 py-2 rounded-md hover:bg-[#0d2f4d] transition-colors"
        >
          Book Appointment
        </button>
      </div>

      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === tab.key
                ? 'border-b-2 border-[#113F67] text-[#113F67]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-10 text-gray-500">No appointments found</div>
          ) : (
            filteredAppointments.map((app) => (
              <div key={app.appointment_id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold cursor-pointer text-blue-600">
                      Appointment #{app.appointment_id}
                    </h3>
                    <p className="text-gray-600 mt-1">Date: {format(new Date(app.date), 'MMMM dd, yyyy, hh:mm a')}</p>
                    <p className="text-gray-600">Department: {app.department}</p>
                    <p className="text-gray-600 mt-2">Purpose: {app.purpose}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(app.status)}`}>
                    {app.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-[#113F67]">Book Appointment</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Department"
                value={form.department}
                onChange={(e) => setForm({...form, department: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => {
                  const nextDate = e.target.value;
                  setForm({ ...form, date: nextDate, time: '' });
                  setSameDayAppointments([]);
                  setTimeConflict(false);
                  loadConflictsForDate(nextDate);
                }}
                className="w-full px-4 py-2 border rounded-md"
                min={minDate}
              />
              {form.date && isDateBlocked(form.date) && (
                <p className="text-sm text-red-600">This date is unavailable (Sunday or blocked by admin).</p>
              )}
              <input
                type="time"
                step={60}
                value={form.time}
                onChange={(e) => {
                  const nextTime = e.target.value;
                  setForm({ ...form, time: nextTime });
                  setTimeConflict(hasTimeConflict(form.date, nextTime));
                }}
                className="w-full px-4 py-2 border rounded-md"
                disabled={!form.date || isDateBlocked(form.date) || checkingAvailability}
              />
              {checkingAvailability && (
                <p className="text-sm text-gray-500">Checking availability…</p>
              )}
              {!checkingAvailability && form.time && timeConflict && (
                <p className="text-sm text-red-600">This time overlaps with an existing appointment. Choose another time.</p>
              )}
              {!checkingAvailability && form.time && !timeConflict && (
                <p className="text-sm text-green-600">Selected time is available.</p>
              )}
              <textarea
                placeholder="Purpose of visit"
                value={form.purpose}
                onChange={(e) => setForm({...form, purpose: e.target.value})}
                className="w-full px-4 py-2 border rounded-md"
                rows={3}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleBook}
                  className="flex-1 bg-[#113F67] text-white px-4 py-2 rounded-md hover:bg-[#0d2f4d]"
                >
                  Confirm Request
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal */}
      {modalConfig && (
        <Modal
          isOpen={true}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onClose={() => setModalConfig(null)}
          autoCloseMs={modalConfig.type === 'success' ? 3000 : 0}
        />
      )}
    </div>
  );
}
