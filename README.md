# WireStack: Neo-Brutalist Visual App Builder

WireStack is a powerful visual full-stack application builder designed for both developers and non-developers. Map out your logic, connect nodes, and generate production-ready code in seconds.

## 🚀 Deployment Guide

To ensure smooth authentication and redirects in production, follow these steps precisely:

### 1. Google Cloud Console Configuration
Update your OAuth 2.0 Client ID settings:
- **Authorized JavaScript origins**: `https://acehack5-0-wirestack.vercel.app`
- **Authorized redirect URIs**: `https://acehack5-0-wirestack.onrender.com/api/auth/google/callback`

### 2. Backend Deployment (Render)
- **Root Directory**: `backend`
- **Environment Variables**:
    - `FRONTEND_URL`: `https://acehack5-0-wirestack.vercel.app`
    - `GOOGLE_CALLBACK_URL`: `https://acehack5-0-wirestack.onrender.com/api/auth/google/callback`
    - `GOOGLE_CLIENT_ID`: Your Google Client ID
    - `GOOGLE_CLIENT_SECRET`: Your Google Client Secret
    - `MONGODB_URI`: Your MongoDB connection string
    - `SESSION_SECRET`: A secure random string
    - `NODE_ENV`: `production`

### 3. Frontend Deployment (Vercel)
- **Root Directory**: `frontend`
- **Environment Variables**:
    - `VITE_API_URL`: `https://acehack5-0-wirestack.onrender.com`

---

## 🛠️ Local Development
1. Clone the repo: `git clone https://github.com/Somesh520/Acehack5.0_wirestack.git`
2. Install dependencies: `npm install` (in both `frontend` and `backend` folders)
3. Start the backend: `npm run dev` (inside `backend`)
4. Start the frontend: `npm run dev` (inside `frontend`)

## 🧱 Key Features
- **Visual Workflow**: Powered by React Flow (@xyflow).
- **Neo-Brutalist UI**: High-contrast, premium design language.
- **Smart Generation**: Translates visual nodes directly into Express/React/MongoDB code.
- **Onboarding Flow**: Specialized experiences for developers and non-developers.
