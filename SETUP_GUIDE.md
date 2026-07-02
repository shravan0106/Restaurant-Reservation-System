# Quick Setup Guide

## Step 1: Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in backend folder with:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/restaurant-reservation
JWT_SECRET=your_jwt_secret_key_here_change_in_production
NODE_ENV=development
```

4. Start backend server:
```bash
npm run dev
```

## Step 2: Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start frontend server:
```bash
npm run dev
```

## Step 3: Create Admin Account

After registering a user, update their role in MongoDB:
```javascript
db.users.updateOne(
  { email: "your_email@example.com" },
  { $set: { role: "admin" } }
)
```

## Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health
