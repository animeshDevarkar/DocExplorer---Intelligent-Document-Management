"use client";

import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Brain, FileText, ArrowLeft, Loader2, Calendar } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface QuizHistory {
  id: string;
  topic: string | null;
  score: number | null;
  questions: any[];
  createdAt: string;
  document: {
    title: string;
  };
}

export default function QuizHistoryPage() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/quiz', { credentials: 'include' })
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (data.quizzes) {
          setQuizzes(data.quizzes);
        } else {
          setError(data.error || 'Failed to fetch quizzes');
        }
      })
      .catch(err => {
        if (err.message !== 'Unauthorized') {
          setError('Network error');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      
      {/* Top Navbar */}
      <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2 border-l border-border pl-4">
            <Brain className="w-5 h-5 text-purple-500" />
            <h1 className="font-semibold">Quiz History</h1>
          </div>
        </div>
        
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Your Quizzes</h1>
          <p className="text-muted-foreground">Review your past quiz scores and topics.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-6 text-center">
            {error}
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-2xl bg-card">
            <Brain className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-xl font-bold mb-2">No quizzes yet</h3>
            <p className="text-muted-foreground mb-4">Go to a document to generate your first quiz!</p>
            <Link 
              href="/dashboard"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
            >
              Go to Documents
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quizzes.map(quiz => {
              const scoreColor = quiz.score !== null 
                ? (quiz.score === quiz.questions.length ? 'text-green-500' 
                   : (quiz.score >= quiz.questions.length / 2 ? 'text-yellow-500' : 'text-red-500'))
                : 'text-muted-foreground';
              
              return (
                <div key={quiz.id} className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-purple-500/30 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0 pr-4">
                      <h3 className="font-bold text-lg truncate" title={quiz.topic || 'General Quiz'}>
                        {quiz.topic || 'General Quiz'}
                      </h3>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1 truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{quiz.document.title}</span>
                      </div>
                    </div>
                    <div className={`w-14 h-14 rounded-full bg-muted flex items-center justify-center shrink-0 border border-border ${quiz.score !== null ? 'group-hover:border-purple-500/50' : ''} transition-colors`}>
                      <span className={`font-bold text-lg ${scoreColor}`}>
                        {quiz.score !== null ? `${quiz.score}/${quiz.questions.length}` : '-'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-6 pt-4 border-t border-border">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(quiz.createdAt).toLocaleDateString(undefined, { 
                      year: 'numeric', month: 'short', day: 'numeric', 
                      hour: '2-digit', minute: '2-digit' 
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
