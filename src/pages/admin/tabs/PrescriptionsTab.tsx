import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck, X, Phone, User, Clock, Send, Loader2,
  Plus, Trash2, Copy, Ban, BadgeCheck, Search as SearchIcon, Download,
  ClipboardList, CircleAlert, TriangleAlert, Fingerprint, Stethoscope,
  CreditCard, Banknote, Info, MessageCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { translateError } from '@/lib/errorMessages';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import { ORDER_STATUS_META, PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/orders';
import { PrivateImage } from '@/components/PrivateImage';
import {
  PIPELINE_STATUS_META, RISK_LEVEL_META, type Prescription, type PipelineStatus,
  deletePrescription, approvePrescription, rejectPrescription, requestClarification,
  recordDispense, validateNationalId, fetchAuditLog, fetchDoctors, saveDoctor, deleteDoctor,
} from '@/lib/prescriptions';
import { useToast, ConfirmModal } from './shared';

export function PrescriptionsTab() {
  const { settings } = useSettings();
  const { user } = useAuth();
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'queue' | 'doctors'>('queue');
  const [list, setList] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | PipelineStatus>('needs_review');
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<{ id: string; actor_type: string; action: string; details: Record<string, unknown> | null; created_at: string }[]>([]);

  const [busy, setBusy] = useState(false);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showClarifyBox, setShowClarifyBox] = useState(false);
  const [clarifyMsg, setClarifyMsg] = useState('برجاء توضيح اسم الدواء المطلوب واسم الطبيب ورقم النقابة وتاريخ الإصدار بشكل أوضح في صورة جديدة.');
  const [nid, setNid] = useState('');
  const [deliveredBy, setDeliveredBy] = useState('');
  const [nidError, setNidError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; data?: unknown } | null>(null);

  const showToast = (msg: string) => { toast(msg); };

  const fetchRx = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*, customer:customers(full_name, phone)')
      .order('created_at', { ascending: false });
    setList((data || []) as Prescription[]);
    if (error) showToast(translateError(error.message).ar);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRx();
  }, [fetchRx]);

  const selected = list.find((r) => r.id === selectedId) || null;

  interface LinkedOrderInfo {
    id: string;
    status: string | null;
    payment_status: string | null;
    payment_method: string | null;
    total_price: number | null;
    created_at: string;
  }
  const [linkedOrder, setLinkedOrder] = useState<LinkedOrderInfo | null | undefined>(undefined);

  const openDetail = async (rx: Prescription) => {
    setSelectedId(rx.id);
    setShowRejectBox(false);
    setShowClarifyBox(false);
    setRejectReason('');
    setNid('');
    setDeliveredBy('');
    setNidError(null);
    setLinkedOrder(undefined);
    try {
      const log = await fetchAuditLog(rx.id);
      setAuditLog(log as typeof auditLog);
    } catch {
      setAuditLog([]);
    }
    if (rx.order_group_id) {
      const { data } = await supabase
        .from('order_groups')
        .select('id, status, payment_status, payment_method, total_price, created_at')
        .eq('id', rx.order_group_id)
        .maybeSingle();
      setLinkedOrder((data as LinkedOrderInfo | null) ?? null);
    } else {
      setLinkedOrder(null);
    }
  };

  const pipelineOf = (rx: Prescription): PipelineStatus => (rx.pipeline_status || 'needs_review') as PipelineStatus;

  const counts = useCallback(
    (status: 'all' | PipelineStatus) => {
      if (status === 'all') return list.length;
      return list.filter((r) => pipelineOf(r) === status).length;
    },
    [list]
  );

  const filtered = useMemo(() => {
    let result = filter === 'all' ? list : list.filter((r) => pipelineOf(r) === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => {
        const name = (r.patient_name || r.customer?.full_name || '').toLowerCase();
        const phone = r.phone || '';
        const doctor = (r.ocr_data?.doctor_name || '').toLowerCase();
        const refCode = (r.reference_code || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || doctor.includes(q) || refCode.includes(q);
      });
    }
    return result;
  }, [list, filter, search]);

  const exportCSV = useCallback(() => {
    const headers = ['التاريخ', 'الحالة', 'الاسم', 'الهاتف', 'الدكتور', 'رقم النقابة', 'الكود المرجعي', 'الخطورة'];
    const rows = filtered.map((rx) => [
      new Date(rx.created_at).toLocaleDateString('ar-EG'),
      pipelineOf(rx),
      rx.patient_name || rx.customer?.full_name || '',
      rx.phone,
      rx.ocr_data?.doctor_name || '',
      rx.ocr_data?.doctor_syndicate_no || '',
      rx.reference_code || '',
      rx.risk_level || 'normal',
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescriptions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('تم تصدير البيانات بنجاح');
  }, [filtered, toast]);

  const handleApprove = async () => {
    if (!selected) return;
    setConfirmAction({ type: 'approve' });
    setBusy(true);
    try {
      const code = await approvePrescription(selected, user?.id || null);
      showToast(`تم الاعتماد ✅ الكود المرجعي: ${code}`);
      try {
        navigator.clipboard?.writeText(code);
      } catch {
        // تجاهل فشل النسخ
      }
      setSelectedId(null);
      fetchRx();
    } catch (err) {
      showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل الاعتماد');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (rejectReason.trim().length < 5) {
      showToast('اكتب سبب الرفض أولاً');
      return;
    }
    setBusy(true);
    try {
      await rejectPrescription(selected, rejectReason, user?.id || null);
      showToast('تم رفض الروشتة وإبلاغ العميل');
      setSelectedId(null);
      fetchRx();
    } catch (err) {
      showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل الرفض');
    } finally {
      setBusy(false);
    }
  };

  const handleClarify = async () => {
    if (!selected) return;
    if (clarifyMsg.trim().length < 5) {
      showToast('اكتب رسالة التوضيح أولاً');
      return;
    }
    setBusy(true);
    try {
      await requestClarification(selected, clarifyMsg, user?.id || null);
      showToast('تم إرسال طلب التوضيح للعميل');
      setSelectedId(null);
      fetchRx();
    } catch (err) {
      showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل إرسال الطلب');
    } finally {
      setBusy(false);
    }
  };

  const handleDispense = async () => {
    if (!selected) return;
    const check = validateNationalId(nid);
    if (!check.ok) {
      setNidError(check.reason || 'رقم قومي غير صحيح');
      return;
    }
    if (deliveredBy.trim().length < 3) {
      setNidError('اكتب اسم المندوب/الصيدلي المسلّم');
      return;
    }
    setBusy(true);
    try {
      const res = await recordDispense(selected, {
        nationalId: nid,
        deliveredBy,
        pharmacyId: null,
      });
      if (!res.ok) {
        setNidError(res.reason || null);
        return;
      }
      showToast('تم تسجيل الصرف مع التحقق من الهوية ✅');
      setSelectedId(null);
      fetchRx();
    } catch (err) {
      showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل تسجيل الصرف');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (rx: Prescription) => {
    setConfirmAction({ type: 'deleteRx', data: rx });
    try {
      await deletePrescription(rx.id, rx.image_url);
      showToast('تم حذف الروشتة');
      setSelectedId(null);
      fetchRx();
    } catch (err) {
      showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل الحذف');
    }
  };

  const fmtDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const rxFlags = (rx: Prescription): string[] => rx.ocr_data?.flags || [];

  const filterTabs: { id: 'all' | PipelineStatus; label: string }[] = [
    { id: 'needs_review', label: PIPELINE_STATUS_META.needs_review.label },
    { id: 'clarification_requested', label: PIPELINE_STATUS_META.clarification_requested.label },
    { id: 'pending_ocr', label: PIPELINE_STATUS_META.pending_ocr.label },
    { id: 'auto_rejected', label: PIPELINE_STATUS_META.auto_rejected.label },
    { id: 'approved', label: PIPELINE_STATUS_META.approved.label },
    { id: 'rejected', label: PIPELINE_STATUS_META.rejected.label },
    { id: 'dispensed', label: PIPELINE_STATUS_META.dispensed.label },
    { id: 'all', label: 'الكل' },
  ];

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            التحقق من الروشتات
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            خط أنابيب تحقق من 8 خطوات: فحص آلي ← صلاحية ← تكرار ← خطورة ← مراجعة بشرية ← كود مرجعي ← تسليم بهوية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center gap-1">
            <button
              onClick={() => setViewMode('queue')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${viewMode === 'queue' ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-slate-50'}`}
              style={viewMode === 'queue' ? { backgroundColor: settings.primary_color } : {}}
            >
              <ClipboardList className="w-3.5 h-3.5 inline-block align-middle me-1" />
              طابور المراجعة
            </button>
            <button
              onClick={() => setViewMode('doctors')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold transition-all ${viewMode === 'doctors' ? 'text-white shadow-sm' : 'text-gray-500 hover:bg-slate-50'}`}
              style={viewMode === 'doctors' ? { backgroundColor: settings.primary_color } : {}}
            >
              <Stethoscope className="w-3.5 h-3.5 inline-block align-middle me-1" />
              سجل نقابة الأطباء
            </button>
          </div>
          <button
            onClick={viewMode === 'queue' ? fetchRx : undefined}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Loader2 className={`w-3.5 h-3.5 ${loading && viewMode === 'queue' ? 'animate-spin' : ''}`} />
            تحديث
          </button>
        </div>
      </div>

      {viewMode === 'doctors' ? (
        <DoctorsRegistryView onToast={showToast} />
      ) : (
        <>
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الهاتف أو اسم الدكتور أو الكود المرجعي..."
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            {filtered.length > 0 && (
              <button
                onClick={exportCSV}
                className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-[10px] font-bold hover:bg-teal-100 transition-colors"
              >
                <Download className="w-3 h-3" />
                تصدير
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {filterTabs.map((ft) => {
              const isActive = filter === ft.id;
              const meta = ft.id !== 'all' ? PIPELINE_STATUS_META[ft.id] : null;
              return (
                <button
                  key={ft.id}
                  onClick={() => setFilter(ft.id)}
                  className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[11px] font-black transition-all whitespace-nowrap ${
                    isActive ? 'text-white shadow-sm' : 'text-gray-600 hover:bg-slate-50'
                  }`}
                  style={isActive ? { backgroundColor: settings.primary_color } : {}}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : meta?.dot || 'bg-gray-300'}`} />
                  {ft.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                    {counts(ft.id)}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-3xl h-72 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${settings.primary_color}12` }}>
                <ShieldCheck className="w-8 h-8" style={{ color: settings.primary_color }} />
              </div>
              <h3 className="font-black text-gray-900 text-base mb-1">لا توجد روشتات في هذا التصنيف</h3>
              <p className="text-sm text-gray-500">الروشتات الجديدة تمر أولاً بالفحص الآلي ثم تظهر هنا للمراجعة البشرية.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((rx) => {
                const ps = pipelineOf(rx);
                const meta = PIPELINE_STATUS_META[ps];
                const risk = rx.risk_level || 'normal';
                const isOpen = selectedId === rx.id;
                return (
                  <div key={rx.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col cursor-pointer" onClick={() => openDetail(rx)}>
                    <div className="h-44 bg-slate-900 relative flex items-center justify-center">
                      <PrivateImage bucket="prescriptions" src={rx.image_url} alt="روشتة" className={`max-h-44 w-auto object-contain transition-opacity ${isOpen ? 'opacity-100' : 'opacity-90'}`} />
                      <span className={`absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      {risk !== 'normal' && (
                        <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${RISK_LEVEL_META[risk].className}`}>
                          <TriangleAlert className="w-3 h-3" />
                          {RISK_LEVEL_META[risk].label}
                        </span>
                      )}
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold border border-white/20">
                        <Clock className="w-3 h-3" />
                        {fmtDate(rx.created_at)}
                      </span>
                      {rx.reference_code && (
                        <span className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-black" dir="ltr">
                          {rx.reference_code}
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-gray-900 flex items-center gap-1.5 truncate">
                          <User className="w-4 h-4 text-teal-600 shrink-0" />
                          {rx.patient_name || rx.customer?.full_name || 'عميل'}
                        </p>
                        <span className="text-[10px] text-gray-400 font-bold">#{rx.id.slice(0, 8)}</span>
                      </div>

                      <a href={`tel:${rx.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 text-xs text-gray-600 font-bold hover:text-teal-700 transition-colors" dir="ltr">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                        {rx.phone}
                      </a>

                      <div className="flex flex-wrap gap-1.5">
                        {rx.duplicate_status === 'suspected' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-[10px] font-extrabold">
                            <Ban className="w-3 h-3" /> تكرار مشتبه
                          </span>
                        )}
                        {rx.validity_status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-extrabold">منتهية الصلاحية</span>
                        )}
                        {rx.delivery_mode === 'pickup_only' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold">استلام شخصي فقط</span>
                        )}
                      </div>

                      {rx.rejection_reason && ps !== 'auto_rejected' && (
                        <p className="text-[11px] text-red-600 bg-red-50 rounded-xl p-2 leading-relaxed line-clamp-2">{rx.rejection_reason}</p>
                      )}

                      <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-bold">{meta.hint}</span>
                        <span className="text-[11px] font-extrabold" style={{ color: settings.primary_color }}>
                          عرض التفاصيل ←
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Detail Modal */}
          {selected && (() => {
            const ps = pipelineOf(selected);
            const meta = PIPELINE_STATUS_META[ps];
            const risk = selected.risk_level || 'normal';
            const canDecide = ps === 'needs_review' || ps === 'clarification_requested';
            const ocrFields = [
              { label: 'اسم الدواء', value: selected.ocr_data?.drug_name },
              { label: 'الجرعة', value: selected.ocr_data?.dosage },
              { label: 'اسم الطبيب', value: selected.ocr_data?.doctor_name },
              { label: 'رقم النقابة', value: selected.ocr_data?.doctor_syndicate_no },
              { label: 'تاريخ الإصدار', value: selected.ocr_data?.issue_date },
            ];
            const customerReply = selected.notes;
            return (
              <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedId(null)}>
                <div className="rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl bg-white flex flex-col" onClick={(e) => e.stopPropagation()}>
                  {/* Header */}
                  <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">{selected.patient_name || selected.customer?.full_name || 'عميل'}</p>
                        <p className="text-[11px] text-white/70">{fmtDate(selected.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${meta.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      {selected.reference_code && (
                        <button
                          onClick={() => {
                            try {
                              navigator.clipboard?.writeText(selected.reference_code!);
                              showToast('تم نسخ الكود المرجعي');
                            } catch {
                              // ignore
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-500/20 border border-teal-400/40 text-teal-200 text-[10px] font-black active:scale-95 transition-transform"
                          dir="ltr"
                        >
                          {selected.reference_code}
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="overflow-y-auto p-5 grid lg:grid-cols-2 gap-5 flex-1">
                    {/* Right column (image) */}
                    <div className="space-y-3">
                      <div className="rounded-2xl bg-slate-900 flex items-center justify-center min-h-[280px]">
                        <PrivateImage bucket="prescriptions" src={selected.image_url} alt="روشتة" className="max-h-[420px] w-auto object-contain" />
                      </div>
                      <a
                        href={buildWhatsAppLink(selected.phone, `مرحباً ${selected.patient_name || ''}، بخصوص روشتتك على منصة صيدليتي`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal-500 text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                      >
                        <Send className="w-3.5 h-3.5" />
                        تواصل واتساب مع العميل
                      </a>
                    </div>

                    {/* Left column (data) */}
                    <div className="space-y-4">
                      {customerReply && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
                          <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide mb-1">رد العميل / ملاحظات</p>
                          <p className="text-xs font-bold text-amber-900 leading-relaxed">{customerReply}</p>
                        </div>
                      )}
                      <div className="rounded-2xl border border-gray-200 p-3.5 space-y-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">بيانات الفحص الآلي (OCR)</p>
                        {ocrFields.map((row, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-500">{row.label}</span>
                            <span className={`font-extrabold ${row.value ? 'text-gray-800' : 'text-gray-300'}`} dir={i === 4 ? 'ltr' : undefined}>
                              {row.value || '— لم يُتعرف —'}
                            </span>
                          </div>
                        ))}
                        <div className="pt-1.5 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px] font-bold">
                          <span className="text-gray-500">درجة الخطورة:</span>
                          <span className={`justify-self-end px-2 py-0.5 rounded-full border ${RISK_LEVEL_META[risk].className}`}>{RISK_LEVEL_META[risk].label}</span>
                          <span className="text-gray-500">الصلاحية:</span>
                          <span className="text-gray-800">{selected.validity_status === 'valid' ? 'صالحة' : selected.validity_status === 'expired' ? 'منتهية' : selected.validity_status === 'invalid_date' ? 'تاريخ غير مقروء' : 'غير محددة'}</span>
                          <span className="text-gray-500">ترخيص الطبيب:</span>
                          <span className={selected.ocr_data?.doctor_check === 'verified' ? 'text-teal-600' : selected.ocr_data?.doctor_check === 'not_found' ? 'text-red-600' : 'text-gray-400'}>
                            {selected.ocr_data?.doctor_check === 'verified' ? 'موثق ✓' : selected.ocr_data?.doctor_check === 'not_found' ? 'غير موجود بالسجل' : 'لم يُفحص'}
                          </span>
                          <span className="text-gray-500">التكرار:</span>
                          <span className={selected.duplicate_status === 'suspected' ? 'text-red-600' : selected.duplicate_status === 'clear' ? 'text-teal-600' : 'text-gray-400'}>
                            {selected.duplicate_status === 'suspected' ? 'تشابه مكتشف ⚠' : selected.duplicate_status === 'clear' ? 'لا تشابه ✓' : 'غير مفحوصة'}
                          </span>
                          <span className="text-gray-500">طريقة التسليم:</span>
                          <span className="text-gray-800">{selected.delivery_mode === 'pickup_only' ? 'استلام شخصي بإثبات هوية' : 'توصيل عادي'}</span>
                        </div>
                      </div>

                      {rxFlags(selected).length > 0 && (
                        <div className="space-y-1.5">
                          {rxFlags(selected).map((f, i) => (
                            <div key={i} className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2">
                              <TriangleAlert className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                              <span className="text-[11px] font-bold text-amber-800 leading-relaxed">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {selected.notes && (
                        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3">
                          <p className="text-[10px] font-black text-gray-400 mb-1">ملاحظات العميل</p>
                          <p className="text-xs text-gray-700 leading-relaxed">{selected.notes}</p>
                        </div>
                      )}

                      {/* Audit trail */}
                      {auditLog.length > 0 && (
                        <div className="rounded-2xl border border-gray-200 p-3.5">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mb-2">سجل التدقيق</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {auditLog.map((a) => (
                              <div key={a.id} className="flex items-start gap-2 text-[11px]">
                                <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${a.actor_type === 'system' ? 'bg-blue-400' : a.actor_type === 'admin' ? 'bg-teal-500' : 'bg-gray-300'}`} />
                                <div className="min-w-0">
                                  <p className="font-extrabold text-gray-700">
                                    {a.action}
                                    <span className="text-gray-300 font-bold mx-1.5">•</span>
                                    <span className="font-bold text-gray-400">{fmtDate(a.created_at)}</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="border-t border-gray-100 p-4 space-y-3 shrink-0 bg-slate-50/60">
                    {canDecide && !showRejectBox && !showClarifyBox && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={handleApprove}
                          disabled={busy}
                          className="flex-1 min-w-[160px] py-2.5 rounded-xl bg-teal-600 text-white text-xs font-extrabold hover:bg-teal-700 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                          اعتماد وإصدار كود مرجعي
                        </button>
                        <button
                          onClick={() => setShowClarifyBox(true)}
                          disabled={busy}
                          className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-white border border-purple-200 text-purple-700 text-xs font-extrabold hover:bg-purple-50 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <MessageCircle className="w-4 h-4" />
                          طلب توضيح من العميل
                        </button>
                        <button
                          onClick={() => setShowRejectBox(true)}
                          disabled={busy}
                          className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-white border border-red-200 text-red-600 text-xs font-extrabold hover:bg-red-50 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Ban className="w-4 h-4" />
                          رفض نهائي
                        </button>
                      </div>
                    )}

                    {showRejectBox && (
                      <div className="space-y-2 animate-fade-in">
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows={2}
                          placeholder="سبب الرفض (سيصل للعميل بالإشعار)... مثال: الروشتة بدون ختم أو توقيع الطبيب"
                          className="w-full px-3 py-2.5 bg-white border border-red-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setShowRejectBox(false)} disabled={busy} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50">
                            إلغاء
                          </button>
                          <button onClick={handleReject} disabled={busy} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-xs font-extrabold hover:bg-red-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                            تأكيد الرفض النهائي
                          </button>
                        </div>
                      </div>
                    )}

                    {showClarifyBox && (
                      <div className="space-y-2 animate-fade-in">
                        <textarea
                          value={clarifyMsg}
                          onChange={(e) => setClarifyMsg(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2.5 bg-white border border-purple-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => setShowClarifyBox(false)} disabled={busy} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 bg-white hover:bg-gray-50">
                            إلغاء
                          </button>
                          <button onClick={handleClarify} disabled={busy} className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-extrabold hover:bg-purple-700 disabled:opacity-60 flex items-center justify-center gap-1.5">
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            إرسال طلب التوضيح
                          </button>
                        </div>
                      </div>
                    )}

                    {ps === 'approved' && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-extrabold text-gray-700 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                          الخطوة 8: تسجيل الصرف — تحقق من بطاقة الرقم القومي للمستلم وسجل رقمها:
                        </p>
                        {linkedOrder === null && (
                          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800 flex items-center gap-1.5">
                            <CircleAlert className="w-3.5 h-3.5 shrink-0" />
                            العميل لم يُنشئ طلباً بهذه الروشتة بعد — لا تُصرف قبل إتمام الشراء
                          </div>
                        )}
                        {linkedOrder && (() => {
                          const paid = linkedOrder.payment_status === 'paid';
                          const isCOD = linkedOrder.payment_method === 'cash_on_delivery';
                          const stMeta = ORDER_STATUS_META[(linkedOrder.status || 'pending') as keyof typeof ORDER_STATUS_META];
                          return (
                            <div className={`rounded-xl border px-3 py-2 text-[11px] font-bold space-y-1 ${paid ? 'border-teal-200 bg-teal-50 text-teal-800' : isCOD ? 'border-blue-200 bg-blue-50 text-blue-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                {paid ? (
                                  <span className="flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> مدفوع إلكترونياً ✓</span>
                                ) : isCOD ? (
                                  <span className="flex items-center gap-1"><Banknote className="w-3.5 h-3.5" /> الدفع عند الاستلام — استلم المبلغ مع التسليم</span>
                                ) : (
                                  <span className="flex items-center gap-1"><CircleAlert className="w-3.5 h-3.5" /> بانتظار تأكيد الدفع ({PAYMENT_METHOD_LABEL[(linkedOrder.payment_method || 'online') as PaymentMethod] || '—'})</span>
                                )}
                                <span className="opacity-60">•</span>
                                <span>{stMeta?.label || linkedOrder.status}</span>
                                {linkedOrder.total_price != null && (
                                  <>
                                    <span className="opacity-60">•</span>
                                    <span dir="ltr">{linkedOrder.total_price.toFixed(2)} EGP</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="grid sm:grid-cols-3 gap-2">
                          <input
                            value={nid}
                            onChange={(e) => {
                              setNid(e.target.value.replace(/\D/g, '').slice(0, 14));
                              setNidError(null);
                            }}
                            placeholder="الرقم القومي للمستلم (14 رقم)"
                            dir="ltr"
                            inputMode="numeric"
                            className="sm:col-span-2 px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-300 tracking-wider"
                          />
                          <input
                            value={deliveredBy}
                            onChange={(e) => setDeliveredBy(e.target.value)}
                            placeholder="اسم المندوب / الصيدلي"
                            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
                          />
                        </div>
                        {nidError && <p className="text-[11px] font-bold text-red-600 flex items-center gap-1"><CircleAlert className="w-3.5 h-3.5" />{nidError}</p>}
                        <button
                          onClick={handleDispense}
                          disabled={busy}
                          className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-xs font-extrabold hover:bg-teal-700 disabled:opacity-60 transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          تأكيد الصرف بعد التحقق من الهوية
                        </button>
                      </div>
                    )}

                    {ps === 'dispensed' && (
                      <div className="flex items-center gap-2 text-[11px] font-extrabold text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                        <BadgeCheck className="w-4 h-4" />
                        تم الصرف والتحقق من هوية المستلم ({fmtDate(selected.delivered_at)})
                        {selected.recipient_national_id && <span className="text-gray-400 font-bold">— بطاقة ••••••{selected.recipient_national_id.slice(-4)}</span>}
                      </div>
                    )}

                    {(ps === 'auto_rejected' || ps === 'rejected' || ps === 'pending_ocr') && !canDecide && (
                      <div className="flex items-center gap-2 text-[11px] font-extrabold text-gray-500 bg-white border border-gray-200 rounded-xl px-3 py-2.5">
                        <Info className="w-4 h-4 shrink-0" />
                        <span className="flex-1 leading-relaxed">
                          {meta.hint}
                          {selected.rejection_reason && <span className="text-gray-400 font-bold"> — {selected.rejection_reason}</span>}
                        </span>
                        {(ps === 'auto_rejected' || ps === 'rejected') && (
                          <button
                            onClick={() => handleDelete(selected)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center transition-colors shrink-0"
                            title="حذف نهائي"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      <ConfirmModal
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          const action = confirmAction;
          setConfirmAction(null);
          if (action.type === 'approve') {
            if (!selected) return;
            setBusy(true);
            try {
              const code = await approvePrescription(selected, user?.id || null);
              showToast(`تم الاعتماد ✅ الكود المرجعي: ${code}`);
              try { navigator.clipboard?.writeText(code); } catch { /* ignore */ }
              setSelectedId(null);
              fetchRx();
            } catch (err) {
              showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل الاعتماد');
            } finally { setBusy(false); }
          } else if (action.type === 'deleteRx') {
            const rx = action.data as Prescription;
            try {
              await deletePrescription(rx.id, rx.image_url);
              showToast('تم حذف الروشتة');
              setSelectedId(null);
              fetchRx();
            } catch (err) {
              showToast(translateError((err as { message?: string })?.message || '').ar || 'فشل الحذف');
            }
          }
        }}
        title={confirmAction?.type === 'approve' ? 'اعتماد الروشتة' : 'حذف الروشتة'}
        message={confirmAction?.type === 'approve' ? 'هل تريد اعتماد هذه الروشتة وإصدار كود مرجعي فريد؟' : 'هل أنت متأكد من حذف هذه الروشتة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.'}
        danger={confirmAction?.type !== 'approve'}
        confirmLabel={confirmAction?.type === 'approve' ? 'اعتماد' : 'حذف'}
      />
    </div>
  );
}

// ============================================
// Doctors Registry View — سجل نقابة الأطباء
// ============================================
function DoctorsRegistryView({ onToast }: { onToast: (msg: string) => void }) {
  const [docs, setDocs] = useState<{ id: string; syndicate_no: string; doctor_name: string; specialty: string | null; is_active: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syndicateNo, setSyndicateNo] = useState('');
  const [docName, setDocName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [deleteDocTarget, setDeleteDocTarget] = useState<typeof docs[number] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await fetchDoctors());
    } catch (err) {
      onToast(translateError((err as { message?: string })?.message || '').ar || 'تعذر تحميل السجل');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    if (syndicateNo.trim().length < 3 || docName.trim().length < 3) {
      onToast('أدخل رقم نقابة صحيح واسم الطبيب');
      return;
    }
    setBusy(true);
    try {
      await saveDoctor({ syndicate_no: syndicateNo, doctor_name: docName, specialty, is_active: true });
      setSyndicateNo('');
      setDocName('');
      setSpecialty('');
      onToast('تمت إضافة الطبيب لسجل النقابة');
      load();
    } catch (err) {
      const msg = (err as { message?: string })?.message || '';
      onToast(msg.includes('duplicate') ? 'رقم النقابة مسجل بالفعل' : 'فشل الإضافة');
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (doc: typeof docs[number]) => {
    try {
      await saveDoctor({ id: doc.id, syndicate_no: doc.syndicate_no, doctor_name: doc.doctor_name, specialty: doc.specialty || undefined, is_active: !doc.is_active });
      load();
    } catch {
      onToast('فشل التحديث');
    }
  };

  const handleDeleteDoc = (doc: typeof docs[number]) => {
    setDeleteDocTarget(doc);
  };

  const confirmDeleteDoc = async () => {
    if (!deleteDocTarget) return;
    try {
      await deleteDoctor(deleteDocTarget.id);
      onToast('تم الحذف');
      load();
    } catch {
      onToast('فشل الحذف');
    }
    setDeleteDocTarget(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-gray-700">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          إضافة طبيب مرخص للسجل — يتحقق النظام منه آلياً عند رفع أي روشتة (الخطوة 3)
        </div>
        <div className="grid sm:grid-cols-4 gap-2">
          <input
            value={syndicateNo}
            onChange={(e) => setSyndicateNo(e.target.value)}
            placeholder="رقم النقابة"
            dir="ltr"
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <input
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="اسم الطبيب"
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <input
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            placeholder="التخصص (اختياري)"
            className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <button
            onClick={handleAdd}
            disabled={busy}
            className="py-2.5 rounded-xl bg-teal-600 text-white text-xs font-extrabold hover:bg-teal-700 disabled:opacity-60 flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            إضافة للسجل
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
          <Fingerprint className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <h3 className="font-black text-gray-900 mb-1">السجل فاضي</h3>
          <p className="text-sm text-gray-500">ضيف أرقام نقابة الأطباء المرخصين — لو الرقم مش موجود هيتعلّم روشته بمراجعة بشرية مشددة.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{doc.doctor_name}{doc.specialty ? <span className="text-gray-400 font-bold"> — {doc.specialty}</span> : null}</p>
                <p className="text-[11px] text-gray-500 font-bold" dir="ltr">#{doc.syndicate_no}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(doc)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition-all active:scale-95 ${doc.is_active ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                >
                  {doc.is_active ? 'نشط' : 'موقوف'}
                </button>
                <button onClick={() => handleDeleteDoc(doc)} className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmModal
        open={!!deleteDocTarget}
        onClose={() => setDeleteDocTarget(null)}
        onConfirm={confirmDeleteDoc}
        title="حذف الدكتور"
        message={`هل أنت متأكد من حذف الدكتور ${deleteDocTarget?.doctor_name || ''} من السجل؟ لا يمكن التراجع عن هذا الإجراء.`}
        danger
        confirmLabel="حذف"
      />
    </div>
  );
}
