"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";
import { getUserData } from "@/app/utils/authUtil";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Download, FileText, RefreshCcw, Trash2, Loader2, TrendingUp, ListOrdered, TriangleAlert } from "lucide-react";
import { jsPDF } from "jspdf";

type ReportPeriod = "weekly" | "monthly";

type TopUsedChemicalItem = {
  rank: number;
  chemical_id: number;
  chemical_name: string;
  chemical_type: string;
  unit: string;
  total_used: number;
  usage_logs: number;
  last_used_at: string | null;
};

type TopChemicalsResponse = {
  period: ReportPeriod;
  items: TopUsedChemicalItem[];
};

type ForecastItem = {
  chemical_id: number;
  chemical_name: string;
  chemical_type: string;
  unit: string;
  lead_time_days: number;
  safety_stock: number;
  current_stock: number;
  avg_daily_usage: number;
  forecast_days: number;
  forecast_usage: number;
  days_to_stockout: number | null;
  reorder_point: number;
  recommended_reorder_qty: number;
  risk_level: "stable" | "low" | "medium" | "high";
};

type ForecastResponse = {
  period: ReportPeriod;
  forecast_days: number;
  overview: {
    total_items: number;
    at_risk_count: number;
    high_risk_count: number;
    predicted_usage_total: number;
  };
  items: ForecastItem[];
};

type AppointmentItem = {
  appointment_id?: number | string | null;
  user_id?: number | string | null;
  status?: string | null;
  appointment_source?: string | null;
  date?: string | Date | null;
  no_show_at?: string | Date | null;
  requester_name?: string | null;
  requester_email?: string | null;
  purpose?: string | null;
};

type UsageItem = {
  log_id?: number | string | null;
  date_used?: string | Date | null;
  chemical_id?: number | string | null;
  user_id?: number | string | null;
  amount_used?: number | string | null;
  purpose?: string | null;
};

type MicrobialItem = {
  _id?: string;
  created_at?: string | Date | null;
  code_name?: string | null;
  classification?: string | null;
  publish_status?: string | null;
};

type ChemicalItem = {
  chemical_id?: number | string | null;
  name?: string | null;
  unit?: string | null;
  type?: string | null;
  quantity?: number | string | null;
  threshold?: number | string | null;
};

type BatchItem = {
  chemical_id?: number | string | null;
  quantity?: number | string | null;
  used_quantity?: number | string | null;
};

type UserItem = {
  user_id?: number | string | null;
  created_at?: string | Date | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  role?: string | null;
  deleted_at?: string | null;
};

type UsersResponse = {
  users?: UserItem[];
};

type CollectionActivityItem = {
  _id?: string | null;
  specimen_id?: string | null;
  project_id?: string | null;
  user_id?: number | string | null;
  action?: string | null;
  status?: string | null;
  description?: string | null;
  created_at?: string | Date | null;
};

type StatusBreakdown = {
  name: string;
  value: number;
};

type ActivityByDay = {
  day: string;
  appointments: number;
  usageLogs: number;
  specimens: number;
  users: number;
};

type ReportSummary = {
  appointments: number;
  internalAppointments?: number;
  outsiderAppointments?: number;
  usageLogs: number;
  newSpecimens: number;
  newUsers: number;
  activeChemicals: number;
};

type ReportSnapshot = {
  id: string;
  createdAt: string;
  period: ReportPeriod;
  rangeLabel: string;
  summary: ReportSummary;
  statusBreakdown: StatusBreakdown[];
  appointmentSourceBreakdown?: StatusBreakdown[];
  activityByDay: ActivityByDay[];
  ledger?: ReportLedger;
  moduleStats?: Record<LedgerModuleKey, any>;
};

type LedgerModuleKey = "collections" | "inventory" | "users" | "appointments";

type ReportLedgerEntry = {
  date: string;
  description: string;
  userDisplay: string;
  action: string;
  status: string;
};

type ReportLedger = Record<LedgerModuleKey, ReportLedgerEntry[]>;

const PIE_COLORS = ["#113F67", "#10B981", "#F59E0B", "#EF4444", "#6B7280", "#3B82F6"];
const LEDGER_MODULE_KEYS: LedgerModuleKey[] = ["appointments", "collections", "inventory", "users"];

