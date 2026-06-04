"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileText, Settings, LogOut, MessageSquare, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ChatSession {
  id: string;
  documentId: string;
  title: string;
  messageCount: number;
  updatedAt: string;
  document: {
    title: string;
  };
}

export default function ChatHistoryPage() {
  const router = useRouter();
  const { data: session, isPending: isAuthPending } = authClient.useSession();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`}/api/chat`, {
        credentials: "include"
      })
        .then(res => res.json())
        .then(data => {
          if (data.sessions) {
            setSessions(data.sessions);
          }
        })
        .catch(err => console.error("Failed to fetch chat sessions", err))
        .finally(() => setLoading(false));
    }
  }, [session]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  if (isAuthPending) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex">
        <button onClick={() => window.location.reload()} className="h-16 flex items-center px-6 border-b border-border hover:bg-muted/50 transition-colors w-full text-left cursor-pointer">
          <div className="size-6 rounded bg-primary flex items-center justify-center mr-2 shrink-0">
            <span className="text-white font-bold text-xs">D</span>
          </div>
          <span className="font-bold text-lg tracking-tight truncate">DocExplorer</span>
        </button>
        
        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors">
            <FileText className="w-4 h-4" /> My Documents
          </Link>
          <Link href="/dashboard/chats" className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-md font-medium text-sm transition-colors text-left">
            <MessageSquare className="w-4 h-4" /> Chat History
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors text-left">
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 w-full hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors text-left">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur">
          <h1 className="font-semibold text-lg md:hidden">Chat History</h1>
          <div className="flex-1"></div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 text-white flex items-center justify-center text-sm font-medium shadow-md uppercase overflow-hidden">
              {session.user.image ? (
                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                session.user.name ? session.user.name.charAt(0) : (session.user.email ? session.user.email.charAt(0) : 'U')
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Chat History</h1>
              <p className="text-muted-foreground mt-1">Review your past conversations with your documents.</p>
            </div>
          </div>

          {/* Sessions List */}
          {loading ? (
             <div className="flex items-center justify-center h-48">
                 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
             </div>
          ) : sessions.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl bg-card/50">
                 <MessageSquare className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                 <p className="text-muted-foreground font-medium">No chat history yet</p>
                 <Link href="/dashboard" className="text-primary text-sm mt-2 font-medium hover:underline">Open a document to start chatting</Link>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessions.map((sess) => (
                <Link href={sess.documentId ? `/document/${sess.documentId}` : `/compare?sessionId=${sess.id}`} key={sess.id}>
                  <div className="group bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/50 group-hover:bg-primary transition-colors"></div>
                    
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 text-primary">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>

                    <h3 className="font-semibold text-foreground mb-1">
                      {sess.title || sess.document?.title || "Multiple Documents"}
                    </h3>
                    
                    <div className="mt-auto pt-4 flex justify-between items-center text-xs text-muted-foreground border-t border-border/50">
                      <span>{new Date(sess.updatedAt).toLocaleDateString()} at {new Date(sess.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
