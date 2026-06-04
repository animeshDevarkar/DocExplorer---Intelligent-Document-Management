"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileType, X, Loader2, CheckCircle2 } from "lucide-react";

export function UploadModal({ isOpen, onClose, onUploadComplete }: { isOpen: boolean, onClose: () => void, onUploadComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.type !== "application/pdf") {
        setError("Only PDF files are allowed.");
        setFile(null);
      } else if (selected.size > 50 * 1024 * 1024) {
        setError("File must be less than 50MB.");
        setFile(null);
      } else {
        setError(null);
        setFile(selected);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // In a real implementation we need to pass the Better-Auth session cookie/token
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`}/api/documents/upload`, {
        method: "POST",
        body: formData,
        credentials: "include" // ensure cookies are sent
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload document");
      }

      setSuccess(true);
      setTimeout(() => {
        onUploadComplete?.();
        reset();
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setError(null);
    setSuccess(false);
    setUploading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl overflow-hidden border border-border">
        
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <button onClick={reset} className="p-1 rounded-md hover:bg-muted" disabled={uploading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
            {success ? (
                <div className="flex flex-col items-center justify-center py-12 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="w-16 h-16 mb-4" />
                    <p className="text-xl font-medium">Upload Successful!</p>
                    <p className="text-sm opacity-80 mt-2">Your document is ready for AI analysis.</p>
                </div>
            ) : (
                <>
                    <div 
                        className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'}`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="application/pdf"
                            onChange={handleFileChange}
                        />
                        
                        {file ? (
                            <>
                                <FileType className="w-12 h-12 text-primary mb-3" />
                                <p className="font-medium text-foreground">{file.name}</p>
                                <p className="text-sm text-muted-foreground mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                            </>
                        ) : (
                            <>
                                <UploadCloud className="w-12 h-12 text-muted-foreground mb-3" />
                                <p className="font-medium text-foreground">Click or drag PDF to upload</p>
                                <p className="text-sm text-muted-foreground mt-1">Maximum file size 50MB</p>
                            </>
                        )}
                    </div>

                    {error && (
                        <p className="text-red-500 text-sm mt-3 font-medium">{error}</p>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button 
                            onClick={reset}
                            className="px-4 py-2 text-sm font-medium rounded-md border border-input bg-background hover:bg-muted"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center"
                        >
                            {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            {uploading ? 'Uploading...' : 'Upload File'}
                        </button>
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}
