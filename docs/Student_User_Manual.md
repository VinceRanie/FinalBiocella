# BIOCELLA — Student User Manual

Version: 1.0
Date: 2026-04-29

Overview:
This manual explains how students run and use the BIOCELLA system. It includes quick start/run instructions, how to sign up and log in, how to reset a password, how to use your profile, and a comprehensive Messages section listing possible system messages and recommended actions.

Deployed (production) site:
- Production URL: https://biocella.dcism.org.

Important note about credentials:
- Default username/password: None. Students must register with their USC email and finalize setup by signing in with Google as part of the account setup flow. There are no built-in default credentials for student users.

Prerequisites and running the system
- Node.js (v16+ recommended) and npm installed.
- Two projects in this repository that need to be run locally: the backend API and the WebApp (frontend).

- The backend expects environment variables such as `JWT_TOKEN`, `NEXT_PUBLIC_APP_BASE_URL`, database credentials, and optional Gmail OAuth credentials. See [biocella-api](biocella-api) configs for details.
- The frontend also uses `NEXT_PUBLIC_APP_BASE_URL` to construct links. When running locally, the default base URL is `http://localhost:3000`. In production the application is reachable at `https://biocella.dcism.org`.
Environment notes:
- For local development commands and scripts, see the project READMEs in `biocella-api` and `WebApp`.
- The backend expects environment variables such as `JWT_TOKEN`, `NEXT_PUBLIC_APP_BASE_URL`, database credentials, and optional Gmail OAuth credentials. See [biocella-api](biocella-api) configs for details.
- The frontend also uses `NEXT_PUBLIC_APP_BASE_URL` to construct links. When running locally, the default base URL is `http://localhost:3000`. In production the application is reachable at `https://biocella.dcism.org`.
- The backend expects environment variables such as `JWT_TOKEN`, `NEXT_PUBLIC_APP_BASE_URL`, database credentials, and optional Gmail OAuth credentials. See [biocella-api](biocella-api) configs for details.
- The frontend also uses `NEXT_PUBLIC_APP_BASE_URL` to construct links. When running locally, the default base URL is `http://localhost:3000`. In production the application is reachable at `https://biocella.dcism.org`.

1.0 Login

- What this screen does: authenticate existing users and return a session token.
- How to open: Navigate to the application root (e.g., `http://localhost:3000`) and choose "Login".
- Default fields: Email, Password.

Step-by-step:
- Enter your USC email in the Email field.
- Enter your password in the Password field.
- Click the "Sign in" button.
- Success: you will be redirected to the dashboard.

Screenshot placeholder: (capture the Login form and annotate the Email and Password fields, Sign-in button, and "Forgot password" link).

Notes and limitations:
- Login requires a user with a set password; if the account was created but setup not completed, follow the Finalize Setup flow.

2.0 Signup / Finalize Setup

- Flow summary: Students start registration by submitting their USC email. They receive a finalize-setup email with a secure link. The link opens the finalize signup page, where the student signs in with Google to verify identity and sets a password.

Step-by-step:
- On the Registration page, enter your USC email and submit.
- Check your email for a message with the subject "Finalize Your BIOCELLA Account Setup".
- Click the finalize link in the email (link expires in 1 hour).
- On the finalize page you will be asked to sign in with Google to verify identity.
- Fill in the remaining fields (department, course) and enter a password and retype it.
- Visible password constraints are shown on the page: at least 8 characters, contains lowercase, uppercase, and a number. Ensure all constraints are satisfied (the page marks them green when met).
- Click "Complete Registration".

Screenshot placeholder: (finalize signup page showing Google profile info, password constraints box, password fields, and submit button).

Notes and limitations:
- The finalize link expires after 1 hour.
- If you re-request a finalize link while an active link exists, you may receive a message indicating you should finish the setup process.

3.0 Forgot Password / Reset Password

- Flow summary: Use the Forgot Password page to request a reset. The system sends a secure reset link to your email. The link opens the Reset Password page to choose a new password.

Step-by-step:
- Click "Forgot password?" on the Login page.
- Enter your USC email and request a reset.
- Check your email for the reset message with the subject "Reset Your BIOCELLA Password".
- Click the link in the email (expires in 1 hour).
- On the Reset Password page, enter a new password and retype it. The same visible password constraints apply.
- Submit to complete the password reset.

Screenshot placeholder: (forgot password request form and reset page with constraints).

Notes and limitations:
- Reset links expire after 1 hour.
- If a reset is already active, the system indicates when you can request another.

4.0 User Profile

- Access: After login, open your profile from the user menu or dashboard.
- Features available to students: view and edit `department`, `course`, and request a password reset. Students cannot change role or upload certain profile photos reserved for staff/admin.

Step-by-step (update profile):
- Open Profile.
- Edit department and course fields and click Save.
- To request a password reset (authenticated), use the profile action "Change Password" which will email a reset link.

Screenshot placeholder: (profile page showing editable fields and Change Password button).

Limitations:
- Only admin and staff may change certain profile photos or role assignments.

N.0 Messages

This section lists common system messages students may encounter. For each message: description and recommended action.

N.1 Error Messages

- "Email and password are required." 
  Description: Login attempt submitted without both fields.
  Action: Fill in both Email and Password fields, then retry.

- "Invalid credentials." 
  Description: The provided credentials do not match an existing account.
  Action: Verify email and password. If you forgot your password, use "Forgot password?" to request a reset.

- "Your email is deactivated by the admin." 
  Description: An administrator has deactivated the account.
  Action: Contact an administrator for reactivation.

- "Account setup is not complete. Please finish the setup process." 
  Description: The account exists but a finalize-setup step is pending.
  Action: Check your email for the finalize link and complete the setup. If missing, ask the administrator to resend the link.

