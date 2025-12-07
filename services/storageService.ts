import { Email } from '../types';

/**
 * DATABASE CONFIGURATION
 * 
 * To connect to your MongoDB Cluster in a production environment:
 * 1. You would need a Node.js backend (Express, Next.js API, etc.).
 * 2. Use the 'mongoose' or 'mongodb' driver.
 * 3. Connection String: 
 *    const MONGO_URI = "mongodb+srv://<db_username>:<db_password>@cluster0.pcxi76b.mongodb.net/?appName=Cluster0";
 * 
 * Since we are running in a browser-only environment, we will use LocalStorage
 * to simulate the persistence of a database.
 */

const DB_KEY = 'inbox_intel_data_v1';

export const db = {
  /**
   * Simulates: await collection.bulkWrite(...) or updateMany
   */
  saveEmails: (emails: Email[]) => {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(emails));
      console.log('[Database] Summaries and analysis saved successfully.');
    } catch (error) {
      console.error('[Database] Failed to save data:', error);
    }
  },

  /**
   * Simulates: await collection.find({}).toArray()
   */
  getEmails: (): Email[] | null => {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('[Database] Failed to retrieve data:', error);
      return null;
    }
  },

  /**
   * Utility to clear the database (for testing)
   */
  clear: () => {
    localStorage.removeItem(DB_KEY);
  }
};
