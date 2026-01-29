"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

type Conversation = {
  other_user_id: number;
  other_user_name: string;
  other_user_email: string;
  other_user_role: string;
  company_name: string | null;
  application_id: number | null;
  job_title: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

type Message = {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender_name: string;
  receiver_name: string;
  content: string;
  is_read: number;
  created_at: string;
  is_mine: boolean;
};

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const userRole = localStorage.getItem("role");

    if (!token) {
      router.push("/login");
      return;
    }

    setRole(userRole);
    loadConversations();
    setLoading(false);

    // URL'den user parametresi varsa o sohbeti aç
    const userId = searchParams.get("user");
    if (userId) {
      // Kullanıcı bilgisini al ve sohbeti başlat
      startNewConversation(parseInt(userId));
    }
  }, [router, searchParams]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem("access_token");
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  };

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error("Sohbetler alınamadı:", err);
    }
  };

  const startNewConversation = async (userId: number) => {
    // Önce mevcut sohbetlerde var mı kontrol et
    const existing = conversations.find((c) => c.other_user_id === userId);
    if (existing) {
      selectConversation(existing);
      return;
    }

    // Yoksa yeni bir sohbet objesi oluştur
    const newConv: Conversation = {
      other_user_id: userId,
      other_user_name: "Kullanıcı",
      other_user_email: "",
      other_user_role: "",
      company_name: null,
      application_id: null,
      job_title: null,
      last_message: "",
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    setSelectedConversation(newConv);
    setMessages([]);
  };

  const selectConversation = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setLoadingMessages(true);

    try {
      const token = localStorage.getItem("access_token");
      const url = conv.application_id
        ? `${API_URL}/messages/${conv.other_user_id}?application_id=${conv.application_id}`
        : `${API_URL}/messages/${conv.other_user_id}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setMessages(data.messages || []);

      // Okunmamış mesaj sayısını sıfırla
      setConversations((prev) =>
        prev.map((c) =>
          c.other_user_id === conv.other_user_id ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error("Mesajlar alınamadı:", err);
    }

    setLoadingMessages(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);

    try {
      const res = await fetch(`${API_URL}/messages`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          receiver_id: selectedConversation.other_user_id,
          content: newMessage.trim(),
          application_id: selectedConversation.application_id,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        // Mesajları yeniden yükle
        selectConversation(selectedConversation);
        // Sohbetleri güncelle
        loadConversations();
      }
    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
    }

    setSending(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
    }
    if (days === 1) {
      return "Dün";
    }
    if (days < 7) {
      return `${days} gün önce`;
    }
    return date.toLocaleDateString("tr-TR");
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("role");
    router.push("/login");
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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href={role === "employer" ? "/dashboard/employer" : "/dashboard"} className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">Matchify</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className={`badge ${role === "employer" ? "badge-success" : "badge-primary"}`}>
                {role === "employer" ? "İşveren" : "İş Arayan"}
              </span>
              <Link
                href={role === "employer" ? "/dashboard/employer" : "/dashboard"}
                className="btn btn-ghost text-sm"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Mesajlar</h1>
          <p className="text-gray-600">Adaylar ve işverenlerle iletişim kur</p>
        </div>

        <div className="card overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Sohbetler</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-sm">Henüz sohbet yok</p>
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={`${conv.other_user_id}-${conv.application_id}`}
                      onClick={() => selectConversation(conv)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition border-b border-gray-100 ${
                        selectedConversation?.other_user_id === conv.other_user_id &&
                        selectedConversation?.application_id === conv.application_id
                          ? "bg-indigo-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {conv.other_user_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {conv.other_user_name}
                            </h3>
                            {conv.unread_count > 0 && (
                              <span className="bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">
                                {conv.unread_count}
                              </span>
                            )}
                          </div>
                          {conv.job_title && (
                            <p className="text-xs text-indigo-600 truncate">{conv.job_title}</p>
                          )}
                          <p className="text-sm text-gray-500 truncate">{conv.last_message}</p>
                          <p className="text-xs text-gray-400">{formatTime(conv.last_message_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {selectedConversation.other_user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConversation.other_user_name}
                      </h3>
                      {selectedConversation.job_title && (
                        <p className="text-sm text-gray-500">{selectedConversation.job_title}</p>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <p>Henüz mesaj yok</p>
                          <p className="text-sm">İlk mesajı gönder!</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.is_mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                                msg.is_mine
                                  ? "bg-indigo-600 text-white rounded-br-md"
                                  : "bg-gray-100 text-gray-900 rounded-bl-md"
                              }`}
                            >
                              <p>{msg.content}</p>
                              <p
                                className={`text-xs mt-1 ${
                                  msg.is_mine ? "text-indigo-200" : "text-gray-400"
                                }`}
                              >
                                {formatTime(msg.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesajınızı yazın..."
                        className="input flex-1"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="btn btn-primary px-6"
                      >
                        {sending ? (
                          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">Sohbet Seç</h3>
                    <p>Mesajlaşmak için soldaki listeden bir sohbet seç</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
