'use client';

import { createContext, useContext, useEffect, useState } from "react";
import { format } from "date-fns";

export type AppointmentStatus = "pending" | "completed" | "cancelled" | "missed";

export interface Appointment {
  id: string;
  date: string;
  time: string;
  title: string;
  status: AppointmentStatus;
}

interface CreateAppointmentPayload {
  date: Date;
  time: string; // HH:mm
  purpose: string;
}

interface ContextType {
  appointments: Appointment[];
  loading: boolean;
  submitting: boolean;
  error: string;
  addAppointment: (appt: Appointment) => void;
  createAppointment: (payload: CreateAppointmentPayload) => Promise<{ ok: boolean; message?: string }>;
  refreshAppointments: () => Promise<void>;
}

const AppointmentContext = createContext<ContextType | null>(null);

const extractUserIdentity = () => {
  let studentId = "";
  let userId: number | null = null;
  let department = "";

  const readStored = () => {
    const userData = localStorage.getItem("userData") || localStorage.getItem("user");
    if (!userData) return null;
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  };

  const parsed = readStored();
  const email = parsed?.email || localStorage.getItem("userEmail") || "";
  if (email) studentId = email.split("@")[0];
  userId = parsed?.userId || parsed?.user_id || null;
  department = parsed?.department || "";

  return { studentId, userId, department };
};

const normalizeStatus = (status: string): AppointmentStatus => {
  if (status === "visited") return "completed";
  if (status === "no_show") return "missed";
  if (status === "denied" || status === "cancelled") return "cancelled";
  return "pending";
};

const toDisplayDate = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return value;
  return format(dt, "MMM dd, yyyy");
};

const toDisplayTime = (value: string) => {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return format(dt, "hh:mm a");
};

export function AppointmentProvider({ children }: { children: React.ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addAppointment = (appt: Appointment) => {
    setAppointments((prev) => [appt, ...prev]);
  };

  const refreshAppointments = async () => {
    setLoading(true);
    setError("");
    try {
      const identity = extractUserIdentity();
      if (!identity.userId && !identity.studentId) {
        setAppointments([]);
        setError("Could not identify logged-in user. Please log in again.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.set("scope", "self");
      if (identity.userId) {
        params.set("user_id", String(identity.userId));
      }
      if (identity.studentId) {
        params.set("student_id", identity.studentId);
      }

      const res = await fetch(`/API/appointments?${params.toString()}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      if (!res.ok) {
        setError("Failed to fetch appointments.");
        setLoading(false);
        return;
      }

      const raw = await res.json();
      const source = Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];

      const mine = source.filter((item: any) => {
        if (identity.userId && item.user_id) {
          return Number(item.user_id) === Number(identity.userId);
        }
        if (identity.studentId && item.student_id) {
          return String(item.student_id).toLowerCase() === identity.studentId.toLowerCase();
        }
        return false;
      });

      const mapped: Appointment[] = mine.map((item: any) => ({
        id: String(item.appointment_id ?? item.id ?? crypto.randomUUID()),
        date: toDisplayDate(item.date),
        time: toDisplayTime(item.date),
        title: item.purpose || "Appointment",
        status: normalizeStatus(item.status),
      }));

      setAppointments(mapped);
    } catch {
      setError("Failed to fetch appointments.");
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async ({ date, time, purpose }: CreateAppointmentPayload) => {
    const identity = extractUserIdentity();
    if (!identity.studentId) {
      return { ok: false, message: "Could not identify student. Please log in again." };
    }

    const dateStr = format(date, "yyyy-MM-dd");
    const startDateTime = `${dateStr} ${time}:00`;

    const end = new Date(`${dateStr}T${time}:00`);
    end.setHours(end.getHours() + 1);
    const endDateTime = format(end, "yyyy-MM-dd HH:mm:ss");

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/API/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: identity.userId,
          student_id: identity.studentId,
          department: identity.department,
          purpose,
          date: startDateTime,
          end_time: endDateTime,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { ok: false, message: data?.message || data?.error || "Failed to book appointment." };
      }

      await refreshAppointments();
      return { ok: true, message: "Appointment request successfully sent." };
    } catch {
      return { ok: false, message: "Network error while booking appointment." };
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    refreshAppointments();
  }, []);

  return (
    <AppointmentContext.Provider
      value={{ appointments, loading, submitting, error, addAppointment, createAppointment, refreshAppointments }}
    >
      {children}
    </AppointmentContext.Provider>
  );
}

export const useAppointmentContext = () => {
  const ctx = useContext(AppointmentContext);
  if (!ctx) throw new Error("Must be used inside provider");
  return ctx;
};