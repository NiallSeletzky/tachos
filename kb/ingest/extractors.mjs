import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB
export const MAX_CHUNKS_PER_DOCUMENT = 250;
const MAX_INFLATE_BYTES = 32 * 1024 * 1024;

export const GOOGLE_WORKSPACE_MIME_TYPES = Object.freeze({
  DOCUMENT: 'application/vnd.google-apps.document',
  SPREADSHEET: 'application/vnd.google-apps.spreadsheet',
  PRESENTATION: 'application/vnd.google-apps.presentation',
  FOLDER: 'application/vnd.google-apps.folder'
});

const ALLOWED_GOOGLE_WORKSPACE_MIMES = new Set([
  GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT,
  GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET,
  GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION
]);

const ALLOWED_EXTENSIONS = new Set([
  '.md',
  '.markdown',
  '.txt',
  '.csv',
  '.tsv',
  '.json',
  '.html',
  '.htm',
  '.docx',
  '.odt',
  '.pdf'
]);

const ALLOWED_NON_GOOGLE_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'text/json',
  'text/html',
  'application/xhtml+xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/pdf'
]);

/**
 * Strict privacy & safety denylist blocking corporate, accounting, billing,
 * personal, contract, OS metadata, and non-document binary files/folders.
 */
export const DEFAULT_EXCLUDED_PATTERNS = Object.freeze([
  // macOS / Windows OS metadata & AppleDouble files
  /(?:^|[/\\])\._/,
  /(?:^|[/\\])\.DS_Store$/i,
  /(?:^|[/\\])thumbs\.db$/i,

  // Corporate, finance, legal, personal & sensitive folder/file keywords
  /invoice/i,
  /billing/i,
  /contract/i,
  /accounting/i,
  /(?:^|[^a-z])tax(?!onomy)/i,
  /(?:^|[^a-z])bank/i,
  /banking/i,
  /insurance/i,
  /(?:^|[^a-z])health/i,
  /investing/i,
  /(?:^|[^a-z])propert(?:y|ies)/i,
  /timesheet/i,
  /freeagent/i,
  /payroll/i,
  /salar(?:y|ies)/i,
  /passport/i,
  /certificate/i,
  /corporate/i,
  /expenses?/i,
  /itinerar(?:y|ies)/i,
  /accommodation/i,
  /pension/i,
  /portfolio/i,
  /holdings/i,
  /watchlist/i,
  /clients\s*(?:&|and)\s*contracts/i,
  /james[\s._-]*control/i,
  /biographist/i,

  // Non-document binary extensions (archives, images, media, executables, Packet Tracer)
  /\.(?:zip|tar|gz|7z|rar)$/i,
  /\.(?:png|jpe?g|webp|gif|svg)$/i,
  /\.(?:mp4|mov|mp3|wav)$/i,
  /\.(?:exe|dmg|iso|bin|pkt)$/i
]);

export function sha256Hex(input) {
  const hash = crypto.createHash('sha256');
  if (Buffer.isBuffer(input) || input instanceof Uint8Array) {
    hash.update(input);
  } else {
    hash.update(String(input ?? ''), 'utf8');
  }
  return hash.digest('hex');
}

function findMatchingExcludedPattern(targets, extraPatterns = []) {
  const allPatterns = extraPatterns.length > 0
    ? [...DEFAULT_EXCLUDED_PATTERNS, ...extraPatterns]
    : DEFAULT_EXCLUDED_PATTERNS;

  for (const target of targets) {
    if (!target) continue;
    const normalized = String(target).replace(/\\/g, '/');
    for (const pattern of allPatterns) {
      if (pattern instanceof RegExp && pattern.test(normalized)) {
        return pattern;
      }
    }
  }
  return null;
}

/**
 * Checks whether a folder name/path is safe to descend into (never enters private/excluded folders).
 */
export function isAllowedTechnicalFolder({ name = '', path: folderPath = '' } = {}) {
  const cleanName = String(name || '').trim();
  const cleanPath = String(folderPath || '').trim();
  const matched = findMatchingExcludedPattern([cleanName, cleanPath]);
  if (matched) {
    return {
      allowed: false,
      reason: `Excluded folder matched denylist pattern ${matched}`
    };
  }
  // Never descend into hidden dot-folders like .git, .Trash, etc.
  if (cleanName.startsWith('.')) {
    return {
      allowed: false,
      reason: `Hidden folder "${cleanName}" is excluded`
    };
  }
  return { allowed: true, reason: 'ok' };
}

/**
 * Strict allowlist + privacy denylist gate for technical document ingestion.
 */
