"""
20 adet örnek iş ilanı ekleyen seed script
"""
import sqlite3
import bcrypt
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "matchify.db")

# 20 farklı iş ilanı
JOBS = [
    {
        "title": "Senior Python Developer",
        "description": """
Yazılım ekibimize katılacak deneyimli Python Developer arıyoruz.

Aranan Nitelikler:
- En az 5 yıl Python deneyimi
- Django veya FastAPI framework bilgisi
- PostgreSQL ve Redis deneyimi
- REST API tasarımı ve geliştirme
- Docker ve Kubernetes bilgisi
- Git versiyon kontrol sistemi
- Agile/Scrum metodolojileri

Tercih Sebepler:
- AWS veya GCP deneyimi
- CI/CD pipeline kurulumu
- Mikroservis mimarisi tecrübesi

Sunduklarımız:
- Rekabetçi maaş
- Uzaktan çalışma imkanı
- Özel sağlık sigortası
- Yemek kartı
"""
    },
    {
        "title": "Frontend Developer (React)",
        "description": """
Modern web uygulamaları geliştirmek için React Developer arıyoruz.

Aranan Nitelikler:
- 3+ yıl React.js deneyimi
- TypeScript bilgisi
- Redux veya Context API
- Next.js framework deneyimi
- RESTful API entegrasyonu
- Responsive tasarım
- CSS/SCSS, Tailwind CSS

Tercih Sebepler:
- React Native deneyimi
- Unit test yazma (Jest, React Testing Library)
- GraphQL bilgisi

Sunduklarımız:
- Esnek çalışma saatleri
- Teknoloji bütçesi
- Eğitim destekleri
"""
    },
    {
        "title": "DevOps Engineer",
        "description": """
Altyapı ve deployment süreçlerini yönetecek DevOps Engineer arıyoruz.

Aranan Nitelikler:
- 4+ yıl DevOps/SRE deneyimi
- Linux sistem yönetimi
- Docker ve Kubernetes
- AWS veya Azure bulut servisleri
- Terraform veya Ansible ile IaC
- CI/CD araçları (Jenkins, GitLab CI, GitHub Actions)
- Monitoring (Prometheus, Grafana, ELK Stack)

Tercih Sebepler:
- Scripting (Python, Bash)
- Network güvenliği bilgisi
- Yüksek trafikli sistemler deneyimi

Sunduklarımız:
- Full remote çalışma
- Teknik konferans destekleri
"""
    },
    {
        "title": "Data Scientist",
        "description": """
Veri bilimi ekibimize katılacak Data Scientist arıyoruz.

Aranan Nitelikler:
- Makine öğrenmesi algoritmaları bilgisi
- Python (Pandas, NumPy, Scikit-learn)
- SQL ve NoSQL veritabanları
- İstatistik ve matematik temeli
- Veri görselleştirme (Matplotlib, Seaborn, Plotly)
- Jupyter Notebook kullanımı

Tercih Sebepler:
- Deep Learning (TensorFlow, PyTorch)
- NLP veya Computer Vision deneyimi
- Big Data araçları (Spark, Hadoop)
- A/B test deneyimi

Sunduklarımız:
- GPU kaynaklarına erişim
- Araştırma günleri
"""
    },
    {
        "title": "Mobile Developer (iOS/Android)",
        "description": """
Cross-platform mobil uygulama geliştirecek developer arıyoruz.

Aranan Nitelikler:
- React Native veya Flutter deneyimi
- Native iOS (Swift) veya Android (Kotlin) bilgisi
- REST API entegrasyonu
- State management çözümleri
- App Store ve Play Store yayınlama deneyimi
- UI/UX best practices

Tercih Sebepler:
- Firebase deneyimi
- Push notification implementasyonu
- In-app purchase entegrasyonu

Sunduklarımız:
- Macbook Pro
- iOS/Android cihaz desteği
"""
    },
    {
        "title": "Backend Developer (Java)",
        "description": """
Enterprise uygulamalar için Java Backend Developer arıyoruz.

Aranan Nitelikler:
- 4+ yıl Java deneyimi
- Spring Boot framework
- Hibernate/JPA
- RESTful web servisleri
- MySQL veya PostgreSQL
- Maven veya Gradle
- Unit ve integration testing

Tercih Sebepler:
- Mikroservis mimarisi
- Message queue sistemleri (Kafka, RabbitMQ)
- Apache Camel bilgisi

Sunduklarımız:
- Kariyer gelişim planı
- Performans bonusu
"""
    },
    {
        "title": "Full Stack Developer",
        "description": """
Hem frontend hem backend geliştirebilecek Full Stack Developer arıyoruz.

Aranan Nitelikler:
- React veya Vue.js frontend deneyimi
- Node.js veya Python backend deneyimi
- SQL ve NoSQL veritabanları
- REST API tasarımı
- Git versiyon kontrolü
- Cloud deployment (AWS/GCP/Azure)

Tercih Sebepler:
- TypeScript
- Docker
- GraphQL
- WebSocket implementasyonu

Sunduklarımız:
- Çeşitli projeler
- Hızlı kariyer ilerlemesi
"""
    },
    {
        "title": "QA Engineer",
        "description": """
Kalite güvence süreçlerini yönetecek QA Engineer arıyoruz.

Aranan Nitelikler:
- 3+ yıl QA deneyimi
- Manuel ve otomatik test deneyimi
- Selenium veya Cypress
- API testing (Postman, RestAssured)
- Test case yazımı ve yönetimi
- Bug tracking araçları (Jira)
- Agile metodoloji bilgisi

Tercih Sebepler:
- Performance testing (JMeter, k6)
- Security testing bilgisi
- Mobile testing deneyimi

Sunduklarımız:
- Test araçları lisansları
- Sertifika destekleri
"""
    },
    {
        "title": "Product Manager",
        "description": """
Ürün geliştirme süreçlerini yönetecek Product Manager arıyoruz.

Aranan Nitelikler:
- 3+ yıl ürün yönetimi deneyimi
- Agile/Scrum metodolojileri
- Kullanıcı araştırması ve analizi
- Road map planlama
- Stakeholder yönetimi
- Veri odaklı karar verme
- Teknik ekiplerle çalışma deneyimi

Tercih Sebepler:
- B2B SaaS deneyimi
- SQL bilgisi
- A/B testing deneyimi

Sunduklarımız:
- Product konferansları
- Liderlik eğitimleri
"""
    },
    {
        "title": "UI/UX Designer",
        "description": """
Kullanıcı deneyimi odaklı tasarımlar yapacak UI/UX Designer arıyoruz.

Aranan Nitelikler:
- 3+ yıl UI/UX tasarım deneyimi
- Figma, Sketch veya Adobe XD
- Wireframe ve prototip oluşturma
- Design system geliştirme
- Kullanıcı araştırması
- A/B test ve kullanılabilirlik testleri
- Responsive ve mobile-first tasarım

Tercih Sebepler:
- Motion design
- Frontend geliştirme bilgisi
- Accessibility standartları

Sunduklarımız:
- Design araçları lisansları
- Tasarım konferansları
"""
    },
    {
        "title": "Machine Learning Engineer",
        "description": """
ML modellerini production'a alacak ML Engineer arıyoruz.

Aranan Nitelikler:
- Python ve ML framework'leri (TensorFlow, PyTorch)
- Model training ve optimization
- MLOps ve model deployment
- Docker ve Kubernetes
- Cloud ML servisleri (SageMaker, Vertex AI)
- Feature engineering
- Model monitoring

Tercih Sebepler:
- NLP veya Computer Vision
- Real-time inference sistemleri
- A/B testing framework'leri

Sunduklarımız:
- GPU cluster erişimi
- Araştırma bütçesi
"""
    },
    {
        "title": "Cyber Security Analyst",
        "description": """
Güvenlik sistemlerini yönetecek Security Analyst arıyoruz.

Aranan Nitelikler:
- 3+ yıl siber güvenlik deneyimi
- Network güvenliği
- Penetration testing
- SIEM araçları
- Incident response
- Güvenlik standartları (ISO 27001, SOC 2)
- Linux ve Windows güvenliği

Tercih Sebepler:
- CEH, CISSP, OSCP sertifikaları
- Cloud security
- Malware analizi

Sunduklarımız:
- Güvenlik araçları
- Sertifika destekleri
"""
    },
    {
        "title": "Database Administrator",
        "description": """
Veritabanı sistemlerini yönetecek DBA arıyoruz.

Aranan Nitelikler:
- 4+ yıl DBA deneyimi
- PostgreSQL ve MySQL
- Performance tuning
- Backup ve recovery stratejileri
- High availability yapılandırması
- Database security
- Query optimization

Tercih Sebepler:
- NoSQL veritabanları (MongoDB, Redis)
- Cloud veritabanları (RDS, Cloud SQL)
- Data replication

Sunduklarımız:
- 7/24 destek rotasyonu
- Veritabanı eğitimleri
"""
    },
    {
        "title": "Technical Writer",
        "description": """
Teknik dokümantasyon hazırlayacak Technical Writer arıyoruz.

Aranan Nitelikler:
- 2+ yıl teknik yazarlık deneyimi
- API dokümantasyonu
- Kullanıcı kılavuzları
- Markdown ve docs-as-code
- Yazılım geliştirme süreçleri bilgisi
- İngilizce yazma becerisi

Tercih Sebepler:
- Developer portal deneyimi
- Video tutorial hazırlama
- Yazılım geliştirme deneyimi

Sunduklarımız:
- Flexible çalışma
- Yazarlık araçları
"""
    },
    {
        "title": "Site Reliability Engineer",
        "description": """
Sistem güvenilirliğini sağlayacak SRE arıyoruz.

Aranan Nitelikler:
- 4+ yıl SRE veya DevOps deneyimi
- Linux sistem yönetimi
- Kubernetes ve container orchestration
- Monitoring ve alerting (Prometheus, PagerDuty)
- Incident management
- Automation scripting
- SLO/SLI/SLA tanımlama

Tercih Sebepler:
- Chaos engineering
- Cost optimization
- Multi-cloud deneyimi

Sunduklarımız:
- On-call rotasyonu için ek ücret
- Cloud sertifikasyonları
"""
    },
    {
        "title": "Blockchain Developer",
        "description": """
Web3 projelerinde çalışacak Blockchain Developer arıyoruz.

Aranan Nitelikler:
- Solidity ile smart contract geliştirme
- Ethereum ve EVM compatible chainler
- Web3.js veya Ethers.js
- DeFi protokolleri bilgisi
- Security audit best practices
- JavaScript/TypeScript

Tercih Sebepler:
- NFT marketplace deneyimi
- Layer 2 çözümleri
- Rust (Solana) bilgisi

Sunduklarımız:
- Token incentives
- Web3 konferansları
"""
    },
    {
        "title": "Scrum Master",
        "description": """
Agile süreçleri yönetecek Scrum Master arıyoruz.

Aranan Nitelikler:
- 3+ yıl Scrum Master deneyimi
- Certified Scrum Master (CSM) veya benzeri
- Agile metodolojileri (Scrum, Kanban)
- Jira ve Confluence
- Sprint planlama ve retrospektif
- Stakeholder yönetimi
- Coaching ve mentoring

Tercih Sebepler:
- Scaled Agile (SAFe)
- Birden fazla takım yönetimi
- Yazılım geliştirme background'u

Sunduklarımız:
- Agile eğitimleri
- Sertifika destekleri
"""
    },
    {
        "title": "Cloud Architect",
        "description": """
Cloud altyapısını tasarlayacak Cloud Architect arıyoruz.

Aranan Nitelikler:
- 5+ yıl cloud deneyimi
- AWS veya Azure çözüm mimarisi
- Infrastructure as Code (Terraform)
- Mikroservis ve serverless mimariler
- Security ve compliance
- Cost optimization
- High availability ve disaster recovery

Tercih Sebepler:
- Multi-cloud stratejileri
- AWS Solutions Architect sertifikası
- FinOps deneyimi

Sunduklarımız:
- Cloud sertifikasyon desteği
- Mimari toplantıları
"""
    },
    {
        "title": "AI/NLP Engineer",
        "description": """
Doğal dil işleme projeleri için NLP Engineer arıyoruz.

Aranan Nitelikler:
- Python ve NLP kütüphaneleri (spaCy, NLTK, Hugging Face)
- Transformer modelleri (BERT, GPT)
- Text classification, NER, sentiment analysis
- LLM fine-tuning ve prompt engineering
- API geliştirme (FastAPI)
- Vector database (Pinecone, Weaviate)

Tercih Sebepler:
- Türkçe NLP deneyimi
- Chatbot geliştirme
- RAG sistemleri

Sunduklarımız:
- OpenAI API credits
- Araştırma zamanı
"""
    },
    {
        "title": "Embedded Systems Developer",
        "description": """
IoT ve gömülü sistemler için Developer arıyoruz.

Aranan Nitelikler:
- C/C++ programlama
- Mikrodenetleyiciler (ARM, ESP32, STM32)
- RTOS deneyimi
- Donanım-yazılım entegrasyonu
- Protokoller (I2C, SPI, UART, MQTT)
- Debug ve test araçları

Tercih Sebepler:
- PCB tasarım bilgisi
- Bluetooth/WiFi stack
- Linux embedded

Sunduklarımız:
- Donanım lab erişimi
- Prototip bütçesi
"""
    }
]

