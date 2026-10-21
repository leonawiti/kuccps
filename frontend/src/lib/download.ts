/** Offer text as a file download. Quietly does nothing where the browser cannot (for example in tests). */
export function downloadText(filename: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
