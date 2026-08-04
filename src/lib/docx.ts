import "server-only";
import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Document,
  type Element,
  type Node,
} from "@xmldom/xmldom";
import type { ParsedDocxLine } from "@/lib/schemas";

/**
 * In-place .docx editing. We open the zip, edit the visible text inside existing
 * runs of `word/document.xml`, and write the zip back — never touching styles,
 * numbering, fonts, or run properties. Only the characters change, so the
 * exported file keeps the original's formatting exactly.
 *
 * Reworded text for a paragraph is written into that paragraph's first content
 * text node and the rest are emptied; this preserves the paragraph's own run
 * styling (fonts/size/bold/spacing) even when Word fragmented it into many runs
 * (spellcheck markers, etc.). A leading bullet-glyph run is left intact.
 */

const DOC_PART = "word/document.xml";
const BULLET_GLYPH_RE = /^[••▪●‣⁃\-–—*]+$/;

export interface DocxLine {
  id: string;
  text: string;
}

export interface DocxParseResult {
  lines: ParsedDocxLine[];
  paragraphCount: number;
  warnings: string[];
}

function textContent(node: Node): string {
  return node.textContent ?? "";
}

/** Ordered tokens (text + tab markers) of a paragraph, so we can read
 * tab-structured header lines ("Company\tLocation", "Title\tDates"). */
function paragraphTokens(p: Element): { tab: boolean; text: string }[] {
  const out: { tab: boolean; text: string }[] = [];
  const walk = (node: Node) => {
    for (let i = 0; i < node.childNodes.length; i++) {
      const c = node.childNodes.item(i);
      if (!c) continue;
      // Skip paragraph properties — its <w:tabs> holds tab-STOP definitions,
      // not the actual tab characters we care about (those live in runs).
      if (c.nodeName === "w:pPr") continue;
      if (c.nodeName === "w:t") out.push({ tab: false, text: textContent(c) });
      else if (c.nodeName === "w:tab") out.push({ tab: true, text: "" });
      else if (c.nodeName === "w:p" && node !== p) continue; // skip nested paras
      else if (c.nodeType === 1) walk(c);
    }
  };
  walk(p);
  return out;
}

/** Paragraph text with tabs rendered as \t (for readable final text). */
function paragraphTextTabbed(p: Element): string {
  return paragraphTokens(p)
    .map((t) => (t.tab ? "\t" : t.text))
    .join("");
}

/** Text before the first tab — the "left" cell of a header line (company/title). */
function firstSegment(p: Element): string {
  let s = "";
  for (const tok of paragraphTokens(p)) {
    if (tok.tab) break;
    s += tok.text;
  }
  return s.trim();
}

const SECTION_RE =
  /^(education|professional experience|work experience|experience|employment(?: history)?|technical skills|skills(?: (?:&|and) additional information)?|core competencies|projects|leadership(?: (?:&|and) involvement)?|involvement|activities|summary|profile|objective|certifications?|licenses?|awards|honou?rs|interests|additional information|publications|volunteer(?:ing| experience)?|references|contact)$/i;

