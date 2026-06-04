"use client";

import { useState, useRef, useEffect, use } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Send, FileText, ArrowLeft, Loader2, Bot, User } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function DocumentChatPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const documentId = unwrappedParams.id;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState("English");
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  // Fetch document details
  useEffect(() => {
    fetch(`http://localhost:3001/api/documents/${documentId}`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.document?.cloudinaryUrl) {
          setDocumentUrl(data.document.cloudinaryUrl);
        }
      })
      .catch(err => console.error("Failed to fetch document:", err));
  }, [documentId]);

  // Fetch chat history
  useEffect(() => {
    setIsHistoryLoading(true);
    fetch(`http://localhost:3001/api/chat/${documentId}`, {
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.messages && data.messages.length > 0) {
          const history = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content
          }));
          setMessages(history);
        } else {
          setMessages([{ id: "intro", role: "assistant", content: "Hi! I'm ready to answer any questions about this document." }]);
        }
      })
      .catch(err => {
        console.error("Failed to fetch history:", err);
        setMessages([{ id: "intro", role: "assistant", content: "Hi! I'm ready to answer any questions about this document." }]);
      })
      .finally(() => setIsHistoryLoading(false));
  }, [documentId]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, documentId, language }),
        credentials: "include"
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch response");

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

  return (
    <div className="flex h-screen flex-col bg-background">
      
      {/* Header */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="font-semibold truncate max-w-[300px]">Document Analysis</h1>
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

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* PDF Viewer (Left Side) */}
        <div className="hidden lg:flex flex-1 border-r border-border bg-muted/30 p-0 items-center justify-center flex-col relative overflow-hidden">
          {documentUrl ? (
            <iframe 
              src={documentUrl} 
              className="w-full h-full border-none bg-white"
              title="PDF Viewer"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full">
              <FileText className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
              <p className="mb-2 text-muted-foreground">Loading PDF...</p>
            </div>
          )}
        </div>

        {/* Chat Interface (Right Side) */}
        <div className="flex-1 lg:w-[500px] lg:max-w-[600px] flex flex-col bg-background relative">
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isHistoryLoading ? (
              <div className="flex-1 h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground opacity-50" />
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-muted border border-border text-foreground rounded-tl-sm'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
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
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                      <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 bg-background border-t border-border">
            <form onSubmit={handleSend} className="relative flex items-end gap-2 bg-muted/50 border border-border rounded-xl p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e);
                  }
                }}
                placeholder="Ask a question about this document..."
                className="w-full max-h-32 min-h-[40px] bg-transparent resize-none border-none outline-none py-2 pl-2 text-sm"
                rows={1}
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 shrink-0 bg-primary text-primary-foreground rounded-lg flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <p className="text-center text-[11px] text-muted-foreground mt-2">
              DocExplorer AI can make mistakes. Check important info against the PDF.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}
