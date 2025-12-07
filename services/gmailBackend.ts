import { Email } from '../types';
import { MOCK_EMAILS } from '../constants';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

interface BackendMessage {
  id: string;
  threadId?: string;
  snippet?: string;
  subject?: string;
  from?: string;
  date?: string;
  body?: string;
}

/**
 * Helper to map backend message format to frontend Email type
 */
const mapBackendMessageToEmail = (msg: BackendMessage): Omit<Email, 'analysis'> => {
    let senderName = "Unknown";
    let senderEmail = "unknown@example.com";
    
    if (msg.from) {
        const match = msg.from.match(/(.*)<(.*)>/);
        if (match) {
            senderName = match[1].trim().replace(/"/g, '');
            senderEmail = match[2].trim();
        } else {
            senderName = msg.from;
            senderEmail = msg.from;
        }
    }

    return {
        id: msg.id,
        threadId: msg.threadId,
        sender: senderEmail,
        senderName: senderName,
        subject: msg.subject || '(No Subject)',
        snippet: msg.snippet || '',
        body: msg.body || msg.snippet || '',
        receivedAt: msg.date || new Date().toISOString(),
        read: false,
    };
};

export interface AuthStatus {
  isConfigured: boolean;
  isAuthenticated: boolean;
  isOffline?: boolean;
  userEmail?: string | null;
}

/**
 * Checks if the user is authenticated with Google on the backend.
 * Also checks if the backend is configured with credentials.json.
 */
export const checkBackendAuthStatus = async (): Promise<AuthStatus> => {
    try {
        const response = await fetch(`${BACKEND_URL}/auth/status`);
        if (!response.ok) {
            // If the server returns a 500/404, it is online but broken
            return { isConfigured: false, isAuthenticated: false, isOffline: false }; 
        }
        const data = await response.json();
        return { 
            isAuthenticated: !!data.isAuthenticated,
            isConfigured: data.isConfigured !== undefined ? data.isConfigured : true,
            isOffline: false,
            userEmail: data.userEmail
        };
    } catch (e) {
        console.warn("Backend not reachable or offline");
        return { isConfigured: false, isAuthenticated: false, isOffline: true };
    }
};

/**
 * Initiates the login flow by redirecting the browser to the backend auth URL.
 */
export const loginToBackend = () => {
    window.location.href = `${BACKEND_URL}/auth`;
};

/**
 * Logs out the user by notifying the backend to clear session/tokens.
 */
export const logoutFromBackend = async (): Promise<boolean> => {
    try {
        const response = await fetch(`${BACKEND_URL}/auth/logout`, { method: 'POST' });
        return response.ok;
    } catch (e) {
        console.error("Logout failed", e);
        return false;
    }
};

/**
 * Attempts to fetch cached emails (instant load) from the backend DB.
 */
export const fetchEmailsFromBackend = async (): Promise<Omit<Email, 'analysis'>[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/emails`);
    
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages: BackendMessage[] = data.messages || [];

    return messages.map(mapBackendMessageToEmail);

  } catch (error) {
    console.warn("Could not fetch cached emails, falling back to mocks.", error);
    return MOCK_EMAILS;
  }
};

/**
 * Triggers a sync with Gmail (Live Fetch) and returns updated list.
 */
export const syncEmailsWithBackend = async (): Promise<Omit<Email, 'analysis'>[]> => {
    try {
        const response = await fetch(`${BACKEND_URL}/sync?max=50`, { method: 'POST' });
        
        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }
    
        const data = await response.json();
        const messages: BackendMessage[] = data.messages || [];
    
        return messages.map(mapBackendMessageToEmail);
    
      } catch (error) {
        console.warn("Could not sync emails.", error);
        throw error;
      }
}

/**
 * Searches emails on the backend.
 */
export const searchEmailsOnBackend = async (query: string): Promise<Omit<Email, 'analysis'>[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/search?q=${encodeURIComponent(query)}&max=50`);
    
    if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
    }

    const data = await response.json();
    const messages: BackendMessage[] = data.messages || [];

    return messages.map(mapBackendMessageToEmail);

  } catch (error) {
    console.warn("Could not search on backend.", error);
    return [];
  }
};