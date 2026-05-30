"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Chemical } from "./types";
import { API_URL } from "@/config/api";

interface EditChemicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chemical: Chemical;
}

type EditChemicalFormData = Omit<Chemical, 'chemical_id' | 'last_updated'>;

export default function EditChemicalModal({
  isOpen,
  onClose,
  onSuccess,
  chemical,
}: EditChemicalModalProps) {
  const [formData, setFormData] = useState<EditChemicalFormData>({
    name: chemical.name,
    type: chemical.type,
    quantity: chemical.quantity,
    unit: chemical.unit,
    threshold: chemical.threshold,
  });
  const [amountUsed, setAmountUsed] = useState(0);
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when chemical prop changes
  useEffect(() => {
    setFormData({
      name: chemical.name,
      type: chemical.type,
      quantity: chemical.quantity,
      unit: chemical.unit,
      threshold: chemical.threshold,
    });
  }, [chemical]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update chemical
      console.log('Updating chemical with data:', formData);
      const response = await fetch(
        `${API_URL}/chemicals/${chemical.chemical_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update chemical");
      }

      console.log('Chemical updated. Amount used:', amountUsed, 'Purpose:', purpose);

      // If there's usage logged, create usage log entry
      if (amountUsed > 0 && purpose.trim()) {
        console.log('Logging usage...');
        // First, get the batch ID for this chemical
        const batchResponse = await fetch(`${API_URL}/batches`);
        const batches = await batchResponse.json();
        console.log('All batches:', batches);
        const chemicalBatch = batches.find((b: { chemical_id: number }) => b.chemical_id === chemical.chemical_id);
        console.log('Found batch for chemical:', chemicalBatch);
        
        if (chemicalBatch) {
          // Update batch used_quantity
          const newUsedQuantity = (chemicalBatch.used_quantity || 0) + amountUsed;
          console.log('Updating batch used_quantity to:', newUsedQuantity);
          
          const updateBatchResponse = await fetch(`${API_URL}/batches/${chemicalBatch.batch_id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quantity: chemicalBatch.quantity,
              used_quantity: newUsedQuantity,
              expiration_date: chemicalBatch.expiration_date,
              location: chemicalBatch.location,
            }),
          });

          if (!updateBatchResponse.ok) {
            console.error('Failed to update batch:', await updateBatchResponse.text());
          } else {
            console.log('Batch updated successfully');
          }

          // Log usage
          const usageData = {
            chemical_id: chemical.chemical_id,
            user_id: 3,
            date_used: new Date().toISOString(),
            amount_used: amountUsed,
            purpose,
            batch_id: chemicalBatch.batch_id,
          };
          console.log('Creating usage log with data:', usageData);

          const usageResponse = await fetch(`${API_URL}/usage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(usageData),
          });

          if (!usageResponse.ok) {
            const errorText = await usageResponse.text();
            console.error('Failed to log usage:', errorText);
            throw new Error('Failed to log usage: ' + errorText);
          } else {
            console.log('Usage logged successfully');
          }
        } else {
          console.warn('No batch found for this chemical');
        }
      } else {
        console.log('Skipping usage logging - no amount or purpose provided');
      }

      onSuccess();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "quantity" || name === "threshold" ? Number(value) : value,
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-[#113F67]">Edit Chemical</h2>
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

        {/* Chemical ID Display */}
        <div className="mb-4 p-3 bg-gray-100 rounded-lg">
          <span className="text-sm text-gray-600">Chemical ID: </span>
          <span className="text-sm font-semibold text-gray-900">
            {chemical.chemical_id}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Chemical Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter chemical name"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type *
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                <option value="General">General</option>
                <option value="Agar">Agar</option>
                <option value="Protein">Protein</option>
                <option value="Acid">Acid</option>
                <option value="Base">Base</option>
                <option value="Salt">Salt</option>
                <option value="Buffer">Buffer</option>
                <option value="Enzyme">Enzyme</option>
                <option value="Antibody">Antibody</option>
                <option value="Dye">Dye</option>
                <option value="Stain">Stain</option>
                <option value="Solvent">Solvent</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter quantity"
              />
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit *
              </label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                <option value="mL">mL</option>
                <option value="L">L</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="mg">mg</option>
                <option value="μL">μL</option>
                <option value="pieces">pieces</option>
                <option value="bottles">bottles</option>
              </select>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Low Stock Threshold *
              </label>
              <input
                type="number"
                name="threshold"
                value={formData.threshold}
                onChange={handleChange}
                required
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="Enter threshold"
              />
              <p className="mt-1 text-xs text-gray-500">
                Alert when quantity falls below this value
              </p>
            </div>

            {/* Usage Logging Section */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-[#113F67] mb-3">Log Usage (Optional)</h3>
              
              {/* Amount Used */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Used
                </label>
                <input
                  type="number"
                  value={amountUsed}
                  onChange={(e) => setAmountUsed(Number(e.target.value))}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="Enter amount used (if any)"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose
                </label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="Describe what this was used for..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  Fill this out to log usage in chemical_usage_log
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Updating..." : "Update Chemical"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
