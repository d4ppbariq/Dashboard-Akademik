# DRAFT 2 PROPOSAL CAPSTONE PROJECT

**PENINGKATAN DASHBOARD AKADEMIK NESACIBA: MODUL PERINGATAN DINI AKADEMIK BERBASIS MACHINE LEARNING, PENGUATAN KEAMANAN SISTEM, DAN PENINGKATAN PENGALAMAN PENGGUNA**

**Disusun Oleh (Kelompok 2):**

| Nama | NPM | Kompetensi Keahlian |
|---|---|---|
| Daffa Bariq Suwandi | 237006021 | Informatika dan Sistem Intelegen (ISI) |
| Andi Rafiyan | 237006074 | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) |
| Ayu Barkilah | 237006165 | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) |
| Piki Alpian | 237006004 | Teknologi Multimedia dan Gim (TMG) |

**JURUSAN INFORMATIKA - FAKULTAS TEKNIK - UNIVERSITAS SILIWANGI - 2026**

---

## 1. Tujuan Akhir Proyek

**Tujuan akhir:** menghasilkan peningkatan Dashboard Akademik Nesaciba pada sistem produksi yang sedang dipakai SMPN 1 Cibalong — berupa modul peringatan dini akademik berbasis machine learning (prediksi nilai per siswa untuk semester berikutnya), penguatan keamanan sistem, dan peningkatan pengalaman pengguna (tampilan responsif serta visualisasi hasil prediksi) — tanpa mengubah fitur inti yang sudah berjalan.

Secara rinci, proyek bertujuan:

- Menghasilkan proses feature engineering yang terdokumentasi (nilai per semester, agregat, rasio kehadiran, lag/delta antarsemester, dan encoding kategorikal) dari data Dashboard Akademik Nesaciba, dengan pembagian data berbasis waktu dan tanpa penggunaan fitur dari semester target agar tidak terjadi kebocoran data.
- Menghasilkan model prediksi nilai per siswa (Skenario A1) yang dibandingkan terhadap baseline naif dan divalidasi menurut protokol yang telah dibekukan, menggunakan metrik MAE, RMSE, dan MAPE (serta accuracy, F1-score, dan recall pada pendekatan klasifikasi dengan ambang yang ditetapkan bersama sekolah).
- Merancang dan mengimplementasikan tabel `Prediksi` sebagai lapisan penyimpanan hasil prediksi yang generik, aditif, dan dapat ditelusuri ke skenario serta versi model.
- Memigrasikan skema hash password dari SHA-256 tanpa salt ke bcrypt/argon2 tanpa mengganggu akun yang sudah ada, mengimplementasikan reset password mandiri, membangun RBAC khusus fitur hasil prediksi, memperkuat audit log, dan melakukan audit keamanan dasar mengacu pada OWASP.
- Merancang dan mengimplementasikan tampilan responsif/mobile serta visualisasi kartu "Proyeksi" dengan rentang ketidakpastian, termasuk purwarupa fitur ekspor laporan/rapor.
- Menguji kegunaan hasil prediksi, tampilan responsif, dan alur keamanan baru bersama guru dan operator mitra melalui usability testing dan UAT.

## 2. Kompleksitas Pekerjaan

Pekerjaan ini tergolong kompleks karena beberapa aspek berikut:

- **Integrasi pada sistem produksi yang sudah berjalan.** Modul prediksi dan keamanan ditambahkan di atas sistem yang dipakai nyata oleh sekolah. Seluruh pekerjaan harus berjalan tanpa mengubah skema aplikasi produksi, tanpa mengganggu fitur inti, dan sifatnya anti-regresi terhadap fungsi yang sudah ada.
- **Keterbatasan data dan ketepatan validasi.** Data yang tersedia baru mencakup satu angkatan penuh sehingga evaluasi leave-one-angkatan-out belum dapat dilakukan sepenuhnya. Tim harus memakai strategi split berbasis waktu sebagai fallback, menegakkan aturan anti-leakage, dan membatasi klaim hasil sesuai protokol evaluasi yang dibekukan (hanya "bukti kelayakan" selama data masih satu angkatan).
- **Kerja lintas tiga kompetensi keilmuan.** Hasil prediksi (ISI), pengamanan akses (JKF), dan penyajian visual (TMG) saling bergantung: RBAC dan permission baru untuk fitur prediksi, visualisasi interval keyakinan, dan integrasi di satu basis data yang sama harus berjalan selaras hingga tahap UAT lintas jalur.
- **Migrasi keamanan tanpa merusak akun.** Perpindahan skema hash memerlukan pola upgrade-on-login dan alur reset password mandiri yang aman, ditambah pengujian dan audit keamanan dasar, agar tidak ada akun yang terkunci.
- **Komunikasi hasil ke pengguna non-teknis.** Prediksi bersifat probabilistik; hasil harus disajikan bersama rentang ketidakpastian agar guru tidak memperlakukan angka prediksi sebagai kepastian, sekaligus tetap evaluable dan auditable.

