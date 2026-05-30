"use client";

import { useState } from "react";
import { Plus, FolderPlus, FileSpreadsheet } from "lucide-react";

interface AdminControlsProps {
  onAddProject: () => void;
  onAddSpecimen: () => void;
  onImportSpecimens: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: "all" | "unpublished" | "published";
  onStatusFilterChange: (status: "all" | "unpublished" | "published") => void;
}

export default function AdminControls({
  onAddProject,
  onAddSpecimen,
  onImportSpecimens,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: AdminControlsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
      {/* Left group: Title */}
      <div>
        <h2 className="text-2xl font-bold text-[#113F67]">Collection Management</h2>
        <p className="text-sm text-gray-600">Manage specimen inventory and project data</p>
      </div>

      {/* Right group: Action buttons + Search */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto sm:items-center">
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={onAddProject}
            className="flex items-center gap-2 h-9 px-4 py-1 text-sm cursor-pointer bg-[#113F67] text-white rounded-lg shadow-md hover:bg-[#0d2f4d] transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            New Project
          </button>
          
          <button
            onClick={onAddSpecimen}
            className="flex items-center gap-2 h-9 px-4 py-1 text-sm cursor-pointer bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Specimen
          </button>

          <button
            onClick={onImportSpecimens}
            className="flex items-center gap-2 h-9 px-4 py-1 text-sm cursor-pointer bg-slate-700 text-white rounded-lg shadow-md hover:bg-slate-800 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Spreadsheet
          </button>
        </div>

        {/* Search input */}
        <input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="text-[#113F67] shadow-md transition-colors w-full sm:w-80 h-9 text-sm text-[#113F67] rounded-lg border border-[#113F67] px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#113F67]"
          placeholder="Search by code, name, or project..."
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as "all" | "unpublished" | "published")}
          className="shadow-md transition-colors w-full sm:w-44 h-9 text-sm text-white rounded-lg border border-gray-300 px-3 py-1 bg-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]"
          aria-label="Filter by publish status"
        >
          <option value="all">All</option>
          <option value="unpublished">Unpublished</option>
          <option value="published">Published</option>
        </select>
      </div>
    </div>
  );
}
