"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsVisible(true);
    // Check if user is logged in
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token) {
      setIsLoggedIn(true);
      setUserRole(role);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user_id");
    setIsLoggedIn(false);
    setUserRole(null);
  };

  const getDashboardLink = () => {
    return userRole === "employer" ? "/dashboard/employer" : "/dashboard";
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="gradient-mesh min-h-screen relative overflow-hidden">
        {/* Floating Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-float" />
          <div className="absolute top-40 right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
          <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "2s" }} />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href={isLoggedIn ? getDashboardLink() : "/"} className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-2xl font-bold text-white">Matchify</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/jobs" className="text-white/80 hover:text-white transition font-medium">
                Is Ilanlari
              </Link>
              {isLoggedIn ? (
                <>
                  <Link href={getDashboardLink()} className="text-white/80 hover:text-white transition font-medium">
                    Dashboard
                  </Link>
                  <Link href="/profile" className="text-white/80 hover:text-white transition font-medium">
                    Profil
                  </Link>
                  <button onClick={handleLogout} className="btn btn-primary bg-white/20 border-white/30 hover:bg-white/30">
                    Cikis Yap
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-white/80 hover:text-white transition font-medium">
                    Giris Yap
                  </Link>
                  <Link href="/register" className="btn btn-primary">
                    Ucretsiz Basla
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 pt-20 pb-32">
          <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-8">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Yapay Zeka Destekli Kariyer Platformu
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
              Hayalindeki Isi
              <span className="block bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Yapay Zeka ile Bul
              </span>
            </h1>

            <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto leading-relaxed">
              CV'ni yukle, yapay zeka becerilerini analiz etsin ve sana en uygun is ilanlarini saniyeler icinde eslestirsin.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="btn btn-primary text-lg px-8 py-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Hemen Basla - Ucretsiz
              </Link>
              <Link href="#features" className="btn btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
                Nasil Calisir?
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-20 max-w-2xl mx-auto">
              {[
                { value: "10K+", label: "Aktif Kullanici" },
                { value: "%95", label: "Eslestirme Basarisi" },
                { value: "500+", label: "Sirket" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/60 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f9fafb"/>
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Nasil Calisir?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Uc basit adimda hayalindeki ise bir adim daha yakin ol
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                ),
                title: "CV'ni Yukle",
                description: "PDF, Word veya metin formatinda CV'ni yukle. Sistem otomatik olarak icerigini okur.",
                color: "from-blue-500 to-cyan-500",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                ),
                title: "AI Analiz Etsin",
                description: "Yapay zeka CV'ni analiz eder, becerilerini ve deneyimini cikarir.",
                color: "from-purple-500 to-pink-500",
              },
              {
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                ),
                title: "Eslesmeleri Gor",
                description: "Sana en uygun is ilanlarini yuzdelik uyumluluk skoruyla gor.",
                color: "from-green-500 to-emerald-500",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="card p-8 text-center group hover:scale-105 transition-transform duration-300"
              >
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <div className="text-sm font-bold text-indigo-600 mb-2">ADIM {i + 1}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Matchify Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Neden Matchify?
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                Geleneksel is arama yontemlerinden farkli olarak, Matchify yapay zeka kullanarak CV'ni derinlemesine analiz eder ve sana gercekten uygun isleri bulur.
              </p>

              <div className="space-y-6">
                {[
                  {
                    title: "Akilli Eslestirme",
                    description: "Makine ogrenmesi ile CV ve is ilani arasindaki uyumu hesaplar",
                  },
                  {
                    title: "Zaman Tasarrufu",
                    description: "Yuzlerce ilani taramak yerine, en uygun 10 ilani aninda gor",
                  },
                  {
                    title: "Detayli Analiz",
                    description: "Her eslesme icin guclu yonlerini ve gelistirmen gereken alanlari ogren",
                  },
                  {
                    title: "Surekli Guncelleme",
                    description: "Yeni ilanlar eklendikce otomatik olarak eslesmelerin guncellenir",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-1">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-3xl transform rotate-3" />
              <div className="relative bg-white rounded-3xl shadow-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500" />
                  <div>
                    <div className="font-semibold text-gray-900">Ornek CV Analizi</div>
                    <div className="text-sm text-gray-500">Frontend Developer</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Frontend Developer</span>
                      <span className="font-semibold text-green-600">%85 Uyumlu</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill score-high" style={{ width: "85%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Full Stack Developer</span>
                      <span className="font-semibold text-green-600">%72 Uyumlu</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill score-high" style={{ width: "72%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Backend Developer</span>
                      <span className="font-semibold text-yellow-600">%58 Uyumlu</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill score-medium" style={{ width: "58%" }} />
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                  <div className="text-sm font-medium text-indigo-900 mb-2">AI Onerisi</div>
                  <p className="text-sm text-indigo-700">
                    React ve TypeScript deneyiminiz guclu. Frontend Developer pozisyonlarina basvurmanizi oneriyoruz.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 gradient-mesh relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Kariyerinde Yeni Bir Sayfa Ac
            </h2>
            <p className="text-xl text-white/70 mb-10">
              Binlerce kullanici Matchify ile hayallerindeki isi buldu. Simdi sira sende!
            </p>
            <Link href="/register" className="btn btn-primary text-lg px-10 py-4 bg-white text-indigo-600 hover:bg-gray-100">
              Ucretsiz Kayit Ol
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold">Matchify</span>
            </div>
            <p className="text-gray-400 text-sm">
              2024 Matchify. Tum haklari saklidir.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
