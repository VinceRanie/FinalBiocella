import { Suspense } from "react";
import ScanSpecimenRedirectClient from "./ScanSpecimenRedirectClient";

export default function ScanSpecimenRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-700">Redirecting to specimen details...</p>
        </div>
      }
    >
      <ScanSpecimenRedirectClient />
    </Suspense>
  );
}
