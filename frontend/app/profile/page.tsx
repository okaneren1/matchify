"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

interface Profile {
  id: number;
  email: string;
  role: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  location: string | null;
  company_name: string | null;
  website: string | null;
  linkedin: string | null;
  skills: string | null;
  created_at: string;
}

interface Stats {
  role: string;
  total_jobs?: number;
  total_applications?: number;
  views?: number;
  total_cvs?: number;
  total_matches?: number;
  applications?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    bio: "",
    location: "",
    company_name: "",
    website: "",
    linkedin: "",
    skills: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchProfile(token);
    fetchStats(token);
  }, [router]);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("access_token");
          router.push("/login");
          return;
        }
        throw new Error("Profil yuklenemedi");
      }

      const data = await res.json();
      setProfile(data);
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        bio: data.bio || "",
        location: data.location || "",
        company_name: data.company_name || "",
        website: data.website || "",
        linkedin: data.linkedin || "",
        skills: data.skills || "",
      });
    } catch (err) {
      showToast("Profil yuklenirken hata olustu", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/user-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Stats yuklenemedi:", err);
    }
  };

  const handleSave = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Profil guncellenemedi");

      const token2 = localStorage.getItem("access_token");
      if (token2) await fetchProfile(token2);

      setEditing(false);
      showToast("Profil basariyla guncellendi!", "success");
    } catch (err) {
      showToast("Profil guncellenirken hata olustu", "error");
    } finally {
      setSaving(false);
    }
  };

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
            <Link href={profile?.role === "employer" ? "/dashboard/employer" : "/dashboard"} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Matchify</span>
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href={profile?.role === "employer" ? "/dashboard/employer" : "/dashboard"}
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="card p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full gradient-primary flex items-center justify-center text-white text-3xl font-bold">
                {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || "?"}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {profile?.full_name || "Isim belirtilmemis"}
                </h1>
                <p className="text-gray-500">{profile?.email}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`badge ${profile?.role === "employer" ? "badge-purple" : "badge-blue"}`}>
                    {profile?.role === "employer" ? "Isveren" : "Is Arayan"}
                  </span>
                  {profile?.location && (
                    <span className="flex items-center gap-1 text-gray-500 text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {profile.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setEditing(!editing)}
              className={`btn ${editing ? "btn-secondary" : "btn-primary"}`}
            >
              {editing ? "İptal" : "Profili Düzenle"}
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-100">
              {profile?.role === "employer" ? (
                <>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{stats.total_jobs || 0}</div>
                    <div className="text-sm text-gray-500">Aktif Ilan</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.total_applications || 0}</div>
                    <div className="text-sm text-gray-500">Başvuru</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.views || 0}</div>
                    <div className="text-sm text-gray-500">Goruntuleme</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600">{stats.total_cvs || 0}</div>
                    <div className="text-sm text-gray-500">Yüklenen CV</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.total_matches || 0}</div>
                    <div className="text-sm text-gray-500">Eşleşme</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">{stats.applications || 0}</div>
                    <div className="text-sm text-gray-500">Başvuru</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Edit Form or Profile Info */}
        {editing ? (
          <div className="card p-8 animate-scale-in">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Profil Bilgilerini Düzenle</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="input"
                  placeholder="Adiniz Soyadiniz"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input"
                  placeholder="+90 5XX XXX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Konum</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input"
                  placeholder="Istanbul, Turkiye"
                />
              </div>

              {profile?.role === "employer" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sirket Adi</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="input"
                    placeholder="Sirketinizin Adi"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="input"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LinkedIn</label>
                <input
                  type="url"
                  value={formData.linkedin}
                  onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                  className="input"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>

              {profile?.role === "jobseeker" && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Yetenekler</label>
                  <input
                    type="text"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    className="input"
                    placeholder="Python, JavaScript, React, Node.js (virgul ile ayirin)"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Hakkimda</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="input min-h-[120px] resize-none"
                  placeholder="Kendinizi kisaca tanitmak ister misiniz?"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
              <button onClick={() => setEditing(false)} className="btn btn-secondary">
                İptal
              </button>
              <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                {saving ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Kaydediliyor...
                  </div>
                ) : (
                  "Kaydet"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Bio */}
            {profile?.bio && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Hakkimda
                </h3>
                <p className="text-gray-600">{profile.bio}</p>
              </div>
            )}

            {/* Contact Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Iletisim Bilgileri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-gray-600">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                  {profile?.email}
                </div>

                {profile?.phone && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {profile.phone}
                  </div>
                )}

                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-indigo-600 hover:text-indigo-700 transition"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    Website
                  </a>
                )}

                {profile?.linkedin && (
                  <a
                    href={profile.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-indigo-600 hover:text-indigo-700 transition"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                    LinkedIn
                  </a>
                )}
              </div>
            </div>

            {/* Skills (Jobseeker only) */}
            {profile?.role === "jobseeker" && profile?.skills && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Yetenekler
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.split(",").map((skill, index) => (
                    <span key={index} className="badge badge-blue">
                      {skill.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Company Info (Employer only) */}
            {profile?.role === "employer" && profile?.company_name && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Sirket Bilgileri
                </h3>
                <p className="text-gray-600 font-medium">{profile.company_name}</p>
              </div>
            )}

            {/* Account Info */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Hesap Bilgileri
              </h3>
              <p className="text-gray-600">
                Hesap olusturulma tarihi:{" "}
                <span className="font-medium">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("tr-TR") : "Bilinmiyor"}
                </span>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
