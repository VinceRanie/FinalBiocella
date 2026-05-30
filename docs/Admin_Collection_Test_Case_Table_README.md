# Admin Collection Test Case Table

The complete test-case matrix is provided in:

- `docs/Admin_Collection_Test_Case_Table.csv`

It follows your exact requested columns:

- testcaseid
- objecive
- prerequeist
- actions
- inputs
- expected output
- actual output
- comments
- test results

## Open in Google Docs/Google Sheets

### Option 1 (Recommended): Google Sheets
1. Open Google Drive.
2. Click **New** > **File upload**.
3. Upload `Admin_Collection_Test_Case_Table.csv`.
4. Open with **Google Sheets**.
5. (Optional) Click **File** > **Download** > **PDF** to export a PDF copy.

### Option 2: Google Docs
1. Open Google Drive.
2. Upload the CSV file.
3. Open in Google Sheets first, then copy the table into Google Docs if needed for narrative reporting.

## Coverage Summary

The table includes 75 test cases across:
- List/load/search/sort/row expansion
- Create/Edit/Delete specimen
- Required and optional field validation
- Image and FASTA uploads
- BLAST submit/status/results lifecycle (pending/completed/failed/expired/error)
- Accession extraction/manual entry behavior
- Genome hit visibility and NCBI link behavior
- QR/PDF actions
- Error handling, reliability, and edge cases

## Test Environment

The system is deployed at `https://biocella.dcism.org`. When executing these test cases against the live site, please use the instructions in `docs/Test_Environment.md`.
