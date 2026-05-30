# 🚀 Backend Deployment to web.dcism.org

## 📋 Your Server Details
- **Server URL**: https://22102959.dcism.org
- **Host**: web.dcism.org
- **Username**: s22102959
- **SSH Port**: 22077

---

## 📤 Step 1: Upload Backend Files

### Using SFTP/SCP:
1. **Connect via FileZilla or WinSCP:**
   - Host: `web.dcism.org`
   - Port: `22077`
   - Username: `s22102959`
   - Password: `[your password]`

2. **Upload the `biocella-api` folder** to your server

---

## 🔧 Step 2: SSH into Server and Setup

### Connect via SSH:
```bash
ssh s22102959@web.dcism.org -p 22077
```

### Navigate to your backend folder:
```bash
cd biocella-api
```

### Install Node.js dependencies:
```bash
npm install
```

---

## ⚙️ Step 3: Configure Environment

### Create .env file:
```bash
nano .env
```

### Add these configurations:
```env
# MySQL Database
DB_HOST=localhost
DB_USER=s22102959
DB_PASSWORD=YOUR_ACTUAL_PASSWORD
DB_NAME=biocella_sql
DB_PORT=3306

# MongoDB
MONGO_URI=mongodb://localhost:27017/biocella_nosql

# Server
PORT=3000
NODE_ENV=production

# CORS - Update after Vercel deployment
FRONTEND_URL=https://your-app.vercel.app
```

**Save:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## 🗄️ Step 4: Setup MySQL Database

### Access phpMyAdmin:
Your server should have phpMyAdmin available. Import your database:

1. Go to phpMyAdmin (check your hosting control panel)
2. Create database: `biocella_sql`
3. Import your SQL file: `biocella_sql.sql`
4. Verify tables exist:
   - `reagents_chemicals`
   - `chemical_stock_batch`
   - `chemical_usage_log`

---

## 🚀 Step 5: Start the Backend

### Option A: Using PM2 (Recommended)
```bash
npm install -g pm2
pm2 start app.js --name biocella-api
pm2 save
pm2 startup
```

**Manage PM2:**
- Check status: `pm2 status`
- View logs: `pm2 logs biocella-api`
- Restart: `pm2 restart biocella-api`
- Stop: `pm2 stop biocella-api`

### Option B: Using Node directly (not recommended for production)
```bash
node app.js
```

---

## 🔒 Step 6: Configure for Production

### Update CORS after Vercel deployment:
Once you get your Vercel URL, update `app.js`:

```bash
nano app.js
```

Find the CORS section and update:
```javascript
app.use(cors({
  origin: [
    'https://your-actual-vercel-url.vercel.app',
    'http://localhost:3001'  // Keep for local dev
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

Then restart:
```bash
pm2 restart biocella-api
```

---

## ✅ Verification

### Test backend is running:
```bash
curl http://localhost:3000/api/chemicals
```

Should return JSON data or 404 (if no chemicals exist yet).

### Check if accessible externally:
Try visiting: `https://22102959.dcism.org:3000/api/chemicals`

If it doesn't work, you might need to:
1. Configure reverse proxy (Apache/Nginx)
2. Or use port 80/443 instead of 3000

---

## 🐛 Troubleshooting

### "Cannot find module"
```bash
npm install
```

### "Port already in use"
```bash
pm2 delete biocella-api
pm2 start app.js --name biocella-api
```

### "Database connection failed"
- Check MySQL credentials in `.env`
- Verify database `biocella_sql` exists in phpMyAdmin
- Check if MySQL is running

### "MongoDB connection failed"
Your server might not have MongoDB. Options:
1. Install MongoDB on server
2. Use MongoDB Atlas (cloud)
3. Or comment out MongoDB code if not using it

---

## 📞 Need Help?

Check logs:
```bash
pm2 logs biocella-api
```

Or check server error logs provided by your hosting.
