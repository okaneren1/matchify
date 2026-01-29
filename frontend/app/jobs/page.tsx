"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Job {
  id: number;
  title: string;
  description: string;
  employer_id: number;
  created_at: string;
}

export default function JobsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchJobs();
  }, [currentPage]);

  const fetchJobs = async (search?: string) => {
    setLoading(true);
    const token = localStorage.getItem("access_token");

    try {
      const query = search !== undefined ? search : searchQuery;
      const url = new URL(`${API_URL}/jobs`);
      url.searchParams.set("page", currentPage.toString());
      url.searchParams.set("limit", "10");
      if (query) url.searchParams.set("search", query);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        throw new Error("Is ilanlari yuklenemedi");
      }

      const data = await res.json();
      setJobs(data.jobs || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error("Error fetching jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs(searchQuery);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Bugun";
    if (days === 1) return "Dun";
    if (days < 7) return `${days} gun once`;
    if (days < 30) return `${Math.floor(days / 7)} hafta once`;
    return date.toLocaleDateString("tr-TR");
  };

  const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;

  return (
    <div className="min-h-screen bg-gray-50">
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

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">İş İlanları</h1>
          <p className="text-gray-600">Tum açık pozisyonları keşfet ve kariyerine yön ver</p>
        </div>

        {/* Search Section */}
        <div className="card p-6 mb-8">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Is ara... (pozisyon, yetenek, anahtar kelime)"
                className="input pl-12"
              />
            </div>
            <button type="submit" className="btn btn-primary px-8">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Ara
            </button>
          </form>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-600">
            {searchQuery ? (
              <>
                <span className="font-medium">&ldquo;{searchQuery}&rdquo;</span> icin{" "}
              </>
            ) : null}
            <span className="font-semibold text-gray-900">{total}</span> iş ilanı bulundu
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setCurrentPage(1);
                fetchJobs("");
              }}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              Filtreleri Temizle
            </button>
          )}
        </div>

        {/* Job List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">İş İlanı Bulunamadi</h3>
            <p className="text-gray-500">
              {searchQuery
                ? "Aramanızla eşleşen iş ilanı bulunamadi. Farkli bir kelime deneyin."
                : "Henüz iş ilanı eklenmemiş."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job, index) => (
              <Link
                href={`/jobs/${job.id}`}
                key={job.id}
                className={`card p-6 block hover:shadow-lg hover:border-indigo-200 transition-all animate-slide-up stagger-${Math.min(index + 1, 5)}`}
                style={{ opacity: 0, animationFillMode: "forwards" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                        {job.title.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-gray-900 hover:text-indigo-600 transition">
                          {job.title}
                        </h3>
                        <span className="text-sm text-gray-500">{formatDate(job.created_at)}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 line-clamp-2">{job.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="badge badge-green">Aktif</span>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary px-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn btn-secondary px-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