## 3. Manfaat Universal

- **Bagi sekolah (mitra).** Guru dan operator memperoleh kemampuan peringatan dini akademik yang melengkapi dashboard deskriptif yang sudah dipakai, sehingga intervensi terhadap siswa berisiko dapat dilakukan lebih dini; data pribadi siswa terlindungi melalui penguatan keamanan dan kontrol akses.
- **Bagi pengguna sistem secara umum.** Tampilan responsif memungkinkan dashboard diakses dari perangkat seluler; alur reset password mandiri meningkatkan kemandirian pengguna.
- **Bagi komunitas pendidikan dan praktisi.** Proyek menjadi contoh pola nyata menambahkan modul machine learning pada sistem produksi tanpa merusaknya, rancangan tabel hasil prediksi yang generik dan dapat diaudit, serta pertimbangan kelayakan data yang eksplisit dapat ditiru pada sistem akademik lain.
- **Bagi dunia akademik.** Studi kasus penerapan machine learning pada data pendidikan riil jenjang sekolah menengah di Indonesia dengan keterbatasan data, sekaligus kontribusi metodologis dalam merancang lapisan penyimpanan hasil prediksi yang tidak mengganggu operasional sistem.

## 4. Pembagian Peran dan Tugas Masing-Masing Anggota

Tim beranggotakan empat orang dengan latar belakang kompetensi keahlian berbeda; pembagian tugas dirancang agar setiap anggota berkontribusi sesuai kompetensinya secara berkelanjutan sepanjang pelaksanaan proyek.

| Anggota | Kompetensi Keahlian (KK) | Tugas Inti |
|---|---|---|
| Daffa Bariq Suwandi | Informatika dan Sistem Intelegen (ISI) | Membangun model machine learning: ekstraksi dan feature engineering Skenario A1, pelatihan dan evaluasi (Ridge/ElasticNet, leave-one-angkatan-out atau fallback split waktu), perbandingan terhadap baseline naif, dan koordinasi migrasi data historis; merancang skema tabel `Prediksi` bersama JKF. |
| Andi Rafiyan | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) | Keamanan sistem: migrasi skema hash password (SHA-256 ke bcrypt/argon2), implementasi reset password mandiri, perancangan RBAC khusus fitur hasil prediksi, penguatan audit log, serta audit dan pengujian keamanan dasar terhadap sistem yang berjalan. |
| Ayu Barkilah | Jaringan Komputer, Keamanan dan Forensik Digital (JKF) | Mendukung jalur keamanan: migrasi skema hash password, implementasi reset password mandiri, perancangan RBAC khusus fitur hasil prediksi, penguatan audit log, serta audit dan pengujian keamanan dasar | 
| Piki Alpian | Teknologi Multimedia dan Gim (TMG) | Pengalaman pengguna: perancangan dan implementasi tampilan responsif/mobile, desain visualisasi kartu "Proyeksi" (termasuk interval keyakinan) menggunakan Recharts/shadcn/ui, dan purwarupa desain visual fitur ekspor laporan/rapor akademik. |

## 5. Timeline Penyelesaian Pekerjaan

Pelaksanaan pekerjaan berlangsung dalam kurun **setelah UTS hingga sebelum UAS** — dimulai pada **Minggu ke-9** perkuliahan. Tahapan disusun sebagai milestone per dua minggu:

| Kurun Waktu | Kegiatan |
|---|---|
| Minggu 9–10 | Pekan awal pelaksanaan: finalisasi rancangan fitur wide Skenario A1 dan skema tabel `Prediksi` (ISI), rancangan RBAC fitur prediksi dan migrasi hash password (JKF), rancangan tampilan responsif dan kartu "Proyeksi" (TMG); koordinasi migrasi data historis ke sekolah. |
| Minggu 11–12 | Ekstraksi dan feature engineering A1 (ISI); implementasi migrasi hash password dan alur reset password mandiri (JKF); implementasi tampilan responsif tahap awal (TMG); integrasi rancangan visual kartu "Proyeksi". |
| Minggu 13–14 | Pelatihan dan evaluasi model A1 terhadap baseline naif (ISI); penyelesaian RBAC fitur prediksi, penguatan audit log, dan audit keamanan dasar (JKF); integrasi visual kartu "Proyeksi" ke dashboard (TMG). |
| Minggu 15 – menjelang UAS | UAT lintas tiga jalur kerja dengan guru dan operator mitra; perbaikan temuan; finalisasi luaran (laporan teknis, notebook terdokumentasi, laporan audit keamanan); pemantapan manual dan materi diseminasi sebelum presentasi akhir. |

