"use client";

import { ChangeEvent } from "react";

interface Props {
  active: string;
  onRoleChange: (role: string) => void;
  viewMode: "active" | "deactivated";
  onViewModeChange: (mode: "active" | "deactivated") => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const buttons = [
  { label: "All", value: "all" },
  { label: "Student", value: "student" },
  { label: "Faculty", value: "faculty" },
  { label: "Research Asst.", value: "staff" },
];

export default function AdminControls({
  active,
  onRoleChange,
  viewMode,
  onViewModeChange,
  search,
  onSearchChange,
}: Props) {
  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => onViewModeChange("active")}
            className={`h-8 px-3 py-1 text-sm cursor-pointer rounded-lg shadow-md transition-colors ${
              viewMode === "active" ? "bg-[#113F67] text-white" : "bg-white text-[#113F67]"
            }`}
          >
            Active Users
          </button>
          <button
            onClick={() => onViewModeChange("deactivated")}
            className={`h-8 px-3 py-1 text-sm cursor-pointer rounded-lg shadow-md transition-colors ${
              viewMode === "deactivated" ? "bg-[#113F67] text-white" : "bg-white text-[#113F67]"
            }`}
          >
            Deactivated Users
          </button>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          {buttons.map((btn) => (
            <button
              key={btn.value}
              onClick={() => onRoleChange(btn.value)}
              className={`h-8 px-3 py-1 text-sm cursor-pointer rounded-lg shadow-md transition-colors ${
                active === btn.value
                  ? "bg-[#113F67] text-white"
                  : "bg-white text-[#113F67]"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="w-full sm:w-auto">
        <input
          className="shadow-md transition-colors w-full sm:w-80 h-8 text-sm text-[#113F67] rounded-lg border border-[#113F67] px-3 py-1 focus:outline-none focus:ring focus:ring-[#113F67]"
          placeholder="Search"
          value={search}
          onChange={handleSearch}
        />
      </div>
    </div>
  );
}
