# Quick Setup Commands

## Backend Dependencies
```bash
cd biocella-api
npm install qrcode nodemailer
```

## Frontend Dependencies
```bash
cd WebApp
npm install date-fns
```

## Database Migration
```bash
# Option 1: Using MySQL command line
cd biocella-api
mysql -u root -p biocella < migrations/add_appointment_timestamps.sql

# Option 2: Copy and paste SQL directly in MySQL Workbench or phpMyAdmin
```

## Environment Variables

### Backend (.env in biocella-api/)
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Frontend (.env.local in WebApp/)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Start Servers
```bash
# Terminal 1 - Backend
cd biocella-api
npm start

# Terminal 2 - Frontend
cd WebApp
npm run dev
```

## Access URLs
- User Appointment Form: http://localhost:3000/Appointment/new
- Admin Dashboard: http://localhost:3000/AdminUI/AdminDashBoard/Features/AdminAppointment
