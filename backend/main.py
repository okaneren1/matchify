from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from PyPDF2 import PdfReader
import docx as docx_lib
import io
import sqlite3
from sentence_transformers import SentenceTransformer
import numpy as np
import bcrypt
from typing import Optional
import os
from dotenv import load_dotenv
from openai import OpenAI
import json
from contextlib import contextmanager

# ---- JWT imports ----
from jose import JWTError, jwt
from datetime import datetime, timedelta

# ---- Load Environment Variables ----
load_dotenv()

# ---- JWT Config ----
SECRET_KEY = os.getenv("SECRET_KEY", "supersecretmatchifykey123")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

# Database path
DB_PATH = os.path.join(os.path.dirname(__file__), "matchify.db")


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


# OAuth2 Token Reader
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Gecersiz veya suresi dolmus token",
        )


app = FastAPI(title="Matchify API")

# ---- CORS ayari ----
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- SQLite baglantisi ----
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Veritabani tablolarini olusturur"""
    with get_db() as conn:
        cursor = conn.cursor()

        # Users tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('employer', 'jobseeker')),
                full_name TEXT,
                phone TEXT,
                bio TEXT,
                location TEXT,
                company_name TEXT,
                website TEXT,
                linkedin TEXT,
                skills TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Mevcut users tablosuna yeni kolonlar ekle (migration)
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN full_name TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN phone TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN bio TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN location TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN company_name TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN website TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN linkedin TEXT")
        except: pass
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN skills TEXT")
        except: pass

        # CVs tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS cvs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                filename TEXT NOT NULL,
                text_content TEXT NOT NULL,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        # Jobs tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employer_id INTEGER,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (employer_id) REFERENCES users(id)
            )
        """)

        # Match history tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS match_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                cv_id INTEGER NOT NULL,
                job_id INTEGER NOT NULL,
                score REAL NOT NULL,
                matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (cv_id) REFERENCES cvs(id),
                FOREIGN KEY (job_id) REFERENCES jobs(id),
                UNIQUE(user_id, cv_id, job_id)
            )
        """)

        # Applications tablosu
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                cv_id INTEGER,
                cover_letter TEXT,
                status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'reviewed', 'accepted', 'rejected')),
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (cv_id) REFERENCES cvs(id),
                UNIQUE(job_id, user_id)
            )
        """)

        # Messages tablosu (mesajlaşma sistemi)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                application_id INTEGER,
                content TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id),
                FOREIGN KEY (application_id) REFERENCES applications(id)
            )
        """)

        # Conversations tablosu (sohbet listesi için)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user1_id INTEGER NOT NULL,
                user2_id INTEGER NOT NULL,
                application_id INTEGER,
                last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user1_id) REFERENCES users(id),
                FOREIGN KEY (user2_id) REFERENCES users(id),
                FOREIGN KEY (application_id) REFERENCES applications(id),
                UNIQUE(user1_id, user2_id, application_id)
            )
        """)

        conn.commit()
        print("Veritabani tablolari olusturuldu!")


# Uygulama basladiginda DB'yi olustur
init_db()


# ---- Embedding Modeli ----
model = None
try:
    print("Embedding modeli yukleniyor...")
    model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
    print("Embedding modeli yuklendi!")
except Exception as e:
    print(f"Model yukleme hatasi: {e}")

# ---- OpenAI Client ----
openai_client = None
try:
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        openai_client = OpenAI(api_key=openai_api_key)
        print("OpenAI client basariyla yuklendi!")
    else:
        print("OpenAI API key bulunamadi - AI ozellikleri devre disi")
except Exception as e:
    print(f"OpenAI client yuklenemedi: {e}")


# ============================================================
# AI ANALYSIS FUNCTIONS
# ============================================================

def estimate_experience_years(text: str) -> int:
    """CV metninden deneyim yılını tahmin eder"""
    import re
    text_lower = text.lower()

    # Yıl kalıplarını ara
    year_patterns = [
        r'(\d+)\+?\s*(?:yıl|yil|year|years)\s*(?:deneyim|experience|tecrübe)',
        r'(?:deneyim|experience|tecrübe)[:\s]*(\d+)\+?\s*(?:yıl|yil|year|years)',
        r'(\d{4})\s*[-–]\s*(?:\d{4}|present|günümüz|halen|devam)',
    ]

    max_years = 0
    for pattern in year_patterns:
        matches = re.findall(pattern, text_lower)
        for match in matches:
            try:
                years = int(match)
                if years < 50:  # Mantıklı bir değer
                    max_years = max(max_years, years)
            except:
                pass

    # Eğer doğrudan bulamadıysak, tarih aralıklarından hesapla
    if max_years == 0:
        date_ranges = re.findall(r'(\d{4})\s*[-–]\s*(\d{4}|present|günümüz|halen|devam)', text_lower)
        current_year = 2024
        for start, end in date_ranges:
            try:
                start_year = int(start)
                end_year = current_year if not end.isdigit() else int(end)
                years = end_year - start_year
                if 0 < years < 30:
                    max_years = max(max_years, years)
            except:
                pass

    return max_years if max_years > 0 else None


