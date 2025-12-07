import { Email } from './types';

// We simulate "fetching" these from a Gmail API if the backend is offline
export const MOCK_EMAILS: Omit<Email, 'analysis'>[] = [
  {
    id: 'e1',
    threadId: 't1',
    sender: 'boss@techcorp.com',
    senderName: 'Sarah Jenkins (CEO)',
    subject: 'URGENT: Q3 Board Meeting Prep',
    snippet: 'I need the Q3 financial reports finalized by EOD today. The board meeting has been moved...',
    body: `Hi Team,
    
I need the Q3 financial reports finalized by EOD today. The board meeting has been moved up to tomorrow morning at 9 AM. 
Please drop everything else and focus on this. I need the slide deck updated with the latest revenue figures.

Thanks,
Sarah`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    read: false,
  },
  {
    id: 'e1-reply1',
    threadId: 't1',
    sender: 'me@techcorp.com',
    senderName: 'Me',
    subject: 'Re: URGENT: Q3 Board Meeting Prep',
    snippet: 'On it. I will have the draft ready by 2 PM.',
    body: `On it. I will have the draft ready by 2 PM.
    
Best,
Me`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
    read: true,
  },
  {
    id: 'e1-reply2',
    threadId: 't1',
    sender: 'boss@techcorp.com',
    senderName: 'Sarah Jenkins (CEO)',
    subject: 'Re: URGENT: Q3 Board Meeting Prep',
    snippet: 'Great. Make sure to include the APAC growth chart.',
    body: `Great. Make sure to include the APAC growth chart.`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 mins ago
    read: false,
  },
  {
    id: 'e2',
    threadId: 't2',
    sender: 'newsletter@devdaily.io',
    senderName: 'Dev Daily',
    subject: 'Top 5 React Patterns used in 2024',
    snippet: 'Hey Developers! Here are this week\'s top stories: 1. The rise of Server Components...',
    body: `Hey Developers!
    
Here are this week's top stories:
1. The rise of Server Components
2. State management wars: Redux vs Zustand
3. CSS-in-JS is dead? (Clickbait title, we know)

Click here to read the full issue. Unsubscribe anytime.`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    read: true,
  },
  {
    id: 'e3',
    threadId: 't3',
    sender: 'alerts@cloudbank.com',
    senderName: 'Cloud Bank Security',
    subject: 'Suspicious Activity Detected',
    snippet: 'We detected a login attempt from an unrecognized device in Lagos, Nigeria...',
    body: `Dear Customer,

We detected a login attempt from an unrecognized device in Lagos, Nigeria. 
If this was not you, please click the link below immediately to freeze your account.
[Suspicious Link Redacted]

Security Team`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
    read: false,
  },
  {
    id: 'e4',
    threadId: 't4',
    sender: 'mom@gmail.com',
    senderName: 'Mom',
    subject: 'Dinner this weekend?',
    snippet: 'Hi honey! Are you free this Saturday for dinner? Dad is trying a new lasagna recipe...',
    body: `Hi honey!
    
Are you free this Saturday for dinner? Dad is trying a new lasagna recipe. Let us know if you can make it. 
Also, did you water the plants?

Love, Mom`,
    receivedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    read: false,
  },
];