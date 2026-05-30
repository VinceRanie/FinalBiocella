'use client';

import { useState } from "react";
import { Search, Inbox } from "lucide-react";
import { useAppointmentContext } from "./AppointmentContext";
import { AppointmentCard } from "./AppointmentCard";

type FilterTab = "all" | "pending" | "missed" | "completed";
const FILTER_TABS: { label: string; value: FilterTab }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" },
  { label: "Missed", value: "missed" },
];

export function AppointmentSideBar() {
  const { appointments, loading, error } = useAppointmentContext();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filtered = appointments.filter((a) => {
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" ? true : a.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex h-full min-h-[320px] flex-col border border-white">

      <div className="p-5 space-y-3">
        <h2 className="text-lg font-semibold">Previous Appointments</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-9 pr-3 py-2 border-border-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                activeTab === tab.value
                  ? "cursor-pointer bg-[#113F67] text-white"
                  : "cursor-pointer bg-gray-100 text-[#113F67]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 space-y-3">
        {loading ? (
          <p className="text-sm text-gray-500">Loading appointments...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : filtered.length === 0 ? (
          <div className="text-center mt-10">
            <Inbox className="mx-auto mb-2 text-gray-400" />
            <p className="text-sm text-gray-500">No appointments</p>
          </div>
        ) : (
          filtered.map((a) => <AppointmentCard key={a.id} appointment={a} />)
        )}
      </div>
    </div>
  );
}