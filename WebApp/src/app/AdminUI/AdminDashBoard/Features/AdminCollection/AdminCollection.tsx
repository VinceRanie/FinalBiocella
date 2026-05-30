// "use client";

// import React, { useState, useEffect } from "react";
// import { API_URL } from "@/config/api";
// import { Eye, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";
// import { useRouter } from "next/navigation";

// interface Collection {
//   _id: string;
//   publish_status?: 'published' | 'unpublished';
//   code_name: string;
//   classification: string;
//   source: string;
//   date_accessed: string;
//   locale?: string;
//   project_fund?: string;
//   accession_number?: string;
//   accession_no?: string;
//   similarity_percent?: string;
//   project_id: string | {
//     _id: string;
//     title: string;
//     code: string;
//     classification: string;
//   };
//   description?: string;
//   fasta_file?: string;
//   fasta_sequence?: string;
//   blast_rid?: string;
//   blast_rid_expired_at?: string;
//   blast_results?: any;
//   biochemical_tests?: {
//     onpg?: string;
//     glu?: string;
//     adh?: string;
//     man?: string;
//     ldc?: string;
//     ino?: string;
//     odc?: string;
//     sor?: string;
//     cit?: string;
//     rha?: string;
//     h2s?: string;
//     sac?: string;
//     ure?: string;
//     mel?: string;
//     tda?: string;
//     amy?: string;
//     ind?: string;
//     ara?: string;
//     vp?: string;
//     no2?: string;
//     gel?: string;
//   };
//   catalase?: string;
//   hemolysis?: string;
//   oxidase?: string;
//   growth_media?: string;
//   special_reqs?: string;
//   activity?: string;
//   result?: string;
//   custom_fields?: Record<string, string>;
// }

// const sampleCollections_backup = [
//   {
//     id: 1,
//     code: "CBN1",
//     name: "Bacillus cereus strain DZ102",
//     Project: "NRCP sediment Project",
//     Locale: "Bantayan Island, Cebu",
//     source: "Mangrove Sediment",
//     classifications: "Bacteria",
//   },
//   {
//     id: 2,
//     code: "CBN2",
//     name: "Escherichia coli strain X10",
//     Project: "NRCP water Project",
//     Locale: "Mactan Channel, Cebu",
//     source: "Water",
//     classifications: "Bacteria",
//   },
// ];

// export default function CollectionTable({ specimens, onEdit, onDelete, onView, onTogglePublish }: { 
//   specimens: Collection[], 
//   onEdit: (specimen: Collection) => void,
//   onDelete: (id: string) => void,
//   onView: (specimen: Collection) => void,
//   onTogglePublish: (specimen: Collection) => void
// }) {
//   const [selectedId, setSelectedId] = useState<string | null>(null);
//   const [sortColumn, setSortColumn] = useState<string | null>(null);
//   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

//   const handleRowClick = (id: string) => {
//     setSelectedId((prev) => (prev === id ? null : id));
//   };

//   const handleSort = (column: string) => {
//     if (sortColumn === column) {
//       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
//     } else {
//       setSortColumn(column);
//       setSortOrder('asc');
//     }
//   };

//   const getSortedData = () => {
//     if (!sortColumn) return [...specimens].reverse();
    
    
//     const sorted = [...specimens].sort((a, b) => {
//       let aVal: any = a[sortColumn as keyof Collection];
//       let bVal: any = b[sortColumn as keyof Collection];
      
//       if (sortColumn === 'project_id') {
//         aVal = typeof a.project_id === 'object' ? a.project_id?.title : a.project_id;
//         bVal = typeof b.project_id === 'object' ? b.project_id?.title : b.project_id;
//       }
      
//       if (aVal == null) aVal = '';
//       if (bVal == null) bVal = '';
      
//       if (typeof aVal === 'string') aVal = aVal.toLowerCase();
//       if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
//       if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
//       if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
//       return 0;
//     });
    
//     return sorted;
//   };

//   const SortIcon = ({ column }: { column: string }) => {
//     if (sortColumn !== column) return <div className="w-4 h-4" />;
//     return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
//   };

//   const SortableHeader = ({ column, label }: { column: string; label: string }) => (
//     <th
//       className="px-4 py-3 text-left text-sm font-semibold text-white uppercase cursor-pointer hover:bg-[#0d2f4d] transition-colors"
//       onClick={() => handleSort(column)}
//     >
//       <div className="flex items-center gap-2">
//         {label}
//         <SortIcon column={column} />
//       </div>
//     </th>
//   );

//   // Remove _index from sort logic since No. column is removed
//   const handleSort_updated = handleSort;

