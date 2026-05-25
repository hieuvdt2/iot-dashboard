/**
 * Convert REPORT_Vuon_Thong_Minh.md → .docx (ĐATN formatting — GTVT).
 * Pure Node.js, no npm. Run: node scripts/report-to-docx.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import zlib from "zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MD_PATH = path.join(ROOT, "REPORT_Vuon_Thong_Minh.md");
const OUT_PATH = path.join(ROOT, "REPORT_Vuon_Thong_Minh.docx");

// Margins & sizes (twips: 1 cm ≈ 567)
const MARGIN = { top: 1417, right: 1134, bottom: 1417, left: 1701 };
const SZ = { chapter: 36, section: 32, subsection: 28, body: 26, code: 22 };
const INDENT_BODY = 567; // 1 cm first line

function esc(s) {
  return String(s)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ensureRuns(content) {
  if (!content || !String(content).includes("<w:r")) {
    return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${SZ.body}"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`;
  }
  return content;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function zipStore(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    parts.push(local, data);
    const cen = Buffer.alloc(46 + nameBuf.length);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(0, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    nameBuf.copy(cen, 46);
    central.push(cen);
    offset += local.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const body = Buffer.concat(parts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(body.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([body, centralBuf, end]);
}

function zipDeflate(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const { name, data: raw } of files) {
    const data = zlib.deflateRawSync(raw);
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(raw);
    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(8, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    parts.push(local, data);
    const cen = Buffer.alloc(46 + nameBuf.length);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt16LE(8, 8);
    cen.writeUInt16LE(0, 10);
    cen.writeUInt16LE(0, 12);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(data.length, 20);
    cen.writeUInt32LE(raw.length, 24);
    cen.writeUInt16LE(nameBuf.length, 28);
    cen.writeUInt16LE(0, 30);
    cen.writeUInt16LE(0, 32);
    cen.writeUInt16LE(0, 34);
    cen.writeUInt16LE(0, 36);
    cen.writeUInt32LE(0, 38);
    cen.writeUInt32LE(offset, 42);
    nameBuf.copy(cen, 46);
    central.push(cen);
    offset += local.length + data.length;
  }
  const centralBuf = Buffer.concat(central);
  const body = Buffer.concat(parts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(body.length, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([body, centralBuf, end]);
}

/** Inline markdown → runs XML */
function inlineRuns(text, base = {}) {
  const runs = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  const pushPlain = (t) => {
    if (!t) return;
    runs.push(runXml(t, base));
  };
  while ((m = re.exec(text)) !== null) {
    pushPlain(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) runs.push(runXml(tok.slice(2, -2), { ...base, bold: true }));
    else if (tok.startsWith("*")) runs.push(runXml(tok.slice(1, -1), { ...base, italic: true }));
    else if (tok.startsWith("`")) runs.push(runXml(tok.slice(1, -1), { ...base, code: true }));
    else {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      runs.push(runXml(lm ? lm[1] : tok, base));
    }
    last = m.index + tok.length;
  }
  pushPlain(text.slice(last));
  return runs.join("");
}

