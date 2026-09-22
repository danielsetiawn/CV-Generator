import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  TabStopType,
  BorderStyle,
} from "docx";

const USABLE_WIDTH_TWIPS = 10800; // 7.5 inches at 1440 twips/inch (8.5" - 2 * 0.5")

export async function generateDocxBlob(data) {
  const profile = data.profile || {};
  const paragraphs = [];

  // Profile Name (Heading 1)
  const name = (profile.name || "Your Name").trim();
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40, line: 240 },
      children: [
        new TextRun({
          text: name,
          bold: true,
          size: 32, // 16pt
          font: "Calibri",
        }),
      ],
    })
  );

  // Contact Info
  const contactParts = [
    profile.location,
    profile.email,
    profile.phone,
    profile.linkedin,
    profile.website,
  ].filter(Boolean).map((part) => String(part).trim());

  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 80, line: 240 },
        children: [
          new TextRun({
            text: contactParts.join(" | "),
            size: 21, // 10.5pt
            font: "Calibri",
          }),
        ],
      })
    );
  }

  // Section Order
  const sectionOrder = data.section_order || ["education", "experience", "projects", "leadership", "skills"];

  for (const section of sectionOrder) {
    const key = String(section).toLowerCase();

    if (key === "education") {
      const entries = sortByTimelineDesc(data.education || []);
      if (entries.length > 0) {
        paragraphs.push(createSectionHeading("Education"));
        for (const item of entries) {
          const school = (item.school || "").trim();
          const location = (item.location || "").trim();
          const degree = (item.degree || "").trim();
          const date = (item.graduation_date || item.dates || "").trim();
          const detailParts = [item.concentration, item.gpa ? `GPA ${item.gpa}` : ""].filter(Boolean);
          const degreeLine = [degree, ...detailParts].filter(Boolean).join(". ");

          if (!school && !degree && !(item.bullets && item.bullets.length)) continue;

          if (school || location) {
            paragraphs.push(createTabbedLine(school || degree, location, { boldLeft: true, boldRight: true }));
            if (school && (degreeLine || date)) {
              paragraphs.push(createTabbedLine(degreeLine, date, { italicLeft: true }));
            }
          } else if (degreeLine || date) {
            paragraphs.push(createTabbedLine(degreeLine, date, { italicLeft: true }));
          }

          if (item.relevant_coursework && item.relevant_coursework.length > 0) {
            paragraphs.push(createLabelLine("Relevant Coursework", item.relevant_coursework.join(", ")));
          }
          if (item.honors && item.honors.length > 0) {
            paragraphs.push(createLabelLine("Honors", item.honors.join(", ")));
          }

          if (Array.isArray(item.bullets)) {
            for (const bullet of item.bullets) {
              const text = String(bullet || "").trim();
              if (text) paragraphs.push(createBulletParagraph(text));
            }
          }
        }
      }
    } else if (["experience", "projects", "leadership"].includes(key)) {
      const titleMap = {
        experience: "Experience",
        projects: "Projects",
        leadership: "Leadership & Activities",
      };
      const entries = sortByTimelineDesc(data[key] || []);
      if (entries.length > 0) {
        paragraphs.push(createSectionHeading(titleMap[key] || key));
        for (const item of entries) {
          const org = (item.organization || "").trim();
          const location = (item.location || "").trim();
          const role = (item.title || "").trim();
          const dates = (item.dates || "").trim();
          const bullets = item.bullets || [];

          if (!org && !role && !bullets.length) continue;

          if (org || location) {
            paragraphs.push(createTabbedLine(org, location, { boldLeft: true, boldRight: true }));
          }
          if (role || dates) {
            paragraphs.push(createTabbedLine(role, dates, { italicLeft: true }));
          }

          for (const bullet of bullets) {
            const text = String(bullet || "").trim();
            if (text) paragraphs.push(createBulletParagraph(text));
          }
        }
      }
    } else if (key === "skills") {
      const skills = data.skills || {};
      const interests = data.interests || [];
      const hasSkills = Object.values(skills).some((list) => Array.isArray(list) && list.length > 0);
      const hasInterests = interests.length > 0;

      if (hasSkills || hasInterests) {
        paragraphs.push(createSectionHeading("Skills & Interests"));
        for (const [label, values] of Object.entries(skills)) {
          if (Array.isArray(values) && values.length > 0) {
            const displayLabel = label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            paragraphs.push(createLabelLine(displayLabel, values.join(", ")));
          }
        }
        if (hasInterests) {
          paragraphs.push(createLabelLine("Interests", interests.join(", ")));
        }
      }
    }
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Calibri",
            size: 21, // 10.5pt
            color: "000000",
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

function createSectionHeading(title) {
  return new Paragraph({
    spacing: { before: 140, after: 40, line: 240 },
    border: {
      bottom: {
        color: "000000",
        space: 2,
        style: BorderStyle.SINGLE,
        size: 8,
      },
    },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 22, // 11pt
        font: "Calibri",
      }),
    ],
  });
}

