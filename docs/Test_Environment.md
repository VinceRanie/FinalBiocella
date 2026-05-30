# Test Environment (Deployed)

The Biocella system is deployed at: https://biocella.dcism.org

Use this host when running manual test cases from the `docs/*.csv` test matrices.

Base URL
- Frontend / API base: https://biocella.dcism.org

Authentication / Test accounts
- If test accounts are seeded on the deployed system, use those credentials.
- Common seeded accounts (if present):
  - Admin: admin@example.com / (use password set during deploy)
  - Staff/RA: staff@example.com / password
  - Student: student@example.com / password

Notes for running tests
- When importing CSVs into Google Sheets, ensure the first data row is the header: `TestCaseId,Objective,Prerequisite,Actions,Inputs,Expected Output,Actual Output,Comments,Test Results`.
- Tests reference UI navigation and API endpoints; confirm `https://biocella.dcism.org` is reachable and that CORS allows your test client.
- For API-level tests, use `https://biocella.dcism.org/API/...` (if configured) or the frontend routes as specified in each test case.

Updating test cases
- This repository now stores environment metadata in `docs/Test_Environment.md`.
- If you want me to inject the base URL directly into each CSV file (first column or a metadata row), tell me and I will update the CSVs accordingly.

Security
- Do not commit real passwords or sensitive credentials to the repository. Use environment-specific secrets or a secure test-account vault.

Contact
- If the deployed environment uses different test credentials or a different API path, provide the details and I will update the test matrices accordingly.
