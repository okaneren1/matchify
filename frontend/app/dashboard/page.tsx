"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type CV = {
  id: number;
  filename: string;
  uploaded_at: string;
  preview: string;
};

type Match = {
  job_id: number;
  title: string;
  description: string;
  score: number;
  ai_analysis?: {
    match_score?: number;
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: string;
    match_reason?: string;
  };
};

type AIAnalysis = {
  skills?: string[];
  experience_years?: number;
  education?: string;
  summary?: string;
  error?: string;
};

export default function Dashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [cvs, setCvs] = useState<CV[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<AIAnalysis | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.push("/login");
      return;
    }
    if (role === "employer") {
      router.push("/dashboard/employer");
      return;
    }

    loadCVs();
    setLoading(false);
  }, [router]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return { Authorization: `Bearer ${token}` };
  };

  const loadCVs = async () => {
    try {
      const res = await fetch(`${API_URL}/my-cvs`, { headers: getAuthHeaders() });
      const data = await res.json();
      setCvs(data.cvs || []);
      if (data.cvs?.length > 0 && !selectedCvId) {
        setSelectedCvId(data.cvs[0].id);
        loadMatches(data.cvs[0].id);
      }
    } catch (err) {
      console.error("CV listesi alınamadı:", err);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Lutfen bir dosya sec.");
      return;
    }

    setUploading(true);
    setError("");
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "CV yükleme başarısız");
        setUploading(false);
        return;
      }

      setUploadResult(data.ai_analysis);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setToast({ message: "CV basariyla yüklendi!", type: "success" });
      loadCVs();
      await loadMatches(data.cv_id);
      setSelectedCvId(data.cv_id);
    } catch (err) {
      setError("Sunucu hatasi!");
    }

    setUploading(false);
  };

  const loadMatches = async (cvId?: number, loadAll: boolean = false) => {
    setMatchLoading(true);
    try {
      const topK = loadAll ? 100 : 5;
      const url = cvId
        ? `${API_URL}/matches?cv_id=${cvId}&top_k=${topK}`
        : `${API_URL}/matches?top_k=${topK}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      const data = await res.json();
      setMatches(data.matches || []);
      setShowAllMatches(loadAll);
    } catch (err) {
      console.error("Eslesmeler alınamadı:", err);
    }
    setMatchLoading(false);
  };

  const handleShowMore = () => {
    loadMatches(selectedCvId || undefined, true);
  };

  const handleCvSelect = (cvId: number) => {
    setSelectedCvId(cvId);
    loadMatches(cvId);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const getScoreColor = (score: number) => {
    if (score >= 60) return "score-high";
    if (score >= 40) return "score-medium";
    return "score-low";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return { text: "Cok Uygun", color: "text-green-600 bg-green-50" };
    if (score >= 50) return { text: "Uygun", color: "text-blue-600 bg-blue-50" };
    if (score >= 30) return { text: "Kismen Uygun", color: "text-yellow-600 bg-yellow-50" };
    return { text: "Dusuk Uyum", color: "text-red-600 bg-red-50" };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
          <div className="flex items-center gap-2">
            {toast.type === "success" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {toast.message}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Matchify</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="badge badge-primary">İş Arayan</span>
              <Link href="/jobs" className="btn btn-ghost text-sm">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                İş Ara
              </Link>
              <Link href="/applications" className="btn btn-ghost text-sm">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Başvurular
              </Link>
              <Link href="/messages" className="btn btn-ghost text-sm">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Mesajlar
              </Link>
              <Link href="/profile" className="btn btn-ghost text-sm">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profil
              </Link>
              <button onClick={handleLogout} className="btn btn-ghost text-sm">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Hoş Geldin!</h1>
          <p className="text-gray-600">CV'ni yükle ve sana en uygun is ilanlarini keşfet.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - CV Upload & List */}
          <div className="lg:col-span-1 space-y-6">
            {/* Upload Card */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                CV Yükle
              </h2>

              <div
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                  dragActive
                    ? "border-indigo-500 bg-indigo-50"
                    : selectedFile
                    ? "border-green-500 bg-green-50"
                    : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />

                {selectedFile ? (
                  <div className="animate-scale-in">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <p className="text-gray-600 mb-1">Dosyayi sürükle veya tıkla</p>
                    <p className="text-xs text-gray-400">PDF, DOCX, TXT (max 5MB)</p>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="btn btn-primary w-full mt-4"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Analiz Ediliyor...
                  </div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Yükle ve Analiz Et
                  </>
                )}
              </button>

              {/* AI Analysis Result - Enhanced */}
              {uploadResult && !uploadResult.error && (
                <div className="mt-4 rounded-xl animate-slide-up overflow-hidden border-2 border-indigo-200">
                  {/* Header with AI Badge */}
                  <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                        </div>
                        Yapay Zeka Analizi
                      </h3>
                      <span className="px-2 py-1 bg-white/20 rounded-full text-xs text-white font-medium">
                        GPT-4 + NLP
                      </span>
                    </div>
                    <p className="text-white/80 text-xs mt-2">CV'niz yapay zeka tarafından analiz edildi</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 space-y-4">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-3">
                      {uploadResult.experience_years !== undefined && (
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-gray-900">{uploadResult.experience_years}+ Yıl</p>
                              <p className="text-xs text-gray-500">Deneyim</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {uploadResult.education && (
                        <div className="bg-white rounded-lg p-3 shadow-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 truncate">{uploadResult.education}</p>
                              <p className="text-xs text-gray-500">Eğitim</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {uploadResult.skills && uploadResult.skills.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          AI Tarafından Tespit Edilen Beceriler ({uploadResult.skills.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {uploadResult.skills.map((skill, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 bg-white rounded-full text-xs font-medium text-indigo-700 shadow-sm border border-indigo-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {uploadResult.summary && (
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                          <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          AI Özeti
                        </p>
                        <p className="text-sm text-gray-600">{uploadResult.summary}</p>
                      </div>
                    )}

                    {/* AI Model Info */}
                    <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-indigo-100">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Sentence Transformers + GPT-4o-mini
                      </span>
                      <span>Semantic Analysis</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* CV List */}
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CV'lerim
                <span className="ml-auto badge badge-primary">{cvs.length}</span>
              </h2>

              {cvs.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm">Henüz CV yüklemedin</p>
                  <p className="text-gray-400 text-xs mt-1">Yukaridan CV yükleyerek basla</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cvs.map((cv) => (
                    <button
                      key={cv.id}
                      onClick={() => handleCvSelect(cv.id)}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        selectedCvId === cv.id
                          ? "bg-indigo-50 border-2 border-indigo-500"
                          : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedCvId === cv.id ? "bg-indigo-100" : "bg-white"
                        }`}>
                          <svg className={`w-5 h-5 ${selectedCvId === cv.id ? "text-indigo-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${selectedCvId === cv.id ? "text-indigo-900" : "text-gray-900"}`}>
                            {cv.filename}
                          </p>
                          <p className="text-xs text-gray-500">{cv.uploaded_at}</p>
                        </div>
                        {selectedCvId === cv.id && (
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Matches */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    {showAllMatches ? `Tüm İş İlanları (${matches.length})` : `En Uygun ${matches.length} İş İlanı`}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">CV'ne göre AI tarafından sıralandı</p>
                </div>
                <button
                  onClick={() => loadMatches(selectedCvId || undefined)}
                  disabled={matchLoading}
                  className="btn btn-ghost text-sm"
                >
                  {matchLoading ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  )}
                </button>
              </div>

              {cvs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">CV Yükle ve Eşleşmeleri Gor</h3>
                  <p className="text-gray-500 max-w-sm mx-auto">
                    CV'ni yükle, yapay zeka analiz etsin ve sana en uygun is ilanlarini göstersin.
                  </p>
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Is İlanı Yok</h3>
                  <p className="text-gray-500">Sistemde is ilanı bulunmuyor. Yeni ilanlar eklendikçe burada görünecek.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match, index) => {
                    const scoreLabel = getScoreLabel(match.score);
                    return (
                      <div
                        key={match.job_id}
                        className={`rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all animate-slide-up stagger-${Math.min(index + 1, 5)} overflow-hidden`}
                        style={{ opacity: 0, animationFillMode: "forwards" }}
                      >
                        {/* AI Badge Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 flex items-center justify-between">
                          <span className="text-white text-xs font-medium flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Eşleştirme
                          </span>
                          <span className="text-white/80 text-xs">Semantic Analysis</span>
                        </div>

                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{match.title}</h3>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <div className="text-2xl font-bold text-gray-900">%{match.score.toFixed(0)}</div>
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${scoreLabel.color}`}>
                                {scoreLabel.text}
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="progress-bar mb-4">
                            <div
                              className={`progress-bar-fill ${getScoreColor(match.score)}`}
                              style={{ width: `${Math.min(match.score, 100)}%` }}
                            />
                          </div>

                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {match.description}
                          </p>

                          {/* AI Analysis - Enhanced */}
                          {match.ai_analysis && !match.ai_analysis.error && (
                            <div className="space-y-3 mb-4">
                              {/* Match Reason */}
                              {match.ai_analysis.match_reason && (
                                <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    <div>
                                      <p className="text-xs font-semibold text-indigo-900 mb-1">AI Neden Bu İşi Önerdi?</p>
                                      <p className="text-xs text-indigo-700">{match.ai_analysis.match_reason}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Strengths */}
                              {match.ai_analysis.strengths && match.ai_analysis.strengths.length > 0 && (
                                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-xs font-semibold text-green-900">Güçlü Yönlerin</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {match.ai_analysis.strengths.slice(0, 4).map((s, i) => (
                                      <span key={i} className="text-xs px-2 py-1 bg-white text-green-700 rounded-full border border-green-200">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Weaknesses / Missing Skills */}
                              {match.ai_analysis.weaknesses && match.ai_analysis.weaknesses.length > 0 && (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-xs font-semibold text-amber-900">Geliştirilebilir Alanlar</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {match.ai_analysis.weaknesses.slice(0, 3).map((w, i) => (
                                      <span key={i} className="text-xs px-2 py-1 bg-white text-amber-700 rounded-full border border-amber-200">
                                        {w}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Recommendation */}
                              {match.ai_analysis.recommendation && (
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                                  <div className="flex items-start gap-2">
                                    <svg className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                      <p className="text-xs font-semibold text-purple-900 mb-1">AI Önerisi</p>
                                      <p className="text-xs text-purple-700">{match.ai_analysis.recommendation}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                              Sentence Transformers
                            </span>
                            <Link href={`/jobs/${match.job_id}`} className="btn btn-primary text-sm">
                              Detayları Gör
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Daha Fazla Göster Butonu */}
                  {!showAllMatches && matches.length >= 5 && (
                    <button
                      onClick={handleShowMore}
                      disabled={matchLoading}
                      className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                      {matchLoading ? (
                        <>
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Yükleniyor...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Tüm İş İlanlarını Göster
                        </>
                      )}
                    </button>
                  )}

                  {showAllMatches && (
                    <button
                      onClick={() => loadMatches(selectedCvId || undefined, false)}
                      className="w-full mt-4 py-3 text-gray-500 hover:text-indigo-600 transition flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                      Sadece En Uygun 5'ini Göster
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
