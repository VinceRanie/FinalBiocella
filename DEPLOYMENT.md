# DEPLOYMENT GUIDE

## 📦 Deployment Structure
- **Frontend**: Vercel (Next.js app)
- **Backend**: Your private server (Node.js + Express)
- **Database**: Your private server (MySQL + MongoDB with phpMyAdmin)

---

## 🚀 BACKEND DEPLOYMENT (Your Private Server)

### 1. Upload Backend Files
Upload the `biocella-api` folder to your server

### 2. Install Dependencies
```bash
cd biocella-api
npm install
```

### 3. Create .env File
Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
nano .env
```

Fill in your actual values:
```env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=biocella_sql
MONGO_URI=mongodb://localhost:27017/biocella_nosql
PORT=3000
FRONTEND_URL=https://your-app.vercel.app
```

### 4. Update CORS in app.js
The backend needs to allow requests from your Vercel domain.
Open `app.js` and update the CORS origin to include your Vercel URL.

### 5. Run with PM2 (Recommended)
```bash
npm install -g pm2
pm2 start app.js --name biocella-api
pm2 save
pm2 startup
```

### 6. Configure Firewall
Allow port 3000 (or your chosen port):
```bash
sudo ufw allow 3000
```

---

## 🌐 FRONTEND DEPLOYMENT (Vercel)

### 1. Push to GitHub
```bash
cd WebApp
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/Useradd-Ken/Biocella.git
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to https://vercel.com
2. Click "Import Project"
3. Select your GitHub repository
4. Set Root Directory to: `WebApp`
5. Add Environment Variable:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `http://your-server-ip:3000` or `https://your-domain.com`

### 3. Deploy!
Click "Deploy" - Vercel will build and deploy automatically

---

## 🔧 CONFIGURATION CHECKLIST

### Backend Server:
- [ ] MySQL database `biocella_sql` exists
- [ ] MongoDB running
- [ ] .env file configured
- [ ] CORS allows Vercel domain
- [ ] Port 3000 open in firewall
- [ ] PM2 process running

### Vercel:
- [ ] GitHub repo connected
- [ ] Root directory set to `WebApp`
- [ ] Environment variable `NEXT_PUBLIC_API_URL` set
- [ ] Deployment successful

### Testing:
- [ ] Frontend loads on Vercel URL
- [ ] API calls work (check browser console)
- [ ] Database connections working
- [ ] QR codes generate correctly

---

## 📝 IMPORTANT NOTES

1. **SSL/HTTPS**: Consider getting a free SSL certificate for your backend using Let's Encrypt
2. **Domain**: Use a domain name instead of IP address for production
3. **Security**: Never commit `.env` file to git
4. **Backup**: Backup your database before deployment

---

## 🐛 Troubleshooting

### CORS Errors:
Update `biocella-api/app.js` CORS config:
```javascript
app.use(cors({
  origin: ['https://your-app.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

### API Not Reachable:
- Check firewall rules
- Verify backend is running: `pm2 status`
- Check logs: `pm2 logs biocella-api`

### Database Connection Failed:
- Verify MySQL is running
- Check credentials in `.env`
- Ensure database `biocella_sql` exists
