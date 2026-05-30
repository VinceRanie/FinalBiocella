"use client";

import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Sparkles, Upload, X } from "lucide-react";

type ProjectOption = {
  _id: string;
  title: string;
  code: string;
  classification: string;
};

type ImportRow = Record<string, string>;

type NormalizedSpecimenRow = {
  project_id: string;
  project?: string;
  project_code?: string;
  project_title?: string;
  project_name?: string;
  code_name: string;
  classification: string;
  source: string;
  date_accessed: string;
  publish_status: "published" | "unpublished";
  locale?: string;
  project_fund?: string;
  accession_no?: string;
  similarity_percent?: string;
  description?: string;
  created_by?: string;
  updated_by?: string;
  update_notes?: string;
  image_url?: string;
  fasta_file?: string;
  fasta_sequence?: string;
  biochemical_tests?: Record<string, string>;
  morphology?: Record<string, string>;
  custom_fields?: Record<string, string>;
};

type PreviewRow = {
  index: number;
  extractedCode: string;
  values: NormalizedSpecimenRow | null;
  warnings: string[];
  errors: string[];
};

type RowFieldPatch = Partial<Pick<NormalizedSpecimenRow, "project_id" | "code_name" | "classification" | "source" | "date_accessed" | "publish_status" | "locale" | "project_fund" | "accession_no" | "similarity_percent" | "description" | "created_by" | "updated_by" | "update_notes" | "image_url" | "fasta_file" | "fasta_sequence">>;

type EditableFieldKey = keyof RowFieldPatch;

type EditableFieldConfig = {
  field: EditableFieldKey;
  label: string;
  type?: "text" | "date" | "number" | "textarea" | "select";
};

interface CollectionImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProjectOption[];
  onImport: (
    rows: NormalizedSpecimenRow[],
    options?: { overwrite?: boolean }
  ) => Promise<{ created: number; failed: number; report?: ImportReport }> | void;
  roleLabel: string;
}

type ImportReport = {
  created_projects?: Array<{ row_number?: number; project_id?: string; code?: string; title?: string }>;
  missing_fields?: string[];
  warnings?: string[];
};

const BASE_FIELDS = [
  { value: "project_id", label: "Project" },
  { value: "code_name", label: "Code Name" },
  { value: "classification", label: "Classification" },
  { value: "source", label: "Source" },
  { value: "date_accessed", label: "Date Accessed" },
  { value: "locale", label: "Locale" },
  { value: "project_fund", label: "Project Fund" },
  { value: "accession_no", label: "Accession No." },
  { value: "similarity_percent", label: "Similarity %" },
  { value: "description", label: "Description" },
  { value: "publish_status", label: "Publish Status" },
  { value: "update_notes", label: "Update Notes" },
  { value: "created_by", label: "Created By" },
  { value: "updated_by", label: "Updated By" },
  { value: "image_url", label: "Image URL" },
  { value: "fasta_file", label: "FASTA File Path" },
  { value: "fasta_sequence", label: "FASTA Sequence" },
];

const BIOCHEMICAL_FIELDS = ["onpg", "glu", "adh", "man", "ldc", "ino", "odc", "sor", "cit", "rha", "h2s", "sac", "ure", "mel", "tda", "amy", "ind", "ara", "vp", "no2", "gel"];

const MORPHOLOGY_FIELDS = ["shape", "cell_size", "colony_size", "pigmentation", "form", "elevation", "margin", "colony_surface", "opacity", "texture", "spore_formation", "mycelium_formation", "description"];

const SYNONYMS: Record<string, string[]> = {
  project_id: ["project", "project id", "project_code", "project code", "project title", "project_name", "project name"],
  code_name: ["code", "code name", "specimen code", "sample code", "sample id", "specimen id"],
  classification: ["classification", "organism", "species", "type"],
  source: ["source", "origin", "sample source"],
  date_accessed: ["date accessed", "accessed", "collection date", "date"],
  locale: ["locale", "location", "place", "site"],
  project_fund: ["project fund", "fund", "funding"],
  accession_no: ["accession no", "accession number", "accession", "accession_no"],
  similarity_percent: ["similarity percent", "similarity", "% similarity"],
  description: ["description", "notes", "remark", "remarks"],
  publish_status: ["publish status", "status", "visibility"],
  update_notes: ["update notes", "update note", "notes"],
  created_by: ["created by", "creator"],
  updated_by: ["updated by", "modifier"],
  image_url: ["image url", "image", "photo", "picture"],
  fasta_file: ["fasta file", "sequence file", "sequence path"],
  fasta_sequence: ["fasta sequence", "sequence", "dna sequence"],
};

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[_\-\/]+/g, " ")
    .replace(/\s+/g, " ");

