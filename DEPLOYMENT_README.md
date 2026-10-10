# 🚀 Deployment Guide

## Backend Deployment (Render.com)

### Prerequisites
- MongoDB Atlas account and database
- Twilio account (for SMS OTP)
- Gmail account (for email OTP fallback)
- Render.com account

### Step 1: Prepare Environment Variables
1. Copy `server/.env.example` to `server/.env`
2. Fill in all required values:
   ```env
   DB_URL=mongodb+srv://username:password@cluster.mongodb.net/youtube_clone
   TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_PHONE_NUMBER=+1234567890
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_gmail_app_password
   JWT_SECRET=generate_random_string_here
   # Media storage (recommended in production — Render's disk is wiped on deploy)
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   # Optional: extra frontend origins for CORS/Socket.IO, comma-separated
   CLIENT_URL=https://your-frontend.vercel.app
   ```
   When the server starts it logs `Media storage: Cloudinary` or
   `Media storage: local disk (./uploads)` so you can confirm which is active.

### Step 2: Deploy to Render
1. Go to [Render.com](https://render.com) and sign in
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `youtube-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `server`

### Step 3: Set Environment Variables in Render
In your Render dashboard, go to your service settings and add these environment variables:
- `NODE_ENV=production`
- `DB_URL=your_mongodb_connection_string`
- `TWILIO_SID=your_twilio_sid`
- `TWILIO_AUTH_TOKEN=your_twilio_auth_token`
- `TWILIO_PHONE_NUMBER=your_twilio_phone_number`
- `EMAIL_USER=your_email@gmail.com`
- `EMAIL_PASS=your_email_app_password`
- `JWT_SECRET=your_jwt_secret`

### Step 4: Deploy
Click "Create Web Service" - Render will automatically build and deploy your app.

## Frontend Deployment (Vercel)

### Step 1: Prepare Frontend
1. In `youtube/` directory, create `.env.local`:
   ```env
   NEXT_PUBLIC_BACKEND_URL=https://your-render-backend-url.onrender.com
   NEXT_PUBLIC_APP_URL=https://your-vercel-frontend-url.vercel.app
   ```

### Step 2: Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Root Directory**: `youtube`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### Step 3: Set Environment Variables in Vercel
Add these environment variables in Vercel dashboard:
- `NEXT_PUBLIC_BACKEND_URL=https://your-render-service.onrender.com`
- `NEXT_PUBLIC_APP_URL=https://your-project.vercel.app`

## Troubleshooting

### Common Issues:

1. **"Cannot find package 'express'"**
   - **Solution 1**: Make sure you're deploying from the `server/` directory, not root
   - **Solution 2**: In Render dashboard, set "Root Directory" to `server`
   - **Solution 3**: Clear build cache and redeploy
   - **Solution 4**: Check that `package.json` has `"start": "node index.js"` (not nodemon)
   - **Solution 5**: Use the provided `render.yaml` file for blueprint deployment

2. **MongoDB Connection Error**
   - Verify your MongoDB Atlas connection string
   - Make sure IP whitelist includes `0.0.0.0/0` for Render

3. **Twilio SMS Not Working**
   - For Trial accounts, verify phone numbers in Twilio Console
   - Check Twilio credentials are correct
   - Email fallback will work if SMS fails

4. **CORS Errors**
   - Update `FRONTEND_URL` in backend environment variables
   - Make sure frontend URL matches exactly

### Environment Variables Checklist:
- ✅ `DB_URL` - MongoDB connection string
- ✅ `TWILIO_SID` - Twilio Account SID
- ✅ `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- ✅ `TWILIO_PHONE_NUMBER` - Twilio phone number
- ✅ `EMAIL_USER` - Gmail address
- ✅ `EMAIL_PASS` - Gmail App Password
- ✅ `JWT_SECRET` - Random string for JWT
- ✅ `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` - Video & thumbnail storage
- ⬜ `CLIENT_URL` - Extra allowed frontend origin(s) (optional)
- ✅ `NEXT_PUBLIC_BACKEND_URL` - Backend URL (frontend)
- ✅ `NEXT_PUBLIC_APP_URL` - Frontend URL (frontend)

## Post-Deployment Testing

1. **Backend Health Check**: Visit `https://your-backend.onrender.com/`
2. **Video Call Test**: Create a room and join with multiple browsers
3. **Authentication Test**: Try SMS OTP (should fallback to email if SMS fails)
4. **Shareable Links**: Test room links work across different devices

## Support

If you encounter issues:
1. Check Render/Vercel deployment logs
2. Verify all environment variables are set
3. Test locally first with `npm run dev`
4. Check MongoDB Atlas network access
5. Verify Twilio phone number verification (for Trial accounts)

## Demo data & demo account

After the backend is deployed (with `DB_URL` set), fill the app with sample
content so visitors don't land on an empty site:

```bash
cd server
npm run seed
```

This creates 3 creator channels, 9 videos (short CC-licensed clips from the
Blender open movies), comments, subscriptions and a public playlist. Running
it again resets only the seed data; real users' data is never touched.

The **Try demo** button signs visitors into a shared account
(`demo@demo.yourtube.dev`, GOLD plan) without Google sign-in or OTP — handy
for recruiters. Disable it with `ENABLE_DEMO_LOGIN=false`. Because the
account is shared, re-run `npm run seed` occasionally to reset it.

Run the seed with Cloudinary configured in production, otherwise the clips
are written to the server's disk and disappear on the next Render deploy.

## Tests & CI

```bash
cd server
npm test   # API integration tests against an in-memory MongoDB
```

GitHub Actions (`.github/workflows/ci.yml`) runs the API tests and the
client type-check + production build on every push and pull request.