/** A resume section heading — either ALL CAPS, or a known section name (any case). */
function isSectionHeading(text: string): boolean {
  const t = text.trim();
  if (t.length > 50) return false;
  if (/^[A-Z][A-Z &/,'.-]{2,44}$/.test(t)) return true;
  return SECTION_RE.test(t);
}

function isContactLine(text: string): boolean {
  return (
    /[\w.+-]+@[\w.-]+\.\w+/.test(text) ||
    /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(text)
  );
}

/** "title — company" from the block's first (org) and last (role) header. */
function deriveGroup(org: string, title: string): string {
  if (org && title && org !== title) return `${title} — ${org}`;
  return title || org;
}

/** All <w:t> descendants of a paragraph, in document order. */
function textNodesOf(p: Element): Element[] {
  const nodes = p.getElementsByTagName("w:t");
  const out: Element[] = [];
  for (let i = 0; i < nodes.length; i++) out.push(nodes.item(i)!);
  return out;
}

function paragraphText(p: Element): string {
  return textNodesOf(p)
    .map((t) => textContent(t))
    .join("");
}

function hasNumbering(p: Element): boolean {
  return p.getElementsByTagName("w:numPr").length > 0;
}

function hasTab(p: Element): boolean {
  return p.getElementsByTagName("w:tab").length > 0;
}

/** The <w:r> run a text node belongs to. */
function runOf(t: Element): Element | null {
  let n: Node | null = t.parentNode;
  while (n && n.nodeName !== "w:r") n = n.parentNode;
  return (n as Element) ?? null;
}

/** Whether a text node's run is bold (w:b on, ignoring bCs/explicit-off). */
function isBoldRun(t: Element): boolean {
  const run = runOf(t);
  if (!run) return false;
  let rpr: Element | null = null;
  for (let i = 0; i < run.childNodes.length; i++) {
    const c = run.childNodes.item(i);
    if (c && c.nodeName === "w:rPr") {
      rpr = c as Element;
      break;
    }
  }
  if (!rpr) return false;
  const bs = rpr.getElementsByTagName("w:b"); // exact name; excludes w:bCs
  for (let i = 0; i < bs.length; i++) {
    const val = bs.item(i)!.getAttribute("w:val");
    if (val === "false" || val === "0" || val === "none") continue;
    return true;
  }
  return false;
}

/**
 * Decide whether a paragraph is resume CONTENT we should reword. Deterministic —
 * parse and export must classify identically so ids line up.
 *
 * Reword: list-item bullets, glyph bullets, or clearly-prose lines.
 * Never: tab-structured header lines (Company→Location, Title→Dates), contact
 * lines (email/phone/URLs), section headings (ALL CAPS / very short).
 */
function isRewordable(text: string, numbered: boolean, tabbed: boolean): boolean {
  const t = text.trim();
  if (!t) return false;
  // Contact / links — never sent, never reworded.
  if (/[\w.+-]+@[\w.-]+\.\w+/.test(t)) return false;
  if (/\bhttps?:\/\/|linkedin\.com|github\.com/i.test(t)) return false;
  if (/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(t)) return false;

  const glyphBullet = BULLET_GLYPH_RE.test(t.split(/\s+/)[0] ?? "");
  if (numbered || glyphBullet) return true;

  // Tab-structured lines are entry headers — leave them alone.
  if (tabbed) return false;
  // Prose (e.g. a summary): a real sentence, not a heading.
  if (t.length < 120) return false;
  if (t === t.toUpperCase()) return false;
  return true;
}

async function loadDoc(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const part = zip.file(DOC_PART);
  if (!part) throw new Error("This .docx has no word/document.xml — it may be corrupt.");
  const xml = await part.async("string");
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  return { zip, doc };
}

function allParagraphs(doc: Document): Element[] {
  const ps = doc.getElementsByTagName("w:p");
  const out: Element[] = [];
  for (let i = 0; i < ps.length; i++) out.push(ps.item(i)!);
  return out;
}

export async function parseDocxResume(buffer: Buffer): Promise<DocxParseResult> {
  const { zip, doc } = await loadDoc(buffer);

  const warnings: string[] = [];
  const docXml = await zip.file(DOC_PART)!.async("string");
  if (docXml.includes("<w:tbl>")) {
    warnings.push(
      "This resume uses tables. Content inside table cells may not be reliably tailoured.",
    );
  }
  if (docXml.includes("<w:txbxContent")) {
    warnings.push(
      "This resume uses text boxes. Text inside them will not be tailoured.",
    );
  }

  const paragraphs = allParagraphs(doc);
  const lines: ParsedDocxLine[] = [];

  // Walk in order, tracking the current position header so each rewordable line
  // can be grouped by the job it sits under. Within a header block the FIRST
  // line is usually the org/company and the LAST is the role/title.
  let orgLine = "";
  let titleLine = "";
  let prevWasBullet = false;

  paragraphs.forEach((p, i) => {
    const raw = paragraphText(p).trim();
    if (!raw) return;

    if (isRewordable(raw, hasNumbering(p), hasTab(p))) {
      lines.push({
        id: `p${i}`,
        text: raw,
        group: deriveGroup(orgLine, titleLine),
      });
      prevWasBullet = true;
      return;
    }

    if (isSectionHeading(raw) || isContactLine(raw)) {
      orgLine = "";
      titleLine = "";
      prevWasBullet = false;
      return;
    }

    // A non-rewordable, non-heading line = an entry header (company / title).
    const seg = firstSegment(p) || raw;
    if (prevWasBullet) {
      orgLine = seg; // a new header block after a run of bullets
      titleLine = seg;
    } else {
      if (!orgLine) orgLine = seg;
      titleLine = seg;
    }
    prevWasBullet = false;
  });

  return { lines, paragraphCount: paragraphs.length, warnings };
}

/**
 * The full tailoured resume text: every paragraph in order, with reworded lines
 * substituted for their originals and tab-structured headers preserved. Used to
 * build the structured JSON from the SAME content as the exported document.
 */
export async function buildFinalText(
  buffer: Buffer,
  edits: DocxLine[],
): Promise<string> {
  const { doc } = await loadDoc(buffer);
  const editMap = new Map(edits.map((e) => [e.id, e.text]));
  const paragraphs = allParagraphs(doc);
  const out: string[] = [];
  paragraphs.forEach((p, i) => {
    const edit = editMap.get(`p${i}`);
    out.push(edit !== undefined ? edit : paragraphTextTabbed(p));
  });
  return out
    .join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isGlyphOnly(t: Element): boolean {
  const s = textContent(t).trim();
  return s === "" || BULLET_GLYPH_RE.test(s);
}

function setNodeText(doc: Document, t: Element, text: string) {
  while (t.firstChild) t.removeChild(t.firstChild);
  t.appendChild(doc.createTextNode(text));
  t.setAttribute("xml:space", "preserve");
}

function clearNode(t: Element) {
  while (t.firstChild) t.removeChild(t.firstChild);
}

/**
 * Write `text` back into a paragraph while preserving its run formatting. Two
 * cases handled explicitly so bold is never gained or lost:
 *
 *  - "Bold label: normal body" (e.g. skills lines "Technical: Excel, …"):
 *    split the reworded text at the first colon and keep the label in the bold
 *    run and the body in the normal run — so every reworded label stays bold,
 *    consistently.
 *  - Otherwise: write into the longest NON-BOLD run when one exists (so a
 *    bullet never becomes bold just because one sub-run happened to be bold);
 *    fall back to the longest run only when the whole line is bold.
 *
 * We only ever change <w:t> text — run properties (bold/size/font) are never
 * modified. A leading bullet-glyph run is preserved.
 */
function writeParagraphText(doc: Document, p: Element, text: string) {
  const tNodes = textNodesOf(p);
  if (tNodes.length === 0) return;

  const content = tNodes
    .map((t, i) => ({ t, i, len: textContent(t).trim().length, bold: isBoldRun(t) }))
    .filter((c) => !isGlyphOnly(c.t));

  if (content.length === 0) {
    setNodeText(doc, tNodes[0], text);
    return;
  }

  const allBold = content.every((c) => c.bold);
  const first = content[0];
  const colon = text.indexOf(":");

  // Bold-label + normal-body line.
  if (first.bold && !allBold && /:/.test(textContent(first.t)) && colon > 0) {
    const labelPart = text.slice(0, colon + 1);
    const bodyPart = text.slice(colon + 1);
    const bodyCandidates = content.filter((c) => c.i !== first.i);
    const nonBold = bodyCandidates.filter((c) => !c.bold);
    const bodyCarrier = (nonBold.length ? nonBold : bodyCandidates).reduce((a, b) =>
      b.len > a.len ? b : a,
    );
    tNodes.forEach((t, i) => {
      if (i !== first.i && i !== bodyCarrier.i && isGlyphOnly(t)) return;
      if (i === first.i) setNodeText(doc, t, labelPart);
      else if (i === bodyCarrier.i) setNodeText(doc, t, bodyPart);
      else clearNode(t);
    });
    return;
  }

  // Normal line: carry the style of the longest non-bold run (or longest run
  // if the whole line is bold), never introducing bold on body text.
  const nonBold = content.filter((c) => !c.bold);
  const carrier = (nonBold.length ? nonBold : content).reduce((a, b) =>
    b.len > a.len ? b : a,
  );
  tNodes.forEach((t, i) => {
    if (i !== carrier.i && isGlyphOnly(t)) return;
    if (i === carrier.i) setNodeText(doc, t, text);
    else clearNode(t);
  });
}

export async function applyDocxEdits(
  buffer: Buffer,
  edits: DocxLine[],
): Promise<Buffer> {
  const { zip, doc } = await loadDoc(buffer);
  const editMap = new Map(edits.map((e) => [e.id, e.text]));
  const paragraphs = allParagraphs(doc);

  paragraphs.forEach((p, i) => {
    const next = editMap.get(`p${i}`);
    if (next !== undefined) writeParagraphText(doc, p, next);
  });

  const serialized = new XMLSerializer().serializeToString(doc);
  zip.file(DOC_PART, serialized);
  const out = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  return out as Buffer;
}