//   return (
//     <div className="w-full flex flex-col px-4 sm:px-6 lg:px-8 py-6">
//       <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col flex-1 overflow-hidden">
//         <div className="flex-1 overflow-y-auto">
//           <table className="table-auto w-full">
//             <thead className="bg-[#113F67] sticky top-0 z-10">
//               <tr>
//                 <SortableHeader column="code_name" label="Code" />
//                 <SortableHeader column="accession_no" label="Accession No." />
//                 <SortableHeader column="project_id" label="Project" />
//                 <SortableHeader column="locale" label="Locale" />
//                 <SortableHeader column="source" label="Source" />
//                 <SortableHeader column="classification" label="Classification" />
//                 <SortableHeader column="publish_status" label="Status" />
//                 <th className="px-4 py-3 text-left text-sm font-semibold text-white uppercase">
//                   Actions
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200">
//               {getSortedData().length === 0 ? (
//                 <tr>
//                   <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
//                     No specimens found. Add your first specimen to get started.
//                   </td>
//                 </tr>
//               ) : (
//                 getSortedData().map((specimen, index) => (
//                   <React.Fragment key={specimen._id}>
//                     <tr
//                       className="bg-white hover:bg-blue-50 transition-colors duration-150 cursor-pointer"
//                       onClick={() => handleRowClick(specimen._id)}
//                     >
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         {specimen.code_name}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         {specimen.accession_number || specimen.accession_no || "N/A"}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         {typeof specimen.project_id === 'object' ? specimen.project_id?.title : "N/A"}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         {specimen.locale || "N/A"}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         {specimen.source || "N/A"}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         {specimen.classification || (typeof specimen.project_id === 'object' ? specimen.project_id?.classification : "N/A")}
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         <span
//                           className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
//                             specimen.publish_status === 'published'
//                               ? 'bg-green-100 text-green-800'
//                               : 'bg-amber-100 text-amber-800'
//                           }`}
//                         >
//                           {specimen.publish_status === 'published' ? 'Published' : 'Unpublished'}
//                         </span>
//                       </td>
//                       <td className="px-4 py-3 text-sm text-gray-800">
//                         <div className="flex gap-2">
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               console.log("View button clicked, specimen:", specimen);
//                               console.log("Specimen _id:", specimen._id);
//                               onView(specimen);
//                             }}
//                             className="p-1 text-blue-600 hover:bg-blue-50 rounded"
//                             title="View Details"
//                           >
//                             <Eye className="w-4 h-4" />
//                           </button>
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               console.log("Edit button clicked, specimen:", specimen);
//                               console.log("Specimen _id:", specimen._id);
//                               onEdit(specimen);
//                             }}
//                             className="p-1 text-yellow-600 hover:bg-yellow-50 rounded"
//                             title="Edit"
//                           >
//                             <Edit className="w-4 h-4" />
//                           </button>
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               onTogglePublish(specimen);
//                             }}
//                             className="px-2 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded"
//                             title={specimen.publish_status === 'published' ? 'Unpublish' : 'Publish'}
//                           >
//                             {specimen.publish_status === 'published' ? 'Unpublish' : 'Publish'}
//                           </button>
//                           <button
//                             onClick={(e) => {
//                               e.stopPropagation();
//                               if (confirm("Are you sure you want to delete this specimen?")) {
//                                 onDelete(specimen._id);
//                               }
//                             }}
//                             className="p-1 text-red-600 hover:bg-red-50 rounded"
//                             title="Delete"
//                           >
//                             <Trash2 className="w-4 h-4" />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>

//                     {selectedId === specimen._id && (
//                       <tr className="bg-gray-50">
//                         <td colSpan={8}>
//                           <div className="p-4">
//                             <h4 className="font-semibold text-gray-700 mb-2">Description:</h4>
//                             <p className="text-sm text-gray-600">
//                               {specimen.description || "No description available"}
//                             </p>
//                             <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
//                               {specimen.project_fund && (
//                                 <div>
//                                   <span className="font-medium">Project Fund:</span>{" "}
//                                   {specimen.project_fund}
//                                 </div>
//                               )}
//                               {specimen.date_accessed && (
//                                 <div>
//                                   <span className="font-medium">Date Accessed:</span>{" "}
//                                   {new Date(specimen.date_accessed).toLocaleDateString()}
//                                 </div>
//                               )}
//                               {specimen.accession_no && (
//                                 <div>
//                                   <span className="font-medium">Accession No:</span>{" "}
//                                   {specimen.accession_no}
//                                 </div>
//                               )}
//                               {specimen.similarity_percent && (
//                                 <div>
//                                   <span className="font-medium">Similarity:</span>{" "}
//                                   {specimen.similarity_percent}%
//                                 </div>
//                               )}
//                               {specimen.catalase && (
//                                 <div>
//                                   <span className="font-medium">Catalase:</span>{" "}
//                                   {specimen.catalase}
//                                 </div>
//                               )}
//                               {specimen.oxidase && (
//                                 <div>
//                                   <span className="font-medium">Oxidase:</span>{" "}
//                                   {specimen.oxidase}
//                                 </div>
//                               )}
//                               {specimen.growth_media && (
//                                 <div>
//                                   <span className="font-medium">Growth Media:</span>{" "}
//                                   {specimen.growth_media}
//                                 </div>
//                               )}
//                               {specimen.custom_fields && Object.keys(specimen.custom_fields).length > 0 && (
//                                 <>
//                                   {Object.entries(specimen.custom_fields).map(([key, value]) => (
//                                     <div key={key}>
//                                       <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>{" "}
//                                       {value}
//                                     </div>
//                                   ))}
//                                 </>
//                               )}
//                             </div>
//                           </div>
//                         </td>
//                       </tr>
//                     )}
//                   </React.Fragment>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
//           <p className="text-sm text-gray-600">
//             Showing {specimens.length} specimen{specimens.length !== 1 ? "s" : ""}
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }
"use client";

