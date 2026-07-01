function collectDocuments(input, found = []) {
  if (!input || typeof input !== 'object') return found;
  if (Array.isArray(input)) {
    input.forEach((item) => collectDocuments(item, found));
    return found;
  }

  const document = input.document || input;
  if (document.pdf_url || document.file_url || document.file_base64 || document.file || document.data_url) {
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

export function openDarazDocument(payload) {
  const documents = collectDocuments(payload);
  const doc = documents.find((item) => item.pdf_url || item.file_url || item.file_base64 || item.file || item.data_url);
  if (!doc) return false;

  const url = doc.pdf_url || doc.file_url;
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  const dataUrl = doc.data_url;
  if (dataUrl) {
    const newWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (newWindow) newWindow.location.href = dataUrl;
    return true;
  }

  const file = doc.file_base64 || doc.file;
  if (file) {
    const mimeType = doc.mime_type || (String(doc.doc_type || doc.document_type || '').toUpperCase() === 'PDF' ? 'application/pdf' : 'text/html');
    const blob = base64ToBlob(file, mimeType);
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
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
