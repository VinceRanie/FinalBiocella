"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import AdminCollection from "./AdminCollection";
import AdminControls from "./AdminControls";
import ProjectModal from "./ProjectModal";
import SpecimenModal from "./SpecimenModal";
import CollectionImportModal, { NormalizedSpecimenRow } from "@/app/components/CollectionImportModal";
import { useRouter } from "next/navigation";
import AlertModal from "./AlertModal";
import { getUserData } from "@/app/utils/authUtil";

interface Project {
  _id: string;
  title: string;
  code: string;
  classification: string;
  user_id?: number | string;
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
  blast_results?: any;
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
  custom_fields?: Record<string, any>;
}

export default function AdminCollectionPage() {
  const [specimens, setSpecimens] = useState<Specimen[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpublished" | "published">("all");
  const [pendingEditSpecimenId, setPendingEditSpecimenId] = useState<string | null>(null);
  
  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSpecimenModalOpen, setIsSpecimenModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedSpecimen, setSelectedSpecimen] = useState<Specimen | null>(null);
  const [alertModal, setAlertModal] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const showAlert = (title: string, message: string) => {
    setAlertModal({ title, message });
  };
  
  const router = useRouter();

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

  const getCurrentUserId = () => {
    const user = getUserData();
    return user?.userId ?? null;
  };

  const normalizeCodeValue = (value: string) => String(value || "").trim().toLowerCase();

  const hasDuplicateProjectCode = (code: string, excludeId?: string | null) => {
    const normalized = normalizeCodeValue(code);
    if (!normalized) return false;

    return projects.some((project) => {
      if (excludeId && project._id === excludeId) return false;
      return normalizeCodeValue(project.code) === normalized;
    });
  };

  const hasDuplicateSpecimenCode = (code: string, excludeId?: string | null) => {
    const normalized = normalizeCodeValue(code);
    if (!normalized) return false;

    return specimens.some((specimen) => {
      if (excludeId && specimen._id === excludeId) return false;
      return normalizeCodeValue(specimen.code_name) === normalized;
    });
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
      const response = await fetch(`${API_URL}/microbials?role=admin`);
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched specimens:", data);
        console.log("First specimen _id:", data[0]?._id);
        setSpecimens(data);
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("edit");
    if (editId) {
      setPendingEditSpecimenId(editId);
      return;
    }

    if (params.get("modal") !== "add-specimen") return;

    setSelectedSpecimen(null);
    setIsSpecimenModalOpen(true);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!pendingEditSpecimenId || loading) return;

    const specimenToEdit = specimens.find((specimen) => specimen._id === pendingEditSpecimenId);
    if (!specimenToEdit) {
      showAlert("Error", "Specimen not found");
      setPendingEditSpecimenId(null);
      const url = new URL(window.location.href);
      url.searchParams.delete("edit");
      window.history.replaceState({}, "", url.pathname + url.search);
      return;
    }

    setSelectedSpecimen(specimenToEdit);
    setIsSpecimenModalOpen(true);
    setPendingEditSpecimenId(null);

    const url = new URL(window.location.href);
    url.searchParams.delete("edit");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [pendingEditSpecimenId, loading, specimens]);

  // Project handlers
  const handleSaveProject = async (projectData: any) => {
    try {
      if (hasDuplicateProjectCode(projectData.code, selectedProject?._id || null)) {
        showAlert("Error", "Project code already exists. Use a unique project code.");
        return;
      }

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
        showAlert(
          "Success",
          selectedProject
            ? "Project updated successfully!"
            : "Project created successfully!"
        );

      } else {
        const error = await response.json();
        showAlert("Error", error.message || "Failed to save project");
      }
    } catch (error) {
      console.error("Error saving project:", error);
      showAlert("Error", "Error saving project");
    }
  };

  // Specimen handlers
  const handleSaveSpecimen = async (specimenData: FormData) => {
    try {
      const nextCodeName = String(specimenData.get("code_name") || "").trim();
      if (hasDuplicateSpecimenCode(nextCodeName, selectedSpecimen?._id || null)) {
        showAlert("Error", "Specimen code already exists. Use a unique specimen code.");
        return;
      }

      const method = selectedSpecimen ? "PUT" : "POST";
      const url = selectedSpecimen
        ? `${API_URL}/microbials/${selectedSpecimen._id}`
        : `${API_URL}/microbials`;

      if (selectedSpecimen) {
        const updatedBy = getCurrentUserDisplayName();
        specimenData.set("updated_at", new Date().toISOString());
        if (updatedBy) {
          specimenData.set("updated_by", updatedBy);
        }
      }

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
        showAlert(
          "Success",
          selectedSpecimen
            ? "Specimen updated successfully! QR code has been generated."
            : "Specimen added successfully! QR code has been generated."
        );
      } else {
        const error = await response.json();
        showAlert("Error", error.error || "Failed to save specimen");
      }
    } catch (error) {
      console.error("Error saving specimen:", error);
      showAlert("Error", "Error saving specimen");
    }
  };

  const handleDeleteSpecimen = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/microbials/${id}`, {
        method: "DELETE",
        headers: (() => {
          const userId = getCurrentUserId();
          const headers = new Headers();
          if (userId) {
            headers.set("x-user-id", String(userId));
          }
          return headers;
        })(),
      });

      if (response.ok) {
        await fetchSpecimens();
        showAlert("Success", "Specimen deleted successfully!");
      } else {
        showAlert("Error", "Failed to delete specimen");
      }
    } catch (error) {
      console.error("Error deleting specimen:", error);
      showAlert("Error", "Error deleting specimen");
    }
  };

  const handleTogglePublish = async (specimen: Specimen) => {
    try {
      const nextStatus = specimen.publish_status === 'published' ? 'unpublished' : 'published';
      const payload = new FormData();
      payload.append('publish_status', nextStatus);
      const userId = getCurrentUserId();
      if (userId) {
        payload.append('user_id', String(userId));
      }

      const response = await fetch(`${API_URL}/microbials/${specimen._id}`, {
        method: 'PUT',
        body: payload,
      });

      if (response.ok) {
        await fetchSpecimens();
        showAlert(
          "Success",
          nextStatus === "published"
            ? "Specimen published successfully!"
            : "Specimen unpublished successfully!"
        );
      } else {
        showAlert("Error", "Failed to update publish status");
      }
    } catch (error) {
      console.error('Error updating publish status:', error);
      showAlert("Error", "Error updating publish status");
    }
  };

  const handleImportSpecimens = async (rows: NormalizedSpecimenRow[], options?: { overwrite?: boolean }) => {
    const displayName = getCurrentUserDisplayName();
    const userId = getCurrentUserId();
    const role = getUserData()?.role || "admin";
    const basePayload = {
      source_file_name: "Spreadsheet import",
      role,
      created_by: displayName,
      reviewed_by: displayName,
      approved_by: displayName,
      user_id: userId,
      rows,
    };

    const createResponse = await fetch(`${API_URL}/microbials/import-batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(basePayload),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({}));
      throw new Error(error.error || "Failed to stage import batch");
    }

    const createdBatch = await createResponse.json();

    const approveResponse = await fetch(`${API_URL}/microbials/import-batches/${createdBatch._id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        approved_by: displayName,
        user_id: userId,
        role,
        overwrite: Boolean(options?.overwrite === true),
      }),
    });

    if (!approveResponse.ok) {
      const error = await approveResponse.json().catch(() => ({}));
      throw new Error(error.error || "Failed to approve staged import batch");
    }

    const result = await approveResponse.json();
    await fetchSpecimens();
    showAlert(
      "Import complete",
      `Created ${result.created} specimen${result.created === 1 ? "" : "s"} from batch ${createdBatch._id}. ${result.failed > 0 ? `${result.failed} row${result.failed === 1 ? " was" : "s were"} skipped.` : ""}`.trim()
    );

    return { created: result.created || 0, failed: result.failed || 0, report: createdBatch.report || result.batch?.report };
  };

  const handleViewSpecimen = (specimen: any) => {
    console.log("View specimen:", specimen);
    if (!specimen._id) {
      showAlert("Error", "Specimen ID is missing");
      return;
    }
    // Navigate to specimen details page or open a detailed modal
    router.push(`/AdminUI/AdminDashBoard/Features/AdminCollection/specimen/${specimen._id}`);
  };

  const handleEditSpecimen = (specimen: any) => {
    console.log("Edit specimen:", specimen);
    if (!specimen._id) {
      showAlert("Error", "Specimen ID is missing");
      return;
    }
    setSelectedSpecimen(specimen);
    setIsSpecimenModalOpen(true);
  };

  // Filter specimens based on search query
  const filteredSpecimens = specimens.filter((specimen: any) => {
    const matchesStatus =
      statusFilter === "all" ||
      (specimen.publish_status || "unpublished") === statusFilter;

    if (!matchesStatus) return false;

    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      specimen.code_name?.toLowerCase().includes(query) ||
      specimen.accession_number?.toLowerCase().includes(query) ||
      specimen.accession_no?.toLowerCase().includes(query) ||
      specimen.classification?.toLowerCase().includes(query) ||
      specimen.source?.toLowerCase().includes(query) ||
      specimen.locale?.toLowerCase().includes(query) ||
      specimen.project_id?.title?.toLowerCase().includes(query)
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
        onAddProject={() => {
          setSelectedProject(null);
          setIsProjectModalOpen(true);
        }}
        onAddSpecimen={() => {
          setSelectedSpecimen(null);
          setIsSpecimenModalOpen(true);
        }}
        onImportSpecimens={() => setIsImportModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />
      
      <AdminCollection
        specimens={filteredSpecimens}
        onEdit={handleEditSpecimen}
        onDelete={handleDeleteSpecimen}
        onView={handleViewSpecimen}
        onTogglePublish={handleTogglePublish}
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

      <CollectionImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projects={projects}
        onImport={handleImportSpecimens}
        roleLabel="admin"
      />

    <AlertModal
      isOpen={!!alertModal}
      title={alertModal?.title || ""}
      message={alertModal?.message || ""}
      onClose={() => setAlertModal(null)}
    />

    </>
  );
}