function runXml(text, { bold, italic, code, size } = {}) {
  const sz = size ?? (code ? SZ.code : SZ.body);
  const font = code ? "Courier New" : "Times New Roman";
  let rPr = `<w:rPr><w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
  if (bold) rPr += "<w:b/><w:bCs/>";
  if (italic) rPr += "<w:i/><w:iCs/>";
  if (code) rPr += '<w:rStyle w:val="CodeChar"/>';
  rPr += "</w:rPr>";
  const parts = esc(text).split("\n");
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) out.push("<w:r><w:br/></w:r>");
    const t = parts[i] === "" ? " " : parts[i];
    out.push(`<w:r>${rPr}<w:t xml:space="preserve">${t}</w:t></w:r>`);
  }
  return out.join("");
}

function paraXml(content, styleId, extraPr = "") {
  const pPr = styleId
    ? `<w:pPr><w:pStyle w:val="${styleId}"/>${extraPr}</w:pPr>`
    : extraPr
      ? `<w:pPr>${extraPr}</w:pPr>`
      : "";
  const runs = ensureRuns(
    typeof content === "string" && !content.includes("<w:r")
      ? `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${SZ.body}"/></w:rPr><w:t xml:space="preserve">${esc(content)}</w:t></w:r>`
      : content
  );
  return `<w:p>${pPr}${runs}</w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function tableXml(rows) {
  if (!rows.length) return "";
  const colCount = rows[0].length;
  const colW = Math.floor(9000 / colCount);
  const grid = `<w:tblGrid>${Array(colCount)
    .fill(0)
    .map(() => `<w:gridCol w:w="${colW}"/>`)
    .join("")}</w:tblGrid>`;
  const trs = rows
    .map((row, ri) => {
      const isHeader = ri === 0 || (ri === 1 && rows[0].every((c) => /^:?-+:?$/.test(c.trim())));
      const dataRow = isHeader && ri === 1 ? null : row;
      if (!dataRow) return "";
      const cells = dataRow
        .map((cell) => {
          const tcPr = `<w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>`;
          const inner = paraXml(inlineRuns(cell.trim()), ri === 0 ? null : "Normal", "");
          return `<w:tc>${tcPr}${inner.replace("<w:p>", '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>')}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .filter(Boolean);
  // Re-parse: skip separator row
  const bodyRows = [];
  for (let i = 0; i < rows.length; i++) {
    if (i === 1 && rows[i].every((c) => /^:?-+:?$/.test(c.replace(/\s/g, "")))) continue;
    bodyRows.push(rows[i]);
  }
  const trs2 = bodyRows
    .map((row, ri) => {
      const cells = row
        .map((cell) => {
          const tcPr = `<w:tcPr><w:tcW w:w="${colW}" w:type="dxa"/></w:tcPr>`;
          let p = paraXml(inlineRuns(cell.trim()), "Normal");
          if (ri === 0) p = p.replace("<w:p>", '<w:p><w:pPr><w:jc w:val="center"/></w:pPr>');
          return `<w:tc>${tcPr}${p}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>
    <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/>
    <w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/>
  </w:tblBorders></w:tblPr>${grid}${trs2}</w:tbl>`;
}

function parseTableRow(line) {
  const t = line.trim();
  if (!t.startsWith("|")) return null;
  return t
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function classifyHeading(line) {
  const m1 = line.match(/^# (.+)$/);
  if (m1) return { level: 0, text: m1[1], style: "Title" };
  const m2 = line.match(/^## (.+)$/);
  if (m2) {
    const t = m2[1];
    if (/^CHƯƠNG\s+\d+/i.test(t)) return { level: 1, text: t, style: "HeadingChapter", pageBreak: true };
    if (/^PHỤ LỤC|^KẾT LUẬN|^TÀI LIỆU/i.test(t)) return { level: 1, text: t, style: "HeadingChapter", pageBreak: true };
    return { level: 1, text: t, style: "HeadingFront", pageBreak: true };
  }
  const m3 = line.match(/^### (.+)$/);
  if (m3) {
    const t = m3[1];
    if (/^\d+\.\d+\./.test(t)) return { level: 2, text: t, style: "Heading2" };
    return { level: 2, text: t, style: "Heading2" };
  }
  const m4 = line.match(/^#### (.+)$/);
  if (m4) return { level: 3, text: m4[1], style: "Heading3" };
  return null;
}

function parseMarkdown(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  let inCode = false;
  let codeBuf = [];
  let tableBuf = [];

  const flushTable = () => {
    if (tableBuf.length) {
      blocks.push({ type: "table", rows: [...tableBuf] });
      tableBuf = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '<div style="page-break-after: always;"></div>') {
      flushTable();
      blocks.push({ type: "pageBreak" });
      i++;
      continue;
    }

    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push({ type: "code", text: codeBuf.join("\n") });
        codeBuf = [];
        inCode = false;
      } else {
        flushTable();
        inCode = true;
      }
      i++;
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      i++;
      continue;
    }

    const tr = parseTableRow(line);
    if (tr) {
      tableBuf.push(tr);
      i++;
      continue;
    }
    flushTable();

    const h = classifyHeading(line);
    if (h) {
      blocks.push({ type: "heading", ...h });
      i++;
      continue;
    }

    if (/^---+\s*$/.test(line.trim())) {
      i++;
      continue;
    }

    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (img) {
      blocks.push({ type: "image", alt: img[1], src: img[2] });
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "olist", items });
      continue;
    }

    if (line.trim() === "") {
      i++;
      continue;
    }

    const paras = [];
    while (i < lines.length && lines[i].trim() !== "" && !classifyHeading(lines[i]) && !parseTableRow(lines[i]) && !lines[i].startsWith("```") && !/^!\[/.test(lines[i]) && !/^[-*]\s+/.test(lines[i]) && lines[i].trim() !== '<div style="page-break-after: always;"></div>') {
      paras.push(lines[i]);
      i++;
    }
    if (paras.length) blocks.push({ type: "para", text: paras.join("\n") });
  }
  flushTable();
  return blocks;
}

function blocksToBody(blocks) {
  const out = [];
  let figNum = 0;
  let tblNum = 0;

  for (const b of blocks) {
    if (b.type === "pageBreak") {
      out.push(pageBreak());
      continue;
    }
    if (b.type === "heading") {
      // pageBreakBefore is in HeadingChapter / HeadingFront styles
      out.push(paraXml(inlineRuns(b.text, { bold: true, size: b.style === "Heading3" ? SZ.subsection : b.style === "Heading2" ? SZ.section : SZ.chapter }), b.style));
      continue;
    }
    if (b.type === "para") {
      const t = b.text.trim();
      if (/^\*Bảng\s/i.test(t) || /^\*Hình\s/i.test(t)) {
        out.push(paraXml(inlineRuns(t.replace(/^\*|\*$/g, ""), { italic: true }), "Caption"));
        continue;
      }
      out.push(paraXml(inlineRuns(t), "Normal"));
      continue;
    }
    if (b.type === "list" || b.type === "olist") {
      b.items.forEach((item, idx) => {
        const num = b.type === "olist" ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr>` : `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`;
        out.push(
          `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:ind w:left="720" w:hanging="360"/>${num}</w:pPr>${inlineRuns(item)}</w:p>`
        );
      });
      continue;
    }
    if (b.type === "table") {
      out.push(tableXml(b.rows));
      continue;
    }
    if (b.type === "code") {
      const lines = b.text.split("\n");
      for (const ln of lines) {
        out.push(paraXml(runXml(ln, { code: true }), "CodeBlock"));
      }
      continue;
    }
    if (b.type === "image") {
      const full = path.join(ROOT, b.src.replace(/\//g, path.sep));
      if (fs.existsSync(full)) {
        out.push(paraXml(`[Hình ảnh: ${b.alt || b.src}] — chèn thủ công từ ${b.src}`, "Caption"));
      } else {
        out.push(paraXml(`[${b.alt || "Hình"} — file chưa có: ${b.src}. Chèn ảnh sau khi xuất.]`, "Caption"));
      }
      figNum++;
      continue;
    }
  }
  return out.join("\n");
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>
      <w:sz w:val="${SZ.body}"/><w:szCs w:val="${SZ.body}"/>
      <w:lang w:val="vi-VN"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:spacing w:line="288" w:lineRule="auto" w:after="0" w:before="0"/>
      <w:jc w:val="both"/>
      <w:ind w:firstLine="${INDENT_BODY}"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr>
      <w:spacing w:line="288" w:lineRule="auto"/>
      <w:jc w:val="both"/>
      <w:ind w:firstLine="${INDENT_BODY}"/>
    </w:pPr>
    <w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="${SZ.body}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/><w:ind w:firstLine="0"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="${SZ.chapter}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="HeadingChapter">
    <w:name w:val="heading chapter"/>
    <w:pPr>
      <w:pageBreakBefore/>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="240" w:line="288" w:lineRule="auto"/>
      <w:ind w:firstLine="0" w:left="0"/>
    </w:pPr>
    <w:rPr><w:b/><w:sz w:val="${SZ.chapter}"/><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="HeadingFront">
    <w:name w:val="heading front"/>
    <w:pPr>
      <w:pageBreakBefore/>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="240"/>
      <w:ind w:firstLine="0"/>
    </w:pPr>
    <w:rPr><w:b/><w:sz w:val="${SZ.chapter}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr>
      <w:jc w:val="left"/>
      <w:spacing w:before="120" w:after="120" w:line="288" w:lineRule="auto"/>
      <w:ind w:firstLine="0" w:left="0"/>
    </w:pPr>
    <w:rPr><w:b/><w:sz w:val="${SZ.section}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:pPr>
      <w:jc w:val="left"/>
      <w:spacing w:before="120" w:after="120"/>
      <w:ind w:firstLine="0"/>
    </w:pPr>
    <w:rPr><w:b/><w:sz w:val="${SZ.subsection}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Caption">
    <w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/><w:spacing w:before="120" w:after="120"/></w:pPr>
    <w:rPr><w:i/><w:sz w:val="${SZ.body}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="CodeBlock">
    <w:pPr><w:jc w:val="left"/><w:ind w:firstLine="0" w:left="360"/><w:spacing w:line="276" w:lineRule="auto"/></w:pPr>
  </w:style>
  <w:style w:type="character" w:styleId="CodeChar">
    <w:rPr><w:rFonts w:ascii="Courier New" w:hAnsi="Courier New"/><w:sz w:val="${SZ.code}"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:pPr><w:ind w:left="720" w:firstLine="0"/><w:spacing w:line="288" w:lineRule="auto"/></w:pPr>
  </w:style>
</w:styles>`;

const numberingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="-"/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1">
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>
    <w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`;

const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:p>
    <w:pPr><w:jc w:val="center"/><w:ind w:firstLine="0"/></w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:t>1</w:t></w:r>
    <w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="20"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:hdr>`;

const headerRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
  xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>Thiết kế và xây dựng hệ thống vườn thông minh</dc:title>
  <dc:creator>Vũ Đức Trọng Hiếu</dc:creator>
  <cp:lastModifiedBy>report-to-docx</cp:lastModifiedBy>
</cp:coreProperties>`;

const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
  xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
</Properties>`;

const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Times New Roman"><w:panose1 w:val="02020603050405020304"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/></w:font>
  <w:font w:name="Courier New"><w:panose1 w:val="02070302040302040404"/><w:charset w:val="00"/><w:family w:val="modern"/><w:pitch w:val="fixed"/></w:font>
</w:fonts>`;

function buildDocument(bodyInner) {
  const sectPr = `<w:sectPr>
      <w:headerReference w:type="default" r:id="rId6"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="${MARGIN.top}" w:right="${MARGIN.right}" w:bottom="${MARGIN.bottom}" w:left="${MARGIN.left}"/>
    </w:sectPr>`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyInner}
    <w:p><w:pPr>${sectPr}</w:pPr></w:p>
  </w:body>
</w:document>`;
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const relsRoot = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const relsDoc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
  <Relationship Id="rId6" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`;

const settingsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:defaultTabStop w:val="720"/>
  <w:characterSpacingControl w:val="doNotCompress"/>
</w:settings>`;

function main() {
  const md = fs.readFileSync(MD_PATH, "utf8");
  const blocks = parseMarkdown(md);
  const body = blocksToBody(blocks);
  const documentXml = buildDocument(body);

  const files = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(relsRoot, "utf8") },
    { name: "docProps/core.xml", data: Buffer.from(coreXml, "utf8") },
    { name: "docProps/app.xml", data: Buffer.from(appXml, "utf8") },
    { name: "word/_rels/document.xml.rels", data: Buffer.from(relsDoc, "utf8") },
    { name: "word/_rels/header1.xml.rels", data: Buffer.from(headerRels, "utf8") },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
    { name: "word/styles.xml", data: Buffer.from(stylesXml, "utf8") },
    { name: "word/numbering.xml", data: Buffer.from(numberingXml, "utf8") },
    { name: "word/settings.xml", data: Buffer.from(settingsXml, "utf8") },
    { name: "word/fontTable.xml", data: Buffer.from(fontTableXml, "utf8") },
    { name: "word/header1.xml", data: Buffer.from(headerXml, "utf8") },
  ];

  const zip = zipStore(files);
  fs.writeFileSync(OUT_PATH, zip);
  console.log("Created:", OUT_PATH);
  console.log("Blocks:", blocks.length);
}

main();
