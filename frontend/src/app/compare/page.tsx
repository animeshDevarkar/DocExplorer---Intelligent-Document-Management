"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Send, ArrowLeft, Loader2, Bot, User, Layers } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function CompareChat() {
  const searchParams = useSearchParams();
  const docsParam = searchParams.get("docs");
  const documentIds = docsParam ? docsParam.split(",") : [];
  const initialSessionId = searchParams.get("sessionId");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(!!initialSessionId);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial auto-comparison or history fetch
  useEffect(() => {
    if (initialSessionId) {
      // Fetch chat history
      const fetchHistory = async () => {
        try {
          const res = await fetch(`/api/chat/${initialSessionId}`, {
            credentials: "include"
          });
          if (res.ok) {
            const data = await res.json();
            if (data.messages) {
              setMessages(data.messages);
            }
          }
        } catch (err) {
          console.error("Failed to fetch history", err);
        } finally {
          setIsHistoryLoading(false);
        }
      };
      fetchHistory();
    } else if (documentIds.length > 0 && messages.length === 0 && !isLoading && !sessionId) {
      const generateInitialComparison = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message: "Please provide a comprehensive summary and comparison of these documents, highlighting their key similarities and differences. Format it nicely.", 
              documentIds,
              language 
            }),
            credentials: "include"
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to fetch response");

          if (data.sessionId) setSessionId(data.sessionId);

          setMessages([{ 
            id: Date.now().toString(), 
            role: "assistant", 
            content: data.answer 
          }]);
        } catch (error) {
          setMessages([{ 
            id: Date.now().toString(), 
            role: "assistant", 
            content: "Sorry, I encountered an error while trying to generate the initial comparison: " + (error instanceof Error ? error.message : "Unknown error") 
          }]);
        } finally {
          setIsLoading(false);
        }
      };

      generateInitialComparison();
    }
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput("");
    
    // Add optimistic user message
    const tempId = Date.now().toString();
    setMessages(prev => [...prev, { id: tempId, role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg, 
          documentIds,
          sessionId,
          language 
        }),
        credentials: "include"
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: data.answer 
      }]);
      
    } catch (error) {
      setMessages(prev => [...prev, { 
        id: (Date.now() + 1).toString(), 
        role: "assistant", 
        content: "Sorry, I encountered an error: " + (error instanceof Error ? error.message : "Unknown error") 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!initialSessionId && documentIds.length < 2) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground">
        <Layers className="w-16 h-16 text-muted-foreground opacity-50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Not enough documents selected</h1>
        <p className="text-muted-foreground mb-6">Please select at least 2 documents to compare.</p>
        <Link href="/dashboard" className="bg-primary text-primary-foreground px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <Layers className="w-5 h-5 text-purple-500" />
            <h1 className="font-semibold truncate max-w-[300px]">Comparing {documentIds.length} Documents</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-background text-foreground text-sm border border-border rounded-md px-3 py-1.5 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors shadow-sm"
          >
            <option value="English" className="bg-background text-foreground">🇬🇧 English</option>
            <option value="Spanish" className="bg-background text-foreground">🇪🇸 Spanish</option>
            <option value="French" className="bg-background text-foreground">🇫🇷 French</option>
            <option value="German" className="bg-background text-foreground">🇩🇪 German</option>
            <option value="Chinese" className="bg-background text-foreground">🇨🇳 Chinese</option>
            <option value="Hindi" className="bg-background text-foreground">🇮🇳 Hindi</option>
          </select>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Layout - Centered Chat */}
      <div className="flex-1 flex overflow-hidden justify-center bg-muted/20">
        
        {/* Chat Interface (Center) */}
        <div className="flex-1 max-w-4xl w-full flex flex-col bg-background border-x border-border shadow-sm">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isHistoryLoading ? (
              <div className="flex-1 h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                        <Bot className="w-4 h-4 text-purple-500" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-card border border-border text-foreground rounded-tl-sm'
                    }`}>
                      <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20">
                      <Bot className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-purple-500/50 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                      <span className="w-2 h-2 rounded-full bg-purple-500/50 animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-background border-t border-border">
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-muted/30 border border-border rounded-2xl p-2 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/50 transition-all shadow-sm max-w-3xl mx-auto w-full">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask a question across all selected documents..."
                className="w-full max-h-32 min-h-[44px] bg-transparent resize-none border-none outline-none py-2.5 pl-3 text-[15px]"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="h-11 w-11 shrink-0 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-center text-[11px] text-muted-foreground mt-3">
              DocExplorer AI analyzes chunks from all selected documents simultaneously.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>}>
      <CompareChat />
    </Suspense>
  );
}
