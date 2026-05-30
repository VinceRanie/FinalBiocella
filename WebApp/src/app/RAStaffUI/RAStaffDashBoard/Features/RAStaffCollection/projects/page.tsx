"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { Plus, Edit, Trash2, Eye, FolderOpen } from "lucide-react";
import ProjectModal from "../ProjectModal";

interface Project {
  _id: string;
  title: string;
  code: string;
  classification: string;
  user_id: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [specimenCounts, setSpecimenCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchProjects();
    fetchSpecimenCounts();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecimenCounts = async () => {
    try {
      const response = await fetch(`${API_URL}/microbials`);
      if (response.ok) {
        const specimens = await response.json();
        const counts: Record<string, number> = {};
        
        specimens.forEach((specimen: any) => {
          if (specimen.project_id?._id) {
            counts[specimen.project_id._id] = (counts[specimen.project_id._id] || 0) + 1;
          }
        });
        
        setSpecimenCounts(counts);
      }
    } catch (error) {
      console.error("Error fetching specimen counts:", error);
    }
  };

  const handleSaveProject = async (projectData: any) => {
    try {
      const method = selectedProject ? "PUT" : "POST";
      const url = selectedProject
        ? `${API_URL}/projects/${selectedProject._id}`
        : `${API_URL}/projects`;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });

      if (response.ok) {
        await fetchProjects();
        setIsModalOpen(false);
        setSelectedProject(null);
        alert(selectedProject ? "Project updated successfully!" : "Project created successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.message || "Failed to save project"}`);
      }
    } catch (error) {
      console.error("Error saving project:", error);
      alert("Error saving project");
    }
  };

  const handleDeleteProject = async (id: string) => {
    const count = specimenCounts[id] || 0;
    
    if (count > 0) {
      if (!confirm(`This project has ${count} specimen(s). Are you sure you want to delete it? This may affect related specimens.`)) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to delete this project?")) {
        return;
      }
    }
    
    try {
      const response = await fetch(`${API_URL}/projects/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchProjects();
        await fetchSpecimenCounts();
        alert("Project deleted successfully!");
      } else {
        alert("Failed to delete project");
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      alert("Error deleting project");
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleRowClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const filteredProjects = projects.filter((project) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      project.title?.toLowerCase().includes(query) ||
      project.code?.toLowerCase().includes(query) ||
      project.classification?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#113F67]">Projects</h1>
          <p className="text-gray-600">Manage research projects and their classifications</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects..."
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
          />
          <button
            onClick={() => {
              setSelectedProject(null);
              setIsModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto w-full">
            <thead className="bg-[#113F67]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">No.</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">Project Code</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">Title</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">Classification</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">Specimens</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No projects found. Create your first project to get started.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project, index) => (
                  <tr
                    key={project._id}
                    onClick={() => handleRowClick(project._id)}
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-800">{index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-800 font-mono">{project.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{project.title}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-block px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {project.classification}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">
                      <span className="flex items-center gap-1">
                        <FolderOpen className="w-4 h-4" />
                        {specimenCounts[project._id] || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(project);
                          }}
                          className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project._id);
                          }}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(null);
        }}
        onSave={handleSaveProject}
        project={selectedProject}
      />
    </div>
  );
}
