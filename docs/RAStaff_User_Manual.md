# RA / Staff User Manual

This guide explains how Research Assistants (RA) and Staff use the Biocella WebApp features they can access.

**Quick Start**

- Deployed site (for test runs): https://biocella.dcism.org — see `docs/Test_Environment.md` for test-account guidance.

- Sign in via the main `Login` page. Users with role `staff` or `ra` are redirected to the RA/Staff dashboard.

**RA/Staff Dashboard Overview**
- Location: `RAStaffUI/RAStaffDashBoard` (protected route; `useProtectedRoute({ requiredRole: 'staff' })`).
- Primary menu (left/top): Collection, Inventory, Appointments, Profile, Logout.
- Logout: clears client auth and redirects to `/Login`.

**1) Collection**
- Purpose: View and manage microbial specimens and projects assigned to staff.
- Entry: `RAStaffUI/RAStaffDashBoard/Features/RAStaffCollection`.
- Actions:
  - Browse specimens (list loads from `GET ${API_URL}/microbials?role=staff`).
  - Add specimen: opens `SpecimenModal` — fill required fields and submit. On success: "Specimen added successfully! QR code has been generated.".
  - Edit specimen: click Edit, update via `SpecimenModal`. On update success: "Specimen updated successfully! QR code has been generated.".
  - Create / Edit Project: Project modal; on success: "Project created successfully!" or "Project updated successfully!".
  - Toggle publish status (publish/unpublish) for specimen entries.
  - View specimen details: opens specimen page at `/RAStaffUI/.../specimen/[id]`.
- Files: `RAStaffCollection`, `SpecimenModal`, `ProjectModal`, `RAStaffControls`.

**2) Inventory**
- Purpose: Manage chemicals, containers (batches), low-stock monitoring and batch QR labels.
- Entry: `RAStaffUI/RAStaffDashBoard/Features/RAStaffInventory`.
- Actions:
  - View chemicals and active batches.
  - Add new chemical or add container to existing chemical (`AddChemicalModal`).
  - Edit chemical details (`EditChemicalModal`).
  - Download batch QR with label (PNG) for inventory labeling.
- Notes:
  - Inventory only shows chemicals with active batches.
  - Low-stock highlighting is based on `threshold` vs remaining quantity.
- Common errors: "Failed to fetch chemicals", or returned error strings shown in UI.

**3) Appointments**
- Purpose: Manage appointments (pending/ongoing/visited/denied/no-show), scan/verify QR codes, and mark unavailable dates.
- Entry: `RAStaffUI/RAStaffDashBoard/Features/RAStaffAppointment`.
- Actions:
  - View tabs for appointment statuses and filter by audience (internal/outsider).
  - Approve / Deny appointments with optional remarks.
  - Mark dates unavailable (sends POST to `/API/appointments/unavailable-dates`). Required: a date and a reason.
    - Standard cancellations must be made at least 24 hours before the appointment date.
    - If the issue is urgent, use Emergency Cancellation Override and enter a reason.
    - Example alert: "Please select a date and provide a reason." on invalid input.
    - On success: "Date marked unavailable" and affected users are emailed automatically.
  - QR scanning:
    - Start camera to scan appointment QR codes (uses `jsqr`).
    - Valid appointment QR auto-verifies when URL contains `/verify-appointment?` or `/scan/appointment?` and includes `token` and `id` params.
    - Camera and streaming errors present as alerts (e.g., "Camera stream timeout", "Error playing video: ...").
- Notes: appointment data is fetched from `/API/appointments` and unavailable dates from `/API/appointments/unavailable-dates`.

**4) Profile**
- Purpose: View and update your profile (department, course, profile photo).
- Entry: `RAStaffUI/RAStaffDashBoard/Features/RAStaffProfile`.
- Actions:
  - Edit department/course and upload profile photo (`/auth/profile/upload`).
  - Common UI messages: "Loading profile...", "Failed to load profile.", "Failed to update profile." and "Failed to upload profile photo.".

**Common Client Behaviors**
- Protected routing: Users without `staff`/`ra` will not access RA/Staff routes and are redirected.
- Auth headers: requests include `getAuthHeader()` to send JWT cookie/authorization data.
- Loading indicators: "Loading...", "Loading specimens...", and spinner states in inventory and other lists.

**Message Catalog (collected from RA/Staff UI files)**
- Info / Loading:
  - "Loading..."
  - "Loading specimens..."
  - "Loading profile..."
- Success:
  - "Specimen added successfully! QR code has been generated."
  - "Specimen updated successfully! QR code has been generated."
  - "Project created successfully!"
  - "Project updated successfully!"
  - "Date marked unavailable"
  - "Emergency Cancellation Override"
- Validation / Input:
  - "Please select a date and provide a reason."
  - "Error: Specimen ID is missing"
- Errors / Failures:
  - "Error saving project"
  - "Error saving specimen"
  - "Failed to fetch specimens"
  - "Failed to fetch chemicals"
  - "Error: {error.message}" (generic UI error templates)
  - "Connection error. Please check your network."
  - "Camera stream timeout"
  - "Error playing video: {err.message}"
  - "Unable to load profile." / "Failed to load profile." / "Failed to update profile." / "Failed to upload profile photo."

**Developer / Troubleshooting Notes**
- Role values: the frontend recognizes `staff` and keeps `ra` for backward compatibility. Redirect uses `/RAStaffUI/RAStaffDashBoard`.
- API endpoints used by RA/Staff UI (examples):
  - `GET ${API_URL}/microbials?role=staff` (specimens)
  - `GET ${API_URL}/projects` (projects list)
  - `GET ${API_URL}/chemicals` and `GET ${API_URL}/batches` (inventory)
  - `/API/appointments` and `/API/appointments/unavailable-dates` (appointments)
  - `POST /auth/profile/upload` (profile photo upload)
- If UI shows network errors, check backend value of `API_URL` (WebApp config) and that the backend server is running.

**Next steps**
- Review this manual for role-specific screenshots or step-by-step images to add.
- I can trim this into a one-page quick reference or generate a PDF if you want.

---
File generated from code inspection of `WebApp/src/app/RAStaffUI` components on April 28, 2026.