const labelForField = (field: string) => {
  const base = BASE_FIELDS.find((item) => item.value === field);
  if (base) return base.label;
  if (field.startsWith("biochemical_tests.")) return `Biochemical: ${field.split(".")[1] || field}`;
  if (field.startsWith("morphology.")) return `Morphology: ${field.split(".")[1] || field}`;
  return field;
};

const headerMatches = (header: string, candidate: string) => {
  const normalizedHeader = normalizeText(header);
  const normalizedCandidate = normalizeText(candidate);
  return normalizedHeader === normalizedCandidate || normalizedHeader.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedHeader);
};

const guessTargetField = (header: string) => {
  const normalizedHeader = normalizeText(header);

  for (const field of BASE_FIELDS.map((item) => item.value)) {
    const synonyms = SYNONYMS[field] || [];
    if (headerMatches(header, field) || synonyms.some((entry) => headerMatches(normalizedHeader, entry))) {
      return field;
    }
  }

  for (const field of BIOCHEMICAL_FIELDS) {
    if (headerMatches(normalizedHeader, field)) return `biochemical_tests.${field}`;
  }

  for (const field of MORPHOLOGY_FIELDS) {
    if (headerMatches(normalizedHeader, field)) return `morphology.${field}`;
  }

  return "custom_fields";
};

const parseDateValue = (value: string) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  const date = new Date(trimmed);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().split("T")[0];
  }

  return trimmed;
};

const normalizeCodeValue = (value: string) => normalizeText(value).replace(/\s+/g, "");

const getRowCodeValue = (row: ImportRow) => {
  const candidateKeys = [
    "code_name",
    "code",
    "code name",
    "specimen code",
    "sample code",
    "specimen id",
    "sample id",
    "Code",
    "Code:",
    "Specimen Code",
    "Sample Code",
  ];

  for (const key of candidateKeys) {
    const value = String(row[key] ?? "").trim();
    if (value) return value;
  }

  const foundKey = Object.keys(row).find((key) => {
    const normalizedKey = normalizeText(key);
    return normalizedKey === "code" || normalizedKey === "code name" || normalizedKey === "specimen code" || normalizedKey === "sample code" || normalizedKey === "specimen id" || normalizedKey === "sample id";
  });

  if (foundKey) {
    const value = String(row[foundKey] ?? "").trim();
    if (value) return value;
  }

  return "";
};

const countMeaningfulSpecimenFields = (row: ImportRow) => {
  const ignoredKeys = new Set(["code_name", "code", "Code", "Code:", "specimen code", "sample code", "specimen id", "sample id"]);
  return Object.entries(row).reduce((count, [key, value]) => {
    if (ignoredKeys.has(key) || ignoredKeys.has(normalizeText(key))) return count;
    return String(value ?? "").trim() ? count + 1 : count;
  }, 0);
};

const isLikelySpecimenRow = (row: ImportRow) => {
  const codeValue = getRowCodeValue(row);
  if (!codeValue) return false;

  return countMeaningfulSpecimenFields(row) >= 2;
};

const resolveProjectId = (value: string, projects: ProjectOption[]) => {
  const normalized = normalizeText(value);
  if (!normalized) return "";

  const exactMatch = projects.find((project) => project._id === value || normalizeText(project.title) === normalized || normalizeText(project.code) === normalized);
  return exactMatch?._id || "";
};

const FORM_LABELS = [
  "code",
  "code name",
  "specimen code",
  "sample code",
  "project",
  "project code",
  "project title",
  "project fund",
  "classification",
  "source",
  "date accessed",
  "locale",
  "accession no",
  "similarity percent",
  "description",
  "publish status",
  "status",
  "update notes",
  "created by",
  "updated by",
  "image url",
  "fasta file",
  "fasta sequence",
];

const isLikelyFormLabel = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return false;

  const stripped = text.replace(/:\s*$/, "");
  const normalized = normalizeText(stripped);
  return text.endsWith(":") || FORM_LABELS.some((label) => headerMatches(normalized, label));
};

