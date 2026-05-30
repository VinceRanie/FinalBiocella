# Backend Deployment Guide

## Prerequisites on Server

Your server needs:
- ✅ Node.js installed
- ✅ MongoDB running on port 27018
- ✅ MySQL running on port 3306
- ✅ PM2 (recommended for production) - `npm install -g pm2`

## Step-by-Step Deployment

### 1. Upload Backend Files to Server

Upload your entire `biocella-api` folder to your server.

### 2. Install Dependencies

```bash
cd biocella-api
npm install
```

### 3. Configure Environment Variables

Create a `.env` file (copy from `.env.example`):

```bash
cp .env.example .env
nano .env  # or use any text editor
```

Update with your server's actual credentials:
```env
# MySQL - Use your server's MySQL credentials
DB_HOST=localhost
DB_USER=s22102959
DB_PASSWORD=your_actual_mysql_password
DB_NAME=biocella_sql

# MongoDB - Use your server's MongoDB credentials
MONGO_USER=s22102959_BiocellaNoSQL
MONGO_PASSWORD=Teravoid123
MONGO_HOST=localhost
MONGO_PORT=27018
MONGO_DB=s22102959_BiocellaNoSQL

PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-vercel-app.vercel.app
```

### 4. Set Up MongoDB on Server

**Option A: If MongoDB is already running on port 27018**
- Import your data: `node import-data.js`
- Create user: `node create-user.js`

**Option B: If MongoDB is on default port 27017**
- Update `MONGO_PORT=27017` in `.env`
- Import data: `node import-data.js`
- Create user: `node create-user.js`

**Option C: If MongoDB is not installed**
- Install MongoDB on the server
- Configure it to run on port 27018
- Then follow Option A

### 5. Import SQL Database

Upload and import `biocella_sql.sql` to MySQL:
```bash
mysql -u s22102959 -p biocella_sql < biocella_sql.sql
```

### 6. Test Connection

```bash
node test-connection.js
```

Should show:
```
✅ MongoDB connected successfully
📦 Database: s22102959_BiocellaNoSQL
🎉 Connection test successful!
```

### 7. Start the Server

**Quick Start (Development):**
```bash
node app.js
```

**Production (Recommended with PM2):**
```bash
# Install PM2 globally
npm install -g pm2

# Start the app with PM2
pm2 start app.js --name biocella-api

# Make it restart on server reboot
pm2 startup
pm2 save

# View logs
pm2 logs biocella-api

# Check status
pm2 status

# Restart after code changes
pm2 restart biocella-api
```

### 8. Verify Server is Running

Test your API endpoints:
```bash
curl http://localhost:3000/api/projects
curl http://localhost:3000/api/microbial-info
```

## Common Issues

### MongoDB Connection Failed
- Check if MongoDB is running: `systemctl status mongod` (Linux) or check Windows Services
- Verify port with: `netstat -tuln | grep 27018` (Linux) or `netstat -ano | findstr 27018` (Windows)
- Check credentials in `.env`

### MySQL Connection Failed  
- Test MySQL connection: `mysql -u s22102959 -p`
- Check MySQL is running
- Verify credentials in `.env`

### Port Already in Use
- Change PORT in `.env` to a different port (e.g., 3001, 8080)
- Or kill the process using port 3000

### File Upload Issues
- Ensure `uploads/specimens/` directory exists and has write permissions
- On Linux: `chmod 755 uploads/specimens/`

## PM2 Commands Reference

```bash
pm2 start app.js --name biocella-api   # Start app
pm2 stop biocella-api                  # Stop app
pm2 restart biocella-api               # Restart app
pm2 delete biocella-api                # Remove from PM2
pm2 logs biocella-api                  # View logs
pm2 logs biocella-api --lines 100      # View last 100 lines
pm2 monit                              # Monitor CPU/Memory
pm2 list                               # List all apps
```

## Environment-Specific Settings

### Development (Local)
```env
NODE_ENV=development
PORT=3000
MONGO_PORT=27017
```

### Production (Server)
```env
NODE_ENV=production
PORT=3000
MONGO_PORT=27018
```

## Summary

**Short Answer to Your Question:**

If your server already has MongoDB (port 27018) and MySQL set up with data imported, then YES - you just need to:

1. Upload backend files
2. Run `npm install`
3. Create `.env` with correct credentials
4. Run `node app.js` (or better: `pm2 start app.js`)

**BUT** if databases are not set up, you need to:
1. Import MongoDB data (using import-data.js)
2. Import MySQL data (using biocella_sql.sql)
3. Create MongoDB user (using create-user.js)
4. Then start the server

## Next Steps After Deployment

1. Update your frontend's API_URL to point to your server:
   - `http://your-server-ip:3000` or `http://web.dcism.org:3000`
2. Configure your server's firewall to allow port 3000
3. Consider setting up NGINX as a reverse proxy
4. Set up SSL/HTTPS for production
