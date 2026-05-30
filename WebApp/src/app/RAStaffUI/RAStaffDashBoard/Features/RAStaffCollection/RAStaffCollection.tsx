"use client";

import React, { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { Eye, Edit, ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

interface Collection {
  _id: string;
  publish_status?: 'published' | 'unpublished';
  created_by?: string;
  updated_by?: string;
  code_name: string;
  classification: string;
  source: string;
  date_accessed: string;
  locale?: string;
  project_fund?: string;
  accession_number?: string;
  accession_no?: string;
  similarity_percent?: string;
  project_id: string | {
    _id: string;
    title: string;
    code: string;
    classification: string;
  };
  description?: string;
  fasta_file?: string;
  fasta_sequence?: string;
  blast_rid?: string;
  blast_rid_expired_at?: string;
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

export default function RAStaffCollection({ specimens, onEdit, onView, onTogglePublish }: { 
  specimens: Collection[], 
  onEdit: (specimen: Collection) => void,
  onView: (specimen: Collection) => void,
  onTogglePublish: (specimen: Collection) => void
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleRowClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
  };

  const getSortedData = () => {
    if (!sortColumn) return [...specimens].reverse();
    
    const sorted = [...specimens].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Collection];
      let bVal: any = b[sortColumn as keyof Collection];
      
      if (sortColumn === 'project_id') {
        aVal = typeof a.project_id === 'object' ? a.project_id?.title : a.project_id;
        bVal = typeof b.project_id === 'object' ? b.project_id?.title : b.project_id;
      }
      
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <div className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold text-white uppercase cursor-pointer hover:bg-[#0d2f4d] transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2">
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  const formatCustomFieldValue = (value: any) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return String(value.value || "N/A");
    }
    return String(value || "N/A");
  };

  return (
    <div className="w-full flex flex-col px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <table className="table-auto w-full">
            <thead className="bg-[#113F67] sticky top-0 z-10">
              <tr>
                <SortableHeader column="code_name" label="Code" />
                <SortableHeader column="accession_no" label="Accession No." />
                <SortableHeader column="project_id" label="Project" />
                <SortableHeader column="locale" label="Locale" />
                <SortableHeader column="source" label="Source" />
                <SortableHeader column="classification" label="Classification" />
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Added By
                </th>
                <SortableHeader column="publish_status" label="Status" />
                <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getSortedData().length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No specimens found. Add your first specimen to get started.
                  </td>
                </tr>
              ) : (
                getSortedData().map((specimen, index) => (
                  <React.Fragment key={specimen._id}>
                    <tr
                      className="bg-white hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
                      onClick={() => handleRowClick(specimen._id)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.code_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.accession_number || specimen.accession_no || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {typeof specimen.project_id === 'object' ? specimen.project_id?.title : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.locale || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.source || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.classification || (typeof specimen.project_id === 'object' ? specimen.project_id?.classification : "N/A")}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.created_by || specimen.updated_by || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                            specimen.publish_status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {specimen.publish_status === 'published' ? 'Published' : 'Unpublished'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("View button clicked, specimen:", specimen);
                              console.log("Specimen _id:", specimen._id);
                              onView(specimen);
                            }}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("Edit button clicked, specimen:", specimen);
                              console.log("Specimen _id:", specimen._id);
                              onEdit(specimen);
                            }}
                            className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePublish(specimen);
                            }}
                            className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
                            title={specimen.publish_status === 'published' ? 'Unpublish' : 'Publish'}
                          >
                            {specimen.publish_status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {selectedId === specimen._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={9}>
                          <div className="p-4">
                            <h4 className="font-semibold text-gray-700 mb-2">Description:</h4>
                            <p className="text-sm text-gray-600">
                              {specimen.description || "No description available"}
                            </p>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                              {specimen.project_fund && (
                                <div>
                                  <span className="font-medium">Project Fund:</span>{" "}
                                  {specimen.project_fund}
                                </div>
                              )}
                              {specimen.date_accessed && (
                                <div>
                                  <span className="font-medium">Date Accessed:</span>{" "}
                                  {new Date(specimen.date_accessed).toLocaleDateString()}
                                </div>
                              )}
                              {specimen.accession_no && (
                                <div>
                                  <span className="font-medium">Accession No:</span>{" "}
                                  {specimen.accession_no}
                                </div>
                              )}
                              {specimen.similarity_percent && (
                                <div>
                                  <span className="font-medium">Similarity:</span>{" "}
                                  {specimen.similarity_percent}%
                                </div>
                              )}
                              {specimen.catalase && (
                                <div>
                                  <span className="font-medium">Catalase:</span>{" "}
                                  {specimen.catalase}
                                </div>
                              )}
                              {specimen.oxidase && (
                                <div>
                                  <span className="font-medium">Oxidase:</span>{" "}
                                  {specimen.oxidase}
                                </div>
                              )}
                              {specimen.growth_media && (
                                <div>
                                  <span className="font-medium">Growth Media:</span>{" "}
                                  {specimen.growth_media}
                                </div>
                              )}
                              {specimen.custom_fields && Object.keys(specimen.custom_fields).length > 0 && (
                                <>
                                  {Object.entries(specimen.custom_fields).map(([key, value]) => (
                                    <div key={key}>
                                      <span className="font-medium capitalize">
                                        {(value && typeof value === "object" && value.label) ? value.label : key.replace(/_/g, ' ')}:
                                      </span>{" "}
                                      {formatCustomFieldValue(value)}
                                    </div>
                                  ))}
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Showing {specimens.length} specimen{specimens.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
