import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ResumeContent } from "@/lib/schemas";

/**
 * ATS-safe, single-column, black-on-white layouts. No photos, standard fonts
 * (Helvetica is built into @react-pdf), generous margins. Rendered to a buffer
 * server-side and uploaded to Vercel Blob.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 28,
    paddingHorizontal: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: "#111111",
    lineHeight: 1.28,
  },
  name: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  contactLine: { fontSize: 8.2, color: "#333333", marginBottom: 7 },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottom: "0.75pt solid #000000",
    paddingBottom: 1.5,
    marginTop: 8,
    marginBottom: 3.5,
  },
  summary: { marginBottom: 1 },
  entry: { marginBottom: 4.5 },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  entryTitle: { fontFamily: "Helvetica-Bold" },
  entryOrg: { fontFamily: "Helvetica-Oblique" },
  entryDates: { fontSize: 8.2, color: "#333333" },
  bulletRow: { flexDirection: "row", marginTop: 1, paddingRight: 6 },
  bulletDot: { width: 9, fontSize: 9 },
  bulletText: { flex: 1 },
  skillRow: { flexDirection: "row", marginTop: 1 },
  skillCategory: { fontFamily: "Helvetica-Bold", marginRight: 4 },
});

function Bullet({ children }: { children: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

function dateRange(start?: string, end?: string) {
  if (start && end) return `${start} – ${end}`;
  return start || end || "";
}

export function ResumePdf({ content }: { content: ResumeContent }) {
  const c = content.contact;
  const contactBits = [c.location, c.phone, c.email, c.linkedin, c.website]
    .filter(Boolean)
    .join("  |  ");

  return (
    <Document
      title={`${c.name} — Resume`}
      author={c.name}
      creator="Lyze"
      producer="Lyze"
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{c.name}</Text>
        {contactBits ? <Text style={styles.contactLine}>{contactBits}</Text> : null}

        {content.summary ? (
          <>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.summary}>{content.summary}</Text>
          </>
        ) : null}

        {content.experience.length ? (
          <>
            <Text style={styles.sectionTitle}>Professional Experience</Text>
            {content.experience.map((e, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {e.company}
                    {e.location ? `, ${e.location}` : ""}
                  </Text>
                  <Text style={styles.entryDates}>
                    {dateRange(e.startDate, e.endDate)}
                  </Text>
                </View>
                <Text style={styles.entryOrg}>{e.title}</Text>
                {e.bullets.map((b, j) => (
                  <Bullet key={j}>{b}</Bullet>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {content.extracurricular.length ? (
          <>
            <Text style={styles.sectionTitle}>Leadership &amp; Involvement</Text>
            {content.extracurricular.map((x, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{x.organization}</Text>
                  <Text style={styles.entryDates}>
                    {dateRange(x.startDate, x.endDate)}
                  </Text>
                </View>
                <Text style={styles.entryOrg}>{x.role}</Text>
                {x.bullets.map((b, j) => (
                  <Bullet key={j}>{b}</Bullet>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {content.skills.length ? (
          <>
            <Text style={styles.sectionTitle}>Skills</Text>
            {content.skills.map((s, i) => (
              <View key={i} style={styles.skillRow}>
                <Text style={styles.skillCategory}>{s.category}:</Text>
                <Text style={styles.bulletText}>{s.items.join(", ")}</Text>
              </View>
            ))}
          </>
        ) : null}

        {content.education.length ? (
          <>
            <Text style={styles.sectionTitle}>Education</Text>
            {content.education.map((ed, i) => (
              <View key={i} style={styles.entry} wrap={false}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>
                    {ed.institution}
                    {ed.location ? `, ${ed.location}` : ""}
                  </Text>
                  <Text style={styles.entryDates}>
                    {dateRange(ed.startDate, ed.endDate)}
                  </Text>
                </View>
                <Text style={styles.entryOrg}>{ed.degree}</Text>
                {(ed.details ?? []).map((d, j) => (
                  <Bullet key={j}>{d}</Bullet>
                ))}
              </View>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

/* -------------------------------------------------------------------------- */
/* Render helper — called from the (non-JSX) route handler                    */
/* -------------------------------------------------------------------------- */

export function renderResumePdf(content: ResumeContent): Promise<Buffer> {
  return renderToBuffer(<ResumePdf content={content} />);
}
