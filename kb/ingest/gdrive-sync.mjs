import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_EXCLUDED_PATTERNS,
  GOOGLE_WORKSPACE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  chunkText,
  classifyDocumentWorkArea,
  extractTextFromBuffer,
  isAllowedTechnicalFile,
  isAllowedTechnicalFolder,
  sha256Hex
} from './extractors.mjs';

export { DEFAULT_EXCLUDED_PATTERNS };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KB_ROOT = path.resolve(__dirname, '..');

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';
const MAX_WALK_DEPTH = 4;

function loadEnvIfPresent(envPath = path.join(KB_ROOT, '.env')) {
  if (!fs.existsSync(envPath)) return false;
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
      if (Object.prototype.hasOwnProperty.call(process.env, key) && process.env[key] !== '') continue;
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
    return true;
  } catch {
    return false;
  }
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Signs an RS256 Service Account JWT using pure Node node:crypto.
 */
export function createServiceAccountJwt(serviceAccount, { scope = DRIVE_READONLY_SCOPE, nowSec = Math.floor(Date.now() / 1000) } = {}) {
  const clientEmail = serviceAccount?.client_email;
  const privateKey = serviceAccount?.private_key;
  const tokenUri = serviceAccount?.token_uri || GOOGLE_OAUTH_TOKEN_URL;

  if (!clientEmail || !privateKey) {
    throw new Error('Google Service Account JSON must include client_email and private_key');
  }

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: clientEmail,
      scope,
      aud: tokenUri,
      iat: nowSec,
      exp: nowSec + 3600
    })
  );

  const signingInput = `${header}.${payload}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = base64UrlEncode(signer.sign(privateKey));

  return {
    assertion: `${signingInput}.${signature}`,
    tokenUri
  };
}

/**
 * Obtains a Google Drive API v3 OAuth2 access token via:
 * 1) Service Account JWT (TACHOS_GDRIVE_SERVICE_ACCOUNT_FILE or TACHOS_GDRIVE_SERVICE_ACCOUNT_JSON)
 * 2) OAuth2 refresh token (TACHOS_GDRIVE_CLIENT_ID + SECRET + REFRESH_TOKEN)
 * 3) Direct TACHOS_GDRIVE_ACCESS_TOKEN
 */
export async function getGoogleDriveAccessToken({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  // 1. Service Account JWT flow
  const saFile = String(env.TACHOS_GDRIVE_SERVICE_ACCOUNT_FILE || '').trim();
  const saJsonRaw = String(env.TACHOS_GDRIVE_SERVICE_ACCOUNT_JSON || '').trim();

  if (saFile || saJsonRaw) {
    const rawText = saFile ? fs.readFileSync(saFile, 'utf8') : saJsonRaw;
    const serviceAccount = JSON.parse(rawText);
    const { assertion, tokenUri } = createServiceAccountJwt(serviceAccount);

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    });

    const resp = await fetchImpl(tokenUri, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Service account token exchange failed (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
    }
    const data = await resp.json();
    if (!data?.access_token) {
      throw new Error('Service account token response missing access_token');
    }
    return data.access_token;
  }

  // 2. OAuth2 Refresh Token flow
  const clientId = String(env.TACHOS_GDRIVE_CLIENT_ID || '').trim();
  const clientSecret = String(env.TACHOS_GDRIVE_CLIENT_SECRET || '').trim();
  const refreshToken = String(env.TACHOS_GDRIVE_REFRESH_TOKEN || '').trim();

  if (clientId && clientSecret && refreshToken) {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    });

    const resp = await fetchImpl(GOOGLE_OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000)
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`OAuth2 refresh token exchange failed (HTTP ${resp.status}): ${errText.slice(0, 300)}`);
    }
    const data = await resp.json();
    if (!data?.access_token) {
      throw new Error('OAuth2 refresh response missing access_token');
    }
    return data.access_token;
  }

  // 3. Direct access token fallback
  const directToken = String(env.TACHOS_GDRIVE_ACCESS_TOKEN || '').trim();
  if (directToken) {
    return directToken;
  }

  throw new Error(
    'No Google Drive credentials configured. Provide TACHOS_GDRIVE_SERVICE_ACCOUNT_FILE, TACHOS_GDRIVE_SERVICE_ACCOUNT_JSON, OAuth2 refresh credentials, TACHOS_GDRIVE_ACCESS_TOKEN, or use --use-cli / TACHOS_GDRIVE_USE_CLI=1.'
  );
}

function normalizeDriveItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id ?? raw.ID ?? '').trim();
  if (!id) return null;
  return {
    id,
    name: String(raw.name ?? raw.Name ?? id).trim(),
    mimeType: String(raw.mimeType ?? raw.MimeType ?? raw.mime_type ?? '').trim(),
    size: Number(raw.size ?? raw.Size ?? 0) || 0,
    modifiedTime: String(raw.modifiedTime ?? raw.ModifiedTime ?? raw.modified_time ?? '').trim(),
    webViewLink: String(raw.webViewLink ?? raw.WebViewLink ?? raw.web_view_link ?? '').trim()
  };
}

function createRestDriveAdapter({ accessToken, fetchImpl = globalThis.fetch }) {
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  async function getFolderInfo(folderId) {
    const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType&supportsAllDrives=true`;
    const resp = await fetchImpl(url, { headers: authHeaders, signal: AbortSignal.timeout(20_000) });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Drive API getFolderInfo(${folderId}) failed (HTTP ${resp.status}): ${errText.slice(0, 200)}`);
    }
    const data = await resp.json();
    return normalizeDriveItem(data) || { id: folderId, name: folderId, mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER };
  }

  async function listFolderChildren(folderId) {
    const items = [];
    let pageToken = '';
    const q = `'${String(folderId).replace(/'/g, "\\'")}' in parents and trashed = false`;

    do {
      const params = new URLSearchParams({
        q,
        fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)',
        pageSize: '200',
        supportsAllDrives: 'true',
        includeItemsFromAllDrives: 'true'
      });
      if (pageToken) params.set('pageToken', pageToken);

      const url = `${DRIVE_API_BASE}/files?${params.toString()}`;
      const resp = await fetchImpl(url, { headers: authHeaders, signal: AbortSignal.timeout(30_000) });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => '');
        throw new Error(`Drive API list(${folderId}) failed (HTTP ${resp.status}): ${errText.slice(0, 200)}`);
      }
      const data = await resp.json();
      const files = Array.isArray(data?.files) ? data.files : [];
      for (const f of files) {
        const norm = normalizeDriveItem(f);
        if (norm) items.push(norm);
      }
      pageToken = data?.nextPageToken || '';
    } while (pageToken && items.length < 2000);

    return items;
  }

  async function fetchExport(fileId, exportMime) {
    const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMime)}`;
    const resp = await fetchImpl(url, { headers: authHeaders, signal: AbortSignal.timeout(45_000) });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      const err = new Error(`Drive API export(${fileId}, ${exportMime}) failed (HTTP ${resp.status}): ${errText.slice(0, 200)}`);
      err.statusCode = resp.status;
      throw err;
    }
    const arrBuf = await resp.arrayBuffer();
    return Buffer.from(arrBuf);
  }

  async function fetchFileContent(file) {
    if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT) {
      try {
        const buffer = await fetchExport(file.id, 'text/markdown');
        return { buffer, effectiveMimeType: 'text/markdown' };
      } catch {
        const buffer = await fetchExport(file.id, 'text/plain');
        return { buffer, effectiveMimeType: 'text/plain' };
      }
    }
    if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET) {
      const buffer = await fetchExport(file.id, 'text/csv');
      return { buffer, effectiveMimeType: 'text/csv' };
    }
    if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION) {
      const buffer = await fetchExport(file.id, 'text/plain');
      return { buffer, effectiveMimeType: 'text/plain' };
    }

    const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`;
    const resp = await fetchImpl(url, { headers: authHeaders, signal: AbortSignal.timeout(60_000) });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throw new Error(`Drive API download(${file.id}) failed (HTTP ${resp.status}): ${errText.slice(0, 200)}`);
    }
    const arrBuf = await resp.arrayBuffer();
    const buffer = Buffer.from(arrBuf);
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Downloaded file ${file.name} (${buffer.length} bytes) exceeds 25MB limit`);
    }
    return { buffer, effectiveMimeType: file.mimeType };
  }

  return { getFolderInfo, listFolderChildren, fetchFileContent };
}

function createCliDriveAdapter({ execFileSyncImpl = execFileSync } = {}) {
  function runGdrive(args, timeout = 60_000) {
    return execFileSyncImpl('gdrive', ['readonly', ...args], {
      timeout,
      maxBuffer: 32 * 1024 * 1024,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  }

  async function getFolderInfo(folderId) {
    try {
      const stdout = runGdrive(['info', folderId, '--json'], 20_000);
      const parsed = JSON.parse(stdout || '{}');
      return normalizeDriveItem(parsed?.file ?? parsed) || {
        id: folderId,
        name: folderId,
        mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER
      };
    } catch {
      return { id: folderId, name: folderId, mimeType: GOOGLE_WORKSPACE_MIME_TYPES.FOLDER };
    }
  }

  async function listFolderChildren(folderId) {
    const stdout = runGdrive(['ls', folderId, '--max', '500', '--json'], 45_000);
    const parsed = JSON.parse(stdout || '[]');
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.files)
        ? parsed.files
        : Array.isArray(parsed?.items)
          ? parsed.items
          : [];
    return rawList.map(normalizeDriveItem).filter(Boolean);
  }

  function exportViaCli(fileId, format, ext) {
    const tmpFile = path.join(os.tmpdir(), `tachos-gdrive-export-${crypto.randomUUID()}.${ext}`);
    try {
      runGdrive(['export', fileId, tmpFile, '--format', format], 60_000);
      return fs.readFileSync(tmpFile);
    } finally {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {
        // Ignore temp file cleanup failures
      }
    }
  }

  async function fetchFileContent(file) {
    if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.DOCUMENT) {
      try {
        const buffer = exportViaCli(file.id, 'md', 'md');
        return { buffer, effectiveMimeType: 'text/markdown' };
      } catch {
        const buffer = exportViaCli(file.id, 'txt', 'txt');
        return { buffer, effectiveMimeType: 'text/plain' };
      }
    }
    if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.SPREADSHEET) {
      const buffer = exportViaCli(file.id, 'csv', 'csv');
      return { buffer, effectiveMimeType: 'text/csv' };
    }
    if (file.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.PRESENTATION) {
      const buffer = exportViaCli(file.id, 'txt', 'txt');
      return { buffer, effectiveMimeType: 'text/plain' };
    }

    const tmpFile = path.join(os.tmpdir(), `tachos-gdrive-dl-${crypto.randomUUID()}.bin`);
    try {
      runGdrive(['download', file.id, '--out', tmpFile], 60_000);
      const stat = fs.statSync(tmpFile);
      if (stat.size > MAX_FILE_SIZE_BYTES) {
        throw new Error(`Downloaded file ${file.name} (${stat.size} bytes) exceeds 25MB limit`);
      }
      const buffer = fs.readFileSync(tmpFile);
      return { buffer, effectiveMimeType: file.mimeType };
    } finally {
      try {
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      } catch {
        // Ignore temp file cleanup failures
      }
    }
  }

  return { getFolderInfo, listFolderChildren, fetchFileContent };
}

function parseFolderIds(folderIds, env) {
  const source = folderIds !== undefined && folderIds !== null
    ? folderIds
    : env?.TACHOS_GDRIVE_FOLDER_IDS || '';

  if (Array.isArray(source)) {
    return source.map((id) => String(id || '').trim()).filter(Boolean);
  }
  return String(source)
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
}

function getExistingChunkCount(existing) {
  if (!existing || typeof existing !== 'object') return 0;
  if (typeof existing.chunkCount === 'number') return existing.chunkCount;
  if (typeof existing.chunk_count === 'number') return existing.chunk_count;
  if (Array.isArray(existing.chunks)) return existing.chunks.length;
  return 0;
}

async function pushDocumentRemote(docPayload, { pushUrl, adminToken, fetchImpl }) {
  const headers = { 'content-type': 'application/json' };
  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }
  const resp = await fetchImpl(pushUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(docPayload),
    signal: AbortSignal.timeout(30_000)
  });
  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    throw new Error(`Remote push to ${pushUrl} failed (HTTP ${resp.status}): ${errBody.slice(0, 240)}`);
  }
}

/**
 * Syncs explicitly configured Google Drive technical folders into the TACHOS KB store
 * (and/or pushes extracted documents over HTTPS to a remote KB endpoint).
 */
export async function syncGoogleDrive({
  store = null,
  folderIds,
  env = process.env,
  fetchImpl = globalThis.fetch,
  useCli = false,
  maxFiles = 150,
  dryRun = false,
  pushUrl = '',
  adminToken = '',
  execFileSyncImpl = execFileSync
} = {}) {
  const resolvedFolderIds = parseFolderIds(folderIds, env);
  if (resolvedFolderIds.length === 0) {
    return {
      scanned: 0,
      ingested: 0,
      skipped: 0,
      rejected: 0,
      errors: ['No TACHOS_GDRIVE_FOLDER_IDS configured'],
      documents: []
    };
  }

  const effectiveUseCli = Boolean(useCli || String(env?.TACHOS_GDRIVE_USE_CLI || '') === '1');
  const effectiveAdminToken = adminToken || String(env?.TACHOS_ADMIN_TOKEN || '').trim();
  const limit = Math.max(1, Number(maxFiles) || 150);

  const summary = {
    scanned: 0,
    ingested: 0,
    skipped: 0,
    rejected: 0,
    errors: [],
    documents: []
  };

  let adapter;
  try {
    if (effectiveUseCli) {
      adapter = createCliDriveAdapter({ execFileSyncImpl });
    } else {
      const accessToken = await getGoogleDriveAccessToken({ env, fetchImpl });
      adapter = createRestDriveAdapter({ accessToken, fetchImpl });
    }
  } catch (err) {
    summary.errors.push(`Google Drive authentication failed: ${err?.message || String(err)}`);
    return summary;
  }

  const visitedFolders = new Set();

  async function walkFolder(folderId, folderPath, depth) {
    if (summary.scanned >= limit) return;
    if (depth > MAX_WALK_DEPTH) return;
    if (visitedFolders.has(folderId)) return;
    visitedFolders.add(folderId);

    let children;
    try {
      children = await adapter.listFolderChildren(folderId);
    } catch (err) {
      summary.errors.push(`Failed to list folder ${folderPath || folderId}: ${err?.message || String(err)}`);
      return;
    }

    for (const item of children) {
      if (summary.scanned >= limit) break;

      const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

      // Subfolder check: enforce privacy denylist BEFORE ever descending
      if (item.mimeType === GOOGLE_WORKSPACE_MIME_TYPES.FOLDER) {
        const folderGate = isAllowedTechnicalFolder({ name: item.name, path: itemPath });
        if (!folderGate.allowed) {
          summary.rejected += 1;
          continue;
        }
        if (depth < MAX_WALK_DEPTH) {
          await walkFolder(item.id, itemPath, depth + 1);
        }
        continue;
      }

      summary.scanned += 1;

      const gate = isAllowedTechnicalFile({
        name: item.name,
        path: itemPath,
        mimeType: item.mimeType,
        size: item.size
      });

      if (!gate.allowed) {
        summary.rejected += 1;
        continue;
      }

      const externalId = `gdrive:${item.id}`;
      const existing = typeof store?.getDocumentByExternalId === 'function'
        ? store.getDocumentByExternalId(externalId)
        : null;
      const existingChunkCount = getExistingChunkCount(existing);

      if (
        existing &&
        item.modifiedTime &&
        existing.modifiedTime === item.modifiedTime &&
        existingChunkCount > 0
      ) {
        summary.skipped += 1;
        continue;
      }

      try {
        const { buffer, effectiveMimeType } = await adapter.fetchFileContent(item);
        const { text, format, warnings } = extractTextFromBuffer(buffer, {
          name: item.name,
          mimeType: effectiveMimeType
        });

        if (!text || !text.trim()) {
          summary.skipped += 1;
          if (warnings.length > 0) {
            summary.errors.push(`Skipped empty extraction for ${itemPath}: ${warnings.join('; ')}`);
          }
          continue;
        }

        const contentHash = sha256Hex(text);
        if (existing && existing.contentHash === contentHash && existingChunkCount > 0) {
          summary.skipped += 1;
          continue;
        }

        const title = item.name;
        const folderName = folderPath || folderId;
        const chunks = chunkText(text, { title });
        if (chunks.length === 0) {
          summary.skipped += 1;
          continue;
        }

        const workArea = classifyDocumentWorkArea({ title, text, folderName });
        const docPayload = {
          externalId,
          source: 'gdrive',
          folderName,
          title,
          mimeType: item.mimeType || effectiveMimeType || 'application/octet-stream',
          workArea,
          sourceUrl: item.webViewLink || `https://drive.google.com/file/d/${item.id}/view`,
          modifiedTime: item.modifiedTime || new Date().toISOString(),
          contentHash,
          rawExcerpt: text.slice(0, 500),
          chunks,
          metadata: {
            driveFileId: item.id,
            format,
            size: Number(item.size || buffer.length || 0)
          }
        };

        if (!dryRun) {
          if (typeof store?.upsertDocument === 'function') {
            store.upsertDocument(docPayload);
          }
          if (pushUrl) {
            await pushDocumentRemote(docPayload, {
              pushUrl,
              adminToken: effectiveAdminToken,
              fetchImpl
            });
          }
        }

        summary.ingested += 1;
        summary.documents.push({
          externalId,
          title,
          folderName,
          workArea,
          format,
          chunkCount: chunks.length,
          contentHash,
          modifiedTime: docPayload.modifiedTime,
          warnings,
          dryRun: Boolean(dryRun)
        });
      } catch (err) {
        summary.errors.push(`Failed to ingest ${itemPath} (${item.id}): ${err?.message || String(err)}`);
      }
    }
  }

  for (const rootFolderId of resolvedFolderIds) {
    if (summary.scanned >= limit) break;
    let folderName = rootFolderId;
    try {
      const info = await adapter.getFolderInfo(rootFolderId);
      if (info?.name) folderName = info.name;
    } catch (err) {
      summary.errors.push(`Failed to inspect root folder ${rootFolderId}: ${err?.message || String(err)}`);
      continue;
    }

    const rootGate = isAllowedTechnicalFolder({ name: folderName, path: folderName });
    if (!rootGate.allowed) {
      summary.rejected += 1;
      summary.errors.push(`Refused to sync excluded root folder "${folderName}": ${rootGate.reason}`);
      continue;
    }

    await walkFolder(rootFolderId, folderName, 0);
  }

  return summary;
}