export function isAllowedTechnicalFile({ name = '', path: filePath = '', mimeType = '', size = 0 } = {}) {
  const cleanName = String(name || '').trim();
  const cleanPath = String(filePath || '').trim();
  const cleanMime = String(mimeType || '').trim().toLowerCase().split(';')[0].trim();

  if (!cleanName && !cleanPath && !cleanMime) {
    return { allowed: false, reason: 'Missing file name, path, and MIME type' };
  }

  // 1. Privacy & safety denylist runs FIRST on name, path, and every path segment
  const matched = findMatchingExcludedPattern([cleanName, cleanPath]);
  if (matched) {
    return {
      allowed: false,
      reason: `Rejected by privacy/safety denylist (${matched})`
    };
  }

  const baseName = cleanName || path.posix.basename(cleanPath.replace(/\\/g, '/'));
  if (baseName.startsWith('._') || baseName.startsWith('.')) {
    return {
      allowed: false,
      reason: `Hidden or AppleDouble file "${baseName}" is excluded`
    };
  }

  // 2. Reject non-document Google Workspace native types (folders, forms, shortcuts, drawings, etc.)
  if (cleanMime.startsWith('application/vnd.google-apps.')) {
    if (!ALLOWED_GOOGLE_WORKSPACE_MIMES.has(cleanMime)) {
      return {
        allowed: false,
        reason: `Unsupported Google Workspace MIME type "${cleanMime}"`
      };
    }
    return { allowed: true, reason: 'Allowed Google Workspace document' };
  }

  // 3. Enforce 25MB max size on non-Google-Workspace files
  const numericSize = Number(size);
  if (Number.isFinite(numericSize) && numericSize > MAX_FILE_SIZE_BYTES) {
    return {
      allowed: false,
      reason: `File size ${numericSize} exceeds 25MB limit (${MAX_FILE_SIZE_BYTES} bytes)`
    };
  }

  // 4. Extension allowlist check (with MIME fallback only when filename has no extension)
  const ext = path.posix.extname(baseName).toLowerCase();
  if (ext) {
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return {
        allowed: false,
        reason: `Extension "${ext}" is not in the technical document allowlist`
      };
    }
    return { allowed: true, reason: `Allowed extension ${ext}` };
  }

  if (cleanMime && ALLOWED_NON_GOOGLE_MIMES.has(cleanMime)) {
    return { allowed: true, reason: `Allowed MIME type ${cleanMime}` };
  }

  return {
    allowed: false,
    reason: `Unsupported file type (name="${baseName}", mimeType="${cleanMime || 'unknown'}")`
  };
}

const WORK_AREA_SIGNALS = Object.freeze({
  cabling: [
    [/\bbicsi\s+cabling\b/gi, 8],
    [/\b(?:structured\s+cabling|fibre|fiber|otdr|olts|splice|splicing)\b/gi, 5],
    [/\b(?:om[345]|os[12]|mpo|mtp|lc\/?upc|lc\/?apc|sc\/?apc|single[- ]?mode|multi[- ]?mode)\b/gi, 5],
    [/\b(?:iso\/?iec\s*11801|iso\/?iec\s*14763|tia[- ]?568|en\s*50173|tdmm)\b/gi, 6],
    [/\b(?:cabling|patch\s+panel|patch\s+cord|patch\s+lead|patching|patch|cat6a?|cat[78])\b/gi, 4],
    [/\b(?:insertion\s+loss|return\s+loss|ferrule|connector\s+cleaning|fluke|dsx|trunk\s+cable|containment)\b/gi, 4]
  ],
  network: [
    [/\b(?:cisco|bgp|ospf|eigrp|is-is|vlan|evpn|vxlan|cef|sd[- ]?wan|ccnp|ccna|ccie|devnet|ansible)\b/gi, 5],
    [/\b(?:nx-os|ios-xe|junos|juniper|arista|fortinet|palo\s+alto|mpls|vrf|lacp|mlag|vpc|rstp|stp)\b/gi, 4],
    [/\b(?:switch|switching|router|routing|network|firewall|subnet|ipv[46]|snmp|netconf|restconf|qos|acl)\b/gi, 3],
    [/\b(?:ieee\s*802\.3|sfp\+?|qsfp\d*|transceiver|telemetry|multicast)\b/gi, 3]
  ],
  'rack-stack': [
    [/\b(?:rack\s*(?:&|and)\s*stack|rack\s+elevation|netbotz|cage\s+nut|blanking\s+panel|blanking)\b/gi, 6],
    [/\b(?:hot\s+aisle|cold\s+aisle|aisle\s+containment|aisle|airflow|rail\s+kit)\b/gi, 5],
    [/\b(?:rack|cabinet|pdu|ups|mounting|u-position|4[2578]u|busbar|earthing|grounding|floor\s+loading)\b/gi, 4]
  ],
  documentation: [
    [/\b(?:as[- ]?built|handover|brady|label\s+register|document\s+register|asset\s+register)\b/gi, 6],
    [/\b(?:test\s+report|cable\s+schedule|port\s+schedule|patching\s+matrix|connection\s+matrix|snag\s+list)\b/gi, 5],
    [/\b(?:labell?ing|documentation|register|schedule|redline|o&m\s+manual|close[- ]?out|acceptance\s+pack)\b/gi, 4]
  ],
  'project-delivery': [
    [/\b(?:bicsi\s+essentials|method\s+statement|site\s+pack|risk\s+assessment|scope\s+of\s+work)\b/gi, 6],
    [/\b(?:project\s+delivery|commissioning|site\s+readiness|change\s+control|work\s+package|iso\/?iec\s*22237)\b/gi, 5],
    [/\b(?:project|delivery|rams?|programme|mobili[sz]ation|raci|acceptance\s+plan|site\s+survey|governance)\b/gi, 3]
  ]
});

/**
 * Classifies a technical document into one of TACHOS Five Works IDs.
 */
export function classifyDocumentWorkArea({ title = '', text = '', folderName = '' } = {}) {
  const titleStr = String(title || '');
  const folderStr = String(folderName || '');
  const textSample = String(text || '').slice(0, 16_000);

  const scores = {
    'project-delivery': 0,
    'rack-stack': 0,
    cabling: 0,
    network: 0,
    documentation: 0
  };

  for (const [workArea, patterns] of Object.entries(WORK_AREA_SIGNALS)) {
    let total = 0;
    for (const [regex, weight] of patterns) {
      const titleHits = countMatches(titleStr, regex, 4);
      const folderHits = countMatches(folderStr, regex, 3);
      const textHits = countMatches(textSample, regex, 12);
      total += titleHits * weight * 4 + folderHits * weight * 2.5 + textHits * weight;
    }
    scores[workArea] = total;
  }

  let bestArea = 'project-delivery';
  let bestScore = 0;
  for (const [area, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestArea = area;
    }
  }

  return bestArea;
}

