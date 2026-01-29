"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Job {
  id: number;
  title: string;
  description: string;
  employer_id: number;
  created_at: string;
  employer_email?: string;
  company_name?: string;
  employer_name?: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<{
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: string;
    match_reason?: string;
  } | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchJob();
    checkApplicationStatus();
    fetchAIAnalysis();
  }, [jobId]);

  const fetchAIAnalysis = async () => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");
    if (role !== "jobseeker") return;

    setLoadingAnalysis(true);
    try {
      // Önce kullanıcının CV'si var mı kontrol et
      const cvRes = await fetch(`${API_URL}/my-cvs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const cvData = await cvRes.json();

      if (cvData.cvs && cvData.cvs.length > 0) {
        // CV varsa, bu iş için eşleşme analizi al
        const matchRes = await fetch(`${API_URL}/matches?cv_id=${cvData.cvs[0].id}&top_k=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const matchData = await matchRes.json();

        // Bu işi bul
        const thisMatch = matchData.matches?.find((m: { job_id: number }) => m.job_id === parseInt(jobId as string));
        if (thisMatch) {
          setMatchScore(thisMatch.score);
          setAiAnalysis(thisMatch.ai_analysis);
        }
      }
    } catch (err) {
      console.error("AI analysis fetch failed:", err);
    }
    setLoadingAnalysis(false);
  };

  const checkApplicationStatus = async () => {
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}/application-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.applied) {
          setApplied(true);
          setApplicationStatus(data.status);
        }
      }
    } catch (err) {
      console.error("Application status check failed:", err);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchJob = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`${API_URL}/jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        if (res.status === 404) {
          router.push("/jobs");
          return;
        }
        throw new Error("Is ilani yuklenemedi");
      }

      const data = await res.json();
      setJob(data);
    } catch (err) {
      console.error("Error fetching job:", err);
      setToast({ message: "Is ilani yuklenirken hata olustu", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: parseInt(jobId as string) }),
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({ message: data.detail || "Basvuru yapilamadi", type: "error" });
        return;
      }

      setApplied(true);
      setApplicationStatus("pending");
      setToast({ message: "Basvurunuz basariyla gonderildi!", type: "success" });
    } catch (err) {
      setToast({ message: "Bir hata olustu", type: "error" });
    } finally {
      setApplying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Is Ilani Bulunamadi</h2>
          <Link href="/jobs" className="text-indigo-600 hover:text-indigo-700">
            Tum ilanlara don
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-up">
          <div className={`toast ${toast.type === "success" ? "toast-success" : "toast-error"}`}>
            <div className="flex items-center gap-3">
              {toast.type === "success" ? (
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={role === "employer" ? "/dashboard/employer" : "/dashboard"} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Matchify</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link href="/jobs" className="text-gray-600 hover:text-gray-900 transition">
                Is Ilanlari
              </Link>
              <Link
                href={role === "employer" ? "/dashboard/employer" : "/dashboard"}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-600 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cikis
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/jobs" className="text-gray-500 hover:text-indigo-600 transition">
                Is Ilanlari
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">{job.title}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <div className="card p-8">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shrink-0">
                  {job.title.charAt(0)}
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h1>
                  <div className="flex flex-wrap items-center gap-3">
                    {job.company_name && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {job.company_name}
                      </span>
                    )}
                    <span className="badge badge-green">Aktif</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-500 border-t border-gray-100 pt-6">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(job.created_at)}
                </div>
              </div>
            </div>

            {/* Job Description */}
            <div className="card p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Is Tanimi
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 whitespace-pre-line">{job.description}</p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* AI Compatibility Analysis */}
            {role === "jobseeker" && (
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      AI Uyumluluk Analizi
                    </h3>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">
                      GPT-4 + NLP
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  {loadingAnalysis ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="text-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-500">AI analiz yapıyor...</p>
                      </div>
                    </div>
                  ) : matchScore !== null ? (
                    <div className="space-y-4">
                      {/* Score */}
                      <div className="text-center">
                        <div className="relative w-24 h-24 mx-auto mb-2">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="#e5e7eb" strokeWidth="8" fill="none" />
                            <circle
                              cx="48" cy="48" r="40"
                              stroke={matchScore >= 60 ? "#10b981" : matchScore >= 40 ? "#f59e0b" : "#ef4444"}
                              strokeWidth="8"
                              fill="none"
                              strokeDasharray={`${(matchScore / 100) * 251.2} 251.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl font-bold text-gray-900">%{matchScore.toFixed(0)}</span>
                          </div>
                        </div>
                        <p className={`text-sm font-medium ${
                          matchScore >= 60 ? "text-green-600" :
                          matchScore >= 40 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {matchScore >= 70 ? "Çok Uygun" :
                           matchScore >= 50 ? "Uygun" :
                           matchScore >= 30 ? "Kısmen Uygun" : "Düşük Uyum"}
                        </p>
                      </div>

                      {/* AI Analysis Details */}
                      {aiAnalysis && (
                        <div className="space-y-3">
                          {aiAnalysis.match_reason && (
                            <div className="p-3 bg-indigo-50 rounded-lg">
                              <p className="text-xs font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                                AI Değerlendirmesi
                              </p>
                              <p className="text-xs text-indigo-700">{aiAnalysis.match_reason}</p>
                            </div>
                          )}

                          {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-green-900 mb-2 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Güçlü Yönlerin
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {aiAnalysis.strengths.slice(0, 4).map((s, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {aiAnalysis.weaknesses && aiAnalysis.weaknesses.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-amber-900 mb-2 flex items-center gap-1">
                                <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Geliştirilebilir
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {aiAnalysis.weaknesses.slice(0, 3).map((w, i) => (
                                  <span key={i} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {aiAnalysis.recommendation && (
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <p className="text-xs font-semibold text-purple-900 mb-1">AI Önerisi</p>
                              <p className="text-xs text-purple-700">{aiAnalysis.recommendation}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI Badge */}
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                          Sentence Transformers + GPT-4o-mini
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">CV Yükle</p>
                      <p className="text-xs text-gray-400">
                        AI uyumluluk analizi için önce CV yüklemeniz gerekiyor
                      </p>
                      <Link href="/dashboard" className="btn btn-secondary btn-sm mt-3">
                        CV Yükle
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Apply Card */}
            <div className="card p-6 sticky top-24">
              {role === "jobseeker" ? (
                <>
                  {applied ? (
                    <div className="text-center py-4">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                        applicationStatus === "accepted" ? "bg-green-100" :
                        applicationStatus === "rejected" ? "bg-red-100" :
                        applicationStatus === "reviewed" ? "bg-blue-100" : "bg-yellow-100"
                      }`}>
                        {applicationStatus === "accepted" ? (
                          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : applicationStatus === "rejected" ? (
                          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-900 mb-2">
                        {applicationStatus === "accepted" ? "Basvurunuz Kabul Edildi!" :
                         applicationStatus === "rejected" ? "Basvurunuz Reddedildi" :
                         applicationStatus === "reviewed" ? "Basvurunuz Inceleniyor" :
                         "Basvurunuz Alindi!"}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {applicationStatus === "accepted" ? "Tebrikler! Isveren sizinle iletisime gececektir." :
                         applicationStatus === "rejected" ? "Maalesef bu pozisyon icin uygun bulunmadiniz." :
                         applicationStatus === "reviewed" ? "Isveren basvurunuzu inceliyor." :
                         "Isveren basvurunuzu degerlendirmektedir."}
                      </p>
                    </div>
                  ) : (
                    <>
                      <h3 className="font-bold text-gray-900 mb-4">Bu Pozisyona Basvur</h3>
                      <p className="text-sm text-gray-500 mb-6">
                        CV&apos;niz otomatik olarak bu basvuruya eklenecektir.
                      </p>
                      <button
                        onClick={handleApply}
                        disabled={applying}
                        className="btn btn-primary w-full py-3"
                      >
                        {applying ? (
                          <div className="flex items-center gap-2">
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Gonderiliyor...
                          </div>
                        ) : (
                          <>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Hemen Basvur
                          </>
                        )}
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-4">Basvuru yapmak icin is arayan hesabi gereklidir.</p>
                  <Link href="/dashboard/employer" className="btn btn-secondary w-full">
                    Isveren Paneline Don
                  </Link>
                </div>
              )}
            </div>

            {/* Company Info */}
            {(job.company_name || job.employer_name) && (
              <div className="card p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Sirket Bilgileri
                </h3>
                {job.company_name && (
                  <p className="font-medium text-gray-900 mb-2">{job.company_name}</p>
                )}
                {job.employer_name && (
                  <p className="text-sm text-gray-500">Ilan sahibi: {job.employer_name}</p>
                )}
              </div>
            )}

            {/* Share */}
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-4">Bu Ilani Paylas</h3>
              <div className="flex gap-2">
                <button className="flex-1 btn btn-secondary py-2 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z"/>
                  </svg>
                  Facebook
                </button>
                <button className="flex-1 btn btn-secondary py-2 text-sm">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8">
          <Link href="/jobs" className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Tum Ilanlara Don
          </Link>
        </div>
      </main>
    </div>
  );
}