- "Account is locked. Time remaining: X minute(s)." 
  Description: Too many failed login attempts caused a temporary lockout.
  Action: Wait the specified time and try again or request help from support if urgent.

- "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number." 
  Description: New password does not meet strength requirements.
  Action: Choose a stronger password that satisfies the constraints; use the visible constraints in the UI while entering the new password.

- "Invalid or expired token." 
  Description: The finalize or reset token in the link is invalid or expired.
  Action: Request a new finalize or password reset link. Check that you are using the latest email link.

- "This reset link has expired." 
  Description: The password reset link is no longer valid.
  Action: Request a new password reset.

- "New password must be different from your current password." 
  Description: Attempted to set the same password as before.
  Action: Choose a different password satisfying strength rules.

- "Passwords do not match." 
  Description: The password and retype password fields do not match.
  Action: Re-enter matching values in both fields.

N.2 Status & Informational Messages

- "Login was successful." 
  Description: Authentication succeeded.
  Action: You will be redirected to your dashboard.

- "Finalize setup email sent successfully." 
  Description: A finalize link has been emailed to you.
  Action: Check your email and click the link to complete registration.

- "A new finalize setup link has been sent to your email." 
  Description: A new finalize link was generated and emailed.
  Action: Use the most recent link in your email to finalize the account.

- "Email sent successfully." 
  Description: A password reset or verification email was successfully sent.
  Action: Check your inbox for the message and click the link within 1 hour.

- "User profile retrieved." / "User data retrieved successfully." 
  Description: The profile or user details request returned successfully.
  Action: Review the displayed profile data; contact support if the data is incorrect.

- "Logout successful." 
  Description: You have been signed out.
  Action: Close the browser tab for additional security if using a public computer.

Appendix: Screenshots and how to capture them
- Use your OS screenshot tool or the browser devtools capture.
- Recommended captures: Login page, finalize page with constraints, reset page with constraints, profile page, and a sample error message.
- Insert screenshots in this document by saving images to `docs/screenshots/` and referencing them with Markdown image links.

If you want, I can:
- Insert actual screenshots for the pages (I can add placeholders now and you can paste images),
- Run a pass to export all system messages programmatically from `biocella-api/controllers/authController.js` into a machine-readable list,
- Or produce a PDF version of this manual.

End of manual.
# Student User Manual

This guide explains how Students use the Biocella WebApp features.

**Quick Start**

- Deployed site (for test runs): https://biocella.dcism.org — see `docs/Test_Environment.md` for test-account guidance.

- Sign in via the main `Login` page. Students are redirected to the Collections view.

**Dashboard & Navigation**
- Default landing: Collections (`UsersUI/UsersDashBoard/Features/UserCollection`).
- Menu includes: Collection, Inventory, Appointments, Profile, Logout.
- Logout clears client auth and redirects to `/Login`.

**1) Collection**
- Purpose: Browse published specimens and projects.
- Entry: `UsersUI/UsersDashBoard/Features/UserCollection`.
- Notes:
  - Students see only published specimens (client filters by `publish_status === 'published'`).
  - You can view specimen details at `/UsersUI/UsersDashBoard/Features/UserCollection/specimen/[id]`.
  - Add/Edit specimen and projects are available in the UI; success messages: "Specimen added successfully! QR code has been generated." and "Project created successfully!".

**2) Inventory**
- Purpose: View inventory items and batch details relevant to users.
- Entry: `UsersUI/UsersDashBoard/Features/UserInventory`.
- Actions: view batches, view batch pages, and (where allowed) request or view chemical information.
- Common UI errors: "Failed to fetch chemicals", generic network errors.

**3) Appointments (Booking)**
- Purpose: Book and view appointments (book via calendar UI).
- Entry: `UsersUI/UsersDashBoard/Features/UserAppointment`.
- Book flow:
  - Click "Book Appointment" → select department, date, time, and purpose → Confirm Request.
  - Date must be >= tomorrow. Blocked dates (Sunday or admin-blocked) are rejected.
  - Time conflicts are detected; messages include:
    - "Please select a date and time."
    - "Selected date is unavailable. Please pick another day."
    - "That time slot is already taken. Please choose another time."
    - "Failed to create appointment"
- Appointments show in tabs: Pending, Approved & Ongoing, Denied, Visited.

**4) Profile**
- Purpose: View and edit your profile details and upload profile photo.
- Entry: `UsersUI/UsersDashBoard/Features/UserProfile`.
- Common messages: "Loading profile...", "Failed to load profile.", "Failed to update profile.", "Failed to upload profile photo."

**Common Client Behaviors**
- Redirects: Students and Faculty are routed to the Collection view by `redirectByRole`.
- Loading indicators: "Loading...", "Loading specimens...".
- API examples used:
  - `GET ${API_URL}/microbials` (collection)
  - `GET ${API_URL}/projects`
  - `POST ${API_URL}/appointments` (book)

**Message Catalog (from UsersUI)**
- Info / Loading:
  - "Loading..."
  - "Loading specimens..."
  - "Loading profile..."
- Success:
  - "Specimen added successfully! QR code has been generated."
  - "Project created successfully!"
  - "Specimen deleted successfully!"
- Validation / Input:
  - "Please select a date and time."
  - "Error: Specimen ID is missing"
- Errors / Failures:
  - "Failed to fetch specimens"
  - "Failed to fetch chemicals"
  - "Failed to create appointment"
  - "Failed to delete specimen"
  - "Connection error. Please check your network."

**Developer Notes**
- Students use the shared `UsersUI` routes; behavior is identical for `faculty` unless role-based backend checks differ.
- If the UI shows network errors, verify `API_URL` and backend server availability.

---
Generated from code inspection of `WebApp/src/app/UsersUI` on April 28, 2026.
