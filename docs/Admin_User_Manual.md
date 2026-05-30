# BIOCELLA Admin User's Manual

## 0.0 Running the System and Initial Screen

### 0.1 Prerequisites
- Node.js and npm are installed.
- MySQL and MongoDB are configured for the project.
- Backend environment variables are configured in the API project.

### Quick Start

- Deployed site (for test runs): https://biocella.dcism.org — see `docs/Test_Environment.md` for test-account guidance.

Notes:
- All tests should target the deployed host unless you explicitly need a local development environment.

### 0.4 Default Username and Password
- Admin account:
  - No hardcoded default admin username/password is included in the repository.
  - Admin access is provisioned using the invite flow in the Users module.
  - Invited users complete account setup through the email password setup link.
- Seeded test user present in SQL dump:
  - Email exists in seed data (`21104163@usc.edu.ph`), but no plain-text default password is provided.

### 0.5 Initial Screen Displayed
- The first screen for sign-in is the Login screen (`/Login`).
- After successful login, users are redirected by role.
- Admin users are redirected to the Admin Dashboard (`/AdminUI/AdminDashBoard`).

### 0.6 Screenshot Placeholder
- Screenshot 0-1: Login Page (email, password, remember me, forgot password)
- Screenshot 0-2: Admin Dashboard landing page after successful login

---

## 1.0 Admin Dashboard Module

### 1.1 Purpose
The Dashboard gives a quick operational view of collection, inventory, appointment activity, and shortcut actions for daily admin work.

### 1.2 Major Components
- Top Navigation Bar:
  - Dashboard
  - Collection
  - Inventory
  - Appointment
  - Reports
  - Users
  - Profile menu (My Profile, Logout)
- Quick Actions:
  - Add specimen
  - Add chemical
  - Open reports
  - Open unavailable date panel
- Status Widgets and summary cards:
  - Appointment status snapshots
  - Today's ongoing/no-show appointments
  - Tomorrow's pending appointments
- Specimen Overview Table
- Unavailable Date modal panel

### 1.3 Step-by-Step Instructions
1. Log in as an admin.
2. Confirm that the active menu is Dashboard.
3. Review summary cards to identify urgent actions.
4. Use quick actions for common admin tasks:
   - Add specimen
   - Add chemical
   - Open reports
5. Open Set Date Unavailable when you need to block booking days.
6. Add date and reason, then click Mark Unavailable.
7. If the cancellation is urgent, enable Emergency Cancellation Override and provide a reason.
8. Remove blocked dates from the same panel when needed.

### 1.4 Available Features
- Immediate navigation to major modules.
- Appointment snapshot and activity visibility.
- Booking date blocking with reason and date list.
- Standard cancellation lead-time enforcement for non-emergency changes.
- Emergency cancellation override with logged reason and email notification.

### 1.5 Module Limitations
- Date blocking currently prepares payload for notification integration; notification behavior may depend on backend integrations.
- Dashboard data depends on API availability and current data quality.

### 1.6 Screenshot Placeholder
- Screenshot 1-1: Dashboard main layout with navigation bar
- Screenshot 1-2: Quick action buttons
- Screenshot 1-3: Set Date Unavailable modal
- Screenshot 1-4: Specimen Overview table

---

## 2.0 Collection Module

### 2.1 Purpose
The Collection module manages microbial specimens, publication status, projects, specimen details, and BLAST workflow.

### 2.2 Major Components
- Collection toolbar/controls:
  - Add Project
  - Add Specimen
  - Search input
  - Status filter (All, Unpublished, Published)
- Specimen listing/table cards with action controls:
  - View
  - Edit
  - Delete
  - Publish/Unpublish toggle
- Project modal (create/update project)
- Specimen modal (add/edit specimen fields)
- Alert modal (success/error feedback)
- Specimen detail page (including PDF export and BLAST actions)

### 2.3 Step-by-Step Instructions
1. Go to Collection from the top menu.
2. To create a project:
   - Click Add Project.
   - Fill required fields.
   - Save.
3. To add a specimen:
   - Click Add Specimen.
   - Fill required information.
   - Save to generate QR code and record.
4. To update a specimen:
   - Click Edit on a specimen.
   - Update fields and add update notes when required.
   - Save changes.
5. To publish/unpublish a specimen:
   - Use the publish toggle/button in the list.
6. To view full details:
   - Click View to open specimen detail page.