/**
 * Recursively syncs a local technical documents directory using the exact same
 * privacy denylist, extractors, chunker, incremental hash checks, and store upsert.
 */
export async function syncLocalFolder({
  store = null,
  dirPath,
  folderLabel = 'Local Technical Docs',
  maxFiles = 150,
  dryRun = false,
  pushUrl = '',
  adminToken = '',
  fetchImpl = globalThis.fetch
} = {}) {
  const summary = {
    scanned: 0,
    ingested: 0,
    skipped: 0,
    rejected: 0,
    errors: [],
    documents: []
  };

  const resolvedDir = dirPath ? path.resolve(String(dirPath)) : '';
  if (!resolvedDir || !fs.existsSync(resolvedDir)) {
    summary.errors.push(`Local directory does not exist: ${dirPath || '(empty)'}`);
    return summary;
  }

  let rootStat;
  try {
    rootStat = fs.statSync(resolvedDir);
  } catch (err) {
    summary.errors.push(`Cannot stat local directory ${resolvedDir}: ${err?.message || String(err)}`);
    return summary;
  }

  if (!rootStat.isDirectory()) {
    summary.errors.push(`Path is not a directory: ${resolvedDir}`);
    return summary;
  }

  const limit = Math.max(1, Number(maxFiles) || 150);

  async function walkLocal(currentDir, depth) {
    if (summary.scanned >= limit) return;
    if (depth > MAX_WALK_DEPTH + 2) return;

    let entries;
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      summary.errors.push(`Failed to read directory ${currentDir}: ${err?.message || String(err)}`);
      return;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (summary.scanned >= limit) break;
      if (entry.isSymbolicLink()) continue;

      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(resolvedDir, fullPath).split(path.sep).join('/');

      if (entry.isDirectory()) {
        const folderGate = isAllowedTechnicalFolder({ name: entry.name, path: relPath });
        if (!folderGate.allowed) {
          summary.rejected += 1;
          continue;
        }
        await walkLocal(fullPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) continue;

      summary.scanned += 1;

      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (err) {
        summary.errors.push(`Failed to stat ${relPath}: ${err?.message || String(err)}`);
        continue;
      }

      const gate = isAllowedTechnicalFile({
        name: entry.name,
        path: relPath,
        size: stat.size
      });

      if (!gate.allowed) {
        summary.rejected += 1;
        continue;
      }

      const externalId = `local:${relPath}`;
      const modifiedTime = stat.mtime.toISOString();
      const existing = typeof store?.getDocumentByExternalId === 'function'
        ? store.getDocumentByExternalId(externalId)
        : null;
      const existingChunkCount = getExistingChunkCount(existing);

      if (existing && existing.modifiedTime === modifiedTime && existingChunkCount > 0) {
        summary.skipped += 1;
        continue;
      }

      try {
        const buffer = fs.readFileSync(fullPath);
        const { text, format, warnings } = extractTextFromBuffer(buffer, { name: entry.name });
        if (!text || !text.trim()) {
          summary.skipped += 1;
          if (warnings.length > 0) {
            summary.errors.push(`Skipped empty extraction for ${relPath}: ${warnings.join('; ')}`);
          }
          continue;
        }

        const contentHash = sha256Hex(text);
        if (existing && existing.contentHash === contentHash && existingChunkCount > 0) {
          summary.skipped += 1;
          continue;
        }

        const relDir = path.posix.dirname(relPath);
        const folderName = relDir && relDir !== '.' ? `${folderLabel}/${relDir}` : folderLabel;
        const title = entry.name;
        const chunks = chunkText(text, { title });
        if (chunks.length === 0) {
          summary.skipped += 1;
          continue;
        }

        const workArea = classifyDocumentWorkArea({ title, text, folderName });
        const docPayload = {
          externalId,
          source: 'local_folder',
          folderName,
          title,
          mimeType: formatToMimeType(format),
          workArea,
          sourceUrl: '',
          modifiedTime,
          contentHash,
          rawExcerpt: text.slice(0, 500),
          chunks,
          metadata: {
            relPath,
            format,
            size: stat.size
          }
        };

        if (!dryRun) {
          if (typeof store?.upsertDocument === 'function') {
            store.upsertDocument(docPayload);
          }
          if (pushUrl) {
            await pushDocumentRemote(docPayload, { pushUrl, adminToken, fetchImpl });
          }
        }

        summary.ingested += 1;
        summary.documents.push({
          externalId,
          title,
          folderName,
          workArea,
          format,
          chunkCount: chunks.length,
          contentHash,
          modifiedTime,
          warnings,
          dryRun: Boolean(dryRun)
        });
      } catch (err) {
        summary.errors.push(`Failed to ingest local file ${relPath}: ${err?.message || String(err)}`);
      }
    }
  }

  await walkLocal(resolvedDir, 0);
  return summary;
}

