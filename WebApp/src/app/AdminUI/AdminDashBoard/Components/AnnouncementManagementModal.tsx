"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";
import { RefreshCcw, Trash2, RotateCcw, X } from "lucide-react";

type AnnouncementRecord = {
  announcement_id?: number;
  title: string;
  description: string;
  created_at: string | null;
  created_by_email: string;
  created_by_role: string;
  is_published: boolean;
  deleted_at: string | null;
  deleted_by_user_id?: number | null;
};

type AnnouncementManagementModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

const formatDate = (value: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function AnnouncementManagementModal({ isOpen, onClose }: AnnouncementManagementModalProps) {
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/announcements/admin?limit=100`, {
        headers: {
          ...getAuthHeader(),
        },
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || "Failed to fetch announcements.");
      }

      setItems(Array.isArray(data) ? data : []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to fetch announcements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void fetchItems();
  }, [isOpen]);

  const updateItem = async (id: number, action: "delete" | "restore") => {
    try {
      setSavingId(id);
      setError(null);

      const response = await fetch(
        `${API_URL}/announcements/${id}${action === "restore" ? "/restore" : ""}`,
        {
          method: action === "restore" ? "POST" : "DELETE",
          headers: {
            ...getAuthHeader(),
          },
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || `Failed to ${action} announcement.`);
      }

      if (action === "restore") {
        setItems((prev) => prev.map((item) => (item.announcement_id === id ? { ...item, deleted_at: null, is_published: true } : item)));
      } else {
        setItems((prev) => prev.map((item) => (item.announcement_id === id ? { ...item, deleted_at: new Date().toISOString(), is_published: false } : item)));
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : `Failed to ${action} announcement.`);
    } finally {
      setSavingId(null);
    }
  };

  if (!isOpen) return null;

  const activeCount = items.filter((item) => !item.deleted_at).length;
  const deletedCount = items.filter((item) => !!item.deleted_at).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#113F67]/60">Admin Manager</p>
            <h2 className="text-2xl font-bold text-[#113F67]">Manage Announcements</h2>
            <p className="mt-1 text-sm text-slate-500">
              {activeCount} active, {deletedCount} deleted
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchItems()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close announcement manager"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
              Loading announcements...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
              No announcements found.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((item) => {
                const id = item.announcement_id;
                const isDeleted = !!item.deleted_at;

                return (
                  <article
                    key={id ?? `${item.title}-${item.created_at}`}
                    className={`rounded-3xl border p-5 shadow-sm ${isDeleted ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className={`rounded-full px-3 py-1 font-semibold ${isDeleted ? "bg-red-100 text-red-700" : "bg-[#113F67]/10 text-[#113F67]"}`}>
                            {isDeleted ? "Deleted" : item.is_published ? "Published" : "Draft"}
                          </span>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-[#113F67]">{item.title}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600 whitespace-pre-wrap">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
                      <div>
                        <p>{item.created_by_email || "admin@biocella"}</p>
                        <p className="mt-1">{item.created_by_role || "admin"}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!isDeleted ? (
                          <button
                            type="button"
                            disabled={savingId === id || !id}
                            onClick={() => id && void updateItem(id, "delete")}
                            className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={savingId === id || !id}
                            onClick={() => id && void updateItem(id, "restore")}
                            className="inline-flex items-center gap-2 rounded-full bg-[#113F67] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0d2f4d] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
