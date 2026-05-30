/**
 * FASTA File Validation Utility
 * Validates FASTA sequences before submission to NCBI BLAST
 * Prevents invalid submissions that would waste API quota and confuse users
 */

export interface FASTAValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sequenceType: 'protein' | 'nucleotide' | null;
  sequenceLength: number;
  message: string;
}

/**
 * Detects if a sequence is protein or nucleotide based on character composition
 */
function detectSequenceType(sequence: string): 'protein' | 'nucleotide' | null {
  // Extract sequence (remove headers and whitespace)
  const seqLines = sequence
    .split('\n')
    .filter((line) => !line.startsWith('>') && line.trim().length > 0);
  const seqContent = seqLines.join('').toUpperCase().replace(/\s+/g, '');

  if (seqContent.length === 0) return null;

  const nucleotideSet = new Set([
    'A', 'T', 'G', 'C', 'U', 'R', 'Y', 'S', 'W', 'K', 'M', 'B', 'D', 'H', 'V', 'N', '-', '.'
  ]);
  const proteinSet = new Set([
    'A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'V', 'W', 'Y',
    'B', 'Z', 'X', 'J', 'O', 'U', '*', '-'
  ]);

  let proteinOnlyCount = 0;
  let nucleotideLikeCount = 0;
  let proteinLikeCount = 0;

  for (const ch of seqContent) {
    const isNucleotide = nucleotideSet.has(ch);
    const isProtein = proteinSet.has(ch);

    if (isNucleotide) nucleotideLikeCount++;
    if (isProtein) proteinLikeCount++;
    if (isProtein && !isNucleotide) proteinOnlyCount++;
  }

  // Any protein-only symbols indicate protein
  if (proteinOnlyCount > 0) {
    return 'protein';
  }

  // Strong nucleotide signal
  if (nucleotideLikeCount >= seqContent.length * 0.9) {
    return 'nucleotide';
  }

  // More protein-like than nucleotide-like
  if (proteinLikeCount > nucleotideLikeCount) {
    return 'protein';
  }

  return 'nucleotide';
}

/**
 * Counts valid characters in a sequence
 */
function countValidCharacters(sequence: string, seqType: 'protein' | 'nucleotide'): number {
  const nucleotidePattern = /[ATGCNRYSWKMBDHVU\-]/gi;
  const proteinPattern = /[ACDEFGHIKLMNPQRSTVWYBXZJOU\*\-]/gi;
  
  const pattern = seqType === 'protein' ? proteinPattern : nucleotidePattern;
  const matches = sequence.match(pattern) || [];
  return matches.length;
}

/**
 * Validates a FASTA sequence for NCBI BLAST submission
 * @param fastaContent - Raw FASTA file content
 * @returns Validation result with details
 */
export function validateFASTA(fastaContent: string): FASTAValidationResult {
  const result: FASTAValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
    sequenceType: null,
    sequenceLength: 0,
    message: ''
  };

  // Check if content is a string
  if (!fastaContent || typeof fastaContent !== 'string') {
    result.errors.push('FASTA content is empty or not text');
    result.message = 'Please upload a valid FASTA file';
    return result;
  }

  let cleaned = fastaContent.trim();

  // Check for FASTA header
  if (!cleaned.includes('>')) {
    result.errors.push('No FASTA header found (must start with >)');
    result.message = 'Invalid FASTA format: Missing header line starting with ">"';
    return result;
  }

  // Detect sequence type
  const seqType = detectSequenceType(cleaned);
  if (!seqType) {
    result.errors.push('Cannot determine if sequence is protein or nucleotide');
    result.message = 'Unable to detect sequence type - file may contain invalid characters';
    return result;
  }

  result.sequenceType = seqType;

  // Extract sequence lines (non-header lines)
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  let sequenceData = '';
  let headerCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('>')) {
      headerCount++;
      if (line.length === 1) {
        result.warnings.push(`Header at line ${i + 1} is empty (just ">"`);
      }
    } else {
      sequenceData += line.toUpperCase();
    }
  }

  if (headerCount === 0) {
    result.errors.push('No FASTA header (>) found');
    result.message = 'Invalid FASTA format: Missing header line';
    return result;
  }

  // Check sequence length
  const validCharCount = countValidCharacters(sequenceData, seqType);
  const minLength = seqType === 'protein' ? 20 : 30;

  if (validCharCount === 0) {
    result.errors.push('No valid sequence characters found');
    result.message = 'The file contains only invalid characters. Please check your FASTA file.';
    return result;
  }

  result.sequenceLength = validCharCount;

  if (validCharCount < minLength) {
    result.errors.push(
      `Sequence too short: ${validCharCount} characters. Minimum ${minLength} required for ${seqType} BLAST.`
    );
    result.message = `Sequence is too short for BLAST (${validCharCount} chars, minimum ${minLength})`;
    return result;
  }

  // Warning for very long sequences
  if (validCharCount > 5000000) {
    result.warnings.push(`Very long sequence (${validCharCount} chars) - BLAST may take longer`);
  }

  // Check for invalid characters
  const invalidPattern = seqType === 'protein' 
    ? /[^ACDEFGHIKLMNPQRSTVWYBXZJOU\*\-\s>/]/gi
    : /[^ATGCNRYSWKMBDHVU\-\s>/]/gi;
  const invalidChars = sequenceData.match(invalidPattern) || [];
  
  if (invalidChars.length > 0) {
    const uniqueInvalid = Array.from(new Set(invalidChars.map(c => c.trim()).filter(c => c)));
    result.warnings.push(`Found ${invalidChars.length} invalid characters: ${uniqueInvalid.join(', ')}`);
  }

  // All checks passed
  result.isValid = true;
  result.message = `Valid ${seqType.toUpperCase()} FASTA sequence (${validCharCount} characters)`;

  return result;
}

/**
 * Validates a FASTA file from a File object (for file uploads)
 */
export async function validateFASTAFile(file: File): Promise<FASTAValidationResult> {
  if (!file) {
    return {
      isValid: false,
      errors: ['No file provided'],
      warnings: [],
      sequenceType: null,
      sequenceLength: 0,
      message: 'Please select a FASTA file'
    };
  }

  // Check file extension
  const validExtensions = ['.fasta', '.fa', '.fna', '.ffn', '.faa', '.txt'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

  if (!hasValidExt) {
    return {
      isValid: false,
      errors: [`Invalid file extension. Allowed: ${validExtensions.join(', ')}`],
      warnings: [],
      sequenceType: null,
      sequenceLength: 0,
      message: `Invalid file type. Please use one of: ${validExtensions.join(', ')}`
    };
  }

  // Read file content
  try {
    const content = await file.text();
    return validateFASTA(content);
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      sequenceType: null,
      sequenceLength: 0,
      message: 'Error reading file - please check the file is valid'
    };
  }
}
