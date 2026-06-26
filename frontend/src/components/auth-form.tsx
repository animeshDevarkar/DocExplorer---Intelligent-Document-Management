"use client";

import { useState, useEffect } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Prefetch dashboard in the background so it loads instantly after login
    router.prefetch("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const { data, error: signInError } = await signIn.email({
            email,
            password,
        });
        if (signInError) throw new Error(signInError.message || "Invalid credentials.");
        
        // Fire-and-forget backend warmup
        fetch('/api/ping').catch(() => {});
        
        router.refresh();
        router.push("/dashboard");
      } else {
        const { data, error: signUpError } = await signUp.email({
            email,
            password,
            name,
        });
        if (signUpError) throw new Error(signUpError.message || "Failed to create account.");
        
        // Fire-and-forget backend warmup
        fetch('/api/ping').catch(() => {});
        
        router.refresh();
        router.push("/dashboard");
      }
    } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred during authentication.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 bg-card text-card-foreground">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold">{isLogin ? "Welcome back" : "Create an account"}</h2>
        <p className="text-gray-500 mt-2">
          {isLogin ? "Enter your credentials to continue" : "Sign up to start exploring documents"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                {error}
            </div>
        )}

        {!isLogin && (
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              required={!isLogin}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 bg-primary text-white rounded-md hover:bg-primary/90 font-medium transition-colors disabled:opacity-50"
        >
          {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-gray-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
        </span>{" "}
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="font-medium hover:underline text-primary"
        >
          {isLogin ? "Sign up" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
