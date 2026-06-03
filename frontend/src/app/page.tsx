import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="font-bold text-xl tracking-tight">DocExplorer AI</span>
          </div>
          
          <nav className="flex items-center gap-4">
            <button className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </button>
            <button className="text-sm font-medium hover:text-primary transition-colors">
              Pricing
            </button>
            <ThemeToggle />
            <Link href="/login">
              <button className="text-sm font-medium bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                Get Started
              </button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm text-primary mb-8">
          <span className="flex size-2 rounded-full bg-primary mr-2 animate-pulse"></span>
          DocExplorer v1.0 is now live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-foreground to-foreground/70 dark:from-white dark:to-gray-400">
          Chat with your documents in seconds
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mb-10 leading-relaxed">
          Upload any PDF and instantly get answers, summaries, and insights. 
          Powered by state-of-the-art vector search and LLMs.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/login">
            <button className="h-12 px-8 rounded-md bg-primary text-white font-medium text-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              Start Exploring for Free
            </button>
          </Link>
          <button className="h-12 px-8 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 font-medium text-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            View Live Demo
          </button>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 DocExplorer AI. All rights reserved.</p>
      </footer>
    </div>
  );
}