const isInstructionSheet = (rows: unknown[][]) => {
  const text = rows
    .flat()
    .map((cell) => normalizeText(String(cell ?? "")))
    .join(" ");

  return text.includes("information sheet") || text.includes("only input the code in the highlighted cell below") || text.includes("do not alter the formula") || text.includes("search by id/code") || text.includes("culture collection of applied microbiology laboratory");
};

const extractFormStyleRows = (sheet: XLSX.WorkSheet, sheetName: string) => {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown[][];
  if (isInstructionSheet(rawRows)) return [] as ImportRow[];

  const entry: ImportRow = {};
  let foundLabel = false;

  rawRows.forEach((row) => {
    row.forEach((cell, index) => {
      const labelCell = String(cell ?? "").trim();
      if (!isLikelyFormLabel(labelCell)) return;

      let value = "";
      for (let nextIndex = index + 1; nextIndex < row.length; nextIndex += 1) {
        const nextCell = String(row[nextIndex] ?? "").trim();
        if (nextCell) {
          value = nextCell;
          break;
        }
      }

      if (!value) return;

      const key = labelCell.replace(/:\s*$/, "").trim();
      entry[key] = value;
      foundLabel = true;
    });
  });

  if (!foundLabel) return [] as ImportRow[];

  const codeValue = getRowCodeValue(entry);
  if (!codeValue) return [] as ImportRow[];
  if (!isLikelySpecimenRow(entry)) return [] as ImportRow[];

  entry.code_name = codeValue;

  return [entry];
};

const getIssuePriority = (message: string) => {
  if (message.startsWith("Missing project match")) return 1;
  if (message.startsWith("Missing code name")) return 2;
  if (message.startsWith("Missing classification")) return 3;
  if (message.startsWith("Duplicate code_name")) return 4;
  return 5;
};

const sortIssuesByPriority = (messages: string[]) =>
  [...messages].sort((left, right) => {
    const priorityDelta = getIssuePriority(left) - getIssuePriority(right);
    if (priorityDelta !== 0) return priorityDelta;
    return left.localeCompare(right);
  });

const getRowPriority = (row: PreviewRow) => {
  if (row.errors.length === 0) return 999;
  return Math.min(...row.errors.map(getIssuePriority));
};

const EDITABLE_FIELDS: EditableFieldConfig[] = [
  { field: "source", label: "Source" },
  { field: "date_accessed", label: "Date Accessed", type: "date" },
  { field: "publish_status", label: "Publish Status", type: "select" },
  { field: "locale", label: "Locale" },
  { field: "project_fund", label: "Project Fund" },
  { field: "accession_no", label: "Accession No." },
  { field: "similarity_percent", label: "Similarity %", type: "number" },
  { field: "description", label: "Description", type: "textarea" },
  { field: "created_by", label: "Created By" },
  { field: "updated_by", label: "Updated By" },
  { field: "update_notes", label: "Update Notes", type: "textarea" },
  { field: "image_url", label: "Image URL" },
  { field: "fasta_file", label: "FASTA File Path" },
  { field: "fasta_sequence", label: "FASTA Sequence", type: "textarea" },
];

const applyRowPatch = (values: NormalizedSpecimenRow, patch?: RowFieldPatch | null) => ({
  ...values,
  ...(patch || {}),
});

const getProjectLabel = (projectId: string, projects: ProjectOption[]) => {
  const match = projects.find((project) => project._id === projectId);
  if (!match) return projectId;
  return `${match.title} (${match.code})`;
};

const normalizeCodeKey = (value: string) => normalizeCodeValue(value || "");

const mergeRowIntoBucket = (bucket: ImportRow, incoming: ImportRow) => {
  Object.entries(incoming).forEach(([field, value]) => {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) return;

    const current = String(bucket[field] ?? "").trim();
    if (!current) {
      bucket[field] = trimmed;
    }
  });
};

const validateNormalizedRow = (values: NormalizedSpecimenRow) => {
  const warnings: string[] = [];
  const errors: string[] = [];

  const projectHint = values.project || values.project_code || values.project_title || values.project_name || "";
  if (!values.project_id && !projectHint) {
    errors.push("Missing project match.");
  } else if (!values.project_id && projectHint) {
    warnings.push(`Project "${projectHint}" will be created during import if needed.`);
  }
  if (!values.code_name) errors.push("Missing code name.");
  if (!values.classification) {
    warnings.push("Missing classification. This will be included in the import report after staging.");
  }

  return { warnings, errors };
};

const isNonEmptyCell = (value: unknown) => String(value ?? "").trim().length > 0;

