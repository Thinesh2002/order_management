function collectDocuments(input, found = []) {
  if (!input || typeof input !== 'object') return found;
  if (Array.isArray(input)) {
    input.forEach((item) => collectDocuments(item, found));
    return found;
  }

  const document = input.document || input;
  if (
    document.pdf_url ||
    document.file_url ||
    document.url ||
    document.download_url ||
    document.file_base64 ||
    document.file ||
    document.document ||
    document.content ||
    document.base64
  ) {
    found.push(document);
  }

  Object.values(input).forEach((value) => {
    if (value && typeof value === 'object') collectDocuments(value, found);
  });
  return found;
}

function base64ToBlob(base64, mimeType = 'application/pdf') {
  const cleaned = String(base64 || '').replace(/^data:[^;]+;base64,/, '');
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
}

function safeNavigate(targetWindow, url) {
  if (targetWindow && !targetWindow.closed) {
    targetWindow.location.href = url;
    return true;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

export function openBlankPrintWindow(title = 'Preparing AWB print...') {
  const popup = window.open('about:blank', '_blank');
  if (!popup) return null;

  try {
    popup.opener = null;
    popup.document.write(`<!doctype html><html><head><title>${title}</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a"><h3 style="margin:0 0 8px">${title}</h3><p style="margin:0;color:#64748b">Please wait while the document is prepared.</p></body></html>`);
    popup.document.close();
  } catch (_error) {
    // Ignore blocked popup document writes.
  }

  return popup;
}

export function closePrintWindow(targetWindow) {
  try {
    if (targetWindow && !targetWindow.closed) targetWindow.close();
  } catch (_error) {
    // Ignore popup close errors.
  }
}

export function writePrintWindowMessage(targetWindow, message = 'Document not found.') {
  if (!targetWindow || targetWindow.closed) return false;

  try {
    targetWindow.document.open();
    targetWindow.document.write(`<!doctype html><html><head><title>AWB Print</title></head><body style="font-family:Arial,sans-serif;padding:24px;color:#0f172a"><h3 style="margin:0 0 8px">AWB Print</h3><p style="margin:0;color:#475569">${String(message).replace(/</g, '&lt;')}</p></body></html>`);
    targetWindow.document.close();
    return true;
  } catch (_error) {
    return false;
  }
}

export function openDarazDocument(payload, targetWindow = null) {
  const documents = collectDocuments(payload);
  const doc = documents.find((item) => item.pdf_url || item.file_url || item.url || item.download_url || item.file_base64 || item.file || item.document || item.data_url || item.content || item.base64);
  if (!doc) return false;

  const url = doc.pdf_url || doc.file_url || doc.url || doc.download_url;
  if (url) return safeNavigate(targetWindow, url);

  const dataUrl = doc.data_url;
  if (dataUrl) return safeNavigate(targetWindow, dataUrl);

  const file = doc.file_base64 || doc.file || doc.document || doc.content || doc.base64;
  if (file) {
    const mimeType = doc.mime_type || doc.mimeType || (String(doc.doc_type || doc.document_type || '').toUpperCase() === 'PDF' ? 'application/pdf' : 'text/html');
    const cleaned = String(file || '');

    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      return safeNavigate(targetWindow, cleaned);
    }

    if (cleaned.startsWith('data:')) {
      return safeNavigate(targetWindow, cleaned);
    }

    const blob = base64ToBlob(cleaned, mimeType);
    const blobUrl = URL.createObjectURL(blob);
    safeNavigate(targetWindow, blobUrl);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return true;
  }

  return false;
}

export function extractDarazActionMessage(result) {
  const data = result?.data || result || {};
  const errors = data.errors || [];
  const skipped = data.skipped || [];
  const firstError = errors[0]?.message || skipped[0]?.message;
  if (firstError) return firstError;
  return data.message || data.result?.error_msg || 'Daraz action completed.';
}
