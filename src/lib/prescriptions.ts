import { supabase } from '@/lib/supabase';
import { extractStoragePathFromUrl } from '@/lib/storage';
import { recognizePrescription, type OcrFields } from '@/lib/ocr';
import { insertNotification } from '@/lib/notifications';

// ============================================================
// نظام التحقق الاحترافي من الروشتات — 8 خطوات
// 1 رفع الروشتة  2 فحص آلي OCR  3 صلاحية + ترخيص الطبيب
// 4 فحص التكرار  5 تصنيف الخطورة  6 مراجعة بشرية
// 7 موافقة + كود مرجعي  8 تسليم بالتحقق من الهوية
// ============================================================

export type PrescriptionStatus = 'new' | 'reviewing' | 'preparing' | 'completed' | 'cancelled';

export const PRESCRIPTION_STATUSES: PrescriptionStatus[] = [
  'new',
  'reviewing',
  'preparing',
  'completed',
  'cancelled',
];

export const PRESCRIPTION_STATUS_META: Record<
  PrescriptionStatus,
  { label: string; className: string; dot: string }
> = {
  new: { label: 'جديدة', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  reviewing: { label: 'قيد المراجعة', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  preparing: { label: 'جاري التجهيز', className: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  completed: { label: 'مكتملة', className: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  cancelled: { label: 'ملغاة', className: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
};

// ---------- حالات خط الأنابيب ----------
export type PipelineStatus =
  | 'pending_ocr'
  | 'auto_rejected'
  | 'needs_review'
  | 'clarification_requested'
  | 'approved'
  | 'rejected'
  | 'dispensed';

export const PIPELINE_STATUS_META: Record<
  PipelineStatus,
  { label: string; className: string; dot: string; hint: string }
> = {
  pending_ocr: {
    label: 'فحص آلي جارٍ',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    hint: 'النظام يقرأ الروشتة ويطبق الفحوصات الآلية',
  },
  auto_rejected: {
    label: 'مرفوضة آلياً',
    className: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-500',
    hint: 'رُفضت تلقائياً بسبب صورة غير واضحة أو بيانات ناقصة أو روشتة منتهية',
  },
  needs_review: {
    label: 'بانتظار مراجعة الصيدلي',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    hint: 'اجتازت الفحص الآلي وتنتظر مراجعة صيدلي مرخص',
  },
  clarification_requested: {
    label: 'طلب توضيح من العميل',
    className: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    hint: 'الصيدلي طلب معلومات إضافية من العميل',
  },
  approved: {
    label: 'معتمدة',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
    dot: 'bg-teal-500',
    hint: 'اعتمدها صيدلي مرخص وصدر لها كود مرجعي',
  },
  rejected: {
    label: 'مرفوضة نهائياً',
    className: 'bg-red-50 text-red-600 border-red-200',
    dot: 'bg-red-500',
    hint: 'رفضها الصيدلي بعد المراجعة البشرية',
  },
  dispensed: {
    label: 'تم الصرف',
    className: 'bg-green-50 text-green-700 border-green-200',
    dot: 'bg-green-600',
    hint: 'صُرفت وتحقق من هوية المستلم عند التسليم',
  },
};

export type RiskLevel = 'normal' | 'restricted' | 'narcotic';

export const RISK_LEVEL_META: Record<RiskLevel, { label: string; className: string }> = {
  normal: { label: 'عادية', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  restricted: { label: 'مقيدة', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  narcotic: { label: 'مخدرة', className: 'bg-red-100 text-red-700 border-red-300' },
};

export interface VerificationConfig {
  enabled: boolean;
  strictOcrRejection: boolean;
  ocrMinConfidence: number;
  rxValidityDaysNormal: number;
  rxValidityDaysRestricted: number;
  requireSyndicateCheck: boolean;
  controlledDrugKeywords: string[];
  narcoticDrugKeywords: string[];
}

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  enabled: true,
  strictOcrRejection: true,
  ocrMinConfidence: 55,
  rxValidityDaysNormal: 90,
  rxValidityDaysRestricted: 30,
  requireSyndicateCheck: true,
  controlledDrugKeywords: [
    'ترامادول', 'ترامال', 'ستروكس', 'أولترام', 'ترامادير',
    'ألبرازولام', 'ألبرولاين', 'زاناكس', 'ريفوتريل', 'كلونازيبام',
    'لورازيبام', 'أتيفان', 'ديازيبام', 'فاليوم', 'فينوباربيتال',
  ],
  narcoticDrugKeywords: ['مورفين', 'فينتانيل', 'أوكسيكودون', 'ميثادون', 'بوبرينورفين'],
};

export interface RxOcrData extends OcrFields {
  flags?: string[];
  doctor_check?: 'verified' | 'not_found' | 'unknown';
  confidence?: number;
}

export interface Prescription {
  id: string;
  customer_id: string | null;
  image_url: string;
  phone: string;
  notes: string | null;
  status: PrescriptionStatus;
  created_at: string;
  updated_at?: string;
  // خط أنابيب التحقق
  patient_name?: string | null;
  image_hash?: string | null;
  data_hash?: string | null;
  ocr_status?: 'pending' | 'processing' | 'passed' | 'failed' | null;
  ocr_data?: RxOcrData | null;
  validity_status?: 'unknown' | 'valid' | 'expired' | 'invalid_date' | null;
  duplicate_status?: 'unknown' | 'clear' | 'suspected' | null;
  duplicate_of?: string | null;
  risk_level?: RiskLevel | null;
  delivery_mode?: 'delivery' | 'pickup_only' | null;
  pipeline_status?: PipelineStatus | null;
  review_notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  rejection_reason?: string | null;
  reference_code?: string | null;
  order_group_id?: string | null;
  dispensed_at?: string | null;
  dispensed_pharmacy_id?: string | null;
  recipient_national_id?: string | null;
  identity_verified?: boolean | null;
  delivered_at?: string | null;
  delivered_by?: string | null;
  customer?: { full_name: string | null; phone: string | null } | null;
}

// ============================================================
// أدوات التشفير والبصمة الرقمية
// ============================================================

/** بصمة SHA-256 لملف الصورة (خطوة 4: فحص التكرار) */
export async function sha256Hex(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function normalizeForFingerprint(s: string): string {
  return s
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ىي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** بصمة البيانات المستخرجة: نفس الروشتة ببيانات مطابقة حتى لو الصورة مختلفة الجودة */
async function fingerprintData(fields: OcrFields, phone: string): Promise<string> {
  const parts = [
    normalizeForFingerprint(fields.drug_name || ''),
    normalizeForFingerprint(fields.dosage || ''),
    normalizeForFingerprint(fields.doctor_name || ''),
    fields.doctor_syndicate_no || '',
    fields.issue_date || '',
    phone.replace(/\D/g, ''),
  ].join('|');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** كود مرجعي فريد RX-XXXXXX (خطوة 7) */
export function generateReferenceCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join('');
  return `RX-${suffix}`;
}

// ============================================================
// الخطوة 3: فحص صلاحية الروشتة + ترخيص الطبيب
// ============================================================

export function checkValidity(
  issueDate: string | undefined,
  riskLevel: RiskLevel,
  cfg: VerificationConfig
): { status: 'valid' | 'expired' | 'invalid_date'; daysLeft?: number } {
  if (!issueDate) return { status: 'invalid_date' };
  const issued = new Date(`${issueDate}T00:00:00`);
  if (Number.isNaN(issued.getTime())) return { status: 'invalid_date' };
  const maxDays =
    riskLevel === 'normal' ? cfg.rxValidityDaysNormal : Math.min(cfg.rxValidityDaysRestricted, cfg.rxValidityDaysNormal);
  const daysLeft = maxDays - Math.floor((Date.now() - issued.getTime()) / 86_400_000);
  return daysLeft < 0 ? { status: 'expired', daysLeft } : { status: 'valid', daysLeft };
}

export async function checkDoctorRegistry(syndicateNo: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('doctor_registry')
    .select('id')
    .eq('syndicate_no', syndicateNo.trim())
    .eq('is_active', true)
    .maybeSingle();
  if (error) console.error('[rx] doctor registry:', error.message);
  return !!data;
}

/**
 * حد أقصى زمني لأي طلب شبكة داخل خط الأنابيب
 * يعيد undefined عند انتهاء المهلة بدل التعليق للأبد
 */
function raceTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      }
    );
  });
}

const DB_TIMEOUT_MS = 20_000;

// ============================================================
// الخطوة 5: تصنيف الدواء حسب درجة الخطورة
// ============================================================

export function classifyRisk(text: string, cfg: VerificationConfig): RiskLevel {
  const hay = normalizeForFingerprint(text);
  const has = (list: string[]) => list.some((k) => hay.includes(normalizeForFingerprint(k)));
  if (has(cfg.narcoticDrugKeywords)) return 'narcotic';
  if (has(cfg.controlledDrugKeywords)) return 'restricted';
  return 'normal';
}

// ============================================================
// الخطوة 4: فحص التكرار مقابل سجل الصرف المركزي
// ============================================================

async function findDuplicate(imageHash: string, dataHash: string, excludeId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('id, reference_code, pipeline_status, created_at')
    .or(`image_hash.eq.${imageHash},data_hash.eq.${dataHash}`)
    .in('pipeline_status', ['needs_review', 'clarification_requested', 'approved', 'dispensed'])
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) console.error('[rx] findDuplicate:', error.message);
  return (data?.[0] as { id: string; reference_code: string | null } | undefined) || null;
}

// ============================================================
// سجل التدقيق (Audit trail)
// ============================================================

export async function addAudit(
  prescriptionId: string,
  actorType: 'system' | 'admin' | 'customer',
  action: string,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from('prescription_audit_log').insert({
      prescription_id: prescriptionId,
      actor_type: actorType,
      action,
      details,
    });
  } catch {
    // سجل التدقيق لا يجب أن يعطل المسار الأساسي
  }
}

export async function fetchAuditLog(prescriptionId: string) {
  const { data, error } = await supabase
    .from('prescription_audit_log')
    .select('*')
    .eq('prescription_id', prescriptionId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

// ============================================================
// رفع الصورة (خطوة 1)
// ============================================================

export async function uploadPrescriptionImage(file: Blob, customerId: string): Promise<string> {
  const ext = file instanceof File && file.type === 'image/jpeg' ? 'jpg' : 'png';
  const path = `${customerId}/rx_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('prescriptions').upload(path, file, {
    contentType: file.type || 'image/png',
    upsert: false,
  });
  if (error) throw error;
  // نخزن شكل الرابط العام — العرض يتم عبر signed URLs لأن البوكيت خاص
  const { data } = supabase.storage.from('prescriptions').getPublicUrl(path);
  return data.publicUrl;
}

export async function deletePrescription(id: string, imageUrl: string) {
  try {
    const path = extractStoragePathFromUrl('prescriptions', imageUrl);
    if (path) {
      await supabase.storage.from('prescriptions').remove([path]);
    }
  } catch {
    // تجاهل أخطاء حذف التخزين
  }
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * رد العميل على طلب توضيح من الصيدلي:
 * صورة أوضح (اختياري) + ملاحظة، وترجع الروشتة لطابور المراجعة
 */
export async function respondPrescriptionClarification(input: {
  rxId: string;
  customerId: string;
  file?: File | Blob;
  notes: string;
}): Promise<void> {
  let imageUrl: string | undefined;
  if (input.file) {
    imageUrl = await uploadPrescriptionImage(input.file, input.customerId);
  }
  const { error } = await supabase
    .from('prescriptions')
    .update({
      ...(imageUrl ? { image_url: imageUrl } : {}),
      notes: input.notes.trim() || null,
      pipeline_status: 'needs_review',
      rejection_reason: null,
    })
    .eq('id', input.rxId)
    .eq('customer_id', input.customerId);
  if (error) throw error;
  await addAudit(input.rxId, 'customer', 'clarification_response', {
    has_new_image: !!input.file,
    notes: input.notes.trim(),
  });
}

/** أسماء الأدوية التي تتطلب روشتة — تستخدم لمطابقة استخراج OCR */
export async function getProductNamesRequiringRx(): Promise<string[]> {
  const { data } = await supabase
    .from('products')
    .select('name')
    .eq('requires_prescription', true)
    .limit(500);
  return (data || []).map((p: { name: string }) => p.name);
}

// ============================================================
// المنسّق الرئيسي: الخطوات 1 → 5 آلياً بعد الضغط على "إرسال"
// ============================================================

export const VERIFICATION_STAGES = [
  'رفع آمن ومشفّر للصورة',
  'الفحص الآلي الأولي (OCR)',
  'التحقق من صلاحية الروشتة',
  'فحص التكرار ومنع إعادة الاستخدام',
  'تصنيف الدواء حسب درجة الخطورة',
];

export interface SubmitRxInput {
  file: Blob;
  customerId: string;
  patientName: string;
  phone: string;
  notes?: string;
  cfg?: VerificationConfig;
  productNames?: string[];
  onProgress?: (stageIndex: number) => void;
  /** نسبة تقدم التعرف النصي داخل مرحلة OCR (0-100) */
  onOcrProgress?: (pct: number) => void;
}

export type SubmitRxOutcome =
  | {
      kind: 'needs_review';
      prescriptionId: string;
      fields: OcrFields;
      riskLevel: RiskLevel;
      warnings: string[];
    }
  | { kind: 'auto_rejected'; prescriptionId: string; reason: string };

export async function submitPrescriptionVerification(input: SubmitRxInput): Promise<SubmitRxOutcome> {
  const { file, customerId, patientName, phone, notes, productNames = [], onProgress } = input;
  const cfg = input.cfg ?? DEFAULT_VERIFICATION_CONFIG;
  // ---- (1) رفع آمن + إنشاء السجل ----
  onProgress?.(0);
  const [imageHash] = await Promise.all([sha256Hex(file)]);
  const imageUrl = await uploadPrescriptionImage(file, customerId);

  const { data: inserted, error: insertError } = await supabase
    .from('prescriptions')
    .insert({
      customer_id: customerId,
      image_url: imageUrl,
      phone: phone.trim(),
      patient_name: patientName.trim(),
      notes: notes?.trim() || null,
      image_hash: imageHash,
      ocr_status: 'processing',
      pipeline_status: 'pending_ocr',
    })
    .select('id')
    .single();
  if (insertError) throw insertError;
  const rxId = inserted.id as string;
  await addAudit(rxId, 'customer', 'uploaded', { patient_name: patientName.trim() });

  // ---- (2) الفحص الآلي الأولي OCR ----
  onProgress?.(1);
  const ocr = await recognizePrescription(file, {
    productNames,
    onProgress: (pct) => input.onOcrProgress?.(pct),
  });
  const readable =
    ocr.ok &&
    ocr.confidence >= cfg.ocrMinConfidence &&
    !!(ocr.fields.drug_name || ocr.fields.doctor_name);

  if (!readable && cfg.strictOcrRejection) {
    await finalizeAutoReject(
      rxId,
      ocr.confidence > 0 && ocr.ok
        ? 'تعذر قراءة بيانات كافية من الصورة (اسم دواء أو طبيب). تأكد من إضاءة جيدة وأن الروشتة كاملة في الإطار ثم أعد المحاولة.'
        : 'الصورة غير واضحة أو غير مقروءة. صوّر الروشتة بإضاءة جيدة وكاملة في الإطار ثم أعد المحاولة.',
      ocr
    );
    return { kind: 'auto_rejected', prescriptionId: rxId, reason: 'unclear_image' };
  }

  // ---- (5) تصنيف الخطورة قبل فحص الصلاحية (يحدد مدة الصلاحية) ----
  onProgress?.(4);
  const riskLevel = classifyRisk(`${ocr.rawText} ${ocr.fields.drug_name || ''}`, cfg);

  // ---- (3) فحص صلاحية الروشتة ----
  onProgress?.(2);
  const validity = checkValidity(ocr.fields.issue_date, riskLevel, cfg);

  let doctorCheck: 'verified' | 'not_found' | 'unknown' = 'unknown';
  if (cfg.requireSyndicateCheck && ocr.fields.doctor_syndicate_no) {
    const found = await raceTimeout(checkDoctorRegistry(ocr.fields.doctor_syndicate_no), DB_TIMEOUT_MS);
    doctorCheck = found === true ? 'verified' : found === false ? 'not_found' : 'unknown';
  }

  if (validity.status === 'expired') {
    await finalizeAutoReject(rxId, `انتهت صلاحية الروشتة (تاريخ الإصدار ${ocr.fields.issue_date}). يرجى الحصول على روشتة حديثة.`, ocr);
    return { kind: 'auto_rejected', prescriptionId: rxId, reason: 'expired' };
  }

  // ---- (4) فحص التكرار ----
  onProgress?.(3);
  const dataHash = await fingerprintData(ocr.fields, phone);
  const dup = (await raceTimeout(findDuplicate(imageHash, dataHash, rxId), DB_TIMEOUT_MS)) || null;

  // ---- تجميع التحذيرات وإنهاء المسار ----
  const warnings: string[] = [];
  if (!ocr.fields.issue_date) warnings.push('لم يتم التعرف على تاريخ الإصدار — يلزم تدقيق بشري');
  else if (validity.status === 'valid') warnings.push(`الروشتة صالحة (${validity.daysLeft} يوم متبقٍ)`);

  if (doctorCheck === 'not_found') warnings.push('رقم نقابة الطبيب غير موجود في سجل الأطباء المرخصين');
  if (!ocr.fields.doctor_syndicate_no) warnings.push('لم يتم التعرف على رقم نقابة الطبيب');
  if (riskLevel !== 'normal') warnings.push('الروشتة تحتوي دواءً مقيّداً — تتطلب مراجعة مشددة واستلاماً شخصياً بإثبات هوية');
  if (dup) warnings.push(`تحذير تكرار: تشابه مع روشتة سابقة${dup.reference_code ? ` (كود ${dup.reference_code})` : ''}`);

  const upd = await raceTimeout(
    supabase
      .from('prescriptions')
      .update({
        ocr_status: 'passed',
        ocr_data: { ...ocr.fields, flags: warnings, doctor_check: doctorCheck, confidence: ocr.confidence } satisfies RxOcrData,
        data_hash: dataHash,
        validity_status: validity.status,
        duplicate_status: dup ? 'suspected' : 'clear',
        duplicate_of: dup?.id || null,
        risk_level: riskLevel,
        delivery_mode: riskLevel === 'normal' ? 'delivery' : 'pickup_only',
        pipeline_status: 'needs_review',
      })
      .eq('id', rxId),
    DB_TIMEOUT_MS
  );
  if (!upd) throw new Error('انتهت مهلة حفظ نتيجة الفحص — تحقق من الاتصال ثم أعد المحاولة');
  if (upd.error) throw upd.error;

  await raceTimeout(
    Promise.allSettled([
      addAudit(rxId, 'system', 'auto_checks_passed', {
        confidence: ocr.confidence,
        risk_level: riskLevel,
        validity: validity.status,
        duplicate: dup ? dup.id : null,
        doctor_check: doctorCheck,
      }),
      insertNotification({
        customerId,
        type: 'prescription',
        title: 'تم استلام روشتتك',
        body: 'اجتازت روشتك الفحص الآلي الأولي وهي الآن تحت مراجعة صيدلي مرخص. سنخطرك فور الانتهاء.',
      }),
    ]),
    12_000
  );

  return { kind: 'needs_review', prescriptionId: rxId, fields: ocr.fields, riskLevel, warnings };
}

async function finalizeAutoReject(rxId: string, reason: string, ocr: { ok: boolean; confidence: number; fields: OcrFields }) {
  const { error } = await supabase
    .from('prescriptions')
    .update({
      ocr_status: ocr.ok ? 'passed' : 'failed',
      ocr_data: { ...ocr.fields, confidence: ocr.confidence } satisfies RxOcrData,
      pipeline_status: 'auto_rejected',
      rejection_reason: reason,
    })
    .eq('id', rxId);
  if (error) throw error;
  await addAudit(rxId, 'system', 'auto_rejected', { reason });
}

// ============================================================
// الخطوة 6 + 7: القرارات البشرية للصيدلي
// ============================================================

export async function approvePrescription(
  rx: Pick<Prescription, 'id' | 'customer_id'>,
  adminUserId: string | null,
  reviewNotes?: string
): Promise<string> {
  let referenceCode = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    referenceCode = generateReferenceCode();
    const { error } = await supabase
      .from('prescriptions')
      .update({
        pipeline_status: 'approved',
        reference_code: referenceCode,
        reviewed_by: adminUserId,
        reviewed_at: new Date().toISOString(),
        ...(reviewNotes?.trim() ? { review_notes: reviewNotes.trim() } : {}),
      })
      .eq('id', rx.id)
      .in('pipeline_status', ['needs_review', 'clarification_requested']);
    if (!error) break;
    if ((error as { code?: string }).code === '23505') continue; // تكرار الكود — جرّب كوداً آخر
    throw error;
  }

  await addAudit(rx.id, 'admin', 'approved', { reference_code: referenceCode });
  if (rx.customer_id) {
    try {
      await insertNotification({
        customerId: rx.customer_id,
        type: 'prescription',
        title: 'تم اعتماد روشتتك ✅',
        body: `اعتمد صيدلي مرخص روشتتك. الكود المرجعي: ${referenceCode}. يمكنك الآن إتمام طلبك.`,
      });
    } catch {
      // ignore
    }
  }
  return referenceCode;
}

export async function rejectPrescription(
  rx: Pick<Prescription, 'id' | 'customer_id'>,
  reason: string,
  adminUserId: string | null,
  reviewNotes?: string
): Promise<void> {
  const { error } = await supabase
    .from('prescriptions')
    .update({
      pipeline_status: 'rejected',
      rejection_reason: reason.trim(),
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
      ...(reviewNotes?.trim() ? { review_notes: reviewNotes.trim() } : {}),
    })
    .eq('id', rx.id);
  if (error) throw error;
  await addAudit(rx.id, 'admin', 'rejected', { reason: reason.trim() });
  if (rx.customer_id) {
    try {
      await insertNotification({
        customerId: rx.customer_id,
        type: 'prescription',
        title: 'بخصوص روشتتك',
        body: `لم يتم اعتماد الروشتة. السبب: ${reason.trim()}`,
      });
    } catch {
      // ignore
    }
  }
}

export async function requestClarification(
  rx: Pick<Prescription, 'id' | 'customer_id'>,
  message: string,
  adminUserId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('prescriptions')
    .update({
      pipeline_status: 'clarification_requested',
      review_notes: message.trim(),
      reviewed_by: adminUserId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', rx.id);
  if (error) throw error;
  await addAudit(rx.id, 'admin', 'clarification_requested', { message: message.trim() });
  if (rx.customer_id) {
    try {
      await insertNotification({
        customerId: rx.customer_id,
        type: 'prescription',
        title: 'نحتاج توضيحاً بخصوص روشتتك',
        body: message.trim(),
      });
    } catch {
      // ignore
    }
  }
}

// ============================================================
// الخطوة 8: التسليم والتحقق من الهوية (الرقم القومي المصري)
// ============================================================

/** أكواد المحافظات المصرية الرسمية في الرقم القومي (88 = مول خارج الجمهورية) */
const EGY_GOVERNORATE_CODES = new Set([
  '01', // القاهرة
  '02', // الإسكندرية
  '03', // بورسعيد
  '04', // السويس
  '11', // دمياط
  '12', // الدقهلية
  '13', // الشرقية
  '14', // القليوبية
  '15', // كفر الشيخ
  '16', // الغربية
  '17', // المنوفية
  '18', // البحيرة
  '19', // الإسماعيلية
  '21', // الجيزة
  '22', // بني سويف
  '23', // الفيوم
  '24', // المنيا
  '25', // أسيوط
  '26', // سوهاج
  '27', // قنا
  '28', // أسوان
  '29', // الأقصر
  '31', // البحر الأحمر
  '32', // الوادي الجديد
  '33', // مطروح
  '34', // شمال سيناء
  '35', // جنوب سيناء
  '88', // خارج الجمهورية
]);

export function validateNationalId(nid: string): { ok: boolean; reason?: string } {
  const v = nid.replace(/\D/g, '');
  if (v.length !== 14) return { ok: false, reason: 'الرقم القومي يجب أن يكون 14 رقماً' };
  if (!/^[23]/.test(v)) return { ok: false, reason: 'الرقم القومي غير صحيح (رقم القرن)' };
  const century = v[0] === '2' ? 1900 : 2000;
  const year = century + Number(v.slice(1, 3));
  const month = Number(v.slice(3, 5));
  const day = Number(v.slice(5, 7));
  const birth = new Date(year, month - 1, day);
  if (month < 1 || month > 12 || birth.getDate() !== day || birth.getMonth() !== month - 1) {
    return { ok: false, reason: 'تاريخ الميلاد داخل الرقم القومي غير صحيح' };
  }
  if (!EGY_GOVERNORATE_CODES.has(v.slice(7, 9))) {
    return { ok: false, reason: 'كود المحافظة داخل الرقم القومي غير صحيح' };
  }
  return { ok: true };
}

export async function recordDispense(
  rx: Pick<Prescription, 'id' | 'customer_id'>,
  params: {
    nationalId: string;
    deliveredBy: string;
    pharmacyId?: string | null;
  }
): Promise<{ ok: boolean; reason?: string }> {
  const check = validateNationalId(params.nationalId);
  if (!check.ok) return check;

  // إعادة التحقق من صلاحية الوصفة عند الصرف (بعد الاعتماد قد تنتهي مدتها)
  const { data: rxRow } = await supabase
    .from('prescriptions')
    .select('ocr_data, risk_level, status, pipeline_status')
    .eq('id', rx.id)
    .single();
  const rxData = rxRow as {
    ocr_data?: { issue_date?: string } | null;
    risk_level?: RiskLevel;
    pipeline_status?: string;
  } | null;
  if (rxData?.ocr_data?.issue_date) {
    const stillValid = checkValidity(rxData.ocr_data.issue_date, rxData.risk_level || 'normal', DEFAULT_VERIFICATION_CONFIG);
    if (stillValid.status === 'expired') {
      return { ok: false, reason: 'انتهت صلاحية الوصفة، يجب تجديدها قبل الصرف.' };
    }
  }

  const { error } = await supabase
    .from('prescriptions')
    .update({
      pipeline_status: 'dispensed',
      recipient_national_id: params.nationalId.replace(/\D/g, ''),
      identity_verified: true,
      delivered_by: params.deliveredBy.trim() || null,
      delivered_at: new Date().toISOString(),
      ...(params.pharmacyId ? { dispensed_pharmacy_id: params.pharmacyId } : {}),
    })
    .eq('id', rx.id)
    .eq('pipeline_status', 'approved'); // لا صرف إلا بعد الاعتماد
  if (error) throw error;

  await addAudit(rx.id, 'admin', 'dispensed_identity_verified', {
    national_id_masked: `••••••${params.nationalId.replace(/\D/g, '').slice(-4)}`,
    delivered_by: params.deliveredBy.trim(),
  });
  if (rx.customer_id) {
    try {
      await insertNotification({
        customerId: rx.customer_id,
        type: 'prescription',
        title: 'تم صرف الروشتة بنجاح',
        body: 'تم التحقق من هوية المستلم وتسليم الطلب. نتشرف بخدمتك دائماً.',
      });
    } catch {
      // ignore
    }
  }
  return { ok: true };
}

// ============================================================
// سجل نقابة الأطباء (إدارة الأدمن)
// ============================================================

export interface DoctorRecord {
  id: string;
  syndicate_no: string;
  doctor_name: string;
  specialty: string | null;
  is_active: boolean;
  created_at: string;
}

export async function fetchDoctors(): Promise<DoctorRecord[]> {
  const { data, error } = await supabase
    .from('doctor_registry')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as DoctorRecord[];
}

export async function saveDoctor(doc: {
  id?: string;
  syndicate_no: string;
  doctor_name: string;
  specialty?: string;
  is_active: boolean;
}): Promise<void> {
  const payload = {
    syndicate_no: doc.syndicate_no.trim(),
    doctor_name: doc.doctor_name.trim(),
    specialty: doc.specialty?.trim() || null,
    is_active: doc.is_active,
  };
  const { error } = doc.id
    ? await supabase.from('doctor_registry').update(payload).eq('id', doc.id)
    : await supabase.from('doctor_registry').insert(payload);
  if (error) throw error;
}

export async function deleteDoctor(id: string): Promise<void> {
  const { error } = await supabase.from('doctor_registry').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
// ربط الروشتة بالطلب (خطوة 7: ربط الطلب بالصيدلية)
// ============================================================

export async function listMyApprovedPrescriptions(customerId: string) {
  const { data, error } = await supabase
    .from('prescriptions')
    .select('id, reference_code, risk_level, delivery_mode, created_at')
    .eq('customer_id', customerId)
    .eq('pipeline_status', 'approved')
    .is('order_group_id', null)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function linkPrescriptionToOrderGroup(prescriptionId: string, orderGroupId: string, productIds?: string[]) {
  const { error } = await supabase.rpc('link_rx_to_order_group', {
    p_rx_id: prescriptionId,
    p_order_group_id: orderGroupId,
    p_product_ids: productIds || [],
  });
  if (error) throw error;
}
