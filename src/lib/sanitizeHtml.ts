import DOMPurify from 'dompurify';

export function sanitizeRichText(value: unknown): string {
  const html = String(value || '');
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['class', 'data-list'],
  }).replace(/&nbsp;/g, ' ').replace(/\u00a0/g, ' ');
}
