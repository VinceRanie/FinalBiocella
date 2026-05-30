"use client";

import { QrCode, Edit, Printer, Trash2, Download } from "lucide-react";
import Image from "next/image";


interface SpecimenData {
  code: string;
  locale: string;
  source: string;
  classification: string;
  bacteria: string;
  projectFundedBy: string;
  storageType: string;
  shelf: string;
  summary: string;
  category: string;
  description: string;
  maintenanceAndUse: string;
  proteins: {
    retentionTime: string;
    compound: string;
    mobilePhaseA: string;
    mobilePhaseB: string;
  }[];
  tests: {
    testType: string;
    result: string;
    notes: string;
    testedBy: string;
    dateCultured: string;
  }[];
}

const sampleData: SpecimenData = {
  code: "SP-2024-001",
  locale: "Laboratory A - Section B",
  source: "Marine Environment",
  classification: "Bacteria Sample",
  bacteria: "Escherichia coli",
  projectFundedBy: "National Science Foundation",
  storageType: "Cryogenic Storage",
  shelf: "C-12-A4",
  summary:
    "Marine bacterial specimen collected from coastal waters for antibiotic resistance research. Sample exhibits unique properties under microscopic analysis.",
  category: "Pathogenic Bacteria",
  description:
    "Gram-negative, rod-shaped bacterium commonly found in marine environments. This particular strain shows resistance to multiple antibiotics.",
  maintenanceAndUse:
    "Store at -80°C. Handle with biosafety level 2 protocols. Use within 6 months of collection date.",
  proteins: [
    {
      retentionTime: "12.45 min",
      compound: "Beta-lactamase",
      mobilePhaseA: "Water + 0.1% TFA",
      mobilePhaseB: "Acetonitrile + 0.1% TFA",
    },
    {
      retentionTime: "18.32 min",
      compound: "Outer membrane protein",
      mobilePhaseA: "Water + 0.1% TFA",
      mobilePhaseB: "Acetonitrile + 0.1% TFA",
    },
  ],
  tests: [
    {
      testType: "Swab Test",
      result: "Positive",
      notes: "High bacterial load detected",
      testedBy: "Dr. Sarah Johnson",
      dateCultured: "2024-03-15",
    },
    {
      testType: "Antibiotic Sensitivity",
      result: "Resistant to Ampicillin",
      notes: "Shows resistance pattern consistent with ESBL production",
      testedBy: "Dr. Mike Chen",
      dateCultured: "2024-03-16",
    },
  ],
};

export default function SpecimenDetails() {
  const data = sampleData;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Specimen Details</h1>
          <p className="text-gray-600">
            Comprehensive specimen analysis and management
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-2">Specimen Image</h2>
              <Image
      src="/UI/img/BacteriaSample.jpg"
      alt="asd"
      fill
      className="rounded-full object-cover"
      sizes="120px"
    />
            </div>

            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
                <QrCode className="h-5 w-5" />
                QR Code
              </h2>
              <Image
      src="/UI/img/QRcode.jpg"
      alt="asd"
      fill
      className="rounded-full object-cover"
      sizes="120px"
    />
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem label="Code" value={data.code} mono />
                <InfoItem label="Locale" value={data.locale} />
                <InfoItem label="Source" value={data.source} />
                <InfoItem label="Classification" value={data.classification} />
                <InfoItem label="Bacteria" value={data.bacteria} italic />
                <InfoItem label="Project Funded By" value={data.projectFundedBy} />
                <InfoItem
                  label="Storage Type"
                  value={data.storageType}
                  badge
                />
                <InfoItem label="Shelf" value={data.shelf} mono />
              </div>
            </div>

            {/* Summary */}
            <CardBox title="Summary">{data.summary}</CardBox>

            {/* Category & Description */}
            <div className="bg-white shadow rounded-xl p-4 space-y-4">
              <h2 className="text-lg font-semibold">Category & Description</h2>
              <div>
                <span className="text-sm font-medium text-gray-500">
                  Category:
                </span>
                <span className="ml-2 px-2 py-1 border rounded text-sm">
                  {data.category}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{data.description}</p>
            </div>

            {/* Maintenance */}
            <CardBox title="Maintenance and Use">
              {data.maintenanceAndUse}
            </CardBox>

            {/* Proteins Table */}
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">
                Proteins & Peptides Detected
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">Retention Time</th>
                      <th className="text-left py-2 px-3">Compound</th>
                      <th className="text-left py-2 px-3">Mobile Phase A</th>
                      <th className="text-left py-2 px-3">Mobile Phase B</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.proteins.map((protein, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 px-3 font-mono">
                          {protein.retentionTime}
                        </td>
                        <td className="py-2 px-3">{protein.compound}</td>
                        <td className="py-2 px-3 text-xs">
                          {protein.mobilePhaseA}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {protein.mobilePhaseB}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tests */}
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-4">
                Other Tests Performed
              </h2>
              <div className="space-y-4">
                {data.tests.map((test, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      <InfoItem label="Test Type" value={test.testType} />
                      <InfoItem
                        label="Result"
                        value={test.result}
                        badge={
                          test.result.includes("Positive") ||
                          test.result.includes("Resistant")
                            ? "red"
                            : true
                        }
                      />
                      <InfoItem label="Done By" value={test.testedBy} />
                      <InfoItem
                        label="Date Cultured"
                        value={test.dateCultured}
                        mono
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{test.notes}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white shadow rounded-xl p-4">
              <div className="flex flex-wrap gap-3">
                <ActionButton icon={<Download />} text="Export QR Code" />
                <ActionButton
                  icon={<Edit />}
                  text="Edit"
                  className="bg-blue-600 text-white hover:bg-blue-700"
                />
                <ActionButton icon={<Printer />} text="Print" />
                <ActionButton
                  icon={<Trash2 />}
                  text="Remove"
                  className="bg-red-600 text-white hover:bg-red-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable components */
function InfoItem({
  label,
  value,
  mono,
  italic,
  badge,
}: {
  label: string;
  value: string;
  mono?: boolean;
  italic?: boolean;
  badge?: boolean | "red";
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-500">{label}</label>
      {badge ? (
        <span
          className={`ml-2 px-2 py-1 rounded text-xs ${
            badge === "red"
              ? "bg-red-100 text-red-700"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {value}
        </span>
      ) : (
        <p
          className={`text-sm mt-1 ${
            mono ? "font-mono bg-gray-100 p-1 rounded" : ""
          } ${italic ? "italic" : ""}`}
        >
          {value}
        </p>
      )}
    </div>
  );
}

function CardBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white shadow rounded-xl p-4">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

function ActionButton({
  icon,
  text,
  className = "border border-gray-300 hover:bg-gray-100",
}: {
  icon: React.ReactNode;
  text: string;
  className?: string;
}) {
  return (
    <button
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${className}`}
    >
      {icon}
      {text}
    </button>
  );
}
