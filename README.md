# 112 Filo Yönetim Sistemi — Gerçek Web Uygulaması

Bu sürüm tarayıcı `localStorage` kullanmaz. Araç ve servis kayıtları merkezi PostgreSQL veritabanında tutulur.

## PostgreSQL ile hazır kurulum

### Seçenek A — Docker (önerilen)

1. `docker-compose.yml` içindeki örnek parolaları değiştirin.
2. `docker compose up -d --build`
3. Uygulama: `http://SUNUCU-IP:3000`

İlk PostgreSQL oluşturulurken `db/001_schema.sql` ve `db/002_seed_vehicles.sql` otomatik çalışır. Başlangıçtaki 59 araç içeri aktarılır.

### Seçenek B — Hazır PostgreSQL sunucusu

PostgreSQL sunucusunda:

```sql
CREATE DATABASE 112_filo;
```

Sonra:

```bash
psql "$DATABASE_URL" -f db/001_schema.sql
psql "$DATABASE_URL" -f db/002_seed_vehicles.sql
```

Ardından `.env`:

```env
DATABASE_URL=postgresql://KULLANICI:SIFRE@HOST:5432/112_filo
ADMIN_PASSWORD=guclu-bir-parola
SESSION_SECRET=cok-uzun-rastgele-bir-gizli-anahtar
NODE_ENV=production
PORT=3000
```

ve:

```bash
npm ci --omit=dev
npm start
```

## Veritabanı yapısı

- `vehicles`: araç kayıtları
- `services`: bakım/servis kayıtları
- `audit_log`: ileride işlem geçmişi/audit için hazır tablo
- JSONB veri alanları mevcut uygulamadaki Türkçe alan adlarını bozmadan korur.
- Plaka için benzersiz indeks vardır.
- Araç, görev yeri ve servis tarihleri için indeksler vardır.
- `updated_at` otomatik güncellenir.

## Yedekleme

```bash
pg_dump "$DATABASE_URL" > 112_filo_backup.sql
```

Geri yükleme:

```bash
psql "$DATABASE_URL" < 112_filo_backup.sql
```

## Güvenlik

Yönetici parolası veritabanına veya HTML'ye gömülmez; ortam değişkeninden okunur. Üretimde HTTPS, güçlü parola ve uzun/rastgele `SESSION_SECRET` kullanılmalıdır.
