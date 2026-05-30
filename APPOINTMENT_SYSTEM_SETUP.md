# Appointment System Setup Guide

## Overview
This guide will help you set up the complete appointment system with user requests, admin approval/denial, QR code generation, and status tracking.

## Database Setup

### 1. Run the Migration
Execute the SQL migration to add timestamp tracking columns:

```bash
cd biocella-api
mysql -u your_username -p your_database < migrations/add_appointment_timestamps.sql
```

Or run directly in MySQL:
```sql
-- Add timestamp columns to track status changes
ALTER TABLE appointment 
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN pending_at TIMESTAMP NULL,
ADD COLUMN approved_at TIMESTAMP NULL,
ADD COLUMN denied_at TIMESTAMP NULL,
ADD COLUMN ongoing_at TIMESTAMP NULL,
ADD COLUMN visited_at TIMESTAMP NULL,
ADD COLUMN denial_reason TEXT NULL,
ADD COLUMN admin_remarks TEXT NULL;

-- Update existing records
UPDATE appointment SET pending_at = created_at WHERE status = 'pending';
```

## Backend Setup

### 2. Install Required Packages

```bash
cd biocella-api
npm install qrcode nodemailer
```

### 3. Configure Environment Variables

Create or update `.env` file in `biocella-api/`:

```env
# Email Configuration (for sending notifications)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# For Gmail, you need to:
# 1. Enable 2-factor authentication
# 2. Generate an app-specific password
# Visit: https://myaccount.google.com/apppasswords

# Database (if not already configured)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=biocella
```

### 4. Test the Backend

Start your backend server:
```bash
cd biocella-api
npm start
```

Test the endpoints:
```bash
# Get all appointments
curl http://localhost:5000/api/appointment

# Get pending appointments
curl http://localhost:5000/api/appointment/status/pending
```

## Frontend Setup

### 5. Install Frontend Dependencies

```bash
cd WebApp
npm install date-fns
```

### 6. Configure API URL

Create or update `.env.local` in `WebApp/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 7. Start the Frontend

```bash
cd WebApp
npm run dev
```

## Testing the System

### User Flow

1. **User Creates Appointment**
   - Navigate to: `http://localhost:3000/Appointment/new`
   - Fill out the form with:
     - Student ID
     - Department
     - Purpose
     - Date & Time
   - Submit the request

2. **Admin Reviews Appointments**
   - Navigate to: `http://localhost:3000/AdminUI/AdminDashBoard/Features/AdminAppointment`
   - View pending appointments in the "Pending" tab
   - Click "Approve" or "Deny"

3. **Approval Process**
   - When approved:
     - QR code is generated
     - Email sent to user with QR code
     - Status changes to "ongoing"
   
4. **Check-in Process**
   - Admin clicks "Scan QR Code" button
   - Enters the QR code string (or scan with camera - camera integration can be added)
   - Appointment status changes to "visited"

### Status Flow
```
pending → approved → ongoing → visited
              ↓
           denied
```

## API Endpoints

### Appointments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/appointment` | Create new appointment |
| GET | `/api/appointment` | Get all appointments |
| GET | `/api/appointment/status/:status` | Get by status |
| GET | `/api/appointment/:id` | Get specific appointment |
| POST | `/api/appointment/:id/approve` | Approve appointment |
| POST | `/api/appointment/:id/deny` | Deny appointment |
| POST | `/api/appointment/verify-qr` | Verify QR code |
| PUT | `/api/appointment/:id` | Update appointment |
| DELETE | `/api/appointment/:id` | Delete appointment |

### Example Requests

**Create Appointment:**
```bash
curl -X POST http://localhost:5000/api/appointment \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "student_id": "2021-12345",
    "department": "Biology",
    "purpose": "Research consultation",
    "date": "2026-02-15 14:00:00"
  }'
```

**Approve Appointment:**
```bash
curl -X POST http://localhost:5000/api/appointment/1/approve \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "Approved for lab access",
    "userEmail": "student@university.edu"
  }'
```

**Deny Appointment:**
```bash
curl -X POST http://localhost:5000/api/appointment/1/deny \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Lab is closed for maintenance",
    "userEmail": "student@university.edu"
  }'
```

**Verify QR Code:**
```bash
curl -X POST http://localhost:5000/api/appointment/verify-qr \
  -H "Content-Type: application/json" \
  -d '{
    "qrCode": "abc123def456..."
  }'
```

## Creating Test Users

