# Temuan - Keamanan Sesi (JWT) dan Autentikasi

Status: **sebagian sudah diimplementasikan**. Bab 3 dan 5 tetap dipakai sebagai
catatan temuan serta rencana; pencatatannya ada di bagian 10.

Dokumen terkait: `PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md`,
`RENCANA_Hari_Efektif_Kehadiran.md`, `README.md`

---

## 1. Ringkasan Eksekutif

Sistem memakai autentikasi buatan sendiri, tanpa framework auth. Library yang
dipakai hanya `jose` untuk JWT HS256 dan `zod` untuk validasi form. Seluruh
logika token berada di satu berkas 60 baris: `src/lib/auth/session.ts`.

Struktur dasarnya sudah benar. Lapisannya lengkap (proxy, layout, halaman,
server action), cookie memakai `httpOnly` dan `sameSite`, dan kunci rahasia
tidak ikut ter-*commit* ke git. Yang bermasalah adalah detail yang tidak
terlihat dari bagan alur: satu baris *fallback* yang membuat aplikasi
diam-diam memakai kunci tanda tangan yang tertulis di repositori, dan beberapa
tempat di mana logout tidak benar-benar mengakhiri sesi.

Dua temuan bersifat kritis karena keduanya membuka jalan masuk tanpa
kredensial yang benar.

| Kategori | Kritis | Tinggi | Sedang | Rendah |
|---|---|---|---|---|
| Sesi dan token (S) | 1 | 3 | 3 | 3 |
| Otorisasi (A) | 0 | 2 | 1 | 1 |
| Kredensial dan login (K) | 1 | 2 | 2 | 1 |
| **Total** | **2** | **7** | **6** | **5** |

Prioritas pengerjaan: **S-01** dan **K-01** lebih dulu, karena keduanya menutup
celah yang tidak bergantung pada kondisi deployment. Setelah itu **K-03**
(login tanpa pembatasan percobaan), lalu **S-02** dan **S-03** (sesi tidak
bisa dicabut).

---

## 2. Arsitektur Sesi Saat Ini

> **Catatan.** Bagian 2 sampai 5 menjelaskan kondisi kode **sebelum** perbaikan dan
> sengaja dibiarkan apa adanya sebagai dasar analisis. Nomor baris, nama fungsi, dan
> kutipan kode di bagian ini tidak lagi cocok dengan implementasi sekarang.
> Untuk status setiap temuan setelah perbaikan, lihat **Bagian 10**.

### 2.1 Alur login

```
Login form
  --> login() Server Action              auth/actions.ts:18
        1. Zod validasi form              auth/actions.ts:9-12
        2. getDb() 15 SELECT *            db/store.ts:68-93
        3. cocokkan password (SHA-256)    auth/password.ts:4
        4. cek status_aktif NONAKTIF      auth/actions.ts:43
        5. createSession()                auth/session.ts:39
             SignJWT HS256, exp 7d        auth/session.ts:17-23
             Set-Cookie: session=...      auth/session.ts:42-48
        6. audit log "LOGIN"              auth/actions.ts:55-63
```

### 2.2 Alur setiap request

```
Request
  |
  |-- (1) src/proxy.ts:16-17   baca cookie, jwtVerify
  |        tanpa sesi --> redirect /login            proxy.ts:26-28
  |        sudah login di /login --> redirect /dashboard   proxy.ts:20-22
  |
  |-- (2) (protected)/layout.tsx:10-11   requireAuth() + getMenusForRole()
  |
  |-- (3) tiap halaman                   requireRoute("/path")   dal.ts:21-27
  |
  `-- (4) tiap Server Action            hasPermission(user, kode)  dal.ts:55-63
```

Lapisan (1) hanya memeriksa *kehadiran* sesi yang valid. Otorisasi per role
sengaja ditunda ke lapisan (3) dan (4). Ini memang sesuai
`PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md:246`, karena `proxy.ts` berjalan
di Node.js runtime dan tidak cocok untuk query otorisasi.

### 2.3 Isi token

| Field | Sumber | Keterangan |
|---|---|---|
| `userId` | `user.id` | dipakai `dal.ts:12` untuk mengambil user dari DB |
| `nama` | `user.nama` | ditampilkan di topbar, ditulis ke audit log |
| `roleId` | `user.role_id` | tidak dipakai untuk otorisasi |
| `roleName` | `role.nama_role` | tampilan saja |
| `expiresAt` | - | **tidak pernah diisi** (lihat S-09) |

Token ditandatangani, bukan dienkripsi. `nama` dan `roleName` bisa dibaca
siapa pun yang memegang cookie, karena base64url bukan rahasia.

Yang membuat token ini cukup aman: otorisasi **tidak pernah** mempercayai
`roleId` di dalam token. `hasPermission` dan `hasRouteAccess` selalu membaca
role dari database (`dal.ts:56` dan `dal.ts:61`).isi token hanya dipakai untuk
mengambil user, lalu selebihnya diambil ulang dari DB (`dal.ts:12`).

### 2.4 Properti cookie

| Atribut | Nilai | Penilaian |
|---|---|---|
| `httpOnly` | `true` | benar, JavaScript tidak bisa membaca token |
| `sameSite` | `"lax"` | benar, memblokir POST lintas situs |
| `secure` | `COOKIE_SECURE === "true"` | **dimatikan di LAN tanpa TLS** (S-08) |
| `path` | `"/"` | benar |
| `domain` | tidak diisi | benar, host-only sehingga lebih ketat |
| `maxAge` | 604800 detik (7 hari) | duplikat dari `setExpirationTime("7d")` (S-05) |

Tidak ada `localStorage`, `sessionStorage`, atau `document.cookie` di mana pun
dalam `src/`. Token hanya hidup di cookie.

---

## 3. Temuan

> **Catatan.** Uraian, bukti, dan nomor baris di bawah ini menggambarkan kondisi
> **sebelum** perbaikan. Temuan yang sudah ditangani ditandai di **Bagian 10**
> dan tidak diulang per temuan di sini.

### 3.1 Sesi dan token

---

#### S-01 - Fallback `SESSION_SECRET` hardcoded di repositori

**Risiko: KRITIS** | Tipologi: CWE-798 (Use of Hard-coded Credentials)

**Lokasi** - `src/lib/auth/session.ts:5-7`

```ts
const SECRET =
  process.env.SESSION_SECRET ?? "nesaciba-dev-secret-change-in-production";
