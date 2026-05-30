"use client";

import { useState, useEffect } from "react";
import { API_URL } from "@/config/api";
import { useRouter } from "next/navigation";
import { ArrowLeft, QrCode, Lock, Download } from "lucide-react";
import Image from "next/image";
import jsPDF from "jspdf";
import { isAuthenticated, getUserData } from "@/app/utils/authUtil";

interface SpecimenPublicViewProps {
  params: {
    id: string;
  };
  searchParams: {
    token?: string;
  };
}

export default function SpecimenPublicView({ params, searchParams }: SpecimenPublicViewProps) {
  const [specimen, setSpecimen] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = isAuthenticated();
      
      if (!isAuth) {
        setRedirecting(true);
        router.push('/Login');
        return;
      }
      
      const userData = getUserData();
      const role = userData?.role || localStorage.getItem('userRole');
      
      if (role === 'admin') {
        setRedirecting(true);
        router.push(`/AdminUI/AdminDashBoard/Features/AdminCollection/specimen/${params.id}`);
        return;
      }

      if (role === 'RA' || role === 'ra' || role === 'staff') {
        setRedirecting(true);
        router.push(`/RAStaffUI/RAStaffDashBoard/Features/RAStaffCollection/specimen/${params.id}`);
        return;
      }
      
      fetchSpecimenDetails();
    };
    
    checkAuth();
  }, [params.id, router]);

  const fetchSpecimenDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/microbials/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setSpecimen(data);
      }
    } catch (error) {
      console.error("Error fetching specimen details:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!specimen) return;
    
    setGeneratingPDF(true);
    try {
      const doc = new jsPDF();
      let yPos = 20;
      const lineHeight = 7;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;

      const checkPageBreak = (additionalSpace = 10) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      };

      const getImageBase64 = async (url: string, timeoutMs: number = 8000): Promise<string | null> => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          
          const response = await fetch(url, { 
            signal: controller.signal,
            mode: 'cors'
          });
          clearTimeout(timeoutId);
          
          if (!response.ok) return null;
          
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          return null;
        }
      };

      const headerLogoData = await getImageBase64('/UI/img/logo-biocella.png');

      // Header
      if (headerLogoData) {
        doc.addImage(headerLogoData, 'PNG', margin, yPos - 4, 12, 12);
      }

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("BIOCELLA Specimen Overview", headerLogoData ? margin + 16 : margin, yPos + 4);
      yPos += 12;

      doc.setDrawColor(17, 63, 103);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;

      // Add specimen image if available
      let imageHeight = 0;
      if (specimen.image_url) {
        const imageUrl = `${API_URL}${specimen.image_url}`;
        const imageData = await getImageBase64(imageUrl);
        
        if (imageData) {
          try {
            const imgWidth = 50;
            const imgHeight = 50;
            
            doc.addImage(imageData, 'JPEG', margin, yPos, imgWidth, imgHeight);
            imageHeight = imgHeight + 5;
          } catch (error) {
            console.error("Error adding image to PDF:", error);
          }
        }
      }

      // Basic Information
      const infoStartX = specimen.image_url ? margin + 55 : margin;
      const infoStartY = yPos;
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Basic Information", infoStartX, yPos);
      yPos += lineHeight;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      const basicInfo = [
        ["Code Name:", specimen.code_name],
        ["Accession Number:", specimen.accession_no || specimen.accession_number || "N/A"],
        ["Classification:", specimen.classification || "N/A"],
        ["Source:", specimen.source || "N/A"],
        ["Locale:", specimen.locale || "N/A"],
        ["Project:", specimen.project_id?.title || "N/A"],
        ["Date Accessed:", specimen.date_accessed ? new Date(specimen.date_accessed).toLocaleDateString() : "N/A"],
      ];

      basicInfo.forEach(([label, value]) => {
        checkPageBreak();
        doc.setFont("helvetica", "bold");
        doc.text(label, infoStartX, yPos);
        doc.setFont("helvetica", "normal");
        const valueText = doc.splitTextToSize(String(value), contentWidth - 50);
        doc.text(valueText, infoStartX + 45, yPos);
        yPos += lineHeight;
      });

      if (imageHeight > 0) {
        const textHeight = (basicInfo.length + 1) * lineHeight;
        if (imageHeight > textHeight) {
          yPos = infoStartY + imageHeight;
        }
      }

      // Description
      if (specimen.description) {
        yPos += 5;
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Description", margin, yPos);
        yPos += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const descLines = doc.splitTextToSize(specimen.description, contentWidth);
        descLines.forEach((line: string) => {
          checkPageBreak();
          doc.text(line, margin, yPos);
          yPos += lineHeight;
        });
      }

      // Biochemical Tests
      if (specimen.biochemical_tests || specimen.catalase || specimen.oxidase) {
        yPos += 5;
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Biochemical Characteristics", margin, yPos);
        yPos += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        if (specimen.catalase) {
          doc.text(`Catalase: ${specimen.catalase}`, margin, yPos);
          yPos += lineHeight;
        }
        if (specimen.oxidase) {
          doc.text(`Oxidase: ${specimen.oxidase}`, margin, yPos);
          yPos += lineHeight;
        }
        if (specimen.hemolysis) {
          doc.text(`Hemolysis: ${specimen.hemolysis}`, margin, yPos);
          yPos += lineHeight;
        }
        if (specimen.growth_media) {
          doc.text(`Growth Media: ${specimen.growth_media}`, margin, yPos);
          yPos += lineHeight;
        }

        if (specimen.biochemical_tests) {
          yPos += 3;
          doc.setFont("helvetica", "bold");
          doc.text("Test Results:", margin, yPos);
          yPos += lineHeight;
          doc.setFont("helvetica", "normal");

          const tests = Object.entries(specimen.biochemical_tests).filter(([_, value]) => value && value !== '');
          let xPos = margin;
          
          tests.forEach(([key, value]: [string, any], index) => {
            if (index > 0 && index % 3 === 0) {
              yPos += lineHeight;
              xPos = margin;
              checkPageBreak();
            }
            doc.text(`${key.toUpperCase()}: ${value}`, xPos, yPos);
            xPos += 60;
          });
          yPos += lineHeight;
        }
      }

      // Cell and Colony Morphology
      const morphologyEntries: Array<[string, any]> = [];
      if (specimen.morphology) {
        morphologyEntries.push(
          ["Shape", specimen.morphology.shape],
          ["Cell Size", specimen.morphology.cell_size],
          ["Colony Size", specimen.morphology.colony_size],
          ["Pigmentation", specimen.morphology.pigmentation],
          ["Form", specimen.morphology.form],
          ["Elevation", specimen.morphology.elevation],
          ["Margin", specimen.morphology.margin],
          ["Colony Surface", specimen.morphology.colony_surface],
          ["Opacity", specimen.morphology.opacity],
          ["Texture", specimen.morphology.texture],
          ["Spore Formation", specimen.morphology.spore_formation],
          ["Mycelium Formation", specimen.morphology.mycelium_formation],
          ["Description", specimen.morphology.description],
        );
      }
      const filledMorphologyEntries = morphologyEntries.filter(
        ([_, value]) => value && String(value).trim() !== ""
      );

      if (filledMorphologyEntries.length > 0) {
        yPos += 5;
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Cell and Colony Morphology", margin, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        filledMorphologyEntries.forEach(([label, value]) => {
          checkPageBreak();
          doc.setFont("helvetica", "bold");
          doc.text(`${label}:`, margin, yPos);
          doc.setFont("helvetica", "normal");
          const wrappedValue = doc.splitTextToSize(String(value), contentWidth - 52);
          doc.text(wrappedValue, margin + 52, yPos);
          yPos += lineHeight * Math.max(1, wrappedValue.length);
        });
      }

      // Genome Data
      if (specimen.fasta_file || specimen.fasta_sequence) {
        yPos += 5;
        checkPageBreak(15);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Genome Sequence Data", margin, yPos);
        yPos += lineHeight;
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        if (specimen.fasta_file) {
          doc.text(`FASTA File: ${specimen.fasta_file}`, margin, yPos);
          yPos += lineHeight;
        }
        if (specimen.fasta_sequence) {
          yPos += 3;
          doc.setFont("helvetica", "bold");
          doc.text("FASTA Sequence:", margin, yPos);
          yPos += lineHeight;
          doc.setFont("courier", "normal");
          doc.setFontSize(8);
          const seqLines = specimen.fasta_sequence.match(/.{1,80}/g) || [];
          seqLines.forEach((line: string) => {
            checkPageBreak();
            doc.text(line, margin, yPos);
            yPos += 5;
          });
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
        }
      }

      // Custom Fields
      if (specimen.custom_fields && Object.keys(specimen.custom_fields).length > 0) {
        yPos += 5;
        checkPageBreak(20);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("Additional Information", margin, yPos);
        yPos += lineHeight;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        Object.entries(specimen.custom_fields).forEach(([key, value]: [string, any]) => {
          if (value) {
            checkPageBreak();
            doc.setFont("helvetica", "bold");
            doc.text(`${key.replace(/_/g, " ")}:`, margin, yPos);
            doc.setFont("helvetica", "normal");
            const valueText = doc.splitTextToSize(String(value), contentWidth - 50);
            doc.text(valueText, margin + 45, yPos);
            yPos += lineHeight;
          }
        });
      }

      // Footer branding
      const pageCount = doc.getNumberOfPages();
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Add footer text
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(128);
        doc.text(`Printed by Biocella`, margin, doc.internal.pageSize.getHeight() - 10);
        doc.text(
          `Generated: ${new Date().toLocaleString()}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save PDF
      doc.save(`Specimen_${specimen.code_name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const downloadQRCode = () => {
    if (!specimen.qr_code) return;
    
    const link = document.createElement('a');
    link.href = specimen.qr_code;
    link.download = `QR_${specimen.code_name}_${new Date().toISOString().split('T')[0]}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (redirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#113F67] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading specimen details...</p>
        </div>
      </div>
    );
  }

  if (!specimen) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Specimen not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-[#113F67] text-white rounded-lg hover:bg-[#0d2f4d]"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#113F67]">BIOCELLA</h1>
              <p className="text-sm text-gray-600">Specimen Information - Read-Only View</p>
            </div>
          </div>
          
          <div className="flex gap-2 items-center">
            <div className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Read-Only Access
            </div>
            <button
              onClick={downloadPDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {generatingPDF ? "Generating..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Images & QR */}
          <div className="lg:col-span-1 space-y-6">
            {/* Image */}
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold mb-3">Specimen Image</h2>
              <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                {specimen.image_url ? (
                  <Image
                    src={`${API_URL}${specimen.image_url}`}
                    alt={specimen.code_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No image available
                  </div>
                )}
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-white shadow rounded-xl p-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <QrCode className="h-5 w-5" />
                QR Code
              </h2>
              <div className="relative w-full h-48 bg-white border rounded-lg overflow-hidden flex items-center justify-center">
                {specimen.qr_code ? (
                  <Image
                    src={specimen.qr_code}
                    alt="QR Code"
                    width={180}
                    height={180}
                    className="object-contain"
                  />
                ) : (
                  <div className="text-gray-400">QR code not generated</div>
                )}
              </div>
              <button
                onClick={downloadQRCode}
                className="w-full mt-3 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600"
              >
                Download QR Code
              </button>
            </div>
          </div>

          {/* Right Column - Details with Tabs */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="bg-white shadow rounded-xl overflow-hidden">
              <div className="flex flex-wrap border-b border-gray-200">
                {[
                  { key: "info", label: "Basic Info" },
                  { key: "biochemical", label: "Biochemical" },
                  { key: "morphology", label: "Morphology" },
                  { key: "genome", label: "Genome Data" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-6 py-3 font-medium transition-colors ${
                      activeTab === tab.key
                        ? 'border-b-2 border-[#113F67] text-[#113F67]'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === "info" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-md font-semibold mb-4">Basic Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem label="Code Name" value={specimen.code_name} />
                        <InfoItem label="Accession Number" value={specimen.accession_number || specimen.accession_no || "N/A"} />
                        <InfoItem label="Classification" value={specimen.classification || "N/A"} badge />
                        <InfoItem label="Source" value={specimen.source || "N/A"} />
                        <InfoItem label="Locale" value={specimen.locale || "N/A"} />
                        <InfoItem label="Project" value={specimen.project_id?.title || "N/A"} />
                        <InfoItem label="Date Accessed" value={specimen.date_accessed ? new Date(specimen.date_accessed).toLocaleDateString() : "N/A"} />
                        <InfoItem label="Similarity" value={specimen.similarity_percent ? `${specimen.similarity_percent}%` : "N/A"} />
                      </div>
                    </div>

                    {specimen.description && (
                      <div className="border-t pt-6">
                        <h3 className="text-md font-semibold mb-3">Description</h3>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {specimen.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "biochemical" && (
                  <div className="space-y-4">
                    {specimen.biochemical_tests || specimen.catalase || specimen.oxidase ? (
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {specimen.catalase && <InfoItem label="Catalase" value={specimen.catalase} badge />}
                          {specimen.oxidase && <InfoItem label="Oxidase" value={specimen.oxidase} badge />}
                          {specimen.hemolysis && <InfoItem label="Hemolysis" value={specimen.hemolysis} badge />}
                        </div>
                        
                        {specimen.biochemical_tests && (
                          <>
                            <h3 className="text-md font-medium mt-6 pt-4 border-t">Test Results</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                              {Object.entries(specimen.biochemical_tests)
                                .filter(([_, value]) => value && value !== '')
                                .map(([key, value]: [string, any]) => (
                                  <div key={key} className="text-center p-2 border rounded">
                                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">{key}</div>
                                    <div className={`text-lg font-bold ${
                                      value === '+' ? 'text-green-600' : value === '-' ? 'text-red-600' : 'text-gray-800'
                                    }`}>
                                      {value}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </>
                        )}

                        {specimen.growth_media && (
                          <div className="mt-6 pt-4 border-t">
                            <InfoItem label="Growth Media" value={specimen.growth_media} />
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">No biochemical data available</p>
                    )}
                  </div>
                )}

                {activeTab === "morphology" && (
                  <div className="space-y-4">
                    {specimen.morphology ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoItem label="Shape" value={specimen.morphology.shape || "N/A"} />
                        <InfoItem label="Cell Size" value={specimen.morphology.cell_size || "N/A"} />
                        <InfoItem label="Colony Size" value={specimen.morphology.colony_size || "N/A"} />
                        <InfoItem label="Pigmentation" value={specimen.morphology.pigmentation || "N/A"} />
                        <InfoItem label="Form" value={specimen.morphology.form || "N/A"} />
                        <InfoItem label="Elevation" value={specimen.morphology.elevation || "N/A"} />
                        <InfoItem label="Margin" value={specimen.morphology.margin || "N/A"} />
                        <InfoItem label="Colony Surface" value={specimen.morphology.colony_surface || "N/A"} />
                        <InfoItem label="Opacity" value={specimen.morphology.opacity || "N/A"} />
                        <InfoItem label="Texture" value={specimen.morphology.texture || "N/A"} />
                        <InfoItem label="Spore Formation" value={specimen.morphology.spore_formation || "N/A"} />
                        <InfoItem label="Mycelium Formation" value={specimen.morphology.mycelium_formation || "N/A"} />
                        <div className="md:col-span-2">
                          <InfoItem label="Description" value={specimen.morphology.description || "N/A"} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No morphology data available</p>
                    )}
                  </div>
                )}

                {activeTab === "genome" && (
                  <div className="space-y-4">
                    {specimen.fasta_file || specimen.fasta_sequence ? (
                      <>
                        {specimen.fasta_file && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase">FASTA File</span>
                            <p className="mt-1 text-sm text-gray-800 font-mono">{specimen.fasta_file}</p>
                          </div>
                        )}

                        {specimen.fasta_sequence && (
                          <div>
                            <span className="text-xs font-medium text-gray-500 uppercase">FASTA Sequence</span>
                            <pre className="mt-2 p-4 bg-gray-50 rounded text-xs font-mono overflow-x-auto max-h-64 overflow-y-auto border border-gray-200">
                              {specimen.fasta_sequence}
                            </pre>
                          </div>
                        )}
                        
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                          <p className="font-medium">📖 Read-Only Access</p>
                          <p className="text-xs mt-1">BLAST sequence lookup is not available for students. Contact an admin or RA for advanced analysis.</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">No genome data available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, badge = false }: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div>
      <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
      <div className="mt-1">
        {badge ? (
          <span className="inline-block px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full capitalize">
            {value}
          </span>
        ) : (
          <p className="text-sm text-gray-800">{value}</p>
        )}
      </div>
    </div>
  );
}