function countMatches(str, regex, cap) {
  if (!str) return 0;
  const re = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : `${regex.flags}g`);
  let count = 0;
  while (count < cap && re.exec(str) !== null) {
    count += 1;
  }
  return count;
}

const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
  plusmn: '±',
  deg: '°',
  micro: 'µ',
  ohm: 'Ω'
});

function decodeXmlEntities(str) {
  if (!str) return '';
  return String(str).replace(/&(?:#x([0-9a-fA-F]+)|#(\d+)|([a-zA-Z]+));/g, (full, hex, dec, named) => {
    if (hex) {
      const cp = parseInt(hex, 16);
      if (Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff) {
        try {
          return String.fromCodePoint(cp);
        } catch {
          return full;
        }
      }
      return full;
    }
    if (dec) {
      const cp = parseInt(dec, 10);
      if (Number.isFinite(cp) && cp >= 0 && cp <= 0x10ffff) {
        try {
          return String.fromCodePoint(cp);
        } catch {
          return full;
        }
      }
      return full;
    }
    if (named) {
      const mapped = NAMED_ENTITIES[named.toLowerCase()];
      if (mapped !== undefined) return mapped;
    }
    return full;
  });
}

function normalizeExtractedText(raw) {
  if (!raw) return '';
  let text = String(raw)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    // Strip control chars except \n (0x0A) and \t (0x09)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  const lines = text.split('\n').map((line) => line.replace(/[ \t]+$/g, ''));
  text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

function stripHtmlToText(html) {
  let s = String(html || '');
  // Remove non-content blocks first
  s = s
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');

  // Preserve heading structure as Markdown headings for chunker
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, inner) => {
    const hashes = '#'.repeat(Number(level));
    const cleanInner = decodeXmlEntities(inner.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    return cleanInner ? `\n\n${hashes} ${cleanInner}\n\n` : '\n';
  });

  // Structural separators
  s = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<\/(p|div|section|article|header|footer|main|aside|blockquote|pre|tr|li|dt|dd|ul|ol|table)>/gi, '\n')
    .replace(/<(li)\b[^>]*>/gi, '- ')
    .replace(/<\/(td|th)>/gi, '\t')
    .replace(/<[^>]+>/g, '');

  return normalizeExtractedText(decodeXmlEntities(s));
}

/**
 * Pure-Node ZIP archive entry extractor supporting Central Directory (preferred)
 * and Local File Header fallback, using node:zlib inflateRawSync.
 */
function extractZipEntry(buffer, targetNames) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const targets = new Set(targetNames.map((n) => n.toLowerCase()));

  // 1. Locate End of Central Directory (EOCD) signature 0x06054b50 from tail
  const minPos = Math.max(0, buf.length - 65_557);
  let eocdPos = -1;
  for (let i = buf.length - 22; i >= minPos; i -= 1) {
    if (
      buf[i] === 0x50 &&
      buf[i + 1] === 0x4b &&
      buf[i + 2] === 0x05 &&
      buf[i + 3] === 0x06
    ) {
      eocdPos = i;
      break;
    }
  }

  if (eocdPos >= 0 && eocdPos + 22 <= buf.length) {
    const totalEntries = buf.readUInt16LE(eocdPos + 10);
    const cdSize = buf.readUInt32LE(eocdPos + 12);
    const cdOffset = buf.readUInt32LE(eocdPos + 16);

    if (cdOffset + cdSize <= buf.length) {
      let pos = cdOffset;
      for (let idx = 0; idx < totalEntries && pos + 46 <= cdOffset + cdSize; idx += 1) {
        if (buf.readUInt32LE(pos) !== 0x02014b50) break;
        const method = buf.readUInt16LE(pos + 10);
        const compSize = buf.readUInt32LE(pos + 20);
        const nameLen = buf.readUInt16LE(pos + 28);
        const extraLen = buf.readUInt16LE(pos + 30);
        const commentLen = buf.readUInt16LE(pos + 32);
        const localHeaderOffset = buf.readUInt32LE(pos + 42);

        if (pos + 46 + nameLen > buf.length) break;
        const entryName = buf.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');

        if (targets.has(entryName.toLowerCase())) {
          if (localHeaderOffset + 30 <= buf.length && buf.readUInt32LE(localHeaderOffset) === 0x04034b50) {
            const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
            const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
            const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
            const dataEnd = dataStart + compSize;
            if (dataEnd <= buf.length) {
              const rawSlice = buf.subarray(dataStart, dataEnd);
              if (method === 0) return rawSlice;
              if (method === 8) {
                return zlib.inflateRawSync(rawSlice, { maxOutputLength: MAX_INFLATE_BYTES });
              }
              throw new Error(`Unsupported ZIP compression method ${method} for ${entryName}`);
            }
          }
        }
        pos += 46 + nameLen + extraLen + commentLen;
      }
    }
  }

  // 2. Fallback: scan Local File Headers (0x04034b50) sequentially
  let offset = 0;
  while (offset + 30 <= buf.length) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const flags = buf.readUInt16LE(offset + 6);
    const method = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);

    const nameStart = offset + 30;
    const dataStart = nameStart + nameLen + extraLen;
    if (dataStart > buf.length) break;
    const entryName = buf.subarray(nameStart, nameStart + nameLen).toString('utf8');

    // If bit 3 (data descriptor) is set and compSize === 0, cannot advance reliably without EOCD
    if ((flags & 0x08) !== 0 && compSize === 0) break;
    const dataEnd = dataStart + compSize;
    if (dataEnd > buf.length) break;

    if (targets.has(entryName.toLowerCase())) {
      const rawSlice = buf.subarray(dataStart, dataEnd);
      if (method === 0) return rawSlice;
      if (method === 8) {
        return zlib.inflateRawSync(rawSlice, { maxOutputLength: MAX_INFLATE_BYTES });
      }
      throw new Error(`Unsupported ZIP compression method ${method} for ${entryName}`);
    }
    offset = dataEnd;
  }

  return null;
}