const encodedKey = new TextEncoder().encode(SECRET);
```

**Bukti** - Operator `??` memakai nilai kedua hanya bila variabel lingkungan
tidak ter-set. Tidak ada validasi panjang, tidak ada `throw`, dan tidak ada
peringatan di log. `.env.example:1-7` mendokumentasikan `SESSION_SECRET`,
tetapi bila operator melewatkan baris itu, aplikasi tetap berjalan normal.

**Dampak** - Dengan kunci yang tertulis di `session.ts:6`, siapa pun bisa
membuat cookie `session` sendiri yang ditandatangani HS256 memakai kunci itu.
Isi payload bebas: `roleId: "role-superadmin"` langsung memberi akses penuh.
Tidak perlu menebak password dan tidak perlu mencuri apa pun dari server.
Serangan ini bekerja di instalasi mana pun yang `SESSION_SECRET`-nya kosong,
termasuk instalasi produksi.

Bandingkan dengan `src/lib/db/connection.ts:9-14`, yang **melempar error** bila
`DATABASE_URL` kosong. Dua variabel rahasia diperlakukan berbeda.

**Catatan tambahan** - `.env` sudah benar di-*gitignore* (`.gitignore:34`), jadi
secret yang sebenarnya tidak ikut ter-*commit*. Yang bocor hanya nilai
*fallback*-nya, bukan kunci asli. Namun itu tetap cukup, karena nilai *fallback*
yang sengaja ditulis untuk keperluan pengembangan menjadi kunci produksi bila
environment lupa diisi.

---

#### S-02 - Logout hanya menghapus cookie; sesi tidak bisa dicabut

**Risiko: TINGGI** | Tipologi: CWE-613 (Insufficient Session Expiration)

**Lokasi** - `src/lib/auth/session.ts:51-54`, dipanggil dari
`src/lib/auth/actions.ts:84`

```ts
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
```

**Bukti** - Tidak ada tabel `Session` di `src/lib/db/schema.sql`. Tabel yang
ada 15 buah: `Role`, `User`, `Permission`, `Menu`, `Route`, `RolePermission`,
`RoleMenu`, `RoleRoute`, `Angkatan`, `Kelas`, `Siswa`, `MataPelajaran`,
`NilaiSiswa`, `KehadiranSiswa`, `AuditLog`. Tidak ada blacklist `jti`. Tidak
ada `token_version` pada `User`. Mengganti `SESSION_SECRET` adalah satu-satunya
cara mematikan sesi semua pengguna, dan itu mematikan sesi **semua** pengguna
termasuk yang sedang aktif.

**Dampak** - Token yang sudah keluar dari browser (log browser bersama, salin
cookie dari devtools, cookie yang terbaca di LAN tanpa TLS) tetap **valid
sampai 7 hari** meski pengguna sudah menekan tombol logout.

**Yang sudah benar** - Entri audit `LOGOUT` ditulis *sebelum* cookie dihapus
(`auth/actions.ts:73-82`), jadi logout tercatat. Yang tercatat berbeda dengan
yang ditegakkan.

---

#### S-03 - Akun yang dinonaktifkan tetap aktif

**Risiko: TINGGI** | Tipologi: CWE-613

**Lokasi** - `src/lib/auth/dal.ts:8-13`

```ts
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSession();
  if (!session) return null;
  const db = await getDb();
  return db.users.find((u) => u.id === session.userId) ?? null;
});
```

**Bukti** - `status_aktif` diperiksa **hanya** di `auth/actions.ts:43`, yaitu
saat login. `getCurrentUser` mengambil ulang baris `User` dari database, jadi
data pengguna memang disegarkan, tetapi kolom `status_aktif` tidak pernah
diperiksa lagi.

**Dampak** - Superadmin menonaktifkan akun yang hilang atau dibobol
(`src/lib/admin/actions.ts:107` menyediakan aksi ini). Akun itu **tetap bisa
masuk** memakai cookie lama sampai tokennya kedaluwarsa, maksimal 7 hari. Ini
membatalkan tujuan utama fitur `status_aktif`, yaitu mencabut akses secara
instan.

Perbaikannya satu baris di `dal.ts:12` dan menutup S-03 sepenuhnya.

---

#### S-04 - Ganti password tidak menginvalidasi sesi berjalan

**Risiko: TINGGI**

**Lokasi** - `src/lib/auth/actions.ts:149-179` (`resetUserPassword`),
`src/lib/admin/actions.ts:83` (buat user)

**Bukti** - `resetUserPassword` hanya mengubah `user.password_hash`
(`admin/actions.ts:168`) lalu memanggil `persist`. Tidak ada nilai pada baris
`User` yang naik saat token, sehingga token yang sudah terbit tidak berubah
statusnya.

**Dampak** - Reset password adalah tindakan standar setelah insiden kebocoran
kredensial. Dalam sistem ini, reset **tidak** menutup akses dari token lama.
Sesi yang sudah ada tetap bekerja sampai 7 hari. Satu-satunya jalan adalah
logout manual di semua perangkat, yang tidak selalu diketahui pengguna.

---

#### S-05 - Masa berlaku 7 hari, konstanta diduplikasi, tanpa perpanjangan

**Risiko: SEDANG**

**Lokasi** - `src/lib/auth/session.ts:21` dan `:47`

```ts
.setExpirationTime("7d")        // baris 21
...
maxAge: 60 * 60 * 24 * 7,       // baris 47
```

**Bukti** - Dua nilai yang harus sinkron, ditulis di dua tempat, tidak
dihubungkan oleh satu konstanta. Tidak ada *sliding session* (token tidak
diperpanjang saat aktif) dan tidak ada *refresh token* terpisah.

**Dampak** - Ada dua konsekuensi. Pertama, tidak ada pembeda antara sesi
"baru login" dan "sudah hidup seminggu" saat menilai risiko token. Kedua,
nilai 7 hari tercatat sebagai keputusan di beberapa tempat
(`PRD_..._v1.0.md:48`, `:79`, `:252`, dan `README.md`), sehingga mengubahnya
berarti menyinkronkan beberapa dokumen sekaligus.

Catatan: `SessionPayload.expiresAt` (`session.ts:14`) terlihat seperti sumber
nilai kedaluwarsa, padahal tidak pernah diisi. Lihat S-09.

---

#### S-06 - Payload JWT tidak divalidasi dan tanpa `jti`

**Risiko: SEDANG** | Tipologi: CWE-347 (Improper Verification of
Cryptographic Signature)

**Lokasi** - `src/lib/auth/session.ts:30-33`

```ts
const { payload } = await jwtVerify(session, encodedKey, {
  algorithms: ["HS256"],
});
return payload as unknown as SessionPayload;
```

**Bukti** - `jwtVerify` sudah memverifikasi tanda tangan dan kedaluwarsa dengan
benar. Yang belum ada: validasi bentuk payload (Zod atau manual), pemeriksaan
klaim `iss`, `aud`, dan `sub`, serta klaim `jti`. TypeScript dinonaktifkan oleh
dbl-cast `as unknown as`, sehingga field yang tidak ada di token dianggap
bertipe valid.

**Dampak** - Tidak ada lapis kedua yang menahan payload buatan. Dampaknya
saling menutup: payload rusak menghasilkan `session.userId` bernilai `undefined`
sehingga `dal.ts:12` mengembalikan `null`, sedangkan payload dengan `roleId`
fiktif tetap lolos ke otorisasi. Kasus kedua sebenarnya masih aman karena
otorisasi selalu membaca role dari database, tetapi S-01 membuat siapa pun bisa
membuat token bertanda tangan sah dengan isi sekehendaknya.

Tidak adanya `jti` juga membuat S-02 mustahil diselesaikan tanpa perubahan
skema.

---

#### S-07 - Semua kegagalan verifikasi ditelan tanpa jejak

**Risiko: RENDAH**

**Lokasi** - `src/lib/auth/session.ts:34-36`

```ts
} catch {
  return null;
}
```

**Bukti** - `catch` tanpa binding membuang alasan gagalnya. Tidak ada log dan
tidak ada penghitung. Token kedaluwarsa, tanda tangan palsu, dan kunci yang
salah bercampur menjadi `null` yang identik.

**Dampak** - Sulit membedakan "pengguna logout normal" dari "ada percobaan
pemalsuan token" saat menelusuri insiden. Untuk aplikasi sekolah dengan 3 akun
dan akses LAN, dampaknya kecil. Yang hilang adalah kemampuan auditing.

---

#### S-08 - Cookie dikirim tanpa TLS di jaringan sekolah

**Risiko: TINGGI** (konteks deployment) | Tipologi: CWE-319 (Cleartext
Transmission of Sensitive Information)

**Lokasi** - `src/lib/auth/session.ts:44`

```ts
secure: process.env.COOKIE_SECURE === "true",
```

**Bukti** - `.env.example:5-7` menyatakan ini disengaja: "Biarkan kosong/false
jika diakses via HTTP (mis. LAN sekolah tanpa TLS)". `.env` saat ini berisi
`COOKIE_SECURE=false`, dan `README.md:40` perpetuate nilai yang sama.

**Dampak** - Pada deployment LAN yang memang begitu, cookie `session` dikirim
dalam teks biasa. Kombinasi ini dengan S-02 menghasilkan skenario yang nyata:
token yang tertangkap di jaringan, atau terbaca dari cache perantara, masih
berlaku meski pengguna logout.

Atribut `httpOnly` **tidak** menolong di sini. `httpOnly` melindungi dari
JavaScript, bukan dari pembacaan jaringan.

---

#### S-09 - Penamaan menyesatkan dan field mati

**Risiko: RENDAH** (kualitas kode, bukan kerentanan langsung)

**Lokasi** - `src/lib/auth/session.ts:14` dan `:17`

```ts
export interface SessionPayload {
  userId: string;
  nama: string;
  roleId: string;
  roleName: string;
  expiresAt: string;      // tidak pernah diisi
}

