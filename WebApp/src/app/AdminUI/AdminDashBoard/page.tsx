"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Microscope,FlaskConical,AlertTriangle,CalendarClock,Users,Package,BarChart3,Clock,Loader2,Megaphone } from "lucide-react";
import AnnouncementComposerModal from "./Components/AnnouncementComposerModal";
import AnnouncementManagementModal from "./Components/AnnouncementManagementModal";

import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,} from "recharts";

type CardTrend = "up" | "neutral" | "warning";

type SummaryCard = {
  title: string;
  value: string;
  sub: string;
  icon: typeof Microscope;
  trend: CardTrend;
};

type ChemicalItem = {
  chemical_id?: number | string | null;
  type?: string | null;
  quantity?: number | string | null;
  threshold?: number | string | null;
};

type BatchItem = {
  batch_id?: number | string | null;
  chemical_id?: number | string | null;
  quantity?: number | string | null;
  used_quantity?: number | string | null;
  date_received?: string | Date | null;
};

type AppointmentItem = {
  appointment_id?: number | string | null;
  student_id?: string | null;
  requester_name?: string | null;
  requester_email?: string | null;
  appointment_source?: string | null;
  department?: string | null;
  purpose?: string | null;
  status?: string | null;
  date?: string | Date | null;
  end_time?: string | Date | null;
  pending_at?: string | Date | null;
  approved_at?: string | Date | null;
  denied_at?: string | Date | null;
  ongoing_at?: string | Date | null;
  visited_at?: string | Date | null;
  no_show_at?: string | Date | null;
};

type DashboardAppointmentEntry = {
  id: string;
  time: string;
  title: string;
  source: "internal" | "outsider";
  status: "ongoing" | "pending" | "no_show";
};

type UsersResponse = {
  users?: UserItem[];
};

type UserItem = {
  user_id?: number | string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  created_at?: string | Date | null;
};

type UserRoleSummary = {
  activeUsers: number;
  researchAssistants: number;
  faculty: number;
  students: number;
};

type UsageLogItem = {
  log_id?: number | string | null;
  chemical_name?: string | null;
  date_used?: string | Date | null;
};

type MicrobialItem = {
  _id?: string;
  code_name?: string | null;
  classification?: string | null;
  created_at?: string | Date | null;
  updated_at?: string | Date | null;
  updated_by?: string | { first_name?: string; last_name?: string; name?: string; email?: string } | null;
  updatedBy?: string | null;
  updated_by_name?: string | null;
  last_updated_by?: string | null;
  update_notes?: string | null;
  notes?: string | null;
};

type SpecimenOverviewEntry = {
  id: string;
  name: string;
  category: string;
  updatedBy: string;
  updatedAt: string;
  notes: string;
};

type ActivityEntry = {
  id: string;
  text: string;
  time: string;
  timestamp: number;
};

type InventoryChartEntry = {
  name: string;
  stock: number;
};

type ActivitySourceEntry = {
  id: string;
  text: string;
  timestamp: number;
};

type UnavailableDate = {
  unavailable_id: number;
  unavailable_date: string;
  reason: string;
  is_emergency?: number | boolean;
};