def seed_jobs():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Önce employer hesabı var mı kontrol et
    cursor.execute("SELECT id FROM users WHERE role='employer' LIMIT 1")
    employer = cursor.fetchone()

    if not employer:
        # Employer hesabı oluştur
        hashed = bcrypt.hashpw("123456".encode("utf-8"), bcrypt.gensalt())
        cursor.execute("""
            INSERT INTO users (email, password, role, full_name, company_name)
            VALUES (?, ?, 'employer', 'Matchify HR', 'Matchify Tech')
        """, ("employer@test.com", hashed.decode("utf-8")))
        employer_id = cursor.lastrowid
        print(f"Employer hesabı oluşturuldu: employer@test.com / 123456")
    else:
        employer_id = employer[0]
        print(f"Mevcut employer kullanılıyor: ID {employer_id}")

    # Mevcut iş ilanlarını temizle (opsiyonel)
    cursor.execute("DELETE FROM jobs")
    print("Mevcut iş ilanları temizlendi.")

    # İş ilanlarını ekle
    for job in JOBS:
        cursor.execute("""
            INSERT INTO jobs (employer_id, title, description)
            VALUES (?, ?, ?)
        """, (employer_id, job["title"], job["description"].strip()))

    conn.commit()
    conn.close()

    print(f"\n✅ {len(JOBS)} adet iş ilanı başarıyla eklendi!")
    print("\nEklenen pozisyonlar:")
    for i, job in enumerate(JOBS, 1):
        print(f"  {i}. {job['title']}")

if __name__ == "__main__":
    seed_jobs()