export async function encrypt(payload: Omit<SessionPayload, "expiresAt">) {
```

**Bukti** - Fungsi bernama `encrypt` sebenarnya **menandatangani**
(`SignJWT`). Tidak ada enkripsi sama sekali. `.env.example:1` juga menyebut
kunci ini "Kunci JWT untuk enkripsi cookie sesi", yang memperkuat kesan bahwa
enkripsi diasumsikan pembaca. `Omit<..., "expiresAt">` ada justru karena
`encrypt` tidak pernah mengisi field itu.

**Dampak** - Nama yang salah akan menyesatkan. Pengembang yang membaca
`encrypt` dan `decrypt` mungkin mengira token tidak terbaca, lalu menaruh data
sensitif tambahan di dalam payload. `expiresAt` yang selalu `undefined`
menggoda pembaca kode untuk memakainya sebagai pemeriksaan kedaluwarsa yang
sebenarnya sudah ditangani `jose`.

---

#### S-10 - Tidak ada pengujian untuk modul autentikasi

**Risiko: SEDANG**

**Lokasi** - `src/lib/auth/` berisi `actions.ts`, `dal.ts`, `password.ts`, dan
`session.ts`. **Tidak ada** `*.test.ts` di sana.

**Bukti** - `README.md:84-95` mencantumkan berkas uji yang ada:
`normalize.test.ts`, `write.test.ts`, `validate.test.ts`, `mapel-resolver.test.ts`,
`apply.test.ts`, `siswa-search.test.ts`, dan `statistics.test.ts`. Tidak satu pun
menyentuh auth.

**Dampak** - Modul yang paling kritis tanpa pengujian otomatis. Perbaikan pada
S-01, S-05, atau S-06 tidak punya jaring pengaman. README sendiri menyebut
alasan modul uji dibuat murni (tanpa I/O, tanpa `"use server"`), sedangkan
`session.ts` punya `import "server-only"` di baris 1, jadi perlu ekstraksi
fungsi murni agar bisa diuji.

---

### 3.2 Otorisasi

---

#### A-01 - `hasRouteAccess` gagal terbuka (fail-open)

**Risiko: TINGGI** | Tipologi: CWE-862 (Missing Authorization)

**Lokasi** - `src/lib/auth/dal.ts:65-75`

```ts
export async function hasRouteAccess(
  roleId: string,
  path: string,
  db: Database
): Promise<boolean> {
  const route = db.routes.find((r) => r.path === path);
  if (!route) return true;        // baris 71
  return db.role_routes.some(
    (rr) => rr.role_id === roleId && rr.route_id === route.id
  );
}
```

**Bukti** - Path yang tidak terdaftar di tabel `Route` otomatis **diberi akses
ke semua role**. Tabel `Route` diisi oleh `src/lib/db/seed-postgres.ts:80-103`
dan dikelola lewat menu `/admin/routes` (`src/lib/admin/actions.ts`). Artinya
keamanan route bergantung pada kelengkapan tabel yang bisa diedit operator.

**Dampak** - Kesalahan konfigurasi gagal diam-diam ke arah yang paling longgar.
Halaman yang terlupa didaftarkan akan terlihat **normal** bagi superadmin
(yang memang punya akses di semua route) dan **tidak terlihat** bagi siapa pun,
termasuk saat pengujian. Selain itu, `/api/siswa/[id]` tidak ada di tabel
`routes`, lihat A-03.

Baris ini berlawanan dengan dokumentasi Next.js 16
(`node_modules/next/dist/docs/01-app/02-guides/data-security.md:339`) yang
menyatakan verifikasi otorisasi harus dilakukan di dalam setiap Server
Function, bukan mengandalkan lapisan di luar. Lapisannya memang ada; yang
bermasalah adalah nilai *default*-nya.

---

#### A-02 - Metode HTTP diabaikan saat cek akses route

**Risiko: SEDANG**

**Lokasi** - `src/lib/auth/dal.ts:70` (pencarian),
`src/lib/db/schema.sql:78-83` (tabel `Route`)

**Bukti** - Tabel `Route` punya kolom `method` (divalidasi `GET|POST|PUT|DELETE`
di `admin/actions.ts:50`) dan di-*seed* berbeda-beda per baris
(`seed-postgres.ts:81-102`). Namun `hasRouteAccess` hanya mencocokkan
`r.path === path` dan mengabaikan `r.method` sepenuhnya.

**Dampak** - Grant `GET /master` untuk suatu role secara implisit berarti grant
untuk method apa pun pada path tersebut. Karena `requireRoute(path)` dijalankan
dengan path saja, pemanggil tidak punya cara untuk membedakan. Saat ini
dampaknya terbatas karena `requireRoute` hanya dipakai di halaman; akan menjadi
masalah begitu endpoint dengan method berbeda memakai helper ini.

---

#### A-03 - Route API tanpa pemeriksaan permission

**Risiko: TINGGI** | Tipologi: CWE-862

**Lokasi** - `src/app/api/siswa/[id]/route.ts:15-19`

```ts
export async function GET(_req: Request, { params }: Params) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
```

**Bukti** - Tiga masalah sekaligus di berkas ini.

1. Hanya `requireAuth()`, tidak ada `hasPermission`. Bandingkan dengan
   `src/app/api/import/template/route.ts:19-23` yang sudah benar:
   `requireAuth()` **plus** `hasPermission(user, "import.execute")` dengan 403.
2. Cabang `if (!user)` di baris 17-19 adalah **kode mati**. `requireAuth()`
   bertipe `Promise<User>`; saat user tidak ada ia memanggil `redirect("/login")`
   yang bertipe `never` (`dal.ts:15-19`). `user` tidak pernah bernilai falsy.
   Artinya pengecekan 401 yang terlihat di sana tidak pernah tereksekusi.
3. `/api/siswa/[id]` tidak terdaftar di tabel `routes`
   (`seed-postgres.ts:80-103`), sehingga secara formal A-01 sudah meloloskannya
   untuk semua role.

**Dampak** - Setiap pengguna yang sudah login dapat mengambil **rekap nilai dan
kehadiran lengkap** siswa mana pun melalui endpoint ini. Role `role-guru`
disebut read-only di seed (`seed-postgres.ts:140`), dan ini memang read, tetapi
read yang **sempurna** ke data siswa yang seharusnya dibatasi per role. Data
yang dikembalikan meluas: `nilaiRaw`, `kehadiranRaw`, `rekapPerSemester`, dan
`peringkatPerSemester` (baris 54-67).

---

#### A-04 - `serverActions.allowedOrigins` tidak dikonfigurasi

**Risiko: RENDAH** (bergantung pada deployment)

**Lokasi** - `next.config.ts` (5 baris, `const nextConfig: NextConfig = {}`)

**Bukti** - Dokumentasi Next.js 16
(`node_modules/next/dist/docs/01-app/02-guides/data-security.md:552-563`)
menyebut `serverActions.allowedOrigins` sebagai pengaturan tambahan untuk
pemeriksaan `Origin` dan `Host` ketika aplikasi berada di belakang reverse proxy
atau CDN dengan domain publik berbeda. Repositori ini belum menyetelnya.

**Dampak** - Tidak berpengaruh selama aplikasi diakses langsung, karena
pemeriksaan `Origin` dan `Host` bawaan framework sudah aktif. Tetapkan begitu
ada reverse proxy.

---

### 3.3 Kredensial dan login

---

#### K-01 - Password di-hash dengan SHA-256 tanpa salt

**Risiko: KRITIS** | Tipologi: CWE-916 (Use of Password Hash With Insufficient
Computational Effort)

**Lokasi** - `src/lib/auth/password.ts` (seluruh berkas, 5 baris)

```ts
import { createHash } from "node:crypto";

export function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
```

**Bukti** - SHA-256 satu kali, tanpa salt, tanpa iterasi, dan tanpa *memory
hardness*. SHA-256 adalah digest umum, bukan fungsi derivasi password. Tidak
ada `bcrypt`, `argon2`, `scrypt`, atau `pbkdf2` di `package.json` maupun di
`node_modules/`.

Konsekuensi langsung dari tidak adanya salt: dua pengguna dengan password sama
menghasilkan hash identik. Hal ini terlihat di seed, di mana `HASH_ADMIN`
(`src/lib/db/seed-postgres.ts:8-9`) dipakai bersama oleh
`operator@nesaciba.sch.id` dan `guru@nesaciba.sch.id`.

Pemakaian ada di 3 tempat: `auth/actions.ts:40` (verifikasi login),
`admin/actions.ts:83` (buat user), dan `admin/actions.ts:168` (reset password).
Penyimpanan di kolom `password_hash TEXT` (`schema.sql:57`).

**Dampak** - Dua jalur serangan terbuka.

- *Offline*: bila tabel `User` bocor, setiap hash dapat dipecahkan dengan
  orde 10^8 percobaan per detik per GPU. Tanpa salt, tabel pelength
  (*rainbow table*) berhasil untuk semua pengguna sekaligus.
- *Online*: tidak ada pembatasan percobaan (K-03) dan kebijakan password hanya 4
  karakter (K-04), sehingga keduanya saling melengkapi.

**Status** - Ini **tidak** unbekaretim. `README.md:135-136` dan
`PRD_..._v1.0.md:79` sama-sama menyebutnya batasan yang diketahui, dengan
argon2 atau bcrypt sebagai "fase lanjutan". Yang belum ada adalah rencana
bertahap yang menjaga kompatibilitas, lihat bagian 5.

---

#### K-02 - Perbandingan tidak timing-safe dan tanpa jalur upgrade

**Risiko: SEDANG** | Tipologi: CWE-208 (Observable Timing Discrepancy)

**Lokasi** - `src/lib/auth/actions.ts:40`

```ts
if (!user || user.password_hash !== hashPassword(password)) {
```

**Bukti** - Dua hal dalam satu baris. Pertama, operator `!==` membandingkan
string; perbandingan string dapat keluar lebih awal pada byte pertama yang
berbeda, dan `timingSafeEqual` dari `node:crypto` tidak dipakai di mana pun
dalam repositori. Kedua, tidak ada jalur *upgrade-on-login*: ketika skema atau
algoritma berubah, hash SHA-256 yang ada tidak pernah di-rehash menjadi bentuk
yang lebih kuat.

**Dampak** - Timing attack pada kredensial memerlukan presisi tinggi dan
banyak percobaan, sehingga dampaknya lebih teori daripada praktik. Yang lebih
penting adalah ketiadaan jalur upgrade: tanpa itu, K-01 tidak bisa diperbaiki
tanpa memaksa semua pengguna reset password sekaligus.

---

#### K-03 - Login tanpa pembatasan percobaan maupun lockout

**Risiko: TINGGI** | Tipologi: CWE-307 (Improper Restriction of Excessive
Authentication Attempts)

**Lokasi** - `src/lib/auth/actions.ts:18-67` (seluruh fungsi `login`)

**Bukti** - Pencarian di seluruh `src/` untuk
`rate.?limit|RateLimit|attempt|lockout|throttle|brune` tidak menemukan berkas
maupun fungsi. Tabel `User` (`schema.sql:54-61`) tidak punya kolom percobaan
gagal. Tidak ada CAPTCHA, tidak ada jeda, tidak ada *backoff*. Setiap POST ke
`/login` langsung dibandingkan.

Penguatnya, `login` memanggil `getDb()` (`auth/actions.ts:35`) yang menjalankan
**15 `SELECT *`** penuh dari seluruh tabel (`db/store.ts:68-93`). Menurut angka
cakupan data di `RENCANA_Hari_Efektif_Kehadiran.md:171-180`, `NilaiSiswa`
memiliki 11.726 baris dan `KehadiranSiswa` 1.086 baris, dengan total 13.197
baris di seluruh tabel. Satu tebakan password berarti satu pembacaan penuh
database.

**Dampak** - Halaman login dapat ditebak tanpa batas. Pasangan yang lemah
(`admin` dengan `admin`, lihat K-05) jatuh dalam hitungan detik. Beban per
percobaan juga menjadikan endpoint ini vektor penyalahgunaan yang lebih serius
daripada sekadar tebakan password: satu penyerang dapat menambah beban
database tanpa berhasil terautentikasi.

Dokumentasi Next.js 16 sendiri menutup hal ini sebagai catatan produksi
(`node_modules/next/dist/docs/01-app/02-guides/production-checklist.md:102`).

---

#### K-04 - Kebijakan password hanya 4 karakter

**Risiko: SEDANG**

**Lokasi** - `src/lib/admin/actions.ts:28` dan `:158`

```ts
password: z.string().min(4, "Password minimal 4 karakter"),
...
.min(4, "Password minimal 4 karakter")
```

**Bukti** - Validasi di dua tempat (buat user dan reset password), keduanya
hanya batas bawah panjang. Tidak ada syarat kompleksitas, tidak ada batas atas
panjang, dan tidak ada daftar password yang diblokir. Bandingkan `nama` yang
memakai `.trim().min(2)`; justru validator password yang paling longgar.

**Dampak** - Menggabungkan ruang tebakan yang kecil dengan hash lemah (K-01) dan
tanpa pembatasan percobaan (K-03): `abcd` adalah password yang valid. Pada
aplikasi ini batas bawah 4 karakter mungkin dipilih agar operator tidak
kesulitan, tetapi hasil bersihnya adalah seluruh perlindungan bertumpu pada
K-01 dan K-03, yang keduanya sudah lemah.

---

#### K-05 - Password akun default tertulis di repositori dan README

**Risiko: TINGGI** (operasional)

**Lokasi** - `src/lib/db/seed-postgres.ts:4-9`, `README.md:60-68`

**Bukti** - Hash dan teks aslinya ada berdampingan di berkas seed:

```ts
// sha256("26adm0828")
export const HASH_SUPERADMIN =
  "f4e1906a47b30e2f266c0d843661994812d532a9286af45c1b158c04eaf07b6e";
// sha256("admin")
export const HASH_ADMIN =
  "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
```

`README.md:68` menambahkan catatan "Ganti password di produksi", sehingga
langkah itu menjadi opsional.

**Dampak** - Untuk deployment yang mengikuti `README.md` apa adanya, `admin`
adalah password yang valid untuk dua akun, dan `26adm0828` untuk akun
superadmin. Pasangan ini tidak berguna bila sudah diganti, tetapi cukup satu
operator yang melewatkan langkah tersebut. Kombinasi K-01, K-03, dan K-05
membuat penemuan ini hampir pasti berhasil bila dicoba.

---

#### K-06 - Login memuat seluruh database hanya untuk mencari satu user

**Risiko: RENDAH** (kinerja, bukan otorisasi)

**Lokasi** - `src/lib/auth/actions.ts:35-38`, `src/lib/db/store.ts:68-93`

**Bukti** - `getDb()` memetakan 15 tabel sekaligus, lalu `login` melakukan
pencarian linear di atas array `users` yang sudah terambil. Pola yang sama
terjadi di setiap server action modul lain.

**Dampak** - Bukan kerentanan, tetapi memperbesar dampak K-03: setiap tebakan
password membebani database sebesar itu. Memperbaikinya K-03 otomatis menutup
sebagian besar masalah di sini, jadi tidak perlu langkah tersendiri.

---

### 3.4 Proteksi CSRF

Tidak ditemukan kode CSRF kustom. Pencarian `csrf|CSRF|x-csrf|Referer|Origin`
di `src/` tidak menghasilkan apa pun selain false positive pada class CSS di
`src/components/ui/select.tsx:72`. Tidak ada token dan tidak ada validasi header
manual.

**Penilaian: memadai untuk kondisi saat ini.** Semua operasi mutasi melewati
Server Action, yang dilindungi tiga lapis bawaan framework.

| Lapis | Sumber |
|---|---|
| Hanya POST yang boleh memanggil Server Action | `data-security.md:546-548` |
| Pembandingan `Origin` dengan `Host` (atau `X-Forwarded-Host`) otomatis | `data-security.md:550` |
| `SameSite=lax` mencegah cookie dikirim pada POST lintas situs | `session.ts:45` |

Dua catatan. Pertama, `serverActions.allowedOrigins` belum diset, lihat A-04,
dan itu relevan bila ada reverse proxy. Kedua, `GET /api/import/template`
(`src/app/api/import/template/route.ts`) adalah pembacaan yang tidak memeriksa
`Origin`, dan `sameSite=lax` mengizinkan `GET` lintas situs pada navigasi tingkat
atas. Dampaknya rendah, tetapi tidak nol.

---

## 4. Yang Sudah Benar

Bagian ini sengaja dicatat, karena beberapa di antaranya merupakan keputusan
arsitektur yang tepat dan tidak boleh hilang saat refactor.

| Aspek | Bukti |
|---|---|
| `httpOnly: true`, token tidak bisa dibaca JavaScript | `session.ts:43` |
| `sameSite: "lax"`, memblokir POST lintas situs | `session.ts:45` |
| Cookie host-only karena `domain` tidak diisi | `session.ts:42-48` |
| Nol penyimpanan token di sisi klien | pencarian `localStorage` dan `document.cookie` di `src/` kosong |
| Allowlist algoritma `algorithms: ["HS256"]` menutup serangan `alg: none` | `session.ts:31` |
| Rahasia asli tidak ikut ter-*commit* | `.gitignore:34` untuk `.env*` |
| `DATABASE_URL` diverifikasi saat boot | `connection.ts:9-14` |
| Pesan login tidak membocorkan keberadaan akun | `actions.ts:41` "Email atau password salah" |
| Urutan pemeriksaan benar: user dan password menyatu, baru `status_aktif` | `actions.ts:40` lalu `:43` |
| Otorisasi diulang di setiap Server Action, bukan hanya di layout | `admin/actions.ts:12-18`, `import/actions.ts:30-36`, `siswa/actions.ts:17-23`, `master/actions.ts:42-43` |
| `proxy.ts` menggantikan `middleware.ts` sesuai Next.js 16 | `src/proxy.ts`; `proxy.md:11` |
| User di-*hydrate* ulang dari DB tiap request, bukan mempercayai payload | `dal.ts:12` |
| Otorisasi selalu membaca role dari DB, bukan dari `roleId` di token | `dal.ts:56` dan `:61` |
| Audit `LOGIN` dan `LOGOUT` tercatat | `actions.ts:55-63` dan `:73-82` |
| Aksi mutasi tercatat lewat `pushAudit` | `src/lib/audit.ts:13-22` |
| Superadmin terakhir tidak dapat dihapus | `admin/actions.ts:131-134` |
| Akun yang sedang login tidak dapat dihapus atau dinonaktifkan sendiri | `admin/actions.ts:107` dan `:129` |
| Email duplikat ditolak saat pembuatan user | `admin/actions.ts:75-77` |
| `email` punya batasan `UNIQUE` | `schema.sql:55-57` |

---

## 5. Rencana Perbaikan

> **Catatan.** Ini adalah rencana awal. Langkah 1, 3, 4, 5, 6, dan 8 sudah
> dikerjakan; Langkah 2 dan 7 masih tertunda karena menyangkut skema database
> dan penggantian algoritma hash. Status lengkap ada di **Bagian 10**.

### Urutan pengerjaan

```
Langkah 1 (S-01)   -->  Langkah 7 (K-01, K-02)
                        Catatan: urutan tetap didahulukan, lihat catatan di bawah.

Langkah 3 (K-03)   -->  Langkah 4 (A-01, A-02)
                        Prasyarat: inventaris ulang tabel Route

Langkah 5 (A-03)

Langkah 2 (S-02, S-03, S-04)   sentuh skema database, setelah 1 dan 3 masuk
Langkah 6 (S-05, S-06, S-08, S-09)   bisa kapan saja, tidak merusak
Langkah 8 (test dan dokumentasi)   menyertai setiap langkah
```

Langkah 1, 3, 4, dan 5 tidak saling bergantung dan menutup kerentanan yang
paling mungkin dieksploitasi, sehingga layak dikerjakan lebih dulu sebelum
Langkah 2 yang menyentuh skema database.

Langkah 7 terlihat seperti perbaikan terbesar, tetapi menundanya memang
memiliki alasan. Memindahkan seluruh pengguna ke argon2 tanpa jalur bertahap
akan membuat semua orang harus reset password pada hari yang sama, persis ketika
S-01 sedang diperbaiki. Urutan 1, 3, 4, 5 dulu, baru 7.

---

### Langkah 1 - Validasi `SESSION_SECRET` (S-01)

Berkas: `src/lib/auth/session.ts:5-7`

Hapus operator `??` beserta nilai literalnya, dan terapkan validasi yang sama
seperti di `connection.ts:9-14`:

```ts
const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET tidak terkonfigurasi atau terlalu pendek. " +
      "Minimal 32 karakter. Lihat .env.example."
  );
}
const encodedKey = new TextEncoder().encode(secret);
```

Syarat panjang minimum 32 karakter itu sendiri sudah menutup kelas bug yang
sama pada `COOKIE_SECURE` (S-08): nilai yang lupa diisi tidak lagi bisa lolos
diam-diam sebagai nilai yang tidak berbahaya.

`README.md:36-42` perlu menambahkan `SESSION_SECRET` ke daftar langkah setup
sebagai **wajib**, bukan sekadar contoh baris yang diberi nilai.

---

### Langkah 2 - Invalidasi sesi (S-02, S-03, S-04)

Pecah menjadi dua bagian karena risikonya berbeda.

#### 2a. Perbaikan satu baris (S-03)

Berkas: `src/lib/auth/dal.ts:8-13`

Tambahkan pemeriksaan `status_aktif` pada `getCurrentUser`, tepat setelah baris
yang mengambil user:

```ts
const user = db.users.find((u) => u.id === session.userId);
if (!user || user.status_aktif === "NONAKTIF") return null;
```

Tidak ada perubahan skema. Menonaktifkan akun langsung mencabut akses pada
request berikutnya.

#### 2b. Versi token (S-02, S-04)

Tambahkan kolom pada tabel `User`:

```sql
token_version INTEGER NOT NULL DEFAULT 1
```

Berkas yang **wajib** ikut berubah. Melompat satu akan merusak data.

| Berkas | Perubahan |
|---|---|
| `src/lib/db/schema.sql:54-61` | kolom baru pada `CREATE TABLE "User"` |
| `src/lib/db/migrations/002_token_version.sql` | **baru**: `ALTER TABLE "User" ADD COLUMN ...`, plus bagian rollback |
| `src/lib/db/migrations/README.md` | tambahkan baris `002` di tabel Urutan, tambahkan perintah rollback, perbarui tabel "Catatan hasil eksekusi" |
| `src/lib/db/types.ts:14-21` | `token_version: number` pada `interface User` |
| `src/lib/db/write.ts:38` | kolom `token_version` **wajib masuk** array `columns` |
| `src/lib/db/seed-postgres.ts` | nilai 1 untuk ketiga user |

> **Peringatan khusus `write.ts`.** `persist()` menulis ulang seluruh tabel
> (`TRUNCATE ... CASCADE` lalu insert ulang dalam satu transaksi,
> `README.md:137-139`). Daftar kolom ada di `write.ts:38`. Kolom yang ada di
> skema tapi **tidak** terdaftar di sana akan dihapus setiap kali `persist()`
> dipanggil, lalu kembali ke nilai `DEFAULT`, sehingga `token_version` selalu
> kembali ke 1 dan fitur ini diam-diam tidak berfungsi.

Kolom `token_version` dibaca di `getCurrentUser` dan dibandingkan dengan nilai
yang disimpan di dalam token. `resetUserPassword` (`admin/actions.ts:168`)
menaikkan nilainya, sehingga seluruh sesi pengguna itu mati seketika.

Memilih `token_version` daripada tabel `Session` adalah pilihan sadar: tabel
`Session` membutuhkan pembersihan berkala, sedangkan satu integer per pengguna
tidak. Untuk 3 akun sekolah, keduanya tidak perlu; `token_version` memiliki
permukaan kegagalan yang lebih kecil.

---

### Langkah 3 - Pembatasan percobaan login (K-03, sebagian K-06)

Perlu keputusan arsitektur lebih dulu, lihat bagian 8 butir 3.

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| Tabel `LoginAttempt` di PostgreSQL | Konsisten dengan arsitektur `getDb()` dan `persist()`; tahan restart | Butuh penulisan ke DB per percobaan gagal; tabel ikut di-*truncate* tiap `persist()` sehingga butuh jalur tulis terpisah |
| Penghitung in-memory (`Map`) | Sederhana, tanpa I/O | Hilang saat restart; tidak berbagi antar instance; reset pada setiap deploy |
| Keduanya: in-memory plus audit | Cepat dan ada jejak | Dua sumber kebenaran |

Rekomendasi: mulai dengan penghitung in-memory, tambahkan pencatatan ke
`audit_log` untuk percobaan gagal memakai mekanisme yang sudah ada di
`src/lib/audit.ts:13-22`. Setelah itu perbaiki sumber beratnya: jangan memuat
seluruh database untuk mencari satu user. Batasi `SELECT` pada tabel `User` saja
untuk jalur login.

---

### Langkah 4 - `hasRouteAccess` gagal tertutup (A-01, A-02)

> **Prasyarat: inventaris ulang tabel `Route`.** Mengubah baris 71 menjadi
> fail-closed akan **mengunci** setiap halaman yang path-nya belum terdaftar di
> tabel `Route`. Tabel diisi dari `seed-postgres.ts:80-103` dan dapat diedit
> lewat `/admin/routes`.
>
> Daftar halaman yang memanggil `requireRoute` saat ini, 13 buah: `/dashboard`,
> `/kelas`, `/siswa`, `/preview`, `/import`, `/akademik`, `/master`, `/audit`,
> `/admin/users`, `/admin/roles`, `/admin/permissions`, `/admin/menus`,
> `/admin/routes`.
>
> Yang **tidak** ada di tabel `routes`: `/api/siswa/[id]`. Path ini memang
> seharusnya diamankan (A-03), bukan dibuka.
>
> Catatan pengujian: `/dashboard` perlu diperiksa terpisah. Superadmin punya
> akses ke semua route, sehingga kekosongan di sana tidak akan terlihat saat
> pengujian.

Berkas: `src/lib/auth/dal.ts:65-75`

```ts
export async function hasRouteAccess(
  roleId: string,
  path: string,
  method: string,
  db: Database
): Promise<boolean> {
  const route = db.routes.find((r) => r.path === path);
  if (!route) return false;                       // fail-closed
  if (route.method !== method) return false;      // A-02
  return db.role_routes.some(
    (rr) => rr.role_id === roleId && rr.route_id === route.id
  );
}
```

`requireRoute` (`dal.ts:21-27`) perlu menerima dan meneruskan `method`, dengan
nilai default `"GET"` agar 13 pemanggilan lama tetap kompilasi tanpa perubahan.

---

### Langkah 5 - Permission di route API (A-03)

Berkas: `src/app/api/siswa/[id]/route.ts:15-19`

Buang cabang mati `if (!user)`, karena `requireAuth()` tidak pernah mengembalikan
`null` (`dal.ts:15-19`) dan `redirect()` sudah menanganinya. Tambahkan
pemeriksaan permission dengan pola yang sama seperti
`src/app/api/import/template/route.ts:19-23`:

```ts
const user = await requireAuth();
if (!(await hasPermission(user, "siswa.read"))) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

