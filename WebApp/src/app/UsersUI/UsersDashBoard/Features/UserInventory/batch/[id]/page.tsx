"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Save, ArrowLeft } from "lucide-react";
import { API_URL } from "@/config/api";
import { getUserData } from "@/app/utils/authUtil";
import Modal from "@/app/components/Modal";

interface Batch {
  batch_id: number;
  chemical_id: number;
  chemical_name?: string;
  quantity: number;
  used_quantity: number;
  date_received: string;
  expiration_date: string;
  location: string;
  qr_code: string | null;
}

export default function BatchEditPage() {
  const params = useParams();
  const router = useRouter();
  const batchId = params.id as string;

  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Usage form
  const [amountUsed, setAmountUsed] = useState(0);
  const [purpose, setPurpose] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      const user = getUserData();
      if (user?.userId) {
        setUserId(user.userId);
      } else {
        setError("User not authenticated. Please log in.");
      }
    }
  }, [isMounted]);

  useEffect(() => {
    if (isMounted && userId !== null) {
      fetchBatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, batchId, userId]);

  const fetchBatch = async () => {
    try {
      const response = await fetch(`${API_URL}/batches/${batchId}`);
      if (!response.ok) throw new Error("Failed to fetch batch");
      const data = await response.json();
      setBatch(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleLogUsage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batch || userId === null) {
      setError("User not authenticated");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Calculate new used quantity
      const newUsedQuantity = batch.used_quantity + amountUsed;

      if (newUsedQuantity > batch.quantity) {
        throw new Error("Cannot use more than available quantity");
      }

      // Update batch used_quantity
      const batchResponse = await fetch(`${API_URL}/batches/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: batch.quantity,
          used_quantity: newUsedQuantity,
          expiration_date: batch.expiration_date,
          location: batch.location,
        }),
      });

      if (!batchResponse.ok) {
        throw new Error("Failed to update batch quantity");
      }

      // Log usage
      const usageResponse = await fetch(`${API_URL}/usage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chemical_id: batch.chemical_id,
          user_id: userId,
          date_used: new Date().toISOString(),
          amount_used: amountUsed,
          purpose,
          batch_id: batch.batch_id,
        }),
      });

      if (!usageResponse.ok) {
        throw new Error("Failed to create usage log");
      }

      // Refresh batch data
      await fetchBatch();
      setAmountUsed(0);
      setPurpose("");
      setModalConfig({ type: 'success', title: 'Usage Logged', message: 'Usage logged successfully!' });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67]"></div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error || "Batch not found"}
        </div>
        <button
          onClick={() => router.push("/AdminUI/AdminDashBoard/Features/AdminInventory")}
          className="mt-4 flex items-center gap-2 text-[#113F67] hover:underline"
        >
          <ArrowLeft size={20} />
          Back to Inventory
        </button>
      </div>
    );
  }

  const remainingQuantity = batch.quantity - batch.used_quantity;
  const percentageUsed = (batch.used_quantity / batch.quantity) * 100;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/AdminUI/AdminDashBoard/Features/AdminInventory")}
          className="flex items-center gap-2 text-[#113F67] hover:underline mb-4"
        >
          <ArrowLeft size={20} />
          Back to Inventory
        </button>
        <h1 className="text-4xl font-bold text-[#113F67]">Batch #{batch.batch_id}</h1>
        <p className="text-gray-600 mt-2">Edit and log usage for this batch</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Batch Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-[#113F67] mb-4">Batch Information</h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-600">Chemical Name</label>
              <p className="text-lg font-semibold">{batch.chemical_name || `Chemical ID: ${batch.chemical_id}`}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Location</label>
              <p className="text-lg">{batch.location || 'N/A'}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Expiration Date</label>
              <p className="text-lg">
                {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Date Received</label>
              <p className="text-lg">{new Date(batch.date_received).toLocaleDateString()}</p>
            </div>

            <div className="border-t pt-3">
              <label className="text-sm font-medium text-gray-600">Total Quantity</label>
              <p className="text-lg font-semibold">{batch.quantity}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Used Quantity</label>
              <p className="text-lg font-semibold text-red-600">{batch.used_quantity}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Remaining</label>
              <p className="text-2xl font-bold text-green-600">{remainingQuantity}</p>
            </div>

            {/* Progress Bar */}
            <div>
              <label className="text-sm font-medium text-gray-600">Usage Progress</label>
              <div className="w-full bg-gray-200 rounded-full h-4 mt-2">
                <div
                  className={`h-4 rounded-full ${
                    percentageUsed > 80 ? 'bg-red-600' : percentageUsed > 50 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${percentageUsed}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">{percentageUsed.toFixed(1)}% used</p>
            </div>
          </div>
        </div>

        {/* Log Usage Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-[#113F67] mb-4">Log Usage</h2>

          <form onSubmit={handleLogUsage} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Used *
              </label>
              <input
                type="number"
                value={amountUsed}
                onChange={(e) => setAmountUsed(Number(e.target.value))}
                required
                min="0"
                max={remainingQuantity}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter amount used"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum: {remainingQuantity} remaining
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purpose *
              </label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Describe what this was used for..."
              />
            </div>

            {error && (
              <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving || remainingQuantity === 0}
              className="w-full flex items-center justify-center gap-2 bg-[#113F67] text-white px-4 py-3 rounded-lg hover:bg-[#0d2f4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={20} />
              {saving ? "Logging..." : "Log Usage"}
            </button>

            {remainingQuantity === 0 && (
              <p className="text-center text-sm text-red-600 font-medium">
                This batch is fully consumed
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Modal */}
      {modalConfig && (
        <Modal
          isOpen={true}
          type={modalConfig.type}
          title={modalConfig.title}
          message={modalConfig.message}
          onClose={() => setModalConfig(null)}
          autoCloseMs={modalConfig.type === 'success' ? 3000 : 0}
        />
      )}
    </div>
  );
}
