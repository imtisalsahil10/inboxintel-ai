<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1FxIPqokRUdz9YIVoc4X_ZsnePcQikqUB

## Run Locally

**Prerequisites:**  Node.js, MongoDB Atlas account, Google Cloud OAuth credentials

### Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd inboxintel-ai
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Install backend dependencies:**
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Configure environment variables:**
   
   **Frontend:** Copy `.env.example` to `.env.local` and add your credentials:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   **Backend:** Copy `backend/.env.example` to `backend/.env` and add your credentials:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   PORT=3000
   BASE_URL=http://localhost:3000
   FRONTEND_URL=http://localhost:5173
   ```

5. **Set up Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create OAuth 2.0 credentials
   - Download credentials and save as `backend/credentials.json`
   - Add redirect URI: `http://localhost:3000/oauth2callback`

6. **Run the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

7. **Run the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```

8. **Open your browser:**
   Navigate to `http://localhost:5173`

## Security Notes

⚠️ **Never commit these files to Git:**
- `.env.local`
- `backend/.env`
- `backend/credentials.json`
- `backend/token.json`

✅ **Safe to commit:**
- `.env.example`
- `backend/.env.example`
- `backend/credentials.example.json`
