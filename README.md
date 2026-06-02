# Harvard ATS CV Generator

A React + Python project for creating ATS-friendly CVs/resumes in the Harvard MCS style. The web app includes structured input forms, existing CV import, a live resume preview, basic ATS checks, and export to `.docx` or `.pdf`.

## Project Structure

- `src/` - React app with the form and live preview.
- `server.mjs` - Express server for resume import, DOCX export, and PDF export.
- `generate_cv.py` - command line CV generator.
- `import_resume.py` - PDF/DOCX parser for auto-filling data from an existing CV.
- `ats_harvard_cv/` - core DOCX generation module.
- `templates/Accessible-MCS-Resume-Template-Bullet-Points.docx` - Harvard MCS template used as the style base.
- `cv_data.example.json` - sample CV data.
- `outputs/` - generated output files.

## Run the Web App

1. Install JavaScript and Python dependencies:

```bash
npm install
pip install -r requirements.txt
```

2. Start the app:

```bash
npm run dev
```

3. Open:

```text
http://localhost:5173
```

Fill in the form on the left, review the live preview on the right, then click `DOCX` or `PDF`.

If Python is not detected automatically, set the `PYTHON` environment variable to your Python executable before starting the app.

## Features

- Browser autosave, so refreshing the page does not remove your draft.
- Load and download JSON drafts.
- Import an existing PDF/DOCX CV to auto-fill the form, then manually complete any missing fields.
- Reset the draft to a blank state.
- Basic ATS progress and warnings before export.
- DOCX/PDF export, available once the basic ATS warnings are resolved.
- Hybrid skills picker: choose suggested skills or add custom skills.

## Export Recommendation

- Use `DOCX` as the default when the resume still needs editing or when an ATS specifically requests a Word document.
- Use `PDF` for the final submission version when the layout should stay locked.

PDF export requires LibreOffice/soffice on the server. The included Dockerfile installs LibreOffice for container deployment.

## Build and Deploy

Production build:

```bash
npm run build
npm start
```

Docker:

```bash
docker build -t harvard-ats-cv-generator .
docker run -p 5173:5173 harvard-ats-cv-generator
```

For platforms such as Render, Railway, or Fly.io, use the included Dockerfile.

## CLI Usage

1. Install Python dependencies:

```bash
pip install -r requirements.txt
```

2. Edit `cv_data.example.json` with your own CV data, or create a new JSON file.

3. Generate a CV:

```bash
python generate_cv.py --data cv_data.example.json --output outputs/cv.docx
```

4. To make the generator fail when ATS warnings are found:

```bash
python generate_cv.py --data cv_data.example.json --output outputs/cv.docx --strict
```

## Data Format

Main fields:

- `profile`: name, location, email, phone, LinkedIn, website.
- `education`: school/university, degree, GPA, coursework, honors.
- `experience`: organization, location, title, dates, bullets.
- `projects`: same structure as experience.
- `leadership`: same structure as experience.
- `skills`: skill categories.
- `interests`: short list of interests.

Strong ATS-friendly bullets usually:

- start with an action verb such as `Analyzed`, `Built`, `Led`, or `Improved`;
- mention relevant tools or skills;
- include numbers or measurable impact when possible;
- avoid personal pronouns such as `I`, `my`, or `we`.

## ATS Notes

The generator intentionally uses a simple structure: real Word headings, real Word bullets, plain text, no text boxes, no icons, no graphics, and no complex columns. Right-aligned locations and dates are created with tab stops instead of heavy visual layout elements.