7. Optional BLAST flow:
   - Ensure specimen has sequence and is saved.
   - Submit BLAST.
   - Check BLAST results later until ready.

### 2.4 Available Features
- Full specimen CRUD operations.
- Project CRUD integration in workflow.
- Publication state management.
- QR generation on save.
- BLAST submit/check and detailed specimen view.
- PDF generation from specimen detail page.

### 2.5 Module Limitations
- BLAST response timing depends on external NCBI processing.
- BLAST checks may require retries before completion.
- Save operation is required before BLAST submission for new specimens.

### 2.6 Screenshot Placeholder
- Screenshot 2-1: Collection controls and search/filter
- Screenshot 2-2: Add/Edit specimen modal (required fields section)
- Screenshot 2-3: Specimen list with publish status and action buttons
- Screenshot 2-4: Specimen detail page (BLAST and PDF controls)

---

## 3.0 Inventory Module

### 3.1 Purpose
The Inventory module tracks chemicals, batches, lot groups, thresholds, and usage logging.

### 3.2 Major Components
- Inventory toolbar:
  - Search
  - Add chemical/new container
  - Filters (unit, type)
- Chemical list table with pagination and sorting
- Row actions:
  - Expand batches
  - Edit chemical
  - Delete chemical
  - Open batch details
- Batch detail page:
  - Remaining quantity
  - Usage log form
  - Quantity updates
  - QR-related actions

### 3.3 Step-by-Step Instructions
1. Go to Inventory from the top menu.
2. Use search and filters to locate a chemical.
3. Add a new chemical or container:
   - Open Add Chemical modal.
   - Fill required fields (including lot number where required).
   - Save.
4. Edit an existing chemical:
   - Click Edit.
   - Update details.
   - Save.
5. Delete a chemical:
   - Click Delete and confirm.
6. Open a batch detail page:
   - Select a batch from the inventory listing.
7. Log usage in batch detail:
   - Enter amount/purpose.
   - Save usage log.

### 3.4 Available Features
- Chemical and batch management.
- Threshold/low-stock visibility.
- Lot-group summary display.
- Batch-level usage tracking.

### 3.5 Module Limitations
- Batch and stock computations are data-driven; incorrect source values affect results.
- User authentication is required for batch usage logging.

### 3.6 Screenshot Placeholder
- Screenshot 3-1: Inventory listing with filters and sorting
- Screenshot 3-2: Add Chemical modal
- Screenshot 3-3: Edit/Delete confirmation dialogs
- Screenshot 3-4: Batch detail page and usage log action

---

## 4.0 Appointment Module

### 4.1 Purpose
The Appointment module supports approval lifecycle, denial, QR verification, status tracking, and unavailable date management.

### 4.2 Major Components
- Appointment tabs:
  - Pending
  - Ongoing
  - Visited
  - Denied
  - No-Show
- Audience/source filter:
  - All
  - Internal
  - Outsider
- Action modals:
  - Approve
  - Deny
  - Scan QR
  - Notice
- Camera and manual QR input verification
- Unavailable date panel with add/remove actions

### 4.3 Step-by-Step Instructions
1. Go to Appointment from the top menu.
2. Select the desired tab (Pending/Ongoing/etc.).
3. Filter by audience if needed.
4. For pending requests:
   - Open appointment details.
   - Approve or Deny.
   - Add remarks/reason where required.
5. For check-in/verification:
   - Open scan mode.
   - Use camera or paste QR URL.
   - Confirm verification result.
6. Manage unavailable dates:
   - Add date and reason.
   - Save.
   - Remove dates when no longer blocked.

### 4.4 Available Features
- Full status pipeline management.
- QR verification support.
- Date blocking for scheduling control.
- Internal/outsider source visibility.

### 4.5 Module Limitations
- Camera scanning depends on browser permission and device support.
- Invalid QR payloads are rejected.
- Unavailable-date changes require responsive backend/API.

### 4.6 Screenshot Placeholder
- Screenshot 4-1: Appointment tab layout
- Screenshot 4-2: Approve/Deny modal with remarks fields
- Screenshot 4-3: QR scan modal
- Screenshot 4-4: Unavailable date manager

---

## 5.0 Reports Module

### 5.1 Purpose
The Reports module generates weekly/monthly analytics, stores report snapshots, and exports reports in PDF/CSV.

### 5.2 Major Components
- Report period selector:
  - Weekly
  - Monthly