Daftarkan juga `/api/siswa/[id]` pada tabel `Route` dengan `method = 'GET'`
agar konsisten setelah A-01 diperbaiki.

---

### Langkah 6 - Hardening cookie dan token (S-05, S-06, S-08, S-09)

Berkas: `src/lib/auth/session.ts`

**Satu konstanta TTL (S-05)** agar `setExpirationTime` dan `maxAge` tidak bisa
berbeda:

```ts
const SESI_MASAK_BERLAKU_HARI = 7;
const SESI_MASAK_BERLAKU_MS = SESI_MASAK_BERLAKU_HARI * 24 * 60 * 60 * 1000;
```

Bila nilainya tetap 7 hari, **dokumentasikan alasannya sebagai keputusan** di
jalur yang dipakai operator, bukan hanya di dalam kode.

**`secure` default `true` (S-08)** dengan opt-out yang disengaja dan berlapis,
agar cookie non-TLS tetap bisa dipakai di LAN:

```ts
secure: process.env.COOKIE_SECURE !== "false",
```

Perhatikan arah pembalikan. `!== "false"` berarti variabel yang kosong (lupa
diisi) menghasilkan `true`, lebih aman daripada sekarang, di mana `=== "true"`
membuat kelupaan berarti `false`.

**Prefiks `__Host-`** agar browser menolak cookie yang bocor ke subdomain. Ini
menuntut `secure: true`, jadi **terikat** dengan butir di atas: jangan pasang
`__Host-` selama cookie masih mungkin non-TLS.

