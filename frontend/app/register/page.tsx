"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"jobseeker" | "employer">("jobseeker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Kayıt başarısız");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("Sunucu hatası! Backend çalıştığından emin ol.");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen gradient-mesh flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-3xl font-bold text-white">Matchify</span>
        </Link>

        {/* Card */}
        <div className="card p-8 animate-scale-in">
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6 animate-scale-in">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Kayıt Başarılı!</h2>
              <p className="text-gray-500 mb-4">Hesabın oluşturuldu. Giriş sayfasına yönlendiriliyorsun...</p>
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Hesap Oluştur</h1>
                <p className="text-gray-500">Ücretsiz kayıt ol ve kariyerine başla</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-posta Adresi
                  </label>
                  <input
                    type="email"
                    value={email}
                    placeholder="ornek@email.com"
                    className="input"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Şifre
                  </label>
                  <input
                    type="password"
                    value={password}
                    placeholder="En az 6 karakter"
                    className="input"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Hesap Türü
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("jobseeker")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        role === "jobseeker"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        role === "jobseeker" ? "bg-indigo-100" : "bg-gray-100"
                      }`}>
                        <svg className={`w-6 h-6 ${role === "jobseeker" ? "text-indigo-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className={`font-semibold ${role === "jobseeker" ? "text-indigo-700" : "text-gray-700"}`}>
                        İş Arayan
                      </div>
                      <div className="text-xs text-gray-500 mt-1">CV yükle, iş bul</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole("employer")}
                      className={`p-4 rounded-xl border-2 text-center transition-all ${
                        role === "employer"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        role === "employer" ? "bg-indigo-100" : "bg-gray-100"
                      }`}>
                        <svg className={`w-6 h-6 ${role === "employer" ? "text-indigo-600" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className={`font-semibold ${role === "employer" ? "text-indigo-700" : "text-gray-700"}`}>
                        İşveren
                      </div>
                      <div className="text-xs text-gray-500 mt-1">İlan ver, aday bul</div>
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-red-700 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full py-4 text-base"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Kayıt yapılıyor...
                    </div>
                  ) : (
                    "Ücretsiz Kayıt Ol"
                  )}
                </button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-gray-500">
                  Zaten hesabın var mı?{" "}
                  <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 transition">
                    Giriş Yap
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
