# Tasker

A simple task management application with a React frontend and a Python Flask backend.

## Getting Started

### Frontend (Client)
1. Open a terminal and go to the client folder:
   ```
   cd client
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

### Backend (Server)
> Keep the frontend running in its terminal.

1. Open a new terminal and go to the server folder:
   ```
   cd server
   ```
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Start the backend server:
   ```
   python main.py
   ```

## Notes
- Both frontend and backend must be running at the same time.
- Frontend default: `http://localhost:5173`
- Backend default: `http://localhost:5000` (or look at console)

## Optional: Environment Variables
Create a `.env` file in the `server` folder with your Airtable API info:

```
AIRTABLE_API_KEY=your_api_key_here
AIRTABLE_BASE_ID=your_base_id_here
```