function extractDocxXmlToText(xml) {
  let s = String(xml || '');
  // Convert Word heading paragraphs to Markdown headings when style indicates Heading1..6
  s = s.replace(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi, (full, inner) => {
    const styleMatch = inner.match(/<w:pStyle\b[^>]*w:val="Heading([1-6])"/i);
    let body = inner
      .replace(/<w:tab\b[^>]*\/>/gi, '\t')
      .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, '\n')
      .replace(/<[^>]+>/g, '');
    body = decodeXmlEntities(body).trim();
    if (!body) return '\n';
    if (styleMatch) {
      return `\n${'#'.repeat(Number(styleMatch[1]))} ${body}\n`;
    }
    return `${body}\n`;
  });

  // Handle table cells/rows if any remain outside paragraph replacement
  s = s
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/gi, '\n')
    .replace(/<\/w:tc>/gi, '\t')
    .replace(/<\/w:tr>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return normalizeExtractedText(decodeXmlEntities(s));
}

function extractOdtXmlToText(xml) {
  let s = String(xml || '');
  // Convert ODT headings to Markdown headings
  s = s.replace(/<text:h\b([^>]*)>([\s\S]*?)<\/text:h>/gi, (_, attrs, inner) => {
    const levelMatch = attrs.match(/text:outline-level="(\d+)"/i);
    const level = Math.max(1, Math.min(6, Number(levelMatch?.[1] || 2)));
    const clean = decodeXmlEntities(
      inner
        .replace(/<text:tab\b[^>]*\/>/gi, '\t')
        .replace(/<text:line-break\b[^>]*\/>/gi, ' ')
        .replace(/<text:s\b[^>]*text:c="(\d+)"[^>]*\/>/gi, (__, n) => ' '.repeat(Math.min(Number(n) || 1, 20)))
        .replace(/<text:s\b[^>]*\/>/gi, ' ')
        .replace(/<[^>]+>/g, '')
    ).trim();
    return clean ? `\n${'#'.repeat(level)} ${clean}\n` : '\n';
  });

  s = s
    .replace(/<text:tab\b[^>]*\/>/gi, '\t')
    .replace(/<text:line-break\b[^>]*\/>/gi, '\n')
    .replace(/<text:s\b[^>]*text:c="(\d+)"[^>]*\/>/gi, (_, n) => ' '.repeat(Math.min(Number(n) || 1, 20)))
    .replace(/<text:s\b[^>]*\/>/gi, ' ')
    .replace(/<\/table:table-cell>/gi, '\t')
    .replace(/<\/table:table-row>/gi, '\n')
    .replace(/<\/(?:text:p|text:list-item)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  return normalizeExtractedText(decodeXmlEntities(s));
}

function parsePdfToUnicodeMap(streamText, targetMap) {
  // Parse beginbfchar ... endbfchar
  const bfCharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  let m;
  while ((m = bfCharRe.exec(streamText)) !== null) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let p;
    while ((p = pairRe.exec(m[1])) !== null) {
      const code = parseInt(p[1], 16);
      const unicodeStr = decodeHexToUtf16(p[2]);
      if (Number.isFinite(code) && unicodeStr) {
        targetMap.set(code, unicodeStr);
      }
    }
  }

  // Parse beginbfrange ... endbfrange
  const bfRangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = bfRangeRe.exec(streamText)) !== null) {
    const rangeRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let r;
    while ((r = rangeRe.exec(m[1])) !== null) {
      const start = parseInt(r[1], 16);
      const end = parseInt(r[2], 16);
      let dst = parseInt(r[3], 16);
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start && end - start <= 512) {
        for (let c = start; c <= end; c += 1) {
          try {
            targetMap.set(c, String.fromCodePoint(dst));
          } catch {
            // Skip invalid code point
          }
          dst += 1;
        }
      }
    }
  }
}

function decodeHexToUtf16(hex) {
  const clean = hex.length % 2 === 1 ? `${hex}0` : hex;
  if (clean.length === 2) {
    return String.fromCharCode(parseInt(clean, 16));
  }
  let out = '';
  for (let i = 0; i + 4 <= clean.length; i += 4) {
    const codeUnit = parseInt(clean.slice(i, i + 4), 16);
    if (codeUnit > 0) out += String.fromCharCode(codeUnit);
  }
  return out;
}

function decodePdfLiteralString(raw) {
  let out = '';
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch !== '\\') {
      out += ch;
      continue;
    }
    i += 1;
    if (i >= raw.length) break;
    const next = raw[i];
    if (next === 'n') out += '\n';
    else if (next === 'r') out += '\r';
    else if (next === 't') out += '\t';
    else if (next === 'b') out += '\b';
    else if (next === 'f') out += '\f';
    else if (next === '(' || next === ')' || next === '\\') out += next;
    else if (next === '\r') {
      if (raw[i + 1] === '\n') i += 1;
    } else if (next === '\n') {
      // Line continuation
    } else if (next >= '0' && next <= '7') {
      let oct = next;
      if (i + 1 < raw.length && raw[i + 1] >= '0' && raw[i + 1] <= '7') {
        oct += raw[++i];
        if (i + 1 < raw.length && raw[i + 1] >= '0' && raw[i + 1] <= '7') {
          oct += raw[++i];
        }
      }
      out += String.fromCharCode(parseInt(oct, 8) & 0xff);
    } else {
      out += next;
    }
  }
  return out;
}