def extract_education(text: str) -> str:
    """CV metninden eğitim bilgisini çıkarır"""
    text_lower = text.lower()

    education_keywords = {
        "doktora": "Doktora",
        "phd": "Doktora",
        "yüksek lisans": "Yüksek Lisans",
        "master": "Yüksek Lisans",
        "mba": "MBA",
        "lisans": "Lisans",
        "bachelor": "Lisans",
        "mühendislik": "Mühendislik",
        "engineering": "Mühendislik",
        "bilgisayar": "Bilgisayar",
        "computer science": "Bilgisayar Bilimleri",
        "yazılım": "Yazılım",
        "software": "Yazılım",
        "üniversite": "Üniversite",
        "university": "Üniversite"
    }

    found = []
    for keyword, display in education_keywords.items():
        if keyword in text_lower:
            found.append(display)

    if "doktora" in [f.lower() for f in found] or "phd" in text_lower:
        return "Doktora"
    elif "yüksek lisans" in [f.lower() for f in found] or "master" in text_lower:
        return "Yüksek Lisans"
    elif "lisans" in [f.lower() for f in found] or "bachelor" in text_lower:
        return "Lisans"
    elif found:
        return found[0]

    return None


def extract_skills_from_text(text: str) -> list:
    """Metinden becerileri çıkarır - NLP tabanlı"""
    # Yaygın teknoloji ve beceri anahtar kelimeleri
    tech_skills = [
        "python", "java", "javascript", "typescript", "react", "vue", "angular", "node.js", "nodejs",
        "django", "flask", "fastapi", "spring", "express", "next.js", "nextjs",
        "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
        "docker", "kubernetes", "aws", "azure", "gcp", "linux", "git",
        "html", "css", "sass", "tailwind", "bootstrap",
        "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
        "machine learning", "deep learning", "nlp", "computer vision",
        "rest api", "graphql", "microservices", "ci/cd", "devops",
        "agile", "scrum", "jira", "figma", "photoshop",
        "c++", "c#", ".net", "rust", "go", "kotlin", "swift",
        "flutter", "react native", "ios", "android",
        "selenium", "jest", "pytest", "unit test",
        "blockchain", "solidity", "web3"
    ]

    soft_skills = [
        "leadership", "liderlik", "communication", "iletişim", "teamwork", "takım çalışması",
        "problem solving", "problem çözme", "analytical", "analitik",
        "project management", "proje yönetimi", "time management", "zaman yönetimi"
    ]

    text_lower = text.lower()
    found_skills = []

    for skill in tech_skills + soft_skills:
        if skill in text_lower:
            found_skills.append(skill.title())

    return list(set(found_skills))[:15]  # En fazla 15 beceri


def analyze_cv_with_ai(cv_text: str) -> dict:
    """OpenAI ile CV'yi detayli analiz eder"""

    if not openai_client:
        # GPT yoksa kendi NLP analizimizi yapalım
        skills = extract_skills_from_text(cv_text)
        experience = estimate_experience_years(cv_text)
        education = extract_education(cv_text)

        # Özet oluştur
        skill_count = len(skills)
        if skill_count > 10:
            summary = f"Geniş bir beceri setine sahip deneyimli bir aday. {skill_count} farklı teknoloji ve beceri tespit edildi."
        elif skill_count > 5:
            summary = f"Orta düzey deneyime sahip bir aday. {skill_count} teknik beceri belirlendi."
        elif skill_count > 0:
            summary = f"Temel teknik becerilere sahip bir aday. Potansiyel gelişim alanları mevcut."
        else:
            summary = "CV'den beceri bilgisi çıkarılamadı. Daha detaylı bir CV önerilir."

        if experience:
            summary = f"{experience}+ yıl deneyimli, " + summary[0].lower() + summary[1:]

        return {
            "skills": skills,
            "experience_years": experience,
            "education": education,
            "summary": summary,
            "analyzed_by": "NLP Engine (Sentence Transformers)"
        }

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """Sen bir CV analiz uzmanisin. CV'leri analiz edip yapilandirilmis bilgi cikarir sin.

Yanitini SADECE JSON formatinda ver, baska hicbir sey yazma."""
                },
                {
                    "role": "user",
                    "content": f"""Bu CV'yi analiz et ve su bilgileri JSON formatinda cikar:

CV Metni:
{cv_text[:3000]}

Su formatta JSON dondur:
{{
  "skills": ["beceri1", "beceri2", ...],
  "experience_years": 5,
  "education": "Mezuniyet bilgisi",
  "job_titles": ["is unvani1", "is unvani2"],
  "languages": ["Turkce", "Ingilizce"],
  "summary": "2-3 cumlelik ozet"
}}"""
                }
            ],
            temperature=0.3,
            max_tokens=800
        )

        result = response.choices[0].message.content
        # JSON parse etmeye calis
        try:
            return json.loads(result)
        except:
            # JSON parse edilemezse, temizleyip tekrar dene
            cleaned = result.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())

    except Exception as e:
        print(f"AI analiz hatasi: {e}")
        return {"error": str(e), "skills": [], "summary": "Analiz yapilamadi"}