**Validasi payload (S-06)** dengan Zod yang sudah jadi dependensi:

```ts
const SessionPayloadSchema = z.object({
  userId: z.string(),
  nama: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  tokenVersion: z.number().int(),
});
```

Hilangkan dbl-cast `as unknown as` (`session.ts:33`) dan samakan nilainya dengan
`null` seperti sekarang.

**Bersihkan penamaan (S-09)**: `encrypt` menjadi `sign`, `decrypt` menjadi
`verifySession`. Nama `decrypt` sudah bermasalah karena verify mengembalikan
payload, bukan hasil dekripsi. Hapus `expiresAt` dari interface
(`session.ts:14`) beserta `Omit<...>` di baris 17, 39, dan
`auth/actions.ts:48`. Perbarui juga `.env.example:1` yang menyebut enkripsi
menjadi penandatanganan.

**Catat alasan kegagalan (S-07)** bersifat opsional dan memerlukan keputusan
soal data yang boleh masuk log. Jangan pernah mencatat isi token dalam kondisi
apa pun.

---

### Langkah 7 - Password hashing yang layak (K-01, K-02, K-04)

> **Jangan dikerjakan lebih dulu.** Alasannya ada di catatan urutan pengerjaan
> di atas.

Berkas: `src/lib/auth/password.ts`

