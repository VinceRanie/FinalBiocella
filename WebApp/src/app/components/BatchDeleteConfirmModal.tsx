"use client";

import { useState } from "react";
import { X, AlertTriangle, Trash2 } from "lucide-react";
import { API_URL } from "@/config/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: number | null;
  headers?: Record<string, string>;
}

export default function BatchDeleteConfirmModal({ isOpen, onClose, onSuccess, batchId, headers = {} }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!batchId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/batches/${batchId}`, {
        method: "DELETE",
        headers: {
          ...headers,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete batch");
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
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-amber-600" />
            <h3 className="text-lg font-semibold text-[#113F67]">Delete Container</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X />
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-4">This will permanently delete the selected container (batch). This does not delete the parent chemical.</p>

        {error && <div className="mb-3 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded inline-flex items-center gap-2">
            <Trash2 />
            {loading ? 'Deleting…' : 'Delete container'}
          </button>
        </div>
      </div>
    </div>
  );
}
