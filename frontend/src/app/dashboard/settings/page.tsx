"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { FileText, Settings as SettingsIcon, LogOut, MessageSquare, Loader2, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setMessage(null);
    try {
      const { error } = await authClient.updateUser({ name });
      if (error) {
        setMessage({ text: error.message || "Failed to update profile", type: "error" });
      } else {
        setMessage({ text: "Profile updated successfully!", type: "success" });
      }
    } catch (err: any) {
      setMessage({ text: err.message || "An unexpected error occurred", type: "error" });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isPending) {
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
          <Link href="/dashboard/chats" className="flex items-center gap-3 px-3 py-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md font-medium text-sm transition-colors text-left">
            <MessageSquare className="w-4 h-4" /> Chat History
          </Link>
          <button className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-md font-medium text-sm text-left">
            <SettingsIcon className="w-4 h-4" /> Settings
          </button>
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
        <header className="h-16 border-b border-border flex items-center justify-end px-6 bg-card/50 backdrop-blur">
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

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto p-8 max-w-2xl mx-auto w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your profile and preferences.</p>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex items-center gap-6">
                
                <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload')?.click()}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-purple-500 text-white flex items-center justify-center text-3xl font-bold shadow-md uppercase overflow-hidden border-4 border-background">
                     {session.user.image ? (
                        <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                        session.user.name ? session.user.name.charAt(0) : (session.user.email ? session.user.email.charAt(0) : 'U')
                     )}
                  </div>
                  <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                    Upload
                  </div>
                  <input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setIsUpdating(true);
                      const formData = new FormData();
                      formData.append("file", file);
                      
                      try {
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`}/api/users/avatar`, {
                          method: "POST",
                          body: formData,
                          credentials: "include"
                        });
                        const data = await res.json();
                        if (data.avatarUrl) {
                          // Update better-auth session with new image URL
                          await authClient.updateUser({ image: data.avatarUrl });
                          window.location.reload(); // Quick refresh to update all instances
                        }
                      } catch (err) {
                        console.error("Avatar upload failed:", err);
                      } finally {
                        setIsUpdating(false);
                      }
                    }}
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-xl">{session.user.name || "User"}</h3>
                  <p className="text-muted-foreground">{session.user.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Display Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none text-muted-foreground">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={session.user.email}
                    disabled
                    className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Email address cannot be changed.
                  </p>
                </div>

                {message && (
                  <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'error' ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-green-500/10 text-green-600 border border-green-500/20 dark:text-green-400'}`}>
                    {message.text}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                  >
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
