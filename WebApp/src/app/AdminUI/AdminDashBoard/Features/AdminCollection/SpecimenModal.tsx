"use client";

import { useState, useEffect } from "react";
import { X, Upload, ChevronDown, ChevronRight, Dna, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/config/api";
import { validateFASTAFile, FASTAValidationResult } from "@/lib/fastaValidator";
import FASTAValidationDisplay from "@/components/FASTAValidationDisplay";

type SectionKey = "basic" | "molecular" | "biochemical" | "morphology" | "culture";
type CustomFieldType = "text" | "textarea" | "status" | "file" | "image_description";

type CustomImageDescriptionValue = {
  image_url: string;
  description: string;
};

type CustomFieldEntry = {
  label: string;
  section: SectionKey;
  type: CustomFieldType;
  value: string | CustomImageDescriptionValue;
};

const toCustomImageDescriptionValue = (value: unknown): CustomImageDescriptionValue => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const raw = value as Record<string, unknown>;
    return {
      image_url: String(raw.image_url || ""),
      description: String(raw.description || ""),
    };
  }

  return {
    image_url: "",
    description: String(value || ""),
  };
};

interface SpecimenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (specimen: FormData) => Promise<void> | void;
  specimen?: any;
  projects: any[];
}

const DEFAULT_MORPHOLOGY = {
  shape: "",
  cell_size: "",
  colony_size: "",
  pigmentation: "",
  form: "",
  elevation: "",
  margin: "",
  colony_surface: "",
  opacity: "",
  texture: "",
  spore_formation: "",
  mycelium_formation: "",
  description: ""
};

const CLASSIFICATION_OPTIONS = ["Bacteria", "Fungi", "Archaea", "Virus", "Algae", "Protozoa", "Mixed"];

const normalizeCustomFieldMap = (input: any): Record<string, CustomFieldEntry> => {
  if (!input || typeof input !== "object") return {};

  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entry = value as Partial<CustomFieldEntry>;
      const normalizedSection: SectionKey = ["basic", "molecular", "biochemical", "morphology", "culture"].includes(String(entry.section))
        ? (entry.section as SectionKey)
        : "basic";
      const normalizedType: CustomFieldType = ["text", "textarea", "status", "file", "image_description"].includes(String(entry.type))
        ? (entry.type as CustomFieldType)
        : "text";

      acc[key] = {
        label: String(entry.label || key).trim() || key,
        section: normalizedSection,
        type: normalizedType,
        value: normalizedType === "image_description"
          ? toCustomImageDescriptionValue(entry.value)
          : String(entry.value || ""),
      };
      return acc;
    }

    acc[key] = {
      label: key,
      section: "basic",
      type: "text",
      value: String(value || ""),
    };
    return acc;
  }, {} as Record<string, CustomFieldEntry>);
};