def analyze_job_match_with_ai(cv_text: str, job_title: str, job_description: str, similarity_score: float) -> dict:
    """OpenAI ile CV-Is eslesmesini detayli analiz eder"""

    if not openai_client:
        # GPT yoksa kendi NLP analizimizi yapalım
        cv_skills = set(s.lower() for s in extract_skills_from_text(cv_text))
        job_skills = set(s.lower() for s in extract_skills_from_text(job_description))

        # Eşleşen ve eksik beceriler
        matching_skills = cv_skills & job_skills
        missing_skills = job_skills - cv_skills
        extra_skills = cv_skills - job_skills

        # Güçlü yönler
        strengths = []
        if matching_skills:
            strengths = [s.title() for s in list(matching_skills)[:4]]
        if extra_skills and len(strengths) < 4:
            strengths.extend([s.title() for s in list(extra_skills)[:2]])

        # Zayıf yönler / Geliştirilebilir
        weaknesses = [s.title() for s in list(missing_skills)[:3]] if missing_skills else []

        # Öneri oluştur
        if similarity_score >= 70:
            recommendation = "CV'niz bu pozisyon için çok uygun görünüyor. Başvurmanızı öneririz!"
        elif similarity_score >= 50:
            recommendation = "İyi bir eşleşme. Eksik becerileri geliştirerek şansınızı artırabilirsiniz."
        elif similarity_score >= 30:
            recommendation = "Kısmen uygun. Bazı temel beceriler eksik olabilir."
        else:
            recommendation = "Bu pozisyon için farklı beceriler gerekiyor olabilir."

        # Eşleşme nedeni
        match_percent = len(matching_skills) / max(len(job_skills), 1) * 100
        if similarity_score >= 60:
            match_reason = f"CV'nizdeki {len(matching_skills)} beceri bu iş ile örtüşüyor. Semantik analiz yüksek benzerlik tespit etti."
        elif similarity_score >= 40:
            match_reason = f"Orta düzey eşleşme. {len(matching_skills)} ortak beceri bulundu, {len(missing_skills)} beceri geliştirilebilir."
        else:
            match_reason = f"Düşük eşleşme. İş ilanında aranan bazı temel beceriler CV'de bulunamadı."

        return {
            "match_score": similarity_score,
            "strengths": strengths if strengths else ["Genel teknik bilgi", "Öğrenme potansiyeli"],
            "weaknesses": weaknesses if weaknesses else [],
            "recommendation": recommendation,
            "missing_skills": [s.title() for s in list(missing_skills)[:5]],
            "match_reason": match_reason
        }

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": """Sen bir is eslestirme uzmanisin. CV ve is ilanlarini karsilastirip detayli analiz yaparsin.

Yanitini SADECE JSON formatinda ver."""
                },
                {
                    "role": "user",
                    "content": f"""Bu CV ile is ilanini karsilastir ve detayli analiz yap.

CV Metni:
{cv_text[:1500]}

Is Ilani:
Pozisyon: {job_title}
Aciklama: {job_description}

Benzerlik Skoru: {similarity_score}%

Su formatta JSON dondur:
{{
  "match_score": 75,
  "strengths": ["guclu yon 1", "guclu yon 2"],
  "weaknesses": ["eksik 1", "eksik 2"],
  "recommendation": "Bu pozisyona basvurmali mi?",
  "missing_skills": ["eksik beceri 1", "eksik beceri 2"],
  "match_reason": "Neden bu skor? 2-3 cumle"
}}"""
                }
            ],
            temperature=0.5,
            max_tokens=1000
        )

        result = response.choices[0].message.content
        try:
            return json.loads(result)
        except:
            cleaned = result.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            return json.loads(cleaned.strip())

    except Exception as e:
        print(f"AI eslestirme analiz hatasi: {e}")
        return {
            "match_score": similarity_score,
            "strengths": [],
            "weaknesses": [],
            "recommendation": "Analiz yapilamadi",
            "missing_skills": [],
            "match_reason": str(e)
        }


# ============================================================
# MODELLER
# ============================================================

class JobCreate(BaseModel):
    title: str
    description: str

class JobUpdate(BaseModel):
    title: str
    description: str

class UserRegister(BaseModel):
    email: str
    password: str
    role: str  # employer / jobseeker

class UserLogin(BaseModel):
    email: str
    password: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None  # employer only
    website: Optional[str] = None
    linkedin: Optional[str] = None
    skills: Optional[str] = None  # jobseeker only - comma separated

class ApplicationCreate(BaseModel):
    job_id: int
    cv_id: Optional[int] = None
    cover_letter: Optional[str] = None

class ApplicationStatusUpdate(BaseModel):
    status: str  # pending, reviewed, accepted, rejected

class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    application_id: Optional[int] = None


# ============================================================
# HELPER FONKSIYONLAR
# ============================================================

def get_user_id_from_token(token_payload: dict) -> int:
    """Token'dan user_id cikarir"""
    email = token_payload.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Gecersiz token")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM users WHERE email=?", (email,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")

    return result["id"]


def load_jobs_from_db():
    """Tum is ilanlarini embedding'leriyle birlikte yukler"""
    if model is None:
        raise HTTPException(status_code=500, detail="Model yuklenemedi")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, description FROM jobs ORDER BY id ASC")
        rows = cursor.fetchall()

    jobs = []
    for r in rows:
        full_text = r["title"] + " " + r["description"]
        embedding = model.encode(full_text, normalize_embeddings=True)

        jobs.append({
            "id": r["id"],
            "title": r["title"],
            "description": r["description"],
            "embedding": embedding,
        })

    return jobs


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def home():
    return {"message": "Matchify API calisiyor!", "status": "ok"}

@app.get("/health")
def health():
    try:
        with get_db() as conn:
            conn.cursor().execute("SELECT 1")
        return {"status": "ok", "database": "connected"}
    except:
        return {"status": "error", "database": "disconnected"}


# ============================================================
# CV METIN CIKARMA
# ============================================================

def extract_text_from_file(filename: str, content: bytes) -> str:
    """PDF, DOCX veya TXT dosyalarindan text cikarir"""
    name = filename.lower()

    if name.endswith(".pdf"):
        try:
            reader = PdfReader(io.BytesIO(content))
            texts = [page.extract_text() or "" for page in reader.pages]
            return "\n".join(texts).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF okuma hatasi: {str(e)}")

    if name.endswith(".docx"):
        try:
            doc = docx_lib.Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"DOCX okuma hatasi: {str(e)}")

    if name.endswith(".txt"):
        try:
            return content.decode("utf-8", errors="ignore").strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"TXT okuma hatasi: {str(e)}")

    raise HTTPException(status_code=400, detail="Desteklenmeyen dosya formati. Sadece PDF, DOCX veya TXT yukleyebilirsin.")


# ============================================================
# CV UPLOAD
# ============================================================

