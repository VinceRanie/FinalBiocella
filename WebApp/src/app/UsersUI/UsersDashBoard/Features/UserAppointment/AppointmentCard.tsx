'use client';

import { CalendarDays, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

export type AppointmentStatus = "pending" | "completed" | "cancelled" | "missed";

export interface Appointment {
  id: string;
  date: string;
  time: string;
  title: string;
  status: AppointmentStatus;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "text-amber-700", bg: "bg-amber-100" },
  completed: { label: "Completed", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-gray-600", bg: "bg-gray-200" },
  missed: { label: "Missed", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
};

export function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const config = statusConfig[appointment.status];
  const Icon = config.icon;

  return (
    <div className="rounded-xl border border-white p-4 shadow-sm bg-white">
      <div className="flex justify-between">
        <div>
          <h4 className="font-semibold">{appointment.title}</h4>
          <div className="text-sm text-gray-500 flex gap-3">
            <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" />{appointment.date}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{appointment.time}</span>
          </div>
        </div>

        <div className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${config.bg} ${config.color}`}>
          <Icon className="h-3 w-3" />
          {config.label}
        </div>
      </div>
    </div>
  );
}