const hasCodeLikeFirstColumn = (row: string[]) => {
  const firstCell = String(row[0] ?? "").trim();
  return Boolean(firstCell) && /[A-Za-z]/.test(firstCell) && /\d/.test(firstCell);
};

const isDataTableSheet = (headerRowIndex: number, rows: string[][]) => {
  const bodyRows = rows.slice(headerRowIndex + 1).filter((row) => row.some(isNonEmptyCell));
  if (bodyRows.length === 0) return false;

  const sampleRows = bodyRows.slice(0, 5);
  const recordLikeRows = sampleRows.filter((row) => hasCodeLikeFirstColumn(row));

  return recordLikeRows.length >= Math.max(1, Math.ceil(sampleRows.length / 2));
};

const buildSheetRows = (sheet: XLSX.WorkSheet, sheetName: string) => {
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown[][];
  const rows = rawRows.filter((row) => Array.isArray(row) && row.some(isNonEmptyCell));

  if (rows.length === 0) {
    return [] as ImportRow[];
  }

  const compactRows = rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
  const candidateHeaderRows = compactRows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.filter(isNonEmptyCell).length >= 2)
    .filter(({ row }) => row.some((cell) => {
      const normalized = normalizeText(cell);
      return normalized.includes("code") || normalized.includes("project") || normalized.includes("classification") || normalized.includes("source") || normalized.includes("bioactivity") || normalized.includes("fund");
    }));

  const tableHeaderRowIndex = candidateHeaderRows.find(({ index }) => isDataTableSheet(index, compactRows))?.index ?? -1;
  if (tableHeaderRowIndex >= 0) {
    const headerRow = compactRows[tableHeaderRowIndex] || [];
    const headers = headerRow.map((header) => String(header || "").trim()).filter(Boolean);
    if (headers.length > 0) {
      const bodyRows = compactRows.slice(tableHeaderRowIndex + 1).filter((row) => row.some(isNonEmptyCell));
      const tableRows = bodyRows
        .map((bodyRow) => {
          const entry: ImportRow = {};
          headers.forEach((header, index) => {
            entry[header] = String(bodyRow[index] ?? "").trim();
          });
          return isLikelySpecimenRow(entry) ? entry : null;
        })
        .filter((row): row is ImportRow => Boolean(row));

      if (tableRows.length > 0) {
        return tableRows;
      }
    }
  }

  if (isInstructionSheet(rows)) {
    return [] as ImportRow[];
  }

  const labelCellCount = rows.flat().filter(isLikelyFormLabel).length;
  if (labelCellCount >= 4) {
    return extractFormStyleRows(sheet, sheetName);
  }

  const effectiveHeaderRowIndex = tableHeaderRowIndex;
  if (effectiveHeaderRowIndex < 0) {
    return [];
  }

  const headerRow = compactRows[effectiveHeaderRowIndex] || [];
  const headers = headerRow.map((header) => String(header || "").trim()).filter(Boolean);
  if (headers.length === 0) {
    return [];
  }

  const bodyRows = compactRows.slice(effectiveHeaderRowIndex + 1).filter((row) => row.some(isNonEmptyCell));
  return bodyRows.map((bodyRow) => {
    const entry: ImportRow = {};
    headers.forEach((header, index) => {
      entry[header] = String(bodyRow[index] ?? "").trim();
    });

    if (!isLikelySpecimenRow(entry)) {
      return null;
    }

    return entry;
  }).filter((row): row is ImportRow => Boolean(row));
};

const buildRowsFromWorkbook = (workbook: XLSX.WorkBook) => {
  const mergedRows = new Map<string, ImportRow>();
  let rowCounter = 0;

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;

    const sheetRows = buildSheetRows(sheet, sheetName);
    sheetRows.forEach((row) => {
      const codeValue = getRowCodeValue(row);
      if (!codeValue) return;
      const codeKey = normalizeCodeKey(codeValue);
      const bucketKey = codeKey || `__row_${rowCounter}`;
      rowCounter += 1;

      const existing = mergedRows.get(bucketKey);
      if (!existing) {
        const nextRow: ImportRow = { ...row };
        nextRow.code_name = codeValue;
        nextRow.__source_sheets = sheetName;
        mergedRows.set(bucketKey, nextRow);
        return;
      }

      mergeRowIntoBucket(existing, row);
      const priorSheets = String(existing.__source_sheets || "").trim();
      existing.__source_sheets = priorSheets ? `${priorSheets}, ${sheetName}` : sheetName;
      existing.code_name = existing.code_name || codeValue;
    });
  });

  return Array.from(mergedRows.values());
};

