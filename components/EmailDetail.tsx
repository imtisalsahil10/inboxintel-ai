import React, { useState } from 'react';
import { Email, Priority } from '../types';
import { PriorityBadge, CategoryBadge } from './AnalysisBadge';
import { Bot, Sparkles, Send, Copy, ThumbsUp, X, ChevronDown, ChevronUp } from 'lucide-react';
import { generateSmartReply } from '../services/geminiService';

interface EmailDetailProps {
  thread: Email[];
  onClose: () => void;
}

const EmailDetail: React.FC<EmailDetailProps> = ({ thread, onClose }) => {
  const [generatedReply, setGeneratedReply] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Focus on the latest email for AI context
  const latestEmail = thread[thread.length - 1];

  const handleGenerateReply = async () => {
    setIsGenerating(true);
    const reply = await generateSmartReply(latestEmail);
    setGeneratedReply(reply);
    setIsGenerating(false);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden shadow-xl border-l border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{latestEmail.subject}</h2>
            {latestEmail.analysis && <PriorityBadge priority={latestEmail.analysis.priority} />}
            {thread.length > 1 && (
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full font-medium">
                    {thread.length} messages
                </span>
            )}
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
            <X size={20} />
        </button>
      </div>

      {/* Main Content Area - Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Thread View */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
            <div className="p-8 space-y-6">
                {thread.map((email, index) => {
                    const isLast = index === thread.length - 1;
                    return (
                        <div key={email.id} className={`bg-white rounded-xl border ${isLast ? 'border-indigo-100 shadow-md' : 'border-gray-200 opacity-90'}`}>
                            {/* Message Header */}
                            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 rounded-t-xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isLast ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {email.senderName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{email.senderName} <span className="font-normal text-gray-500 text-xs">&lt;{email.sender}&gt;</span></p>
                                        <p className="text-xs text-gray-400">{new Date(email.receivedAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Message Body */}
                            {/* We use dangerouslySetInnerHTML because we are now fetching rich text/html emails */}
                            <div 
                                className="p-6 text-gray-800 leading-relaxed text-base overflow-x-auto email-content"
                                dangerouslySetInnerHTML={{ __html: email.body }}
                            />
                        </div>
                    );
                })}
            </div>
        </div>

        {/* AI Sidebar (Context aware of latest email) */}
        <div className="w-96 bg-indigo-50/50 border-l border-indigo-100 p-6 overflow-y-auto flex flex-col gap-6">
          
          {/* AI Summary Card */}
          {latestEmail.analysis ? (
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4">
              <div className="flex items-center gap-2 mb-3 text-indigo-700">
                <Sparkles size={18} />
                <h3 className="font-semibold">Latest Email Intelligence</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Summary</p>
                  <p className="text-sm text-gray-700 leading-snug">{latestEmail.analysis.summary}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <CategoryBadge category={latestEmail.analysis.category} />
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600 font-medium">
                        Sentiment: {latestEmail.analysis.sentiment}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded border border-gray-200 text-gray-600 font-medium">
                        Urgency: {latestEmail.analysis.urgencyScore}/100
                    </span>
                </div>

                {latestEmail.analysis.actionItems.length > 0 && (
                  <div>
                     <p className="text-xs font-medium text-gray-500 uppercase mb-2">Suggested Actions</p>
                     <ul className="space-y-2">
                        {latestEmail.analysis.actionItems.map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white border border-gray-200 p-2 rounded-md">
                                <div className="mt-0.5 w-4 h-4 rounded border border-gray-300 flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                     </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                AI Analysis not processed yet.
            </div>
          )}

          {/* Smart Reply Section */}
          <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-3 text-indigo-700">
              <Bot size={18} />
              <h3 className="font-semibold">Smart Reply</h3>
            </div>

            {!generatedReply ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                 <p className="text-sm text-gray-500 mb-4">Let AI draft a response based on the context of this conversation.</p>
                 <button 
                    onClick={handleGenerateReply}
                    disabled={isGenerating}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                 >
                    {isGenerating ? <Sparkles className="animate-spin" size={16} /> : <Sparkles size={16} />}
                    {isGenerating ? 'Drafting...' : 'Draft Reply'}
                 </button>
              </div>
            ) : (
              <div className="flex flex-col h-full animate-fade-in">
                <textarea 
                    className="flex-1 w-full text-sm text-gray-700 p-3 bg-gray-50 rounded-lg border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                    value={generatedReply}
                    onChange={(e) => setGeneratedReply(e.target.value)}
                />
                <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium">
                        <Send size={16} /> Send Now
                    </button>
                    <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg border border-gray-200" title="Copy">
                        <Copy size={16} />
                    </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default EmailDetail;