import express from "express";
import fs from "fs";
import path from "path";
import { google } from "googleapis";
import cors from "cors";
import mongoose from "mongoose"; // Import Mongoose
import { decodeBodyFromGmail } from "./utils";

const cookieSession: any = require("cookie-session");

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`; 
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// MongoDB Connection URI - MUST be set via environment variable
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  throw new Error("MONGO_URI environment variable is required");
}

const SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly", 
    "https://www.googleapis.com/auth/userinfo.email" // Needed to identify user for DB storage
];

// Improved File Detection Logic
const CRED_FILENAME = "credentials.json";
const TOKEN_FILENAME = "token.json";

// 1. Try backend directory (process.cwd())
let CRED_PATH = path.join(process.cwd(), CRED_FILENAME);
let TOKEN_PATH = path.join(process.cwd(), TOKEN_FILENAME);

// 2. Fallback: Try parent directory (project root) if not found in backend
if (!fs.existsSync(CRED_PATH)) {
  const parentPath = path.join(process.cwd(), "..", CRED_FILENAME);
  if (fs.existsSync(parentPath)) {
    CRED_PATH = parentPath;
    console.log(`[Server] Found credentials.json in project root: ${CRED_PATH}`);
  } else {
    console.log(`[Server] Looking for credentials.json at: ${CRED_PATH}`);
  }
} else {
  console.log(`[Server] Found credentials.json in backend dir: ${CRED_PATH}`);
}

// --- MONGODB SETUP ---
mongoose.connect(MONGO_URI)
  .then(() => console.log(`[Server] Connected to MongoDB Atlas`))
  .catch(err => {
      console.error("[Server] MongoDB connection error:", err);
      console.error("Make sure you have replaced <db_password> in backend/src/server.ts with your actual password.");
  });

// Define Email Schema
const EmailSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Gmail Message ID
    threadId: { type: String, required: true },
    userEmail: { type: String, required: true, index: true }, // To segregate users
    snippet: String,
    subject: String,
    from: String,
    date: String,
    timestamp: { type: Date, required: true, index: true }, // Parsed date for sorting
    body: String
});

const EmailModel = mongoose.model('Email', EmailSchema);

const app = express();

app.use(cors({
  origin: true, 
  credentials: true
}) as any);

app.use(express.json() as any);

// Cast to any to avoid strict type mismatch with express vs cookie-session types
app.use(cookieSession({
  name: "session",
  keys: ["secret-key-1", "secret-key-2"],
  maxAge: 24 * 60 * 60 * 1000 
}) as any);

let oAuth2Client: any = null;

// Initialize OAuth Client
try {
  if (fs.existsSync(CRED_PATH)) {
    const CRED = JSON.parse(fs.readFileSync(CRED_PATH, "utf8"));
    oAuth2Client = new google.auth.OAuth2(
      CRED.installed?.client_id || CRED.web.client_id,
      CRED.installed?.client_secret || CRED.web.client_secret,
      `${BASE_URL}/oauth2callback`
    );
    console.log("[Server] OAuth Client initialized successfully.");
  } else {
    console.warn("WARNING: credentials.json not found. Authentication will fail.");
  }
} catch (e) {
  console.error("Error initializing OAuth client:", e);
}

// --- Helper: Get User Email ---
// Uses session cache if available, otherwise fetches from Google
const getCurrentUserEmail = async (req: any): Promise<string> => {
    if (req.session && req.session.userEmail) {
        return req.session.userEmail;
    }

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: "me" });
    const email = profile.data.emailAddress;
    
    if (email) {
        req.session.userEmail = email; // Cache it
        return email;
    }
    throw new Error("Could not determine user email");
};

// --- Auth Status ---
app.get("/auth/status", async (req: any, res: any) => {
    let isAuthenticated = false;
    let userEmail = null;
    const isConfigured = !!oAuth2Client;
    
    try {
        // Check in-memory
        if (oAuth2Client && oAuth2Client.credentials && oAuth2Client.credentials.access_token) {
            isAuthenticated = true;
        } 
        // Check file system
        else if (fs.existsSync(TOKEN_PATH)) {
            isAuthenticated = true;
            // Pre-load credentials if they exist on disk but not in memory
            if (oAuth2Client) {
                const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
                oAuth2Client.setCredentials(token);
            }
        }

        // If authenticated, try to get the user's email to return to frontend
        if (isAuthenticated) {
            try {
                userEmail = await getCurrentUserEmail(req);
            } catch (e) {
                console.warn("Could not fetch user email for status check");
            }
        }
    } catch (e) {
        console.error("Error checking auth status:", e);
    }

    res.json({ isAuthenticated, isConfigured, userEmail });
});

app.get("/auth", (req: any, res: any) => {
  if (!oAuth2Client) return res.status(500).send("credentials.json missing");
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    // Use select_account to allow user to switch emails
    prompt: "select_account consent"
  });
  res.redirect(authUrl);
});

app.post("/auth/logout", (req: any, res: any) => {
    try {
        // 1. Clear session
        req.session = null;
        
        // 2. Clear in-memory credentials
        if (oAuth2Client) {
            oAuth2Client.setCredentials({});
        }

        // 3. Delete token file to force re-auth
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
            console.log("[Server] Token file deleted via logout.");
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error("Logout error:", error);
        res.status(500).json({ error: "Logout failed" });
    }
});

app.get("/oauth2callback", async (req: any, res: any) => {
  const code = req.query.code as string | undefined;
  if (!code) return res.status(400).send("Missing code");
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    (req as any).session.authed = true;
    
    // Fetch and store user email immediately to speed up subsequent requests
    try {
        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
        const profile = await gmail.users.getProfile({ userId: "me" });
        (req as any).session.userEmail = profile.data.emailAddress;
    } catch (e) {
        console.warn("Could not pre-fetch user email during callback");
    }

    // Redirect back to the Frontend App with auth param
    res.redirect(`${FRONTEND_URL}?auth=success`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error retrieving access token");
  }
});

const checkAuth = async (req: any, res: any, next: any) => {
  if (!oAuth2Client) return res.status(500).json({ error: "Backend not configured" });
  if (oAuth2Client.credentials && oAuth2Client.credentials.access_token) return next();
  if (fs.existsSync(TOKEN_PATH)) {
    try {
        const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
        oAuth2Client.setCredentials(token);
        return next();
    } catch(e) {
        console.error("Token file invalid", e);
    }
  }
  res.status(401).json({ error: "Not authorized" });
};

// Helper function to fetch and enrich message details from threads
const fetchThreadedEmails = async (gmail: any, threads: any[]) => {
  const out = [];
  for (const t of threads) {
    try {
      // Fetch the full thread with all messages
      const thread = await gmail.users.threads.get({ userId: "me", id: t.id!, format: "full" });
      const messages = thread.data.messages || [];
      
      for (const msg of messages) {
          const payload = msg.payload!;
          const headers = payload.headers || [];
          const subject = headers.find((h: any) => h.name?.toLowerCase() === "subject")?.value || "(no subject)";
          const from = headers.find((h: any) => h.name?.toLowerCase() === "from")?.value || "(unknown)";
          const dateStr = headers.find((h: any) => h.name?.toLowerCase() === "date")?.value;
          const snippet = msg.snippet;

          let bodyText = snippet || "";
          
          if (payload.parts && payload.parts.length > 0) {
            // Function to find a part by MIME type recursively
            const findPart = (parts: any[], mimeType: string): any | null => {
              for (const p of parts) {
                if (p.mimeType === mimeType && p.body?.data) return p;
                if (p.parts) {
                  const r = findPart(p.parts, mimeType);
                  if (r) return r;
                }
              }
              return null;
            };

            // 1. Try to find HTML part first (Rich Text)
            const htmlPart = findPart(payload.parts, "text/html");
            // 2. Fallback to Plain Text
            const plainPart = findPart(payload.parts, "text/plain");

            if (htmlPart && htmlPart.body?.data) {
                bodyText = decodeBodyFromGmail(htmlPart.body.data);
            } else if (plainPart && plainPart.body?.data) {
                bodyText = decodeBodyFromGmail(plainPart.body.data);
            } else if (payload.body && payload.body.data) {
                bodyText = decodeBodyFromGmail(payload.body.data);
            }
          } else {
            // No parts, check main body
            if (payload.body && payload.body.data) {
              bodyText = decodeBodyFromGmail(payload.body.data);
            }
          }

          out.push({
            id: msg.id!,
            threadId: msg.threadId!,
            snippet: snippet!,
            subject,
            from,
            date: dateStr,
            timestamp: dateStr ? new Date(dateStr) : new Date(),
            body: bodyText
          });
      }
    } catch (err) {
      console.error(`Error fetching details for thread ${t.id}`, err);
    }
  }
  return out;
};

// --- GET /emails: INSTANT LOAD ---
// Returns data from MongoDB only. Does not trigger Gmail API.
app.get("/emails", checkAuth, async (req: any, res: any) => {
  try {
    const userEmail = await getCurrentUserEmail(req);
    
    // Fetch cached data from MongoDB
    const dbMessages = await EmailModel.find({ userEmail: userEmail })
        .sort({ timestamp: -1 }) // Sort by date descending
        .limit(50); // Return top 50

    res.json({ messages: dbMessages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch cached emails", detail: (err as any).toString() });
  }
});

// --- POST /sync: FETCH & UPDATE ---
// Triggers Gmail Fetch, Updates DB, Returns fresh list.
app.post("/sync", checkAuth, async (req: any, res: any) => {
    const max = Math.min(20, parseInt((req.query.max as string) || "10", 10)); 
    try {
        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
        const userEmail = await getCurrentUserEmail(req);

        // 1. Fetch new threads from Gmail
        const listResp = await gmail.users.threads.list({ userId: "me", maxResults: max });
        const threads = listResp.data.threads || [];
        
        // 2. Process details
        const freshEmails = await fetchThreadedEmails(gmail, threads);

        // 3. Bulk Upsert
        const ops = freshEmails.map(email => ({
            updateOne: {
                filter: { id: email.id },
                update: { 
                    $set: { 
                        ...email,
                        userEmail: userEmail 
                    } 
                },
                upsert: true
            }
        }));

        if (ops.length > 0) {
            await EmailModel.bulkWrite(ops);
            console.log(`[Server] Synced ${ops.length} emails to MongoDB for ${userEmail}`);
        }

        // 4. Return updated DB list
        const dbMessages = await EmailModel.find({ userEmail: userEmail })
            .sort({ timestamp: -1 })
            .limit(50);

        res.json({ messages: dbMessages });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Sync failed", detail: (err as any).toString() });
    }
});

app.get("/search", checkAuth, async (req: any, res: any) => {
  const query = req.query.q as string;
  const max = Math.min(20, parseInt((req.query.max as string) || "10", 10));

  if (!query) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
  }

  try {
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
    // Use threads.list for search
    const listResp = await gmail.users.threads.list({ userId: "me", q: query, maxResults: max });
    const threads = listResp.data.threads || [];
    
    const out = await fetchThreadedEmails(gmail, threads);

    res.json({ messages: out });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to search emails", detail: (err as any).toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Backend listening on ${PORT}`);
  console.log(`Frontend expected at ${FRONTEND_URL}`);
});