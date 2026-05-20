/**
 * Multer/busboy often decode multipart filenames as latin1; re-decode to UTF-8.
 */
export function decodeUploadedFilename(originalname: string): string {
  if (!originalname) return originalname;
  try {
    const utf8 = Buffer.from(originalname, 'latin1').toString('utf8');
    if (utf8 !== originalname && !utf8.includes('\uFFFD')) {
      return utf8;
    }
  } catch {
    // keep original
  }
  return originalname;
}

export function parseFileFields(body: Record<string, unknown>): string[] {
  const raw = body.fileFields;
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) {
      return parsed.filter((f): f is string => typeof f === 'string' && f.length > 0);
    }
  } catch {
    console.warn('Failed to parse fileFields from upload request');
  }
  return [];
}

/** @deprecated Legacy filename-keyed mapping from older clients */
export function parseLegacyFieldNames(body: Record<string, unknown>): Record<string, string> {
  const raw = body.fieldNames;
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    console.warn('Failed to parse fieldNames from upload request');
  }
  return {};
}

/**
 * Resolve form field for an uploaded file. Prefer index-based fileFields[] (same order as files[]).
 */
export function resolveUploadFieldName(
  index: number,
  fileFields: string[],
  legacyFieldNames: Record<string, string>,
  decodedFilename: string,
  rawOriginalname: string,
  fallback?: string
): string {
  const fromIndex = fileFields[index];
  if (fromIndex) return fromIndex;

  const fromLegacy =
    legacyFieldNames[decodedFilename] ||
    legacyFieldNames[rawOriginalname] ||
    legacyFieldNames[decodeUploadedFilename(rawOriginalname)];

  if (fromLegacy) return fromLegacy;
  if (fallback) return fallback;
  return 'general';
}