function decodePdfHexString(hexRaw, unicodeMap) {
  const hex = hexRaw.replace(/\s+/g, '');
  if (!hex) return '';
  const padded = hex.length % 2 === 1 ? `${hex}0` : hex;

  // UTF-16BE BOM
  if (padded.length >= 4 && padded.slice(0, 4).toUpperCase() === 'FEFF') {
    return decodeHexToUtf16(padded.slice(4));
  }

  // Try 2-byte CMap lookup first when unicodeMap has entries and length is a multiple of 4
  if (unicodeMap && unicodeMap.size > 0 && padded.length % 4 === 0) {
    let hits = 0;
    let mapped = '';
    const count = padded.length / 4;
    for (let i = 0; i < padded.length; i += 4) {
      const code = parseInt(padded.slice(i, i + 4), 16);
      if (unicodeMap.has(code)) {
        mapped += unicodeMap.get(code);
        hits += 1;
      } else if (code >= 0x20 && code <= 0x7e) {
        mapped += String.fromCharCode(code);
      }
    }
    if (hits > 0 && hits >= count * 0.4) {
      return mapped;
    }
  }

  // Fallback: 1-byte CMap or Latin-1 bytes
  let out = '';
  for (let i = 0; i < padded.length; i += 2) {
    const byte = parseInt(padded.slice(i, i + 2), 16);
    if (unicodeMap && unicodeMap.has(byte)) {
      out += unicodeMap.get(byte);
    } else if (byte === 0x09 || byte === 0x0a || byte === 0x0d || (byte >= 0x20 && byte <= 0xff)) {
      out += String.fromCharCode(byte);
    }
  }
  return out;
}

function extractTextFromPdfContentStream(content, unicodeMap) {
  const blocks = [];
  const btRe = /\bBT\b([\s\S]*?)\bET\b/g;
  let match;
  while ((match = btRe.exec(content)) !== null) {
    const blockText = parsePdfTextBlock(match[1], unicodeMap);
    if (blockText.trim()) {
      blocks.push(blockText);
    }
  }
  return blocks.join('\n');
}

