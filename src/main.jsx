import React from "react";
import { createRoot } from "react-dom/client";
import {
  BriefcaseBusiness,
  Check,
  Code2,
  Download,
  FileDown,
  FileText,
  FileUp,
  Folder,
  GraduationCap,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronRight,
  UserRound,
} from "lucide-react";

import "./styles.css";

const SECTION_META = [
  { key: "profile", label: "Profile", icon: UserRound },
  { key: "education", label: "Education", icon: GraduationCap },
  { key: "experience", label: "Experience", icon: BriefcaseBusiness },
  { key: "projects", label: "Projects", icon: Code2 },
  { key: "leadership", label: "Leadership", icon: Sparkles },
  { key: "skills", label: "Skills", icon: Folder },
];

const EMPTY_ENTRY = {
  organization: "",
  location: "",
  title: "",
  dates: "",
  bullets: [""],
};

const EMPTY_EDUCATION = {
  school: "",
  location: "",
  degree: "",
  concentration: "",
  gpa: "",
  graduation_date: "",
  relevant_coursework: [],
  honors: [],
  bullets: [],
};

const SCHOOL_LOCATION_LOOKUP = {
  "binus": "Jakarta, Indonesia",
  "binus university": "Jakarta, Indonesia",
  "bina nusantara university": "Jakarta, Indonesia",
  "universitas indonesia": "Depok, Indonesia",
  "university of indonesia": "Depok, Indonesia",
  "ui": "Depok, Indonesia",
  "institut teknologi bandung": "Bandung, Indonesia",
  "bandung institute of technology": "Bandung, Indonesia",
  "itb": "Bandung, Indonesia",
  "universitas gadjah mada": "Yogyakarta, Indonesia",
  "gadjah mada university": "Yogyakarta, Indonesia",
  "ugm": "Yogyakarta, Indonesia",
  "institut pertanian bogor": "Bogor, Indonesia",
  "ipb university": "Bogor, Indonesia",
  "institut teknologi sepuluh nopember": "Surabaya, Indonesia",
  "its": "Surabaya, Indonesia",
  "universitas airlangga": "Surabaya, Indonesia",
  "airlangga university": "Surabaya, Indonesia",
  "universitas padjadjaran": "Bandung, Indonesia",
  "padjadjaran university": "Bandung, Indonesia",
  "telkom university": "Bandung, Indonesia",
  "harvard university": "Cambridge, MA",
  "massachusetts institute of technology": "Cambridge, MA",
  "mit": "Cambridge, MA",
  "stanford university": "Stanford, CA",
  "university of california berkeley": "Berkeley, CA",
  "uc berkeley": "Berkeley, CA",
  "columbia university": "New York, NY",
  "new york university": "New York, NY",
  "nyu": "New York, NY",
};

const PHONE_REGIONS = [
  { code: "ID", label: "Indonesia (+62)", countryCode: "62", trunkPrefix: "0", groups: [3, 4, 4] },
  { code: "US", label: "United States (+1)", countryCode: "1", trunkPrefix: "", groups: [3, 3, 4] },
  { code: "SG", label: "Singapore (+65)", countryCode: "65", trunkPrefix: "", groups: [4, 4] },
  { code: "MY", label: "Malaysia (+60)", countryCode: "60", trunkPrefix: "0", groups: [2, 4, 4] },
  { code: "AU", label: "Australia (+61)", countryCode: "61", trunkPrefix: "0", groups: [1, 4, 4] },
  { code: "GB", label: "United Kingdom (+44)", countryCode: "44", trunkPrefix: "0", groups: [4, 3, 4] },
  { code: "JP", label: "Japan (+81)", countryCode: "81", trunkPrefix: "0", groups: [2, 4, 4] },
];

const SKILL_SUGGESTIONS = {
  technical: ["Python", "JavaScript", "SQL", "React", "Node.js", "Excel", "Tableau", "Power BI", "Git", "HTML", "CSS"],
  language: ["Indonesian native", "English fluent", "Mandarin basic", "Japanese basic"],
  tools: ["Figma", "Google Workspace", "Microsoft Office", "Notion", "Canva", "VS Code", "Jira", "Slack"],
};

const STORAGE_KEY = "harvard-cv-generator-draft-v1";

