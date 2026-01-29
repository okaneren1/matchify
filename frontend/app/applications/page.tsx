"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Application {
  id: number;
  job_id: number;
  job_title: string;
  status: string;
  applied_at: string;
  cover_letter?: string;
  // Jobseeker fields
  job_description?: string;
  company_name?: string;
  employer_name?: string;
  // Employer fields
  user_id?: number;
  cv_id?: number;
  applicant_email?: string;
  applicant_name?: string;
  applicant_phone?: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userRole = localStorage.getItem("role");
    if (!token) {
      router.push("/login");
      return;
    }
    setRole(userRole);
    fetchApplications();
  }, [router]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchApplications = async () => {
    setLoading(true);
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`${API_URL}/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        throw new Error("Başvurular yuklenemedi");
      }

      const data = await res.json();
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Error fetching applications:", err);
      setToast({ message: "Başvurular yuklenirken hata olustu", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appId: number, newStatus: string) => {
    setUpdatingId(appId);
    const token = localStorage.getItem("access_token");

    try {
      const res = await fetch(`${API_URL}/applications/${appId}/status`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Durum guncellenemedi");
      }

      setToast({ message: "Başvuru durumu guncellendi", type: "success" });
      fetchApplications();
    } catch (err) {
      setToast({ message: "Bir hata olustu", type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="badge bg-yellow-100 text-yellow-700">Beklemede</span>;
      case "reviewed":
        return <span className="badge bg-blue-100 text-blue-700">Inceleniyor</span>;
      case "accepted":
        return <span className="badge badge-green">Kabul Edildi</span>;
      case "rejected":
        return <span className="badge bg-red-100 text-red-700">Reddedildi</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

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
              <Link
                href={role === "employer" ? "/dashboard/employer" : "/dashboard"}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                Dashboard
              </Link>
              <Link href="/profile" className="text-gray-600 hover:text-gray-900 transition">
                Profil
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {role === "employer" ? "Gelen Başvurular" : "Başvurularim"}
          </h1>
          <p className="text-gray-600">
            {role === "employer"
              ? "İlanlarına yapilan başvurulari yonet"
              : "Yaptigin başvurulari takip et"}
          </p>
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {role === "employer" ? "Henüz Başvuru Yok" : "Henüz Başvuru Yapmadınız"}
            </h3>
            <p className="text-gray-500 mb-6">
              {role === "employer"
                ? "İlanlarına henüz başvuru yapılmamış."
                : "Is ilanlarına göz atıp başvuru yapmaya başlayın."}
            </p>
            {role === "jobseeker" && (
              <Link href="/jobs" className="btn btn-primary">
                Is İlanlarına Göz At
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app, index) => (
              <div
                key={app.id}
                className={`card p-6 animate-slide-up stagger-${Math.min(index + 1, 5)}`}
                style={{ opacity: 0, animationFillMode: "forwards" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                        {app.job_title.charAt(0)}
                      </div>
                      <div>
                        <Link
                          href={`/jobs/${app.job_id}`}
                          className="font-bold text-lg text-gray-900 hover:text-indigo-600 transition"
                        >
                          {app.job_title}
                        </Link>
                        {role === "jobseeker" && app.company_name && (
                          <p className="text-sm text-gray-500">{app.company_name}</p>
                        )}
                        {role === "employer" && (
                          <p className="text-sm text-gray-500">
                            {app.applicant_name || app.applicant_email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(app.applied_at)}
                      </span>
                      {role === "employer" && app.applicant_phone && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {app.applicant_phone}
                        </span>
                      )}
                    </div>

                    {app.cover_letter && (
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{app.cover_letter}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {getStatusBadge(app.status)}

                    {role === "employer" && (
                      <div className="flex gap-2">
                        {app.status !== "accepted" && (
                          <button
                            onClick={() => updateStatus(app.id, "accepted")}
                            disabled={updatingId === app.id}
                            className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"
                            title="Kabul Et"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                        {app.status !== "rejected" && (
                          <button
                            onClick={() => updateStatus(app.id, "rejected")}
                            disabled={updatingId === app.id}
                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                            title="Reddet"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                        {app.status === "pending" && (
                          <button
                            onClick={() => updateStatus(app.id, "reviewed")}
                            disabled={updatingId === app.id}
                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                            title="Inceleniyor Olarak Isaretle"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