function parsePdfTextBlock(block, unicodeMap) {
  const len = block.length;
  let i = 0;
  const operands = [];
  const pieces = [];
  let lastY = null;

  const isDelim = (c) => c === '(' || c === ')' || c === '<' || c === '>' || c === '[' || c === ']' || c === '/' || c === '%';
  const isSpace = (c) => c === ' ' || c === '\t' || c === '\r' || c === '\n' || c === '\f' || c === '\0';

  function readLiteral() {
    i += 1; // skip '('
    let depth = 1;
    let raw = '';
    while (i < len && depth > 0) {
      const c = block[i];
      if (c === '\\') {
        if (i + 1 < len) {
          raw += c + block[i + 1];
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }
      if (c === '(') depth += 1;
      else if (c === ')') {
        depth -= 1;
        if (depth === 0) {
          i += 1;
          break;
        }
      }
      raw += c;
      i += 1;
    }
    return { type: 'str', value: decodePdfLiteralString(raw) };
  }

  function readHex() {
    i += 1; // skip '<'
    const start = i;
    while (i < len && block[i] !== '>') i += 1;
    const raw = block.slice(start, i);
    if (i < len && block[i] === '>') i += 1;
    return { type: 'str', value: decodePdfHexString(raw, unicodeMap) };
  }

  function readArray() {
    i += 1; // skip '['
    const items = [];
    while (i < len) {
      while (i < len && isSpace(block[i])) i += 1;
      if (i >= len) break;
      if (block[i] === ']') {
        i += 1;
        break;
      }
      if (block[i] === '(') {
        items.push(readLiteral());
      } else if (block[i] === '<' && block[i + 1] !== '<') {
        items.push(readHex());
      } else {
        const start = i;
        while (i < len && !isSpace(block[i]) && !isDelim(block[i])) i += 1;
        if (i === start) {
          i += 1;
          continue;
        }
        const tok = block.slice(start, i);
        const num = Number(tok);
        if (Number.isFinite(num)) {
          items.push({ type: 'num', value: num });
        }
      }
    }
    return { type: 'arr', value: items };
  }

  while (i < len) {
    while (i < len && isSpace(block[i])) i += 1;
    if (i >= len) break;
    const ch = block[i];

    if (ch === '%') {
      while (i < len && block[i] !== '\n' && block[i] !== '\r') i += 1;
      continue;
    }
    if (ch === '(') {
      operands.push(readLiteral());
      continue;
    }
    if (ch === '<') {
      if (block[i + 1] === '<') {
        i += 2;
        continue;
      }
      operands.push(readHex());
      continue;
    }
    if (ch === '>') {
      i += 1;
      continue;
    }
    if (ch === '[') {
      operands.push(readArray());
      continue;
    }
    if (ch === '/') {
      i += 1;
      const start = i;
      while (i < len && !isSpace(block[i]) && !isDelim(block[i])) i += 1;
      operands.push({ type: 'name', value: block.slice(start, i) });
      continue;
    }

    const start = i;
    while (i < len && !isSpace(block[i]) && !isDelim(block[i])) i += 1;
    if (i === start) {
      i += 1;
      continue;
    }
    const token = block.slice(start, i);
    const asNum = Number(token);
    if (token !== '' && Number.isFinite(asNum) && /^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(token)) {
      operands.push({ type: 'num', value: asNum });
      continue;
    }

    // PDF text operators
    if (token === 'Tj') {
      const op = operands[operands.length - 1];
      if (op?.type === 'str') pieces.push(op.value);
      operands.length = 0;
    } else if (token === 'TJ') {
      const op = operands[operands.length - 1];
      if (op?.type === 'arr') {
        let joined = '';
        for (const item of op.value) {
          if (item.type === 'str') {
            joined += item.value;
          } else if (item.type === 'num' && item.value <= -120) {
            if (joined && !joined.endsWith(' ')) joined += ' ';
          }
        }
        pieces.push(joined);
      }
      operands.length = 0;
    } else if (token === "'" || token === '"') {
      const op = operands[operands.length - 1];
      pieces.push('\n');
      if (op?.type === 'str') pieces.push(op.value);
      operands.length = 0;
    } else if (token === 'T*') {
      pieces.push('\n');
      operands.length = 0;
    } else if (token === 'Td' || token === 'TD') {
      const ty = operands.length >= 2 ? operands[operands.length - 1]?.value : 0;
      const tx = operands.length >= 2 ? operands[operands.length - 2]?.value : 0;
      if (typeof ty === 'number' && Math.abs(ty) > 1) {
        pieces.push('\n');
      } else if (typeof tx === 'number' && tx > 2 && pieces.length > 0 && !pieces[pieces.length - 1].endsWith(' ')) {
        pieces.push(' ');
      }
      operands.length = 0;
    } else if (token === 'Tm') {
      const y = operands.length >= 6 ? operands[operands.length - 1]?.value : null;
      if (typeof y === 'number' && lastY !== null && Math.abs(y - lastY) > 2) {
        pieces.push('\n');
      }
      if (typeof y === 'number') lastY = y;
      operands.length = 0;
    } else {
      operands.length = 0;
    }
  }

  return pieces.join('');
}

/**
 * Pure-Node fallback PDF text extractor: scans FlateDecode & raw content streams,
 * parses ToUnicode CMaps and BT..ET / Tj / TJ operators.
 */
function extractPdfTextPureNode(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const latin1 = buf.toString('latin1');
  const unicodeMap = new Map();
  const contentStreams = [];

  const streamMarker = Buffer.from('stream');
  const endstreamMarker = Buffer.from('endstream');
  let searchPos = 0;

  while (searchPos < buf.length) {
    const sIdx = buf.indexOf(streamMarker, searchPos);
    if (sIdx < 0) break;

    // Ensure 'stream' is not part of 'endstream' or another identifier
    const prevByte = sIdx > 0 ? buf[sIdx - 1] : 0x20;
    const afterIdx = sIdx + 6;
    const nextByte = afterIdx < buf.length ? buf[afterIdx] : 0;
    const validAfter = nextByte === 0x0a || (nextByte === 0x0d && buf[afterIdx + 1] === 0x0a) || nextByte === 0x0d;
    const validBefore = prevByte === 0x3e || prevByte === 0x20 || prevByte === 0x0a || prevByte === 0x0d || prevByte === 0x09;

    if (!validAfter || !validBefore) {
      searchPos = sIdx + 6;
      continue;
    }

    let dataStart = afterIdx;
    if (buf[dataStart] === 0x0d && buf[dataStart + 1] === 0x0a) dataStart += 2;
    else if (buf[dataStart] === 0x0a || buf[dataStart] === 0x0d) dataStart += 1;

    const eIdx = buf.indexOf(endstreamMarker, dataStart);
    if (eIdx < 0) break;

    let dataEnd = eIdx;
    while (dataEnd > dataStart && (buf[dataEnd - 1] === 0x0a || buf[dataEnd - 1] === 0x0d)) {
      dataEnd -= 1;
    }

    // Inspect preceding object dictionary
    const dictWindowStart = Math.max(0, sIdx - 1024);
    const dictSlice = latin1.slice(dictWindowStart, sIdx);
    const lastDictStart = dictSlice.lastIndexOf('<<');
    const dictText = lastDictStart >= 0 ? dictSlice.slice(lastDictStart) : dictSlice;

    searchPos = eIdx + 9;

    // Skip embedded raster image streams
    if (/\/Subtype\s*\/Image\b/.test(dictText)) {
      continue;
    }

    const rawSlice = buf.subarray(dataStart, dataEnd);
    const isFlate = /\/(?:FlateDecode|Fl)\b/.test(dictText);
    const hasOtherFilter = /\/Filter\b/.test(dictText) && !isFlate;

    let decodedBuf = null;
    if (isFlate) {
      try {
        decodedBuf = zlib.inflateSync(rawSlice, { maxOutputLength: MAX_INFLATE_BYTES });
      } catch {
        try {
          decodedBuf = zlib.inflateRawSync(rawSlice, { maxOutputLength: MAX_INFLATE_BYTES });
        } catch {
          decodedBuf = null;
        }
      }
    } else if (!hasOtherFilter) {
      decodedBuf = rawSlice;
    }

    if (!decodedBuf || decodedBuf.length === 0) continue;

    const streamStr = decodedBuf.toString('latin1');
    if (streamStr.includes('beginbfchar') || streamStr.includes('beginbfrange')) {
      parsePdfToUnicodeMap(streamStr, unicodeMap);
    }
    if (/\bBT\b/.test(streamStr) && /\bET\b/.test(streamStr)) {
      contentStreams.push(streamStr);
    }
  }

  const extractedParts = [];
  for (const cs of contentStreams) {
    const t = extractTextFromPdfContentStream(cs, unicodeMap);
    if (t.trim()) extractedParts.push(t);
  }

  // Fallback: uncompressed BT..ET directly in PDF body if no streams yielded text
  if (extractedParts.length === 0 && /\bBT\b/.test(latin1) && /\bET\b/.test(latin1)) {
    const t = extractTextFromPdfContentStream(latin1, unicodeMap);
    if (t.trim()) extractedParts.push(t);
  }

  // Clean up non-printable/garbled artifacts while preserving readable text
  const rawJoined = extractedParts.join('\n\n');
  const cleaned = rawJoined
    .replace(/[^\t\n\x20-\x7E\u00A0-\u024F\u2010-\u2027\u2030-\u205E\u2190-\u22FF]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ');

  return normalizeExtractedText(cleaned);
}

function extractPdfText(buffer, warnings) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const tmpFile = path.join(os.tmpdir(), `tachos-pdf-${crypto.randomUUID()}.pdf`);
  let pdftotextError = null;

  try {
    fs.writeFileSync(tmpFile, buf);
    const stdout = execFileSync('pdftotext', ['-enc', 'UTF-8', tmpFile, '-'], {
      timeout: 15_000,
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const text = normalizeExtractedText(stdout.toString('utf8'));
    if (text.length > 0) {
      return text;
    }
    warnings.push('pdftotext returned empty output; falling back to pure-Node PDF extractor');
  } catch (err) {
    pdftotextError = err?.code === 'ENOENT' ? 'pdftotext binary not available' : (err?.message || 'pdftotext failed');
  } finally {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup failures
    }
  }

  if (pdftotextError) {
    warnings.push(`${pdftotextError}; used built-in pure-Node PDF text extractor`);
  }

  const pureText = extractPdfTextPureNode(buf);
  if (!pureText) {
    warnings.push('No extractable text found in PDF (file may be scanned/image-only or encrypted)');
  }
  return pureText;
}

function detectFormat(buffer, name = '', mimeType = '') {
  const ext = path.posix.extname(String(name || '').trim()).toLowerCase();
  const mime = String(mimeType || '').trim().toLowerCase().split(';')[0].trim();

  if (ext === '.pdf' || mime === 'application/pdf') return 'pdf';
  if (ext === '.docx' || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (ext === '.odt' || mime === 'application/vnd.oasis.opendocument.text') return 'odt';
  if (ext === '.html' || ext === '.htm' || mime === 'text/html' || mime === 'application/xhtml+xml') return 'html';
  if (ext === '.json' || mime === 'application/json' || mime === 'text/json') return 'json';
  if (ext === '.csv' || mime === 'text/csv') return 'csv';
  if (ext === '.tsv' || mime === 'text/tab-separated-values') return 'tsv';
  if (ext === '.md' || ext === '.markdown' || mime === 'text/markdown' || mime === 'text/x-markdown') return 'markdown';
  if (ext === '.txt' || mime === 'text/plain') return 'text';

  // Magic-byte sniff fallback
  if (Buffer.isBuffer(buffer) && buffer.length >= 5) {
    if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  }
  return 'text';
}

/**
 * Pure-Node 22 multi-format text extraction for technical documents.
 */
export function extractTextFromBuffer(buffer, { name = '', mimeType = '' } = {}) {
  const warnings = [];
  const buf = Buffer.isBuffer(buffer)
    ? buffer
    : buffer instanceof Uint8Array
      ? Buffer.from(buffer)
      : Buffer.from(String(buffer ?? ''), 'utf8');

  const format = detectFormat(buf, name, mimeType);

  if (buf.length === 0) {
    warnings.push('Input buffer is empty');
    return { text: '', format, warnings };
  }

  try {
    if (format === 'pdf') {
      const text = extractPdfText(buf, warnings);
      return { text, format, warnings };
    }

    if (format === 'docx') {
      const docXmlBuf = extractZipEntry(buf, ['word/document.xml']);
      if (!docXmlBuf) {
        warnings.push('DOCX archive did not contain word/document.xml');
        return { text: '', format, warnings };
      }
      const text = extractDocxXmlToText(docXmlBuf.toString('utf8'));
      return { text, format, warnings };
    }

    if (format === 'odt') {
      const contentXmlBuf = extractZipEntry(buf, ['content.xml']);
      if (!contentXmlBuf) {
        warnings.push('ODT archive did not contain content.xml');
        return { text: '', format, warnings };
      }
      const text = extractOdtXmlToText(contentXmlBuf.toString('utf8'));
      return { text, format, warnings };
    }

    const utf8 = buf.toString('utf8');

    if (format === 'html') {
      return { text: stripHtmlToText(utf8), format, warnings };
    }

    if (format === 'json') {
      try {
        const parsed = JSON.parse(utf8);
        return {
          text: normalizeExtractedText(JSON.stringify(parsed, null, 2)),
          format,
          warnings
        };
      } catch {
        warnings.push('Invalid JSON; stored raw text content');
        return { text: normalizeExtractedText(utf8), format, warnings };
      }
    }

    // Plain text, Markdown, CSV, TSV
    return { text: normalizeExtractedText(utf8), format, warnings };
  } catch (err) {
    warnings.push(`Extraction error (${format}): ${err?.message || String(err)}`);
    return { text: '', format, warnings };
  }
}

function detectHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return null;

  // Markdown heading (# ... ######)
  const mdMatch = trimmed.match(/^#{1,6}\s+(.+?)\s*#*$/);
  if (mdMatch) return mdMatch[1].trim();

  // Explicit Chapter / Section / Appendix heading
  if (/^(?:CHAPTER|SECTION|APPENDIX|PART)\s+[A-Z0-9][^\n]{0,100}$/i.test(trimmed)) {
    return trimmed;
  }

  // Numbered section heading like "3.2 Fibre Testing" (not ending in a sentence period/comma)
  if (/^\d+(?:\.\d+){0,3}\.?\s+[A-Z][A-Za-z0-9 &/()\-–—:]{2,95}$/.test(trimmed) && !/[.,;]$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function splitLongBlock(text, maxSize, overlap) {
  const parts = [];
  const safeMax = Math.max(200, maxSize);
  const safeOverlap = Math.max(0, Math.min(overlap, Math.floor(safeMax / 2)));
  let start = 0;

  while (start < text.length) {
    let end = Math.min(text.length, start + safeMax);
    if (end < text.length) {
      const windowStart = Math.max(start + Math.floor(safeMax * 0.55), start + 1);
      const slice = text.slice(windowStart, end);

      // Prefer paragraph break, then line break, then sentence break, then whitespace
      const breakCandidates = [
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('? '), slice.lastIndexOf('! ')),
        slice.lastIndexOf(' ')
      ];

      for (const idx of breakCandidates) {
        if (idx > 0) {
          end = windowStart + idx + 1;
          break;
        }
      }
    }

    const segment = text.slice(start, end).trim();
    if (segment) parts.push(segment);

    if (end >= text.length) break;
    const nextStart = end - safeOverlap;
    start = nextStart > start ? nextStart : end;
  }

  return parts;
}

/**
 * Splits normalized document text into overlapping semantic chunks while preserving
 * the latest detectable Markdown/section heading and capping at 250 chunks per doc.
 */
export function chunkText(text, { chunkSize = 1100, overlap = 180, title = '' } = {}) {
  const normalized = normalizeExtractedText(text);
  if (!normalized) return [];

  const safeChunkSize = Math.max(200, Number(chunkSize) || 1100);
  const safeOverlap = Math.max(0, Math.min(Number(overlap) || 180, Math.floor(safeChunkSize / 2)));
  const fallbackHeading = String(title || '').trim();

  // Short single-document edge case (< 40 chars): keep as a single chunk
  if (normalized.length < 40) {
    return [
      {
        chunkIndex: 0,
        heading: detectHeading(normalized) || fallbackHeading,
        content: normalized,
        charCount: normalized.length
      }
    ];
  }

  // Group lines into sections keyed by detected heading
  const sections = [];
  let currentHeading = fallbackHeading;
  let currentLines = [];

  for (const line of normalized.split('\n')) {
    const foundHeading = detectHeading(line);
    if (foundHeading) {
      const prevBody = currentLines.join('\n').trim();
      if (prevBody) {
        sections.push({ heading: currentHeading, body: prevBody });
      }
      currentHeading = foundHeading;
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  const tailBody = currentLines.join('\n').trim();
  if (tailBody) {
    sections.push({ heading: currentHeading, body: tailBody });
  }

  const rawChunks = [];
  let validCount = 0;

  const pushChunk = (heading, content) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    rawChunks.push({ heading, content: trimmed });
    if (trimmed.length >= 40) validCount += 1;
  };

  for (const section of sections) {
    if (validCount >= MAX_CHUNKS_PER_DOCUMENT) break;

    const paragraphs = section.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    let buffer = '';

    const flushBuffer = () => {
      const trimmed = buffer.trim();
      if (!trimmed) return;
      if (trimmed.length <= safeChunkSize) {
        pushChunk(section.heading, trimmed);
      } else {
        for (const piece of splitLongBlock(trimmed, safeChunkSize, safeOverlap)) {
          if (validCount >= MAX_CHUNKS_PER_DOCUMENT) break;
          pushChunk(section.heading, piece);
        }
      }
    };

    for (const para of paragraphs) {
      if (validCount >= MAX_CHUNKS_PER_DOCUMENT) break;

      if (!buffer) {
        if (para.length > safeChunkSize) {
          for (const piece of splitLongBlock(para, safeChunkSize, safeOverlap)) {
            if (validCount >= MAX_CHUNKS_PER_DOCUMENT) break;
            pushChunk(section.heading, piece);
          }
        } else {
          buffer = para;
        }
        continue;
      }

      if (buffer.length + 2 + para.length <= safeChunkSize) {
        buffer = `${buffer}\n\n${para}`;
      } else if (buffer.length < 40) {
        // Keep short heading/intro line attached to the following long paragraph
        const combined = `${buffer}\n\n${para}`;
        buffer = '';
        for (const piece of splitLongBlock(combined, safeChunkSize, safeOverlap)) {
          if (validCount >= MAX_CHUNKS_PER_DOCUMENT) break;
          pushChunk(section.heading, piece);
        }
      } else {
        flushBuffer();
        if (validCount >= MAX_CHUNKS_PER_DOCUMENT) {
          buffer = '';
          break;
        }

        // Carry trailing overlap from previous chunk when paragraph fits
        const tailOverlap = safeOverlap > 0 ? buffer.slice(Math.max(0, buffer.length - safeOverlap)).trim() : '';
        if (tailOverlap && tailOverlap.length + 2 + para.length <= safeChunkSize) {
          buffer = `${tailOverlap}\n\n${para}`;
        } else if (para.length > safeChunkSize) {
          buffer = '';
          for (const piece of splitLongBlock(para, safeChunkSize, safeOverlap)) {
            if (validCount >= MAX_CHUNKS_PER_DOCUMENT) break;
            pushChunk(section.heading, piece);
          }
        } else {
          buffer = para;
        }
      }
    }

    if (buffer && validCount < MAX_CHUNKS_PER_DOCUMENT) {
      flushBuffer();
    }
  }

  // Filter empty / tiny boilerplate chunks (< 40 chars), preserving at least 1 chunk if doc had content
  let filtered = rawChunks.filter((c) => c.content.length >= 40);
  if (filtered.length === 0 && rawChunks.length > 0) {
    filtered = [rawChunks[0]];
  }

  return filtered.slice(0, MAX_CHUNKS_PER_DOCUMENT).map((c, idx) => ({
    chunkIndex: idx,
    heading: c.heading || fallbackHeading,
    content: c.content,
    charCount: c.content.length
  }));
}
