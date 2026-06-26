"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadModal } from "@/components/upload-modal";
import { FileText, Search, Plus, Settings, LogOut, MessageSquare, Loader2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { data: session } = authClient.useSession();
  
  const filteredDocuments = documents.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (doc.summary && doc.summary.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const fetchDocuments = async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    try {
      const res = await fetch(`/api/documents`, {
        credentials: "include",
        signal: controller.signal
      });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
        setErrorMsg(null);
      } else if (res.status === 401) {
         router.push("/login");
      } else {
         setErrorMsg(`Server returned error: ${res.status} ${res.statusText}`);
      }
    } catch (err: any) {
      console.error("Failed to fetch documents", err);
      if (err.name === 'AbortError') {
          setErrorMsg("Request timed out after 15 seconds. The server might be asleep or unreachable.");
      } else {
          setErrorMsg(err.message || "Network error occurred.");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Poll for updates if any document is processing
  useEffect(() => {
    const isProcessing = documents.some((doc) => doc.status === 'processing');
    if (isProcessing) {
      const interval = setInterval(() => {
        fetchDocuments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [documents]);

  const handleSignOut = async () => {
      await authClient.signOut();
      router.push("/login");
  };

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
          <button className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-md font-medium text-sm">
            <FileText className="w-4 h-4" /> My Documents
          </button>
          <button 
            onClick={() => {
              setCompareMode(!compareMode);
              setSelectedDocs([]);
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-md font-medium text-sm transition-colors ${
              compareMode 
                ? 'bg-purple-500/20 text-purple-500 border border-purple-500/30' 
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-4 h-4" /> Compare Mode
          </button>
          <Link href="/dashboard/chats" className="flex items-center gap-3 px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors">
            <MessageSquare className="w-4 h-4" /> Chat History
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </Link>
        </div>

        <div className="p-4 border-t border-border">
          <button onClick={handleSignOut} className="flex items-center gap-3 px-3 py-2 w-full hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navbar */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur">
          <div className="flex items-center bg-muted px-3 py-1.5 rounded-md w-96 border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/50 transition-all">
            <Search className="w-4 h-4 text-muted-foreground mr-2" />
            <input 
              type="text" 
              placeholder="Search documents..." 
              className="bg-transparent border-none outline-none w-full text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 text-white flex items-center justify-center text-sm font-medium shadow-md uppercase overflow-hidden">
              {session?.user?.image ? (
                <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                session?.user?.name ? session.user.name.charAt(0) : (session?.user?.email ? session.user.email.charAt(0) : 'U')
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Documents</h1>
              <p className="text-muted-foreground mt-1">Manage and chat with your uploaded PDFs</p>
            </div>
            <button 
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-medium shadow-sm hover:bg-primary/90 transition-all"
            >
              <Plus className="w-4 h-4" /> Upload PDF
            </button>
          </div>

          {/* Document Grid */}
          {loading ? (
             <div className="flex items-center justify-center h-48">
                 <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
             </div>
          ) : errorMsg ? (
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-red-500/50 bg-red-500/10 rounded-xl p-6 text-center">
                 <p className="text-red-500 font-bold mb-2">Connection Error</p>
                 <p className="text-muted-foreground text-sm max-w-md">{errorMsg}</p>
                 <button onClick={() => { setLoading(true); fetchDocuments(); }} className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md text-sm font-medium hover:bg-red-600 transition-colors">Retry Connection</button>
             </div>
          ) : documents.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl">
                 <FileText className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                 <p className="text-muted-foreground font-medium">No documents yet</p>
                 <button onClick={() => setIsUploadOpen(true)} className="text-primary text-sm mt-2 font-medium hover:underline">Upload your first PDF</button>
             </div>
          ) : filteredDocuments.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-border rounded-xl">
                 <Search className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                 <p className="text-muted-foreground font-medium">No matching documents found</p>
                 <button onClick={() => setSearchQuery("")} className="text-primary text-sm mt-2 font-medium hover:underline">Clear search</button>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative">
              {filteredDocuments.map((doc) => {
                const isSelected = selectedDocs.includes(doc.id);
                
                return (
                <div key={doc.id} className="relative group perspective-1000">
                  <div 
                    onClick={(e) => {
                      if (compareMode) {
                        e.preventDefault();
                        if (isSelected) {
                          setSelectedDocs(prev => prev.filter(id => id !== doc.id));
                        } else {
                          if (selectedDocs.length >= 4) {
                            alert("You can only compare up to 4 documents at a time.");
                            return;
                          }
                          setSelectedDocs(prev => [...prev, doc.id]);
                        }
                      } else {
                        router.push(`/document/${doc.id}`);
                      }
                    }}
                    className="block h-full cursor-pointer"
                  >
                    <div className={`relative bg-card/60 backdrop-blur-md border rounded-2xl p-5 transition-all duration-300 flex flex-col h-full overflow-hidden ${
                      compareMode && isSelected
                        ? 'border-purple-500 ring-2 ring-purple-500/50 shadow-[0_8px_30px_rgba(168,85,247,0.2)] scale-[1.02]'
                        : 'border-border/60 hover:border-primary/40 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group-hover:-translate-y-1'
                    }`}>
                      
                      {/* Checkbox overlay for compare mode */}
                      {compareMode && (
                        <div className={`absolute top-4 left-4 w-6 h-6 rounded-full border-2 z-30 flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-purple-500 border-purple-500' : 'border-muted-foreground/50 bg-background/50 backdrop-blur-sm'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                        </div>
                      )}
                      
                      {/* Subtle background glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                      {/* Thumbnail Container */}
                      <div className="relative h-40 bg-gradient-to-br from-muted/50 to-muted rounded-xl mb-5 flex items-center justify-center border border-border/30 overflow-hidden group-hover:scale-[1.02] transition-transform duration-300">
                        {/* Decorative background shapes */}
                        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors duration-500" />
                        <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-colors duration-500" />
                        
                        <div className="relative z-10 w-16 h-16 rounded-2xl bg-background/80 shadow-sm backdrop-blur-sm border border-white/10 flex items-center justify-center group-hover:rotate-[-5deg] group-hover:scale-110 transition-all duration-300">
                          <FileText className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        </div>
                      </div>

                      {/* Document Details */}
                      <div className="relative z-10 flex flex-col flex-1">
                        <h3 className="font-semibold text-foreground truncate text-base mb-1 group-hover:text-primary transition-colors">
                          {doc.title}
                        </h3>
                        
                        {doc.status === 'processing' ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-4">
                            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                            <span className="text-xs font-medium text-primary animate-pulse">Processing AI...</span>
                          </div>
                        ) : doc.status === 'error' ? (
                          <div className="flex-1 flex flex-col items-center justify-center py-4">
                            <span className="text-xs font-medium text-destructive">AI Processing Failed</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium uppercase tracking-wider">
                                PDF
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {(doc.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                              </span>
                            </div>
                            
                            <div className="mt-auto flex justify-between items-center text-xs text-muted-foreground border-t border-border/40 pt-3">
                              <span>{new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              <span className="font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 duration-300">
                                {compareMode ? (isSelected ? 'Selected' : 'Select to Compare') : 'Chat with Document \u2192'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Delete Button (Floats above everything) */}
                  <button 
                    onClick={async (e) => {
                      e.preventDefault();
                      if (confirm("Are you sure you want to delete this document?")) {
                        try {
                          const res = await fetch(`/api/documents/${doc.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                          });
                          if (res.ok) {
                            fetchDocuments();
                          }
                        } catch (err) {
                          console.error("Failed to delete document", err);
                        }
                      }
                    }}
                    className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-md hover:bg-destructive hover:text-destructive-foreground text-muted-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm z-20 border border-border/50 hover:border-destructive hover:scale-110"
                    title="Delete Document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Compare Action Bar */}
        {compareMode && selectedDocs.length > 1 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-full shadow-2xl px-6 py-3 flex items-center gap-6 animate-in slide-in-from-bottom-8 fade-in z-50">
            <span className="text-sm font-medium">
              <span className="text-purple-500 font-bold">{selectedDocs.length}</span> documents selected
            </span>
            <button 
              onClick={() => router.push(`/compare?docs=${selectedDocs.join(',')}`)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Start Comparison <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        )}
      </main>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        onUploadComplete={fetchDocuments}
      />
    </div>
  );
}