Ganti isi berkas dengan tiga operasi eksplisit, bukan lagi satu fungsi yang
menyamakan dua hal berbeda:

```ts
verifyPassword(password: string, stored: string): boolean;   // Format lama dan baru
hashPassword(password: string): string;                      // Selalu format baru
needsRehash(stored: string): boolean;                       // Untuk upgrade-on-login
```

Format hash baru **harus** self-describing: awali dengan penanda seperti
`$argon2id$...` dan `$sha256$...`, sehingga `verifyPassword` dapat mengenali
yang mana yang dipakai tanpa menebak, dan kedua format dapat hidup berdampingan.

Alur *upgrade-on-login* di `auth/actions.ts:40-45`:

```ts
if (!user || !verifyPassword(password, user.password_hash)) {
  return { error: "Email atau password salah" };
}
if (needsRehash(user.password_hash)) {
  user.password_hash = hashPassword(password);   // rehash diam-diam
  await persist(db);                              // ikut transaksi audit yang sama
}
```

Tambahkan juga:

- `timingSafeEqual` untuk perbandingan yang membutuhkannya (K-02).
- Batas bawah password 8 karakter di `admin/actions.ts:28` dan `:158` (K-04).
  Naikkan bertahap dengan pesan error yang jelas agar operator tidak terkunci
  pada data lama.