function App() {
  const [cv, setCv] = React.useState(() => loadSavedDraft());
  const [activeSection, setActiveSection] = React.useState("profile");
  const [exportState, setExportState] = React.useState({ status: "idle", message: "" });
  const fileInputRef = React.useRef(null);
  const resumeFileInputRef = React.useRef(null);
  const exportData = React.useMemo(() => sanitizeCvData(cv), [cv]);
  const warnings = React.useMemo(() => getAtsWarnings(exportData), [exportData]);
  const exportDisabled = exportState.status === "loading" || warnings.length > 0;

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
    } catch {
      // Storage can fail in private mode; the app should continue working.
    }
  }, [cv]);

  const updateProfile = (field, value) => {
    setCv((current) => ({
      ...current,
      profile: { ...current.profile, [field]: value },
    }));
  };

  const updateArrayItem = (section, index, field, value) => {
    setCv((current) => {
      const items = [...current[section]];
      items[index] = { ...items[index], [field]: value };
      return { ...current, [section]: items };
    });
  };

  const updateArrayItemFields = (section, index, fields) => {
    setCv((current) => {
      const items = [...current[section]];
      items[index] = { ...items[index], ...fields };
      return { ...current, [section]: items };
    });
  };

  const updateEducationItem = (index, field, value) => {
    setCv((current) => {
      const items = [...current.education];
      const item = { ...items[index], [field]: value };
      if (field === "school") {
        const location = getSchoolLocation(value);
        const currentLocation = String(item.location || "").trim();
        if (location && (!currentLocation || item._autofilledLocation)) {
          item.location = location;
          item._autofilledLocation = true;
        }
        if (!location && item._autofilledLocation) {
          item.location = "";
          item._autofilledLocation = false;
        }
      }
      if (field === "location") {
        item._autofilledLocation = false;
      }
      items[index] = item;
      return { ...current, education: items };
    });
  };

  const updateBullet = (section, itemIndex, bulletIndex, value) => {
    setCv((current) => {
      const items = [...current[section]];
      const bullets = [...(items[itemIndex].bullets || [])];
      bullets[bulletIndex] = value;
      items[itemIndex] = { ...items[itemIndex], bullets };
      return { ...current, [section]: items };
    });
  };

  const addEntry = (section) => {
    setCv((current) => ({
      ...current,
      [section]: [...current[section], section === "education" ? createEmptyEducation() : createEmptyEntry()],
    }));
  };

  const removeEntry = (section, index) => {
    setCv((current) => ({
      ...current,
      [section]: current[section].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addBullet = (section, itemIndex) => {
    setCv((current) => {
      const items = [...current[section]];
      items[itemIndex] = { ...items[itemIndex], bullets: [...(items[itemIndex].bullets || []), ""] };
      return { ...current, [section]: items };
    });
  };

  const removeBullet = (section, itemIndex, bulletIndex) => {
    setCv((current) => {
      const items = [...current[section]];
      const bullets = (items[itemIndex].bullets || []).filter((_, index) => index !== bulletIndex);
      items[itemIndex] = { ...items[itemIndex], bullets: bullets.length ? bullets : [""] };
      return { ...current, [section]: items };
    });
  };

  const updateListField = (section, index, field, value) => {
    updateArrayItem(
      section,
      index,
      field,
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
  };

  const updateSkill = (field, value) => {
    const values = Array.isArray(value) ? value : parseListInput(value);
    setCv((current) => ({
      ...current,
      skills: {
        ...current.skills,
        [field]: uniqueList(values),
      },
    }));
  };

  const updateInterests = (value) => {
    setCv((current) => ({
      ...current,
      interests: value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    }));
  };

  const exportResume = async (format = "docx") => {
    if (warnings.length > 0) {
      setExportState({ status: "error", message: "Fix ATS warnings before exporting." });
      return;
    }
    const normalizedFormat = format === "pdf" ? "pdf" : "docx";
    const label = normalizedFormat.toUpperCase();
    setExportState({ status: "loading", message: `Preparing ${label}...` });
    try {
      const response = await fetch(normalizedFormat === "pdf" ? "/api/export-pdf" : "/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exportData),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Export failed.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${slugify(cv.profile.name || "harvard-ats-cv")}.${normalizedFormat}`;
      anchor.click();
      URL.revokeObjectURL(url);
      setExportState({ status: "success", message: `${label} downloaded.` });
    } catch (error) {
      setExportState({ status: "error", message: error.message });
    }
  };

  const resetDraft = () => {
    const confirmed = window.confirm("Reset all CV input and start from blank?");
    if (!confirmed) return;
    setCv(createBlankCv());
    setActiveSection("profile");
    setExportState({ status: "idle", message: "Draft reset." });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  };

  const downloadDraft = () => {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slugify(exportData.profile.name || "harvard-cv-draft")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportState({ status: "success", message: "Draft JSON downloaded." });
  };

  const loadDraftFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setCv(hydrateDraft(data));
      setExportState({ status: "success", message: "Draft JSON loaded." });
    } catch {
      setExportState({ status: "error", message: "Could not read that JSON draft." });
    }
  };

  const importResumeFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const formData = new FormData();
    formData.append("resume", file);
    setExportState({ status: "loading", message: `Reading ${file.name}...` });

    try {
      const response = await fetch("/api/import-resume", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Could not import that resume.");
      }
      const result = await response.json();
      setCv(hydrateDraft(result.data || {}));
      setActiveSection("profile");
      setExportState({ status: "success", message: "CV imported. Check the blanks and edit anything that looks off." });
    } catch (error) {
      setExportState({ status: "error", message: error.message });
    }
  };

  return (
    <main className="desktop-shell">
      <aside className="desktop-icons" aria-label="CV sections">
        {SECTION_META.map(({ key, label, icon: Icon }) => (
          <button
            className={`desktop-icon ${activeSection === key ? "is-active" : ""}`}
            key={key}
            onClick={() => setActiveSection(key)}
            type="button"
          >
            <span className="icon-tile">
              <Icon aria-hidden="true" size={26} />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </aside>

      <section className="hero-title" aria-label="Application title">
        <p>ATS-ready resume builder</p>
        <h1>Harvard CV Generator</h1>
      </section>

      <section className="app-window" aria-label="CV generator workspace">
        <div className="window-bar">
          <span>Harvard CV Generator</span>
          <button className="window-close" type="button" aria-label="Decorative close button">
            x
          </button>
        </div>

        <div className="workspace">
          <section className="form-panel" aria-label="CV input form">
            <div className="panel-heading">
              <div>
                <p>Input</p>
                <h2>{SECTION_META.find((section) => section.key === activeSection)?.label}</h2>
              </div>
              <div className="input-actions" aria-label="Draft actions">
                <button type="button" onClick={() => resumeFileInputRef.current?.click()} aria-label="Import PDF or DOCX resume" title="Import PDF/DOCX resume">
                  <FileText size={18} />
                </button>
                <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Load JSON draft" title="Load JSON draft">
                  <FileUp size={18} />
                </button>
                <button type="button" onClick={downloadDraft} aria-label="Download JSON draft" title="Download JSON draft">
                  <FileDown size={18} />
                </button>
                <button type="button" onClick={resetDraft} aria-label="Reset draft" title="Reset draft">
                  <RotateCcw size={18} />
                </button>
                <Save size={20} aria-hidden="true" title="Autosaved in this browser" />
              </div>
              <input ref={fileInputRef} className="hidden-file-input" type="file" accept="application/json,.json" onChange={loadDraftFile} />
              <input ref={resumeFileInputRef} className="hidden-file-input" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={importResumeFile} />
            </div>
            <FormContent
              activeSection={activeSection}
              cv={cv}
              updateProfile={updateProfile}
              updateArrayItem={updateArrayItem}
              updateArrayItemFields={updateArrayItemFields}
              updateEducationItem={updateEducationItem}
              updateBullet={updateBullet}
              addEntry={addEntry}
              removeEntry={removeEntry}
              addBullet={addBullet}
              removeBullet={removeBullet}
              updateListField={updateListField}
              updateSkill={updateSkill}
              updateInterests={updateInterests}
            />
          </section>

          <section className="preview-panel" aria-label="CV output preview">
            <div className="panel-heading">
              <div>
                <p>Output Display</p>
                <h2>Live Resume Preview</h2>
              </div>
              <div className="export-actions">
                <button className="export-button" type="button" onClick={() => exportResume("docx")} disabled={exportDisabled}>
                  <Download size={18} aria-hidden="true" />
                  DOCX
                </button>
                <button className="export-button secondary" type="button" onClick={() => exportResume("pdf")} disabled={exportDisabled}>
                  <FileDown size={18} aria-hidden="true" />
                  PDF
                </button>
              </div>
            </div>
            <ResumePreview cv={cv} />
            <AtsChecks warnings={warnings} exportState={exportState} exportData={exportData} />
          </section>
        </div>
      </section>

      <nav className="dock" aria-label="Quick actions">
        <button type="button" onClick={() => setActiveSection("profile")} aria-label="Open profile">
          <UserRound size={24} />
        </button>
        <button type="button" onClick={() => setActiveSection("experience")} aria-label="Open experience">
          <BriefcaseBusiness size={24} />
        </button>
        <button type="button" onClick={() => setActiveSection("skills")} aria-label="Open skills">
          <Code2 size={24} />
        </button>
        <button type="button" onClick={() => exportResume("docx")} aria-label="Export CV as DOCX" disabled={exportDisabled}>
          <Download size={24} />
        </button>
      </nav>
    </main>
  );
}

function FormContent(props) {
  const { activeSection, cv } = props;
  if (activeSection === "profile") {
    return <ProfileForm profile={cv.profile} updateProfile={props.updateProfile} />;
  }
  if (activeSection === "education") {
    return (
      <EducationForm
        items={cv.education}
        updateEducationItem={props.updateEducationItem}
        updateArrayItemFields={props.updateArrayItemFields}
        updateListField={props.updateListField}
        updateBullet={props.updateBullet}
        addEntry={props.addEntry}
        removeEntry={props.removeEntry}
        addBullet={props.addBullet}
        removeBullet={props.removeBullet}
      />
    );
  }
  if (["experience", "projects", "leadership"].includes(activeSection)) {
    return (
      <EntryForm
        section={activeSection}
        items={cv[activeSection]}
        updateArrayItem={props.updateArrayItem}
        updateArrayItemFields={props.updateArrayItemFields}
        updateBullet={props.updateBullet}
        addEntry={props.addEntry}
        removeEntry={props.removeEntry}
        addBullet={props.addBullet}
        removeBullet={props.removeBullet}
      />
    );
  }
  return <SkillsForm cv={cv} updateSkill={props.updateSkill} updateInterests={props.updateInterests} />;
}

function ProfileForm({ profile, updateProfile }) {
  const phoneRegion = profile.phone_region || "ID";

  return (
    <div className="form-grid">
      {[
        ["name", "Full Name", "FirstName LastName"],
        ["location", "Location", "City, State"],
        ["email", "Email", "youremail@example.com"],
      ].map(([field, label, placeholder]) => (
        <TextField
          key={field}
          id={`profile-${field}`}
          label={label}
          placeholder={placeholder}
          value={profile[field] || ""}
          onChange={(value) => updateProfile(field, value)}
          onBlurTransform={["name", "location"].includes(field) ? smartTitleCase : undefined}
        />
      ))}
      <div className="phone-grid">
        <SelectField
          id="profile-phone-region"
          label="Phone Region"
          value={phoneRegion}
          onChange={(value) => {
            updateProfile("phone_region", value);
            if (profile.phone) updateProfile("phone", formatPhoneNumber(profile.phone, value));
          }}
          options={PHONE_REGIONS.map((region) => ({ value: region.code, label: region.label }))}
        />
        <TextField
          id="profile-phone"
          label="Phone"
          placeholder={phonePlaceholder(phoneRegion)}
          value={profile.phone || ""}
          onChange={(value) => updateProfile("phone", value)}
          onBlurTransform={(value) => formatPhoneNumber(value, phoneRegion)}
        />
      </div>
      <TextField id="profile-linkedin" label="LinkedIn" placeholder="linkedin.com/in/name" value={profile.linkedin || ""} onChange={(value) => updateProfile("linkedin", value)} />
      <TextField id="profile-website" label="Website / GitHub" placeholder="github.com/name" value={profile.website || ""} onChange={(value) => updateProfile("website", value)} />
    </div>
  );
}

function EducationForm(props) {
  const { items, updateEducationItem, updateArrayItemFields, updateListField, updateBullet, addEntry, removeEntry, addBullet, removeBullet } = props;
  const [openItems, setOpenItems] = React.useState(() => new Set([0]));
  const toggleItem = (index) => {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="stack">
      <datalist id="school-suggestions">
        {Object.keys(SCHOOL_LOCATION_LOOKUP)
          .filter((school) => school.length > 3)
          .map((school) => (
            <option key={school} value={smartTitleCase(school)} />
          ))}
      </datalist>
      {items.map((item, index) => {
        const isOpen = openItems.has(index);
        return (
          <div className={`entry-editor ${!isOpen ? "is-collapsed" : ""}`} key={`education-${index}`}>
            <EditorHeader title={`Education ${index + 1}`} summary={entrySummary(item, "School")} isOpen={isOpen} onToggle={() => toggleItem(index)} onRemove={() => removeEntry("education", index)} />
            {isOpen ? (
              <>
                <div className="form-grid two">
                  <TextField
                    id={`education-school-${index}`}
                    label="School"
                    value={item.school || ""}
                    onChange={(value) => updateEducationItem(index, "school", value)}
                    onBlurTransform={smartTitleCase}
                    listId="school-suggestions"
                  />
                  <TextField id={`education-location-${index}`} label="Location" value={item.location || ""} onChange={(value) => updateEducationItem(index, "location", value)} onBlurTransform={smartTitleCase} />
                  <TextField id={`education-degree-${index}`} label="Degree" value={item.degree || ""} onChange={(value) => updateEducationItem(index, "degree", value)} onBlurTransform={smartTitleCase} />
                  <MonthField
                    id={`education-date-${index}`}
                    label="Graduation Date"
                    value={item._graduationMonth || ""}
                    onChange={(value) => updateArrayItemFields("education", index, { _graduationMonth: value, graduation_date: formatMonth(value) })}
                  />
                  <TextField id={`education-concentration-${index}`} label="Concentration" value={item.concentration || ""} onChange={(value) => updateEducationItem(index, "concentration", value)} onBlurTransform={smartTitleCase} />
                  <TextField id={`education-gpa-${index}`} label="GPA" value={item.gpa || ""} onChange={(value) => updateEducationItem(index, "gpa", value)} />
                </div>
                <TextField
                  id={`education-coursework-${index}`}
                  label="Relevant Coursework"
                  value={(item.relevant_coursework || []).join(", ")}
                  onChange={(value) => updateListField("education", index, "relevant_coursework", value)}
                />
                <BulletEditor
                  section="education"
                  itemIndex={index}
                  bullets={item.bullets || []}
                  updateBullet={updateBullet}
                  addBullet={addBullet}
                  removeBullet={removeBullet}
                />
              </>
            ) : null}
          </div>
        );
      })}
      <button className="add-button" type="button" onClick={() => addEntry("education")}>
        <Plus size={18} /> Add education
      </button>
    </div>
  );
}

function EntryForm({ section, items, updateArrayItem, updateArrayItemFields, updateBullet, addEntry, removeEntry, addBullet, removeBullet }) {
  const primaryLabel = section === "projects" ? "Project Name" : "Organization";
  const [openItems, setOpenItems] = React.useState(() => new Set([0]));
  const toggleItem = (index) => {
    setOpenItems((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="stack">
      {items.map((item, index) => (
        <div className={`entry-editor ${!openItems.has(index) ? "is-collapsed" : ""}`} key={`${section}-${index}`}>
          <EditorHeader title={`${titleCase(section)} ${index + 1}`} summary={entrySummary(item, primaryLabel)} isOpen={openItems.has(index)} onToggle={() => toggleItem(index)} onRemove={() => removeEntry(section, index)} />
          {openItems.has(index) ? (
            <>
              <div className="form-grid two">
                <TextField id={`${section}-organization-${index}`} label={primaryLabel} value={item.organization || ""} onChange={(value) => updateArrayItem(section, index, "organization", value)} onBlurTransform={smartTitleCase} />
                <TextField id={`${section}-location-${index}`} label="Location" value={item.location || ""} onChange={(value) => updateArrayItem(section, index, "location", value)} onBlurTransform={smartTitleCase} />
                <TextField id={`${section}-title-${index}`} label="Title / Role" value={item.title || ""} onChange={(value) => updateArrayItem(section, index, "title", value)} onBlurTransform={smartTitleCase} />
              </div>
              <DateRangeField
                id={`${section}-dates-${index}`}
                item={item}
                onChange={(fields) => {
                  const next = { ...item, ...fields };
                  updateArrayItemFields(section, index, {
                    ...fields,
                    dates: formatDateRange(next._startMonth, next._endMonth, next._isCurrent),
                  });
                }}
              />
              <BulletEditor
                section={section}
                itemIndex={index}
                bullets={item.bullets || []}
                updateBullet={updateBullet}
                addBullet={addBullet}
                removeBullet={removeBullet}
              />
            </>
          ) : null}
        </div>
      ))}
      <button className="add-button" type="button" onClick={() => addEntry(section)}>
        <Plus size={18} /> Add {section}
      </button>
    </div>
  );
}

function SkillsForm({ cv, updateSkill, updateInterests }) {
  const skillKeys = Array.from(new Set([...Object.keys(cv.skills || {}), "technical", "language", "tools"]));
  return (
    <div className="skills-stack">
      {skillKeys.map((key) => (
        <SkillPicker
          key={key}
          idPrefix={`skill-${key}`}
          label={titleCase(key)}
          values={cv.skills?.[key] || []}
          suggestions={SKILL_SUGGESTIONS[key] || []}
          onChange={(values) => updateSkill(key, values)}
        />
      ))}
      <TextField id="interests" label="Interests" value={(cv.interests || []).join(", ")} onChange={updateInterests} />
    </div>
  );
}

function SkillPicker({ idPrefix, label, values, suggestions, onChange }) {
  const [customValue, setCustomValue] = React.useState("");
  const selected = uniqueList(values || []);
  const selectedKeys = new Set(selected.map(normalizeSkillKey));

  const addSkill = (skill) => {
    const clean = normalizeSkillLabel(skill);
    if (!clean) return;
    onChange(uniqueList([...selected, clean]));
    setCustomValue("");
  };

  const removeSkill = (skill) => {
    const target = normalizeSkillKey(skill);
    onChange(selected.filter((item) => normalizeSkillKey(item) !== target));
  };

  const toggleSuggestion = (skill) => {
    if (selectedKeys.has(normalizeSkillKey(skill))) removeSkill(skill);
    else addSkill(skill);
  };

  return (
    <section className="skill-picker" aria-labelledby={`${idPrefix}-label`}>
      <div className="mini-label" id={`${idPrefix}-label`}>
        {label}
      </div>
      <div className="skill-suggestions" aria-label={`${label} suggestions`}>
        {suggestions.map((skill) => {
          const active = selectedKeys.has(normalizeSkillKey(skill));
          return (
            <button key={skill} className={`skill-option ${active ? "is-selected" : ""}`} type="button" aria-pressed={active} onClick={() => toggleSuggestion(skill)}>
              {skill}
            </button>
          );
        })}
      </div>
      <div className="skill-custom-row">
        <input
          id={`${idPrefix}-custom`}
          value={customValue}
          placeholder={`Add ${label.toLowerCase()} skill`}
          onChange={(event) => setCustomValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addSkill(customValue);
            }
          }}
        />
        <button type="button" onClick={() => addSkill(customValue)}>
          <Plus size={16} /> Add
        </button>
      </div>
      <div className="skill-chip-row" aria-label={`Selected ${label}`}>
        {selected.length ? (
          selected.map((skill) => (
            <span className="skill-chip" key={skill}>
              {skill}
              <button type="button" onClick={() => removeSkill(skill)} aria-label={`Remove ${skill}`}>
                x
              </button>
            </span>
          ))
        ) : (
          <span className="skill-empty">No {label.toLowerCase()} skills selected</span>
        )}
      </div>
    </section>
  );
}

function BulletEditor({ section, itemIndex, bullets, updateBullet, addBullet, removeBullet }) {
  return (
    <div className="bullet-editor">
      <div className="mini-label">Achievement Bullets</div>
      {(bullets.length ? bullets : [""]).map((bullet, index) => (
        <div className="bullet-row" key={`${section}-${itemIndex}-bullet-${index}`}>
          <textarea
            id={`${section}-${itemIndex}-bullet-${index}`}
            aria-label={`Bullet ${index + 1}`}
            value={bullet}
            onChange={(event) => updateBullet(section, itemIndex, index, event.target.value)}
            rows={2}
            placeholder="Analyzed 120K records with SQL to improve reporting accuracy..."
          />
          <button type="button" onClick={() => removeBullet(section, itemIndex, index)} aria-label="Remove bullet">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button className="ghost-button" type="button" onClick={() => addBullet(section, itemIndex)}>
        <Plus size={16} /> Add bullet
      </button>
    </div>
  );
}

function EditorHeader({ title, summary, isOpen, onToggle, onRemove }) {
  return (
    <div className="entry-header">
      <button className="collapse-button" type="button" onClick={onToggle} aria-label={`${isOpen ? "Collapse" : "Expand"} ${title}`} aria-expanded={isOpen}>
        {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
      </button>
      <div className="entry-title-group">
        <h3>{title}</h3>
        {summary ? <p>{summary}</p> : null}
      </div>
      <button className="remove-button" type="button" onClick={onRemove} aria-label={`Remove ${title}`}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function TextField({ id, label, value, onChange, placeholder = "", listId, onBlurTransform }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        list={listId}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          if (onBlurTransform) onChange(onBlurTransform(event.target.value));
        }}
      />
    </label>
  );
}

function SelectField({ id, label, value, onChange, options }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MonthField({ id, label, value, onChange }) {
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} type="month" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DateRangeField({ id, item, onChange }) {
  const isCurrent = Boolean(item._isCurrent);
  return (
    <div className="date-range-field" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} className="mini-label">
        Dates
      </span>
      <div className="date-range-controls">
        <label className="field" htmlFor={`${id}-start`}>
          <span>Start</span>
          <input id={`${id}-start`} type="month" value={item._startMonth || ""} onChange={(event) => onChange({ _startMonth: event.target.value })} />
        </label>
        <label className="field" htmlFor={`${id}-end`}>
          <span>End</span>
          <input
            id={`${id}-end`}
            type="month"
            value={item._endMonth || ""}
            disabled={isCurrent}
            onChange={(event) => onChange({ _endMonth: event.target.value })}
          />
        </label>
        <label className="current-toggle" htmlFor={`${id}-current`}>
          <input
            id={`${id}-current`}
            type="checkbox"
            checked={isCurrent}
            onChange={(event) =>
              onChange({
                _isCurrent: event.target.checked,
                _endMonth: event.target.checked ? "" : item._endMonth || "",
              })
            }
          />
          <span>Present</span>
        </label>
      </div>
    </div>
  );
}

function ResumePreview({ cv }) {
  const contactItems = [
    previewValue(cv.profile.location, "City, State"),
    previewValue(cv.profile.email, "youremail@college.harvard.edu"),
    previewValue(cv.profile.phone, "phone number"),
    previewValue(cv.profile.linkedin, "LinkedIn"),
    previewValue(cv.profile.website, "Portfolio / GitHub"),
  ];

  return (
    <article className="resume-paper">
      <header>
        <h2 className={!cv.profile.name ? "preview-placeholder" : ""}>{cv.profile.name || "FirstName LastName"}</h2>
        <p>
          {contactItems.map((item, index) => (
            <React.Fragment key={`${item.text}-${index}`}>
              {index > 0 ? " | " : ""}
              <span className={item.isPlaceholder ? "preview-placeholder" : ""}>{item.text}</span>
            </React.Fragment>
          ))}
        </p>
      </header>
      <PreviewSection title="Education">
        {cv.education.map((item, index) => (
          <PreviewEntry
            key={`preview-education-${index}`}
            topLeft={previewValue(item.school, "University / School Name")}
            topRight={previewValue(item.location, "City, State")}
            bottomLeft={previewValue(
              [item.degree, item.concentration, item.gpa ? `GPA ${item.gpa}/4.0` : ""].filter(Boolean).join(". "),
              "Degree, Concentration. GPA",
            )}
            bottomRight={previewValue(item.graduation_date, "Graduation Date")}
            bullets={item.bullets}
            bulletPlaceholder="Add optional academic achievement, thesis, honor, or activity"
            details={[
              previewValue(
                item.relevant_coursework?.length ? `Relevant Coursework: ${item.relevant_coursework.join(", ")}` : "",
                "Relevant Coursework: Course 1, Course 2, Course 3",
              ),
              item.honors?.length ? previewValue(`Honors: ${item.honors.join(", ")}`, "") : null,
            ]}
          />
        ))}
      </PreviewSection>
      <PreviewSection title="Experience">
        {cv.experience.map((item, index) => <PreviewEntry key={`preview-exp-${index}`} {...previewProps(item, "Organization")} />)}
      </PreviewSection>
      <PreviewSection title="Projects">
        {cv.projects.map((item, index) => <PreviewEntry key={`preview-project-${index}`} {...previewProps(item, "Project Name")} />)}
      </PreviewSection>
      <PreviewSection title="Leadership & Activities">
        {cv.leadership.map((item, index) => <PreviewEntry key={`preview-leadership-${index}`} {...previewProps(item, "Organization / Activity")} />)}
      </PreviewSection>
      <PreviewSection title="Skills & Interests">
        {["technical", "language", "tools"].map((key) => {
          const values = cv.skills?.[key] || [];
          return (
            <p className="skill-line" key={key}>
              <strong>{titleCase(key)}:</strong>{" "}
              <span className={!values.length ? "preview-placeholder" : ""}>
                {values.length ? values.join(", ") : skillPlaceholder(key)}
              </span>
            </p>
          );
        })}
        <p className="skill-line">
          <strong>Interests:</strong>{" "}
          <span className={!cv.interests?.length ? "preview-placeholder" : ""}>
            {cv.interests?.length ? cv.interests.join(", ") : "Activities or topics that may spark interview conversation"}
          </span>
        </p>
      </PreviewSection>
    </article>
  );
}

function PreviewSection({ title, children }) {
  const visibleChildren = React.Children.toArray(children).filter(Boolean);
  if (!visibleChildren.length) return null;
  return (
    <section className="preview-section">
      <h3>{title}</h3>
      {visibleChildren}
    </section>
  );
}

function PreviewEntry({ topLeft, topRight, bottomLeft, bottomRight, bullets = [], details = [], bulletPlaceholder = "Begin with action verb, add skill, context, and impact" }) {
  const cleanBullets = (bullets || []).filter((bullet) => bullet.trim());
  return (
    <div className="preview-entry">
      <div className="preview-row strong">
        <PreviewText value={topLeft} />
        <PreviewText value={topRight} />
      </div>
      <div className="preview-row italic">
        <PreviewText value={bottomLeft} />
        <PreviewText value={bottomRight} />
      </div>
      {details.filter(Boolean).map((detail, index) => (
        <p className="preview-detail" key={`${detail.text}-${index}`}>
          <PreviewText value={detail} />
        </p>
      ))}
      <ul>
        {cleanBullets.length ? (
          cleanBullets.map((bullet, index) => <li key={`${bullet}-${index}`}>{bullet}</li>)
        ) : (
          <li className="preview-placeholder">{bulletPlaceholder}</li>
        )}
      </ul>
    </div>
  );
}

function PreviewText({ value }) {
  const normalized = typeof value === "object" && value !== null ? value : previewValue(value, "");
  return <span className={normalized.isPlaceholder ? "preview-placeholder" : ""}>{normalized.text}</span>;
}

function AtsChecks({ warnings, exportState, exportData }) {
  const completedSections = [
    Boolean(exportData.profile.name && exportData.profile.email && exportData.profile.phone),
    exportData.education.length > 0,
    [...exportData.experience, ...exportData.projects, ...exportData.leadership].length > 0,
    Object.values(exportData.skills || {}).some((values) => values.length) || exportData.interests.length > 0,
  ].filter(Boolean).length;

  return (
    <aside className="ats-checks" aria-live="polite">
      <div className="check-title">
        <Check size={17} aria-hidden="true" />
        <strong>ATS checks</strong>
      </div>
      <div className="ats-meter" aria-label={`${completedSections} of 4 resume basics complete`}>
        <span style={{ width: `${(completedSections / 4) * 100}%` }} />
      </div>
      <p className="ats-meter-text">{completedSections}/4 basics complete</p>
      {warnings.length ? (
        <ul>
          {warnings.slice(0, 5).map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : (
        <p>No basic ATS warnings. Ready to export.</p>
      )}
      {exportState.message ? <p className={`export-message ${exportState.status}`}>{exportState.message}</p> : null}
    </aside>
  );
}

function createBlankCv() {
  return {
    profile: {},
    section_order: ["education", "experience", "projects", "leadership", "skills"],
    education: [createEmptyEducation()],
    experience: [createEmptyEntry()],
    projects: [createEmptyEntry()],
    leadership: [createEmptyEntry()],
    skills: { technical: [], language: [], tools: [] },
    interests: [],
  };
}

function loadSavedDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createBlankCv();
    return hydrateDraft(JSON.parse(raw));
  } catch {
    return createBlankCv();
  }
}

function hydrateDraft(data) {
  return {
    ...createBlankCv(),
    profile: { ...(data.profile || {}) },
    education: ensureEntries(data.education, createEmptyEducation),
    experience: ensureEntries(data.experience, createEmptyEntry),
    projects: ensureEntries(data.projects, createEmptyEntry),
    leadership: ensureEntries(data.leadership, createEmptyEntry),
    skills: {
      technical: uniqueList(asList(data.skills?.technical)),
      language: uniqueList(asList(data.skills?.language)),
      tools: uniqueList(asList(data.skills?.tools)),
      ...Object.fromEntries(Object.entries(data.skills || {}).map(([key, values]) => [key, uniqueList(asList(values))])),
    },
    interests: uniqueList(asList(data.interests)),
  };
}

function ensureEntries(entries, createEntry) {
  return Array.isArray(entries) && entries.length ? entries : [createEntry()];
}

function asList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return parseListInput(value);
  return [];
}

function createEmptyEntry() {
  return { ...EMPTY_ENTRY, bullets: [""] };
}

function createEmptyEducation() {
  return { ...EMPTY_EDUCATION, relevant_coursework: [], honors: [], bullets: [""] };
}

function sanitizeCvData(data) {
  return {
    profile: sanitizeProfile(data.profile || {}),
    section_order: ["education", "experience", "projects", "leadership", "skills"],
    education: (data.education || []).map(sanitizeEducationEntry).filter(isMeaningfulEducation),
    experience: (data.experience || []).map(sanitizeExperienceEntry).filter(isMeaningfulExperience),
    projects: (data.projects || []).map(sanitizeExperienceEntry).filter(isMeaningfulExperience),
    leadership: (data.leadership || []).map(sanitizeExperienceEntry).filter(isMeaningfulExperience),
    skills: Object.fromEntries(Object.entries(data.skills || {}).map(([key, values]) => [key, uniqueList(asList(values))])),
    interests: uniqueList(asList(data.interests)),
  };
}

function sanitizeProfile(profile) {
  return {
    name: cleanText(profile.name),
    location: cleanText(profile.location),
    email: cleanText(profile.email),
    phone: cleanText(profile.phone),
    linkedin: cleanText(profile.linkedin),
    website: cleanText(profile.website),
  };
}

function sanitizeEducationEntry(item) {
  return {
    school: cleanText(item.school),
    location: cleanText(item.location),
    degree: cleanText(item.degree),
    concentration: cleanText(item.concentration),
    gpa: cleanText(item.gpa),
    graduation_date: cleanText(item.graduation_date),
    relevant_coursework: uniqueList(item.relevant_coursework || []),
    honors: uniqueList(item.honors || []),
    bullets: cleanBullets(item.bullets),
  };
}

function sanitizeExperienceEntry(item) {
  return {
    organization: cleanText(item.organization),
    location: cleanText(item.location),
    title: cleanText(item.title),
    dates: cleanText(item.dates),
    bullets: cleanBullets(item.bullets),
  };
}

function isMeaningfulEducation(item) {
  return Boolean(item.school || item.degree || item.location || item.graduation_date || item.relevant_coursework.length || item.bullets.length);
}

function isMeaningfulExperience(item) {
  return Boolean(item.organization || item.title || item.location || item.dates || item.bullets.length);
}

function cleanBullets(value) {
  return (value || []).map(cleanText).filter(Boolean);
}

function cleanText(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function entrySummary(item, fallback) {
  const primary = item.organization || item.school || "";
  const secondary = item.title || item.degree || "";
  const date = item.dates || item.graduation_date || "";
  const parts = [primary || fallback, secondary, date].filter(Boolean);
  return parts.join(" | ");
}

function getAtsWarnings(cv) {
  const warnings = [];
  if (!cv.profile.name) warnings.push("Add your full name.");
  if (!cv.profile.email) warnings.push("Add an email address.");
  if (!cv.profile.phone) warnings.push("Add a phone number.");
  if (!cv.education.length) warnings.push("Add at least one education entry.");
  if (![...cv.experience, ...cv.projects, ...cv.leadership].length) warnings.push("Add at least one experience, project, or leadership entry.");

  cv.education.forEach((entry, index) => {
    if (!entry.school || !entry.degree) warnings.push(`Education ${index + 1}: add both school and degree.`);
  });

  ["experience", "projects", "leadership"].forEach((section) => {
    cv[section].forEach((entry, index) => {
      if (!entry.organization || !entry.title) warnings.push(`${titleCase(section)} ${index + 1}: add both ${section === "projects" ? "project name" : "organization"} and title/role.`);
      (entry.bullets || []).forEach((bullet) => {
        if (!bullet.trim()) return;
        const first = bullet.trim().split(/\s+/)[0]?.replace(/[^a-z]/gi, "").toLowerCase();
        const strongVerbs = [
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
        ];
        if (first && !strongVerbs.includes(first)) warnings.push(`${titleCase(section)} ${index + 1}: consider starting bullet with a strong action verb.`);
        if (/\b(i|me|my|we|our)\b/i.test(bullet)) warnings.push(`${titleCase(section)} ${index + 1}: remove personal pronouns from bullets.`);
      });
    });
  });
  return [...new Set(warnings)];
}

function previewProps(item, organizationPlaceholder) {
  return {
    topLeft: previewValue(item.organization, organizationPlaceholder),
    topRight: previewValue(item.location, "City, State or Remote"),
    bottomLeft: previewValue(item.title, "Position Title"),
    bottomRight: previewValue(item.dates, "Month Year - Month Year"),
    bullets: item.bullets,
  };
}

function previewValue(value, fallback) {
  const text = String(value || "").trim();
  return { text: text || fallback, isPlaceholder: !text };
}

function skillPlaceholder(key) {
  const placeholders = {
    technical: "Python, SQL, Excel, Tableau, Git",
    language: "English fluent, Indonesian native",
    tools: "Figma, Google Workspace, Microsoft Office",
  };
  return placeholders[key] || "Skill 1, Skill 2, Skill 3";
}

function parseListInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => normalizeSkillLabel(item))
    .filter(Boolean);
}

function uniqueList(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const clean = normalizeSkillLabel(value);
    const key = normalizeSkillKey(clean);
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result;
}

function normalizeSkillLabel(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeSkillKey(value) {
  return normalizeSkillLabel(value).toLowerCase();
}

function formatDateRange(startMonth, endMonth, isCurrent) {
  const start = formatMonth(startMonth);
  const end = isCurrent ? "Present" : formatMonth(endMonth);
  if (start && end) return `${start} - ${end}`;
  if (start) return `${start} - ${isCurrent ? "Present" : "End Date"}`;
  if (end) return `Start Date - ${end}`;
  return "";
}

function formatMonth(value) {
  if (!value) return "";
  const [year, month] = String(value).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function formatPhoneNumber(value, regionCode = "ID") {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const region = PHONE_REGIONS.find((item) => item.code === regionCode) || PHONE_REGIONS[0];
  const compact = raw.replace(/[^\d+]/g, "");
  if (!compact) return "";

  if (compact.startsWith("+")) {
    const digits = compact.slice(1).replace(/\D/g, "");
    if (!digits) return "";
    if (digits.startsWith(region.countryCode)) {
      return `+${region.countryCode} ${groupDigits(digits.slice(region.countryCode.length), region.groups)}`.trim();
    }
    return `+${groupDigits(digits, [3, 4, 4, 4])}`;
  }

  if (compact.startsWith("00")) {
    return formatPhoneNumber(`+${compact.slice(2)}`, regionCode);
  }

  let digits = compact.replace(/\D/g, "");
  if (region.countryCode === "1" && digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  } else if (digits.startsWith(region.countryCode) && digits.length > region.countryCode.length + 4) {
    digits = digits.slice(region.countryCode.length);
  } else if (region.trunkPrefix && digits.startsWith(region.trunkPrefix)) {
    digits = digits.slice(region.trunkPrefix.length);
  }

  return `+${region.countryCode} ${groupDigits(digits, region.groups)}`.trim();
}

function groupDigits(digits, groups) {
  const clean = String(digits || "").replace(/\D/g, "");
  if (!clean) return "";

  const chunks = [];
  let cursor = 0;
  for (const size of groups) {
    if (cursor >= clean.length) break;
    chunks.push(clean.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < clean.length) chunks.push(clean.slice(cursor));
  return chunks.filter(Boolean).join(" ");
}

function phonePlaceholder(regionCode) {
  const placeholders = {
    ID: "08123456789",
    US: "2125550123",
    SG: "81234567",
    MY: "0123456789",
    AU: "0412345678",
    GB: "07123456789",
    JP: "09012345678",
  };
  return placeholders[regionCode] || "phone number";
}

function getSchoolLocation(value) {
  const normalized = normalizeLookupKey(value);
  if (!normalized) return "";
  if (SCHOOL_LOCATION_LOOKUP[normalized]) return SCHOOL_LOCATION_LOOKUP[normalized];
  const match = Object.entries(SCHOOL_LOCATION_LOOKUP).find(([school]) => normalized.includes(school) || school.includes(normalized));
  return match?.[1] || "";
}

function normalizeLookupKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function smartTitleCase(value) {
  const normalized = String(value || "").trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const acronyms = {
    binus: "BINUS",
    ui: "UI",
    itb: "ITB",
    ugm: "UGM",
    ipb: "IPB",
    its: "ITS",
    mit: "MIT",
    nyu: "NYU",
    gpa: "GPA",
    sql: "SQL",
    api: "API",
    ai: "AI",
    ml: "ML",
    ny: "NY",
    ma: "MA",
    ca: "CA",
  };
  const lowerWords = new Set(["and", "or", "of", "for", "in", "on", "at", "to", "the"]);

  let wordIndex = 0;
  return normalized.replace(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g, (word) => {
    const key = word.toLowerCase();
    const isFirstWord = wordIndex === 0;
    wordIndex += 1;
    if (acronyms[key]) return acronyms[key];
    if (!isFirstWord && lowerWords.has(key)) return key;
    if (/[0-9]/.test(word)) return word.toUpperCase();
    return key.charAt(0).toUpperCase() + key.slice(1);
  });
}

function titleCase(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "harvard-ats-cv";
}

createRoot(document.getElementById("root")).render(<App />);
