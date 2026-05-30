"use client";

import { useState, useEffect, Fragment } from "react";
import { Chemical, Batch } from "./types";
import AddChemicalModal from "./AddChemicalModal";
import EditChemicalModal from "./EditChemicalModal";
import DeleteConfirmModal from "./DeleteConfirmModal";
import BatchDeleteConfirmModal from "@/app/components/BatchDeleteConfirmModal";
import { Search, Plus, Edit, Trash2, ChevronLeft, ChevronRight, Package, ChevronUp, ChevronDown } from "lucide-react";
import { API_URL } from "@/config/api";

export default function AdminInventory() {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [filteredChemicals, setFilteredChemicals] = useState<Chemical[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalMode, setAddModalMode] = useState<"new-chemical" | "existing-container">("new-chemical");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedChemical, setSelectedChemical] = useState<Chemical | null>(null);
  const [editingChemical, setEditingChemical] = useState<Chemical | null>(null);
  
  // Search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Sorting
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedChemicalIds, setExpandedChemicalIds] = useState<Set<number>>(new Set());
  const [selectedBatch, setSelectedBatch] = useState<number | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Fetch chemicals and batches from API
  const fetchChemicals = async () => {
    setLoading(true);
    try {
      const [chemicalsRes, batchesRes] = await Promise.all([
        fetch(`${API_URL}/chemicals`),
        fetch(`${API_URL}/batches`)
      ]);
      
      if (!chemicalsRes.ok) throw new Error("Failed to fetch chemicals");
      if (!batchesRes.ok) throw new Error("Failed to fetch batches");
      
      const chemicalsData = await chemicalsRes.json();
      const batchesData = await batchesRes.json();
      
      console.log('Fetched chemicals:', chemicalsData);
      console.log('Fetched batches:', batchesData);
      
      setChemicals(chemicalsData);
      setFilteredChemicals(chemicalsData);
      setBatches(batchesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChemicals();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const modal = params.get("modal");
    if (modal === "add-chemical") {
      setAddModalMode("new-chemical");
      setIsAddModalOpen(true);
    }
    if (modal === "add-container") {
      setAddModalMode("existing-container");
      setIsAddModalOpen(true);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Search and filter logic
  useEffect(() => {
    let result = chemicals;

    // Only show chemicals that still have at least one active batch.
    const activeChemicalIds = new Set(batches.map((batch) => batch.chemical_id));
    result = result.filter((chemical) => activeChemicalIds.has(chemical.chemical_id));

    // Search filter
    if (searchTerm) {
      result = result.filter((chemical) =>
        chemical.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Unit filter
    if (unitFilter !== "all") {
      result = result.filter((chemical) => chemical.unit === unitFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      result = result.filter((chemical) => chemical.type === typeFilter);
    }

    setFilteredChemicals(result);
    setCurrentPage(1); // Reset to first page on filter change
  }, [searchTerm, unitFilter, typeFilter, chemicals, batches]);

  // Check if quantity is below threshold
  const isLowStock = (chemical: Chemical) => {
    return getRemainingQuantity(chemical.chemical_id) <= chemical.threshold;
  };

  const getChemicalBatches = (chemicalId: number) =>
    batches.filter((batch) => batch.chemical_id === chemicalId);

  const getRemainingQuantity = (chemicalId: number) => {
    const chemicalBatches = getChemicalBatches(chemicalId);
    if (!chemicalBatches.length) return 0;
    return chemicalBatches.reduce(
      (sum, batch) => sum + Math.max(0, batch.quantity - batch.used_quantity),
      0
    );
  };

  const getPriorityBatch = (chemicalBatches: Batch[]) => {
    if (!chemicalBatches.length) return null;

    const getRemaining = (batch: Batch) => Math.max(0, batch.quantity - batch.used_quantity);
    const positiveRemaining = chemicalBatches.filter((batch) => getRemaining(batch) > 0);
    const source = positiveRemaining.length ? positiveRemaining : chemicalBatches;

    return [...source].sort((a, b) => {
      const remainingDiff = getRemaining(a) - getRemaining(b);
      if (remainingDiff !== 0) return remainingDiff;

      const expA = a.expiration_date ? new Date(a.expiration_date).getTime() : Number.POSITIVE_INFINITY;
      const expB = b.expiration_date ? new Date(b.expiration_date).getTime() : Number.POSITIVE_INFINITY;
      if (expA !== expB) return expA - expB;

      const recvA = new Date(a.date_received || "").getTime();
      const recvB = new Date(b.date_received || "").getTime();
      if (recvA !== recvB) return recvA - recvB;

      return a.batch_id - b.batch_id;
    })[0];
  };

  const toggleExpandedChemical = (chemicalId: number) => {
    setExpandedChemicalIds((prev) => {
      const next = new Set(prev);
      if (next.has(chemicalId)) {
        next.delete(chemicalId);
      } else {
        next.add(chemicalId);
      }
      return next;
    });
  };

  const getSortedBatchesForChemical = (chemicalId: number) => {
    const chemicalBatches = getChemicalBatches(chemicalId);
    return [...chemicalBatches].sort((a, b) => {
      const dateA = new Date(a.date_received || "").getTime();
      const dateB = new Date(b.date_received || "").getTime();

      if (dateA !== dateB) {
        return dateB - dateA;
      }

      return b.batch_id - a.batch_id;
    });
  };

  const downloadBatchQrWithLabel = async (qrCodeDataUrl: string, batchId: number) => {
    try {
      const image = new Image();
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Unable to load QR image."));
        image.src = qrCodeDataUrl;
      });

      const padding = 16;
      const labelAreaHeight = 44;
      const canvas = document.createElement("canvas");
      canvas.width = image.width + padding * 2;
      canvas.height = image.height + padding * 2 + labelAreaHeight;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas context is not available.");

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, padding, padding);

      context.fillStyle = "#0f172a";
      context.font = "600 18px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(`Batch ID: ${batchId}`, canvas.width / 2, image.height + padding + labelAreaHeight / 2);

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `batch_${batchId}_qr.png`;
      link.click();
    } catch {
      const fallbackLink = document.createElement("a");
      fallbackLink.href = qrCodeDataUrl;
      fallbackLink.download = `batch_${batchId}_qr.png`;
      fallbackLink.click();
    }
  };

  const getLotGroupsLabel = (chemical: Chemical) => {
    const chemicalBatches = getChemicalBatches(chemical.chemical_id);
    if (!chemicalBatches.length) return "N/A";

    const lotTotals = chemicalBatches.reduce((acc, batch) => {
      const lot = (batch.lot_number || "NO-LOT").trim() || "NO-LOT";
      const remaining = Math.max(0, batch.quantity - batch.used_quantity);
      acc[lot] = (acc[lot] || 0) + remaining;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(lotTotals)
      .map(([lot, total]) => `${lot}: ${total} ${chemical.unit}`)
      .join(", ");
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
    if (!sortColumn) return [...filteredChemicals].reverse();
    
    const sorted = [...filteredChemicals].sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Chemical];
      let bVal: any = b[sortColumn as keyof Chemical];
      
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  // Pagination logic
  const sortedChemicals = getSortedData();
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedChemicals.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedChemicals.length / itemsPerPage);

  // Get unique units for filter
  const uniqueUnits = Array.from(new Set(chemicals.map((c) => c.unit)));
  const uniqueTypes = Array.from(new Set(chemicals.map((c) => c.type)));

  // Handler functions
  const handleEdit = (chemical: Chemical) => {
    setEditingChemical(chemical);
  };

  const handleDelete = (chemical: Chemical) => {
    setSelectedChemical(chemical);
    setIsDeleteModalOpen(true);
  };

  const handleAddSuccess = () => {
    fetchChemicals();
    setIsAddModalOpen(false);
  };

  const handleDeleteSuccess = () => {
    fetchChemicals();
    setIsDeleteModalOpen(false);
  };

  const handleEditSuccess = () => {
    fetchChemicals();
    setEditingChemical(null);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <div className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <th
      className="px-6 py-3 text-left text-sm font-semibold text-white uppercase cursor-pointer hover:bg-[#0d2f4d] transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-2">
        {label}
        <SortIcon column={column} />
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
      <h2 className="text-2xl font-bold text-[#113F67]">
    ADMIN INVENTORY
  </h2>


  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
    <button
      onClick={() => {
        setAddModalMode("new-chemical");
        setIsAddModalOpen(true);
      }}
      className="flex items-center justify-center gap-2 bg-[#113F67] text-white px-4 py-2 rounded-lg hover:bg-[#0d2f4d] transition-colors w-full sm:w-auto"
    >
      <Plus size={20} />
      Add New Chemical
    </button>
    <button
      onClick={() => {
        setAddModalMode("existing-container");
        setIsAddModalOpen(true);
      }}
      className="flex items-center justify-center gap-2 border border-[#113F67] text-[#113F67] px-4 py-2 rounded-lg hover:bg-[#113F67]/10 transition-colors w-full sm:w-auto"
    >
      <Plus size={20} />
      Add Container to Existing
    </button>
  </div>
</div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by chemical name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#113F67] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
            />
          </div>

          {/* Type Filter */}
          <div className="md:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
            >
              <option value="all">All Types</option>
              {uniqueTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div className="md:w-48">
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#113F67]"
            >
              <option value="all">All Units</option>
              {uniqueUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#113F67] text-white">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Container IDs</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Lot Groups</th>
                <SortableHeader column="name" label="Name" />
                <SortableHeader column="type" label="Type" />
                <SortableHeader column="quantity" label="Quantity" />
                <SortableHeader column="unit" label="Unit" />
                <th className="px-6 py-3 text-left text-sm font-semibold">Priority Location</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Priority Exp. Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">QR Code</th>
                <th className="px-6 py-3 text-center text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">
                    No chemicals found
                  </td>
                </tr>
              ) : (
                currentItems.map((chemical) => {
                  const chemicalBatches = getChemicalBatches(chemical.chemical_id);
                  const priorityBatch = getPriorityBatch(chemicalBatches);
                  const sortedBatches = getSortedBatchesForChemical(chemical.chemical_id);
                  const isExpanded = expandedChemicalIds.has(chemical.chemical_id);
                  const remainingQuantity = chemicalBatches.length
                    ? chemicalBatches.reduce(
                        (sum, batch) => sum + Math.max(0, batch.quantity - batch.used_quantity),
                        0
                      )
                    : chemical.quantity;
                  return (
                  <Fragment key={chemical.chemical_id}>
                    <tr
                      className={`hover:bg-gray-50 ${
                        isLowStock(chemical) ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-semibold">{chemicalBatches.length} bottle(s)</div>
                        <div className="text-xs text-gray-500 mt-1">Use Show to view all batch IDs</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {getLotGroupsLabel(chemical)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {chemical.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {chemical.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {remainingQuantity}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {chemical.unit}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {priorityBatch?.location || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {priorityBatch?.expiration_date ? new Date(priorityBatch.expiration_date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap gap-1.5">
                          {isLowStock(chemical) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Low Stocks
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              In Stock
                            </span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                            Shared Threshold
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        {priorityBatch?.qr_code ? (
                          <button
                            onClick={() => {
                              if (!priorityBatch?.batch_id || !priorityBatch.qr_code) return;
                              void downloadBatchQrWithLabel(priorityBatch.qr_code, priorityBatch.batch_id);
                            }}
                            className="inline-block"
                            title="Download QR Code (closest-to-empty bottle)"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img 
                              src={priorityBatch.qr_code} 
                              alt={`QR Code for ${chemical.name}`}
                              className="w-12 h-12 mx-auto hover:scale-110 transition-transform cursor-pointer"
                            />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">No QR</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => toggleExpandedChemical(chemical.chemical_id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title={isExpanded ? "Hide Containers" : "Show Containers"}
                          >
                            {isExpanded ? "Hide" : "Show"}
                          </button>
                          <button
                            onClick={() => {
                              if (priorityBatch) {
                                window.location.href = `/AdminUI/AdminDashBoard/Features/AdminInventory/batch/${priorityBatch.batch_id}`;
                              }
                            }}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="View Batches"
                          >
                            <Package size={18} />
                          </button>
                          <button
                            onClick={() => handleEdit(chemical)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(chemical)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-slate-50">
                        <td colSpan={11} className="px-6 py-4">
                          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 border-b border-slate-200">
                              Containers for {chemical.name}
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-700">
                                  <tr>
                                    <th className="px-4 py-2 text-left font-semibold">Batch ID</th>
                                    <th className="px-4 py-2 text-left font-semibold">Lot</th>
                                    <th className="px-4 py-2 text-left font-semibold">Qty</th>
                                    <th className="px-4 py-2 text-left font-semibold">Exp. Date</th>
                                    <th className="px-4 py-2 text-left font-semibold">Location</th>
                                    <th className="px-4 py-2 text-left font-semibold">QR</th>
                                    <th className="px-4 py-2 text-left font-semibold">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {sortedBatches.length === 0 ? (
                                    <tr>
                                      <td colSpan={6} className="px-4 py-3 text-slate-500">
                                        No bottle records found.
                                      </td>
                                    </tr>
                                  ) : (
                                    sortedBatches.map((batch) => (
                                      <tr key={batch.batch_id}>
                                        <td className="px-4 py-3 font-medium text-slate-900">#{batch.batch_id}</td>
                                        <td className="px-4 py-3 text-slate-700">{(batch.lot_number || "NO-LOT").trim() || "NO-LOT"}</td>
                                        <td className="px-4 py-3 text-slate-700">
                                          {batch.quantity} {chemical.unit}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                          {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : "N/A"}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{batch.location || "N/A"}</td>
                                        <td className="px-4 py-3 text-slate-700">
                                          {batch.qr_code ? (
                                            <button
                                              onClick={() => void downloadBatchQrWithLabel(batch.qr_code!, batch.batch_id)}
                                              className="px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                                              title={`Print QR for batch #${batch.batch_id}`}
                                            >
                                              Print QR
                                            </button>
                                          ) : (
                                            <span className="text-xs text-gray-400">No QR</span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => { setSelectedBatch(batch.batch_id); setIsBatchDeleteModalOpen(true); }}
                                              title={`Delete container #${batch.batch_id}`}
                                              className="px-2 py-1 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                                            >
                                              Delete
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Showing {currentItems.length} of {sortedChemicals.length} chemicals
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddChemicalModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddSuccess}
        mode={addModalMode}
      />

      {editingChemical && (
        <EditChemicalModal
          isOpen={!!editingChemical}
          onClose={() => setEditingChemical(null)}
          onSuccess={handleEditSuccess}
          chemical={editingChemical}
        />
      )}
      
      {selectedChemical && (
        <DeleteConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onSuccess={handleDeleteSuccess}
          chemical={selectedChemical}
        />
      )}
      {isBatchDeleteModalOpen && (
        <BatchDeleteConfirmModal
          isOpen={isBatchDeleteModalOpen}
          onClose={() => { setIsBatchDeleteModalOpen(false); setSelectedBatch(null); }}
          onSuccess={async () => { await fetchChemicals(); setIsBatchDeleteModalOpen(false); setSelectedBatch(null); }}
          batchId={selectedBatch}
        />
      )}
    </div>
  );
}