const toNumber = (value: number | string | null | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCount = (value: number) => new Intl.NumberFormat().format(value);

const formatQuantity = (value: number, unit?: string) => {
  const formatted = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
  return `${formatted}${unit ? ` ${unit}` : ""}`;
};

const getRiskPillClass = (risk: ForecastItem["risk_level"]) => {
  if (risk === "high") return "bg-red-100 text-red-700";
  if (risk === "medium") return "bg-amber-100 text-amber-700";
  if (risk === "low") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-700";
};

const parseDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const dayLabel = (date: Date) => {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getRange = (period: ReportPeriod) => {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(end.getDate() - (period === "weekly" ? 6 : 29));
  start.setHours(0, 0, 0, 0);

  return { start, end };
};

const inRange = (input: string | Date | null | undefined, start: Date, end: Date) => {
  const date = parseDate(input);
  if (!date) return false;
  return date >= start && date <= end;
};

const getStatusLabel = (status: string) => {
  const normalized = String(status || "unknown").toLowerCase();
  if (normalized === "no_show") return "No-Show";
  return normalized.replace(/_/g, " ");
};

const toTitleCase = (value: string) => {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const formatUserDisplay = (user?: UserItem | null, fallbackName?: string | null, fallbackEmail?: string | null) => {
  const name = `${user?.first_name || ""} ${user?.last_name || ""}`.trim();
  const email = user?.email || "";

  const resolvedName = name || String(fallbackName || "").trim();
  const resolvedEmail = email || String(fallbackEmail || "").trim();

  if (resolvedName && resolvedEmail) return `${resolvedName} (${resolvedEmail})`;
  if (resolvedName) return resolvedName;
  if (resolvedEmail) return resolvedEmail;
  return "System";
};

const formatLedgerDate = (value: string | Date | null | undefined) => {
  const parsed = parseDate(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const compareLedgerDates = (a: ReportLedgerEntry, b: ReportLedgerEntry) => {
  const left = parseDate(a.date)?.getTime() ?? 0;
  const right = parseDate(b.date)?.getTime() ?? 0;
  return left - right;
};

const getAppointmentReportDate = (appointment: AppointmentItem) => {
  const status = String(appointment.status || "").toLowerCase();
  if (status === "no_show") {
    return appointment.no_show_at || appointment.date || null;
  }
  return appointment.date || null;
};

const makeCsv = (report: ReportSnapshot) => {
  const lines: string[] = [];
  lines.push("Section,Metric,Value");
  lines.push(`Meta,Generated At,${report.createdAt}`);
  lines.push(`Meta,Period,${report.period}`);
  lines.push(`Meta,Range,${report.rangeLabel}`);
  lines.push(`Summary,Appointments,${report.summary.appointments}`);
  lines.push(`Summary,Internal Appointments,${report.summary.internalAppointments ?? 0}`);
  lines.push(`Summary,Outsider Appointments,${report.summary.outsiderAppointments ?? 0}`);
  lines.push(`Summary,Usage Logs,${report.summary.usageLogs}`);
  lines.push(`Summary,New Specimens,${report.summary.newSpecimens}`);
  lines.push(`Summary,New Users,${report.summary.newUsers}`);
  lines.push(`Summary,Active Chemicals,${report.summary.activeChemicals}`);

  lines.push("\nStatus Breakdown,Status,Count");
  report.statusBreakdown.forEach((item) => {
    lines.push(`Status Breakdown,${item.name},${item.value}`);
  });

  lines.push("\nAppointment Source Breakdown,Source,Count");
  (report.appointmentSourceBreakdown || []).forEach((item) => {
    lines.push(`Appointment Source Breakdown,${item.name},${item.value}`);
  });

  lines.push("\nActivity Timeline,Day,Appointments,Usage Logs,Specimens,Users");
  report.activityByDay.forEach((item) => {
    lines.push(
      `Activity Timeline,${item.day},${item.appointments},${item.usageLogs},${item.specimens},${item.users}`
    );
  });

  return lines.join("\n");
};

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const toImageDataUrl = async (path: string) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Unable to load report logo");
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to convert report logo"));
    };
    reader.onerror = () => reject(new Error("Unable to read report logo"));
    reader.readAsDataURL(blob);
  });
};

const exportReportPdf = async (report: ReportSnapshot, selectedModules: LedgerModuleKey[]) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const printedAt = new Date();

  const addDivider = (y: number) => {
    doc.setDrawColor(214, 222, 231);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
  };

  const ensureRoom = (currentY: number, needed: number) => {
    if (currentY + needed <= pageHeight - 20) {
      return currentY;
    }
    doc.addPage();
    return margin;
  };

  let y = margin;
  const logoWidth = 16;
  const logoHeight = 16;

  try {
    const logoDataUrl = await toImageDataUrl("/UI/img/logo-biocella.png");
    doc.addImage(logoDataUrl, "PNG", margin, y - 1, logoWidth, logoHeight);
  } catch {
    doc.setDrawColor(17, 63, 103);
    doc.setLineWidth(0.5);
    doc.rect(margin, y, logoWidth, logoHeight);
    doc.setFontSize(8);
    doc.setTextColor(17, 63, 103);
    doc.text("LOGO", margin + 3.5, y + 9.5);
  }

  doc.setFont("helvetica", "bold");
  doc.setTextColor(17, 63, 103);
  doc.setFontSize(18);
  doc.text("BIOCELLA Analytics Report", margin + logoWidth + 4, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(67, 84, 99);
  doc.text(`Date Range: ${report.rangeLabel}`, margin + logoWidth + 4, y + 12);
  y += 22;

  addDivider(y);
  y += 7;

  const moduleLabels: Record<LedgerModuleKey, string> = {
    collections: "Collections",
    inventory: "Inventory",
    users: "Users",
    appointments: "Appointments",
  };

  const ledger = report.ledger || {
    collections: [],
    inventory: [],
    users: [],
    appointments: [],
  };

  const selected = selectedModules.length > 0
    ? selectedModules
    : (Object.keys(moduleLabels) as LedgerModuleKey[]);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(67, 84, 99);
  doc.text(`Included Modules: ${selected.map((key) => moduleLabels[key]).join(", ")}`, margin, y);
  y += 8;

  const columns = [
    { key: "date", label: "Date", width: 24 },
    { key: "description", label: "Description", width: 70 },
    { key: "userDisplay", label: "User", width: 45 },
    { key: "action", label: "Action", width: 25 },
    { key: "status", label: "Status", width: 18 },
  ] as const;

  const columnStarts = columns.reduce<number[]>((acc, column, index) => {
    const previous = index === 0 ? margin : acc[index - 1] + columns[index - 1].width;
    acc.push(previous);
    return acc;
  }, []);

  const drawTableHeader = (tableY: number) => {
    doc.setFillColor(235, 242, 247);
    doc.rect(margin, tableY, contentWidth, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 63, 103);
    doc.setFontSize(9.5);
    columns.forEach((column, index) => {
      doc.text(column.label, columnStarts[index] + 2, tableY + 4.8);
    });
  };

  const drawRow = (entry: ReportLedgerEntry, index: number) => {
    const cells = {
      date: formatLedgerDate(entry.date),
      description: entry.description || "-",
      userDisplay: entry.userDisplay || "System",
      action: entry.action || "-",
      status: entry.status || "-",
    };

    const lineHeight = 4.1;
    const descriptionLines = doc.splitTextToSize(cells.description, columns[1].width - 3);
    const userLines = doc.splitTextToSize(cells.userDisplay, columns[2].width - 3);
    const actionLines = doc.splitTextToSize(cells.action, columns[3].width - 3);
    const statusLines = doc.splitTextToSize(cells.status, columns[4].width - 3);
    const maxLines = Math.max(
      descriptionLines.length,
      userLines.length,
      actionLines.length,
      statusLines.length,
      1
    );

    const rowHeight = Math.max(6, maxLines * lineHeight + 2);
    y = ensureRoom(y, rowHeight + 1);
    if (y === margin) {
      drawTableHeader(y);
      y += 7;
    }

    if (index % 2 === 0) {
      doc.setFillColor(248, 251, 253);
      doc.rect(margin, y, contentWidth, rowHeight, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(24, 39, 51);
    doc.setFontSize(9.2);
    doc.text(cells.date, columnStarts[0] + 2, y + lineHeight);
    doc.text(descriptionLines, columnStarts[1] + 2, y + lineHeight);
    doc.text(userLines, columnStarts[2] + 2, y + lineHeight);
    doc.text(actionLines, columnStarts[3] + 2, y + lineHeight);
    doc.text(statusLines, columnStarts[4] + 2, y + lineHeight);

    y += rowHeight;
  };

  selected.forEach((moduleKey) => {
    y = ensureRoom(y, 14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 63, 103);
    doc.setFontSize(12);
    doc.text(moduleLabels[moduleKey], margin, y);
    y += 6;

    // Module summary card (if present)
    const moduleStats = (report as any).moduleStats || {};
    const stats = moduleStats[moduleKey] || null;
    if (stats) {
      const statLines: string[] = [];
      if (moduleKey === "collections") {
        statLines.push(`Specimen published: ${formatCount(stats.publishedInPeriod || 0)}`);
        statLines.push(`Total unpublished specimen: ${formatCount(stats.totalUnpublished || 0)}`);
        statLines.push(`Updated specimen: ${formatCount(stats.updated || 0)}`);
        statLines.push(`Deleted specimen: ${formatCount(stats.deleted || 0)}`);
        statLines.push(`New specimen: ${formatCount(stats.new || 0)}`);
      } else if (moduleKey === "inventory") {
        statLines.push(`Low stock: ${formatCount(stats.lowStock || 0)}`);
        statLines.push(`Usage logs: ${formatCount(stats.usageLogs || 0)}`);
        statLines.push(`New batches/logs: ${formatCount(stats.new || 0)}`);
        statLines.push(`Updated inventory: ${formatCount(stats.updated || 0)}`);
        statLines.push(`Deleted inventory: ${formatCount(stats.deleted || 0)}`);
      } else if (moduleKey === "users") {
        statLines.push(`Total users: ${formatCount(stats.totalUsers || 0)}`);
        statLines.push(`New users: ${formatCount(stats.new || 0)}`);
        statLines.push(`Updated users: ${formatCount(stats.updated || 0)}`);
        statLines.push(`Deactivated users: ${formatCount(stats.deactivated || 0)}`);
      } else if (moduleKey === "appointments") {
        statLines.push(`Missed appointments: ${formatCount(stats.missed || 0)}`);
        statLines.push(`Pending appointments: ${formatCount(stats.pending || 0)}`);
        statLines.push(`Ongoing appointments: ${formatCount(stats.ongoing || 0)}`);
        statLines.push(`Denied appointments: ${formatCount(stats.denied || 0)}`);
        statLines.push(`External appointments: ${formatCount(stats.external || 0)}`);
        statLines.push(`Internal appointments: ${formatCount(stats.internal || 0)}`);
      }

      const cardHeight = Math.max(22, 12 + statLines.length * 5 + 4);
      y = ensureRoom(y, cardHeight + 2);
      doc.setFillColor(250, 251, 252);
      doc.rect(margin, y, contentWidth, cardHeight, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(24, 39, 51);
      doc.text("Summary:", margin + 4, y + 7);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);

      statLines.forEach((line, idx) => {
        doc.text(line, margin + 8, y + 12 + idx * 5);
      });
      y += cardHeight + 4;
      // Draw table header after the stats card
      drawTableHeader(y);
      y += 7;
    } else {
      drawTableHeader(y);
      y += 7;
    }

    const entries = ledger[moduleKey] || [];
    if (entries.length === 0) {
      drawRow(
        {
          date: "",
          description: "No activity recorded for this module.",
          userDisplay: "System",
          action: "-",
          status: "-",
        },
        0
      );
      y += 4;
      return;
    }

    entries.forEach((entry, index) => {
      drawRow(entry, index);
    });

    y += 6;
  });

  const footerText = `Printed by Biocella on ${printedAt.toLocaleDateString()} ${printedAt.toLocaleTimeString()}`;
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(108, 117, 125);
    doc.text(footerText, margin, pageHeight - 8);
  }

  doc.save(`biocella-report-${report.period}-${report.id}.pdf`);
};

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [topUsedChemicals, setTopUsedChemicals] = useState<TopUsedChemicalItem[]>([]);
  const [forecastItems, setForecastItems] = useState<ForecastItem[]>([]);
  const [forecastOverview, setForecastOverview] = useState<ForecastResponse["overview"]>({
    total_items: 0,
    at_risk_count: 0,
    high_risk_count: 0,
    predicted_usage_total: 0,
  });
  const [savedReports, setSavedReports] = useState<ReportSnapshot[]>([]);
  const [currentReport, setCurrentReport] = useState<ReportSnapshot | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [moduleSelection, setModuleSelection] = useState<Record<LedgerModuleKey | "all", boolean>>({
    all: true,
    collections: true,
    inventory: true,
    users: true,
    appointments: true,
  });

  const selectedModules = useMemo(
    () => LEDGER_MODULE_KEYS.filter((key) => moduleSelection[key]),
    [moduleSelection]
  );

  const toggleAllModules = (checked: boolean) => {
    setModuleSelection({
      all: checked,
      collections: checked,
      inventory: checked,
      users: checked,
      appointments: checked,
    });
  };

  const toggleModule = (key: LedgerModuleKey, checked: boolean) => {
    setModuleSelection((prev) => {
      const next = { ...prev, [key]: checked } as Record<LedgerModuleKey | "all", boolean>;
      const allSelected = LEDGER_MODULE_KEYS.every((moduleKey) => next[moduleKey]);
      next.all = allSelected;
      return next;
    });
  };

  const fetchSavedReports = async (userId: number) => {
    const response = await fetch(`/API/reports?user_id=${userId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to fetch saved reports");
    }

    const reports = Array.isArray(data.reports) ? (data.reports as ReportSnapshot[]) : [];
    setSavedReports(reports);
    if (!currentReport && reports.length > 0) {
      setCurrentReport(reports[0]);
    }
  };

  useEffect(() => {
    setInitialLoading(true);
    const user = getUserData();
    const userId = Number(user?.userId);

    if (!Number.isFinite(userId) || userId <= 0) {
      setError("Unable to identify your account. Please sign in again.");
      setInitialLoading(false);
      return;
    }

    setCurrentUserId(userId);
    fetchSavedReports(userId).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to fetch saved reports");
    }).finally(() => {
      setInitialLoading(false);
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const fetchInventoryForecasting = async () => {
      setForecastLoading(true);
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      try {
        const [topRes, forecastRes] = await Promise.all([
          fetch(`${API_URL}/usage/top-chemicals?period=${period}&limit=5`, { headers }),
          fetch(`${API_URL}/usage/forecast?period=${period}&limit=6`, { headers }),
        ]);

        const topData = (topRes.ok ? await topRes.json() : { items: [] }) as TopChemicalsResponse;
        const forecastData = (forecastRes.ok
          ? await forecastRes.json()
          : {
              overview: {
                total_items: 0,
                at_risk_count: 0,
                high_risk_count: 0,
                predicted_usage_total: 0,
              },
              items: [],
            }) as ForecastResponse;

        if (!isCancelled) {
          setTopUsedChemicals(Array.isArray(topData.items) ? topData.items : []);
          setForecastItems(Array.isArray(forecastData.items) ? forecastData.items : []);
          setForecastOverview(
            forecastData.overview || {
              total_items: 0,
              at_risk_count: 0,
              high_risk_count: 0,
              predicted_usage_total: 0,
            }
          );
        }
      } catch (err) {
        console.error("Error fetching inventory forecasting analytics:", err);
        if (!isCancelled) {
          setTopUsedChemicals([]);
          setForecastItems([]);
          setForecastOverview({
            total_items: 0,
            at_risk_count: 0,
            high_risk_count: 0,
            predicted_usage_total: 0,
          });
        }
      } finally {
        if (!isCancelled) {
          setForecastLoading(false);
        }
      }
    };

    fetchInventoryForecasting();

    return () => {
      isCancelled = true;
    };
  }, [period]);

  const generateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!currentUserId) {
        throw new Error("Unable to identify your account. Please sign in again.");
      }

      const { start, end } = getRange(period);
      const headers = {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      };

      const activityQuery = new URLSearchParams({
        start_date: dayKey(start),
        end_date: dayKey(end),
      }).toString();

      const [
        appointmentsRes,
        usageRes,
        microbialsRes,
        usersRes,
        chemicalsRes,
        batchesRes,
        collectionActivityRes,
      ] = await Promise.all([
        fetch(`${API_URL}/appointments`, { headers }),
        fetch(`${API_URL}/usage`, { headers }),
        fetch(`${API_URL}/microbials?role=staff`, { headers }),
        fetch(`${API_URL}/auth/users`, { headers }),
        fetch(`${API_URL}/chemicals`, { headers }),
        fetch(`${API_URL}/batches`, { headers }),
        fetch(`${API_URL}/collection-activity?${activityQuery}`, { headers }),
      ]);

      const appointments = (appointmentsRes.ok ? await appointmentsRes.json() : []) as AppointmentItem[];
      const usageLogs = (usageRes.ok ? await usageRes.json() : []) as UsageItem[];
      const microbials = (microbialsRes.ok ? await microbialsRes.json() : []) as MicrobialItem[];
      const usersData = (usersRes.ok ? await usersRes.json() : { users: [] }) as UsersResponse;
      const chemicals = (chemicalsRes.ok ? await chemicalsRes.json() : []) as ChemicalItem[];
      const batches = (batchesRes.ok ? await batchesRes.json() : []) as BatchItem[];
      const collectionActivity = (collectionActivityRes.ok
        ? await collectionActivityRes.json()
        : []) as CollectionActivityItem[];
      const users = Array.isArray(usersData.users) ? usersData.users : [];

      const appointmentsInRange = appointments.filter((a) => inRange(getAppointmentReportDate(a), start, end));
      const usageInRange = usageLogs.filter((u) => inRange(u.date_used, start, end));
      const specimensInRange = microbials.filter((m) => inRange(m.created_at, start, end));
      const usersInRange = users.filter((u) => inRange(u.created_at, start, end));
      const activityInRange = collectionActivity.filter((item) => inRange(item.created_at, start, end));

      const userById = new Map<number, UserItem>();
      users.forEach((user) => {
        const id = toNumber(user.user_id);
        if (id > 0) userById.set(id, user);
      });

      const chemicalById = new Map<number, ChemicalItem>();
      chemicals.forEach((chemical) => {
        const id = toNumber(chemical.chemical_id);
        if (id > 0) chemicalById.set(id, chemical);
      });

      const activeChemicalIds = new Set(
        batches.map((batch) => toNumber(batch.chemical_id)).filter((id) => id > 0)
      );
      const activeChemicals = chemicals.filter((chemical) =>
        activeChemicalIds.has(toNumber(chemical.chemical_id))
      );

      const statusMap = new Map<string, number>();
      appointmentsInRange.forEach((appointment) => {
        const status = getStatusLabel(String(appointment.status || "unknown"));
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusBreakdown: StatusBreakdown[] = Array.from(statusMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const sourceMap = new Map<string, number>();
      appointmentsInRange.forEach((appointment) => {
        const source = String(appointment.appointment_source || "internal").toLowerCase() === "outsider"
          ? "Outsider"
          : "Internal";
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);
      });

      const appointmentSourceBreakdown: StatusBreakdown[] = Array.from(sourceMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const internalAppointments = appointmentSourceBreakdown.find((item) => item.name === "Internal")?.value || 0;
      const outsiderAppointments = appointmentSourceBreakdown.find((item) => item.name === "Outsider")?.value || 0;

      const dayMap = new Map<string, ActivityByDay>();
      const cursor = new Date(start);
      while (cursor <= end) {
        dayMap.set(dayKey(cursor), {
          day: dayLabel(cursor),
          appointments: 0,
          usageLogs: 0,
          specimens: 0,
          users: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
      }

      appointmentsInRange.forEach((item) => {
        const d = parseDate(getAppointmentReportDate(item));
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.appointments += 1;
      });

      usageInRange.forEach((item) => {
        const d = parseDate(item.date_used);
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.usageLogs += 1;
      });

      specimensInRange.forEach((item) => {
        const d = parseDate(item.created_at);
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.specimens += 1;
      });

      usersInRange.forEach((item) => {
        const d = parseDate(item.created_at);
        if (!d) return;
        const record = dayMap.get(dayKey(d));
        if (record) record.users += 1;
      });

      const ledger: ReportLedger = {
        collections: activityInRange
          .map((activity) => {
            const createdAt = parseDate(activity.created_at);
            const action = activity.action
              ? toTitleCase(String(activity.action).replace(/_/g, " "))
              : "Update";
            const status = activity.status
              ? toTitleCase(String(activity.status).replace(/_/g, " "))
              : "Recorded";
            const user = userById.get(toNumber(activity.user_id));
            return {
              date: createdAt ? createdAt.toISOString() : "",
              description: String(activity.description || "Specimen activity"),
              userDisplay: formatUserDisplay(user),
              action,
              status,
            };
          })
          .sort(compareLedgerDates),
        inventory: usageInRange
          .map((log) => {
            const usedAt = parseDate(log.date_used);
            const chemical = chemicalById.get(toNumber(log.chemical_id));
            const amount = toNumber(log.amount_used);
            const unit = chemical?.unit ? String(chemical.unit) : undefined;
            const baseLabel = chemical?.name ? String(chemical.name) : "Chemical";
            const usageLabel = amount > 0 ? formatQuantity(amount, unit) : "Usage logged";
            const purpose = String(log.purpose || "").trim();
            const description = [baseLabel, usageLabel, purpose ? `(${purpose})` : ""].filter(Boolean).join(" ");
            const user = userById.get(toNumber(log.user_id));

            return {
              date: usedAt ? usedAt.toISOString() : "",
              description,
              userDisplay: formatUserDisplay(user),
              action: "Usage Log",
              status: "Logged",
            };
          })
          .sort(compareLedgerDates),
        users: usersInRange
          .map((user) => {
            const createdAt = parseDate(user.created_at);
            const role = user.role ? toTitleCase(String(user.role)) : "User";
            return {
              date: createdAt ? createdAt.toISOString() : "",
              description: "New user registered",
              userDisplay: formatUserDisplay(user),
              action: "Create User",
              status: role,
            };
          })
          .sort(compareLedgerDates),
        appointments: appointmentsInRange
          .map((appointment) => {
            const recordDate = parseDate(getAppointmentReportDate(appointment));
            const user = userById.get(toNumber(appointment.user_id));
            const description = String(appointment.purpose || "Appointment request").trim() || "Appointment request";
            return {
              date: recordDate ? recordDate.toISOString() : "",
              description,
              userDisplay: formatUserDisplay(user, appointment.requester_name, appointment.requester_email),
              action: "Create Appointment",
              status: toTitleCase(getStatusLabel(String(appointment.status || "unknown"))),
            };
          })
          .sort(compareLedgerDates),
      };

      // Build module-level statistics to include in the report payload
      const collectionsLedger = ledger.collections || [];
      const lc = (s: string | undefined | null) => String(s || "").toLowerCase();

      const collectionsStats = {
        publishedInPeriod: specimensInRange.filter((m) => lc(m.publish_status) === "published").length,
        totalUnpublished: microbials.filter((m) => lc(m.publish_status) !== "published").length,
        updated: collectionsLedger.filter((e) => lc(e.action).includes("update") || lc(e.action).includes("edit") || lc(e.action).includes("modify")).length,
        deleted: collectionsLedger.filter((e) => lc(e.action).includes("delete") || lc(e.action).includes("remove")).length,
        new: specimensInRange.length,
      };

      const inventoryStats = {
        lowStock: chemicals.filter((chemical) => {
          const quantity = toNumber(chemical.quantity);
          const threshold = toNumber(chemical.threshold);
          return threshold > 0 && quantity <= threshold;
        }).length,
        usageLogs: usageInRange.length,
        new: usageInRange.length,
        updated: 0,
        deleted: 0,
      };

      const usersStats = {
        totalUsers: users.length,
        new: usersInRange.length,
        updated: 0,
        deactivated: users.filter((u) => Boolean(u.deleted_at)).length,
      };

      const appointmentsStats = {
        missed: appointmentsInRange.filter((a) => String(a.status || "").toLowerCase() === "no_show").length,
        pending: appointmentsInRange.filter((a) => String(a.status || "").toLowerCase() === "pending").length,
        ongoing: appointmentsInRange.filter((a) => String(a.status || "").toLowerCase() === "ongoing").length,
        denied: appointmentsInRange.filter((a) => String(a.status || "").toLowerCase() === "denied").length,
        external: appointmentsInRange.filter((a) => String(a.appointment_source || "internal").toLowerCase() === "outsider").length,
        internal: appointmentsInRange.filter((a) => String(a.appointment_source || "internal").toLowerCase() !== "outsider").length,
      };


      const report: ReportSnapshot = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        period,
        rangeLabel: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        summary: {
          appointments: appointmentsInRange.length,
          internalAppointments,
          outsiderAppointments,
          usageLogs: usageInRange.length,
          newSpecimens: specimensInRange.length,
          newUsers: usersInRange.length,
          activeChemicals: activeChemicals.length,
        },
        statusBreakdown,
        appointmentSourceBreakdown,
        activityByDay: Array.from(dayMap.values()),
        ledger,
        moduleStats: {
          collections: collectionsStats,
          inventory: inventoryStats,
          users: usersStats,
          appointments: appointmentsStats,
        },
      };

      const saveResponse = await fetch("/API/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId,
          period,
          range_start: dayKey(start),
          range_end: dayKey(end),
          range_label: report.rangeLabel,
          report_payload: report,
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok) {
        throw new Error(saveData.error || "Failed to save report");
      }

      setCurrentReport(report);
      await fetchSavedReports(currentUserId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      if (!currentUserId) {
        throw new Error("Unable to identify your account. Please sign in again.");
      }

      const response = await fetch(`/API/reports/${id}?user_id=${currentUserId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete report");
      }

      const nextReports = savedReports.filter((item) => item.id !== id);
      setSavedReports(nextReports);
      if (currentReport?.id === id) {
        setCurrentReport(nextReports[0] ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete report");
    }
  };

  const canExport = useMemo(() => !!currentReport, [currentReport]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {initialLoading && (
        <div className="fixed right-4 top-20 z-50 rounded-lg border border-blue-200 bg-white px-3 py-2 shadow-md">
          <div className="flex items-center gap-2 text-sm text-[#113F67]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading saved reports...
          </div>
        </div>
      )}

      {exportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setExportModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-[#113F67]">Export PDF</h2>
            <p className="mt-1 text-sm text-gray-600">
              Choose which modules to include in the ledger report.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={moduleSelection.all}
                  onChange={(event) => toggleAllModules(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-[#113F67]"
                />
                <span className="text-sm font-semibold text-gray-900">All Modules</span>
              </label>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={moduleSelection.appointments}
                    onChange={(event) => toggleModule("appointments", event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#113F67]"
                  />
                  <span className="text-sm text-gray-700">Appointments</span>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={moduleSelection.collections}
                    onChange={(event) => toggleModule("collections", event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#113F67]"
                  />
                  <span className="text-sm text-gray-700">Collections</span>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={moduleSelection.inventory}
                    onChange={(event) => toggleModule("inventory", event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#113F67]"
                  />
                  <span className="text-sm text-gray-700">Inventory</span>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={moduleSelection.users}
                    onChange={(event) => toggleModule("users", event.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#113F67]"
                  />
                  <span className="text-sm text-gray-700">Users</span>
                </label>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!currentReport || selectedModules.length === 0}
                onClick={() => {
                  if (!currentReport || selectedModules.length === 0) return;
                  exportReportPdf(currentReport, selectedModules);
                  setExportModalOpen(false);
                }}
                className="rounded-lg bg-[#113F67] px-4 py-2 text-sm text-white hover:bg-[#0d3253] disabled:opacity-60"
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#113F67]">Reporting and Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">
          Generate weekly/monthly reports, review trends, and export insights as PDF or CSV.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as ReportPeriod)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="weekly">Weekly Report (last 7 days)</option>
            <option value="monthly">Monthly Report (last 30 days)</option>
          </select>

          <button
            onClick={generateReport}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#113F67] px-4 py-2 text-white hover:bg-[#0d3253] disabled:opacity-60"
          >
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Generating..." : "Generate and Save Report"}
          </button>

          <button
            onClick={() => {
              toggleAllModules(true);
              setExportModalOpen(true);
            }}
            disabled={!canExport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <FileText className="h-4 w-4" /> Export PDF
          </button>

          <button
            onClick={() => {
              if (!currentReport) return;
              const csv = makeCsv(currentReport);
              downloadTextFile(
                `biocella-report-${currentReport.period}-${currentReport.id}.csv`,
                csv,
                "text/csv;charset=utf-8"
              );
            }}
            disabled={!canExport}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Inventory Forecasting (Weekly/Monthly)</h3>
            <p className="text-xs text-gray-500">Most-used ranking, stockout risk, and reorder suggestions.</p>
          </div>
          <p className="text-xs text-gray-500">
            Follows selected report period: {period === "weekly" ? "Weekly (7 days)" : "Monthly (30 days)"}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-gray-500">Predicted Usage</p>
              <TrendingUp className="h-4 w-4 text-[#113F67]" />
            </div>
            <p className="text-2xl font-bold text-[#113F67]">{formatQuantity(forecastOverview.predicted_usage_total)}</p>
            <p className="text-xs text-gray-500">For the next {period === "weekly" ? "7" : "30"} days</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-gray-500">At Risk Items</p>
              <TriangleAlert className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-[#113F67]">{formatCount(forecastOverview.at_risk_count)}</p>
            <p className="text-xs text-gray-500">Including {formatCount(forecastOverview.high_risk_count)} high-risk items</p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase text-gray-500">Forecasted Items</p>
              <ListOrdered className="h-4 w-4 text-[#113F67]" />
            </div>
            <p className="text-2xl font-bold text-[#113F67]">{formatCount(forecastOverview.total_items)}</p>
            <p className="text-xs text-gray-500">Based on historical usage logs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Top Used Reagents and Chemicals</p>

            {forecastLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading ranking...
              </div>
            ) : topUsedChemicals.length > 0 ? (
              <div className="space-y-2">
                {topUsedChemicals.map((item) => (
                  <div key={`top-${item.chemical_id}`} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">#{item.rank} {item.chemical_name}</p>
                      <p className="text-xs text-gray-500 truncate">{item.chemical_type || "General"} • {item.usage_logs} logs</p>
                    </div>
                    <p className="text-xs font-semibold text-[#113F67] ml-3">{formatQuantity(item.total_used, item.unit)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No usage ranking data for this period.</p>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">Stockout Risk and Reorder Suggestions</p>

            {forecastLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running forecast...
              </div>
            ) : forecastItems.length > 0 ? (
              <div className="space-y-2">
                {forecastItems.map((item) => (
                  <div key={`forecast-${item.chemical_id}`} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.chemical_name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          Stock: {formatQuantity(item.current_stock, item.unit)} • Forecast: {formatQuantity(item.forecast_usage, item.unit)}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${getRiskPillClass(item.risk_level)}`}>
                        {item.risk_level}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-600">
                      <span>Days to stockout: {item.days_to_stockout === null ? "N/A" : item.days_to_stockout.toFixed(1)}</span>
                      <span>Reorder point: {formatQuantity(item.reorder_point, item.unit)}</span>
                      <span>Suggested order: {formatQuantity(item.recommended_reorder_qty, item.unit)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No forecast data available for this period.</p>
            )}
          </div>
        </div>
      </div>

      {currentReport && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Appointments</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.appointments}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Internal Appointments</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.internalAppointments ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Outsider Appointments</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.outsiderAppointments ?? 0}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Usage Logs</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.usageLogs}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">New Specimens</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.newSpecimens}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">New Users</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.newUsers}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500 uppercase">Active Chemicals</p>
              <p className="text-2xl font-bold text-[#113F67]">{currentReport.summary.activeChemicals}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">System Activity Timeline ({currentReport.rangeLabel})</h2>
              <div className="h-[280px] min-h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentReport.activityByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="appointments" fill="#113F67" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="usageLogs" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="specimens" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="users" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Appointment Status Breakdown</h2>
              <div className="h-[280px] min-h-[280px]">
                {currentReport.statusBreakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No appointment records for the selected period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentReport.statusBreakdown}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {currentReport.statusBreakdown.map((item, index) => (
                          <Cell key={item.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Appointment Source Breakdown</h2>
              <div className="h-[280px] min-h-[280px]">
                {(currentReport.appointmentSourceBreakdown || []).length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No appointment source records for the selected period.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentReport.appointmentSourceBreakdown}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={90}
                        label
                      >
                        {currentReport.appointmentSourceBreakdown?.map((item, index) => (
                          <Cell key={`source-${item.name}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Saved Reports</h2>
        {savedReports.length === 0 ? (
          <p className="text-sm text-gray-500">No saved reports yet. Generate your first report above.</p>
        ) : (
          <div className="space-y-2">
            {savedReports.map((report) => (
              <div
                key={report.id}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-[#113F67]">
                    {report.period.toUpperCase()} Report - {new Date(report.createdAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">{report.rangeLabel}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentReport(report)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => {
                      setCurrentReport(report);
                      toggleAllModules(true);
                      setExportModalOpen(true);
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      const csv = makeCsv(report);
                      downloadTextFile(
                        `biocella-report-${report.period}-${report.id}.csv`,
                        csv,
                        "text/csv;charset=utf-8"
                      );
                    }}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => deleteReport(report.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
