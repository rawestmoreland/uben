export function convertToTranslationKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[()]/g, '')
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/é/g, 'e');
}
