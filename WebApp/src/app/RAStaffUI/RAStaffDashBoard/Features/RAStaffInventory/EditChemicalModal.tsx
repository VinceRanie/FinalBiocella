"use client";

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Chemical } from "./types";
import { API_URL } from "@/config/api";
import { getAuthHeader } from "@/app/utils/authUtil";

interface EditChemicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  chemical: Chemical;
}

type EditChemicalFormData = Omit<Chemical, 'chemical_id' | 'last_updated'>;

const ALL_UNITS = ["mL", "L", "g", "kg", "mg", "μL", "pieces", "bottles"] as const;
const MASS_UNITS = ["g", "kg", "mg"] as const;
const VOLUME_UNITS = ["mL", "L", "μL"] as const;

const getAllowedUnitsForType = (type: string) => {
  const normalized = type.trim().toLowerCase();

  if (["agar", "protein", "salt", "dye", "stain", "enzyme", "antibody"].includes(normalized)) {
    return [...MASS_UNITS];
  }

  if (["acid", "base", "buffer", "solvent"].includes(normalized)) {
    return [...VOLUME_UNITS];
  }

  return [...ALL_UNITS];
};

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowedUnits = useMemo(() => getAllowedUnitsForType(formData.type), [formData.type]);

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

  useEffect(() => {
    if (!allowedUnits.includes(formData.unit as (typeof allowedUnits)[number])) {
      setFormData((prev) => ({ ...prev, unit: allowedUnits[0] }));
    }
  }, [allowedUnits, formData.unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!allowedUnits.includes(formData.unit as (typeof allowedUnits)[number])) {
        throw new Error(`Selected unit is not valid for type ${formData.type}.`);
      }

      // Update chemical
      console.log('Updating chemical with data:', formData);
      const response = await fetch(
        `${API_URL}/chemicals/${chemical.chemical_id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update chemical");
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
                Quantity (Auto from Lots)
              </label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                readOnly
                disabled
                className="w-full px-3 py-2 border border-gray-200 bg-gray-100 text-gray-600 rounded-lg"
                placeholder="Calculated from active lots"
              />
              <p className="mt-1 text-xs text-gray-500">
                Quantity is derived from total remaining stock across active lots/containers.
              </p>
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
                {allowedUnits.map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Unit options are filtered based on selected type.
              </p>
            </div>

            {/* Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reorder Threshold (Total Stock) *
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
                Applied to total remaining stock across all lots/containers.
              </p>
            </div>

          </div>

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