Manajemen proyek, koordinasi migrasi data, dan logbook berjalan sepanjang kurun tersebut.

## 6. Teknologi yang Digunakan

**Lapisan aplikasi web (yang dikembangkan):**

| Area | Teknologi |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) dengan React 19 dan TypeScript |
| Styling & UI | Tailwind CSS v4, komponen shadcn/ui (Card, Dialog, Tabs, Badge, dsb.) |
| Visualisasi | Recharts (donut, grouped/vertical/horizontal bar, line) |
| Autentikasi & sesi | JWT pada cookie `httpOnly` (7 hari) menggunakan `jose`, kunci `SESSION_SECRET` |
| Validasi input | Zod (login, CRUD, impor, konfigurasi RBAC) |
| Impor data | `@e965/xlsx` untuk membaca/template file Excel dan CSV |
| Basis data | PostgreSQL langsung via driver `pg` (`DATABASE_URL`) |
| Administrasi DB | DBeaver (oleh tim pengembang) |

**Lapisan machine learning (berjalan di luar aplikasi):**

| Area | Teknologi |
|---|---|
| Bahasa & pustaka | Python 3, pandas (ekstraksi & fitur), scikit-learn (Ridge/ElasticNet) |
| Opsi lanjutan | XGBoost/LightGBM bila data historis multi-angkatan mencukupi |
| Penyimpanan hasil | Artefak model di luar basis data; hasil dipublikasikan ke tabel `Prediksi` |

**Keamanan:** skema hash bcrypt/argon2 (migrasi dengan pola upgrade-on-login), panduan OWASP.

## 7. Algoritma yang Digunakan

- **Feature engineering:** nilai per mapel per semester yang telah lewat, agregat (rata-rata per mapel), rasio kehadiran, lag/delta antarsemester, dan encoding kategorikal; disusun dalam format wide (satu baris per siswa). Dilarang memakai fitur dari semester/angkatan target (anti-leakage).
- **Model utama:** regresi linier terregularisasi **Ridge/ElasticNet** sebagai learning model yang sederhana dan dapat diinterpretasikan (koefisien tiap fitur dapat dijelaskan), yang dipilih karena cocok untuk data berukuran kecil dengan banyak fitur; bila data bertambah, dibandingkan/ditingkatkan ke **XGBoost** atau **LightGBM**.
- **Baseline naif:** "prediksi = nilai semester sebelumnya". Model baru dinyatakan berguna hanya jika metrik errornya lebih rendah dari baseline ini.
- **Validasi:** pembagian data berbasis waktu; bila tersedia dua angkatan atau lebih, digunakan *leave-one-angkatan-out* (uji pada angkatan yang tidak pernah dilihat saat pelatihan); bila hanya satu angkatan, fallback ke split berbasis waktu di dalam angkatan tersebut dan klaim dibatasi sebagai bukti kelayakan.
- **Evaluasi:** MAE, RMSE, MAPE (regresi); accuracy, F1-score, recall untuk kelas "perlu perhatian" (bila pendekatan klasifikasi digunakan); interval keyakinan via bootstrap; ablasi berurutan dengan seed tetap untuk reproduktibilitas.

## 8. Platform yang Akan Digunakan

- **Aplikasi:** web (browser modern: Chrome, Edge, Firefox), dioptimalkan untuk desktop dan tetap responsif pada tablet/mobile.
- **Server/backend:** Node.js (Next.js) menyatu dengan basis data PostgreSQL.
- **Penyimpanan data:** PostgreSQL; koneksi pipa machine learning menggunakan kredensial read-only agar tidak mengubah data produksi.
- **Penyebaran produksi:** direkomendasikan server milik sekolah atau layanan cloud (keputusan ditetapkan bersama mitra saat UAT/berita acara); seluruh kode dan skema tetap berada kendali penuh pengguna.
- **Alat pendukung:** git untuk kendali versi, DBeaver untuk administrasi basis data, dan Python environment terpisah untuk pipeline machine learning.

