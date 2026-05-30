# FASTA File Validation System

## Overview

This implementation adds comprehensive FASTA file validation to prevent invalid sequences from being submitted to NCBI BLAST. It prevents wasted API quota and provides immediate user feedback about file issues.

## Components

### 1. **FASTA Validator Utility** (`lib/fastaValidator.ts`)
- Validates FASTA sequences before submission
- Detects sequence type (protein or nucleotide)
- Counts valid characters
- Validates file format and structure
- Provides detailed error and warning messages

**Key Functions:**
- `validateFASTA(fastaContent: string)` - Validates raw FASTA content
- `validateFASTAFile(file: File)` - Validates a File object from file upload
- `detectSequenceType(sequence: string)` - Determines if sequence is protein or nucleotide

### 2. **Validation Display Component** (`components/FASTAValidationDisplay.tsx`)
- React component that shows validation results
- Color-coded output (green for valid, red for errors, yellow for warnings)
- Shows sequence type and length
- Lists all errors and warnings

### 3. **Admin Interface Updates** (`AdminUI/AdminDashBoard/Features/AdminCollection/SpecimenModal.tsx`)
- Added FASTA validation on file selection
- Displays validation feedback immediately
- Prevents form submission if FASTA is invalid
- Blocks specimen save until FASTA validation passes

### 4. **RA Interface Updates** (`UsersUI/UsersDashBoard/Features/UserCollection/SpecimenModal.tsx`)
- Same validation as Admin interface
- Added validation state management
- Disabled BLAST submit button if FASTA is invalid
- Prevents BLAST submission with invalid sequences

## Validation Rules

### File Format Requirements
- Valid extensions: `.fasta`, `.fa`, `.fna`, `.ffn`, `.faa`, `.txt`
- FASTA header required (must start with `>`)
- At least one header-sequence pair

### Sequence Requirements
- **Nucleotide:** Minimum 30 valid characters
  - Valid characters: A, T, G, C, N, R, Y, S, W, K, M, B, D, H, V, U, -, .
- **Protein:** Minimum 20 valid amino acids
  - Valid characters: A-Z (standard + ambiguous), *, -

### Detected Issues
The validator will reject sequences that:
- Contain no FASTA header
- Have zero valid sequence characters
- Are too short for BLAST
- Cannot be parsed as valid FASTA format
- Contain only invalid characters

### Warnings (Non-blocking)
- Contains invalid characters (they are removed automatically)
- Very long sequences (>5,000,000 characters) may take longer
- Headers without sequence data before them

## User Experience Flow

### Admin/RA User Uploads FASTA File
1. **File Selected**
   - System validates file extension and MIME type
   - Reads file content
   - Detects sequence type

2. **Validation Result Displayed**
   - ✓ **Valid**: Shows sequence type and length, enables BLAST button
   - ✗ **Invalid**: Shows specific errors, prevents form submission
   - ⚠ **Warnings**: Shows warnings but allows submission (invalid chars removed)

3. **Form Submission**
   - If FASTA is invalid: **Blocked** with error message
   - If FASTA is valid: **Allowed** to save
   - Backend performs additional validation as safety check

4. **BLAST Submission**
   - If new FASTA is invalid: **Blocked** with error message
   - If FASTA is valid: **Allowed** to submit

## Testing

### Test Case 1: Valid Nucleotide FASTA
```
>Sequence1
ATGCATGCATGCATGCATGCATGCATGCATGCATGC
```
**Expected:** Valid nucleotide FASTA, 36 characters, BLAST enabled

### Test Case 2: Valid Protein FASTA
```
>ProteinSeq
MKVFLLIVGSLLTASTSHAQPLVGSEQD
```
**Expected:** Valid protein FASTA, 29 amino acids, BLAST enabled

### Test Case 3: Invalid - Random Text
```
randomwordtextmoretext
```
**Expected:** Error - No FASTA header (missing >) and insufficient valid sequence data

### Test Case 4: Invalid - Only Header
```
>NoSequence
```
**Expected:** Error - No valid sequence data found

### Test Case 5: Invalid - Too Short
```
>TooShort
ATG
```
**Expected:** Error - Sequence too short (3 characters, minimum 30 for nucleotide)

### Test Case 6: Mixed Valid and Invalid Characters
```
>MixedSeq
ATGCXYZWXGATGC
```
**Expected:** Warning - invalid characters removed, 10 valid characters remain

## Backend Safety Net

The backend (`blastController.js`) has additional validation via `validateAndCleanFasta()` function:
- Serves as a safety net if frontend validation is bypassed
- Cleans and normalizes FASTA format
- Automatically removes invalid characters
- Detects sequence type independently
- Prevents malformed submissions to NCBI

## Error Messages

### User-Facing Messages
- **Empty File**: "Please upload a valid FASTA file"
- **No Header**: "Invalid FASTA format: Missing header line starting with \">\""
- **Invalid Type**: "Unable to detect sequence type - file may contain invalid characters"
- **Too Short**: "Sequence too short for BLAST (X chars, minimum Y)"
- **All Invalid**: "The file contains only invalid characters. Please check your FASTA file."

### Backend Validation Details
When form is submitted, backend logs detailed validation info:
- Sequence type detected
- BLAST program selected (blastn, blastp, blastx, tblastn)
- Database selected (nt for nucleotide, nr for protein)
- Changes made (character removal, header addition)
- Warnings and errors

## Future Enhancements

1. **Frontend file preview** - Show first few lines of FASTA before upload
2. **Drag-and-drop validation** - Show validation while dragging file
3. **Multiple sequence support** - Validate multi-sequence FASTA files
4. **Format suggestions** - Provide corrected FASTA for near-valid files
5. **Integration with sequence database** - Verify accession numbers
6. **Customizable validation rules** - Admin settings for min/max sequence length