---

### Langkah 8 - Pengujian dan sinkronisasi dokumen (S-10)

Perintah: `npm test`, `npm run lint`, `npm run typecheck`.

Berkas baru `src/lib/auth/password.test.ts`. Fungsi murni tanpa I/O, langsung
bisa diuji:

- `verifyPassword` menerima hash SHA-256 yang benar dan menolak yang salah.
- `needsRehash` bernilai `true` untuk SHA-256 dan `false` untuk argon2.
- `hashPassword` menghasilkan dua hash berbeda untuk password yang sama, bukti
  bahwa salt bekerja.
- `verifyPassword` menolak string yang bentuknya rusak.

Berkas baru `src/lib/auth/session.test.ts` perlu penyesuaian: `session.ts`
memakai `import "server-only"` (baris 1) dan `next/headers`, jadi pindahkan
fungsi murni (TTL, validasi payload, format penamaan) ke modul tanpa
`server-only`, misalnya `src/lib/auth/token.ts`, lalu `session.ts` mengimpor
dari sana. Ini sekaligus membuat unit yang diuji dapat diuji.

- Payload tanpa `userId` ditolak.
- Token bertanda tangan dengan `alg` selain HS256 ditolak.
- `SESSION_SECRET` kosong melempar error.

Dokumen yang perlu disinkronkan setelah perubahan:

| Berkas | Bagian |
|---|---|
| `README.md:135-136` | "Catatan Batasan", ganti setelah K-01 selesai |
| `README.md:60-68` | tabel akun default, ganti password default di `seed-postgres.ts` |
| `README.md:36-42` | langkah setup `.env`, jadikan `SESSION_SECRET` wajib |
| `PRD_..._v1.0.md:48`, `:79`, `:252` | deskripsi sesi 7 hari dan hash SHA-256 |
| `PRD_..._v1.0.md:283` | butir "Peningkatan Keamanan Password", tandai selesai |
| `PRD_..._v1.0.md:272` | tabel teknologi, ganti "Enkripsi/verifikasi sesi JWT" menjadi "Penandatanganan" |
| `src/lib/db/migrations/README.md` | register migrasi `002` |

---

## 6. Di Luar Cakupan

- **TLS atau reverse proxy di jaringan sekolah.** Menyelesaikan S-08 sepenuhnya
  adalah pekerjaan infrastruktur, bukan perubahan aplikasi. Yang dikerjakan di
  sini hanya membuat cookie aman secara default saat TLS tersedia.
- **Two-factor authentication.** Tidak sebanding dengan masalah yang ada, dan
  tidak akan menutupi password yang lemah.
- **Refresh token atau perpanjangan sesi otomatis.** S-05 menunjukkan bahwa TTL
  7 hari adalah keputusan tingkat produk, bukan bug. Jika diubah, persoalan
  invalidasi (Langkah 2) menjadi lebih penting, bukan lebih ringan.
- **Perubahan tampilan di halaman login** dan halaman mana pun.
- **Manajemen `routes` dan `permissions` lewat UI.** Tidak perlu diubah; yang
  bermasalah adalah nilai *default* di `dal.ts:71`, bukan UI pengaturnya.

---

## 7. Risiko dari Perubahan

| Risiko | Mitigasi |
|---|---|
| Langkah 2b: `token_version` lupa dimasukkan ke `write.ts:38` sehingga nilainya selalu kembali ke 1 dan fitur mati tanpa error | Migration memakai `CHECK` sementara; verifikasi manual dengan satu user yang di-*reset* lalu cek token lamanya ditolak |
| Langkah 4: fail-closed mengunci halaman yang belum terdaftar di `Route` | Inventaris 13 path lebih dulu; uji dengan **role `role-guru`** yang paling sedikit hak aksesnya, bukan superadmin |
| Langkah 4: `requireRoute` butuh argumen `method` baru | Beri nilai default `"GET"` agar 13 pemanggilan lama tidak perlu diubah |
| Langkah 7: argon2 memutus login semua pengguna pada hari yang sama | Upgrade-on-login dan format self-describing; jangan pernah menghapus jalur SHA-256 sebelum dipastikan semua user sudah login ulang |
| Langkah 7: argon2 butuh sekitar 50-100 ms per verifikasi, sementara `getDb()` tetap dipanggil sekali per percobaan | Tetapkan parameter memory dan time yang wajar; ukur setelah Langkah 3 mengurangi beban database |
| Langkah 6: prefiks `__Host-` menolak cookie bila `secure: false` | Pasang `__Host-` hanya setelah `COOKIE_SECURE` yang kosong menghasilkan `true`; uji di LAN non-TLS sebelum deploy |
| Langkah 1: melempar error membuat aplikasi gagal start di instalasi yang `SESSION_SECRET`-nya kosong | Itu memang perilaku yang diinginkan, lebih baik gagal start daripada berjalan dengan kunci yang ada di repo. Tulis jelas di `README.md` langkah setup |
| Langkah 3: penghitung in-memory hilang saat restart | Diterima untuk versi pertama; catat di dokumen sebagai batasan, bukan disembunyikan |

---

## 8. Keputusan yang Masih Menunggu

1. **Masa berlaku sesi 7 hari.** Perlu dipertahankan? Angka ini muncul di
   beberapa dokumen. Untuk operator yang memakai satu perangkat bersama per
   shift, 7 hari terlalu lama. Untuk guru yang memakai HP sendiri, terlalu
   pendek. Butuh satu keputusan, lalu Langkah 6 menyinkronkan semua dokumen.

2. **`COOKIE_SECURE` di jaringan sekolah.** Benarkah akan ada deployment HTTP
   tanpa TLS? Bila ya, `secure: false` harus tetap bisa dipakai, dan
   konsekuensinya (S-02, S-08) harus diterima secara sadar, bukan dibiarkan.
   Bila tidak, `secure: true` dapat menjadi tanpa kondisi.

3. **Penyimpanan pembatasan percobaan.** In-memory, tabel PostgreSQL, atau
   keduanya? Lihat Langkah 3. Untuk server sekolah tunggal, in-memory cukup;
   pilihan tabel konsisten dengan arsitektur data yang ada tetapi menambah jalur
   tulis.

