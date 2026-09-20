const LOCALE: Record<'ar' | 'en', string> = { ar: 'ar-EG', en: 'en-US' };

export function localizedDate(
  date: string | Date | number,
  lang: 'ar' | 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleDateString(LOCALE[lang], options);
}

export function localizedTime(
  date: string | Date | number,
  lang: 'ar' | 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleTimeString(LOCALE[lang], options);
}

export function localizedDateTime(
  date: string | Date | number,
  lang: 'ar' | 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(date).toLocaleString(LOCALE[lang], options);
}
