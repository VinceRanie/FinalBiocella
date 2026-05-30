"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: any) => void;
  project?: any;
}

export default function ProjectModal({ isOpen, onClose, onSave, project }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    code: "",
    classification: "",
    user_id: 1, // Default user_id, should be from logged-in user
  });

  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        code: project.code || "",
        classification: project.classification || "",
        user_id: project.user_id || 1,
      });
    } else {
      setFormData({
        title: "",
        code: "",
        classification: "",
        user_id: 1,
      });
    }
  }, [project]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-[#113F67]">
            {project ? "Edit Project" : "Create New Project"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., NRCP Sediment Project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Code *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                placeholder="e.g., NRCP-2024-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classification *
              </label>
              <select
                required
                value={formData.classification}
                onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
              >
                <option value="">Select Classification</option>
                <option value="Bacteria">Bacteria</option>
                <option value="Fungi">Fungi</option>
                <option value="Archaea">Archaea</option>
                <option value="Virus">Virus</option>
                <option value="Algae">Algae</option>
                <option value="Protozoa">Protozoa</option>
                <option value="Mixed">Mixed</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

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
              className="px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors"
            >
              {project ? "Update" : "Create"} Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