const buildRow = (row: ImportRow, headers: string[], mapping: Record<string, string>, projects: ProjectOption[]): PreviewRow => {
  const values: NormalizedSpecimenRow = {
    project_id: "",
    code_name: "",
    classification: "",
    source: "",
    date_accessed: "",
    publish_status: "unpublished",
    biochemical_tests: {},
    morphology: {},
    custom_fields: {},
  };

  const warnings: string[] = [];
  const errors: string[] = [];
  const extractedCode = getRowCodeValue(row);

  headers.forEach((header) => {
    const rawValue = String(row[header] ?? "").trim();
    if (!rawValue) return;

    const target = mapping[header] || "custom_fields";
    if (target === "custom_fields") {
      values.custom_fields![header] = rawValue;
      return;
    }

    if (target.startsWith("biochemical_tests.")) {
      values.biochemical_tests![target.split(".")[1]] = rawValue;
      return;
    }

    if (target.startsWith("morphology.")) {
      values.morphology![target.split(".")[1]] = rawValue;
      return;
    }

    if (target === "project_id") {
      values.project_id = resolveProjectId(rawValue, projects);
      if (!values.project_id) {
        values.project = rawValue;
        values.project_code = rawValue;
        warnings.push(`Project "${rawValue}" will be created if it does not already exist.`);
      }
      return;
    }

    if (target === "code_name") {
      values.code_name = rawValue;
      return;
    }

    if (target === "classification") {
      values.classification = rawValue;
      return;
    }

    if (target === "date_accessed") {
      values.date_accessed = parseDateValue(rawValue);
      return;
    }

    if (target === "similarity_percent") {
      const numeric = Number(String(rawValue).replace(/%/g, ""));
      values.similarity_percent = Number.isFinite(numeric) ? String(numeric) : rawValue;
      return;
    }

    if (target === "publish_status") {
      const normalized = normalizeText(rawValue);
      values.publish_status = normalized === "published" ? "published" : "unpublished";
      return;
    }

    if (target === "accession_no") {
      values.accession_no = rawValue;
      return;
    }

    if (target === "locale") {
      values.locale = rawValue;
      return;
    }

    if (target === "project_fund") {
      values.project_fund = rawValue;
      return;
    }

    if (target === "description") {
      values.description = rawValue;
      return;
    }

    if (target === "created_by") {
      values.created_by = rawValue;
      return;
    }

    if (target === "updated_by") {
      values.updated_by = rawValue;
      return;
    }

    if (target === "update_notes") {
      values.update_notes = rawValue;
      return;
    }

    if (target === "image_url") {
      values.image_url = rawValue;
      return;
    }

    if (target === "fasta_file") {
      values.fasta_file = rawValue;
      return;
    }

    if (target === "fasta_sequence") {
      values.fasta_sequence = rawValue;
      return;
    }

    values.custom_fields = {
      ...(values.custom_fields || {}),
      [target]: rawValue,
    };
  });

  if (!values.code_name && extractedCode) {
    values.code_name = extractedCode;
  }

  const validation = validateNormalizedRow(values);
  warnings.push(...validation.warnings);
  errors.push(...validation.errors);

  return { index: 0, extractedCode, values, warnings, errors };
};