import React, { useState } from "react";
import { Eye, Edit, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import ConfirmModal from "./ConfirmModal";

interface Collection {
  _id: string;
  publish_status?: "published" | "unpublished";
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
  project_id:
    | string
    | {
        _id: string;
        title: string;
        code: string;
        classification: string;
      };
  description?: string;
  custom_fields?: Record<string, string>;
  catalase?: string;
  oxidase?: string;
  growth_media?: string;
}

export default function CollectionTable({
  specimens,
  onEdit,
  onDelete,
  onView,
  onTogglePublish,
}: {
  specimens: Collection[];
  onEdit: (specimen: Collection) => void;
  onDelete: (id: string) => void;
  onView: (specimen: Collection) => void;
  onTogglePublish: (specimen: Collection) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name?: string } | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const handleRowClick = (id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  const getSortedData = () => {
    if (!sortColumn) return [...specimens].reverse();

    return [...specimens].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Collection];
      let bVal: any = b[sortColumn as keyof Collection];

      if (sortColumn === "project_id") {
        aVal =
          typeof a.project_id === "object"
            ? a.project_id?.title
            : a.project_id;
        bVal =
          typeof b.project_id === "object"
            ? b.project_id?.title
            : b.project_id;
      }

      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column)
      return <div className="w-4 h-4 opacity-30" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const SortableHeader = ({
    column,
    label,
  }: {
    column: string;
    label: string;
  }) => {
    const isActive = sortColumn === column;

    return (
      <th
        onClick={() => handleSort(column)}
        className={`px-4 py-3 text-left text-sm font-semibold uppercase cursor-pointer transition-all
          ${
            isActive
              ? "bg-white text-[#113F67]"
              : "text-white hover:bg-[#0d2f4d]"
          }`}
      >
        <div className="flex items-center gap-2">
          {label}
          <span
            className={`transition ${
              isActive ? "text-[#113F67]" : "text-white"
            }`}
          >
            <SortIcon column={column} />
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-y-auto">
          <table className="w-full">
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

            <tbody className="divide-y divide-gray-100">
              {getSortedData().length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-gray-500">
                    No specimens found.
                  </td>
                </tr>
              ) : (
                getSortedData().map((specimen) => (
                  <React.Fragment key={specimen._id}>
                    <tr
                      onClick={() => handleRowClick(specimen._id)}
                      className="bg-white hover:bg-[#f4f8fb] transition cursor-pointer"
                    >
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.code_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.accession_number ||
                          specimen.accession_no ||
                          "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {typeof specimen.project_id === "object"
                          ? specimen.project_id?.title
                          : "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.locale || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.source || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.classification || "N/A"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800">
                        {specimen.created_by || specimen.updated_by || "N/A"}
                      </td>

                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 text-xs rounded-full font-medium ${
                            specimen.publish_status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {specimen.publish_status === "published"
                            ? "Published"
                            : "Unpublished"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(specimen);
                            }}
                            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(specimen);
                            }}
                            className="p-1.5 rounded-md text-yellow-600 hover:bg-yellow-50 transition"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onTogglePublish(specimen);
                            }}
                            className="px-2 py-1 text-xs rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            {specimen.publish_status === "published"
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete({ id: specimen._id, name: specimen.code_name });
                            }}
                            className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {selectedId === specimen._id && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="p-4 text-sm text-gray-600">
                          {specimen.description || "No description available"}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ConfirmModal
          isOpen={!!pendingDelete}
          title="Delete Specimen"
          message={
            pendingDelete
              ? `Are you sure you want to delete "${pendingDelete.name || 'this specimen'}"? This action cannot be undone.`
              : "Are you sure?"
          }
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            if (pendingDelete) onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
        />

        <div className="px-4 py-3 border-t bg-gray-50 text-sm text-gray-600">
          Showing {specimens.length} specimen
          {specimens.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}