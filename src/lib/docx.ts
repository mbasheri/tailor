import "server-only";
import JSZip from "jszip";
import {
  DOMParser,
  XMLSerializer,
  type Document,
  type Element,
  type Node,
} from "@xmldom/xmldom";

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
  lines: DocxLine[];
  paragraphCount: number;
  warnings: string[];
}

function textContent(node: Node): string {
  return node.textContent ?? "";
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
      "This resume uses tables. Content inside table cells may not be reliably tailored.",
    );
  }
  if (docXml.includes("<w:txbxContent")) {
    warnings.push(
      "This resume uses text boxes. Text inside them will not be tailored.",
    );
  }

  const paragraphs = allParagraphs(doc);
  const lines: DocxLine[] = [];
  paragraphs.forEach((p, i) => {
    const text = paragraphText(p);
    if (isRewordable(text, hasNumbering(p), hasTab(p))) {
      lines.push({ id: `p${i}`, text: text.trim() });
    }
  });

  return { lines, paragraphCount: paragraphs.length, warnings };
}

function isGlyphOnly(t: Element): boolean {
  const s = textContent(t).trim();
  return s === "" || BULLET_GLYPH_RE.test(s);
}

/**
 * Write `text` into a paragraph, carrying the style of its DOMINANT run — the
 * run that held the most text — rather than always the first run. This matters
 * for mixed-format lines: a bold label + normal body (e.g. "Technical: Excel,
 * …") would, if we used the first run, extend the label's bold across the whole
 * line. Using the longest (body) run keeps the line's normal weight and never
 * reintroduces bold on a line that was mostly unbolded. We touch only <w:t>
 * text — run properties (bold/size/font) are never modified. A leading
 * bullet-glyph run is preserved.
 */
function writeParagraphText(doc: Document, p: Element, text: string) {
  const tNodes = textNodesOf(p);
  if (tNodes.length === 0) return;

  // Dominant = the non-glyph text node holding the most characters.
  let dominantIdx = -1;
  let maxLen = -1;
  tNodes.forEach((t, i) => {
    if (isGlyphOnly(t)) return;
    const len = textContent(t).trim().length;
    if (len > maxLen) {
      maxLen = len;
      dominantIdx = i;
    }
  });
  if (dominantIdx === -1) {
    dominantIdx = tNodes.findIndex((t) => !isGlyphOnly(t));
  }
  if (dominantIdx === -1) dominantIdx = 0;

  tNodes.forEach((t, i) => {
    if (i !== dominantIdx && isGlyphOnly(t)) return; // keep bullet glyph runs
    while (t.firstChild) t.removeChild(t.firstChild);
    if (i === dominantIdx) {
      t.appendChild(doc.createTextNode(text));
      t.setAttribute("xml:space", "preserve");
    }
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
