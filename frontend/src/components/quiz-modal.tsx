import React, { useState } from 'react';
import { X, Brain, CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
}

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

interface Quiz {
  id: string;
  topic: string | null;
  questions: Question[];
  score: number | null;
}

export function QuizModal({ isOpen, onClose, documentId }: QuizModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<'setup' | 'generating' | 'taking' | 'results'>('setup');
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('setup');
    setTopic('');
    setNumQuestions(5);
    setQuiz(null);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setScore(0);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const generateQuiz = async () => {
    setStep('generating');
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, topic, numQuestions }),
        credentials: 'include'
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to generate quiz');
      
      setQuiz(data.quiz);
      setStep('taking');
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'An error occurred while generating the quiz.');
      setStep('setup');
    }
  };

  const submitAnswer = () => {
    if (selectedOption === null || !quiz) return;
    
    setIsAnswerRevealed(true);
    
    if (selectedOption === quiz.questions[currentQuestionIndex].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const nextQuestion = async () => {
    if (!quiz) return;
    
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
    } else {
      // Quiz finished, save score
      setIsSubmitting(true);
      try {
        await fetch(`/api/quiz/${quiz.id}/submit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score }),
          credentials: 'include'
        });
      } catch (err) {
        console.error("Failed to save score:", err);
      }
      setIsSubmitting(false);
      setStep('results');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Document Quiz</h2>
              <p className="text-sm text-muted-foreground">Test your knowledge with AI</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Specific Topic (Optional)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Mitochondria, Legal definitions, etc."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
                <p className="text-xs text-muted-foreground">Leave blank to generate a quiz on general concepts from the document.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Number of Questions</label>
                <select 
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                >
                  <option value={3}>3 Questions (Quick Test)</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={10}>10 Questions (Deep Dive)</option>
                </select>
              </div>

              <button 
                onClick={generateQuiz}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg py-3 font-semibold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Brain className="w-4 h-4" /> Generate Quiz Now
              </button>
            </div>
          )}

          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                <Loader2 className="w-12 h-12 animate-spin text-purple-500 relative z-10" />
              </div>
              <h3 className="text-lg font-semibold animate-pulse">Generating your personalized quiz...</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Our AI is reading your document and crafting multiple-choice questions to test your understanding.
              </p>
            </div>
          )}

          {step === 'taking' && quiz && (
            <div className="space-y-6">
              <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
                <span>Score: {score}</span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: \`\${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%\` }}
                />
              </div>

              <h3 className="text-xl font-semibold leading-relaxed">
                {quiz.questions[currentQuestionIndex].question}
              </h3>

              <div className="space-y-3">
                {quiz.questions[currentQuestionIndex].options.map((option, idx) => {
                  let btnClass = "w-full text-left p-4 rounded-xl border transition-all ";
                  
                  if (!isAnswerRevealed) {
                    btnClass += selectedOption === idx 
                      ? "border-purple-500 bg-purple-500/10 shadow-sm" 
                      : "border-border bg-card hover:border-purple-500/50 hover:bg-muted";
                  } else {
                    if (idx === quiz.questions[currentQuestionIndex].correctAnswer) {
                      btnClass += "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
                    } else if (selectedOption === idx) {
                      btnClass += "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400";
                    } else {
                      btnClass += "border-border bg-card opacity-50";
                    }
                  }

                  return (
                    <button 
                      key={idx}
                      onClick={() => !isAnswerRevealed && setSelectedOption(idx)}
                      disabled={isAnswerRevealed}
                      className={btnClass}
                    >
                      <div className="flex items-center gap-3">
                        <div className={\`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold \${
                          isAnswerRevealed && idx === quiz.questions[currentQuestionIndex].correctAnswer 
                            ? 'border-green-500 bg-green-500 text-white' 
                            : (isAnswerRevealed && selectedOption === idx ? 'border-red-500 bg-red-500 text-white' : 'border-muted-foreground/30')
                        }\`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-1 font-medium">{option}</span>
                        {isAnswerRevealed && idx === quiz.questions[currentQuestionIndex].correctAnswer && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                        {isAnswerRevealed && selectedOption === idx && idx !== quiz.questions[currentQuestionIndex].correctAnswer && <XCircle className="w-5 h-5 text-red-500" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {isAnswerRevealed && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in slide-in-from-bottom-2 fade-in">
                  <h4 className="font-semibold text-primary mb-1 flex items-center gap-2">
                    <Brain className="w-4 h-4" /> AI Explanation
                  </h4>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {quiz.questions[currentQuestionIndex].explanation}
                  </p>
                </div>
              )}

              <div className="pt-4 flex justify-end">
                {!isAnswerRevealed ? (
                  <button 
                    onClick={submitAnswer}
                    disabled={selectedOption === null}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <button 
                    onClick={nextQuestion}
                    disabled={isSubmitting}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (currentQuestionIndex < quiz.questions.length - 1 ? 'Next Question' : 'See Results')}
                    {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'results' && quiz && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-primary flex items-center justify-center text-white shadow-xl shadow-purple-500/20">
                <span className="text-3xl font-bold">{score}/{quiz.questions.length}</span>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-2">Quiz Complete!</h3>
                <p className="text-muted-foreground max-w-sm">
                  {score === quiz.questions.length ? 'Perfect score! You truly mastered this content.' : 
                   score >= quiz.questions.length / 2 ? 'Good job! You have a solid understanding of the material.' : 
                   'Keep studying! You can always review the document and take another quiz.'}
                </p>
              </div>

              <div className="flex gap-4 w-full pt-4">
                <button 
                  onClick={resetState}
                  className="flex-1 border border-border bg-card hover:bg-muted py-3 rounded-lg font-semibold transition-colors"
                >
                  Take Another
                </button>
                <button 
                  onClick={() => {
                    handleClose();
                    router.push('/dashboard/quizzes');
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold shadow-md transition-colors"
                >
                  View History
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