- Generate and Save Report action
- Export actions:
  - Export PDF
  - Export CSV
- Saved reports list/history
- Delete saved report action
- Visual analytics:
  - Status breakdown
  - Appointment source breakdown
  - Activity timeline
  - Inventory forecasting and top chemical usage

### 5.3 Step-by-Step Instructions
1. Go to Reports from the top menu.
2. Select report period (weekly or monthly).
3. Click Generate and Save Report.
4. Review generated summary and charts.
5. Export current report as PDF or CSV.
6. Open previously saved reports from the list.
7. Delete outdated saved reports when needed.

### 5.4 Available Features
- Report persistence and retrieval.
- PDF and CSV export.
- Forecasting and ranking views.

### 5.5 Module Limitations
- Requires valid authenticated account context.
- Export depends on browser download behavior.
- Data reflects available records at generation time.

### 5.6 Screenshot Placeholder
- Screenshot 5-1: Reports main panel and period selector
- Screenshot 5-2: Generated summary and charts
- Screenshot 5-3: Export buttons and saved reports list

---

## 6.0 Users and Profile Modules

### 6.1 Purpose
The Users module handles invite, role updates, activation/deactivation, and user list filtering. The Profile module handles account information updates and password reset requests.

### 6.2 Major Components
- Users module controls:
  - Role filter
  - Active/Deactivated view
  - Search
  - Sortable columns
- User actions:
  - Update role
  - Deactivate user
  - Reactivate user
  - Invite user by email and role
- Confirmation dialogs for sensitive actions
- Profile module sections:
  - Profile info
  - Academic info
  - Profile photo URL/upload
  - Password reset request button
  - Save changes

### 6.3 Step-by-Step Instructions
1. Go to Users from the top menu.
2. Use role/view/search filters to locate user records.
3. To invite a user:
   - Enter email and role.
   - Confirm invite.
4. To change role:
   - Open user action.
   - Select new role.
   - Confirm role update.
5. To deactivate/reactivate:
   - Select user action.
   - Confirm the change.
6. Go to Profile from Profile menu.
7. Update department/course/profile photo fields as needed.
8. Click Save Changes.
9. Use Change Password to send reset email to current account.

### 6.4 Available Features
- Admin-managed user lifecycle.
- Invite-driven onboarding.
- Account profile editing for admin.
- Authenticated password reset requests.

### 6.5 Module Limitations
- Invite and reset actions depend on email service availability.
- Password reset has cooldown/lock behavior.
- Some profile capabilities are role-restricted by backend policy.

### 6.6 Screenshot Placeholder
- Screenshot 6-1: Users table with filters and sorting
- Screenshot 6-2: Invite user form and confirmation dialog
- Screenshot 6-3: Deactivate/Reactivate action dialogs
- Screenshot 6-4: Admin profile page (save + password reset)

---

## 7.0 Messages

Messages are grouped by type and arranged in ascending order.

### 7.1 Error Messages

`Account is locked. Time remaining: X minute(s)`
- Description: Login is temporarily blocked after maximum failed attempts.
- Action: Wait until lock period ends, then log in again with correct credentials.

`Account setup is not complete. Please finish finalize setup.`
- Description: The invited account has not finished setup.
- Action: Open setup link from email and complete finalization.

`An unexpected error occurred during login.`
- Description: Unexpected backend/login processing issue.
- Action: Retry login; if persistent, check API logs and server health.

`An unexpected error occurred. Please try again.`
- Description: Generic unexpected client-side/network error.
- Action: Retry action and verify connection/API availability.

`Batch quantities are invalid`
- Description: Usage or quantity input violates validation rules.
- Action: Check quantity values and ensure they are within valid limits.

`BLAST submission failed: <error>`
- Description: BLAST submission rejected or failed.
- Action: Verify sequence format and backend/NCBI availability, then retry.

`Email and password are required.`
- Description: Required login fields are missing.
- Action: Enter both email and password.

`Email is required`
- Description: Invite operation attempted without email.
- Action: Enter a valid email and retry.

`Error deleting specimen`
- Description: Specimen deletion failed due to API or data issue.
- Action: Retry; verify record ID and API response.

`Error generating PDF. Please try again.`
- Description: PDF generation failed on specimen details.
- Action: Retry export; verify browser resources and record completeness.

`Error saving project`
- Description: Project create/update request failed.
- Action: Validate form fields and retry.

