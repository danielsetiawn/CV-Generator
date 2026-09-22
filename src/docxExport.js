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
      const entries = data.education || [];
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
      const entries = data[key] || [];
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
