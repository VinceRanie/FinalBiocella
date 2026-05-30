"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { getUserRole, isAuthenticated } from "@/app/utils/authUtil";

interface Appointment {
  appointment_id: number;
  student_id: string;
  department: string;
  purpose: string;
  date: string;
  status: string;
}

const normalizeRole = (role: string | null) => (role || "").trim().toLowerCase();

function ScanAppointmentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token");
  const id = searchParams.get("id");

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/Login");
      return;
    }

    const role = normalizeRole(getUserRole());
    if (role === "student" || role === "faculty") {
      router.replace("/UsersUI/UsersDashBoard/Features/UserAppointment");
      return;
    }

    if (!token || !id) {
      setError("Invalid QR code");
      setLoading(false);
      return;
    }

    fetchAppointment();
  }, [id, router, token]);

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/API/appointments/verify?token=${token}&id=${id}`);
      const data = await response.json();

      if (response.ok) {
        setAppointment(data.appointment);
      } else {
        setError(data.message || "Invalid QR code");
      }
    } catch (_err) {
      setError("Failed to verify QR code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!appointment) return;

    setVerifying(true);
    try {
      const response = await fetch("/API/appointments/verify-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrCode: token,
          appointmentId: id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setAppointment({ ...appointment, status: "visited" });
      } else {
        setError(data.message || "Failed to verify appointment");
      }
    } catch (_err) {
      setError("Failed to verify appointment");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying QR code...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">X</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid QR Code</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <div className="text-green-500 text-6xl mb-4">OK</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Verified</h2>
          <p className="text-gray-600 mb-6">The appointment has been marked as visited.</p>
          <div className="bg-gray-50 p-4 rounded-lg text-left">
            <p className="text-sm text-gray-600 mb-1">Student ID:</p>
            <p className="font-semibold text-gray-900 mb-3">{appointment.student_id}</p>
            <p className="text-sm text-gray-600 mb-1">Department:</p>
            <p className="font-semibold text-gray-900 mb-3">{appointment.department}</p>
            <p className="text-sm text-gray-600 mb-1">Visit Date:</p>
            <p className="font-semibold text-gray-900">{format(new Date(appointment.date), "PPpp")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Verify Appointment</h2>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <p className="text-sm text-blue-700">Review details and confirm to mark the appointment as visited.</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Student ID</label>
            <p className="text-lg font-semibold text-gray-900">{appointment.student_id}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Department</label>
            <p className="text-lg font-semibold text-gray-900">{appointment.department}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Purpose</label>
            <p className="text-lg font-semibold text-gray-900">{appointment.purpose}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Scheduled Date</label>
            <p className="text-lg font-semibold text-gray-900">{format(new Date(appointment.date), "PPPP p")}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-600">Current Status</label>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                appointment.status === "ongoing" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"
              }`}
            >
              {appointment.status.toUpperCase()}
            </span>
          </div>
        </div>

        {appointment.status === "ongoing" ? (
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? "Verifying..." : "Confirm Visit and Mark as Visited"}
          </button>
        ) : (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <p className="text-sm text-yellow-700">This appointment cannot be verified. Status: {appointment.status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ScanAppointmentContent />
    </Suspense>
  );
}
