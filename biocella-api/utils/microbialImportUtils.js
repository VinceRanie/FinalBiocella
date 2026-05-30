const PUBLISH_STATUSES = new Set(['published', 'unpublished']);

const normalizeString = (value) => String(value || '').trim();

const normalizePublishStatus = (status, fallback = 'unpublished') => {
  const normalized = normalizeString(status).toLowerCase();
  return PUBLISH_STATUSES.has(normalized) ? normalized : fallback;
};

const coerceDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const extractAccessionFromFasta = (fastaSequence) => {
  if (!fastaSequence || typeof fastaSequence !== 'string') {
    return '';
  }

  const lines = fastaSequence.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('>')) {
      continue;
    }

    const header = line.slice(1).trim();
    if (!header) {
      continue;
    }

    const pipeTokens = header.split('|').map((token) => token.trim()).filter(Boolean);
    const pipeAccession = pipeTokens.find((token) => /^[A-Z]{1,4}_[A-Z0-9]+(?:\.[0-9]+)?$/i.test(token) || /^[A-Z]{1,3}[0-9]{5,}(?:\.[0-9]+)?$/i.test(token));
    if (pipeAccession) {
      return pipeAccession.toUpperCase();
    }

    const firstToken = header.split(/\s+/)[0] || '';
    if (/^[A-Z]{1,4}_[A-Z0-9]+(?:\.[0-9]+)?$/i.test(firstToken) || /^[A-Z]{1,3}[0-9]{5,}(?:\.[0-9]+)?$/i.test(firstToken)) {
      return firstToken.toUpperCase();
    }
  }

  return '';
};

module.exports = {
  coerceDate,
  extractAccessionFromFasta,
  normalizePublishStatus,
  normalizeString,
};