import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeStructure, ResumeEntry } from "@/lib/schemas";

/**
 * Renders the extracted resume STRUCTURE generically: sections in the order the
 * candidate used them, with their own headings, and each entry laid out from
 * whatever fields it carries. This follows the uploaded resume's skeleton rather
 * than imposing a fixed template. ATS-safe: single column, standard fonts, no
 * photos. It does not reproduce the original's exact fonts/columns/spacing —
 * that layout is not recoverable from extracted text (see README).
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#141414",
    lineHeight: 1.18,
  },
  name: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  contactLine: { fontSize: 8.3, color: "#333333", marginBottom: 3 },
  sectionTitle: {
    fontSize: 9.4,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "0.75pt solid #000000",
    paddingBottom: 1.5,
    marginTop: 6,
    marginBottom: 3,
  },
  entry: { marginBottom: 3 },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  entryHeaderLeft: { flex: 1, paddingRight: 10 },
  entryTitle: { fontFamily: "Helvetica-Bold" },
  entrySubtitle: { fontFamily: "Helvetica-Oblique" },
  entryMeta: {
    fontSize: 8.4,
    color: "#333333",
    textAlign: "right",
    flexShrink: 0,
  },
  entryText: { marginTop: 0.5 },
  bulletRow: { flexDirection: "row", marginTop: 0.5, paddingRight: 6 },
  bulletDot: { width: 9, fontSize: 9 },
  bulletText: { flex: 1 },
});

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function Entry({ entry }: { entry: ResumeEntry }) {
  const hasHeaderLeft = entry.title || entry.subtitle;
  const meta = [entry.dateRange, entry.location].filter(Boolean).join(" · ");

  // Skills-style line: a category title followed by an inline list.
  if (entry.title && entry.text && entry.bullets.length === 0) {
    return (
      <View style={styles.entry} wrap={false}>
        <Text>
          <Text style={styles.entryTitle}>{entry.title}: </Text>
          {entry.text}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.entry} wrap={false}>
      {hasHeaderLeft || meta ? (
        <View style={styles.entryHeader}>
          <Text style={styles.entryHeaderLeft}>
            {entry.title ? (
              <Text style={styles.entryTitle}>{entry.title}</Text>
            ) : null}
            {entry.title && entry.subtitle ? <Text> — </Text> : null}
            {entry.subtitle ? (
              <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
            ) : null}
          </Text>
          {meta ? <Text style={styles.entryMeta}>{meta}</Text> : null}
        </View>
      ) : null}
      {entry.text ? <Text style={styles.entryText}>{entry.text}</Text> : null}
      {entry.bullets.map((b, i) => (
        <Bullet key={i}>{b}</Bullet>
      ))}
    </View>
  );
}

export function ResumePdf({ resume }: { resume: ResumeStructure }) {
  const c = resume.contact;
  const contactBits = [c.location, c.phone, c.email, c.linkedin, c.website]
    .filter(Boolean)
    .join("  |  ");

  return (
    <Document
      title={`${c.name || "Resume"} — Tailored`}
      author={c.name || "Candidate"}
      creator="Tailor"
      producer="Tailor"
    >
      <Page size="LETTER" style={styles.page}>
        {c.name ? <Text style={styles.name}>{c.name}</Text> : null}
        {contactBits ? <Text style={styles.contactLine}>{contactBits}</Text> : null}

        {resume.sections.map((section, i) => (
          <View key={i}>
            <Text style={styles.sectionTitle}>{section.heading}</Text>
            {section.entries.map((entry, j) => (
              <Entry key={j} entry={entry} />
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}

export function renderResumePdf(resume: ResumeStructure): Promise<Buffer> {
  return renderToBuffer(<ResumePdf resume={resume} />);
}
