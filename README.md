# Matchify - CV ile İş Eşleştirme Platformu

Yapay zekâ destekli CV-iş eşleştirme platformu. Sentence Transformers kullanarak semantik benzerlik hesaplaması yapar ve iş arayanları en uygun pozisyonlarla eşleştirir.

## Özellikler

- **AI Destekli Eşleştirme:** CV'leri iş ilanlarıyla semantik olarak eşleştirir
- **CV Analizi:** PDF, DOCX, TXT formatlarında CV yükleme ve otomatik analiz
- **Beceri Çıkarma:** NLP ile CV'den beceri, deneyim ve eğitim bilgisi çıkarma
- **Uyumluluk Skoru:** Her iş ilanı için yüzdelik uyumluluk skoru
- **Mesajlaşma:** İş arayanlar ve işverenler arası mesajlaşma sistemi
- **Başvuru Takibi:** Başvuru durumlarını yönetme

## Teknolojiler

### Backend
- FastAPI
- SQLite
- Sentence Transformers (paraphrase-multilingual-MiniLM-L12-v2)
- PyPDF2, python-docx
- JWT Authentication

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS

## Kurulum

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Kullanım

1. Backend: http://localhost:8000
2. Frontend: http://localhost:3000
3. API Docs: http://localhost:8000/docs

## Proje Yapısı

```
matchify/
├── backend/
│   ├── main.py          # FastAPI uygulaması
│   ├── requirements.txt # Python bağımlılıkları
│   └── matchify.db      # SQLite veritabanı
├── frontend/
│   ├── app/             # Next.js App Router
│   ├── components/      # React bileşenleri
│   └── package.json     # Node.js bağımlılıkları
└── README.md
```

## Geliştirici

**Okan Eren** - Mersin Üniversitesi Bilgisayar Mühendisliği

## Lisans

Bu proje eğitim amaçlı geliştirilmiştir.
