export function buildWhatsAppLink(phone: string, text?: string): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  } else if (digits.startsWith('0') && digits.length <= 11) {
    digits = '20' + digits.slice(1);
  }
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
