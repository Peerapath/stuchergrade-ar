// Classifies camera start errors so the UI can show permission instructions.

const DENIED_NAMES = new Set(['NotAllowedError', 'PermissionDeniedError', 'SecurityError']);

export function isCameraDenied(err) {
  return DENIED_NAMES.has(err?.name);
}
