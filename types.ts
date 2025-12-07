export enum Priority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum Category {
  WORK = 'WORK',
  PERSONAL = 'PERSONAL',
  NEWSLETTER = 'NEWSLETTER',
  FINANCE = 'FINANCE',
  SPAM_LIKELY = 'SPAM_LIKELY',
}

export interface Email {
  id: string;
  threadId?: string; // Added to match Gmail API
  sender: string;
  senderName: string;
  subject: string;
  snippet: string;   // Added to match Gmail API
  body: string;
  receivedAt: string;
  read: boolean;
  // Fields populated by AI
  analysis?: AIAnalysis;
}

export interface AIAnalysis {
  summary: string;
  priority: Priority;
  urgencyScore: number; // 0-100
  category: Category;
  actionItems: string[];
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export interface ChartDataPoint {
  name: string;
  value: number;
}
