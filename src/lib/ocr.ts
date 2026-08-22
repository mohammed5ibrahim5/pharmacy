import { createWorker } from 'tesseract.js';

// ============================================================
// محرك الفحص الآلي الأولي للروشتات (OCR)
// الخطوة 2 من خط أنابيب التحقق: استخراج البيانات من الصورة
// ============================================================

export interface OcrFields {
  drug_name?: string;
  dosage?: string;
  doctor_name?: string;
  doctor_syndicate_no?: string;
  issue_date?: string;
}

export interface OcrResult {
  ok: boolean;
  confidence: number;
  fields: OcrFields;
  rawText: string;
  error?: string;
}

const TESSERACT_VERSION = '5.1.1';
const TESSERACT_CORE_VERSION = '5.1.0';

let workerPromise: ReturnType<typeof createWorker> | null = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = createWorker(['ara', 'eng'], 1, {
      workerPath: `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js`,
      corePath: `https://cdn.jsdelivr.net/npm/tesseract.js-core@${TESSERACT_CORE_VERSION}`,
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: () => {},
    });
  }
  return workerPromise;
}

export async function terminateOcrWorker() {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}

// ---------- معالجة مسبقة للصورة لتحسين دقة القراءة ----------
async function preprocessImage(file: File | Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1800;
    const minDim = 1000;
    let { width, height } = bitmap;
    // تصغير الصور الضخمة وتكبير الصور الصغيرة جداً
    const scale =
      Math.max(width, height) > maxDim
        ? maxDim / Math.max(width, height)
        : Math.min(width, height) < minDim
          ? minDim / Math.min(width, height)
          : 1;
    width = Math.round(width * scale);
    height = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.filter = 'grayscale(1) contrast(1.35) brightness(1.06)';
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b || file), 'image/png');
    });
  } catch {
    return file;
  }
}

// ---------- أدوات تحليل النص ----------
function normalizeDigits(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

function normalizeArabic(s: string): string {
  return normalizeDigits(s)
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase();
}

function extractIssueDate(text: string): string | undefined {
  const normalized = normalizeDigits(text);
  const patterns = [
    /(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/, // yyyy-mm-dd
    /(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/, // dd/mm/yyyy
  ];
  for (const re of patterns) {
    const m = normalized.match(re);
    if (!m) continue;
    let y: number, mo: number, d: number;
    if (re === patterns[0]) {
      y = +m[1];
      mo = +m[2];
      d = +m[3];
    } else {
      d = +m[1];
      mo = +m[2];
      y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    }
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y >= 2015 && y <= 2100) {
      return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  return undefined;
}

function extractSyndicateNo(text: string): string | undefined {
  const lines = normalizeDigits(text).split(/[\n\r]+/);
  // ابحث عن رقم بجوار كلمات مفتاحية
  for (let i = 0; i < lines.length; i++) {
    if (/نقاب|سجل|ترخيص|نياب/.test(lines[i])) {
      const inLine = lines[i].match(/\b(\d{4,8})\b/);
      if (inLine) return inLine[1];
      const next = lines[i + 1]?.match(/\b(\d{4,8})\b/);
      if (next) return next[1];
    }
  }
  // fallback: أول رقم مستقل طوله 5-8 أرقام
  const standalone = normalizeDigits(text).match(/\b(\d{5,8})\b/);
  return standalone ? standalone[1] : undefined;
}

function extractDoctorName(text: string): string | undefined {
  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const m = line.match(/(?:الدكتور|دكتور|د\.|د\/|Dr\.?|DR\.?)\s*[:-]?\s*([\u0600-\u06FFa-zA-Z\s]{3,40})/);
    if (m) {
      const name = m[1]
        .split(/\s{2,}|\d/)[0]
        .trim()
        .replace(/\s+(استشاري|أخصائي|بكالوريوس|ماجستير|دكتوراه).*$/i, '')
        .trim();
      if (name.length >= 3) return name;
    }
  }
  return undefined;
}

function extractDosage(text: string): string | undefined {
  const normalized = normalizeDigits(text);
  const m = normalized.match(/\b(\d{1,4}\s*(?:mg|ml|جم|ملجم|مجم|ميكروجرام|mcg|g)\b)/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : undefined;
}

function matchDrugName(text: string, productNames: string[]): string | undefined {
  const hay = normalizeArabic(text);
  let best: { name: string; len: number } | undefined;
  for (const raw of productNames) {
    const needle = normalizeArabic(raw).trim();
    if (needle.length < 4) continue;
    if (hay.includes(needle) && (!best || needle.length > best.len)) {
      best = { name: raw, len: needle.length };
    }
  }
  return best?.name;
}

export interface RecognizeOptions {
  productNames?: string[];
}

/**
 * يشغّل خطوات الفحص الآلي على صورة الروشتة:
 * معالجة الصورة → قراءة نصية → استخراج الحقول المنظمة
 */
export async function recognizePrescription(file: File | Blob, options: RecognizeOptions = {}): Promise<OcrResult> {
  try {
    const processed = await preprocessImage(file);
    const worker = await getWorker();
    const { data } = await worker.recognize(processed);
    const text = data.text || '';
    const confidence = Math.round(data.confidence || 0);

    if (!text.trim() || confidence < 10) {
      return { ok: false, confidence, fields: {}, rawText: text, error: 'لم يتم التعرف على أي نص في الصورة' };
    }

    const fields: OcrFields = {
      issue_date: extractIssueDate(text),
      doctor_syndicate_no: extractSyndicateNo(text),
      doctor_name: extractDoctorName(text),
      dosage: extractDosage(text),
    };
    const matchedDrug = options.productNames?.length
      ? matchDrugName(text, options.productNames)
      : undefined;
    if (matchedDrug) fields.drug_name = matchedDrug;

    return { ok: true, confidence, fields, rawText: text };
  } catch (err) {
    return {
      ok: false,
      confidence: 0,
      fields: {},
      rawText: '',
      error: err instanceof Error ? err.message : 'تعذر تشغيل الفحص الآلي',
    };
  }
}