function formatToMimeType(format) {
  switch (format) {
    case 'pdf': return 'application/pdf';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'odt': return 'application/vnd.oasis.opendocument.text';
    case 'html': return 'text/html';
    case 'json': return 'application/json';
    case 'csv': return 'text/csv';
    case 'tsv': return 'text/tab-separated-values';
    case 'markdown': return 'text/markdown';
    default: return 'text/plain';
  }
}

function parseCliArgs(argv) {
  const opts = {
    folders: '',
    localDir: '',
    folderLabel: 'Local Technical Docs',
    useCli: false,
    dryRun: false,
    maxFiles: 150,
    pushUrl: '',
    adminToken: '',
    dbPath: '',
    pushOnly: false,
    saveLocal: false
  };

  for (const arg of argv) {
    if (arg.startsWith('--folders=')) opts.folders = arg.slice('--folders='.length);
    else if (arg.startsWith('--local-dir=')) opts.localDir = arg.slice('--local-dir='.length);
    else if (arg.startsWith('--folder-label=')) opts.folderLabel = arg.slice('--folder-label='.length);
    else if (arg === '--use-cli') opts.useCli = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg.startsWith('--max-files=')) opts.maxFiles = Number(arg.slice('--max-files='.length)) || 150;
    else if (arg.startsWith('--push-url=')) opts.pushUrl = arg.slice('--push-url='.length);
    else if (arg.startsWith('--admin-token=')) opts.adminToken = arg.slice('--admin-token='.length);
    else if (arg.startsWith('--db-path=')) opts.dbPath = arg.slice('--db-path='.length);
    else if (arg === '--push-only') opts.pushOnly = true;
    else if (arg === '--save-local') opts.saveLocal = true;
  }

  return opts;
}

