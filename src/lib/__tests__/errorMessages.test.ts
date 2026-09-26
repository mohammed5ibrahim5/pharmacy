import { describe, it, expect } from 'vitest';
import { translateError, localizedError } from '@/lib/errorMessages';

describe('translateError', () => {
  it('returns default for null input', () => {
    const result = translateError(null);
    expect(result.ar).toBe('حدث خطأ غير متوقع');
    expect(result.en).toBe('Unexpected error');
  });

  it('returns default for undefined input', () => {
    const result = translateError(undefined);
    expect(result.ar).toBe('حدث خطأ غير متوقع');
    expect(result.en).toBe('Unexpected error');
  });

  it('translates invalid login credentials', () => {
    const result = translateError('invalid login credentials');
    expect(result.ar).toContain('بيانات الدخول غير صحيحة');
    expect(result.en).toContain('Invalid login credentials');
    expect(result.hint).toBeDefined();
    expect(result.hintEn).toBeDefined();
  });

  it('translates wrong password', () => {
    const result = translateError('wrong password');
    expect(result.ar).toContain('بيانات الدخول غير صحيحة');
  });

  it('translates email not confirmed', () => {
    const result = translateError('email not confirmed');
    expect(result.ar).toContain('البريد الإلكتروني غير مؤكد');
    expect(result.en).toContain('Email not confirmed');
  });

  it('translates user already registered', () => {
    const result = translateError('user already registered');
    expect(result.ar).toContain('البريد مسجل بالفعل');
    expect(result.en).toContain('already registered');
  });

  it('translates rate limit', () => {
    const result = translateError('rate limit exceeded');
    expect(result.ar).toContain('عدد المحاولات كبير جداً');
    expect(result.en).toContain('Too many attempts');
  });

  it('translates password too short', () => {
    const result = translateError('password must be at least 6 characters');
    expect(result.ar).toContain('قصيرة جداً');
    expect(result.en).toContain('too short');
  });

  it('translates invalid email', () => {
    const result = translateError('invalid email');
    expect(result.ar).toContain('البريد الإلكتروني غير صحيح');
    expect(result.en).toContain('Invalid email');
  });

  it('translates network error', () => {
    const result = translateError('network error');
    expect(result.ar).toContain('تعذر الاتصال');
    expect(result.en).toContain('connect');
  });

  it('translates permission denied', () => {
    const result = translateError('permission denied');
    expect(result.ar).toContain('صلاحية');
    expect(result.en).toContain('permission');
  });

  it('translates database error', () => {
    const result = translateError('database error occurred');
    expect(result.ar).toContain('قاعدة البيانات');
    expect(result.en).toContain('Database error');
  });

  it('translates missing table', () => {
    const result = translateError("could not find the table 'public.customers'");
    expect(result.ar).toContain('جدول العملاء غير منشأ');
    expect(result.en).toContain('missing');
  });

  it('returns Arabic text as-is when input is already Arabic', () => {
    const arabicMsg = 'هذا البريد الإلكتروني مسجل بالفعل، برجاء تسجيل الدخول';
    const result = translateError(arabicMsg);
    expect(result.ar).toBe(arabicMsg);
    expect(result.en).toBe(arabicMsg);
  });

  it('translates session expired', () => {
    const result = translateError('jwt token has expired');
    expect(result.ar).toContain('انتهت صلاحية الجلسة');
    expect(result.en).toContain('Session expired');
  });

  it('returns fallback for unrecognized errors', () => {
    const result = translateError('something completely unknown happened');
    expect(result.ar).toContain('خطأ غير متوقع');
    expect(result.en).toContain('unexpected error');
    expect(result.hint).toBeDefined();
  });
});

describe('localizedError', () => {
  it('returns Arabic for lang ar', () => {
    const result = localizedError('invalid login credentials', 'ar');
    expect(result).toContain('بيانات الدخول غير صحيحة');
  });

  it('returns English for lang en', () => {
    const result = localizedError('invalid login credentials', 'en');
    expect(result).toContain('Invalid login credentials');
  });

  it('returns default Arabic for null', () => {
    const result = localizedError(null, 'ar');
    expect(result).toBe('حدث خطأ غير متوقع');
  });

  it('returns default English for null', () => {
    const result = localizedError(null, 'en');
    expect(result).toBe('Unexpected error');
  });
});