## 9. Dataset / Sumber Data dan Informasi Mengenai Data

- **Sumber data:** basis data produksi PostgreSQL Dashboard Akademik Nesaciba SMPN 1 Cibalong (data riil, bukan simulasi), ditambah migrasi data historis angkatan sebelumnya melalui fitur impor Excel yang sudah ada, sesuai ketersediaan data dari sekolah.
- **Struktur data:** skema berjenjang Angkatan ke Kelas ke Siswa; nilai per mata pelajaran per semester (enam semester); rekap kehadiran per siswa per semester; katalog mata pelajaran dengan sejumlah mapel yang berlaku bagi suatu angkatan.
- **Karakteristik:** bersifat panel longitudinal — satu siswa diikuti berulang dari semester ke semester; mapel tanpa data dibedakan tegas dari nilai 0 (aturan `mapelDenganNilai()`), sehingga metrik dan tampilan tidak terdistorsi.
- **Pengelolaan dan etika:** data pribadi siswa dilindungi; pipeline ML membaca dengan kredensial read-only; hanya hasil prediksi yang bernilai yang dipublikasikan ke tabel `Prediksi`; setiap akses/perubahan terekam pada audit log.
- **Batasan informasi:** dokumen ini sengaja tidak mencantumkan jumlah data statis, karena data bersifat dinamis mengikuti musim semester dan migrasi dari sekolah; angka pasti dilaporkan pada laporan teknis saat eksekusi.

## 10. Rancangan Perangkat Lunak / Desain / Mockup

Arsitektur tiga lapis: **aplikasi web (Next.js)** menampilkan data; **basis data PostgreSQL** menyimpan data akademik dan hasil prediksi; **pipeline Python** melatih dan menerbitkan hasil tanpa menyentuh aplikasi.

Alur pengguna:

- Login dengan akun peran (Superadmin, Operator, Guru) → menu dinamis per role (RBAC).
- Dashboard level angkatan/kelas menampilkan statistik deskriptif yang sudah berjalan (distribusi gender, rekap kehadiran, tren nilai, peringkat mapel).
- Guru membuka **Pencarian Siswa** → popup **detail siswa** dengan tab **Nilai** dan **Kehadiran**; pada fase ini ditambahkan tab **"Proyeksi"**.

Desain tab "Proyeksi":

- Tabel prediksi per mata pelajaran untuk semester berikutnya, masing-masing dengan **nilai prediksi** dan **rentang interval keyakinan** (garis/band).
- Keterangan "hasil model - bukan kepastian" dan referensi versi model yang menghasilkan prediksi (traceability).
- Bila model/baseline belum tersedia untuk suatu mapel, muncul placeholder "belum dapat diproyeksikan".

Elemen visual lain: kartu ringkasan proyeksi rata-rata kelas (agregat) sebagai opsi fase lanjutan; tipografi dan skema warna mengikuti design system shadcn/ui yang sudah dipakai. **Mockup visual detail dilampirkan terpisah** (Lampiran Desain); draf ini menuangkannya secara tekstual.

## 11. Rencana dan Skenario Pengujian

| Jalur | Skenario Pengujian |
|---|---|
| ISI — ekstraksi & fitur | Verifikasi format wide benar, tidak ada kolom dari semester target (pemeriksaan leakage), dan pemetaan mapel mengikuti aturan mapel berlaku. |
| ISI — model | Evaluasi kuantitatif A1 (MAE/RMSE/MAPE, atau accuracy/F1/recall) dibandingkan baseline naif; pengulangan pada pembagian data berbasis waktu; uji stabilitas antar-seed. |
| Integritas data | Pengujian tabel `Prediksi`: setiap baris dapat ditelusuri ke skenario, entitas, dan versi model beserta metriknya. |
| JKF — autentikasi | Verifikasi migrasi hash berhasil; akun lama tetap dapat login (skema lama diverifikasi lalu hash diupgrade); uji alur reset password mandiri. |
| JKF — RBAC | Skenario peran tanpa permission `prediksi.read` mencoba mengakses tab "Proyeksi" → akses ditolak; peran dengan permission → akses berhasil. |
| TMG — responsif | Pengujian halaman-halaman utama pada ukuran layar mobile, tablet, dan desktop. |
| Usability & UAT | Skenario guru membuka detail siswa, membaca tab "Proyeksi" beserta interval, dan memberi umpan balik; skenario operator memperbarui data dan memahami alur pembaruan model; umpan balik didokumentasikan dan ditindaklanjuti. |