@app.post("/upload")
async def upload_file(file: UploadFile = File(...), user=Depends(verify_token)):
    """CV yukler ve veritabanina kaydeder"""

    # Dosya boyutu kontrolu (max 5MB)
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Dosya boyutu 5MB'dan buyuk olamaz")

    # Dosya formati kontrolu
    allowed_extensions = [".pdf", ".docx", ".txt"]
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(status_code=400, detail="Sadece PDF, DOCX veya TXT dosyasi yukleyebilirsin")

    # Text cikar
    text = extract_text_from_file(file.filename, content)

    if len(text) < 50:
        raise HTTPException(status_code=400, detail="CV cok kisa. En az 50 karakter olmali.")

    # User ID'yi al
    user_id = get_user_id_from_token(user)

    # Veritabanina kaydet
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO cvs (user_id, filename, text_content)
            VALUES (?, ?, ?)
        """, (user_id, file.filename, text))
        cv_id = cursor.lastrowid
        conn.commit()

    # AI ile CV analizi yap
    ai_analysis = analyze_cv_with_ai(text)

    return {
        "success": True,
        "cv_id": cv_id,
        "filename": file.filename,
        "text_length": len(text),
        "preview": text[:300] + "..." if len(text) > 300 else text,
        "ai_analysis": ai_analysis
    }


# ============================================================
# KULLANICININ CV'LERINI LISTELE
# ============================================================

@app.get("/my-cvs")
def list_my_cvs(user=Depends(verify_token)):
    """Kullanicinin yukledigi tum CV'leri listeler"""

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, filename, uploaded_at,
                   substr(text_content, 1, 200) as preview
            FROM cvs
            WHERE user_id = ?
            ORDER BY uploaded_at DESC
        """, (user_id,))
        rows = cursor.fetchall()

    return {
        "cvs": [
            {
                "id": r["id"],
                "filename": r["filename"],
                "uploaded_at": r["uploaded_at"],
                "preview": r["preview"] + "..."
            }
            for r in rows
        ]
    }


# ============================================================
# PROFILE
# ============================================================

@app.get("/profile")
def get_profile(user=Depends(verify_token)):
    """Kullanicinin profil bilgilerini getirir"""

    email = user.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Gecersiz token")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, email, role, full_name, phone, bio, location,
                   company_name, website, linkedin, skills, created_at
            FROM users WHERE email=?
        """, (email,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=404, detail="Kullanici bulunamadi")

    return {
        "id": result["id"],
        "email": result["email"],
        "role": result["role"],
        "full_name": result["full_name"],
        "phone": result["phone"],
        "bio": result["bio"],
        "location": result["location"],
        "company_name": result["company_name"],
        "website": result["website"],
        "linkedin": result["linkedin"],
        "skills": result["skills"],
        "created_at": result["created_at"]
    }


@app.put("/profile")
def update_profile(profile: ProfileUpdate, user=Depends(verify_token)):
    """Kullanicinin profil bilgilerini gunceller"""

    email = user.get("sub")
    if not email:
        raise HTTPException(status_code=401, detail="Gecersiz token")

    with get_db() as conn:
        cursor = conn.cursor()

        # Mevcut kullaniciyi kontrol et
        cursor.execute("SELECT id FROM users WHERE email=?", (email,))
        result = cursor.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Kullanici bulunamadi")

        # Profili guncelle
        cursor.execute("""
            UPDATE users SET
                full_name = COALESCE(?, full_name),
                phone = COALESCE(?, phone),
                bio = COALESCE(?, bio),
                location = COALESCE(?, location),
                company_name = COALESCE(?, company_name),
                website = COALESCE(?, website),
                linkedin = COALESCE(?, linkedin),
                skills = COALESCE(?, skills)
            WHERE email = ?
        """, (
            profile.full_name,
            profile.phone,
            profile.bio,
            profile.location,
            profile.company_name,
            profile.website,
            profile.linkedin,
            profile.skills,
            email
        ))
        conn.commit()

    return {"success": True, "message": "Profil guncellendi"}


@app.get("/user-stats")
def get_user_stats(user=Depends(verify_token)):
    """Kullanicinin istatistiklerini getirir"""

    user_id = get_user_id_from_token(user)
    role = user.get("role")

    with get_db() as conn:
        cursor = conn.cursor()

        if role == "employer":
            # Employer istatistikleri
            cursor.execute("SELECT COUNT(*) as count FROM jobs WHERE employer_id=?", (user_id,))
            job_count = cursor.fetchone()["count"]

            # Gelen basvuru sayisi
            cursor.execute("""
                SELECT COUNT(*) as count FROM applications a
                JOIN jobs j ON a.job_id = j.id
                WHERE j.employer_id = ?
            """, (user_id,))
            app_count = cursor.fetchone()["count"]

            return {
                "role": "employer",
                "total_jobs": job_count,
                "total_applications": app_count,
                "views": 0
            }
        else:
            # Jobseeker istatistikleri
            cursor.execute("SELECT COUNT(*) as count FROM cvs WHERE user_id=?", (user_id,))
            cv_count = cursor.fetchone()["count"]

            cursor.execute("SELECT COUNT(*) as count FROM match_history WHERE user_id=?", (user_id,))
            match_count = cursor.fetchone()["count"]

            # Yapilan basvuru sayisi
            cursor.execute("SELECT COUNT(*) as count FROM applications WHERE user_id=?", (user_id,))
            app_count = cursor.fetchone()["count"]

            return {
                "role": "jobseeker",
                "total_cvs": cv_count,
                "total_matches": match_count,
                "applications": app_count
            }


# ============================================================
# JOB CRUD
# ============================================================