async function runCli(argv = process.argv.slice(2)) {
  loadEnvIfPresent();
  const opts = parseCliArgs(argv);
  const effectivePushUrl = opts.pushUrl || process.env.TACHOS_KB_PUSH_URL || '';
  const effectiveAdminToken = opts.adminToken || process.env.TACHOS_ADMIN_TOKEN || '';
  const pushOnly = Boolean(opts.pushOnly || (effectivePushUrl && !opts.dbPath && !opts.saveLocal));

  let store = null;
  if (!pushOnly) {
    const { createStore } = await import('../store.mjs');
    store = createStore({ dbPath: opts.dbPath || process.env.TACHOS_DB_PATH });
  }

  try {
    const output = {};

    if (opts.localDir) {
      output.local = await syncLocalFolder({
        store,
        dirPath: opts.localDir,
        folderLabel: opts.folderLabel,
        maxFiles: opts.maxFiles,
        dryRun: opts.dryRun,
        pushUrl: effectivePushUrl,
        adminToken: effectiveAdminToken
      });
    }

    const shouldRunDrive = Boolean(opts.folders || !opts.localDir);
    if (shouldRunDrive) {
      output.gdrive = await syncGoogleDrive({
        store,
        folderIds: opts.folders || undefined,
        env: process.env,
        useCli: opts.useCli,
        maxFiles: opts.maxFiles,
        dryRun: opts.dryRun,
        pushUrl: effectivePushUrl,
        adminToken: effectiveAdminToken
      });
    }

    const result = Object.keys(output).length === 1
      ? output[Object.keys(output)[0]]
      : output;

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    if (store && typeof store.close === 'function') {
      store.close();
    }
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isDirectRun && !process.execArgv.includes('--test')) {
  runCli().catch((err) => {
    process.stderr.write(`TACHOS document ingestion failed: ${err?.message || String(err)}\n`);
    process.exitCode = 1;
  });
}