## 12. Parameter Uji dan Penjelasannya

| Parameter | Definisi / Penjelasan | Target |
|---|---|---|
| MAE / RMSE / MAPE | Ukuran error regresi: rata-rata galat mutlak, akar kuadrat rata-rata galat kuadrat, galat persentase rata-rata. | Lebih rendah dari baseline naif pada skenario evaluasi. |
| Accuracy / F1-score / recall | Metrik klasifikasi untuk deteksi kelas "perlu perhatian"; recall diprioritaskan agar siswa berisiko tidak terlewat. | Ambang ditetapkan bersama sekolah; recall memadai dengan keputusan bersama. |
| Baseline naif | Titik banding sederhana "prediksi = nilai semester sebelumnya". | Model baru dinyatakan berguna hanya jika mengungguli baseline ini. |
| Interval keyakinan | Rentang prediksi (bootstrap CI) yang disertakan pada tampilan agar guru memahami ketidakpastian. | Selalu disertakan pada tab "Proyeksi"; lebar interval dilaporkan. |
| Traceability | Kemampuan menelusuri tiap baris `Prediksi` ke skenario, entitas, versi model, dan metrik. | Seluruh baris dapat ditelusuri (auditable). |
| Kontrol akses RBAC | Permission `prediksi.read` membatasi akses tab "Proyeksi". | Peran tanpa permission tidak dapat mengakses; default diberikan Guru dan Operator. |
| Migrasi hash | Pola upgrade-on-login dari SHA-256 ke bcrypt/argon2. | Akun lama tetap bisa login; hash diperbarui ke skema baru tanpa reset massal. |
| Tampilan responsif | Kemampuan halaman digunakan pada berbagai ukuran layar. | Halaman utama dapat digunakan pada mobile, tablet, dan desktop. |
| UAT | Pengujian penerimaan bersama guru/operator mitra. | Umpan balik terdokumentasi dan menjadi dasar perbaikan. |

## 13. State of the Art (SOTA) dan Daftar Referensi

**State of the Art (SOTA).** Educational Data Mining telah menjadi wilayah riset mapan; ulasan sistematis mutakhir menunjukkan bahwa prediksi performa siswa — termasuk peringatan dini siswa berisiko — umumnya dibangun dari kategori prediktor berupa riwayat nilai, data akademik, dan karakteristik demografis, dengan metode supervised learning yang dominan; klasifikasi lebih sering digunakan tetapi regresi juga dipakai secara luas [3]. Pada data longitudinal sekolah menengah, bukti menunjukkan **prestasi akademik sebelumnya merupakan prediktor terkuat** performa di kemudian hari [4], yang mendukung penggunaan baseline naif "prediksi = nilai semester sebelumnya" dalam proyek ini. Studi pada data nilai (gradebook) sekolah menengah delapan tahun menunjukkan **model linier sederhana mampu menyamai atau mengungguli model ensemble yang lebih kompleks** untuk jenis data ini [5], dan pendekatan model sederhana yang transparan lebih mudah diadopsi guru [5]. Pada data berukuran kecil, metode klasik/ensemble terbukti unggul dibanding deep learning yang justru lebih unggul pada data besar [7,8]; model ensemble seperti XGBoost juga menunjukkan performa kuat secara konsisten [6]. Untuk data yang berubah antar-tahun, pendekatan adaptif serta interpretabilitas model (mis. SHAP) menjadi arah riset aktif [9]. Dalam hal keamanan autentikasi, penyimpanan kata sandi dengan skema hash lambat seperti bcrypt/Argon2 merupakan standar praktik [10,11]; sementara untuk penyajian hasil, visualisasi ketidakpastian membantu pengguna non-teknis menafsirkan prediksi secara tepat [12].

**Posisi proyek.** Proyek ini konsisten dengan SOTA tersebut: memilih model sederhana dan transparan (Ridge/ElasticNet) yang tepat untuk data gradebook skala kecil, mengangkat baseline naif berbasis bukti empiris [4], membatasi klaim sesuai jumlah cohort (bukti kelayakan selama data satu angkatan), menyajikan interval ketidakpastian [12], dan menerapkan pengamanan autentikasi sesuai OWASP [10]. Strategi "berjenjang" (mulai sederhana, naik ke XGBoost/LightGBM bila data bertambah) selaras dengan temuan SLR bahwa pilihan algoritma sangat bergantung pada ukuran dan karakteristik data [3,7].