@app.get("/jobs")
def list_jobs(
    search: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    user=Depends(verify_token)
):
    """Is ilanlarini listeler, arama ve sayfalama destekler"""
    offset = (page - 1) * limit

    with get_db() as conn:
        cursor = conn.cursor()

        if search:
            search_term = f"%{search}%"
            cursor.execute("""
                SELECT id, title, description, employer_id, created_at
                FROM jobs
                WHERE title LIKE ? OR description LIKE ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, (search_term, search_term, limit, offset))
        else:
            cursor.execute("""
                SELECT id, title, description, employer_id, created_at
                FROM jobs
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))

        rows = cursor.fetchall()

        # Toplam ilan sayisi
        if search:
            cursor.execute("""
                SELECT COUNT(*) as total FROM jobs
                WHERE title LIKE ? OR description LIKE ?
            """, (search_term, search_term))
        else:
            cursor.execute("SELECT COUNT(*) as total FROM jobs")

        total = cursor.fetchone()["total"]

    return {
        "jobs": [
            {
                "id": r["id"],
                "title": r["title"],
                "description": r["description"],
                "employer_id": r["employer_id"],
                "created_at": r["created_at"]
            }
            for r in rows
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


@app.get("/jobs/{job_id}")
def get_job(job_id: int, user=Depends(verify_token)):
    """Tek bir is ilanini getirir"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT j.id, j.title, j.description, j.employer_id, j.created_at,
                   u.email as employer_email, u.company_name, u.full_name as employer_name
            FROM jobs j
            LEFT JOIN users u ON j.employer_id = u.id
            WHERE j.id = ?
        """, (job_id,))
        job = cursor.fetchone()

    if not job:
        raise HTTPException(status_code=404, detail="Is ilani bulunamadi")

    return {
        "id": job["id"],
        "title": job["title"],
        "description": job["description"],
        "employer_id": job["employer_id"],
        "created_at": job["created_at"],
        "employer_email": job["employer_email"],
        "company_name": job["company_name"],
        "employer_name": job["employer_name"]
    }


@app.post("/jobs")
def create_job(job: JobCreate, user=Depends(verify_token)):
    # Sadece employer olusturabilir
    role = user.get("role")
    if role != "employer":
        raise HTTPException(status_code=403, detail="Sadece isverenler is ilani olusturabilir")

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO jobs (employer_id, title, description) VALUES (?, ?, ?)",
            (user_id, job.title, job.description),
        )
        job_id = cursor.lastrowid
        conn.commit()

    return {"success": True, "id": job_id, "title": job.title, "description": job.description}


@app.put("/jobs/{job_id}")
def update_job(job_id: int, job: JobUpdate, user=Depends(verify_token)):
    role = user.get("role")
    if role != "employer":
        raise HTTPException(status_code=403, detail="Sadece isverenler is ilani guncelleyebilir")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE jobs SET title=?, description=? WHERE id=?",
            (job.title, job.description, job_id),
        )
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ilan bulunamadi")

    return {"success": True, "message": "Ilan guncellendi", "id": job_id}


@app.delete("/jobs/{job_id}")
def delete_job(job_id: int, user=Depends(verify_token)):
    role = user.get("role")
    if role != "employer":
        raise HTTPException(status_code=403, detail="Sadece isverenler is ilani silebilir")

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM jobs WHERE id=?", (job_id,))
        conn.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Ilan bulunamadi")

    return {"success": True, "message": "Ilan silindi", "id": job_id}


# ============================================================
# APPLICATIONS
# ============================================================

