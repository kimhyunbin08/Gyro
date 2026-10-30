import { describe, expect, it } from 'vitest';
import { escapeHtml, safeExternalUrl } from '../src/html-safety.js';

describe('HTML rendering safety', () => {
  it('escapes text and attribute delimiters before HTML interpolation', () => {
    expect(escapeHtml(`<script src="x">&'`)).toBe('&lt;script src=&quot;x&quot;&gt;&amp;&#39;');
  });

  it('accepts only absolute HTTP(S) URLs without embedded credentials', () => {
    expect(safeExternalUrl('https://gyro.example/path?a=1&b=2')).toBe('https://gyro.example/path?a=1&b=2');
    expect(safeExternalUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeExternalUrl('https://user:pass@gyro.example')).toBeUndefined();
    expect(safeExternalUrl('/relative/path')).toBeUndefined();
  });
});
