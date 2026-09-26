import { describe, it, expect } from 'vitest';
import { buildWhatsAppLink } from '@/lib/whatsapp';

describe('buildWhatsAppLink', () => {
  it('builds a basic link with no text', () => {
    const link = buildWhatsAppLink('01012345678');
    expect(link).toBe('https://wa.me/201012345678');
  });

  it('builds a link with encoded text', () => {
    const link = buildWhatsAppLink('01012345678', 'Hello!');
    expect(link).toContain('https://wa.me/201012345678?text=');
    expect(link).toContain(encodeURIComponent('Hello!'));
  });

  it('strips non-digit characters from phone', () => {
    const link = buildWhatsAppLink('+20-101-234-5678');
    expect(link).toBe('https://wa.me/201012345678');
  });

  it('converts leading 0 to country code 20', () => {
    const link = buildWhatsAppLink('01012345678');
    expect(link).toContain('201012345678');
  });

  it('strips leading 00', () => {
    const link = buildWhatsAppLink('00201012345678');
    expect(link).toContain('201012345678');
  });

  it('preserves international number without leading 0 or 00', () => {
    const link = buildWhatsAppLink('201012345678');
    expect(link).toBe('https://wa.me/201012345678');
  });

  it('handles empty phone gracefully', () => {
    const link = buildWhatsAppLink('', 'test');
    expect(link).toContain('wa.me/');
    expect(link).toContain('text=test');
  });

  it('handles text with Arabic characters', () => {
    const link = buildWhatsAppLink('01012345678', 'مرحبا');
    expect(link).toContain('text=');
    expect(link).toContain(encodeURIComponent('مرحبا'));
  });
});
