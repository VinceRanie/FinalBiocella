# 🚀 Vercel Deployment Instructions

## ✅ Frontend Code Pushed to GitHub
Repository: https://github.com/VinceRanie/IT-3105N-REPO.git

---

## 📋 Steps to Deploy on Vercel

### 1. Go to Vercel
Visit: https://vercel.com

### 2. Sign In
- Click "Sign Up" or "Log In"
- Sign in with your GitHub account

### 3. Import Project
1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Find and select: **VinceRanie/IT-3105N-REPO**
4. Click "Import"

### 4. Configure Project Settings
**Framework Preset**: Next.js (should auto-detect)
**Root Directory**: `.` (leave as root)
**Build Command**: `npm run build` (auto-filled)
**Output Directory**: `.next` (auto-filled)

### 5. Add Environment Variable
Click "Environment Variables" and add:

```
Name:  NEXT_PUBLIC_API_URL
Value: https://22102959.dcism.org
```

**Your Backend Server:** web.dcism.org (https://22102959.dcism.org)

⚠️ **Note**: If your Node.js app runs on a specific port (like 3000), you might need:
```
https://22102959.dcism.org:3000
```

Test which one works after deployment.

### 6. Deploy
Click **"Deploy"** button

Vercel will:
- Install dependencies
- Build the Next.js app
- Deploy to production
- Give you a URL like: `https://your-app.vercel.app`

---

## 🔧 After Deployment

### Update Backend CORS
Once you get your Vercel URL (e.g., `https://biocella-abc123.vercel.app`), update the backend:

1. SSH into your backend server
2. Edit `biocella-api/app.js`
3. Update CORS configuration:

```javascript
app.use(cors({
  origin: [
    'https://your-app.vercel.app',  // Your Vercel URL
    'http://localhost:3001',        // Keep for local dev
    'http://localhost:3002'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

4. Restart backend:
```bash
pm2 restart biocella-api
```

---

## ✅ Verification Checklist

- [ ] Frontend deployed successfully on Vercel
- [ ] Got Vercel deployment URL
- [ ] Added `NEXT_PUBLIC_API_URL` environment variable
- [ ] Updated backend CORS with Vercel URL
- [ ] Restarted backend server
- [ ] Tested: Can access frontend at Vercel URL
- [ ] Tested: Inventory page loads data from backend
- [ ] Tested: Can add/edit/delete chemicals
- [ ] Tested: QR codes generate correctly

---

## 🐛 Troubleshooting

### "API calls failing"
- Check browser console for CORS errors
- Verify `NEXT_PUBLIC_API_URL` is correct in Vercel settings
- Ensure backend CORS allows your Vercel domain
- Check if backend server is running

### "Build failed on Vercel"
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

### "Can't connect to backend"
- Ensure backend server is publicly accessible
- Check firewall allows port 3000
- Consider using HTTPS for production

---

## 🔒 Security Recommendations

1. **Use HTTPS** for backend in production
2. **Set up domain** instead of using IP address
3. **Environment variables** - Never hardcode credentials
4. **Database access** - Restrict to backend server only
5. **Rate limiting** - Add to prevent API abuse

---

## 📞 Need Help?

If deployment fails, check:
1. Vercel build logs
2. Backend server logs: `pm2 logs biocella-api`
3. Browser console for errors