const DEFAULT_SUMMARY_CARDS: SummaryCard[] = [
  {
    title: "Total Specimens",
    value: "0",
    sub: "All microbial records",
    icon: Microscope,
    trend: "neutral",
  },
  {
    title: "Chemical Stocks",
    value: "0",
    sub: "Available items",
    icon: FlaskConical,
    trend: "neutral",
  },
  {
    title: "Low Stock Alerts",
    value: "0",
    sub: "Requires attention",
    icon: AlertTriangle,
    trend: "neutral",
  },
  {
    title: "Pending Appointments",
    value: "0",
    sub: "0 today",
    icon: CalendarClock,
    trend: "neutral",
  },
  {
    title: "Registered Users",
    value: "0",
    sub: "Total active accounts",
    icon: Users,
    trend: "neutral",
  },
];

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseTimestamp = (value: string | Date | null | undefined) => {
  if (!value) return null;

  const parsed = new Date(value);
  const timestamp = parsed.getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatCount = (value: number) => new Intl.NumberFormat().format(value);

const formatRelativeTime = (timestamp: number) => {
  const diffMs = Date.now() - timestamp;

  if (diffMs < 60_000) {
    return "just now";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return new Date(timestamp).toLocaleDateString();
};

const formatDateTime = (value: string | Date | null | undefined) => {
  if (!value) return "N/A";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveUpdatedBy = (microbial: MicrobialItem) => {
  const directCandidates = [
    microbial.updated_by_name,
    microbial.updatedBy,
    microbial.last_updated_by,
  ];

  const direct = directCandidates.find((candidate) => String(candidate || "").trim().length > 0);
  if (direct) return String(direct).trim();

  if (typeof microbial.updated_by === "string" && microbial.updated_by.trim()) {
    return microbial.updated_by.trim();
  }

  if (microbial.updated_by && typeof microbial.updated_by === "object") {
    const firstName = String(microbial.updated_by.first_name || "").trim();
    const lastName = String(microbial.updated_by.last_name || "").trim();
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;

    const fallback = String(microbial.updated_by.name || microbial.updated_by.email || "").trim();
    if (fallback) return fallback;
  }

  return "System";
};

const isTodayLocal = (input: string | Date | null | undefined) => {
  if (!input) return false;

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const now = new Date();
  return (
    parsedDate.getFullYear() === now.getFullYear() &&
    parsedDate.getMonth() === now.getMonth() &&
    parsedDate.getDate() === now.getDate()
  );
};

const isTomorrowLocal = (input: string | Date | null | undefined) => {
  if (!input) return false;

  const parsedDate = new Date(input);
  if (Number.isNaN(parsedDate.getTime())) return false;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    parsedDate.getFullYear() === tomorrow.getFullYear() &&
    parsedDate.getMonth() === tomorrow.getMonth() &&
    parsedDate.getDate() === tomorrow.getDate()
  );
};

const formatAppointmentTime = (
  dateInput: string | Date | null | undefined,
  endInput?: string | Date | null
) => {
  if (!dateInput) return "Time TBD";

  const start = new Date(dateInput);
  if (Number.isNaN(start.getTime())) return "Time TBD";

  const startText = start.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (!endInput) return startText;

  const end = new Date(endInput);
  if (Number.isNaN(end.getTime())) return startText;

  const endText = end.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${startText} - ${endText}`;
};

const formatAppointmentTitle = (appointment: AppointmentItem) => {
  const source = String(appointment.appointment_source || "internal").toLowerCase();
  const purpose = String(appointment.purpose || "").trim();
  const department = String(appointment.department || "").trim();
  const studentId = String(appointment.student_id || "").trim();
  const requesterName = String(appointment.requester_name || "").trim();
  const requesterEmail = String(appointment.requester_email || "").trim();

  if (source === "outsider") {
    const visitor = requesterName || requesterEmail || "External Visitor";
    if (purpose && department) {
      return `${visitor} - ${purpose} (${department})`;
    }
    if (purpose) return `${visitor} - ${purpose}`;
    return visitor;
  }

  if (purpose && department) {
    return `${purpose} - ${department}`;
  }
  if (purpose) return purpose;
  if (department) return department;
  if (studentId) return `Student ${studentId}`;
  return `Appointment #${appointment.appointment_id || "N/A"}`;
};

const mapDashboardAppointment = (
  appointment: AppointmentItem,
  status: "ongoing" | "pending" | "no_show"
): DashboardAppointmentEntry => {
  const source =
    String(appointment.appointment_source || "internal").toLowerCase() === "outsider"
      ? "outsider"
      : "internal";

  return {
    id: String(appointment.appointment_id || `${status}-${appointment.date || Date.now()}`),
    time: formatAppointmentTime(appointment.date, appointment.end_time),
    title: formatAppointmentTitle(appointment),
    source,
    status,
  };
};

const createSummaryCards = ({
  specimenCount,
  chemicalCount,
  lowStockCount,
  pendingAppointments,
  pendingInternal,
  pendingOutsider,
  pendingToday,
  registeredUsers,
}: {
  specimenCount: number;
  chemicalCount: number;
  lowStockCount: number;
  pendingAppointments: number;
  pendingInternal: number;
  pendingOutsider: number;
  pendingToday: number;
  registeredUsers: number;
}): SummaryCard[] => {
  return [
    {
      title: "Total Specimens",
      value: formatCount(specimenCount),
      sub: "All microbial records",
      icon: Microscope,
      trend: "up",
    },
    {
      title: "Chemical Stocks",
      value: formatCount(chemicalCount),
      sub: "Available items",
      icon: FlaskConical,
      trend: "neutral",
    },
    {
      title: "Low Stock Alerts",
      value: formatCount(lowStockCount),
      sub: lowStockCount > 0 ? "Requires attention" : "All stock healthy",
      icon: AlertTriangle,
      trend: lowStockCount > 0 ? "warning" : "neutral",
    },
    {
      title: "Pending Appointments",
      value: formatCount(pendingAppointments),
      sub: `Today ${formatCount(pendingToday)} | Internal ${formatCount(pendingInternal)} | Outsider ${formatCount(pendingOutsider)}`,
      icon: CalendarClock,
      trend: "neutral",
    },
    {
      title: "Registered Users",
      value: formatCount(registeredUsers),
      sub: "Total active accounts",
      icon: Users,
      trend: "up",
    },
  ];
};

const getUserDisplayName = (user: UserItem) => {
  const firstName = String(user.first_name || "").trim();
  const lastName = String(user.last_name || "").trim();
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  return user.email || "New user";
};

const getAppointmentLabel = (appointment: AppointmentItem) => {
  const source = String(appointment.appointment_source || "internal").toLowerCase();

  if (source === "outsider") {
    return (
      String(appointment.requester_name || "").trim() ||
      String(appointment.requester_email || "").trim() ||
      String(appointment.purpose || "").trim() ||
      `#${appointment.appointment_id || "N/A"}`
    );
  }

  return (
    String(appointment.purpose || "").trim() ||
    String(appointment.department || "").trim() ||
    String(appointment.student_id || "").trim() ||
    `#${appointment.appointment_id || "N/A"}`
  );
};

const buildRecentActivities = ({
  microbials,
  users,
  appointments,
  usageLogs,
}: {
  microbials: MicrobialItem[];
  users: UserItem[];
  appointments: AppointmentItem[];
  usageLogs: UsageLogItem[];
}): ActivityEntry[] => {
  const sourceEntries: ActivitySourceEntry[] = [];

  microbials.forEach((microbial) => {
    const timestamp = parseTimestamp(microbial.created_at);
    if (!timestamp) return;

    sourceEntries.push({
      id: `specimen-${microbial._id || timestamp}`,
      text: `New specimen added - ${microbial.code_name || "Unnamed specimen"}`,
      timestamp,
    });
  });

  users.forEach((user) => {
    const timestamp = parseTimestamp(user.created_at);
    if (!timestamp) return;

    sourceEntries.push({
      id: `user-${user.user_id || timestamp}`,
      text: `User registered - ${getUserDisplayName(user)}`,
      timestamp,
    });
  });

  appointments.forEach((appointment) => {
    const timestampCandidates: Array<{
      label: string;
      value: string | Date | null | undefined;
    }> = [
      { label: "Appointment marked as no-show", value: appointment.no_show_at },
      { label: "Appointment completed", value: appointment.visited_at },
      { label: "Appointment started", value: appointment.ongoing_at },
      { label: "Appointment approved", value: appointment.approved_at },
      { label: "Appointment denied", value: appointment.denied_at },
      { label: "Appointment requested", value: appointment.pending_at },
    ];

    const withTimestamp = timestampCandidates
      .map((candidate) => ({
        label: candidate.label,
        timestamp: parseTimestamp(candidate.value),
      }))
      .filter((candidate): candidate is { label: string; timestamp: number } => {
        return candidate.timestamp !== null;
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    if (!withTimestamp.length) return;

    const latest = withTimestamp[0];
    sourceEntries.push({
      id: `appointment-${appointment.appointment_id || latest.timestamp}`,
      text: `${latest.label} - ${getAppointmentLabel(appointment)}`,
      timestamp: latest.timestamp,
    });
  });

  usageLogs.forEach((log) => {
    const timestamp = parseTimestamp(log.date_used);
    if (!timestamp) return;

    sourceEntries.push({
      id: `usage-${log.log_id || timestamp}`,
      text: `Chemical stock updated - ${log.chemical_name || "Unknown reagent"}`,
      timestamp,
    });
  });

  return sourceEntries
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6)
    .map((entry) => ({
      ...entry,
      time: formatRelativeTime(entry.timestamp),
    }));
};

const buildInventoryChartData = ({
  chemicals,
  batches,
}: {
  chemicals: ChemicalItem[];
  batches: BatchItem[];
}): InventoryChartEntry[] => {
  const chemicalById = new Map<number, ChemicalItem>();
  chemicals.forEach((chemical) => {
    const chemicalId = toNumber(chemical.chemical_id);
    if (chemicalId > 0) {
      chemicalById.set(chemicalId, chemical);
    }
  });

  const typeTotals = new Map<string, { total: number; remaining: number }>();

  batches.forEach((batch) => {
    const chemicalId = toNumber(batch.chemical_id);
    const chemical = chemicalById.get(chemicalId);
    if (!chemical) return;

    const typeName = String(chemical.type || "General").trim() || "General";
    const total = Math.max(toNumber(batch.quantity), 0);
    const used = Math.max(toNumber(batch.used_quantity), 0);
    const remaining = Math.max(total - used, 0);

    const current = typeTotals.get(typeName) || { total: 0, remaining: 0 };
    current.total += total;
    current.remaining += remaining;
    typeTotals.set(typeName, current);
  });

  return Array.from(typeTotals.entries())
    .map(([name, totals]) => {
      const percentageLeft = totals.total > 0 ? (totals.remaining / totals.total) * 100 : 0;

      return {
        name,
        stock: Number(percentageLeft.toFixed(1)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

/* ================= SINGLE DATA OBJECT ================= */
const dashboardData = {
  actions: [
    { id: "add-specimen", label: "Add Specimen", icon: Microscope },
    { id: "add-chemical", label: "Add Chemical Stock", icon: FlaskConical },
    { id: "create-announcement", label: "Create Announcement", icon: Megaphone },
    { id: "manage-announcements", label: "Manage Announcements", icon: Megaphone },
    { id: "set-unavailable", label: "Set Date Unavailable", icon: CalendarClock },
    { id: "see-reports", label: "See Reports", icon: BarChart3 },
  ],

  appointments: [
    { time: "9:00 AM", title: "Lab Room 1 — Microbiology", status: "confirmed" },
    { time: "10:30 AM", title: "Lab Room 3 — Chemistry", status: "pending" },
    { time: "1:00 PM", title: "Lab Room 2 — Biology", status: "confirmed" },
    { time: "3:00 PM", title: "Lab Room 1 — Pathology", status: "pending" },
  ],

  specimens: [
    { name: "Amoeba proteus", category: "Protozoa", date: "Mar 15, 2026", qr: "Active" },
    { name: "Paramecium sp.", category: "Protozoa", date: "Mar 14, 2026", qr: "Active" },
    { name: "E. coli K-12", category: "Bacteria", date: "Mar 12, 2026", qr: "Pending" },
    { name: "Saccharomyces", category: "Fungi", date: "Mar 10, 2026", qr: "Active" },
    { name: "Spirogyra sp.", category: "Algae", date: "Mar 8, 2026", qr: "Inactive" },
  ],
};

/* ================= HELPERS ================= */
const getActivityConfig = (text: string) => {
  const lower = text.toLowerCase();

  if (lower.includes("specimen")) {
    return { icon: Microscope, color: "text-[#113F67]", bg: "bg-purple-100" };
  }
  if (lower.includes("user") || lower.includes("registered")) {
    return { icon: Users, color: "text-[#113F67]", bg: "bg-green-100" };
  }
  if (lower.includes("appointment")) {
    return { icon: CalendarClock, color: "text-[#113F67]", bg: "bg-blue-100" };
  }
  if (lower.includes("chemical") || lower.includes("stock") || lower.includes("reagent")) {
    return { icon: Package, color: "text-[#113F67]", bg: "bg-orange-100" };
  }

  return { icon: AlertTriangle, color: "text-[#113F67]", bg: "bg-gray-100" };
};

/* ================= COMPONENT ================= */
export default function AdminHome() {
  const router = useRouter();
  const [summaryCards, setSummaryCards] = useState<SummaryCard[]>(DEFAULT_SUMMARY_CARDS);
  const [recentActivities, setRecentActivities] = useState<ActivityEntry[]>([]);
  const [inventoryChartData, setInventoryChartData] = useState<InventoryChartEntry[]>([]);
  const [todayOngoingAppointments, setTodayOngoingAppointments] = useState<DashboardAppointmentEntry[]>([]);
  const [todayNoShowAppointments, setTodayNoShowAppointments] = useState<DashboardAppointmentEntry[]>([]);
  const [tomorrowPendingAppointments, setTomorrowPendingAppointments] = useState<DashboardAppointmentEntry[]>([]);
  const [showUnavailableModal, setShowUnavailableModal] = useState(false);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAnnouncementManagementModal, setShowAnnouncementManagementModal] = useState(false);
  const [unavailableDate, setUnavailableDate] = useState("");
  const [unavailableReason, setUnavailableReason] = useState("");
  const [isEmergencyCancellation, setIsEmergencyCancellation] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<UnavailableDate[]>([]);
  const [savingUnavailable, setSavingUnavailable] = useState(false);
  const [showReportsNavToast, setShowReportsNavToast] = useState(false);
  const [showAnnouncementToast, setShowAnnouncementToast] = useState(false);
  const [specimenOverview, setSpecimenOverview] = useState<SpecimenOverviewEntry[]>([]);
  const [userRoleSummary, setUserRoleSummary] = useState<UserRoleSummary>({
    activeUsers: 0,
    researchAssistants: 0,
    faculty: 0,
    students: 0,
  });

  const fetchUnavailableDates = async () => {
    try {
      const res = await fetch("/API/appointments/unavailable-dates");
      if (!res.ok) {
        throw new Error("Failed to fetch unavailable dates");
      }
      const data = await res.json();
      setUnavailableDates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching unavailable dates:", err);
    }
  };

  const getCurrentUserId = (): number | null => {
    try {
      const fromUserData = localStorage.getItem("userData");
      const fromUser = localStorage.getItem("user");
      const raw = fromUserData || fromUser;
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const id = Number(parsed.userId ?? parsed.user_id ?? parsed.id);
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  };

  const handleSetUnavailableDate = async () => {
    if (!unavailableDate || !unavailableReason.trim()) {
      alert("Please select a date and provide a reason.");
      return;
    }

    try {
      setSavingUnavailable(true);
      const response = await fetch("/API/appointments/unavailable-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: unavailableDate,
          reason: unavailableReason.trim(),
          created_by_role: "admin",
          created_by_user_id: getCurrentUserId(),
          is_emergency: isEmergencyCancellation,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to mark date unavailable");
      }

      try {
        let msg = 'Date marked unavailable.';
        if (data?.affectedAppointments) {
          msg += `\n\nAffected appointments:\nDenied: ${data.affectedAppointments.denied}`;
          if (data.affectedAppointments.deniedIds?.length) msg += ` (IDs: ${data.affectedAppointments.deniedIds.join(', ')})`;
          msg += `\nCancelled: ${data.affectedAppointments.cancelled}`;
          if (data.affectedAppointments.cancelledIds?.length) msg += ` (IDs: ${data.affectedAppointments.cancelledIds.join(', ')})`;
        }
        if (data?.emailErrors && data.emailErrors.length) {
          msg += '\n\nEmail errors:' + data.emailErrors.map((e: any) => `\nID ${e.appointmentId}: ${e.error}`).join('');
        }
        alert(msg);
      } catch (e) {
        alert('Date marked unavailable.');
      }
      setUnavailableDate("");
      setUnavailableReason("");
      setIsEmergencyCancellation(false);
      fetchUnavailableDates();
    } catch (err) {
      console.error("Error marking date unavailable:", err);
      alert(err instanceof Error ? err.message : "Failed to mark date unavailable");
    } finally {
      setSavingUnavailable(false);
    }
  };

  const handleRemoveUnavailableDate = async (date: string) => {
    try {
      const response = await fetch(`/API/appointments/unavailable-dates/${encodeURIComponent(date)}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to remove unavailable date");
      }

      fetchUnavailableDates();
    } catch (err) {
      console.error("Error removing unavailable date:", err);
      alert(err instanceof Error ? err.message : "Failed to remove unavailable date");
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === "add-specimen") {
      router.push("/AdminUI/AdminDashBoard/Features/AdminCollection?modal=add-specimen");
      return;
    }

    if (actionId === "add-chemical") {
      router.push("/AdminUI/AdminDashBoard/Features/AdminInventory?modal=add-chemical");
      return;
    }

    if (actionId === "create-announcement") {
      setShowAnnouncementModal(true);
      return;
    }

    if (actionId === "manage-announcements") {
      setShowAnnouncementManagementModal(true);
      return;
    }

    if (actionId === "set-unavailable") {
      setShowUnavailableModal(true);
      fetchUnavailableDates();
      return;
    }

    if (actionId === "see-reports") {
      setShowReportsNavToast(true);
      setTimeout(() => setShowReportsNavToast(false), 2500);
      router.push("/AdminUI/AdminDashBoard/Features/AdminReports");
    }
  };

  const handleAnnouncementSuccess = () => {
    setShowAnnouncementToast(true);
    window.setTimeout(() => setShowAnnouncementToast(false), 2500);
  };

  useEffect(() => {
    let isCancelled = false;

    const fetchSummaryCards = async () => {
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const [microbialsResult, chemicalsResult, batchesResult, appointmentsResult, usersResult, usageResult] =
        await Promise.allSettled([
          fetch(`${API_URL}/microbials?role=staff`, { headers }),
          fetch(`${API_URL}/chemicals`, { headers }),
          fetch(`${API_URL}/batches`, { headers }),
          fetch(`${API_URL}/appointments`, { headers }),
          fetch(`${API_URL}/auth/users`, { headers }),
          fetch(`${API_URL}/usage`, { headers }),
        ]);

      const readJsonIfOk = async <T,>(result: PromiseSettledResult<Response>): Promise<T | null> => {
        if (result.status !== "fulfilled" || !result.value.ok) {
          return null;
        }

        try {
          return (await result.value.json()) as T;
        } catch {
          return null;
        }
      };

      const [microbialsData, chemicalsData, batchesData, appointmentsData, usersData, usageData] = await Promise.all([
        readJsonIfOk<MicrobialItem[]>(microbialsResult),
        readJsonIfOk<ChemicalItem[]>(chemicalsResult),
        readJsonIfOk<BatchItem[]>(batchesResult),
        readJsonIfOk<AppointmentItem[]>(appointmentsResult),
        readJsonIfOk<UsersResponse>(usersResult),
        readJsonIfOk<UsageLogItem[]>(usageResult),
      ]);

      const specimenCount = Array.isArray(microbialsData) ? microbialsData.length : 0;
      const chemicals = Array.isArray(chemicalsData) ? chemicalsData : [];
      const batches = Array.isArray(batchesData) ? batchesData : [];
      const appointments = Array.isArray(appointmentsData) ? appointmentsData : [];
      const users = Array.isArray(usersData?.users) ? usersData.users : [];
      const usageLogs = Array.isArray(usageData) ? usageData : [];

      const activeChemicalIds = new Set(
        batches
          .map((batch) => toNumber(batch.chemical_id))
          .filter((chemicalId) => chemicalId > 0)
      );

      const activeChemicals = chemicals.filter((chemical) =>
        activeChemicalIds.has(toNumber(chemical.chemical_id))
      );

      const remainingByChemicalId = new Map<number, number>();
      batches.forEach((batch) => {
        const chemicalId = toNumber(batch.chemical_id);
        if (chemicalId <= 0) return;

        const total = Math.max(toNumber(batch.quantity), 0);
        const used = Math.max(toNumber(batch.used_quantity), 0);
        const remaining = Math.max(total - used, 0);

        remainingByChemicalId.set(
          chemicalId,
          (remainingByChemicalId.get(chemicalId) || 0) + remaining
        );
      });

      const lowStockCount = activeChemicals.filter((chemical) => {
        const chemicalId = toNumber(chemical.chemical_id);
        const remainingQuantity = remainingByChemicalId.get(chemicalId) ?? toNumber(chemical.quantity);
        return remainingQuantity <= toNumber(chemical.threshold);
      }).length;

      const pendingAppointments = appointments.filter((appointment) => {
        return String(appointment.status || "").toLowerCase() === "pending";
      });

      const pendingInternal = pendingAppointments.filter((appointment) => {
        return String(appointment.appointment_source || "internal").toLowerCase() !== "outsider";
      }).length;

      const pendingOutsider = pendingAppointments.filter((appointment) => {
        return String(appointment.appointment_source || "internal").toLowerCase() === "outsider";
      }).length;

      const pendingToday = pendingAppointments.filter((appointment) => {
        return isTodayLocal(appointment.date);
      }).length;

      const researchAssistants = users.filter(
        (user) => String(user.role || "").toLowerCase() === "staff"
      ).length;
      const faculty = users.filter(
        (user) => String(user.role || "").toLowerCase() === "faculty"
      ).length;
      const students = users.filter(
        (user) => String(user.role || "").toLowerCase() === "student"
      ).length;
      const activeUsers = researchAssistants + faculty + students;

      const ongoingToday = appointments
        .filter((appointment) => {
          return (
            String(appointment.status || "").toLowerCase() === "ongoing" &&
            isTodayLocal(appointment.date)
          );
        })
        .sort((a, b) => {
          const aTime = parseTimestamp(a.date) ?? 0;
          const bTime = parseTimestamp(b.date) ?? 0;
          return aTime - bTime;
        })
        .map((appointment) => mapDashboardAppointment(appointment, "ongoing"));

      const pendingTomorrow = appointments
        .filter((appointment) => {
          return (
            String(appointment.status || "").toLowerCase() === "pending" &&
            isTomorrowLocal(appointment.date)
          );
        })
        .sort((a, b) => {
          const aTime = parseTimestamp(a.date) ?? 0;
          const bTime = parseTimestamp(b.date) ?? 0;
          return aTime - bTime;
        })
        .map((appointment) => mapDashboardAppointment(appointment, "pending"));

      const noShowToday = appointments
        .filter((appointment) => {
          return (
            String(appointment.status || "").toLowerCase() === "no_show" &&
            isTodayLocal(appointment.date)
          );
        })
        .sort((a, b) => {
          const aTime = parseTimestamp(a.date) ?? 0;
          const bTime = parseTimestamp(b.date) ?? 0;
          return aTime - bTime;
        })
        .map((appointment) => mapDashboardAppointment(appointment, "no_show"));

      const activities = buildRecentActivities({
        microbials: Array.isArray(microbialsData) ? microbialsData : [],
        users,
        appointments,
        usageLogs,
      });

      const inventoryData = buildInventoryChartData({
        chemicals,
        batches,
      });

      const mappedSpecimenOverview = (Array.isArray(microbialsData) ? microbialsData : [])
        .slice()
        .sort((a, b) => {
          const aTime = parseTimestamp(a.updated_at || a.created_at) ?? 0;
          const bTime = parseTimestamp(b.updated_at || b.created_at) ?? 0;
          return bTime - aTime;
        })
        .slice(0, 5)
        .map((microbial) => {
          return {
            id: String(microbial._id || `${microbial.code_name || "specimen"}-${Date.now()}`),
            name: String(microbial.code_name || "Unnamed specimen"),
            category: String(microbial.classification || "Uncategorized"),
            updatedBy: resolveUpdatedBy(microbial),
            updatedAt: formatDateTime(microbial.updated_at || microbial.created_at),
            notes: String(microbial.update_notes || microbial.notes || "-").trim() || "-",
          };
        });

      if (!isCancelled) {
        setSummaryCards(
          createSummaryCards({
            specimenCount,
            chemicalCount: activeChemicals.length,
            lowStockCount,
            pendingAppointments: pendingAppointments.length,
            pendingInternal,
            pendingOutsider,
            pendingToday,
            registeredUsers: users.length,
          })
        );
        setRecentActivities(activities);
        setInventoryChartData(inventoryData);
        setTodayOngoingAppointments(ongoingToday);
        setTodayNoShowAppointments(noShowToday);
        setTomorrowPendingAppointments(pendingTomorrow);
        setSpecimenOverview(mappedSpecimenOverview);
        setUserRoleSummary({
          activeUsers,
          researchAssistants,
          faculty,
          students,
        });
      }
    };

    fetchSummaryCards();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">

      {/* HEADER */}
      <h1 className="text-2xl font-bold text-[#113F67]">Dashboard</h1>
      <p className="text-sm text-[#113F67] mb-6">
        Laboratory Information & Inventory Management
      </p>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {card.value}
                </p>
                <p
                  className={`text-xs ${
                    card.trend === "warning"
                      ? "text-yellow-500"
                      : card.trend === "up"
                      ? "text-green-500"
                      : "text-gray-400"
                  }`}
                >
                  {card.sub}
                </p>
              </div>

              <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100">
                <card.icon className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* USER ROLE OVERVIEW */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">User Role Overview</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">Active Users</p>
            <p className="text-2xl font-bold text-[#113F67]">{formatCount(userRoleSummary.activeUsers)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">Research Assistants</p>
            <p className="text-2xl font-bold text-[#113F67]">{formatCount(userRoleSummary.researchAssistants)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">Faculty</p>
            <p className="text-2xl font-bold text-[#113F67]">{formatCount(userRoleSummary.faculty)}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs uppercase text-gray-500">Students</p>
            <p className="text-2xl font-bold text-[#113F67]">{formatCount(userRoleSummary.students)}</p>
          </div>
        </div>
      </div>

      {/* ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ACTIVITY */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>

            <div className="space-y-3">
              {recentActivities.map((a) => {
                const config = getActivityConfig(a.text);
                const Icon = config.icon;

                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition w-full"
                  >
                    <div className={`h-8 w-8 flex items-center justify-center rounded-md ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{a.text}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.time}</p>
                    </div>
                  </div>
                );
              })}

              {recentActivities.length === 0 && (
                <p className="text-sm text-gray-500">No recent activity yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* CHART */}
        <div className="lg:col-span-1">
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Inventory Status
            </h3>

            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const normalizedValue = Array.isArray(value)
                        ? value.join(" / ")
                        : value ?? 0;

                      return [`${normalizedValue}%`, "Stock Left"];
                    }}
                    contentStyle={{
                      borderRadius: "10px",
                      border: "1px solid #e5e7eb",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "rgba(0,0,0,0.03)" }}
                  />
                  <Bar dataKey="stock" fill="#113F67" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {inventoryChartData.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">No inventory data available.</p>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* ACTIONS */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Quick Actions
            </h3>

            <div className="flex justify-center">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-md">
                {dashboardData.actions.map((a) => {
                  const Icon = a.icon;

                  return (
                    <button
                      key={a.id}
                      onClick={() => handleQuickAction(a.id)}
                      className="cursor-pointer flex flex-col items-center justify-center gap-2 py-4 text-xs font-medium rounded-xl border border-gray-200 hover:bg-gray-100 hover:border-[#113F67] transition-all duration-150"
                    >
                      <Icon className="h-5 w-5 text-[#113F67]" />
                      <span className="text-[#113F67]">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* APPOINTMENTS */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="pb-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Today's Appointments
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Ongoing Appointments Today
                  </p>
                  <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 text-[10px] font-semibold px-2 py-0.5 min-w-6">
                    {todayOngoingAppointments.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {todayOngoingAppointments.map((appointment) => (
                    <div
                      key={`today-${appointment.id}`}
                      className="flex items-center justify-between py-2 border-b last:border-0 border-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{appointment.time}</span>
                        </div>

                        <span className="text-sm text-gray-900 truncate">{appointment.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${appointment.source === "outsider" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {appointment.source}
                        </span>
                      </div>

                      <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-green-100 text-green-600">
                        ongoing
                      </span>
                    </div>
                  ))}

                  {todayOngoingAppointments.length === 0 && (
                    <p className="text-sm text-gray-500">No ongoing appointments for today.</p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    No-Show Appointments Today
                  </p>
                  <span className="inline-flex items-center justify-center rounded-full bg-red-100 text-red-700 text-[10px] font-semibold px-2 py-0.5 min-w-6">
                    {todayNoShowAppointments.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {todayNoShowAppointments.map((appointment) => (
                    <div
                      key={`today-no-show-${appointment.id}`}
                      className="flex items-center justify-between py-2 border-b last:border-0 border-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{appointment.time}</span>
                        </div>

                        <span className="text-sm text-gray-900 truncate">{appointment.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${appointment.source === "outsider" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {appointment.source}
                        </span>
                      </div>

                      <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-red-100 text-red-700">
                        no-show
                      </span>
                    </div>
                  ))}

                  {todayNoShowAppointments.length === 0 && (
                    <p className="text-sm text-gray-500">No no-show appointments for today.</p>
                  )}
                </div>
              </div>

              <div>
                {(() => {
                  const outsiderTomorrowCount = tomorrowPendingAppointments.filter(
                    (appointment) => appointment.source === "outsider"
                  ).length;

                  return (
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Pending Appointments for Tomorrow
                  </p>
                  <span className="inline-flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700 text-[10px] font-semibold px-2 py-0.5 min-w-6">
                    {tomorrowPendingAppointments.length}
                  </span>
                  <span className="inline-flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 min-w-6">
                    Outsider: {outsiderTomorrowCount}
                  </span>
                </div>
                  );
                })()}

                <div className="space-y-2">
                  {tomorrowPendingAppointments.map((appointment) => (
                    <div
                      key={`tomorrow-${appointment.id}`}
                      className="flex items-center justify-between py-2 border-b last:border-0 border-gray-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{appointment.time}</span>
                        </div>

                        <span className="text-sm text-gray-900 truncate">{appointment.title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${appointment.source === "outsider" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                          {appointment.source}
                        </span>
                      </div>

                      <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-yellow-100 text-yellow-700">
                        pending
                      </span>
                    </div>
                  ))}

                  {tomorrowPendingAppointments.length === 0 && (
                    <p className="text-sm text-gray-500">No pending appointments for tomorrow.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 3 - TABLE */}
      <div>

      {showUnavailableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-lg font-semibold text-gray-900">Set Date Unavailable</h2>
              <button
                onClick={() => setShowUnavailableModal(false)}
                className="cursor-pointer rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              <p className="text-sm text-gray-600">
                Standard cancellations must be made at least 24 hours before the appointment date. Use Emergency Cancellation Override only for urgent cases such as outages, maintenance, or safety issues.
              </p>

              <div className="grid gap-3 md:grid-cols-3">
                <input
                  type="date"
                  value={unavailableDate}
                  onChange={(e) => setUnavailableDate(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2"
                />
                <input
                  type="text"
                  value={unavailableReason}
                  onChange={(e) => setUnavailableReason(e.target.value)}
                  placeholder="Reason (e.g. lab maintenance)"
                  className="rounded-md border border-gray-300 px-3 py-2 md:col-span-2"
                />
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isEmergencyCancellation}
                  onChange={(e) => setIsEmergencyCancellation(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-[#113F67] focus:ring-[#113F67]"
                />
                <span>
                  Emergency Cancellation Override
                  <span className="block text-xs text-gray-500">
                    Requires a reason, logs the override, and emails affected users immediately.
                  </span>
                </span>
              </label>

              <div>
                <button
                  onClick={handleSetUnavailableDate}
                  disabled={savingUnavailable}
                  className="cursor-pointer rounded-md bg-[#113F67] px-4 py-2 text-white hover:bg-orange-700 disabled:opacity-60 "
                >
                  {savingUnavailable ? "Saving..." : "Mark Unavailable"}
                </button>
              </div>

              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {unavailableDates.length === 0 ? (
                  <p className="text-sm text-gray-500">No blocked dates yet.</p>
                ) : (
                  unavailableDates.slice(0, 20).map((item) => (
                    <div
                      key={item.unavailable_id}
                      className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
                    >
                      <span>
                          {format(new Date(`${item.unavailable_date}T00:00:00`), "MMM dd, yyyy")} - {item.reason}
                          {item.is_emergency ? " • Emergency override" : ""}
                      </span>
                      <button
                        onClick={() => handleRemoveUnavailableDate(item.unavailable_date)}
                        className="font-semibold text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AnnouncementComposerModal
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={handleAnnouncementSuccess}
      />

      <AnnouncementManagementModal
        isOpen={showAnnouncementManagementModal}
        onClose={() => setShowAnnouncementManagementModal(false)}
      />

      {showAnnouncementToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-xl shadow-emerald-100">
          <p className="text-sm font-semibold text-emerald-700">Announcement published</p>
          <p className="text-xs text-slate-500">The post is now visible on the homepage feed.</p>
        </div>
      )}
        <div className="rounded-2xl border border-white bg-white p-5 shadow-sm">
          <div className="pb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Specimen Overview
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Name</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Category</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Updated By</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Date Updated</th>
                  <th className="text-left text-[11px] uppercase tracking-wider text-gray-500 font-semibold py-2">Notes</th>
                </tr>
              </thead>

              <tbody>
                {specimenOverview.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="text-sm font-medium text-gray-900 py-2">{s.name}</td>
                    <td className="text-sm text-gray-500 py-2">{s.category}</td>
                    <td className="text-sm text-gray-500 py-2">{s.updatedBy}</td>
                    <td className="text-sm text-gray-500 py-2">{s.updatedAt}</td>
                    <td className="text-sm text-gray-500 py-2 max-w-xs truncate" title={s.notes}>{s.notes}</td>
                  </tr>
                ))}
                {specimenOverview.length === 0 && (
                  <tr>
                    <td className="text-sm text-gray-500 py-3" colSpan={6}>
                      No specimen update history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showReportsNavToast && (
        <div className="fixed right-4 top-20 z-50 rounded-lg border border-blue-200 bg-white px-3 py-2 shadow-md">
          <div className="flex items-center gap-2 text-sm text-[#113F67]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Opening Reports...
          </div>
        </div>
      )}
    </div>
  );
}