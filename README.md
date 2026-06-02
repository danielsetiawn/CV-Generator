# Harvard ATS CV Generator

Project React + Python untuk membuat CV/resume ATS-friendly dengan gaya template Harvard MCS. App web menyediakan form input, import CV lama, live output preview, ATS warning dasar, dan export ke `.docx` atau `.pdf`.

## Isi project

- `src/` - React app dengan form dan preview.
- `server.mjs` - server Express untuk import resume, export DOCX, dan export PDF.
- `generate_cv.py` - command line generator.
- `import_resume.py` - parser PDF/DOCX untuk auto-fill data dari CV lama.
- `ats_harvard_cv/` - modul utama pembuat DOCX.
- `templates/Accessible-MCS-Resume-Template-Bullet-Points.docx` - template Harvard MCS yang dipakai sebagai dasar style.
- `cv_data.example.json` - contoh data CV.
- `outputs/` - folder hasil generate.

## Cara run web app

1. Install dependency JavaScript dan Python:

```bash
npm install
pip install -r requirements.txt
```

2. Jalankan app:

```bash
npm run dev
```

3. Buka:

```text
http://localhost:5173
```

Isi form di kiri, lihat preview di kanan, lalu klik `DOCX` atau `PDF`.

Jika Python tidak terdeteksi otomatis, set env `PYTHON` ke executable Python kamu sebelum menjalankan app.

Fitur app:

- Autosave draft di browser, jadi reload tidak menghapus input.
- Load dan download draft JSON.
- Import CV lama dari PDF/DOCX untuk auto-fill form, lalu lengkapi field kosong secara manual.
- Reset draft ke blank state.
- ATS progress dan warning sebelum export.
- Export DOCX/PDF hanya aktif saat warning dasar sudah beres.
- Skill picker hybrid: pilih suggestion atau tambah skill custom.

Export recommendation:

- Gunakan `DOCX` sebagai default kalau CV masih perlu diedit atau dikirim ke sistem ATS yang minta Word.
- Gunakan `PDF` untuk versi final yang layout-nya terkunci. PDF export membutuhkan LibreOffice/soffice di server; Dockerfile project ini sudah memasangnya untuk deploy container.

## Build dan deploy

Build production:

```bash
npm run build
npm start
```

Docker:

```bash
docker build -t harvard-ats-cv-generator .
docker run -p 5173:5173 harvard-ats-cv-generator
```

Untuk platform seperti Render/Railway/Fly.io, gunakan Dockerfile yang sudah disediakan.

## Cara pakai CLI lama

1. Install dependency:

```bash
pip install -r requirements.txt
```

2. Ubah isi `cv_data.example.json` sesuai data kamu, atau buat file JSON baru.

3. Generate CV:

```bash
python generate_cv.py --data cv_data.example.json --output outputs/cv.docx
```

4. Kalau mau generator gagal saat menemukan warning ATS:

```bash
python generate_cv.py --data cv_data.example.json --output outputs/cv.docx --strict
```

## Format data

Field utama:

- `profile`: nama, lokasi, email, telepon, LinkedIn, website.
- `education`: sekolah/kampus, degree, GPA, coursework, honors.
- `experience`: organisasi, lokasi, title, tanggal, bullets.
- `projects`: format sama seperti experience.
- `leadership`: format sama seperti experience.
- `skills`: kategori skill.
- `interests`: daftar interest singkat.

Bullet yang bagus untuk ATS biasanya:

- dimulai dengan action verb seperti `Analyzed`, `Built`, `Led`, `Improved`;
- menyebut tools atau skill yang relevan;
- punya angka/impact kalau memungkinkan;
- tidak memakai kata ganti seperti `I`, `my`, atau `we`.

## Catatan ATS

Generator ini sengaja memakai struktur sederhana: heading Word asli, bullet Word asli, teks biasa, tanpa text box, ikon, grafik, atau kolom kompleks. Posisi kanan untuk lokasi dan tanggal dibuat dengan tab stop, bukan layout visual yang berat.