export default function CollectionImportModal({ isOpen, onClose, projects, onImport, roleLabel }: CollectionImportModalProps) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [rowPatches, setRowPatches] = useState<Record<number, RowFieldPatch>>({});
  const [previewFilter, setPreviewFilter] = useState<"all" | "needs_fix" | "priority_1" | "ready">("all");
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [overwriteMode, setOverwriteMode] = useState<'skip' | 'overwrite'>('skip');
  const [parseError, setParseError] = useState("");
  const [importSummary, setImportSummary] = useState<{ created: number; failed: number } | null>(null);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setColumnMapping({});
      setRowPatches({});
      setPreviewFilter("all");
      setParseError("");
      setImportSummary(null);
      setImportReport(null);
      setIsParsing(false);
      setIsImporting(false);
    }
  }, [isOpen]);

  const previewRows = useMemo(() => {
    if (!headers.length || !rows.length) return [];
    const baseRows = rows.map((row, index) => {
      const builtRow = buildRow(row, headers, columnMapping, projects);
      const patchedValues = applyRowPatch(builtRow.values || ({} as NormalizedSpecimenRow), rowPatches[index]);
      const validation = validateNormalizedRow(patchedValues);
      const sourceSheets = String(row.__source_sheets || "").trim();
      const extractedCode = getRowCodeValue(row);

      if (sourceSheets) {
        validation.warnings.push(`Merged from worksheets: ${sourceSheets}.`);
      }

      return {
        index,
        extractedCode,
        values: patchedValues,
        warnings: builtRow.warnings,
        errors: validation.errors,
      };
    });
    const duplicateCounts = new Map<string, number>();
    baseRows.forEach((row) => {
      const codeKey = normalizeCodeValue(row.values?.code_name || "");
      if (!codeKey) return;
      duplicateCounts.set(codeKey, (duplicateCounts.get(codeKey) || 0) + 1);
    });

    return baseRows.map((row) => {
      const codeKey = normalizeCodeValue(row.values?.code_name || "");
      if (!codeKey || (duplicateCounts.get(codeKey) || 0) <= 1) {
        return {
          ...row,
          warnings: sortIssuesByPriority(row.warnings),
          errors: sortIssuesByPriority(row.errors),
        };
      }

      return {
        ...row,
        errors: sortIssuesByPriority([...row.errors, `Duplicate code_name "${row.values?.code_name || codeKey}" found in this file.`]),
        warnings: sortIssuesByPriority(row.warnings),
      };
    });
  }, [columnMapping, headers, projects, rowPatches, rows]);

  const detectedCount = previewRows.filter((row) => row.errors.length === 0).length;
  const invalidCount = previewRows.length - detectedCount;
  const visibleRows = previewRows.filter((row) => {
    if (previewFilter === "all") return true;
    if (previewFilter === "ready") return row.errors.length === 0;
    if (previewFilter === "needs_fix") return row.errors.length > 0;
    return row.errors.length > 0 && getRowPriority(row) === 1;
  });

  const handleFile = async (file: File) => {
    setIsParsing(true);
    setParseError("");
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      if (!workbook.SheetNames.length) {
        throw new Error("The selected file does not contain any sheets.");
      }

      const nextRows = buildRowsFromWorkbook(workbook);

      if (nextRows.length === 0) {
        throw new Error("No usable specimen rows were found in the workbook.");
      }

      const nextHeaders = Array.from(
        new Set(
          nextRows
            .flatMap((row) => Object.keys(row))
            .filter((header) => Boolean(header) && !header.startsWith("__"))
        )
      );

      const nextMapping = nextHeaders.reduce((acc, header) => {
        acc[header] = guessTargetField(header);
        return acc;
      }, {} as Record<string, string>);

      setFileName(workbook.SheetNames.length > 1 ? `${file.name} (${workbook.SheetNames.length} sheets)` : file.name);
      setHeaders(nextHeaders);
      setRows(nextRows);
      setColumnMapping(nextMapping);
      setImportReport(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to parse the spreadsheet.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    const validRows = previewRows
      .filter((row) => row.errors.length === 0 && row.values)
      .map((row) => row.values as NormalizedSpecimenRow);

    if (validRows.length === 0) {
      setParseError("No valid rows were found to import.");
      return;
    }

    if (overwriteMode === 'overwrite') {
      const confirmed = window.confirm(
        'Overwrite mode will update existing specimens that match the imported code names. Continue?'
      );

      if (!confirmed) {
        return;
      }
    }

    setIsImporting(true);
    try {
      const result = await onImport(validRows, { overwrite: overwriteMode === 'overwrite' });
      const summary = result || { created: validRows.length, failed: 0 };
      setImportSummary({ created: summary.created, failed: summary.failed });
      setImportReport((summary as { report?: ImportReport }).report || null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Failed to import spreadsheet rows.");
    } finally {
      setIsImporting(false);
    }
  };

  const updateRowField = (rowIndex: number, field: keyof RowFieldPatch, value: string) => {
    setRowPatches((current) => ({
      ...current,
      [rowIndex]: {
        ...(current[rowIndex] || {}),
        [field]: value,
      },
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <FileSpreadsheet className="h-5 w-5 text-[#113F67]" />
              <h2 className="text-xl font-semibold">Import specimens from spreadsheet</h2>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Upload Excel or CSV files, let the system auto-detect fields, review the mapping, then approve the staged import for {roleLabel}.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-slate-50/70">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">1. Upload file</p>
                  <p className="text-sm text-slate-600">Excel and CSV are supported. Each worksheet can become one specimen row.</p>
                </div>
                <Upload className="h-5 w-5 text-[#113F67]" />
              </div>

              <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-[#113F67] hover:bg-[#f7fbff]">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleFile(file);
                    }
                  }}
                />
                <Sparkles className="h-8 w-8 text-[#113F67]" />
                <span className="mt-3 text-sm font-medium text-slate-900">Click to choose a spreadsheet</span>
                <span className="mt-1 text-xs text-slate-500">Auto-detect headers, use sheet names as specimen codes, and stage rows before import.</span>
              </label>

              {fileName && (
                <p className="mt-3 text-sm text-slate-700">
                  Selected file: <span className="font-semibold">{fileName}</span>
                </p>
              )}

              {isParsing && (
                <div className="mt-4 flex items-center gap-2 text-sm text-[#113F67]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing spreadsheet...
                </div>
              )}

              {parseError && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {importSummary && (
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Import finished. Created {importSummary.created} row{importSummary.created === 1 ? "" : "s"} and skipped {importSummary.failed} invalid row{importSummary.failed === 1 ? "" : "s"}.
                  </span>
                </div>
              )}

              {importReport && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 space-y-3">
                  <div className="font-semibold text-slate-900">Import report</div>
                  <div>
                    <div className="font-medium text-slate-800">Created projects</div>
                    <div>{importReport.created_projects?.length ? importReport.created_projects.map((project) => `${project.code || project.title} (row ${project.row_number ?? "?"})`).join(", ") : "None"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">Missing fields</div>
                    <div>{importReport.missing_fields?.length ? importReport.missing_fields.join(", ") : "None"}</div>
                  </div>
                  {importReport.warnings?.length ? (
                    <div>
                      <div className="font-medium text-slate-800">Warnings</div>
                      <div className="space-y-1">
                        {importReport.warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">2. Smart mapping</p>
              <p className="mt-1 text-sm text-slate-600">
                Headers are matched locally using fuzzy rules. Unmatched values go into custom fields automatically.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Columns</div>
                  <div className="mt-1 text-xl font-semibold text-slate-900">{headers.length}</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-emerald-700">Valid rows</div>
                  <div className="mt-1 text-xl font-semibold text-emerald-800">{detectedCount}</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <div className="text-xs uppercase tracking-wide text-amber-700">Needs review</div>
                  <div className="mt-1 text-xl font-semibold text-amber-800">{invalidCount}</div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This first pass keeps the workflow free and fast without a paid AI service. If you want, we can wire an optional AI mapping helper later.
                </span>
              </div>
            </div>
          </div>

          {headers.length > 0 && rows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">3. Review mapping</p>
                  <p className="text-sm text-slate-600">Adjust any column before staging the rows.</p>
                </div>
                <div className="text-sm text-slate-500">{previewRows.length} parsed row{previewRows.length === 1 ? "" : "s"}</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Spreadsheet column</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Maps to</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Sample value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {headers.map((header) => (
                      <tr key={header}>
                        <td className="px-4 py-3 font-medium text-slate-900">{header}</td>
                        <td className="px-4 py-3">
                          <select
                            value={columnMapping[header] || "custom_fields"}
                            onChange={(event) => setColumnMapping((current) => ({ ...current, [header]: event.target.value }))}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                          >
                            <option value="custom_fields">Custom field</option>
                            <optgroup label="Core fields">
                              {BASE_FIELDS.map((field) => (
                                <option key={field.value} value={field.value}>
                                  {field.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Biochemical tests">
                              {BIOCHEMICAL_FIELDS.map((field) => (
                                <option key={field} value={`biochemical_tests.${field}`}>
                                  {field.toUpperCase()}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Morphology">
                              {MORPHOLOGY_FIELDS.map((field) => (
                                <option key={field} value={`morphology.${field}`}>
                                  {labelForField(`morphology.${field}`)}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{rows[0]?.[header] || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">4. Validation preview</p>
                  <p className="text-sm text-slate-600">Fix rows inline in priority order. Invalid rows stay excluded until every required issue is resolved.</p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={previewFilter}
                    onChange={(event) => setPreviewFilter(event.target.value as typeof previewFilter)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                  >
                    <option value="all">All rows</option>
                    <option value="priority_1">Highest-priority issues</option>
                    <option value="needs_fix">Needs fix</option>
                    <option value="ready">Ready only</option>
                  </select>
                  <select
                    value={overwriteMode}
                    onChange={(e) => setOverwriteMode(e.target.value as 'skip' | 'overwrite')}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                    title="Choose how to handle existing specimen codes"
                  >
                    <option value="skip">Skip existing</option>
                    <option value="overwrite">Overwrite existing</option>
                  </select>
                  <button
                    onClick={() => void handleImport()}
                    disabled={isImporting || detectedCount === 0}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#113F67] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d2f4d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve Import
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Row</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Code Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Extracted Code</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Project</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Classification</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Priority</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleRows.map((row) => (
                      <tr key={row.index}>
                        <td className="px-4 py-3 text-slate-600">{row.index + 2}</td>
                        <td className="px-4 py-3 align-top">
                          <input
                            value={row.values?.code_name || ""}
                            onChange={(event) => updateRowField(row.index, "code_name", event.target.value)}
                            className="w-full min-w-[10rem] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                            placeholder="Code name"
                          />
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          <div className="space-y-1">
                            <div className="font-medium text-slate-900">{row.extractedCode || "N/A"}</div>
                            {row.extractedCode && row.values?.code_name && normalizeCodeValue(row.extractedCode) !== normalizeCodeValue(row.values.code_name) && (
                              <div className="text-xs text-amber-700">Differs from current code name</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <select
                            value={row.values?.project_id || ""}
                            onChange={(event) => updateRowField(row.index, "project_id", event.target.value)}
                            className="w-full min-w-[16rem] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                          >
                            <option value="">Select project</option>
                            {projects.map((project) => (
                              <option key={project._id} value={project._id}>
                                {project.title} ({project.code})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <input
                            value={row.values?.classification || ""}
                            onChange={(event) => updateRowField(row.index, "classification", event.target.value)}
                            className="w-full min-w-[11rem] rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                            placeholder="Classification"
                          />
                        </td>
                        <td className="px-4 py-3 align-top text-slate-700">
                          {row.errors.length > 0 ? (
                            <div className="space-y-1">
                              <div className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Priority {getIssuePriority(row.errors[0])}</div>
                              <div className="text-xs text-slate-600">{row.errors[0]}</div>
                            </div>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Ready</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.errors.length > 0 ? (
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Needs fix</span>
                          ) : (
                            <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Ready</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <div className="space-y-1">
                            {sortIssuesByPriority([...row.errors, ...row.warnings]).map((message, messageIndex) => (
                              <div key={`${row.index}-${message}`} className={messageIndex === 0 ? "font-medium text-slate-700" : "text-slate-600"}>
                                {messageIndex + 1}. {message}
                              </div>
                            ))}
                            {row.errors.length === 0 && row.warnings.length === 0 && <div>OK</div>}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {visibleRows.map((row) => (
                      <tr key={`edit-${row.index}`} className="bg-slate-50/40">
                        <td className="px-4 py-4 text-xs text-slate-500" colSpan={8}>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {EDITABLE_FIELDS.map((fieldConfig) => {
                              const value = row.values?.[fieldConfig.field] || "";

                              if (fieldConfig.type === "select") {
                                return (
                                  <label key={fieldConfig.field} className="space-y-1">
                                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{fieldConfig.label}</span>
                                    <select
                                      value={value}
                                      onChange={(event) => updateRowField(row.index, fieldConfig.field, event.target.value)}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                                    >
                                      <option value="">Select status</option>
                                      <option value="published">Published</option>
                                      <option value="unpublished">Unpublished</option>
                                    </select>
                                  </label>
                                );
                              }

                              if (fieldConfig.type === "textarea") {
                                return (
                                  <label key={fieldConfig.field} className="space-y-1 md:col-span-2 xl:col-span-3">
                                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{fieldConfig.label}</span>
                                    <textarea
                                      value={value}
                                      onChange={(event) => updateRowField(row.index, fieldConfig.field, event.target.value)}
                                      rows={3}
                                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                                    />
                                  </label>
                                );
                              }

                              return (
                                <label key={fieldConfig.field} className="space-y-1">
                                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">{fieldConfig.label}</span>
                                  <input
                                    type={fieldConfig.type || "text"}
                                    value={value}
                                    onChange={(event) => updateRowField(row.index, fieldConfig.field, event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#113F67] focus:outline-none focus:ring-2 focus:ring-[#113F67]/20"
                                  />
                                </label>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { NormalizedSpecimenRow, ProjectOption };