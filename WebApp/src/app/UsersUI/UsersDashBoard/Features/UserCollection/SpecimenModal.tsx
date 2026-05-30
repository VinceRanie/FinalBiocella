"use client";

import { useState, useEffect } from "react";
import { X, Upload, ChevronDown, ChevronRight, Dna, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/config/api";
import Modal from "@/app/components/Modal";
import { validateFASTAFile, FASTAValidationResult } from "@/lib/fastaValidator";
import FASTAValidationDisplay from "@/components/FASTAValidationDisplay";

interface SpecimenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (specimen: FormData) => void;
  specimen?: any;
  projects: any[];
}

export default function SpecimenModal({ isOpen, onClose, onSave, specimen, projects }: SpecimenModalProps) {
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    molecular: false,
    biochemical: false,
    culture: false,
    custom: false
  });

  const [formData, setFormData] = useState({
    // Required fields
    project_id: "",
    code_name: "",
    classification: "",
    source: "",
    date_accessed: "",
    
    // Optional basic fields
    locale: "",
    project_fund: "",
    description: "",
    
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
    
    // Dynamic custom fields
    custom_fields: {} as Record<string, string>
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [fastaFile, setFastaFile] = useState<File | null>(null);
  const [blastStatus, setBlastStatus] = useState<string>("");
  const [blastResults, setBlastResults] = useState<any>(null);
  const [fastaValidation, setFastaValidation] = useState<FASTAValidationResult | null>(null);
  const [modalConfig, setModalConfig] = useState<{ type: "success" | "error" | "info"; title: string; message: string } | null>(null);

  useEffect(() => {
    if (specimen) {
      setFormData({
        project_id: specimen.project_id?._id || specimen.project_id || "",
        code_name: specimen.code_name || "",
        classification: specimen.classification || "",
        source: specimen.source || "",
        date_accessed: specimen.date_accessed ? specimen.date_accessed.split('T')[0] : "",
        locale: specimen.locale || "",
        project_fund: specimen.project_fund || "",
        description: specimen.description || "",
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
        custom_fields: specimen.custom_fields || {}
      });
      if (specimen.image_url) {
        setImagePreview(specimen.image_url);
      }
      if (specimen.blast_results) {
        setBlastResults(specimen.blast_results);
      }
    } else {
      // Reset for new specimen
      setFormData({
        project_id: "",
        code_name: "",
        classification: "",
        source: "",
        date_accessed: "",
        locale: "",
        project_fund: "",
        description: "",
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
        custom_fields: {}
      });
      setImageFile(null);
      setImagePreview("");
      setFastaFile(null);
      setBlastStatus("");
      setBlastResults(null);
      setFastaValidation(null);
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
    }
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

  const addCustomField = () => {
    const fieldName = prompt("Enter field name:");
    if (fieldName && fieldName.trim()) {
      setFormData({
        ...formData,
        custom_fields: {
          ...formData.custom_fields,
          [fieldName.trim()]: ""
        }
      });
    }
  };

  const removeCustomField = (fieldName: string) => {
    const { [fieldName]: removed, ...rest } = formData.custom_fields;
    setFormData({
      ...formData,
      custom_fields: rest
    });
  };

  const handleCustomFieldChange = (fieldName: string, value: string) => {
    setFormData({
      ...formData,
      custom_fields: {
        ...formData.custom_fields,
        [fieldName]: value
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check FASTA validation if a file was selected
    if (fastaFile && fastaValidation && !fastaValidation.isValid) {
      setModalConfig({ type: 'error', title: 'Invalid FASTA File', message: `${fastaValidation.message}\n\nPlease fix the issues before submitting.` });
      return;
    }
    
    const submitData = new FormData();
    
    // Add all form fields
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'biochemical_tests' || key === 'custom_fields') {
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
    
    onSave(submitData);
  };

  const handleBlastSubmit = async () => {
    if (!specimen || !specimen._id) {
      setModalConfig({ type: 'error', title: 'Error', message: 'Please save the specimen first before running BLAST' });
      return;
    }

    // Check FASTA validation if a new file was selected
    if (fastaFile && fastaValidation && !fastaValidation.isValid) {
      setModalConfig({ type: 'error', title: 'Invalid FASTA File', message: `${fastaValidation.message}\\n\\nPlease fix the issues before submitting to BLAST.` });
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
        setModalConfig({ type: 'success', title: 'BLAST Submitted', message: `BLAST submitted! RID: ${data.rid}. Results usually take 2–10 minutes and may take longer during peak load.` });

        // Poll for results after 60 seconds
        setTimeout(() => checkBlastResults(), 60000);
      } else {
        setBlastStatus("error");
        setModalConfig({ type: 'error', title: 'Error', message: `BLAST submission failed: ${data.error}` });
      }
    } catch (error) {
      setBlastStatus("error");
      setModalConfig({ type: 'error', title: 'Error', message: 'Failed to submit BLAST request' });
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
        setModalConfig({ type: 'success', title: 'BLAST Complete', message: 'BLAST results ready!' });
      } else if (data.status === 'pending') {
        setBlastStatus("pending");
        setModalConfig({ type: 'info', title: 'BLAST Running', message: 'BLAST is still running. Results usually take 2–10 minutes and may take longer during peak load.' });
      } else {
        setBlastStatus(data.status);
      }
    } catch (error) {
      console.error("Error checking BLAST results:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto p-4">
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-red-500">*</span> Required Information
            </h3>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="e.g., NRCP Sediment Project"
                />
              </div>

              {/* Image Upload */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Specimen Image
                </label>
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#113F67] transition-colors">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                  placeholder="Brief description of the specimen..."
                />
              </div>
            </div>
          </div>

          {/* MOLECULAR/GENETIC DATA SECTION */}
          <div className="mb-6 border rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('molecular')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2 font-semibold text-gray-800">
                <Dna className="w-5 h-5" />
                Molecular & Genetic Data
              </span>
              {expandedSections.molecular ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
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
                      className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {fastaFile && (
                      <span className="text-sm text-green-600">{fastaFile.name}</span>
                    )}
                  </div>
                  {specimen && specimen.fasta_file && !fastaFile && (
                    <p className="mt-1 text-sm text-gray-500">Current: {specimen.fasta_file.split('/').pop()}</p>
                  )}
                  
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
                      disabled={blastStatus === 'submitting' || blastStatus === 'pending' || Boolean(fastaFile && fastaValidation && !fastaValidation.isValid)}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., 95.16"
                  />
                </div>
              </div>
            )}
          </div>

          {/* BIOCHEMICAL TESTS SECTION */}
          <div className="mb-6 border rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('biochemical')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-800">Biochemical Tests (21 tests)</span>
              {expandedSections.biochemical ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
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
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#113F67]"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                      >
                        <option value="">Select</option>
                        <option value="Alpha-hemolysis">Alpha-hemolysis</option>
                        <option value="Beta-hemolysis">Beta-hemolysis</option>
                        <option value="Gamma-hemolysis">Gamma-hemolysis (No hemolysis)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CULTURE REQUIREMENTS SECTION */}
          <div className="mb-6 border rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('culture')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-800">Culture Requirements</span>
              {expandedSections.culture ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            {expandedSections.culture && (
              <div className="p-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Growth Media</label>
                  <input
                    type="text"
                    value={formData.growth_media}
                    onChange={(e) => setFormData({ ...formData, growth_media: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Nutrient Agar, LB Broth"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activity</label>
                  <input
                    type="text"
                    value={formData.activity}
                    onChange={(e) => setFormData({ ...formData, activity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="e.g., Active, Dormant"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requirements</label>
                  <textarea
                    value={formData.special_reqs}
                    onChange={(e) => setFormData({ ...formData, special_reqs: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Temperature, pH, oxygen requirements, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result/Notes</label>
                  <textarea
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                    placeholder="Additional observations or results"
                  />
                </div>
              </div>
            )}
          </div>

          {/* CUSTOM FIELDS SECTION */}
          <div className="mb-6 border rounded-lg">
            <button
              type="button"
              onClick={() => toggleSection('custom')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <span className="font-semibold text-gray-800">Additional Custom Fields</span>
              {expandedSections.custom ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
            
            {expandedSections.custom && (
              <div className="p-4 border-t">
                <button
                  type="button"
                  onClick={addCustomField}
                  className="mb-4 flex items-center gap-2 px-3 py-2 border border-dashed border-gray-400 rounded-lg hover:border-[#113F67] hover:bg-gray-50 transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Custom Field
                </button>

                {Object.keys(formData.custom_fields).length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No custom fields added yet</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(formData.custom_fields).map(([fieldName, value]) => (
                      <div key={fieldName} className="flex items-start gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700 mb-1">{fieldName}</label>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) => handleCustomFieldChange(fieldName, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCustomField(fieldName)}
                          className="mt-7 p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t sticky bottom-0 bg-white">
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
              {specimen ? "Update" : "Add"} Specimen
            </button>
          </div>
        </form>
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
