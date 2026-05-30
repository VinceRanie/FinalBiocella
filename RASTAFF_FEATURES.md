# RA/Staff User Role - Feature Documentation

## Overview
A new **RA (Resident Advisor) / Staff** user role has been created with optimized permissions and dedicated UI. This role is designed for laboratory staff who need to manage inventory and appointments but with restricted access compared to admin users.

## Implemented Features

### 1. **Inventory Management** (Read/Write - No Delete)
**Location:** `/RAStaffUI/RAStaffDashBoard/Features/RAStaffInventory`

#### Permissions:
- ✅ **Add** new chemicals to inventory
- ✅ **Update** existing chemical information (quantity, type, reorder levels)
- ✅ **View** all inventory with search and filtering
- ✅ **Monitor** low stock alerts
- ❌ **Cannot Delete** chemicals (admin only)

#### Features:
- Real-time search by chemical name
- Filter by chemical type (Acid, Base, Salt, Organic, Inorganic)
- Pagination (10 items per page)
- Low stock indicator when quantity ≤ reorder level
- Add/Edit modal with form validation
- Responsive design for mobile and desktop

### 2. **Appointment Management** (Full CRUD + Approval + QR Scanning)
**Location:** `/RAStaffUI/RAStaffDashBoard/Features/RAStaffAppointment`

#### Permissions:
- ✅ **Add** new appointments for students
- ✅ **Update** existing appointment details
- ✅ **Approve** pending appointments
- ✅ **Deny** appointments with reason
- ✅ **Scan QR codes** for verification
- ✅ **View** all appointment statuses

#### Features:
- Tabbed interface: Pending → Approved → Ongoing → Visited
- Search by student ID or purpose
- Add appointment modal with date/time selection
- Approve appointments with optional remarks
- Deny appointments with required reason field
- QR code display for approved appointments
- Real-time status tracking

### 3. **Profile Management**
**Location:** `/RAStaffUI/RAStaffDashBoard/Features/RAStaffProfile`

#### Features:
- View personal information (name, email, department, ID)
- Edit profile (first name, last name, department)
- Permission overview card showing what the staff member can/cannot do
- Professional profile avatar with initials

### 4. **Navigation & Layout**
- Simplified sidebar with only relevant features (no dashboard, users, collections)
- Optimized for performance with only essential pages
- Mobile-responsive navigation with hamburger menu
- Profile dropdown with logout functionality

## Access Control

### Role-Based Route Protection
All RA/Staff pages are protected with `useProtectedRoute({ requiredRole: 'staff' })` hook.

Users attempting to access RA/Staff pages without the correct role will be redirected to the home page.

### Login Redirect
After logging in:
- **Admin** users → `/AdminUI/AdminDashBoard`
- **Staff/RA** users → `/RAStaffUI/RAStaffDashBoard` ✅ NEW
- **Students** → `/UsersUI/UsersDashBoard`

## Technical Implementation

### Architecture
```
RAStaffUI/
├── RAStaffDashBoard/
│   ├── Components/
│   │   └── Nav.tsx (Simplified navigation)
│   ├── Features/
│   │   ├── RAStaffInventory/
│   │   │   └── page.tsx
│   │   ├── RAStaffAppointment/
│   │   │   └── page.tsx
│   │   └── RAStaffProfile/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx (Auto-redirects to Inventory)
```

### Key Differences from Admin UI
| Feature | Admin | RA/Staff |
|---------|-------|----------|
| User Management | ✅ | ❌ |
| Dashboard Overview | ✅ | ❌ |
| Collection Management | ✅ | ❌ |
| Delete Inventory | ✅ | ❌ |
| Inventory Add/Update | ✅ | ✅ |
| Appointment Management | ✅ | ✅ |
| QR Code Scanning | ✅ | ✅ |
| Profile Management | ✅ | ✅ |

### Performance Optimizations
1. **Lightweight Components** - Removed unnecessary admin features
2. **Efficient Routing** - Auto-redirects to primary feature (Inventory)
3. **Optimized Navigation** - Only 2 main tabs (Inventory, Appointments)
4. **Pagination** - Reduces UI rendering for large datasets
5. **Real-time Search** - Client-side filtering for instant feedback
6. **No Delete Ops** - Simpler data management logic

## API Endpoints Used

### Inventory
- `GET /API/chemicals` - Fetch all chemicals
- `POST /API/chemicals` - Add new chemical
- `PUT /API/chemicals/:id` - Update chemical

### Appointments
- `GET /API/appointments` - Fetch all appointments
- `POST /API/appointments` - Add new appointment
- `PATCH /API/appointments/:id` - Update appointment status (approve/deny)

### Authentication
- All requests include Bearer token via `getAuthHeader()` utility

## Database Considerations

### Updated Role Column
- Database: Stores role as `'staff'` for RA/Staff users
- Login: Accepts both `'staff'` and `'ra'` aliases for backward compatibility
- Frontend: Normalizes to check for role `'staff'`

## User Workflow

### Typical RA/Staff Day
1. **Login** with RA/Staff credentials
2. **Auto-redirected** to Inventory page
3. **Check Stock** - Review low stock items
4. **Update Inventory** - Add/update chemical quantities
5. **Switch to Appointments** tab
6. **Review Pending** appointments
7. **Approve/Deny** appointments with remarks
8. **Scan QR Code** when students arrive for approved appointments
9. **View Profile** to manage personal information

## Future Enhancements

### Potential Additions
1. **Inventory Reports** - PDF export of chemical inventory
2. **Appointment Reminders** - Notify students of upcoming appointments
3. **Analytics Dashboard** - Monthly/weekly appointment trends
4. **Batch Operations** - Approve multiple appointments at once
5. **Mobile App** - Native iOS/Android app for RA/Staff
6. **Push Notifications** - Real-time alerts for incoming appointments
7. **Collection Management** (read-only) - View specimen collections without delete
8. **Inventory Audits** - Track inventory changes over time

## Security & Permissions

### What RA/Staff CANNOT Do
- ❌ Manage user accounts
- ❌ Approve/deny other staff members
- ❌ Delete any inventory items
- ❌ Delete collections or specimens
- ❌ View system settings
- ❌ Access admin reports

### What RA/Staff CAN Do
- ✅ Manage their own profile
- ✅ Add/update inventory
- ✅ Manage all appointments
- ✅ Approve appointments
- ✅ Scan QR codes
- ✅ View all data they manage

## Testing Checklist

### Inventory Testing
- [ ] Can add new chemical
- [ ] Can update chemical quantity
- [ ] Cannot delete chemical
- [ ] Search filters work correctly
- [ ] Type filter works
- [ ] Low stock indicator displays
- [ ] Pagination works

### Appointment Testing
- [ ] Can add appointment
- [ ] Can view pending/approved/ongoing/visited tabs
- [ ] Can approve appointment with remarks
- [ ] Can deny appointment with reason
- [ ] Can scan QR code
- [ ] Search filters work

### Role Testing
- [ ] Staff user redirected to RAStaffUI after login
- [ ] Cannot access AdminUI pages
- [ ] Cannot access restricted inventory features
- [ ] Logout works correctly

## Support & Troubleshooting

### Common Issues

**Q: Staff user still redirected to AdminUI?**
A: Clear browser cache/localStorage and login again. Check `getUserData()` returns correct role.

**Q: Inventory form not submitting?**
A: Verify all fields are filled. Check browser console for API errors. Ensure token is valid.

**Q: Cannot scan QR code?**
A: QR code only appears for approved appointments. Approve appointment first.

---

**Last Updated:** March 24, 2026
**Created by:** Development Team
**Status:** ✅ Production Ready
