import crypto from "node:crypto";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

import express from "express";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.argv.includes("--dev");
const app = express();
const port = Number(process.env.PORT || 5173);
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (![".pdf", ".docx"].includes(ext)) {
      callback(new Error("Upload a PDF or DOCX resume."));
      return;
    }
    callback(null, true);
  },
});

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/export", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "CV data is required." });
    return;
  }

  const runId = crypto.randomUUID();
  const tmpDir = path.join(__dirname, ".tmp", runId);
  const dataPath = path.join(tmpDir, "cv-data.json");
  const outputPath = path.join(tmpDir, "cv.docx");

  try {
    await generateDocx(payload, dataPath, outputPath);

    const file = await fs.readFile(outputPath);
    await fs.rm(tmpDir, { recursive: true, force: true });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="harvard-ats-cv.docx"');
    res.send(file);
  } catch (error) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    res.status(422).json({ error: error.message || "Export failed." });
  }
});

app.post("/api/export-pdf", async (req, res) => {
  const payload = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "CV data is required." });
    return;
  }

  const runId = crypto.randomUUID();
  const tmpDir = path.join(__dirname, ".tmp", runId);
  const dataPath = path.join(tmpDir, "cv-data.json");
  const docxPath = path.join(tmpDir, "cv.docx");

  try {
    await generateDocx(payload, dataPath, docxPath);
    const pdfPath = await convertDocxToPdf(docxPath, tmpDir);
    const file = await fs.readFile(pdfPath);
    await fs.rm(tmpDir, { recursive: true, force: true });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="harvard-ats-cv.pdf"');
    res.send(file);
  } catch (error) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    const message = error.message || "PDF export failed.";
    const status = message.includes("LibreOffice") ? 501 : 422;
    res.status(status).json({ error: message });
  }
});

app.post("/api/import-resume", handleResumeUpload, async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Upload a PDF or DOCX resume." });
    return;
  }

  const runId = crypto.randomUUID();
  const tmpDir = path.join(__dirname, ".tmp", runId);
  const ext = path.extname(req.file.originalname || "").toLowerCase() || ".pdf";
  const inputPath = path.join(tmpDir, `resume${ext}`);
  const outputPath = path.join(tmpDir, "imported-cv.json");

  try {
    await fs.mkdir(tmpDir, { recursive: true });
    await fs.writeFile(inputPath, req.file.buffer);
    await runPython(["import_resume.py", "--input", inputPath, "--output", outputPath]);
    const data = JSON.parse(await fs.readFile(outputPath, "utf8"));
    await fs.rm(tmpDir, { recursive: true, force: true });
    res.json({
      data,
      source: {
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    res.status(422).json({ error: error.message || "Could not import that resume." });
  }
});

if (!isDev) {
  app.use(express.static(path.join(__dirname, "dist")));
  app.use((_req, res) => {
    res.sendFile(path.join(__dirname, "dist", "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  console.log(`Harvard ATS CV Generator is running at http://localhost:${port}`);
});

function handleResumeUpload(req, res, next) {
  resumeUpload.single("resume")(req, res, (error) => {
    if (error) {
      res.status(400).json({ error: error.message || "Could not upload that resume." });
      return;
    }
    next();
  });
}

async function generateDocx(payload, dataPath, outputPath) {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });
  await fs.writeFile(dataPath, JSON.stringify(payload, null, 2), "utf8");
  await runPython(["generate_cv.py", "--data", dataPath, "--output", outputPath, "--strict"]);
}

function runPython(args) {
  const python = getPythonExecutable();
  return runProcess(python, args, {
    cwd: __dirname,
    startError: (error) => `Could not start Python. Set PYTHON to your Python executable. ${error.message}`,
  });
}

function convertDocxToPdf(docxPath, outputDir) {
  const office = getOfficeExecutable();
  if (!office) {
    throw new Error("PDF export needs LibreOffice/soffice installed on the server. DOCX export is ready now.");
  }

  return runProcess(office, ["--headless", "--convert-to", "pdf", "--outdir", outputDir, docxPath], { cwd: __dirname }).then(async () => {
    const expected = path.join(outputDir, `${path.basename(docxPath, ".docx")}.pdf`);
    if (existsSync(expected)) return expected;
    const files = await fs.readdir(outputDir);
    const pdf = files.find((file) => file.toLowerCase().endsWith(".pdf"));
    if (pdf) return path.join(outputDir, pdf);
    throw new Error("PDF converter ran, but no PDF file was produced.");
  });
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd || __dirname });
    let stderr = "";
    let stdout = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(new Error(options.startError ? options.startError(error) : error.message));
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }
      reject(new Error((stderr || stdout || `Python exited with code ${code}`).trim()));
    });
  });
}

function getOfficeExecutable() {
  if (process.env.SOFFICE_PATH || process.env.LIBREOFFICE_PATH) {
    return process.env.SOFFICE_PATH || process.env.LIBREOFFICE_PATH;
  }

  const candidates =
    process.platform === "win32"
      ? [
          path.join(process.env.PROGRAMFILES || "", "LibreOffice", "program", "soffice.exe"),
          path.join(process.env["PROGRAMFILES(X86)"] || "", "LibreOffice", "program", "soffice.exe"),
        ]
      : ["/usr/bin/soffice", "/usr/bin/libreoffice"];

  const match = candidates.find((candidate) => candidate && existsSync(candidate));
  if (match) return match;
  return process.platform === "win32" ? null : "soffice";
}

function getPythonExecutable() {
  if (process.env.PYTHON || process.env.PYTHON_EXECUTABLE) {
    return process.env.PYTHON || process.env.PYTHON_EXECUTABLE;
  }

  const localBundledPython = path.join(
    process.env.USERPROFILE || "",
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "python",
    "python.exe",
  );
  if (existsSync(localBundledPython)) {
    return localBundledPython;
  }

  return process.platform === "win32" ? "python" : "python3";
}