`Error saving specimen`
- Description: Specimen save request failed.
- Action: Verify required fields and data format, then retry.

`Error updating publish status`
- Description: Publish/unpublish operation failed.
- Action: Retry and confirm specimen is still available.

`Failed to add chemical`
- Description: Add chemical API operation failed.
- Action: Validate required fields (including lot number when required) and retry.

`Failed to create usage log`
- Description: Batch usage logging failed.
- Action: Verify quantity and purpose inputs; retry.

`Failed to deactivate user`
- Description: User deactivation request failed.
- Action: Retry and verify account permissions.

`Failed to delete chemical`
- Description: Delete chemical action failed.
- Action: Retry and verify no dependent constraints block deletion.

`Failed to delete project`
- Description: Delete project request failed.
- Action: Retry and check if related records prevent deletion.

`Failed to delete report`
- Description: Delete saved report request failed.
- Action: Retry operation and confirm session is authenticated.

`Failed to delete specimen`
- Description: Delete specimen request failed.
- Action: Retry and verify specimen exists.

`Failed to fetch batches`
- Description: Batch list retrieval failed.
- Action: Check API connectivity and reload page.

`Failed to fetch chemicals`
- Description: Chemical list retrieval failed.
- Action: Check API connectivity and reload page.

`Failed to fetch saved reports`
- Description: Report history retrieval failed.
- Action: Re-authenticate and retry.

`Failed to fetch batch`
- Description: Batch detail retrieval failed.
- Action: Verify batch ID and API status.

`Failed to invite user`
- Description: Invite request failed.
- Action: Verify email format, role, and mail service availability.

`Failed to load users`
- Description: User list retrieval failed.
- Action: Refresh module and verify API/auth state.

`Failed to reactivate user`
- Description: User reactivation request failed.
- Action: Retry action and verify account permissions.

`Failed to remove unavailable date`
- Description: Unavailable date remove request failed.
- Action: Retry and check date value.

`Failed to request password reset.`
- Description: Password reset request could not be completed.
- Action: Retry later; check cooldown or email service.

`Failed to submit BLAST request`
- Description: BLAST request did not submit.
- Action: Verify specimen is saved and sequence data exists.

`Failed to update batch quantity`
- Description: Batch quantity update failed.
- Action: Validate inputs and retry.

`Failed to update role`
- Description: Role update request failed.
- Action: Retry and verify role policy.

`Field title is required.`
- Description: Custom field modal requires a field title.
- Action: Enter a title before adding custom field.

`Invalid credentials` / `Invalid email or password.`
- Description: Login details are incorrect.
- Action: Re-enter credentials and verify account status.

`Invalid QR code`
- Description: Scanned/entered QR does not match expected appointment format.
- Action: Re-scan correct QR or verify QR URL token/id.

`Lot Number is required.`
- Description: Lot number is required in inventory add flow.
- Action: Enter lot number before saving.

`Maximum login attempts exceeded. Account locked for 15 minutes.`
- Description: Login lockout enforced after repeated failures.
- Action: Wait 15 minutes before retrying.

`No FASTA sequence available to submit for BLAST`
- Description: BLAST requires sequence data.
- Action: Add sequence, save specimen, and resubmit.

`Please add update notes before saving changes.`
- Description: Update notes are required on specimen update flow.
- Action: Add update notes and save again.

`Please provide a classification.`
- Description: Classification is required for specimen save.
- Action: Fill classification field and retry.

`Please save the specimen first before running BLAST`
- Description: BLAST is blocked for unsaved specimen.
- Action: Save specimen first, then run BLAST.

`Please select a date and provide a reason.`
- Description: Unavailable date action missing required inputs.
- Action: Fill both date and reason.

`Please select an existing chemical.`
- Description: Existing-chemical mode selected but no chemical chosen.
- Action: Select a chemical from list.

`Please specify the custom chemical type.`
- Description: Custom type was selected but value not provided.
- Action: Enter custom type text.

`Specimen ID is missing`
- Description: Attempted specimen action without valid ID.
- Action: Refresh list and select a valid specimen.

`Unable to identify your account. Please sign in again.`
- Description: Auth context missing for reports actions.
- Action: Sign in again and retry.

`User not authenticated. Please log in.`
- Description: Protected operation attempted without auth session.
- Action: Log in again.

