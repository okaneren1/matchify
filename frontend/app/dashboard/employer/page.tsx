"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Job = {
  id: number;
  title: string;
  description: string;
  created_at: string;
  application_count: number;
};

type Applicant = {
  email: string;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  skills: string | null;
  linkedin: string | null;
};

type Application = {
  id: number;
  user_id: number;
  status: string;
  applied_at: string;
  cover_letter: string | null;
  applicant: Applicant;
  cv_filename: string | null;
  cv_preview: string | null;
};

export default function EmployerDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [editing, setEditing] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Applications modal
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Applicant detail modal
  const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("role");

    if (!token) {
      router.push("/login");
      return;
    }
    if (role !== "employer") {
      router.push("/dashboard");
      return;
    }

    loadJobs();
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
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const loadJobs = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/my-jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error("İlanlar alınamadı:", err);
    }
  };

  const loadApplications = async (job: Job) => {
    setSelectedJob(job);
    setLoadingApps(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/my-jobs/${job.id}/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Başvurular alınamadı:", err);
    }
    setLoadingApps(false);
  };

  const updateApplicationStatus = async (appId: number, status: string) => {
    setUpdatingId(appId);
    try {
      const res = await fetch(`${API_URL}/applications/${appId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setToast({ message: "Başvuru durumu güncellendi", type: "success" });
        if (selectedJob) loadApplications(selectedJob);
        loadJobs();
      }
    } catch (err) {
      setToast({ message: "Bir hata oluştu", type: "error" });
    }
    setUpdatingId(null);
  };

  const addJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !desc.trim()) {
      setError("Başlık ve açıklama zorunlu");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/jobs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title, description: desc }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.detail || "İlan eklenemedi");
        setSaving(false);
        return;
      }

      setTitle("");
      setDesc("");
      setToast({ message: "İlan başarıyla eklendi!", type: "success" });
      loadJobs();
    } catch (err) {
      setError("Sunucu hatası!");
    }

    setSaving(false);
  };

  const deleteJob = async (id: number) => {
    if (!confirm("Bu ilanı silmek istediğinize emin misiniz?")) return;

    try {
      const token = localStorage.getItem("access_token");
      await fetch(`${API_URL}/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setToast({ message: "İlan silindi", type: "success" });
      loadJobs();
    } catch (err) {
      console.error("İlan silinemedi:", err);
    }
  };

  const startEdit = (job: Job) => {
    setEditing(job);
    setEditTitle(job.title);
    setEditDesc(job.description);
  };

  const saveEdit = async () => {
    if (!editing) return;

    try {
      await fetch(`${API_URL}/jobs/${editing.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editTitle,
          description: editDesc,
        }),
      });

      setEditing(null);
      setToast({ message: "İlan güncellendi!", type: "success" });
      loadJobs();
    } catch (err) {
      console.error("İlan güncellenemedi:", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="badge bg-yellow-100 text-yellow-700">Beklemede</span>;
      case "reviewed":
        return <span className="badge bg-blue-100 text-blue-700">İnceleniyor</span>;
      case "accepted":
        return <span className="badge badge-green">Kabul Edildi</span>;
      case "rejected":
        return <span className="badge bg-red-100 text-red-700">Reddedildi</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  const totalApplications = jobs.reduce((sum, job) => sum + job.application_count, 0);

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
            <Link href="/dashboard/employer" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Matchify</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="badge badge-success">İşveren</span>
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
          <h1 className="text-2xl font-bold text-gray-900 mb-2">İşveren Paneli</h1>
          <p className="text-gray-600">İş ilanları oluştur ve başvuruları yönet.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
                <p className="text-sm text-gray-500">Aktif İlan</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalApplications}</p>
                <p className="text-sm text-gray-500">Toplam Başvuru</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <Link href="/messages" className="text-2xl font-bold text-gray-900 hover:text-indigo-600">
                  Mesajlar
                </Link>
                <p className="text-sm text-gray-500">Adaylarla iletişim</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Add Job */}
          <div className="lg:col-span-1">
            <div className="card p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Yeni İlan Ekle
              </h2>

              <form onSubmit={addJob} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pozisyon Başlığı
                  </label>
                  <input
                    type="text"
                    placeholder="örn: Frontend Developer"
                    className="input"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    İlan Açıklaması
                  </label>
                  <textarea
                    placeholder="Aranan nitelikler, iş tanımı, sorumluluklar..."
                    className="input min-h-32 resize-none"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <button type="submit" disabled={saving} className="btn btn-primary w-full">
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Ekleniyor...
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      İlan Yayınla
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column - Job List */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  İlanlarım
                  <span className="ml-2 badge badge-primary">{jobs.length}</span>
                </h2>
              </div>

              {jobs.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz İlan Yok</h3>
                  <p className="text-gray-500">Soldaki formu kullanarak ilk ilanını oluştur.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job, index) => (
                    <div
                      key={job.id}
                      className={`p-5 rounded-xl border-2 border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all animate-slide-up stagger-${Math.min(index + 1, 5)}`}
                      style={{ opacity: 0, animationFillMode: "forwards" }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{job.title}</h3>
                              <div className="flex items-center gap-2">
                                <span className="badge badge-success text-xs">Aktif</span>
                                {job.application_count > 0 && (
                                  <span className="badge bg-indigo-100 text-indigo-700 text-xs">
                                    {job.application_count} başvuru
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2">{job.description}</p>
                        </div>

                        <div className="flex gap-2">
                          {job.application_count > 0 && (
                            <button
                              onClick={() => loadApplications(job)}
                              className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition"
                              title="Başvuruları Gör"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(job)}
                            className="p-2 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 transition"
                            title="Düzenle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="Sil"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="card p-6 w-full max-w-md animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">İlanı Düzenle</h2>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pozisyon Başlığı</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İlan Açıklaması</label>
                <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="input min-h-32 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={saveEdit} className="btn btn-primary flex-1">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Kaydet
                </button>
                <button onClick={() => setEditing(null)} className="btn btn-secondary flex-1">Vazgeç</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applications Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="card p-6 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedJob.title}</h2>
                <p className="text-sm text-gray-500">{applications.length} başvuru</p>
              </div>
              <button onClick={() => setSelectedJob(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loadingApps ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">Henüz başvuru yok</div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 border rounded-xl hover:border-indigo-200 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {(app.applicant.full_name || app.applicant.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {app.applicant.full_name || app.applicant.email}
                            </h3>
                            <p className="text-sm text-gray-500">{app.applicant.email}</p>
                            {app.applicant.phone && (
                              <p className="text-sm text-gray-500">{app.applicant.phone}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(app.status)}
                          <button
                            onClick={() => setSelectedApplicant(app)}
                            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                          >
                            Detayları Gör
                          </button>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex gap-2 border-t pt-4">
                        {app.status !== "accepted" && (
                          <button
                            onClick={() => updateApplicationStatus(app.id, "accepted")}
                            disabled={updatingId === app.id}
                            className="btn btn-sm bg-green-50 text-green-600 hover:bg-green-100"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Kabul Et
                          </button>
                        )}
                        {app.status !== "rejected" && (
                          <button
                            onClick={() => updateApplicationStatus(app.id, "rejected")}
                            disabled={updatingId === app.id}
                            className="btn btn-sm bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reddet
                          </button>
                        )}
                        <Link
                          href={`/messages?user=${app.user_id}&app=${app.id}`}
                          className="btn btn-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 ml-auto"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Mesaj Gönder
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Applicant Detail Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[60] p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Aday Bilgileri</h2>
              <button onClick={() => setSelectedApplicant(null)} className="p-2 rounded-lg hover:bg-gray-100 transition">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl">
                  {(selectedApplicant.applicant.full_name || selectedApplicant.applicant.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedApplicant.applicant.full_name || "İsim belirtilmemiş"}
                  </h3>
                  {getStatusBadge(selectedApplicant.status)}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">İletişim Bilgileri</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-gray-600">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <a href={`mailto:${selectedApplicant.applicant.email}`} className="text-indigo-600 hover:underline">
                      {selectedApplicant.applicant.email}
                    </a>
                  </div>
                  {selectedApplicant.applicant.phone && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${selectedApplicant.applicant.phone}`} className="text-indigo-600 hover:underline">
                        {selectedApplicant.applicant.phone}
                      </a>
                    </div>
                  )}
                  {selectedApplicant.applicant.location && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {selectedApplicant.applicant.location}
                    </div>
                  )}
                  {selectedApplicant.applicant.linkedin && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                      </svg>
                      <a href={selectedApplicant.applicant.linkedin} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                        LinkedIn Profili
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills */}
              {selectedApplicant.applicant.skills && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Yetenekler</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedApplicant.applicant.skills.split(",").map((skill, i) => (
                      <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                        {skill.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              {selectedApplicant.cover_letter && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Ön Yazı</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg">{selectedApplicant.cover_letter}</p>
                </div>
              )}

              {/* CV Preview */}
              {selectedApplicant.cv_preview && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">CV Önizleme</h4>
                  <p className="text-gray-600 bg-gray-50 p-4 rounded-lg text-sm whitespace-pre-wrap">
                    {selectedApplicant.cv_preview}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Link
                  href={`/messages?user=${selectedApplicant.user_id}&app=${selectedApplicant.id}`}
                  className="btn btn-primary flex-1"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Mesaj Gönder
                </Link>
                <button onClick={() => setSelectedApplicant(null)} className="btn btn-secondary flex-1">
                  Kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