@app.post("/applications")
def create_application(application: ApplicationCreate, user=Depends(verify_token)):
    """Is ilanina basvuru yapar"""

    role = user.get("role")
    if role != "jobseeker":
        raise HTTPException(status_code=403, detail="Sadece is arayanlar basvuru yapabilir")

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()

        # Is ilani var mi kontrol et
        cursor.execute("SELECT id, employer_id FROM jobs WHERE id=?", (application.job_id,))
        job = cursor.fetchone()
        if not job:
            raise HTTPException(status_code=404, detail="Is ilani bulunamadi")

        # Daha once basvuru yapilmis mi kontrol et
        cursor.execute(
            "SELECT id FROM applications WHERE job_id=? AND user_id=?",
            (application.job_id, user_id)
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Bu ilana zaten basvuru yapilmis")

        # CV belirtilmemisse en son CV'yi kullan
        cv_id = application.cv_id
        if not cv_id:
            cursor.execute(
                "SELECT id FROM cvs WHERE user_id=? ORDER BY uploaded_at DESC LIMIT 1",
                (user_id,)
            )
            cv_row = cursor.fetchone()
            if cv_row:
                cv_id = cv_row["id"]

        # Basvuruyu olustur
        cursor.execute("""
            INSERT INTO applications (job_id, user_id, cv_id, cover_letter)
            VALUES (?, ?, ?, ?)
        """, (application.job_id, user_id, cv_id, application.cover_letter))

        app_id = cursor.lastrowid
        conn.commit()

    return {
        "success": True,
        "message": "Basvuru basariyla gonderildi",
        "application_id": app_id
    }


@app.get("/applications")
def list_applications(user=Depends(verify_token)):
    """Kullanicinin basvurularini veya isverenin aldigi basvurulari listeler"""

    user_id = get_user_id_from_token(user)
    role = user.get("role")

    with get_db() as conn:
        cursor = conn.cursor()

        if role == "jobseeker":
            # Is arayan - kendi basvurularini gorur
            cursor.execute("""
                SELECT a.id, a.job_id, a.status, a.applied_at, a.cover_letter,
                       j.title as job_title, j.description as job_description,
                       u.company_name, u.full_name as employer_name
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                LEFT JOIN users u ON j.employer_id = u.id
                WHERE a.user_id = ?
                ORDER BY a.applied_at DESC
            """, (user_id,))
        else:
            # Isveren - kendi ilanlarina gelen basvurulari gorur
            cursor.execute("""
                SELECT a.id, a.job_id, a.user_id, a.status, a.applied_at, a.cover_letter, a.cv_id,
                       j.title as job_title,
                       u.email as applicant_email, u.full_name as applicant_name, u.phone as applicant_phone
                FROM applications a
                JOIN jobs j ON a.job_id = j.id
                JOIN users u ON a.user_id = u.id
                WHERE j.employer_id = ?
                ORDER BY a.applied_at DESC
            """, (user_id,))

        rows = cursor.fetchall()

    applications = []
    for r in rows:
        app_data = {
            "id": r["id"],
            "job_id": r["job_id"],
            "status": r["status"],
            "applied_at": r["applied_at"],
            "cover_letter": r["cover_letter"],
            "job_title": r["job_title"],
        }

        if role == "jobseeker":
            app_data["job_description"] = r["job_description"]
            app_data["company_name"] = r["company_name"]
            app_data["employer_name"] = r["employer_name"]
        else:
            app_data["user_id"] = r["user_id"]
            app_data["cv_id"] = r["cv_id"]
            app_data["applicant_email"] = r["applicant_email"]
            app_data["applicant_name"] = r["applicant_name"]
            app_data["applicant_phone"] = r["applicant_phone"]

        applications.append(app_data)

    return {"applications": applications}


@app.get("/applications/{application_id}")
def get_application(application_id: int, user=Depends(verify_token)):
    """Tek bir basvurunun detaylarini getirir"""

    user_id = get_user_id_from_token(user)
    role = user.get("role")

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT a.*, j.title as job_title, j.description as job_description, j.employer_id,
                   u.email as applicant_email, u.full_name as applicant_name, u.phone as applicant_phone,
                   c.filename as cv_filename, c.text_content as cv_text
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN users u ON a.user_id = u.id
            LEFT JOIN cvs c ON a.cv_id = c.id
            WHERE a.id = ?
        """, (application_id,))

        app = cursor.fetchone()

    if not app:
        raise HTTPException(status_code=404, detail="Basvuru bulunamadi")

    # Yetki kontrolu
    if role == "jobseeker" and app["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Bu basvuruyu goruntuleme yetkiniz yok")
    if role == "employer" and app["employer_id"] != user_id:
        raise HTTPException(status_code=403, detail="Bu basvuruyu goruntuleme yetkiniz yok")

    return {
        "id": app["id"],
        "job_id": app["job_id"],
        "job_title": app["job_title"],
        "job_description": app["job_description"],
        "status": app["status"],
        "applied_at": app["applied_at"],
        "cover_letter": app["cover_letter"],
        "applicant_email": app["applicant_email"],
        "applicant_name": app["applicant_name"],
        "applicant_phone": app["applicant_phone"],
        "cv_filename": app["cv_filename"],
        "cv_preview": app["cv_text"][:500] + "..." if app["cv_text"] and len(app["cv_text"]) > 500 else app["cv_text"]
    }


@app.put("/applications/{application_id}/status")
def update_application_status(application_id: int, status_update: ApplicationStatusUpdate, user=Depends(verify_token)):
    """Basvuru durumunu gunceller (sadece isveren)"""

    role = user.get("role")
    if role != "employer":
        raise HTTPException(status_code=403, detail="Sadece isverenler basvuru durumunu guncelleyebilir")

    if status_update.status not in ["pending", "reviewed", "accepted", "rejected"]:
        raise HTTPException(status_code=400, detail="Gecersiz durum")

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()

        # Basvurunun isverenin ilanina ait oldugunu kontrol et
        cursor.execute("""
            SELECT a.id FROM applications a
            JOIN jobs j ON a.job_id = j.id
            WHERE a.id = ? AND j.employer_id = ?
        """, (application_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Basvuru bulunamadi veya yetkiniz yok")

        # Durumu guncelle
        cursor.execute("""
            UPDATE applications
            SET status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        """, (status_update.status, application_id))
        conn.commit()

    return {"success": True, "message": "Basvuru durumu guncellendi"}


@app.get("/jobs/{job_id}/application-status")
def check_application_status(job_id: int, user=Depends(verify_token)):
    """Kullanicinin belirli bir ilana basvuru yapip yapmadigini kontrol eder"""

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, status, applied_at FROM applications WHERE job_id=? AND user_id=?",
            (job_id, user_id)
        )
        app = cursor.fetchone()

    if app:
        return {
            "applied": True,
            "application_id": app["id"],
            "status": app["status"],
            "applied_at": app["applied_at"]
        }

    return {"applied": False}


# ============================================================
# CV MATCHING
# ============================================================

@app.get("/matches")
def get_matches(cv_id: Optional[int] = None, top_k: int = 10, user=Depends(verify_token)):
    """Kullanicinin CV'sine gore eslesen is ilanlarini dondurur"""

    if model is None:
        raise HTTPException(status_code=500, detail="Model yuklenemedi")

    user_id = get_user_id_from_token(user)

    # CV'yi veritabanindan cek
    with get_db() as conn:
        cursor = conn.cursor()

        if cv_id:
            cursor.execute("""
                SELECT id, filename, text_content
                FROM cvs
                WHERE id=? AND user_id=?
            """, (cv_id, user_id))
        else:
            cursor.execute("""
                SELECT id, filename, text_content
                FROM cvs
                WHERE user_id=?
                ORDER BY uploaded_at DESC
                LIMIT 1
            """, (user_id,))

        cv = cursor.fetchone()

    if not cv:
        raise HTTPException(status_code=404, detail="CV bulunamadi. Once bir CV yuklemelisin.")

    cv_id = cv["id"]
    cv_filename = cv["filename"]
    cv_text = cv["text_content"]

    # CV embedding'ini olustur
    cv_embedding = model.encode(cv_text, normalize_embeddings=True)

    # Tum is ilanlarini yukle
    jobs = load_jobs_from_db()

    if not jobs:
        return {
            "success": True,
            "cv_id": cv_id,
            "cv_filename": cv_filename,
            "total_jobs": 0,
            "matches": [],
            "message": "Henuz is ilani bulunmuyor"
        }

    # Eslesmeleri hesapla
    results = []
    for job in jobs:
        sim = float(np.dot(cv_embedding, job["embedding"]))
        sim = max(sim, 0)
        score = round(sim * 100, 1)

        # AI ile detayli analiz (opsiyonel - her is icin yapmak pahali olabilir)
        ai_match_analysis = analyze_job_match_with_ai(
            cv_text=cv_text,
            job_title=job["title"],
            job_description=job["description"],
            similarity_score=score
        )

        results.append({
            "job_id": job["id"],
            "title": job["title"],
            "description": job["description"],
            "score": score,
            "ai_analysis": ai_match_analysis
        })

    # Score'a gore sirala
    results.sort(key=lambda x: x["score"], reverse=True)

    # Match history'ye kaydet (sadece top 5'i)
    with get_db() as conn:
        cursor = conn.cursor()
        for match in results[:5]:
            try:
                cursor.execute("""
                    INSERT OR IGNORE INTO match_history (user_id, cv_id, job_id, score)
                    VALUES (?, ?, ?, ?)
                """, (user_id, cv_id, match["job_id"], match["score"]))
            except:
                pass
        conn.commit()

    return {
        "success": True,
        "cv_id": cv_id,
        "cv_filename": cv_filename,
        "total_jobs": len(results),
        "matches": results[:top_k]
    }


# ============================================================
# REGISTER
# ============================================================

@app.post("/register")
def register(user: UserRegister):
    # Email validation
    if "@" not in user.email:
        raise HTTPException(status_code=400, detail="Gecerli bir email adresi gir")

    # Password validation
    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Sifre en az 6 karakter olmali")

    # Role validation
    if user.role not in ["employer", "jobseeker"]:
        raise HTTPException(status_code=400, detail="Rol 'employer' veya 'jobseeker' olmali")

    with get_db() as conn:
        cursor = conn.cursor()

        # Email kontrolu
        cursor.execute("SELECT id FROM users WHERE email=?", (user.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Bu email zaten kayitli")

        hashed = bcrypt.hashpw(user.password.encode("utf-8"), bcrypt.gensalt())

        cursor.execute("""
            INSERT INTO users (email, password, role)
            VALUES (?, ?, ?)
        """, (user.email, hashed.decode("utf-8"), user.role))

        user_id = cursor.lastrowid
        conn.commit()

    return {"success": True, "message": "Kayit basarili!", "user_id": user_id}


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
def login(user: UserLogin):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password, role FROM users WHERE email=?", (user.email,))
        result = cursor.fetchone()

    if not result:
        raise HTTPException(status_code=401, detail="Email veya sifre hatali")

    user_id = result["id"]
    email = result["email"]
    hashed_pw = result["password"]
    role = result["role"]

    if not bcrypt.checkpw(user.password.encode("utf-8"), hashed_pw.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Email veya sifre hatali")

    access_token = create_access_token({"sub": email, "role": role})

    return {
        "success": True,
        "message": "Giris basarili",
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "user_id": user_id
    }


# ============================================================
# MESSAGING
# ============================================================

@app.post("/messages")
def send_message(message: MessageCreate, user=Depends(verify_token)):
    """Mesaj gonderir"""
    sender_id = get_user_id_from_token(user)

    if sender_id == message.receiver_id:
        raise HTTPException(status_code=400, detail="Kendinize mesaj gonderemezsiniz")

    with get_db() as conn:
        cursor = conn.cursor()

        # Alici kullanici var mi kontrol et
        cursor.execute("SELECT id FROM users WHERE id=?", (message.receiver_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Alici kullanici bulunamadi")

        # Mesaji kaydet
        cursor.execute("""
            INSERT INTO messages (sender_id, receiver_id, application_id, content)
            VALUES (?, ?, ?, ?)
        """, (sender_id, message.receiver_id, message.application_id, message.content))
        message_id = cursor.lastrowid

        # Conversation guncelle veya olustur
        user1 = min(sender_id, message.receiver_id)
        user2 = max(sender_id, message.receiver_id)

        cursor.execute("""
            INSERT INTO conversations (user1_id, user2_id, application_id, last_message_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user1_id, user2_id, application_id) DO UPDATE SET
            last_message_at = CURRENT_TIMESTAMP
        """, (user1, user2, message.application_id))

        conn.commit()

    return {"success": True, "message_id": message_id}


@app.get("/messages/{other_user_id}")
def get_messages(other_user_id: int, application_id: Optional[int] = None, user=Depends(verify_token)):
    """Iki kullanici arasindaki mesajlari getirir"""
    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()

        if application_id:
            cursor.execute("""
                SELECT m.*,
                       s.email as sender_email, s.full_name as sender_name,
                       r.email as receiver_email, r.full_name as receiver_name
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                JOIN users r ON m.receiver_id = r.id
                WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?))
                AND m.application_id = ?
                ORDER BY m.created_at ASC
            """, (user_id, other_user_id, other_user_id, user_id, application_id))
        else:
            cursor.execute("""
                SELECT m.*,
                       s.email as sender_email, s.full_name as sender_name,
                       r.email as receiver_email, r.full_name as receiver_name
                FROM messages m
                JOIN users s ON m.sender_id = s.id
                JOIN users r ON m.receiver_id = r.id
                WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
                ORDER BY m.created_at ASC
            """, (user_id, other_user_id, other_user_id, user_id))

        messages = cursor.fetchall()

        # Okunmamis mesajlari okundu olarak isaretle
        cursor.execute("""
            UPDATE messages SET is_read = 1
            WHERE receiver_id = ? AND sender_id = ? AND is_read = 0
        """, (user_id, other_user_id))
        conn.commit()

    return {
        "messages": [
            {
                "id": m["id"],
                "sender_id": m["sender_id"],
                "receiver_id": m["receiver_id"],
                "sender_name": m["sender_name"] or m["sender_email"],
                "receiver_name": m["receiver_name"] or m["receiver_email"],
                "content": m["content"],
                "is_read": m["is_read"],
                "created_at": m["created_at"],
                "is_mine": m["sender_id"] == user_id
            }
            for m in messages
        ]
    }


@app.get("/conversations")
def get_conversations(user=Depends(verify_token)):
    """Kullanicinin tum sohbetlerini listeler"""
    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()

        cursor.execute("""
            SELECT DISTINCT
                CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END as other_user_id,
                u.email as other_user_email,
                u.full_name as other_user_name,
                u.role as other_user_role,
                u.company_name,
                m.application_id,
                j.title as job_title,
                (SELECT content FROM messages
                 WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
                 ORDER BY created_at DESC LIMIT 1) as last_message,
                (SELECT created_at FROM messages
                 WHERE (sender_id = ? AND receiver_id = u.id) OR (sender_id = u.id AND receiver_id = ?)
                 ORDER BY created_at DESC LIMIT 1) as last_message_at,
                (SELECT COUNT(*) FROM messages
                 WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
            FROM messages m
            JOIN users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = u.id
            LEFT JOIN applications a ON m.application_id = a.id
            LEFT JOIN jobs j ON a.job_id = j.id
            WHERE m.sender_id = ? OR m.receiver_id = ?
            GROUP BY other_user_id, m.application_id
            ORDER BY last_message_at DESC
        """, (user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id))

        conversations = cursor.fetchall()

    return {
        "conversations": [
            {
                "other_user_id": c["other_user_id"],
                "other_user_name": c["other_user_name"] or c["other_user_email"],
                "other_user_email": c["other_user_email"],
                "other_user_role": c["other_user_role"],
                "company_name": c["company_name"],
                "application_id": c["application_id"],
                "job_title": c["job_title"],
                "last_message": c["last_message"],
                "last_message_at": c["last_message_at"],
                "unread_count": c["unread_count"]
            }
            for c in conversations
        ]
    }


@app.get("/unread-count")
def get_unread_count(user=Depends(verify_token)):
    """Okunmamis mesaj sayisini dondurur"""
    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) as count FROM messages
            WHERE receiver_id = ? AND is_read = 0
        """, (user_id,))
        result = cursor.fetchone()

    return {"unread_count": result["count"]}


# ============================================================
# EMPLOYER - MY JOBS
# ============================================================

@app.get("/my-jobs")
def get_my_jobs(user=Depends(verify_token)):
    """Isverenin kendi ilanlarini getirir"""
    role = user.get("role")
    if role != "employer":
        raise HTTPException(status_code=403, detail="Sadece isverenler bu endpoint'i kullanabilir")

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT j.*,
                   (SELECT COUNT(*) FROM applications WHERE job_id = j.id) as application_count
            FROM jobs j
            WHERE j.employer_id = ?
            ORDER BY j.created_at DESC
        """, (user_id,))
        jobs = cursor.fetchall()

    return {
        "jobs": [
            {
                "id": j["id"],
                "title": j["title"],
                "description": j["description"],
                "created_at": j["created_at"],
                "application_count": j["application_count"]
            }
            for j in jobs
        ]
    }


@app.get("/my-jobs/{job_id}/applications")
def get_job_applications(job_id: int, user=Depends(verify_token)):
    """Bir ilana gelen basvurulari getirir"""
    role = user.get("role")
    if role != "employer":
        raise HTTPException(status_code=403, detail="Sadece isverenler bu endpoint'i kullanabilir")

    user_id = get_user_id_from_token(user)

    with get_db() as conn:
        cursor = conn.cursor()

        # Ilanin bu isverene ait oldugunu kontrol et
        cursor.execute("SELECT id FROM jobs WHERE id = ? AND employer_id = ?", (job_id, user_id))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Ilan bulunamadi veya size ait degil")

        cursor.execute("""
            SELECT a.*,
                   u.email, u.full_name, u.phone, u.location, u.skills, u.linkedin,
                   c.filename as cv_filename,
                   c.text_content as cv_text
            FROM applications a
            JOIN users u ON a.user_id = u.id
            LEFT JOIN cvs c ON a.cv_id = c.id
            WHERE a.job_id = ?
            ORDER BY a.applied_at DESC
        """, (job_id,))
        applications = cursor.fetchall()

    return {
        "applications": [
            {
                "id": a["id"],
                "user_id": a["user_id"],
                "status": a["status"],
                "applied_at": a["applied_at"],
                "cover_letter": a["cover_letter"],
                "applicant": {
                    "email": a["email"],
                    "full_name": a["full_name"],
                    "phone": a["phone"],
                    "location": a["location"],
                    "skills": a["skills"],
                    "linkedin": a["linkedin"]
                },
                "cv_filename": a["cv_filename"],
                "cv_preview": a["cv_text"][:500] + "..." if a["cv_text"] and len(a["cv_text"]) > 500 else a["cv_text"]
            }
            for a in applications
        ]
    }


# ============================================================
# RUN SERVER
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