Since you need to create users manually, here's a SQL script:

```sql
-- Insert test user (adjust based on your user table structure)
INSERT INTO users (username, email, password, role) 
VALUES ('testuser', 'testuser@example.com', 'hashed_password', 'user');

-- Get the user_id for testing
SELECT * FROM users WHERE username = 'testuser';
```

## Features Implemented

### ✅ User Side
- Appointment request form with validation
- Date/time picker with minimum date (cannot book in the past)
- Department selection
- Purpose description
- Schedule conflict prevention
- Success/error feedback

### ✅ Admin Side
- Dashboard with 4 tabs (Pending, Ongoing, Visited, Denied)
- Approve/Deny functionality with remarks
- QR code scanner
- Timeline of status changes
- Email notifications (configured)

### ✅ Backend
- Schedule conflict checking
- Status timestamp tracking
- QR code generation
- QR code verification
- Email notifications
- CRUD operations for appointments

## Schedule Conflict Prevention

The system prevents double-booking by:
1. Checking if an appointment already exists at the requested time
2. Only considering appointments with status "approved" or "ongoing"
3. Returning a 409 Conflict error if a conflict is detected

## Timestamp Tracking

Every status change is tracked:
- `created_at`: When appointment was created
- `pending_at`: When set to pending
- `approved_at`: When admin approved
- `denied_at`: When admin denied
- `ongoing_at`: When changed to ongoing (after approval)
- `visited_at`: When user checked in with QR code

## Email Notifications

### Approval Email
- Subject: "Appointment Approved - Biocella"
- Contains: Date, department, purpose, QR code image

### Denial Email
- Subject: "Appointment Request Denied - Biocella"
- Contains: Requested date, reason for denial

## Next Steps & Improvements

### Recommended Enhancements

1. **Camera QR Scanner**
   ```bash
   npm install react-qr-reader
   ```
   Integrate camera scanning in the admin dashboard

2. **User Authentication**
   - Integrate with existing auth system
   - Auto-populate user_id from session
   - Get user email from auth context

3. **Push Notifications**
   - Add web push notifications
   - Real-time updates for status changes

4. **Calendar View**
   - Add calendar component to visualize appointments
   - Show available time slots

5. **Appointment History**
   - User dashboard to view their past appointments
   - Download QR code

6. **Advanced Scheduling**
   - Recurring appointments
   - Time slot management
   - Maximum appointments per day

7. **Reports & Analytics**
   - Appointment statistics
   - Department-wise reports
   - Peak hours analysis

## Troubleshooting

### Email Not Sending
- Check EMAIL_USER and EMAIL_PASS in .env
- For Gmail: enable 2FA and create app password
- Check firewall settings

### QR Code Not Generating
- Verify `qrcode` package is installed
- Check console for errors
- Ensure database column `qr_code` exists

### Schedule Conflicts Not Working
- Verify date format matches database
- Check timezone settings
- Ensure status filtering is correct

### Frontend Not Connecting to Backend
- Check NEXT_PUBLIC_API_URL in .env.local
- Verify backend is running
- Check CORS settings if needed

## Support

For issues or questions:
1. Check console logs (both frontend and backend)
2. Verify database migrations ran successfully
3. Check network tab for API request/response
4. Review error messages in the UI

## Files Created/Modified

### Backend
- `biocella-api/models/appointmentModel.js` - Updated with new functions
- `biocella-api/controllers/appointmentController.js` - Updated with approve/deny/verify
- `biocella-api/routes/appointmentRoutes.js` - Added new routes
- `biocella-api/migrations/add_appointment_timestamps.sql` - New migration

### Frontend
- `WebApp/src/app/Appointment/AppointmentForm.tsx` - User form
- `WebApp/src/app/Appointment/new/page.tsx` - User page
- `WebApp/src/app/AdminUI/AdminDashBoard/Features/AdminAppointment/AdminAppointmentDashboard.tsx` - Admin dashboard
- `WebApp/src/app/AdminUI/AdminDashBoard/Features/AdminAppointment/page.tsx` - Admin page
- `WebApp/src/app/api/appointments/route.ts` - API routes
- `WebApp/src/app/api/appointments/status/[status]/route.ts` - Status filter
- `WebApp/src/app/api/appointments/[id]/approve/route.ts` - Approve endpoint
- `WebApp/src/app/api/appointments/[id]/deny/route.ts` - Deny endpoint
- `WebApp/src/app/api/appointments/verify-qr/route.ts` - QR verification
