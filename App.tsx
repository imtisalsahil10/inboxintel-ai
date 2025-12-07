import React, { useState, useEffect, useMemo } from 'react';
import { Inbox, LayoutDashboard, RefreshCw, Zap, Search, Settings, Loader2, Database, LogIn, Mail, ServerOff, Terminal, LogOut } from 'lucide-react';
import { Email } from './types';
import { MOCK_EMAILS } from './constants';
import { analyzeEmailBatch } from './services/geminiService';
import { db } from './services/storageService';
import { fetchEmailsFromBackend, syncEmailsWithBackend, checkBackendAuthStatus, loginToBackend, logoutFromBackend } from './services/gmailBackend';
import EmailDetail from './components/EmailDetail';
import Dashboard from './components/Dashboard';
import { PriorityBadge } from './components/AnalysisBadge';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <Zap size={32} />
                </div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                <p className="text-gray-500 mb-4 text-sm">The application encountered an unexpected error.</p>
                <pre className="text-left bg-gray-100 p-4 rounded text-xs overflow-auto max-h-40 mb-6 text-red-800 font-mono border border-red-200">
                    {this.state.error?.message || 'Unknown error'}
                </pre>
                <div className="flex gap-2 justify-center">
                     <button onClick={() => window.location.reload()} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                        Reload App
                    </button>
                    <button onClick={() => { localStorage.clear(); window.location.href = '/'; }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Clear Data & Reset
                    </button>
                </div>
            </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  // App State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(true); // Default to true to prevent flash
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'inbox' | 'dashboard'>('inbox');
  const [emails, setEmails] = useState<Email[]>([]);
  
  // Use threadId for selection
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Group emails by thread
  const threads = useMemo(() => {
    const groups = new Map<string, Email[]>();
    emails.forEach(e => {
        const tid = e.threadId || e.id;
        if (!groups.has(tid)) groups.set(tid, []);
        groups.get(tid)?.push(e);
    });
    
    // Sort emails inside each thread by date
    const threadList = Array.from(groups.values()).map(thread => {
        return thread.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
    });

    // Sort threads by the date of the latest email (or priority score)
    return threadList.sort((a, b) => {
        const latestA = a[a.length - 1];
        const latestB = b[b.length - 1];
        
        const scoreA = latestA.analysis?.urgencyScore || 0;
        const scoreB = latestB.analysis?.urgencyScore || 0;
        
        // If one is prioritized, show it first, otherwise chronological
        if (scoreA !== scoreB) {
            return scoreB - scoreA;
        }
        return new Date(latestB.receivedAt).getTime() - new Date(latestA.receivedAt).getTime();
    });
  }, [emails]);

  // Check Auth on Mount
  useEffect(() => {
    let mounted = true;
    const initAuth = async () => {
        try {
            const status = await checkBackendAuthStatus();
            if (!mounted) return;
            
            setIsConfigured(status.isConfigured);
            setIsAuthenticated(status.isAuthenticated);
            setIsOffline(!!status.isOffline);
            setIsLoadingAuth(false);

            // Auto-fetch if authenticated
            if (status.isAuthenticated) {
                if (status.userEmail) setUserEmail(status.userEmail);
                
                // 1. Instant Load (Cache)
                handleLoadCache();
                // 2. Background Sync (Live)
                handleSync(true).catch(e => console.error("Background sync failed", e));
            } else {
                // Load local storage data if any
                const savedData = db.getEmails();
                if (savedData && savedData.length > 0) {
                    setEmails(savedData);
                }
            }
        } catch (e) {
            console.error("Auth init failed", e);
            if (mounted) setIsLoadingAuth(false);
        }
    };
    initAuth();
    return () => { mounted = false; };
  }, []);

  const mergeEmails = (newRawEmails: Omit<Email, 'analysis'>[]) => {
      const currentMap = new Map(emails.map(e => [e.id, e]));
        
      const syncedEmails: Email[] = newRawEmails.map(raw => {
        const existing = currentMap.get(raw.id);
        if (existing?.analysis) {
            return { ...raw, analysis: existing.analysis };
        }
        return { ...raw };
      });
      return syncedEmails;
  }

  const handleLoadCache = async () => {
      try {
          const cachedEmails = await fetchEmailsFromBackend();
          const merged = mergeEmails(cachedEmails);
          setEmails(merged);
      } catch (e) {
          console.error("Cache load failed", e);
      }
  };

  const handleSync = async (isAutoFetch = false) => {
    setIsSyncing(true);
    
    try {
        // Use syncEmailsWithBackend to trigger live fetch and DB update
        const newRawEmails = await syncEmailsWithBackend();
        
        const merged = mergeEmails(newRawEmails);

        setEmails(merged);
        db.saveEmails(merged);
    } catch (e) {
        console.error("Sync error:", e);
    } finally {
        setIsSyncing(false);
        if (!isAutoFetch) setSelectedThreadId(null);
    }
  };

  const handleRunAI = async () => {
    if (emails.length === 0) return;
    setIsAnalyzing(true);
    try {
        // Optimization: Only analyze the LATEST email of each thread to save tokens
        // We first need to identify the latest emails
        const latestEmailIds = new Set(threads.map(t => t[t.length - 1].id));
        const emailsToAnalyze = emails.filter(e => latestEmailIds.has(e.id));
        
        const results = await analyzeEmailBatch(emailsToAnalyze);
        
        const updatedEmails = emails.map(email => ({
            ...email,
            analysis: results[email.id] || email.analysis // Keep existing analysis if not re-analyzed
        }));

        setEmails(updatedEmails);
        db.saveEmails(updatedEmails);
        setActiveTab('dashboard'); 
    } catch (error) {
        console.error("AI Analysis failed", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("leaked")) {
            alert(`⚠️ API Key Security Issue\n\n${errorMessage}\n\nSteps to fix:\n1. Go to https://aistudio.google.com/app/apikey\n2. Create a NEW API key\n3. Update your .env.local file with:\n   API_KEY=your_new_key_here\n4. Restart your dev server`);
        } else if (errorMessage.includes("API key") || errorMessage.includes("not configured") || errorMessage.includes("Invalid")) {
            alert(`Failed to analyze emails.\n\n${errorMessage}\n\nPlease create or update a .env.local file in the project root with:\nAPI_KEY=your_gemini_api_key_here\n\nGet your key from: https://aistudio.google.com/app/apikey`);
        } else {
            alert(`Failed to analyze emails: ${errorMessage}`);
        }
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleDemoMode = () => {
    setEmails(MOCK_EMAILS as unknown as Email[]);
    setIsAuthenticated(true);
  };
  
  const handleLogout = async () => {
    // 1. Clear backend session
    await logoutFromBackend();
    
    // 2. Clear local storage
    localStorage.clear();
    
    // 3. Reset app state by reloading
    window.location.href = '/';
  };

  const selectedThread = threads.find(t => {
      const tid = t[0].threadId || t[0].id;
      return tid === selectedThreadId;
  });

  // --- LOADING RENDER ---
  if (isLoadingAuth) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50">
              <Loader2 className="animate-spin text-indigo-600" size={48} />
          </div>
      );
  }

  // --- BACKEND OFFLINE RENDER ---
  if (isOffline) {
      return (
          <div className="flex h-screen items-center justify-center bg-gray-50 p-4 font-sans">
              <div className="bg-white p-8 rounded-xl shadow-xl max-w-lg w-full text-center">
                   <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                        <ServerOff size={32} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Backend Not Running</h1>
                    <p className="text-gray-500 mb-6 text-sm">The application cannot connect to the backend server.</p>
                    
                    <div className="bg-gray-900 text-gray-200 p-4 rounded-lg text-left font-mono text-sm mb-6 shadow-inner">
                        <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-2 text-gray-400">
                            <Terminal size={14} /> Terminal
                        </div>
                        <p><span className="text-emerald-400">$</span> cd backend</p>
                        <p><span className="text-emerald-400">$</span> npm run dev</p>
                    </div>

                    <button onClick={() => window.location.reload()} className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm">
                        Retry Connection
                    </button>
              </div>
          </div>
      )
  }

  // --- SETUP INSTRUCTIONS (If credentials.json is missing) ---
  if (!isConfigured) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50 p-4 font-sans overflow-auto">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-2xl w-full my-8">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
                        <Settings size={20} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">Setup Required</h1>
                </div>
                
                <div className="space-y-4 text-gray-600 mb-8">
                    <p>The backend is missing the <code>credentials.json</code> file required to connect to Google.</p>
                    
                    <h3 className="font-semibold text-gray-900 mt-4">How to get it:</h3>
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                        <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Google Cloud Console</a>.</li>
                        <li>Create a new project (or select existing) and search for <strong>"Gmail API"</strong> to enable it.</li>
                        <li>Go to <strong>APIs & Services {'>'} Credentials</strong>.</li>
                        <li>Click <strong>Configure Consent Screen</strong>, select <strong>External</strong>, and add yourself as a <strong>Test User</strong>.</li>
                        <li>Go back to <strong>Credentials</strong> {'>'} <strong>Create Credentials</strong> {'>'} <strong>OAuth client ID</strong>.</li>
                        <li>Select <strong>Web application</strong>.</li>
                        <li>Add <code>http://localhost:3000/oauth2callback</code> to <strong>Authorized redirect URIs</strong>.</li>
                        <li>Click <strong>Create</strong>, then download the JSON file.</li>
                        <li>Rename it to <code>credentials.json</code> and place it in the project root.</li>
                    </ol>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg mb-6 text-sm border border-blue-100">
                    <strong>Note:</strong> Ensure you restart the backend server after adding the file.
                </div>

                <button onClick={() => window.location.reload()} className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors">
                    I've added the file, Reload App
                </button>
            </div>
        </div>
    )
  }

  // --- LOGIN PAGE RENDER ---
  if (!isAuthenticated && emails.length === 0) {
      return (
        <div className="flex h-screen items-center justify-center bg-gray-50 font-sans">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                    <Zap size={32} fill="currentColor" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">InboxIntel AI</h1>
                <p className="text-gray-500 mb-8">Sign in to automatically fetch, summarize, and prioritize your emails with Gemini AI.</p>
                
                <button 
                    onClick={loginToBackend}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-3 px-4 rounded-xl transition-all shadow-sm group mb-4"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    <span>Sign in with Google</span>
                </button>
                
                <button 
                    onClick={handleDemoMode}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium hover:underline underline-offset-2"
                >
                    Try Demo Mode (No Gmail connection)
                </button>

                <p className="mt-6 text-xs text-gray-400">
                    Securely connects to your Gmail via official APIs.
                    <br/>Top 50 emails will be fetched automatically.
                </p>
            </div>
        </div>
      );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      
      {/* Sidebar Navigation */}
      <nav className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-8 flex-shrink-0">
        <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
            <Zap className="text-white" size={24} />
        </div>

        <div className="flex flex-col gap-6 w-full px-2">
            <button 
                onClick={() => { setActiveTab('inbox'); setSelectedThreadId(null); }}
                className={`p-3 rounded-xl transition-all duration-200 flex justify-center group relative ${activeTab === 'inbox' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
            >
                <Inbox size={24} />
                <span className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Inbox</span>
            </button>
            
            <button 
                onClick={() => { setActiveTab('dashboard'); setSelectedThreadId(null); }}
                className={`p-3 rounded-xl transition-all duration-200 flex justify-center group relative ${activeTab === 'dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
            >
                <LayoutDashboard size={24} />
                <span className="absolute left-14 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">Analytics</span>
            </button>
        </div>

        <div className="mt-auto flex flex-col items-center gap-4">
            <div className="group relative flex justify-center">
                 <div className="p-2 text-emerald-500 bg-gray-800 rounded-lg cursor-help">
                    <Database size={20} />
                 </div>
                 <span className="absolute left-14 top-1 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 border border-gray-700">
                    DB Connected
                 </span>
            </div>
            {/* Proper Logout Button */}
            <button onClick={handleLogout} className="p-3 text-gray-500 hover:text-red-400 transition-colors" title="Log Out & Switch Account">
                <LogOut size={24} />
            </button>
            
            <div className="group relative">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 border-2 border-gray-800 flex items-center justify-center text-xs text-white font-bold cursor-help">
                    {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
                </div>
                {userEmail && (
                    <div className="absolute left-10 bottom-0 ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none transition-opacity border border-gray-700 shadow-xl">
                        {userEmail}
                    </div>
                )}
            </div>
        </div>
      </nav>

      {/* Sub-Sidebar: Thread List */}
      {activeTab === 'inbox' && (
        <div className={`${selectedThreadId ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-gray-200 bg-white`}>
            {/* Header */}
            <div className="p-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-xl font-bold text-gray-800">Inbox</h1>
                    <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">{threads.length} threads</span>
                </div>
                
                <div className="flex gap-2 mb-4">
                    <button 
                        onClick={() => handleSync(false)}
                        disabled={isSyncing}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                        {isSyncing ? 'Syncing...' : 'Fetch'}
                    </button>
                    
                    <button 
                        onClick={handleRunAI}
                        disabled={threads.length === 0 || isAnalyzing}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-200"
                    >
                        {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
                        {isAnalyzing ? 'Processing...' : 'Run AI'}
                    </button>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search emails..." 
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {threads.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <Inbox className="text-gray-300" size={32} />
                        </div>
                        <p className="text-gray-500 text-sm mb-2">No conversations found.</p>
                        <p className="text-gray-400 text-xs">Try syncing or check your connection.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {threads.map((thread) => {
                            const latestEmail = thread[thread.length - 1]; // Last email is the most recent
                            const uniqueSenders = Array.from(new Set(thread.map(e => e.senderName.split(' ')[0]))).join(', ');
                            const tid = latestEmail.threadId || latestEmail.id;
                            const isSelected = selectedThreadId === tid;

                            return (
                                <div 
                                    key={tid}
                                    onClick={() => setSelectedThreadId(tid)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors border-l-4 ${isSelected ? 'bg-indigo-50 border-indigo-600' : 'border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <h3 className={`text-sm font-semibold truncate ${latestEmail.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                                {uniqueSenders}
                                            </h3>
                                            {thread.length > 1 && (
                                                <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded-full font-medium">{thread.length}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 whitespace-nowrap">{
                                            (() => {
                                                try {
                                                    return new Date(latestEmail.receivedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                                } catch (e) {
                                                    return '';
                                                }
                                            })()
                                        }</span>
                                    </div>
                                    <h4 className="text-sm font-medium text-gray-800 mb-1 truncate">{latestEmail.subject}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{latestEmail.analysis?.summary || latestEmail.snippet}</p>
                                    
                                    {latestEmail.analysis ? (
                                        <div className="flex items-center gap-2">
                                            <PriorityBadge priority={latestEmail.analysis.priority} />
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${latestEmail.analysis.urgencyScore > 80 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {latestEmail.analysis.urgencyScore} urgency
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="Not analyzed"></span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 h-full bg-white relative">
        {activeTab === 'dashboard' ? (
            <Dashboard emails={emails} />
        ) : (
            <>
                {selectedThread ? (
                    <EmailDetail thread={selectedThread} onClose={() => setSelectedThreadId(null)} />
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full text-center bg-gray-50/50">
                        <div className="w-64 h-64 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Zap size={64} className="text-indigo-200" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Inbox Intelligence System</h2>
                        <p className="text-gray-500 max-w-md">Select a conversation to view details, or process your inbox with AI to unlock summaries, priority sorting, and auto-replies.</p>
                    </div>
                )}
            </>
        )}
      </main>

    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
        <AppContent />
    </ErrorBoundary>
  );
}