4. **Rute mana yang perlu didaftarkan lebih dulu** sebelum A-01 menjadi
   fail-closed. Tabel `Route` saat ini diisi oleh seed dan dapat diedit operator.
   Setelah langkah ini, akibatnya berubah dari "tidak terlihat" menjadi
   "mengunci akses".

---

## 9. Rujukan

Dokumen dalam repositori:

- `PRD_Dashboard_Akademik_SMPN1_Cibalong_v1.0.md:48`, `:79`, `:229`, `:246`,
  `:252`, `:272`, `:283` - deskripsi autentikasi yang perlu disinkronkan
- `README.md:36-42`, `:60-68`, `:84-95`, `:135-136` - setup, akun default,
  pengujian, batasan
- `RENCANA_Hari_Efektif_Kehadiran.md:165-184` - angka cakupan data yang dipakai
  pada analisis dampak K-03
- `src/lib/db/migrations/README.md` - konvensi migrasi manual yang dipakai pada
  Langkah 2b

Dokumentasi framework, tersedia di `node_modules/next/`:

- `next/dist/docs/01-app/02-guides/data-security.md:286-291` - Server Actions dan
  penghapusan kode mati; tetap harus dianggap dapat dipanggil lewat POST
- `next/dist/docs/01-app/02-guides/data-security.md:339` - verifikasi otorisasi
  di dalam setiap Server Function
- `next/dist/docs/01-app/02-guides/data-security.md:546-563` - proteksi CSRF
  bawaan dan `allowedOrigins`
- `next/dist/docs/01-app/02-guides/production-checklist.md:102` - pembatasan
  laju
- `next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md:11` dan
  `:217-219` - penggantian `middleware.ts` oleh `proxy.ts` di Next.js 16

Standar:

- **CWE-798** - Use of Hard-coded Credentials (S-01)
- **CWE-613** - Insufficient Session Expiration (S-02, S-03)
- **CWE-916** - Use of Password Hash With Insufficient Computational Effort (K-01)
- **CWE-307** - Improper Restriction of Excessive Authentication Attempts (K-03)
- **CWE-862** - Missing Authorization (A-01, A-03)
- **CWE-347** - Improper Verification of Cryptographic Signature (S-06)
- **CWE-208** - Observable Timing Discrepancy (K-02)
- **CWE-319** - Cleartext Transmission of Sensitive Information (S-08)
- RFC 7519 - JSON Web Token, klaim `jti`, `iss`, `aud`, dan `sub`
- OWASP Password Storage Cheat Sheet - argon2id sebagai pilihan utama

---

## 10. Catatan Implementasi

Status per temuan setelah perbaikan pertama (Bagian 1-6 tetap sebagai catatan
analisis kondisi awal dan sudah diberi penanda; yang berubah hanya statusnya).

| Temuan | Status | Bukti |
|---|---|---|
| S-01 | **Selesai** | `token.ts` `resolveSessionSecret` melempar error bila kosong atau < 32 karakter; nilai cadangan di dalam kode dihapus |
| S-02 | Belum | `token_version` tetap fase lanjutan (butuh migrasi + kolom di `write.ts:38`) |
| S-03 | **Selesai** | `dal.ts` `getCurrentUser` memeriksa `status_aktif`; akun yang dinonaktifkan langsung kehilangan akses |
| S-04 | Belum | menyertai S-02 |
| S-05 | **Selesai** | `SESSION_TTL_HARI` di `token.ts` dibaca `session.ts` untuk `setExpirationTime` maupun `maxAge` |
| S-06 | **Selesai** | `SessionPayloadSchema` (Zod) menggantikan dbl-cast; field di luar skema dibuang |
| S-07 | Sebagian | `catch` tetap devuelve `null` tanpa log, sesuai keputusan tidak mencatat isi token |
| S-08 | **Selesai** | `resolveCookieSecure` menolak nilai selain `true`/`false`; LAN tanpa TLS tetap bisa memakai `false` secara sadar |
| S-09 | **Selesai** | `encrypt` menjadi `sign`, `decrypt` menjadi `verifySession`, `expiresAt` dihapus, `.env.example` menyebut penandatanganan |
| S-10 | Sebagian | `token.test.ts`, `route-access.test.ts`, `login-throttle.test.ts`, `password-policy.test.ts`; `password.test.ts` menyertai K-01 |
| A-01 | **Selesai** | `canAccessRoute` fail-closed; bypass `role-superadmin` mencegah self-lockout |
| A-02 | **Selesai** | `method` ikut dibandingkan; `requireRoute(path, method = "GET")` |
| A-03 | **Selesai** | `/api/siswa/[id]` memakai `hasPermission(user, "siswa.read")`; cabang 401 yang merupakan kode mati dihapus |
| A-04 | Belum | tetap bergantung pada ada/tidaknya reverse proxy |
| K-01 | **Ditunda** | sengaja ditahan untuk tahap capstone; lihat Bagian 5, Langkah 7 |
| K-02 | **Ditunda** | menyertai K-01 |
| K-03 | **Selesai** | `login-throttle.ts`: 5 percobaan per akun dan 20 per IP per 15 menit, di memori |
| K-04 | **Selesai** | `password-policy.ts`: 8-72 karakter, dipakai bersama oleh form, server action, dan seed |
| K-05 | **Selesai** | seed membaca `SEED_*` dari `.env`; tidak ada hash maupun teks password di repositori |
| K-06 | **Selesai** | `getUserByEmail` membaca satu baris; `getDb()` penuh dipanggil setelah password cocok |

### Catatan yang tidak ada di atas

1. **Seed tidak berlaku untuk database yang sudah terisi.** `getDb()` melakukan
   seed hanya bila tabel `Role` masih kosong. Karena itu
   `002_api_siswa_route.sql` wajib dijalankan manual pada instalasi lama;
   perubahan pada `seed-postgres.ts` tidak menggantikannya.
2. **Halaman yang tidak terdaftar di `Route` akan terkunci.** Fail-closed
   mengubah konsekuensi kesalahan dari "tidak terlihat" menjadi "mengunci
   akses". Daftarkan setiap halaman baru di `seed-postgres.ts` **dan** migrasi.
3. **Prefiks `__Host-` belum dipasang.** Prefiks itu menuntut `secure: true`,
   sedangkan aplikasi masih mungkin berjalan di LAN tanpa TLS.
4. **Percobaan login gagal tidak masuk audit log.** `pushAudit` + `persist()`
   menulis ulang seluruh tabel, sehingga mencatat setiap kegagalan akan menambah
   beban database yang justru sedang dibatasi. Penguatan audit log adalah bagian
   dari capstone.
5. **Validasi `SESSION_SECRET` dilakukan saat pertama kali dipakai**, bukan saat
   modul diimpor, supaya `next build` tidak gagal pada mesin yang `.env`-nya
   belum diisi.
6. **Batas per IP pada throttle bergantung pada `X-Forwarded-For`**, yang bisa
   dipalsukan tanpa reverse proxy. Penghitung per akun tidak bergantung pada itu
   dan tetap menjadi gerbang utama.
7. **`SEED_*` hanya dibaca saat tabel `Role` kosong.** Mengisi ulang `.env` tidak
   mengubah password akun yang sudah ada. Untuk mengganti password pada
   instalasi berjalan, pakai **Manajemen User → ikon kunci** (tersedia untuk
   semua akun, termasuk akun sendiri); jangan memakai `db:reset` karena perintah
   itu men-truncate seluruh tabel. Resep pemulihan manual bila password
   superadmin hilang ada di `README.md`.
8. **Password lama masih berlaku.** Keduanya dulu berbagi satu password, dan
   `26adm0828` untuk superadmin tercantum di riwayat repositori. Keduanya perlu
   diganti lewat dialog reset password. Kebijakan 8 karakter hanya berlaku saat
   password **disetel**, sehingga akun lama tidak terkunci sebelum diganti.
