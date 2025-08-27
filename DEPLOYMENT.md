# BlogCMS Deployment Guide

This guide will help you deploy the BlogCMS application to production using:
- **Neon** for PostgreSQL database
- **Railway** for NestJS backend
- **Netlify** for Next.js frontend

## Prerequisites

- GitHub account with your code repository
- Accounts on Neon, Railway, and Netlify
- Node.js 20+ locally for testing

## 1. Database Setup (Neon)

1. Create a new project on [Neon](https://neon.tech)
2. Create a new database
3. Copy your connection string (it looks like: `postgresql://user:password@host.neon.tech/dbname?sslmode=require`)
4. Save this for Railway configuration

## 2. Backend Deployment (Railway)

### Setup
1. Go to [Railway](https://railway.app) and create a new project
2. Choose "Deploy from GitHub repo"
3. Select your repository and authorize Railway
4. Railway will auto-detect the NestJS app in `/backend` folder

### Environment Variables
In Railway dashboard, add these environment variables:

```bash
# Database
DATABASE_URL=<your-neon-connection-string>

# Security
JWT_SECRET=<generate-32-char-random-string>
JWT_EXPIRATION=7d
JWT_REMEMBER_EXPIRATION=30d
NODE_ENV=production

# CORS (update with your Netlify URL)
CORS_ORIGINS=https://your-site.netlify.app

# Security Features
ENABLE_CSP=true
AUTH_COOKIE_ENABLED=true
AUTH_COOKIE_NAME=access_token
AUTH_COOKIE_SAMESITE=None
AUTH_COOKIE_SECURE=true

# Upload Limits
UPLOAD_MAX_PIXELS=25000000

# Optional: Seed Admin
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=<strong-password>
```

### Deploy
1. Railway will automatically:
   - Install dependencies
   - Generate Prisma client
   - Build the NestJS app
   - Run database migrations
   - Start the production server
2. Copy your Railway app URL (e.g., `https://your-app.up.railway.app`)

## 3. Frontend Deployment (Netlify)

### Setup
1. Go to [Netlify](https://app.netlify.com) and click "Add new site"
2. Choose "Import an existing project"
3. Connect to GitHub and select your repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`

### Environment Variables
In Netlify dashboard > Site settings > Environment variables, add:

```bash
# Backend API
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app/api
NEXT_PUBLIC_API_HOST=your-app.up.railway.app

# Security
NEXT_PUBLIC_FORCE_SECURE_COOKIES=true
NEXT_PUBLIC_SEND_CREDENTIALS=true
```

### Deploy
1. Click "Deploy site"
2. Netlify will build and deploy automatically
3. Get your Netlify URL (e.g., `https://your-site.netlify.app`)

## 4. Post-Deployment Configuration

### Update CORS
Go back to Railway and update the `CORS_ORIGINS` environment variable:
```bash
CORS_ORIGINS=https://your-site.netlify.app,https://your-custom-domain.com
```

### Custom Domain (Optional)
1. **Netlify**: Add custom domain in Domain settings
2. **Railway**: Add custom domain in Settings > Domains
3. Update environment variables accordingly

### Database Seeding
If you set seed admin variables, the admin user will be created on first deployment.
Otherwise, you can manually run:
```bash
railway run npx prisma db seed
```

## 5. Monitoring & Maintenance

### Health Check
Your backend health endpoint: `https://your-app.up.railway.app/api/health`

### Logs
- **Railway**: Check logs in Railway dashboard
- **Netlify**: Check logs in Netlify dashboard
- **Neon**: Monitor database in Neon console

### Updates
Push to GitHub main branch will auto-deploy to both Railway and Netlify.

### Database Migrations
For schema changes:
1. Update `prisma/schema.prisma`
2. Create migration locally: `npm run prisma:migrate:dev`
3. Push to GitHub
4. Railway will auto-apply migrations on deploy

## Environment Variables Reference

### Backend (Railway)
| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | Neon PostgreSQL connection string | Yes |
| JWT_SECRET | 32+ character random string | Yes |
| JWT_EXPIRATION | Token expiration (e.g., 7d) | Yes |
| NODE_ENV | Set to "production" | Yes |
| CORS_ORIGINS | Comma-separated frontend URLs | Yes |
| PORT | Auto-set by Railway | No |

### Frontend (Netlify)
| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_API_URL | Railway backend URL + /api | Yes |
| NEXT_PUBLIC_API_HOST | Railway backend host | Yes |
| NEXT_PUBLIC_FORCE_SECURE_COOKIES | Set to "true" | Yes |

## Troubleshooting

### CORS Issues
- Ensure `CORS_ORIGINS` includes your exact Netlify URL
- Check for trailing slashes
- Verify protocol (https://)

### Database Connection
- Ensure `?sslmode=require` is in connection string
- Check Neon dashboard for connection limits
- Verify database is active

### Build Failures
- Check Node version (should be 20+)
- Verify all dependencies are in package.json
- Check build logs for specific errors

## Security Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] HTTPS enabled on all services
- [ ] CSP headers enabled
- [ ] Secure cookies configured
- [ ] Database SSL required
- [ ] Admin password changed from default
- [ ] CORS properly configured
- [ ] Rate limiting considered