**Daftar Referensi** (seluruhnya dapat diakses bebas / open access):

1. T. Hastie, R. Tibshirani, and J. Friedman, *The Elements of Statistical Learning: Data Mining, Inference, and Prediction*, 2nd ed. New York, NY, USA: Springer, 2009. [Online]. Available: https://hastie.su.domains/ElemStatLearn/
2. F. Pedregosa et al., "Scikit-learn: Machine learning in Python," *Journal of Machine Learning Research*, vol. 12, pp. 2825–2830, 2011. [Online]. Available: https://www.jmlr.org/papers/v12/pedregosa11a.html
3. K. Alalawi, R. Athauda, and R. Chiong, "Contextualizing the current state of research on the use of machine learning for student performance prediction: A systematic literature review," *Engineering Reports*, 2023. [Online]. Available: https://openresearch.newcastle.edu.au
4. R. Lavelle-Hill et al., "How the predictors of math achievement change over time: A longitudinal machine learning approach," *Journal of Educational Psychology*, 2024. [Online]. Available: https://repository.essex.ac.uk/40067/
5. V. D. Díaz Suárez et al., "Early academic performance prediction in secondary education: Are simple machine learning models enough?" *Applied System Innovation* (MDPI), 2026. [Online]. Available: https://matilda.science/author/0000-0002-8146-176X
6. H. Xue and Y. Niu, "Multi-output based hybrid integrated models for student performance prediction," *Applied Sciences*, vol. 13, no. 9, art. 5384, 2023, doi: 10.3390/app13095384.
7. W. Xiao, P. Ji, and J. Hu, "A survey on educational data mining methods for predicting students' performance," *Engineering Reports*, vol. 4, no. 5, e12482, 2022, doi: 10.1002/eng2.12482.
8. H. Shi, N. Zhang, S. Caskurlu, and H. Na, "Applications of machine learning for at-risk student prediction in online education: A 10-year systematic review of literature," 2025. [Online]. Available: https://exa.ai/library/publication/f2ljns07hw4
9. T. Ren and J. Yu, "Long-term student performance prediction using learning ability self-adaptive algorithm," *Complex & Intelligent Systems*, 2024, doi: 10.1007/s40747-024-01476-2.
10. OWASP Foundation, "Password Storage Cheat Sheet," *OWASP Cheat Sheet Series*. [Online]. Available: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
11. N. Provos and D. Mazières, "A future-adaptable password scheme," in *Proc. USENIX Annual Technical Conference*, 1999. [Online]. Available: https://www.usenix.org/legacy/publications/library/proceedings/usenix99/full_papers/provos/provos.pdf
12. J. Hullman, P. Resnick, and E. Adar, "Hypothetical outcome plots outperform error bars and violin plots for inferences about reliability of variable ordering," *PLOS ONE*, vol. 10, no. 11, e0142444, 2015, doi: 10.1371/journal.pone.0142444.
13. M. Psyridou et al., "Machine learning predicts upper secondary education dropout as early as the end of primary school," *Scientific Reports*, vol. 14, art. 12956, 2024, doi: 10.1038/s41598-024-63629-0.
14. E. Marcotte, "Responsive Web Design," *A List Apart*, 2010. [Online]. Available: https://alistapart.com/article/responsive-web-design/
15. T. Hastie and R. Tibshirani and J. H. Friedman, "Regularization and variable selection via the elastic net," *Journal of the Royal Statistical Society: Series B*, vol. 67, no. 2, pp. 301–320, 2005. [Online]. Available: https://hastie.su.domains/Papers/elasticnet.pdf (peer version is paywalled; preprint penulis tersedia terbuka).
16. Tim Pengembang, *Product Requirements Document - Dashboard Akademik SMPN 1 Cibalong (Nesaciba) v1.0*, 2026.
17. Tim Pengembang, *ML Roadmap - Prediksi Nilai & Peringatan Dini Akademik (Dashboard Akademik Nesaciba) v1.0*, 2026.
18. Tim Pengembang, *Protokol Evaluasi A1 - Prediksi Nilai Semester Berikutnya*, 2026.
19. Program Studi Informatika, Universitas Siliwangi, *Pedoman Pelaksanaan Capstone Project*, Fakultas Teknik, Universitas Siliwangi, 2026.
20. Program Studi Informatika, Universitas Siliwangi, *Rencana Pembelajaran Semester Capstone Project (KP70067002)*, Fakultas Teknik, Universitas Siliwangi, 2026.