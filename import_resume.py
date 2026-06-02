from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

from docx import Document
from pypdf import PdfReader


MONTH_RE = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}"
DATE_RANGE_RE = re.compile(rf"({MONTH_RE})\s*[-–]\s*({MONTH_RE}|Present|Current|Now)", re.IGNORECASE)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
PHONE_RE = re.compile(r"(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{2,4}")
URL_RE = re.compile(r"(?:https?://)?(?:www\.)?(?:linkedin\.com/in/[^\s|]+|github\.com/[^\s|]+|[a-z0-9-]+(?:\.[a-z]{2,})+(?:/[^\s|]+)?)", re.IGNORECASE)

SECTION_ALIASES = {
    "education": {"education", "academic background"},
    "experience": {"experience", "work experience", "professional experience", "organizational experiences", "organization experience"},
    "projects": {"projects", "project experience", "selected projects"},
    "leadership": {"leadership", "leadership & activities", "activities", "volunteer experience"},
    "skills": {"skills", "technical skills", "skills & interests", "additional information"},
    "achievements": {"achievements", "awards", "honors", "certifications", "licenses & certifications"},
}

SECTION_ORDER = ["education", "experience", "projects", "leadership", "skills"]
ACTION_VERBS = {
    "achieved",
    "analyzed",
    "assisted",
    "built",
    "collaborated",
    "contributed",
    "coordinated",
    "created",
    "delivered",
    "designed",
    "developed",
    "drove",
    "earned",
    "ensured",
    "handled",
    "implemented",
    "improved",
    "increased",
    "launched",
    "led",
    "maintained",
    "managed",
    "monitored",
    "optimized",
    "organized",
    "prepared",
    "reduced",
    "researched",
    "set",
    "streamlined",
    "supported",
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Import an existing PDF/DOCX resume into the generator schema.")
    parser.add_argument("--input", required=True, help="Existing resume path (.pdf or .docx).")
    parser.add_argument("--output", required=True, help="Output JSON path.")
    args = parser.parse_args()

    source = Path(args.input)
    text = extract_text(source)
    data = parse_resume(text)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Imported: {output}")


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n".join(pages)
    if suffix == ".docx":
        doc = Document(str(path))
        return "\n".join(paragraph.text for paragraph in doc.paragraphs)
    raise SystemExit("Upload a .pdf or .docx resume.")


def parse_resume(text: str) -> dict[str, Any]:
    lines = normalize_lines(text)
    sections = split_sections(lines)
    profile = parse_profile(sections.get("header", lines[:12]))

    education = parse_education(sections.get("education", []))
    experience = parse_entries(sections.get("experience", []))
    projects = parse_entries(sections.get("projects", []))
    leadership = parse_entries(sections.get("leadership", []))
    skills, interests = parse_skills(sections.get("skills", []))

    achievements = sections.get("achievements", [])
    if achievements:
        leadership.append(
            {
                "organization": "Achievements",
                "location": "",
                "title": "Awards, Certifications, and Honors",
                "dates": "",
                "bullets": [normalize_achievement_bullet(bullet) for bullet in clean_bullets(achievements)],
            }
        )

    return {
        "profile": profile,
        "section_order": SECTION_ORDER,
        "education": education,
        "experience": experience,
        "projects": projects,
        "leadership": leadership,
        "skills": skills,
        "interests": interests,
    }


def normalize_lines(text: str) -> list[str]:
    text = text.replace("\u2022", "\n• ")
    text = re.sub(r"[ \t]+", " ", text)
    raw_lines = re.split(r"[\r\n]+", text)
    return [line.strip(" |") for line in raw_lines if line.strip(" |")]


def split_sections(lines: list[str]) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current = "header"
    sections[current] = []

    for line in lines:
        key = section_key(line)
        if key:
            current = key
            sections.setdefault(current, [])
            continue
        sections.setdefault(current, []).append(line)
    return sections


def section_key(line: str) -> str | None:
    normalized = normalize_key(line)
    for key, aliases in SECTION_ALIASES.items():
        if normalized in aliases:
            return key
    if ":" in line:
        return None
    if "achievement" in normalized or "certification" in normalized or "award" in normalized:
        return "achievements"
    if "skill" in normalized and len(normalized.split()) <= 6:
        return "skills"
    return None


def parse_profile(lines: list[str]) -> dict[str, str]:
    header_text = "\n".join(lines)
    email = first_match(EMAIL_RE, header_text)
    phone = first_phone(lines)
    url_text = EMAIL_RE.sub("", header_text)
    urls = URL_RE.findall(url_text)
    linkedin = next((url for url in urls if "linkedin.com" in url.lower()), "")
    website = next((url for url in urls if url != linkedin), "")
    name = first_name(lines)
    location = infer_location(lines[:12], email, phone, urls)

    return {
        "name": title_name(name),
        "location": location,
        "email": email,
        "phone": normalize_phone(phone),
        "linkedin": clean_url(linkedin),
        "website": clean_url(website),
    }


def first_name(lines: list[str]) -> str:
    skip_words = {"resume", "curriculum vitae", "cv"}
    for line in lines[:8]:
        if EMAIL_RE.search(line) or URL_RE.search(line) or any(char.isdigit() for char in line):
            continue
        normalized = normalize_key(line)
        if section_key(line) or normalized in skip_words:
            continue
        words = re.findall(r"[A-Za-z][A-Za-z'.-]*", line)
        if 1 < len(words) <= 5:
            return " ".join(words)
    return ""


def infer_location(lines: list[str], email: str, phone: str, urls: list[str]) -> str:
    noise = [email, phone, *urls]
    for line in lines:
        candidate = line
        for item in noise:
            if item:
                candidate = candidate.replace(item, "")
        pieces = [piece.strip() for piece in re.split(r"\||•", candidate) if piece.strip()]
        for piece in pieces:
            if EMAIL_RE.search(piece) or URL_RE.search(piece):
                continue
            if re.search(r"\b(indonesia|jakarta|bandung|surabaya|depok|yogyakarta|remote|usa|singapore|malaysia)\b", piece, re.IGNORECASE):
                return title_location(piece)
    return ""


def parse_education(lines: list[str]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    blocks = split_blocks(lines)
    for block in blocks:
        entry = empty_education()
        block_lines = [strip_bullet(line) for line in block]
        if not block_lines:
            continue

        school_line = block_lines[0]
        date_match = DATE_RANGE_RE.search(school_line)
        if date_match:
            entry["graduation_date"] = normalize_month(date_match.group(2))
            school_line = DATE_RANGE_RE.sub("", school_line).strip(" -–,")
            school_line = re.sub(r"\((?:expected|anticipated)\)", "", school_line, flags=re.IGNORECASE).strip(" -–,")

        school, location = split_name_location(school_line)
        entry["school"] = school
        entry["location"] = location

        for line in block_lines[1:]:
            lower = line.lower()
            if "course" in lower:
                entry["relevant_coursework"] = parse_after_colon(line)
            elif "honor" in lower or "award" in lower:
                entry["honors"] = parse_after_colon(line)
            elif "gpa" in lower or re.search(r"\d(?:\.\d+)?\s*/\s*4", line):
                entry["gpa"] = extract_gpa(line)
                degree = re.sub(r",?\s*GPA[:\s]*\d(?:\.\d+)?\s*/\s*4(?:\.00)?", "", line, flags=re.IGNORECASE)
                degree = re.sub(r",?\s*\d(?:\.\d+)?\s*/\s*4(?:\.00)?", "", degree)
                if degree.strip():
                    entry["degree"] = degree.strip(" ,")
            elif not entry["degree"]:
                entry["degree"] = line.strip(" ,")
            else:
                entry["bullets"].append(line)

        entry["bullets"] = clean_bullets(entry["bullets"])
        if meaningful(entry, ["school", "degree", "location", "graduation_date"]):
            entries.append(entry)
    return entries


def parse_entries(lines: list[str]) -> list[dict[str, Any]]:
    entries: list[dict[str, Any]] = []
    for block in split_blocks(lines):
        entry = empty_entry()
        block_lines = [strip_bullet(line) for line in block]
        if not block_lines:
            continue

        first = block_lines[0]
        date_match = DATE_RANGE_RE.search(first)
        if date_match:
            entry["dates"] = f"{normalize_month(date_match.group(1))} - {normalize_month(date_match.group(2))}"
            first = DATE_RANGE_RE.sub("", first).strip(" -–,")
        entry["organization"], entry["location"] = split_name_location(first)

        rest = block_lines[1:]
        if rest:
            entry["title"] = rest[0].strip(" ,")
            entry["bullets"] = drop_description_bullets(clean_bullets(rest[1:]))

        if not entry["title"] and entry["organization"]:
            entry["title"] = "Role / Position"
        if meaningful(entry, ["organization", "title", "dates"]):
            entries.append(entry)
    return entries


def parse_skills(lines: list[str]) -> tuple[dict[str, list[str]], list[str]]:
    skills = {"technical": [], "language": [], "tools": []}
    interests: list[str] = []
    technical_keywords = {"python", "javascript", "typescript", "sql", "react", "node", "excel", "tableau", "power bi", "html", "css", "java", "c++", "git"}
    tool_keywords = {"figma", "canva", "vscode", "vs code", "notion", "jira", "slack", "office", "word", "powerpoint", "sheets", "docs"}
    language_keywords = {"english", "indonesian", "bahasa", "mandarin", "japanese", "korean", "spanish", "french"}

    for line in lines:
        label = normalize_key(line.split(":", 1)[0])
        values = parse_after_colon(line) if ":" in line else parse_csv(line)
        target = "technical"
        if "language" in label or any(any(keyword in value.lower() for keyword in language_keywords) for value in values):
            target = "language"
        elif "tool" in label or any(any(keyword in value.lower() for keyword in tool_keywords) for value in values):
            target = "tools"
        elif "interest" in label:
            interests.extend(values)
            continue
        elif not any(any(keyword in value.lower() for keyword in technical_keywords) for value in values):
            target = "tools"
        skills[target].extend(values)

    return {key: unique(values) for key, values in skills.items()}, unique(interests)


def split_blocks(lines: list[str]) -> list[list[str]]:
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in lines:
        starts_entry = bool(DATE_RANGE_RE.search(line)) and bool(current)
        if starts_entry:
            blocks.append(current)
            current = [line]
        else:
            current.append(line)
    if current:
        blocks.append(current)
    return blocks


def split_name_location(line: str) -> tuple[str, str]:
    line = line.strip(" -–,")
    if " - " in line:
        left, right = line.split(" - ", 1)
        return left.strip(), title_location(right.strip())
    if " – " in line:
        left, right = line.split(" – ", 1)
        return left.strip(), title_location(right.strip())
    return line, ""


def parse_after_colon(line: str) -> list[str]:
    value = line.split(":", 1)[1] if ":" in line else line
    return parse_csv(value)


def parse_csv(value: str) -> list[str]:
    return [item.strip(" .;") for item in re.split(r",|;|\u2022", value) if item.strip(" .;")]


def clean_bullets(lines: list[str]) -> list[str]:
    return unique([clean_import_text(strip_bullet(line)) for line in lines if strip_bullet(line)])


def normalize_achievement_bullet(line: str) -> str:
    clean = re.sub(r"^achievements?\b.*?:", "", line, flags=re.IGNORECASE).strip(" :-")
    if not clean:
        clean = line
    if starts_with_action(clean):
        return clean
    return f"Earned {clean}"


def clean_import_text(value: str) -> str:
    return re.sub(r"[^\x20-\x7EÀ-ÿ]+", " ", value).strip()


def drop_description_bullets(bullets: list[str]) -> list[str]:
    if not any(starts_with_action(bullet) for bullet in bullets):
        return bullets
    trimmed = list(bullets)
    while trimmed and not starts_with_action(trimmed[0]):
        trimmed.pop(0)
    return trimmed


def starts_with_action(text: str) -> bool:
    first = re.sub(r"[^A-Za-z]", "", text.strip().split(" ", 1)[0]).lower()
    return first in ACTION_VERBS


def strip_bullet(line: str) -> str:
    return re.sub(r"^[•\-\u2013\u2014*]\s*", "", line).strip()


def extract_gpa(line: str) -> str:
    match = re.search(r"(\d(?:\.\d+)?)\s*/\s*4(?:\.00)?", line)
    if match:
        return match.group(1)
    match = re.search(r"GPA[:\s]*(\d(?:\.\d+)?)", line, re.IGNORECASE)
    return match.group(1) if match else ""


def first_match(regex: re.Pattern[str], text: str) -> str:
    match = regex.search(text)
    return match.group(0).strip() if match else ""


def first_phone(lines: list[str]) -> str:
    for line in lines[:12]:
        for match in PHONE_RE.finditer(line):
            value = match.group(0).strip()
            digits = re.sub(r"\D", "", value)
            if len(digits) >= 8 and "2024" not in value and "2025" not in value and "2028" not in value:
                return value
    return ""


def normalize_phone(value: str) -> str:
    value = value.strip()
    digits = re.sub(r"\D", "", value)
    if value.startswith("0"):
        return "+62 " + group_digits(digits[1:], [3, 4, 4])
    if digits.startswith("62"):
        return "+62 " + group_digits(digits[2:], [3, 4, 4])
    return value


def group_digits(digits: str, groups: list[int]) -> str:
    chunks: list[str] = []
    cursor = 0
    for size in groups:
        if cursor >= len(digits):
            break
        chunks.append(digits[cursor : cursor + size])
        cursor += size
    if cursor < len(digits):
        chunks.append(digits[cursor:])
    return " ".join(chunks)


def normalize_month(value: str) -> str:
    if value.lower() in {"present", "current", "now"}:
        return "Present"
    match = re.match(r"([A-Za-z]+)\s+(\d{4})", value.strip())
    if not match:
        return value.strip()
    month = match.group(1)[:3].title()
    full = {
        "Jan": "January",
        "Feb": "February",
        "Mar": "March",
        "Apr": "April",
        "May": "May",
        "Jun": "June",
        "Jul": "July",
        "Aug": "August",
        "Sep": "September",
        "Oct": "October",
        "Nov": "November",
        "Dec": "December",
    }.get(month, match.group(1).title())
    return f"{full} {match.group(2)}"


def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9& ]+", "", value.lower()).strip()


def title_name(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())


def title_location(value: str) -> str:
    acronyms = {"id": "ID", "usa": "USA", "uk": "UK"}
    words = []
    for part in re.split(r"(\W+)", value.lower()):
        words.append(acronyms.get(part, part.capitalize() if part.isalpha() else part))
    return "".join(words).strip(" ,")


def clean_url(value: str) -> str:
    return value.strip().rstrip(".,;")


def unique(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        clean = re.sub(r"\s+", " ", str(value).strip())
        key = clean.lower()
        if clean and key not in seen:
            seen.add(key)
            result.append(clean)
    return result


def meaningful(entry: dict[str, Any], keys: list[str]) -> bool:
    return any(entry.get(key) for key in keys) or bool(entry.get("bullets"))


def empty_entry() -> dict[str, Any]:
    return {"organization": "", "location": "", "title": "", "dates": "", "bullets": [""]}


def empty_education() -> dict[str, Any]:
    return {
        "school": "",
        "location": "",
        "degree": "",
        "concentration": "",
        "gpa": "",
        "graduation_date": "",
        "relevant_coursework": [],
        "honors": [],
        "bullets": [""],
    }


if __name__ == "__main__":
    main()
