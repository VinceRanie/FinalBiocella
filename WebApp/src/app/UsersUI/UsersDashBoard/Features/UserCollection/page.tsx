"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import AdminCollection from "./AdminCollection";
import AdminControls from "./AdminControls";
import ProjectModal from "./ProjectModal";
import SpecimenModal from "./SpecimenModal";
import { useRouter } from "next/navigation";
import { getUserData } from "@/app/utils/authUtil";
import Modal from "@/app/components/Modal";

interface Project {
  _id: string;
  title: string;
  code: string;
  classification: string;
  user_id: number;
}

interface Specimen {
  _id: string;
  publish_status?: 'published' | 'unpublished';
  created_by?: string;
  code_name: string;
  classification: string;
  source: string;
  date_accessed: string;
  locale?: string;
  project_fund?: string;
  accession_number?: string;
  accession_no?: string;
  similarity_percent?: string;
  project_id: Project | string;
  description?: string;
  qr_code?: string;
  image_url?: string;
  fasta_file?: string;
  fasta_sequence?: string;
  blast_rid?: string;
  blast_results?: Record<string, unknown>;
  biochemical_tests?: {
    onpg?: string;
    glu?: string;
    adh?: string;
    man?: string;
    ldc?: string;
    ino?: string;
    odc?: string;
    sor?: string;
    cit?: string;
    rha?: string;
    h2s?: string;
    sac?: string;
    ure?: string;
    mel?: string;
    tda?: string;
    amy?: string;
    ind?: string;
    ara?: string;
    vp?: string;
    no2?: string;
    gel?: string;
  };
  catalase?: string;
  hemolysis?: string;
  oxidase?: string;
  growth_media?: string;
  special_reqs?: string;
  activity?: string;
  result?: string;
  custom_fields?: Record<string, string>;
}

const isVisibleToUsers = (specimen: Specimen) => {
  const status = String(specimen.publish_status || "published").trim().toLowerCase();
  return status === "published";
};

export default function AdminCollectionPage() {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSpecimenModalOpen, setIsSpecimenModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  const [modalConfig, setModalConfig] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);
  
  const router = useRouter();
  const getCurrentUserId = () => {
    const user = getUserData();
    return user?.userId ?? null;
  };

  const getCurrentUserDisplayName = () => {
    if (typeof window === "undefined") return "";

    try {
      const fromUserData = localStorage.getItem("userData");
      const fromUser = localStorage.getItem("user");
      const raw = fromUserData || fromUser;
      if (!raw) return "";

      const parsed = JSON.parse(raw);
      const firstName = String(parsed.first_name || parsed.firstName || "").trim();
      const lastName = String(parsed.last_name || parsed.lastName || "").trim();
      const fullName = `${firstName} ${lastName}`.trim();

      return fullName || String(parsed.name || parsed.email || parsed.username || "").trim();
    } catch {
      return "";
    }
  };

  // Fetch projects
  const fetchProjects = async () => {
    try {
      const response = await fetch(`${API_URL}/projects`);
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  // Fetch specimens
  const fetchSpecimens = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/microbials`);
      if (response.ok) {
        const data = await response.json();
        const safeData = Array.isArray(data) ? data.filter(isVisibleToUsers) : [];
        setSpecimens(safeData);
      } else {
        console.error("Failed to fetch specimens:", response.status);
      }
    } catch (error) {
      console.error("Error fetching specimens:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchSpecimens();
  }, []);

  // Project handlers
  const handleSaveProject = async (projectData: Record<string, unknown>) => {
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
        setIsProjectModalOpen(false);
        setSelectedProject(null);
        setModalConfig({ type: 'success', title: 'Project Saved', message: selectedProject ? 'Project updated successfully!' : 'Project created successfully!' });
      } else {
        const error = await response.json();
        setModalConfig({ type: 'error', title: 'Error', message: `Error: ${error.message || 'Failed to save project'}` });
      }
    } catch (error) {
      console.error("Error saving project:", error);
      setModalConfig({ type: 'error', title: 'Error', message: 'Error saving project' });
    }
  };

  // Specimen handlers
  const handleSaveSpecimen = async (specimenData: FormData) => {
    try {
      const method = selectedSpecimen ? "PUT" : "POST";
      const url = selectedSpecimen
        ? `${API_URL}/microbials/${selectedSpecimen._id}`
        : `${API_URL}/microbials`;

      const userId = getCurrentUserId();
      if (userId) {
        specimenData.set("user_id", String(userId));
      }

      if (!selectedSpecimen) {
        const createdBy = getCurrentUserDisplayName();
        if (createdBy) {
          specimenData.set("created_by", createdBy);
        }
      }

      const response = await fetch(url, {
        method,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        body: specimenData,
      });

      if (response.ok) {
        await fetchSpecimens();
        setIsSpecimenModalOpen(false);
        setSelectedSpecimen(null);
        setModalConfig({ type: 'success', title: 'Specimen Saved', message: selectedSpecimen ? 'Specimen updated successfully! QR code has been generated.' : 'Specimen added successfully! QR code has been generated.' });
      } else {
        const error = await response.json();
        setModalConfig({ type: 'error', title: 'Error', message: `Error: ${error.error || 'Failed to save specimen'}` });
      }
    } catch (error) {
      console.error("Error saving specimen:", error);
      setModalConfig({ type: 'error', title: 'Error', message: 'Error saving specimen' });
    }
  };

  const handleViewSpecimen = (specimen: Specimen) => {
    console.log("View specimen:", specimen);
    if (!specimen._id) {
      setModalConfig({ type: 'error', title: 'Error', message: 'Error: Specimen ID is missing' });
      return;
    }
    // Route students to the user-specific specimen page
    router.push(`/UsersUI/UsersDashBoard/Features/UserCollection/specimen/${specimen._id}`);
  };

  // Filter specimens based on search query
  const filteredSpecimens = specimens.filter((specimen: Specimen) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const projectTitle = typeof specimen.project_id === 'object' && specimen.project_id?.title 
      ? specimen.project_id.title.toLowerCase() 
      : '';
    return (
      specimen.code_name?.toLowerCase().includes(query) ||
      specimen.accession_number?.toLowerCase().includes(query) ||
      specimen.accession_no?.toLowerCase().includes(query) ||
      specimen.classification?.toLowerCase().includes(query) ||
      specimen.source?.toLowerCase().includes(query) ||
      specimen.locale?.toLowerCase().includes(query) ||
      projectTitle.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading specimens...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      
      <AdminCollection
        specimens={filteredSpecimens}
        onView={(spec) => handleViewSpecimen(spec as Specimen)}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setSelectedProject(null);
        }}
        onSave={handleSaveProject}
        project={selectedProject}
      />

      <SpecimenModal
        isOpen={isSpecimenModalOpen}
        onClose={() => {
          setIsSpecimenModalOpen(false);
          setSelectedSpecimen(null);
        }}
        onSave={handleSaveSpecimen}
        specimen={selectedSpecimen}
        projects={projects}
      />

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
    </>
  );
}
