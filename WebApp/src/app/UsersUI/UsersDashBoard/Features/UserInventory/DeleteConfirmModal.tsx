"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { Chemical } from "./types";
import { API_URL } from "@/config/api";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chemical: Chemical;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onSuccess,
  chemical,
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/chemicals/${chemical.chemical_id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete chemical");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header with Warning Icon */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">Delete Chemical</h2>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Chemical Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Chemical ID:</span>
              <span className="text-sm font-semibold text-gray-900">
                {chemical.chemical_id}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Name:</span>
              <span className="text-sm font-semibold text-gray-900">
                {chemical.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium text-gray-600">Quantity:</span>
              <span className="text-sm font-semibold text-gray-900">
                {chemical.quantity} {chemical.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Warning:</strong> Deleting this chemical will permanently remove
            it from the inventory system. This may affect related records such as
            batches and usage logs.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Deleting..." : "Delete Chemical"}
          </button>
        </div>
      </div>
    </div>
  );
}