export default function SpecimenModal({ isOpen, onClose, onSave, specimen, projects }: SpecimenModalProps) {
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    molecular: false,
    biochemical: false,
    morphology: false,
    culture: false
  });

  const [classificationOption, setClassificationOption] = useState("");
  const [customClassification, setCustomClassification] = useState("");
  const [customFieldModal, setCustomFieldModal] = useState<{
    open: boolean;
    section: SectionKey;
    label: string;
    type: CustomFieldType;
    error: string;
  }>({
    open: false,
    section: "basic",
    label: "",
    type: "text",
    error: "",
  });

  const [formData, setFormData] = useState({
    // Required fields
    project_id: "",
    code_name: "",
    publish_status: "unpublished",
    classification: "",
    source: "",
    date_accessed: "",
    
    // Optional basic fields
    locale: "",
    project_fund: "",
    description: "",
    update_notes: "",
    
    // Molecular/Genetic data
    accession_no: "",
    similarity_percent: "",
    
    // Biochemical tests
    biochemical_tests: {
      onpg: "", glu: "", adh: "", man: "", ldc: "", ino: "",
      odc: "", sor: "", cit: "", rha: "", h2s: "", sac: "",
      ure: "", mel: "", tda: "", amy: "", ind: "", ara: "",
      vp: "", no2: "", gel: ""
    },
    
    // Microbiological properties
    catalase: "",
    hemolysis: "",
    oxidase: "",
    
    // Culture requirements
    growth_media: "",
    special_reqs: "",
    activity: "",
    result: "",

    // Cell and Colony Morphology
    morphology: { ...DEFAULT_MORPHOLOGY },
    
    // Dynamic custom fields
    custom_fields: {} as Record<string, CustomFieldEntry>
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [customFieldImageFiles, setCustomFieldImageFiles] = useState<Record<string, File>>({});
  const [customFieldImagePreviews, setCustomFieldImagePreviews] = useState<Record<string, string>>({});
  const [fastaFile, setFastaFile] = useState<File | null>(null);
  const [fastaValidation, setFastaValidation] = useState<FASTAValidationResult | null>(null);
  const [blastStatus, setBlastStatus] = useState<string>("");
  const [blastResults, setBlastResults] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (specimen) {
      setFormData({
        project_id: specimen.project_id?._id || specimen.project_id || "",
        code_name: specimen.code_name || "",
        publish_status: specimen.publish_status || "unpublished",
        classification: specimen.classification || "",
        source: specimen.source || "",
        date_accessed: specimen.date_accessed ? specimen.date_accessed.split('T')[0] : "",
        locale: specimen.locale || "",
        project_fund: specimen.project_fund || "",
        description: specimen.description || "",
        update_notes: specimen.update_notes || specimen.notes || "",
        accession_no: specimen.accession_no || "",
        similarity_percent: specimen.similarity_percent || "",
        biochemical_tests: specimen.biochemical_tests || {
          onpg: "", glu: "", adh: "", man: "", ldc: "", ino: "",
          odc: "", sor: "", cit: "", rha: "", h2s: "", sac: "",
          ure: "", mel: "", tda: "", amy: "", ind: "", ara: "",
          vp: "", no2: "", gel: ""
        },
        catalase: specimen.catalase || "",
        hemolysis: specimen.hemolysis || "",
        oxidase: specimen.oxidase || "",
        growth_media: specimen.growth_media || "",
        special_reqs: specimen.special_reqs || "",
        activity: specimen.activity || "",
        result: specimen.result || "",
        morphology: specimen.morphology || { ...DEFAULT_MORPHOLOGY },
        custom_fields: normalizeCustomFieldMap(specimen.custom_fields)
      });

      const existingClassification = String(specimen.classification || "").trim();
      if (!existingClassification) {
        setClassificationOption("");
        setCustomClassification("");
      } else if (CLASSIFICATION_OPTIONS.includes(existingClassification)) {
        setClassificationOption(existingClassification);
        setCustomClassification("");
      } else {
        setClassificationOption("Other");
        setCustomClassification(existingClassification);
      }

      if (specimen.image_url) {
        setImagePreview(specimen.image_url);
      }
      if (specimen.blast_results) {
        setBlastResults(specimen.blast_results);
      }

      setCustomFieldImageFiles({});
      setCustomFieldImagePreviews({});
      setFastaValidation(null);
    } else {
      // Reset for new specimen
      setFormData({
        project_id: "",
        code_name: "",
        publish_status: "unpublished",
        classification: "",
        source: "",
        date_accessed: "",
        locale: "",
        project_fund: "",
        description: "",
        update_notes: "",
        accession_no: "",
        similarity_percent: "",
        biochemical_tests: {
          onpg: "", glu: "", adh: "", man: "", ldc: "", ino: "",
          odc: "", sor: "", cit: "", rha: "", h2s: "", sac: "",
          ure: "", mel: "", tda: "", amy: "", ind: "", ara: "",
          vp: "", no2: "", gel: ""
        },
        catalase: "",
        hemolysis: "",
        oxidase: "",
        growth_media: "",
        special_reqs: "",
        activity: "",
        result: "",
        morphology: { ...DEFAULT_MORPHOLOGY },
        custom_fields: {}
      });
      setClassificationOption("");
      setCustomClassification("");
      setImageFile(null);
      setImagePreview("");
      setFastaFile(null);
      setFastaValidation(null);
      setBlastStatus("");
      setBlastResults(null);
      setCustomFieldImageFiles({});
      setCustomFieldImagePreviews({});
    }
  }, [specimen]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFastaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFastaFile(file);

      // Validate FASTA file
      try {
        const validation = await validateFASTAFile(file);
        setFastaValidation(validation);
      } catch (error) {
        console.error('FASTA validation error:', error);
        setFastaValidation({
          isValid: false,
          errors: ['Failed to validate FASTA file'],
          warnings: [],
          sequenceType: null,
          sequenceLength: 0,
          message: 'Error reading file - please try again'
        });
      }

      // Extract accession number if present (and validation passed)
      file.text().then((text) => {
        const extractedAccession = extractAccessionFromFasta(text);
        if (extractedAccession) {
          setFormData((prev) => ({
            ...prev,
            accession_no: prev.accession_no?.trim() ? prev.accession_no : extractedAccession
          }));
        }
      }).catch(() => {
        // Ignore parse errors; backend still validates FASTA on submit.
      });
    }
  };

  const extractAccessionFromFasta = (fastaContent: string): string => {
    if (!fastaContent) return "";

    const lines = fastaContent.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith(">")) continue;

      const header = line.slice(1).trim();
      if (!header) continue;

      const pipeTokens = header.split("|").map(token => token.trim()).filter(Boolean);
      const fromPipe = pipeTokens.find((token) =>
        /^[A-Z]{1,4}_[A-Z0-9]+(?:\.[0-9]+)?$/i.test(token) ||
        /^[A-Z]{1,3}[0-9]{5,}(?:\.[0-9]+)?$/i.test(token)
      );
      if (fromPipe) return fromPipe.toUpperCase();

      const firstToken = header.split(/\s+/)[0] || "";
      if (
        /^[A-Z]{1,4}_[A-Z0-9]+(?:\.[0-9]+)?$/i.test(firstToken) ||
        /^[A-Z]{1,3}[0-9]{5,}(?:\.[0-9]+)?$/i.test(firstToken)
      ) {
        return firstToken.toUpperCase();
      }
    }

    return "";
  };

  const handleBiochemicalChange = (test: string, value: string) => {
    setFormData({
      ...formData,
      biochemical_tests: {
        ...formData.biochemical_tests,
        [test]: value
      }
    });
  };

  const openCustomFieldModal = (section: SectionKey) => {
    setCustomFieldModal({
      open: true,
      section,
      label: "",
      type: section === "biochemical" ? "status" : "text",
      error: "",
    });
  };

  const closeCustomFieldModal = () => {
    setCustomFieldModal((prev) => ({
      ...prev,
      open: false,
      label: "",
      error: "",
    }));
  };

  const addCustomField = () => {
    const fieldName = customFieldModal.label.trim();
    if (!fieldName) {
      setCustomFieldModal((prev) => ({ ...prev, error: "Field title is required." }));
      return;
    }

    const section = customFieldModal.section;
    const inputType = customFieldModal.type;
    const fieldId = `${section}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    setFormData((prev) => ({
      ...prev,
      custom_fields: {
        ...prev.custom_fields,
        [fieldId]: {
          label: fieldName,
          section,
          type: inputType,
          value: inputType === "image_description"
            ? { image_url: "", description: "" }
            : "",
        },
      },
    }));

    setExpandedSections((prev) => ({ ...prev, [section]: true }));
    closeCustomFieldModal();
  };

  const removeCustomField = (fieldId: string) => {
    setFormData((prev) => {
      const { [fieldId]: _removed, ...rest } = prev.custom_fields;
      return {
        ...prev,
        custom_fields: rest,
      };
    });

    setCustomFieldImageFiles((prev) => {
      const { [fieldId]: _removed, ...rest } = prev;
      return rest;
    });

    setCustomFieldImagePreviews((prev) => {
      const { [fieldId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setFormData((prev) => {
      const existing = prev.custom_fields[fieldId];
      if (!existing) return prev;

      return {
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [fieldId]: {
            ...existing,
            value,
          },
        },
      };
    });
  };

  const handleCustomImageDescriptionChange = (
    fieldId: string,
    key: keyof CustomImageDescriptionValue,
    value: string
  ) => {
    setFormData((prev) => {
      const existing = prev.custom_fields[fieldId];
      if (!existing || existing.type !== "image_description") return prev;

      const currentValue = toCustomImageDescriptionValue(existing.value);
      return {
        ...prev,
        custom_fields: {
          ...prev.custom_fields,
          [fieldId]: {
            ...existing,
            value: {
              ...currentValue,
              [key]: value,
            },
          },
        },
      };
    });
  };

  const handleCustomImageFileChange = (fieldId: string, file: File | null) => {
    if (!file) {
      setCustomFieldImageFiles((prev) => {
        const { [fieldId]: _removed, ...rest } = prev;
        return rest;
      });
      setCustomFieldImagePreviews((prev) => {
        const { [fieldId]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    setCustomFieldImageFiles((prev) => ({
      ...prev,
      [fieldId]: file,
    }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomFieldImagePreviews((prev) => ({
        ...prev,
        [fieldId]: reader.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  const renderCustomFieldsForSection = (section: SectionKey) => {
    const fields = Object.entries(formData.custom_fields).filter(([, entry]) => entry.section === section);
    if (!fields.length) return null;

    return (
      <div className="mt-4 border-t pt-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Custom Inputs</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(([fieldId, entry]) => (
            <div key={fieldId} className="rounded-lg border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label className="text-sm font-medium text-gray-700">{entry.label}</label>
                <button
                  type="button"
                  onClick={() => removeCustomField(fieldId)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Remove custom field"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {entry.type === "textarea" && (
                <textarea
                  value={String(entry.value || "")}
                  onChange={(e) => handleCustomFieldChange(fieldId, e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
              )}

              {entry.type === "status" && (
                <select
                  value={String(entry.value || "")}
                  onChange={(e) => handleCustomFieldChange(fieldId, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option value="">Select result</option>
                  <option value="+">Positive (+)</option>
                  <option value="-">Negative (-)</option>
                  <option value="Weak (+)">Weak (+)</option>
                  <option value="Weak (-)">Weak (-)</option>
                </select>
              )}

              {entry.type === "file" && (
                <input
                  type="text"
                  value={String(entry.value || "")}
                  onChange={(e) => handleCustomFieldChange(fieldId, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="File name or file link"
                />
              )}

              {entry.type === "image_description" && (
                <div className="space-y-3">
                  <label className="flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#113F67] px-3 py-4 text-center hover:bg-[#113F67]/5">
                    <Upload className="mb-2 h-6 w-6 text-gray-500" />
                    <span className="text-xs text-gray-600">Upload reaction image</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => handleCustomImageFileChange(fieldId, e.target.files?.[0] || null)}
                    />
                  </label>

                  {customFieldImageFiles[fieldId] && (
                    <p className="text-xs text-green-600">Selected: {customFieldImageFiles[fieldId].name}</p>
                  )}

                  {(customFieldImagePreviews[fieldId] || toCustomImageDescriptionValue(entry.value).image_url) && (
                    <div className="relative h-40 w-full overflow-hidden rounded-lg border border-gray-200">
                      <Image
                        src={customFieldImagePreviews[fieldId]
                          ? customFieldImagePreviews[fieldId]
                          : `${API_URL}${toCustomImageDescriptionValue(entry.value).image_url}`}
                        alt={`${entry.label} preview`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}

                  <textarea
                    value={toCustomImageDescriptionValue(entry.value).description}
                    onChange={(e) => handleCustomImageDescriptionChange(fieldId, "description", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Add description for this reaction image"
                  />
                </div>
              )}

              {entry.type === "text" && (
                <input
                  type="text"
                  value={String(entry.value || "")}
                  onChange={(e) => handleCustomFieldChange(fieldId, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!String(formData.classification || "").trim()) {
      alert("Please provide a classification.");
      return;
    }

    if (specimen && !String(formData.update_notes || "").trim()) {
      alert("Please add update notes before saving changes.");
      return;
    }

    // Check FASTA validation if a new file was selected
    if (fastaFile && fastaValidation && !fastaValidation.isValid) {
      alert(`Invalid FASTA file: ${fastaValidation.message}\n\nPlease fix the issues before submitting.`);
      return;
    }

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    const submitData = new FormData();
    const customImageMap: Record<string, number> = {};
    let customImageIndex = 0;

    Object.entries(formData.custom_fields).forEach(([fieldId, entry]) => {
      if (entry.type !== "image_description") {
        return;
      }

      const imageFileForField = customFieldImageFiles[fieldId];
      if (!imageFileForField) {
        return;
      }

      submitData.append("custom_images", imageFileForField);
      customImageMap[fieldId] = customImageIndex;
      customImageIndex += 1;
    });

    if (Object.keys(customImageMap).length > 0) {
      submitData.append("custom_image_map", JSON.stringify(customImageMap));
    }
    
    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'update_notes' && !specimen) {
        return;
      }

      if (key === 'biochemical_tests' || key === 'custom_fields' || key === 'morphology') {
        submitData.append(key, JSON.stringify(value));
      } else {
        submitData.append(key, value as string);
      }
    });
    
    // Add files
    if (imageFile) {
      submitData.append('image', imageFile);
    }
    if (fastaFile) {
      submitData.append('fasta_file', fastaFile);
    }

    try {
      await onSave(submitData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlastSubmit = async () => {
    if (!specimen || !specimen._id) {
      alert("Please save the specimen first before running BLAST");
      return;
    }

    setBlastStatus("submitting");
    try {
      const response = await fetch(`${API_URL}/microbials/${specimen._id}/blast`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (response.ok) {
        setBlastStatus("pending");
        alert(`BLAST submitted! RID: ${data.rid}. Results usually take 2–10 minutes and may take longer during peak load.`);

        // Poll for results after 60 seconds
        setTimeout(() => checkBlastResults(), 60000);
      } else {
        setBlastStatus("error");
        alert(`BLAST submission failed: ${data.error}`);
      }
    } catch (error) {
      setBlastStatus("error");
      alert("Failed to submit BLAST request");
    }
  };

  const checkBlastResults = async () => {
    if (!specimen || !specimen._id) return;

    try {
      const response = await fetch(`${API_URL}/microbials/${specimen._id}/blast/results`);
      const data = await response.json();
      
      if (data.status === 'completed') {
        setBlastStatus("completed");
        setBlastResults(data.results);
        alert("BLAST results ready!");
      } else if (data.status === 'pending') {
        setBlastStatus("pending");
        alert("BLAST is still running. Results usually take 2–10 minutes and may take longer during peak load.");
      } else {
        setBlastStatus(data.status);
      }
    } catch (error) {
      console.error("Error checking BLAST results:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl my-8">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-semibold text-[#113F67]">
            {specimen ? "Edit Specimen" : "Add New Specimen"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          
          {/* REQUIRED FIELDS - Always Visible */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <span className="text-red-500">*</span> Required Information
              </h3>
              <button
                type="button"
                onClick={() => openCustomFieldModal("basic")}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#113F67] px-2 py-1 text-xs font-medium text-[#113F67] hover:bg-[#113F67]/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Input Field
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Selection */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option value="">Select a Project</option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.title} ({project.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Code Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.code_name}
                  onChange={(e) => setFormData({ ...formData, code_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="e.g., CBN1"
                />
              </div>

              {/* Classification */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classification <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={classificationOption}
                  onChange={(e) => {
                    const next = e.target.value;
                    setClassificationOption(next);
                    if (next === "Other") {
                      setFormData((prev) => ({ ...prev, classification: "" }));
                      return;
                    }

                    setCustomClassification("");
                    setFormData((prev) => ({ ...prev, classification: next }));
                  }}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option value="">Select Classification</option>
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                  <option value="Other">Other</option>
                </select>
                {classificationOption === "Other" && (
                  <input
                    type="text"
                    required
                    value={customClassification}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomClassification(value);
                      setFormData((prev) => ({ ...prev, classification: value }));
                    }}
                    className="mt-2 w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Enter custom classification"
                  />
                )}
              </div>

              {/* Publish Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Publish Status
                </label>
                <select
                  value={formData.publish_status}
                  onChange={(e) => setFormData({ ...formData, publish_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option value="unpublished">Unpublished</option>
                  <option value="published">Published</option>
                </select>
              </div>

              {/* Source */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="e.g., Mangrove Sediment"
                />
              </div>

              {/* Date Accessed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Accessed <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.date_accessed}
                  onChange={(e) => setFormData({ ...formData, date_accessed: e.target.value })}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                />
              </div>

              {/* Locale */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Locale
                </label>
                <input
                  type="text"
                  value={formData.locale}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="e.g., Bantayan Island, Cebu"
                />
              </div>

              {/* Project Fund */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Fund
                </label>
                <input
                  type="text"
                  value={formData.project_fund}
                  onChange={(e) => setFormData({ ...formData, project_fund: e.target.value })}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="e.g., NRCP Sediment Project"
                />
              </div>

              {specimen && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.update_notes}
                    onChange={(e) => setFormData({ ...formData, update_notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Describe what changed in this update"
                  />
                </div>
              )}

              {/* Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Image
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#113F67] rounded-lg cursor-pointer hover:border-[#113F67] transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-2 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF, WebP (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageChange}
                      />
                    </label>
                    {imageFile && (
                      <p className="mt-2 text-sm text-green-600">
                        Selected: {imageFile.name}
                      </p>
                    )}
                  </div>
                  
                  {imagePreview && (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <Image
                        src={imagePreview.startsWith('/uploads') ? `${API_URL}${imagePreview}` : imagePreview}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="Brief description of the specimen..."
                />
              </div>

              <div className="md:col-span-2">{renderCustomFieldsForSection("basic")}</div>
            </div>
          </div>

          {/* MOLECULAR/GENETIC DATA SECTION */}
          <div className="mb-6 border rounded-lg">
            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => toggleSection('molecular')}
                className="flex items-center gap-2 font-semibold text-gray-800"
              >
                <Dna className="w-5 h-5" />
                Molecular & Genetic Data
                {expandedSections.molecular ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => openCustomFieldModal("molecular")}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#113F67] px-2 py-1 text-xs font-medium text-[#113F67] hover:bg-[#113F67]/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Input Field
              </button>
            </div>
            
            {expandedSections.molecular && (
              <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* FASTA File Upload */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    FASTA Sequence File
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".fasta,.fa,.fna,.ffn,.faa,text/plain,application/octet-stream"
                      onChange={handleFastaChange}
                      className="rounded-lg cursor-pointer flex-1 border border-[#113F67] text-sm text-[#113F67] file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#113F67] file:text-white hover:file:bg-[#113F67]"
                    />
                    {fastaFile && (
                      <span className="text-sm text-green-600">{fastaFile.name}</span>
                    )}
                  </div>
                  {specimen && specimen.fasta_file && !fastaFile && (
                    <p className="mt-1 text-sm text-gray-500">Current: {specimen.fasta_file.split('/').pop()}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Supports common NCBI FASTA formats for nucleotide/protein sequences. If an accession is present in the header, it will auto-fill below.
                  </p>
                  
                  {/* FASTA Validation Display */}
                  {fastaFile && fastaValidation && (
                    <FASTAValidationDisplay
                      isValid={fastaValidation.isValid}
                      errors={fastaValidation.errors}
                      warnings={fastaValidation.warnings}
                      sequenceType={fastaValidation.sequenceType}
                      sequenceLength={fastaValidation.sequenceLength}
                      message={fastaValidation.message}
                    />
                  )}
                </div>

                {/* BLAST Button */}
                {specimen && specimen.fasta_sequence && (
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={handleBlastSubmit}
                      disabled={blastStatus === 'submitting' || blastStatus === 'pending'}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
                    >
                      <Dna className="w-4 h-4" />
                      {blastStatus === 'submitting' ? 'Submitting...' : blastStatus === 'pending' ? 'BLAST Running...' : 'Submit to NCBI BLAST'}
                    </button>
                    {blastStatus === 'pending' && (
                      <button
                        type="button"
                        onClick={checkBlastResults}
                        className="mt-2 text-sm text-blue-600 hover:underline"
                      >
                        Check Results
                      </button>
                    )}
                  </div>
                )}

                {/* BLAST Results Display */}
                {blastResults && blastResults.topHit && (
                  <div className="md:col-span-2 p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">BLAST Results (Top Match)</h4>
                    <p className="text-sm"><strong>Title:</strong> {blastResults.topHit.title}</p>
                    <p className="text-sm"><strong>Accession:</strong> {blastResults.topHit.accession}</p>
                    <p className="text-sm"><strong>Similarity:</strong> {blastResults.topHit.similarity}%</p>
                    <p className="text-sm"><strong>E-value:</strong> {blastResults.topHit.evalue}</p>
                    {blastResults.matches && blastResults.matches.length > 1 && (
                      <p className="text-xs mt-2 text-gray-600">+ {blastResults.matches.length - 1} more matches</p>
                    )}
                  </div>
                )}

                {/* Accession Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accession Number
                  </label>
                  <input
                    type="text"
                    value={formData.accession_no}
                    onChange={(e) => setFormData({ ...formData, accession_no: e.target.value })}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., HM015629"
                  />
                </div>

                {/* Similarity Percent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Similarity %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.similarity_percent}
                    onChange={(e) => setFormData({ ...formData, similarity_percent: e.target.value })}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., 95.16"
                  />
                </div>

                <div className="md:col-span-2">{renderCustomFieldsForSection("molecular")}</div>
              </div>
            )}
          </div>

          {/* BIOCHEMICAL TESTS SECTION */}
          <div className="mb-6 border rounded-lg">
            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => toggleSection('biochemical')}
                className="flex items-center gap-2 font-semibold text-gray-800"
              >
                Biochemical Tests (21 tests)
                {expandedSections.biochemical ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => openCustomFieldModal("biochemical")}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#113F67] px-2 py-1 text-xs font-medium text-[#113F67] hover:bg-[#113F67]/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Input Field
              </button>
            </div>
            
            {expandedSections.biochemical && (
              <div className="p-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(formData.biochemical_tests).map((test) => (
                  <div key={test}>
                    <label className="block text-xs font-medium text-gray-700 mb-1 uppercase">
                      {test}
                    </label>
                    <select
                      value={formData.biochemical_tests[test as keyof typeof formData.biochemical_tests]}
                      onChange={(e) => handleBiochemicalChange(test, e.target.value)}
                      className="w-full px-2 py-1.5 border border-[#113F67] text-sm text-[#113F67] rounded focus:outline-none focus:ring-1 focus:ring-[#113F67]"
                    >
                      <option value="">-</option>
                      <option value="+">Positive (+)</option>
                      <option value="-">Negative (-)</option>
                      <option value="w">Weak (w)</option>
                    </select>
                  </div>
                ))}

                {/* Microbiological Properties */}
                <div className="col-span-2 md:col-span-4 mt-4 pt-4 border-t">
                  <h4 className="font-semibold text-gray-800 mb-3">Microbiological Properties</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Catalase</label>
                      <select
                        value={formData.catalase}
                        onChange={(e) => setFormData({ ...formData, catalase: e.target.value })}
                        className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                      >
                        <option value="">Select</option>
                        <option value="Positive">Positive</option>
                        <option value="Negative">Negative</option>
                        <option value="Weak">Weak</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Oxidase</label>
                      <select
                        value={formData.oxidase}
                        onChange={(e) => setFormData({ ...formData, oxidase: e.target.value })}
                        className="w-full px-3 py-2 border border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                      >
                        <option value="">Select</option>
                        <option value="Positive">Positive</option>
                        <option value="Negative">Negative</option>
                        <option value="Weak">Weak</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Hemolysis</label>
                      <select
                        value={formData.hemolysis}
                        onChange={(e) => setFormData({ ...formData, hemolysis: e.target.value })}
                        className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                      >
                        <option value="">Select</option>
                        <option value="Alpha-hemolysis">Alpha-hemolysis</option>
                        <option value="Beta-hemolysis">Beta-hemolysis</option>
                        <option value="Gamma-hemolysis">Gamma-hemolysis (No hemolysis)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 md:col-span-4">{renderCustomFieldsForSection("biochemical")}</div>
              </div>
            )}
          </div>

          {/* CULTURE REQUIREMENTS SECTION */}
          <div className="mb-6 border rounded-lg">
            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => toggleSection('morphology')}
                className="flex items-center gap-2 font-semibold text-gray-800"
              >
                Cell and Colony Morphology
                {expandedSections.morphology ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => openCustomFieldModal("morphology")}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#113F67] px-2 py-1 text-xs font-medium text-[#113F67] hover:bg-[#113F67]/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Input Field
              </button>
            </div>

            {expandedSections.morphology && (
              <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                  <input
                    type="text"
                    value={formData.morphology.shape}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, shape: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Cocci, Bacilli"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cell Size</label>
                  <input
                    type="text"
                    value={formData.morphology.cell_size}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, cell_size: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., 1-2 um"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colony Size</label>
                  <input
                    type="text"
                    value={formData.morphology.colony_size}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, colony_size: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., 2-4 mm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pigmentation</label>
                  <input
                    type="text"
                    value={formData.morphology.pigmentation}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, pigmentation: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Cream, Yellow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                  <input
                    type="text"
                    value={formData.morphology.form}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, form: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Circular, Irregular"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Elevation</label>
                  <input
                    type="text"
                    value={formData.morphology.elevation}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, elevation: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Flat, Raised"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Margin</label>
                  <input
                    type="text"
                    value={formData.morphology.margin}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, margin: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Entire, Lobate"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Colony Surface</label>
                  <input
                    type="text"
                    value={formData.morphology.colony_surface}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, colony_surface: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Smooth, Rough"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opacity</label>
                  <input
                    type="text"
                    value={formData.morphology.opacity}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, opacity: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Opaque, Translucent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texture</label>
                  <input
                    type="text"
                    value={formData.morphology.texture}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, texture: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Mucoid, Dry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spore Formation</label>
                  <input
                    type="text"
                    value={formData.morphology.spore_formation}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, spore_formation: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Present, Absent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mycelium Formation</label>
                  <input
                    type="text"
                    value={formData.morphology.mycelium_formation}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, mycelium_formation: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Present, Absent"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Morphology Description</label>
                  <textarea
                    value={formData.morphology.description}
                    onChange={(e) => setFormData({
                      ...formData,
                      morphology: { ...formData.morphology, description: e.target.value }
                    })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Additional morphology notes"
                  />
                </div>

                <div className="md:col-span-2">{renderCustomFieldsForSection("morphology")}</div>
              </div>
            )}
          </div>

          <div className="mb-6 border rounded-lg">
            <div className="flex items-center justify-between gap-3 p-4">
              <button
                type="button"
                onClick={() => toggleSection('culture')}
                className="flex items-center gap-2 font-semibold text-gray-800"
              >
                Culture Requirements
                {expandedSections.culture ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
              <button
                type="button"
                onClick={() => openCustomFieldModal("culture")}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-[#113F67] px-2 py-1 text-xs font-medium text-[#113F67] hover:bg-[#113F67]/5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Custom Input Field
              </button>
            </div>
            
            {expandedSections.culture && (
              <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Growth Media</label>
                  <input
                    type="text"
                    value={formData.growth_media}
                    onChange={(e) => setFormData({ ...formData, growth_media: e.target.value })}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Nutrient Agar, LB Broth"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
                  <input
                    type="text"
                    value={formData.activity}
                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Active, Dormant"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                  <textarea
                    value={formData.special_reqs}
                    onChange={(e) => setFormData({ ...formData, special_reqs: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Temperature, pH, oxygen requirements, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result/Notes</label>
                  <textarea
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#113F67] text-sm text-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Additional observations or results"
                  />
                </div>

                <div className="md:col-span-2">{renderCustomFieldsForSection("culture")}</div>

              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-transparent">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer px-4 py-2 bg-white border border-[#113F67] text-sm text-[#113F67] rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : `${specimen ? "Update" : "Add"} Specimen`}
            </button>
          </div>
        </form>
      </div>

      {customFieldModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#113F67]">Add Custom Input Field</h3>
            <p className="mt-1 text-sm text-gray-500">Choose a title, section, and input type.</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Field Title</label>
                <input
                  type="text"
                  value={customFieldModal.label}
                  onChange={(e) =>
                    setCustomFieldModal((prev) => ({ ...prev, label: e.target.value, error: "" }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="e.g., Gram stain reagent"
                />
                {customFieldModal.error && (
                  <p className="mt-1 text-xs text-red-600">{customFieldModal.error}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Section</label>
                <select
                  value={customFieldModal.section}
                  onChange={(e) =>
                    setCustomFieldModal((prev) => ({
                      ...prev,
                      section: e.target.value as SectionKey,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option value="basic">Required Information</option>
                  <option value="molecular">Molecular & Genetic Data</option>
                  <option value="biochemical">Biochemical Tests & Microbial Properties</option>
                  <option value="morphology">Cell & Colony Morphology</option>
                  <option value="culture">Culture Requirements</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Input Type</label>
                <select
                  value={customFieldModal.type}
                  onChange={(e) =>
                    setCustomFieldModal((prev) => ({ ...prev, type: e.target.value as CustomFieldType }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                >
                  <option value="text">Text</option>
                  <option value="textarea">Long Text</option>
                  <option value="status">Status (+ / - / weak)</option>
                  <option value="file">File Reference</option>
                  <option value="image_description">Upload Image + Description</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeCustomFieldModal}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addCustomField}
                className="rounded-lg bg-[#113F67] px-3 py-2 text-sm text-white hover:bg-[#0d2f4d]"
              >
                Add Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
