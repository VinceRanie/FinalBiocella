"use client";

import { useState } from "react";
import { Plus, FolderPlus } from "lucide-react";

interface AdminControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function AdminControls({ searchQuery, onSearchChange }: AdminControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
      {/* Left group: Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#113F67]">Collection Management</h2>
        <p className="text-sm text-gray-600">Manage specimen inventory and project data</p>
      </div>

      {/* Right group: Action buttons + Search */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:items-center">

        {/* Search input */}
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="shadow-md transition-colors w-full sm:w-80 h-9 text-sm text-[#113F67] rounded-lg border border-gray-300 px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#113F67]"
          placeholder="Search by code, name, or project..."
        />
      </div>
    </div>
  );
}