function createTabbedLine(left, right, { boldLeft = false, boldRight = false, italicLeft = false, italicRight = false } = {}) {
  const children = [
    new TextRun({
      text: left,
      bold: boldLeft,
      italics: italicLeft,
      size: 21,
      font: "Calibri",
    }),
  ];

  if (right) {
    children.push(
      new TextRun({
        text: `\t${right}`,
        bold: boldRight,
        italics: italicRight,
        size: 21,
        font: "Calibri",
      })
    );
  }

  return new Paragraph({
    tabStops: [
      {
        type: TabStopType.RIGHT,
        position: USABLE_WIDTH_TWIPS,
      },
    ],
    spacing: { before: 0, after: 0, line: 240 },
    children,
  });
}

function createLabelLine(label, value) {
  return new Paragraph({
    spacing: { before: 0, after: 0, line: 240 },
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 21,
        font: "Calibri",
      }),
      new TextRun({
        text: value,
        size: 21,
        font: "Calibri",
      }),
    ],
  });
}

function createBulletParagraph(text) {
  return new Paragraph({
    bullet: {
      level: 0,
    },
    spacing: { before: 0, after: 0, line: 240 },
    children: [
      new TextRun({
        text,
        size: 21,
        font: "Calibri",
      }),
    ],
  });
}

const MONTH_LOOKUP = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  january: 1, february: 2, march: 3, april: 4, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function extractDateValue(str) {
  if (!str) return 0;
  const lower = String(str).toLowerCase().trim();
  if (/present|current|now/.test(lower)) return 999999;

  const ym = lower.match(/^(\d{4})-(\d{2})$/);
  if (ym) {
    return parseInt(ym[1], 10) * 100 + parseInt(ym[2], 10);
  }

  const my = lower.match(/([a-z]+)\s+(\d{4})/);
  if (my && MONTH_LOOKUP[my[1]]) {
    return parseInt(my[2], 10) * 100 + MONTH_LOOKUP[my[1]];
  }

  const y = lower.match(/\b(19|20)\d{2}\b/);
  if (y) {
    return parseInt(y[0], 10) * 100 + 12;
  }
  return 0;
}

function extractStartDateValue(datesStr) {
  if (!datesStr) return 0;
  const parts = String(datesStr).split(/[-–]/);
  return extractDateValue(parts[0]);
}

function getEntryTimelineScore(entry) {
  if (entry._isCurrent || /present|current|now/i.test(entry.dates || "")) {
    const start = entry._startMonth ? extractDateValue(entry._startMonth) : extractStartDateValue(entry.dates);
    return { end: 999999, start };
  }

  const dates = entry.dates || entry.graduation_date || "";
  const parts = String(dates).split(/[-–]/);

  let endScore = 0;
  let startScore = 0;

  if (parts.length === 2) {
    startScore = extractDateValue(parts[0]);
    endScore = extractDateValue(parts[1]);
  } else if (parts.length === 1) {
    endScore = extractDateValue(parts[0]);
    startScore = endScore;
  }

  if (entry._endMonth) endScore = extractDateValue(entry._endMonth);
  if (entry._startMonth) startScore = extractDateValue(entry._startMonth);
  if (entry._graduationMonth) endScore = extractDateValue(entry._graduationMonth);

  return { end: endScore, start: startScore };
}

function sortByTimelineDesc(entries) {
  return [...entries].sort((a, b) => {
    const scoreA = getEntryTimelineScore(a);
    const scoreB = getEntryTimelineScore(b);
    if (scoreB.end !== scoreA.end) {
      return scoreB.end - scoreA.end;
    }
    return scoreB.start - scoreA.start;
  });
}
