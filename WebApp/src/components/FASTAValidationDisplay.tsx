/**
 * FASTA Validation Status Display Component
 * Shows validation errors, warnings, and success messages
 */

import React from 'react';

export interface FASTAValidationDisplayProps {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sequenceType: 'protein' | 'nucleotide' | null;
  sequenceLength: number;
  message: string;
  showDetails?: boolean;
}

export const FASTAValidationDisplay: React.FC<FASTAValidationDisplayProps> = ({
  isValid,
  errors,
  warnings,
  sequenceType,
  sequenceLength,
  message,
  showDetails = true
}) => {
  if (!message) return null;

  return (
    <div className={`mt-3 p-3 rounded-lg border-l-4 ${
      isValid
        ? 'bg-green-50 border-green-500'
        : errors.length > 0
        ? 'bg-red-50 border-red-500'
        : 'bg-yellow-50 border-yellow-500'
    }`}>
      {/* Main message */}
      <div className={`text-sm font-medium ${
        isValid ? 'text-green-800' : errors.length > 0 ? 'text-red-800' : 'text-yellow-800'
      }`}>
        {isValid ? '✓ ' : errors.length > 0 ? '✗ ' : '⚠ '}{message}
      </div>

      {/* Sequence type and length info */}
      {isValid && sequenceType && sequenceLength > 0 && (
        <div className="text-xs text-gray-700 mt-2">
          <span className="inline-block mr-3">
            <strong>Type:</strong> {sequenceType.charAt(0).toUpperCase() + sequenceType.slice(1)}
          </span>
          <span className="inline-block">
            <strong>Length:</strong> {sequenceLength.toLocaleString()} bases/amino acids
          </span>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && showDetails && (
        <div className="mt-2 text-xs text-red-700">
          <strong>Issues found:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && showDetails && (
        <div className="mt-2 text-xs text-yellow-700">
          <strong>Warnings:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            {warnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FASTAValidationDisplay;