`Your Email is deactivated by Admin`
- Description: Account is deactivated and cannot sign in.
- Action: Contact admin for reactivation.

### 7.2 Status Messages

`Generating...`
- Description: Report generation is in progress.
- Action: Wait until completion.

`Loading admin profile...`
- Description: Profile data is being fetched.
- Action: Wait for data to finish loading.

`Loading ranking...`
- Description: Forecast/ranking analytics are loading.
- Action: Wait for analytics fetch to complete.

`Loading saved reports...`
- Description: Saved report list is being fetched.
- Action: Wait for list to populate.

`Loading specimens...`
- Description: Collection records are loading.
- Action: Wait for list render.

`Loading users...`
- Description: User records are loading.
- Action: Wait for table render.

`Opening Reports...`
- Description: Dashboard quick action is routing to reports.
- Action: Wait for page navigation.

`Saving...`
- Description: A save action is currently processing.
- Action: Do not close page until save finishes.

`Sending...`
- Description: Password-reset email request is in progress.
- Action: Wait for confirmation or error.

`Signing In...`
- Description: Login request is processing.
- Action: Wait for redirect or message.

### 7.3 Information Messages

`A password reset email has been sent to your account email.`
- Description: Password reset email request succeeded.
- Action: Check inbox and follow the reset link.

`BLAST is still running. Check again in a few seconds.`
- Description: BLAST processing not yet complete.
- Action: Wait and check results again.

`BLAST results ready!` / `BLAST results are ready!`
- Description: BLAST output is available.
- Action: Open and review BLAST result details.

`Invitation sent. The user will finalize via email.`
- Description: Invite email sent successfully.
- Action: Ask user to complete setup from email link.

`Login was successful!`
- Description: Credentials accepted and session created.
- Action: Continue to module dashboard.

`No blocked dates yet.`
- Description: No unavailable appointment dates currently configured.
- Action: Add unavailable dates if needed.

`No no-show appointments for today.`
- Description: No no-show records for current day.
- Action: No action required.

`No ongoing appointments for today.`
- Description: No ongoing appointments found for current day.
- Action: No action required.

`No pending appointments for tomorrow.`
- Description: No pending next-day appointments.
- Action: No action required.

`Password has been successfully reset.`
- Description: Password reset succeeded.
- Action: Log in with new password.

`Profile updated successfully.`
- Description: Profile update operation succeeded.
- Action: Continue working.

`Project created successfully!` / `Project updated successfully!`
- Description: Project save operation succeeded.
- Action: Continue with collection workflow.

`Specimen added successfully! QR code has been generated.`
- Description: New specimen created successfully.
- Action: Use generated QR for tracking/verification.

`Specimen deleted successfully!`
- Description: Specimen record removed successfully.
- Action: Verify list refresh.

`Specimen published successfully!` / `Specimen unpublished successfully!`
- Description: Publication state changed successfully.
- Action: Confirm desired visibility state.

`Specimen updated successfully! QR code has been generated.`
- Description: Specimen update completed.
- Action: Verify updated details.

`Usage logged successfully!`
- Description: Batch usage event saved successfully.
- Action: Verify updated remaining quantity.

`User deactivated successfully`
- Description: User account disabled from login.
- Action: Reactivate later if needed.

`User reactivated. Password setup email sent.`
- Description: User account restored and setup link sent.
- Action: Ask user to complete setup from email.

### 7.4 Instruction Messages

`Change Password`
- Description: Triggers reset-link request to authenticated user email.
- Action: Click to request reset link.

`Generate and Save Report`
- Description: Builds and stores report snapshot for selected period.
- Action: Click after choosing weekly/monthly period.

`Mark Unavailable`
- Description: Saves selected date as blocked for appointments.
- Action: Provide valid date and reason before clicking.

`Select department first`
- Description: Course picker requires department selection.
- Action: Choose department, then choose course.

`Upload Image`
- Description: Opens image upload for profile photo.
- Action: Select valid image file and save profile changes.

---

## Appendix A: Suggested Screenshot Naming

Use this naming pattern to keep report assets organized:
- `admin-00-login.png`
- `admin-01-dashboard.png`
- `admin-02-collection-list.png`
- `admin-03-specimen-modal.png`
- `admin-04-inventory-list.png`
- `admin-05-batch-detail.png`
- `admin-06-appointments.png`
- `admin-07-reports.png`
- `admin-08-users.png`
- `admin-09-profile.png`
