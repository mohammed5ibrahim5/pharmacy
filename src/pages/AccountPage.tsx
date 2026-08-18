import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  PackageCheck,
  FileText,
  MapPin,
  Heart,
  Phone,
  User,
  Sparkles,
  ShieldCheck,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Send,
  Store,
  Pill,
  Camera,
  Search,
  LogOut,
  Navigation,
  Tag,
  Info,
  Loader2,
  Wallet,
  Bell,
  Star,
  Users,
  Pencil,
  Save,
  Baby,
  X,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomer } from '@/context/CustomerContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useOrder } from '@/context/OrderContext';
import { useLanguage } from '@/context/LanguageContext';
import type { AccountTab } from '@/context/RouterContext';
import type { Pharmacy, Product, LoyaltyTransaction, MedicationReminder, FamilyMember } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { PharmacyCard } from '@/components/PharmacyCard';
import { OrderReviewModal } from '@/components/OrderReviewModal';
import { PrivateImage } from '@/components/PrivateImage';
import { localizedError } from '@/lib/errorMessages';
import { localizedDate } from '@/lib/format';
import { buildWhatsAppLink } from '@/lib/whatsapp';
import {
  PRESCRIPTION_STATUS_META,
  type Prescription,
  uploadPrescriptionImage,
  insertPrescription,
  deletePrescription,
} from '@/lib/prescriptions';
import {
  fetchLoyaltyBalance,
  fetchLoyaltyHistory,
  requestNotificationPermission,
  loadLocalReminders,
  saveLocalReminders,
  medicationRunOutInfo,
  computeRefillDate,
} from '@/lib/loyalty';

interface OrderRecord {
  id: string;
  product_id: string;
  pharmacy_id: string;
  quantity: number;
  total_price: number;
  address: string | null;
  note: string | null;
  status: string;
  payment_method: string | null;
  payment_number: string | null;
  payment_screenshot_url: string | null;
  created_at: string;
  family_member_id: string | null;
  product?: Product;
  pharmacy?: Pharmacy;
  family_member?: FamilyMember;
}

interface AddressRecord {
  id: string;
  title: string;
  address: string;
  phone?: string;
}

const ADDRESSES_KEY = 'pharmacy_addresses';

const STATUS_META: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  pending: {
    label: 'قيد المعالجة',
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: 'تم تأكيد الدفع',
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/25',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  shipped: {
    label: 'تم الشحن - في الطريق',
    className: 'bg-violet-500/10 text-violet-500 border-violet-500/25',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  delivered: {
    label: 'تم التسليم',
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'ملغي',
    className: 'bg-rose-500/10 text-rose-500 border-rose-500/25',
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T[];
  } catch {
    // fallback
  }
  return [];
}

function saveList<T>(key: string, list: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}

const ORDER_TRACK_STEPS = [
  { key: 'pending', label: 'قيد المراجعة', icon: <Clock className="w-3.5 h-3.5" /> },
  { key: 'confirmed', label: 'تم التأكيد', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  { key: 'shipped', label: 'في الطريق', icon: <Truck className="w-3.5 h-3.5" /> },
  { key: 'delivered', label: 'تم التسليم', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

function OrderProgressTracker({ status, color }: { status: string; color: string }) {
  const { t } = useLanguage();
  if (status === 'cancelled') {
    return (
      <div className="mt-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 flex items-center gap-2.5">
        <XCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
        <p className="text-xs font-bold text-rose-500">{t('تم إلغاء هذا الطلب')}</p>
      </div>
    );
  }
  const currentIdx = ORDER_TRACK_STEPS.findIndex((s) => s.key === status);
  const current = currentIdx === -1 ? 0 : currentIdx;
  return (
    <div className="mt-5 relative">
      <div className="flex items-center justify-between">
        {ORDER_TRACK_STEPS.map((step, i) => {
          const done = i <= current;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5 shrink-0 z-10 relative">
                <span
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center border-2 transition-all duration-300 ${
                    done ? 'text-white border-transparent shadow-lg scale-105' : 'bg-slate-50 text-slate-400 border-slate-200'
                  }`}
                  style={done ? { backgroundColor: color, boxShadow: `0 8px 16px ${color}30` } : {}}
                >
                  {done ? <CheckCircle2 className="w-4.5 h-4.5" /> : step.icon}
                </span>
                <span className={`text-[10px] font-black ${done ? 'text-slate-900' : 'text-slate-400'}`}>{t(step.label)}</span>
              </div>
              {i < ORDER_TRACK_STEPS.length - 1 && (
                <div className="flex-1 h-1 mx-3 rounded-full bg-slate-100 overflow-hidden relative">
                  <div 
                    className="h-full rounded-full transition-all duration-700" 
                    style={{ 
                      width: i < current ? '100%' : '0%', 
                      backgroundColor: color 
                    }} 
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderTrackingModal({ order, onClose }: { order: OrderRecord; onClose: () => void }) {
  const { t, lang } = useLanguage();
  const { themeColors } = useSettings();
  const [status, setStatus] = useState(order.status);
  const [updatedAt, setUpdatedAt] = useState(order.created_at);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status, updated_at')
        .eq('id', order.id)
        .maybeSingle();
      if (!cancelled && data) {
        setStatus(data.status);
        if (data.updated_at) setUpdatedAt(data.updated_at);
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [order.id]);

  const currentIdx = ORDER_TRACK_STEPS.findIndex((s) => s.key === status);
  const current = currentIdx === -1 ? 0 : currentIdx;
  const cancelled = status === 'cancelled';

  const liveMessages: Record<string, string> = {
    pending: t('طلبك قيد المراجعة، سنؤكد الدفع خلال دقائق.'),
    confirmed: t('تم تأكيد الدفع، نجهز طلبك الآن.'),
    shipped: t('السائق في الطريق إليك الآن، استعد لاستلام طلبك.'),
    delivered: t('تم تسليم طلبك بنجاح. شكراً لثقتك بنا!'),
  };

  const progress = Math.min(100, Math.round((current / (ORDER_TRACK_STEPS.length - 1)) * 100));

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-[2.5rem] sm:rounded-3xl p-6 sm:p-7 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
              <Navigation className="w-5.5 h-5.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">{t('تتبع الطلب')}</h3>
              <p className="text-xs text-slate-400 font-bold">{t('تحديث مباشر كل 5 ثوانٍ')}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Live progress bar */}
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-1.5">
          <div
            className={`h-full rounded-full transition-all duration-700 ${cancelled ? 'bg-rose-400' : ''}`}
            style={!cancelled ? { width: `${progress}%`, backgroundColor: themeColors.primaryColor } : { width: '100%' }}
          />
        </div>
        <p className={`text-xs font-black mb-5 ${cancelled ? 'text-rose-500' : 'text-slate-500'}`}>
          {cancelled ? t('تم إلغاء هذا الطلب') : t('حالة الطلب الحالية: {0}', [t(ORDER_TRACK_STEPS[current].label)])}
        </p>

        {!cancelled && (
          <div className="mb-5 rounded-2xl p-4 flex items-start gap-3.5 animate-pulse-soft" style={{ backgroundColor: `${themeColors.primaryColor}0c` }}>
            <span className="flex items-center justify-center relative flex w-3.5 h-3.5 mt-1 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: themeColors.primaryColor }} />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5" style={{ backgroundColor: themeColors.primaryColor }} />
            </span>
            <p className="text-xs font-extrabold text-slate-800 leading-relaxed">{liveMessages[status] || liveMessages.pending}</p>
          </div>
        )}

        {/* Steps timeline */}
        <div className="space-y-2 mb-6">
          {ORDER_TRACK_STEPS.map((step, i) => {
            const done = !cancelled && i <= current;
            return (
              <div key={step.key} className="flex items-center gap-3.5 py-2.5 px-3 rounded-2xl transition-colors hover:bg-slate-50">
                <span
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 shrink-0 transition-all ${
                    done ? 'text-white border-transparent shadow-md' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                  style={done ? { backgroundColor: themeColors.primaryColor } : {}}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-black ${done ? 'text-slate-900' : 'text-slate-400'}`}>{t(step.label)}</p>
                  <p className={`text-xs font-bold ${done ? 'text-slate-500' : 'text-slate-300'}`}>
                    {i === current && !cancelled
                      ? t('الحالة الحالية')
                      : i < current
                        ? t('تم')
                        : t('قادم')}
                  </p>
                </div>
                {done && <CheckCircle2 className="w-4.5 h-4.5" style={{ color: themeColors.primaryColor }} />}
              </div>
            );
          })}
        </div>

        {/* Order details */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4.5 space-y-2.5 text-xs font-bold text-slate-600">
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('المنتج')}</span>
            <span className="font-black text-slate-800 text-end">{lang === 'en' ? (order.product?.name_en || order.product?.name || '') : order.product?.name || t('منتج')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('الصيدلية')}</span>
            <span className="font-black text-slate-800 text-end">{lang === 'en' ? (order.pharmacy?.name_en || order.pharmacy?.name || '') : order.pharmacy?.name || t('صيدلية')}</span>
          </div>
          {order.family_member && (
            <div className="flex justify-between gap-3">
              <span className="text-slate-400">{t('الطلب لأجل')}</span>
              <span className="font-black text-slate-800 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                {order.family_member.name}
              </span>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('العنوان')}</span>
            <span className="font-black text-slate-800 text-end">{order.address || t('غير محدد')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('الإجمالي')}</span>
            <span className="font-black text-slate-900" style={{ color: themeColors.primaryColor }}>{Number(order.total_price).toFixed(2)} {t('ج.م')}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-slate-400">{t('آخر تحديث')}</span>
            <span className="font-black text-slate-800">{localizedDate(updatedAt, lang, { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {order.pharmacy?.phone && (
          <a
            href={`tel:${order.pharmacy.phone}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-white text-sm font-black shadow-lg hover:brightness-110 active:scale-[0.98] transition-all"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            <Phone className="w-4.5 h-4.5" />
            {t('تواصل مع الصيدلية')}
          </a>
        )}
      </div>
    </div>
  );
}

export function AccountPage({ tab }: { tab: AccountTab }) {
  const { user, profile, setAuthModalOpen, signOut } = useCustomer();
  const { settings, themeColors, loyaltyConfig, featuresConfig } = useSettings();
  const { navigate } = useRouter();
  const { openOrder } = useOrder();
  const { t, lang } = useLanguage();
  const {
    favoriteProducts,
    favoritePharmacies,
    productFavoritesCount,
    pharmacyFavoritesCount,
  } = useFavorites();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<OrderRecord | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<OrderRecord | null>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxUploading, setRxUploading] = useState(false);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [favPharmacies, setFavPharmacies] = useState<Pharmacy[]>([]);
  const [favLoading, setFavLoading] = useState(false);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [loyaltyHistory, setLoyaltyHistory] = useState<LoyaltyTransaction[]>([]);

  // Medication reminder state
  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [remName, setRemName] = useState('');
  const [remDose, setRemDose] = useState('');
  const [remTime, setRemTime] = useState('09:00');
  const [remDays, setRemDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [remNote, setRemNote] = useState('');
  const [remDaysSupply, setRemDaysSupply] = useState('');
  const [permDenied, setPermDenied] = useState(false);
  
  const WEEKDAYS = [
    { n: 0, label: 'أحد', short: 'أ' },
    { n: 1, label: 'اثنين', short: 'إ' },
    { n: 2, label: 'ثلاثاء', short: 'ث' },
    { n: 3, label: 'أربعاء', short: 'ر' },
    { n: 4, label: 'خميس', short: 'خ' },
    { n: 5, label: 'جمعة', short: 'ج' },
    { n: 6, label: 'سبت', short: 'س' },
  ];

  const saveReminders = (next: MedicationReminder[]) => {
    setReminders(next);
    saveLocalReminders(next);
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remName.trim()) {
      showToast(t('يرجى إدخال اسم الدواء.'));
      return;
    }
    const granted = await requestNotificationPermission();
    if (!granted) {
      setPermDenied(true);
      showToast(t('قم بتفعيل إشعارات المتصفح لتذكير المواعيد'));
      return;
    }
    const rec: MedicationReminder = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: remName.trim(),
      dosage: remDose.trim(),
      time: remTime,
      days: remDays,
      note: remNote.trim(),
      refillDate: remDaysSupply.trim() ? computeRefillDate(Number(remDaysSupply.trim())) : null,
      created_at: new Date().toISOString(),
    };
    saveReminders([...reminders, rec]);
    setRemName('');
    setRemDose('');
    setRemNote('');
    setRemDaysSupply('');
    showToast(t('تمت إضافة الدواء إلى ملفك الدوائي بنجاح'));
  };

  const handleRemoveReminder = (id: string) => {
    saveReminders(reminders.filter((r) => r.id !== id));
    showToast(t('تم حذف التذكير'));
  };

  const toggleReminderDay = (n: number) => {
    setRemDays((prev) => (prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n].sort()));
  };

  // Address form state
  const [addrTitle, setAddrTitle] = useState('');
  const [addrText, setAddrText] = useState('');
  const [addrPhone, setAddrPhone] = useState(profile?.phone || '');

  // Prescription form state
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [rxPhone, setRxPhone] = useState(profile?.phone || '');
  const [rxNotes, setRxNotes] = useState('');

  // Family members state
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [familyLoading, setFamilyLoading] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [famForm, setFamForm] = useState({ name: '', relation: '', age: '', weight: '' });

  const fetchFamilyMembers = useCallback(async () => {
    if (!user || !featuresConfig.familyMembers) return;
    setFamilyLoading(true);
    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at');
    if (!error) setFamilyMembers((data || []) as FamilyMember[]);
    setFamilyLoading(false);
  }, [user, featuresConfig.familyMembers]);

  useEffect(() => {
    fetchFamilyMembers();
  }, [fetchFamilyMembers]);

  const handleFamilySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !famForm.name.trim()) {
      showToast(t('يرجى إدخال اسم العضو'));
      return;
    }
    setFamilySaving(true);
    const payload = {
      customer_id: user.id,
      name: famForm.name.trim(),
      relation: famForm.relation.trim() || null,
      age: famForm.age.trim() ? Number(famForm.age.trim()) : null,
      weight: famForm.weight.trim() ? Number(famForm.weight.trim()) : null,
      updated_at: new Date().toISOString(),
    };
    if (editingMember) {
      const { error } = await supabase.from('family_members').update(payload).eq('id', editingMember.id);
      if (error) showToast(localizedError(error.message, lang));
    } else {
      const { error } = await supabase.from('family_members').insert(payload);
      if (error) showToast(localizedError(error.message, lang));
    }
    setFamilySaving(false);
    setEditingMember(null);
    setFamForm({ name: '', relation: '', age: '', weight: '' });
    fetchFamilyMembers();
  };

  const handleFamilyDelete = async (id: string) => {
    if (!confirm(t('هل أنت متأكد من حذف هذا العضو؟'))) return;
    const { error } = await supabase.from('family_members').delete().eq('id', id);
    if (error) showToast(localizedError(error.message, lang));
    fetchFamilyMembers();
  };

  const startEditMember = (m: FamilyMember) => {
    setEditingMember(m);
    setFamForm({ name: m.name, relation: m.relation || '', age: m.age?.toString() || '', weight: m.weight?.toString() || '' });
  };

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const fetchPrescriptions = useCallback(async () => {
    if (!user) return;
    setRxLoading(true);
    const { data, error } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setPrescriptions((data || []) as Prescription[]);
    if (error) showToast(localizedError(error.message, lang));
    setRxLoading(false);
  }, [user, lang]);

  useEffect(() => {
    setAddresses(loadList<AddressRecord>(ADDRESSES_KEY));
    setAddrPhone(profile?.phone || '');
    setRxPhone(profile?.phone || '');
  }, [profile?.phone]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const loadLoyalty = async () => {
      const [balance, history] = await Promise.all([
        fetchLoyaltyBalance(user.id),
        fetchLoyaltyHistory(user.id),
      ]);
      if (!cancelled) {
        setLoyaltyPoints(balance);
        setLoyaltyHistory(history);
      }
    };
    loadLoyalty();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    setReminders(loadLocalReminders());
    if (typeof Notification !== 'undefined') {
      setPermDenied(Notification.permission === 'denied');
    }
  }, []);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setOrdersLoading(true);
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, product:products(*), pharmacy:pharmacies(*)')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (!cancelled) {
        let rows = (data || []) as OrderRecord[];
        if (error) {
          showToast(localizedError(error.message, lang));
        } else if (featuresConfig.familyMembers) {
          const ids = Array.from(new Set(rows.map((o) => o.family_member_id).filter((v): v is string => !!v)));
          if (ids.length > 0) {
            const { data: members } = await supabase
              .from('family_members')
              .select('*')
              .in('id', ids);
            const map = new Map((members || []).map((m: FamilyMember) => [m.id, m]));
            rows = rows.map((o) => (o.family_member_id && map.get(o.family_member_id) ? { ...o, family_member: map.get(o.family_member_id) } : o));
          }
        }
        setOrders(rows);
        setOrdersLoading(false);
      }
    };
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [user, lang, featuresConfig.familyMembers]);

  const activeOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'shipped').length,
    [orders]
  );

  const favoritesKey = useMemo(
    () => `${favoriteProducts.join(',')}|${favoritePharmacies.join(',')}`,
    [favoriteProducts, favoritePharmacies]
  );

  useEffect(() => {
    let cancelled = false;
    const fetchFavorites = async () => {
      setFavLoading(true);
      const [prodRes, pharmRes] = await Promise.all([
        favoriteProducts.length > 0
          ? supabase
              .from('products')
              .select('*, pharmacy:pharmacies(*), category:categories(*), discounts(*)')
              .in('id', favoriteProducts)
          : Promise.resolve({ data: null }),
        favoritePharmacies.length > 0
          ? supabase.from('pharmacies').select('*').in('id', favoritePharmacies)
          : Promise.resolve({ data: null }),
      ]);
      if (!cancelled) {
        setFavProducts((prodRes.data || []) as Product[]);
        setFavPharmacies((pharmRes.data || []) as Pharmacy[]);
        setFavLoading(false);
      }
    };
    fetchFavorites();
    return () => {
      cancelled = true;
    };
  }, [favoritesKey, favoriteProducts, favoritePharmacies]);

  const handleRxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rxImage) {
      showToast(t('يرجى اختيار صورة الروشتة أو تصويرها بالكامل.'));
      return;
    }
    if (!rxPhone.trim()) {
      showToast(t('يرجى إدخال رقم الهاتف للتواصل وحجز الروشتة.'));
      return;
    }
    setRxUploading(true);
    try {
      const imageUrl = await uploadPrescriptionImage(rxImage, user?.id);
      await insertPrescription({
        customerId: user?.id || null,
        imageUrl,
        phone: rxPhone.trim(),
        notes: rxNotes.trim(),
      });
      await fetchPrescriptions();
      setRxImage(null);
      setRxNotes('');
      showToast(t('تم حفظ وإرسال الروشتة للصيدلية بنجاح'));
      if (settings.contact_whatsapp) {
        const text = t('مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: {0}\nالملاحظات: {1}', [rxPhone, rxNotes || t('لا يوجد')]);
        window.open(buildWhatsAppLink(settings.contact_whatsapp, text), '_blank');
      }
    } catch {
      showToast(t('فشل رفع الروشتة، برجاء المحاولة مرة أخرى'));
    } finally {
      setRxUploading(false);
    }
  };

  const saveAddresses = (next: AddressRecord[]) => {
    setAddresses(next);
    saveList(ADDRESSES_KEY, next);
  };

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrTitle.trim() || !addrText.trim()) {
      showToast(t('يرجى إدخال اسم العنوان وتفاصيله.'));
      return;
    }
    const rec: AddressRecord = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      title: addrTitle.trim(),
      address: addrText.trim(),
      phone: addrPhone.trim() || undefined,
    };
    saveAddresses([rec, ...addresses]);
    setAddrTitle('');
    setAddrText('');
    showToast(t('تم حفظ العنوان بنجاح'));
  };

  const handleDeleteAddress = (id: string) => {
    saveAddresses(addresses.filter((a) => a.id !== id));
  };

  const handleDeletePrescription = async (rx: Prescription) => {
    try {
      await deletePrescription(rx.id, rx.image_url);
      await fetchPrescriptions();
      showToast(t('تم حذف الروشتة'));
    } catch {
      showToast(t('فشل حذف الروشتة'));
    }
  };

  const handleResendPrescription = (rx: Prescription) => {
    if (!settings.contact_whatsapp) return;
    const text = t('مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: {0}\nالملاحظات: {1}', [rx.phone, rx.notes || t('لا يوجد')]);
    window.open(buildWhatsAppLink(settings.contact_whatsapp, text), '_blank');
  };

  const handleRxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRxImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ============ Not logged in ============
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 animate-fade-up">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden">
          <div
            className="absolute top-0 right-0 left-0 h-2"
            style={{ backgroundImage: `linear-gradient(to left, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
          />
          <div
            className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-lg bg-teal-500/10 text-teal-600"
          >
            <User className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 mb-3">{t('مرحباً بك في صيدليتي')}</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed font-medium">
            {t('سجل دخولك الآن لتتمكن من متابعة طلباتك اليومية، وإدارة الروشتات، وملفك الطبي، ونقاط المكافآت المفضلة من مكان واحد بسهولة وأمان.')}
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black shadow-lg hover:shadow-xl hover:brightness-105 active:scale-95 transition-all duration-300"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            {t('تسجيل الدخول / إنشاء حساب')}
          </button>
        </div>
      </div>
    );
  }

  const initial = (profile?.full_name || user.email || t('عميل')).charAt(0).toUpperCase();

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'orders', label: t('طلباتي والشحنات'), icon: <PackageCheck className="w-4 h-4" />, count: activeOrdersCount },
    { id: 'prescriptions', label: t('الروشتات المحفوظة'), icon: <FileText className="w-4 h-4" />, count: prescriptions.length },
    ...(loyaltyConfig.enabled ? [{ id: 'rewards' as AccountTab, label: t('نقاطي ومكافآتي'), icon: <Sparkles className="w-4 h-4" />, count: loyaltyPoints }] : []),
    ...(featuresConfig.reminders ? [{ id: 'reminders' as AccountTab, label: t('ملفي الطبي والدوائي'), icon: <Bell className="w-4 h-4" />, count: reminders.length }] : []),
    ...(featuresConfig.familyMembers ? [{ id: 'family' as AccountTab, label: t('أفراد العائلة'), icon: <Users className="w-4 h-4" />, count: familyMembers.length }] : []),
    { id: 'addresses', label: t('العناوين المسجلة'), icon: <MapPin className="w-4 h-4" />, count: addresses.length },
    { id: 'favorites', label: t('مفضلتي'), icon: <Heart className="w-4 h-4" />, count: productFavoritesCount + pharmacyFavoritesCount },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-2xl animate-bounce-in flex items-center gap-2 border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          {toast}
        </div>
      )}

      {/* ===== Hero / Profile Header ===== */}
      <div
        className="relative rounded-[2.5rem] text-white overflow-hidden shadow-xl border border-white/10 mb-8"
        style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
      >
        {/* Glow orbs background decoration */}
        <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
        <div className="absolute -bottom-16 -start-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -end-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 end-1/4 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        {/* Top actions */}
        <div className="relative flex items-center justify-between gap-3 p-5 sm:p-7 pb-2 sm:pb-3">
          <button
            onClick={() => navigate({ name: 'home' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white/90 hover:text-white text-xs font-extrabold transition-all duration-300 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('العودة للرئيسية')}
          </button>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-black transition-all duration-300 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {t('تسجيل الخروج')}
          </button>
        </div>

        {/* Profile info */}
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 px-5 sm:px-8 pb-6 sm:pb-8">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt=""
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] object-cover border-[3px] border-white/20 shadow-xl ring-4 ring-white/10"
            />
          ) : (
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.75rem] bg-white/15 backdrop-blur-md flex items-center justify-center text-3xl sm:text-4xl font-black border border-white/20 shadow-xl ring-4 ring-white/10 text-white">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{profile?.full_name || t('عميل صيدليتي')}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-400/20 backdrop-blur-md border border-emerald-300/30 text-[10px] font-black text-emerald-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                {t('حساب موثق')}
              </span>
            </div>
            <p className="text-xs text-white/75 font-bold mt-1.5" dir="ltr">{user.email}</p>

            {loyaltyConfig.enabled && (
              <button
                onClick={() => navigate({ name: 'account', tab: 'rewards' as AccountTab }, { scrollToTop: false })}
                className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-400/20 hover:bg-amber-400/30 backdrop-blur-md border border-amber-300/30 text-xs font-black text-amber-100 cursor-pointer transition-all duration-300 active:scale-95"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                {t('المكافآت: {0} نقطة', [loyaltyPoints])}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== Quick Stats Grid (Aesthetic Glows & Hover Lift) ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: <PackageCheck className="w-6 h-6" />, value: `${orders.length}`, label: t('إجمالي الطلبات'), color: themeColors.primaryColor },
          { icon: <Truck className="w-6 h-6" />, value: `${activeOrdersCount}`, label: t('طلبات نشطة ومتابعة'), color: themeColors.secondaryColor },
          { icon: <FileText className="w-6 h-6" />, value: `${prescriptions.length}`, label: t('روشتات محفوظة'), color: themeColors.accentColor },
          { icon: <Heart className="w-6 h-6" />, value: `${productFavoritesCount + pharmacyFavoritesCount}`, label: t('العناصر المفضلة'), color: '#ec4899' },
        ].map((stat, i) => (
          <div 
            key={i} 
            className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group cursor-default"
          >
            <div
              className="absolute -top-8 -end-8 w-24 h-24 rounded-full opacity-10 pointer-events-none transition-opacity duration-300 group-hover:opacity-20"
              style={{ backgroundColor: stat.color }}
            />
            <div
              className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
              style={{ backgroundColor: `${stat.color}10`, color: stat.color, border: `1px solid ${stat.color}20` }}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 leading-none tabular-nums">{stat.value}</p>
              <p className="text-xs text-slate-500 font-bold mt-1.5 leading-snug">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Modern Layout: Tabs Sidebar (Desktop) / Carousel Slider (Mobile) ===== */}
      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-4 shadow-sm hidden lg:block">
            <p className="text-[11px] font-black text-slate-400 px-3 pb-3 uppercase tracking-wider">{t('قائمة التحكم')}</p>
            <div className="space-y-1.5">
              {tabs.map((t) => {
                const isActive = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => navigate({ name: 'account', tab: t.id }, { scrollToTop: false })}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-xs font-black transition-all duration-300 group ${
                      isActive ? 'text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                    style={isActive ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 8px 20px -6px ${themeColors.primaryColor}55` } : {}}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
                        isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                      }`}
                    >
                      {t.icon}
                    </span>
                    <span className="truncate flex-1 text-start">{t.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-colors ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Horizontal slider for mobile */}
          <div className="lg:hidden p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm mb-2 overflow-x-auto scrollbar-none flex items-center gap-1.5">
            {tabs.map((t) => {
              const isActive = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => navigate({ name: 'account', tab: t.id }, { scrollToTop: false })}
                  className={`shrink-0 flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-300 ${
                    isActive ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                  style={isActive ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 6px 14px -4px ${themeColors.primaryColor}55` } : {}}
                >
                  {t.icon}
                  <span className="whitespace-nowrap">{t.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Main Area */}
        <div className="lg:col-span-3 min-w-0">
          
          {/* ===== Orders tab ===== */}
          {tab === 'orders' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <PackageCheck className="w-5.5 h-5.5 text-teal-600" />
                  {t('طلباتي والشحنات')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} طلب مسجل', [orders.length])}</span>
              </div>

              {ordersLoading ? (
                <div className="grid gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-100 border border-slate-200 rounded-3xl h-36 skeleton" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                  <div
                    className="w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-5 bg-teal-500/10 text-teal-600"
                  >
                    <PackageCheck className="w-10 h-10" />
                  </div>
                  <h3 className="font-black text-slate-900 text-lg mb-1.5">{t('سجل الطلبات فارغ')}</h3>
                  <p className="text-sm font-medium text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">{t('ابدأ بطلب أدويتك ومنتجات العناية بالبشرة والطفل لتتمكن من تتبع شحنتك لاحقاً.')}</p>
                  <button
                    onClick={() => navigate({ name: 'home' })}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white text-sm font-black shadow-md hover:scale-102 active:scale-95 transition-all"
                    style={{ backgroundColor: themeColors.primaryColor }}
                  >
                    <Search className="w-4 h-4" />
                    {t('تصفح الصيدليات المتاحة')}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const meta = STATUS_META[order.status] || STATUS_META.pending;
                    const product = order.product;
                    return (
                      <div 
                        key={order.id} 
                        className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row gap-5">
                          {/* Image product wrapper */}
                          <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2 relative">
                            {product?.image_url ? (
                              <img src={product.image_url} alt="" className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                              <Pill className="w-8 h-8 text-slate-300" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-black text-base text-slate-900 truncate leading-snug">{lang === 'en' ? (product?.name_en || product?.name || '') : product?.name || t('منتج')}</p>
                                <p className="text-xs text-slate-400 font-bold mt-1 flex items-center gap-1">
                                  <Store className="w-3.5 h-3.5 text-teal-600" />
                                  {lang === 'en' ? (order.pharmacy?.name_en || order.pharmacy?.name || '') : order.pharmacy?.name || t('صيدلية')}
                                </p>
                              </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black border shadow-2xs ${meta.className}`}>
                                {meta.icon}
                                {t(meta.label)}
                              </span>
                            </div>

                            {featuresConfig.orderTracking && <OrderProgressTracker status={order.status} color={themeColors.primaryColor} />}

                            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-[11px] font-bold text-slate-400 border-t border-slate-100/60 pt-3">
                              <span className="flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5" />
                                {t('الكمية:')}&nbsp;<strong className="text-slate-800 tabular-nums">{order.quantity}</strong>
                              </span>
                              <span className="flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="truncate text-slate-700 max-w-[200px]">{order.address || t('عنوان غير محدد')}</span>
                              </span>
                              {order.payment_method && (
                                <span className="flex items-center gap-1.5">
                                  <Wallet className="w-3.5 h-3.5" />
                                  {t('طريقة الدفع:')}&nbsp;
                                  <strong className="text-slate-800">
                                    {order.payment_method === 'instapay' ? t('انستا باي') : order.payment_method === 'vodafone_cash' ? t('فودافون كاش') : order.payment_method}
                                  </strong>
                                </span>
                              )}
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                {localizedDate(order.created_at, lang, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            {order.note && (
                              <div className="mt-2.5 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-medium text-slate-500 flex items-start gap-1.5 leading-relaxed">
                                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: themeColors.primaryColor }} />
                                <span>{order.note}</span>
                              </div>
                            )}
                          </div>

                          <div className="sm:ms-auto flex sm:flex-col sm:items-end items-center gap-4 justify-between shrink-0 border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                            <div className="sm:text-end">
                              <p className="text-2xl font-black text-slate-900 leading-none tabular-nums" style={{ color: themeColors.primaryColor }}>
                                {Number(order.total_price).toFixed(2)}
                              </p>
                              <p className="text-[10px] font-black text-slate-400 mt-1">{t('ج.م شامل الضريبة')}</p>
                            </div>
                            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                              {featuresConfig.orderTracking && (
                                <button
                                  onClick={() => setTrackingOrder(order)}
                                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black border shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
                                  style={{ borderColor: `${themeColors.primaryColor}50`, color: themeColors.primaryColor }}
                                >
                                  <Navigation className="w-3.5 h-3.5" />
                                  {t('تتبع الشحنة')}
                                </button>
                              )}
                              {order.status === 'delivered' && (
                                <button
                                  onClick={() => setReviewOrder(order)}
                                  className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all text-white bg-amber-500"
                                >
                                  <Star className="w-3.5 h-3.5 fill-white" />
                                  {t('تقييم الطلب')}
                                </button>
                              )}
                              {product && (
                                <button
                                  onClick={() => openOrder(product, order.pharmacy?.name)}
                                  className="px-4.5 py-2.5 rounded-xl text-white text-xs font-black shadow-md hover:brightness-110 active:scale-95 transition-all"
                                  style={{ backgroundColor: themeColors.primaryColor }}
                                >
                                  {t('اطلب مجدداً')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== Prescriptions tab ===== */}
          {tab === 'prescriptions' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5.5 h-5.5 text-teal-600" />
                  {t('الروشتات الطبية المحفوظة')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} روشتة', [prescriptions.length])}</span>
              </div>

              {/* Add Prescription form */}
              <form
                onSubmit={handleRxSubmit}
                className="bg-white rounded-[2rem] border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4 relative overflow-hidden"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-none">{t('حفظ وإرسال روشتة جديدة')}</h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-1">{t('ارفع صورة الروشتة وسنقوم بتوصيل الأدوية فوراً')}</p>
                  </div>
                </div>

                {rxImage ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 max-h-64 bg-slate-950 flex items-center justify-center border-teal-500">
                    <img src={rxImage} alt={t('روشتة')} className="max-h-64 w-auto object-contain mx-auto" />
                    <button
                      type="button"
                      onClick={() => setRxImage(null)}
                      className="absolute top-3 end-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl bg-slate-50/50 hover:bg-teal-50/20 transition-all cursor-pointer group text-center space-y-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md bg-white border border-slate-100 text-teal-600"
                    >
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{t('اضغط هنا لالتقاط أو رفع صورة الروشتة')}</p>
                      <p className="text-[11px] text-slate-400 font-bold mt-1">{t('يدعم صيغ الصور JPG, PNG حتى حجم 5 ميجابايت')}</p>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleRxImageUpload} />
                  </label>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <Phone className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={rxPhone}
                      onChange={(e) => setRxPhone(e.target.value)}
                      placeholder={t('رقم الهاتف للتأكيد والتواصل')}
                      dir="ltr"
                      className="w-full ps-10 pe-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:bg-white"
                      style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                    />
                  </div>
                  <input
                    type="text"
                    value={rxNotes}
                    onChange={(e) => setRxNotes(e.target.value)}
                    placeholder={t('ملاحظات للصيدلي (نوع الجرعة، بدائل مقبولة)')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:bg-white"
                    style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={rxUploading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white text-sm font-black shadow-md hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
                  style={{ backgroundColor: themeColors.primaryColor }}
                >
                  {rxUploading ? (
                    <>
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                      {t('جاري رفع وتأمين الروشتة...')}
                    </>
                  ) : (
                    <>
                      <Send className="w-4.5 h-4.5" />
                      {t('حفظ الروشتة وإرسالها للصيدلي')}
                    </>
                  )}
                </button>
              </form>

              {/* Prescription list */}
              {rxLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-slate-100 rounded-3xl h-64 skeleton" />
                  ))}
                </div>
              ) : prescriptions.length === 0 ? (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-500/10 text-teal-600">
                    <FileText className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-slate-900 text-base mb-1.5">{t('لا توجد روشتات محفوظة')}</h3>
                  <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">{t('قم برفع الروشتة الطبية الخاصة بك للاحتفاظ بنسخة رقمية مشفرة منها للتأمين وسهولة تكرار الطلب.')}</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prescriptions.map((rx) => {
                    const meta = PRESCRIPTION_STATUS_META[rx.status] || PRESCRIPTION_STATUS_META.new;
                    return (
                      <div key={rx.id} className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between">
                        <div>
                          <div className="h-40 bg-slate-950 relative flex items-center justify-center overflow-hidden">
                            <PrivateImage bucket="prescriptions" src={rx.image_url} alt={t('روشتة')} className="max-h-full w-auto object-contain transition-transform duration-500 group-hover:scale-105" />
                            <span className="absolute top-3.5 start-3.5 flex items-center gap-1 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-white text-[10px] font-black border border-white/10">
                              <Clock className="w-3 h-3" />
                              {localizedDate(rx.created_at, lang, { month: 'short', day: 'numeric' })}
                            </span>
                            <span className={`absolute bottom-3.5 end-3.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black border ${meta.className}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                              {t(meta.label)}
                            </span>
                          </div>
                          <div className="p-4.5 space-y-2">
                            <p className="text-xs text-slate-500 flex items-center gap-1.5 font-bold">
                              <Phone className="w-4 h-4 text-teal-600" />
                              <span dir="ltr">{rx.phone}</span>
                            </p>
                            {rx.notes && (
                              <p className="text-xs text-slate-600 font-bold line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-xl">{rx.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="p-4.5 pt-0 flex items-center gap-2">
                          <button
                            onClick={() => handleResendPrescription(rx)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-black transition-colors hover:brightness-110 shadow-sm"
                            style={{ backgroundColor: themeColors.primaryColor }}
                          >
                            <Send className="w-3.5 h-3.5" />
                            {t('إرسال واتساب')}
                          </button>
                          <button
                            onClick={() => handleDeletePrescription(rx)}
                            className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0"
                            title={t('حذف الروشتة')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== Rewards tab ===== */}
          {tab === 'rewards' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5.5 h-5.5 text-amber-500" />
                  {t('نقاطي ومكافآتي')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} نقطة صالحة للاستخدام', [loyaltyPoints])}</span>
              </div>

              {/* Balance Hero (Redesigned like a premium card) */}
              <div
                className="rounded-[2.5rem] text-white relative overflow-hidden p-6 sm:p-8 shadow-xl border border-white/10"
                style={{ background: `linear-gradient(135deg, ${themeColors.accentColor}, #d97706)` }}
              >
                <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
                <div className="absolute -bottom-16 -start-16 w-56 h-56 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                <div className="absolute -top-16 -end-16 w-56 h-56 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
                  <div
                    className="w-16 h-16 rounded-[1.5rem] bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg"
                  >
                    <Sparkles className="w-8 h-8 text-amber-200 animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-amber-100 uppercase tracking-wider mb-1">{t('رصيد نقاط المكافآت الحالي')}</p>
                    <p className="text-4xl font-black leading-none tabular-nums">{loyaltyPoints}</p>
                    <p className="text-xs font-bold text-amber-100/90 mt-2 leading-relaxed">
                      {t('تبقت لك {0} نقطة إضافية للوصول للحد الأدنى وتطبيق خصم مباشر بقيمة {1} ج.م على طلبك القادم.', [Math.max(0, loyaltyConfig.redeemThreshold - loyaltyPoints), loyaltyConfig.redeemValue])}
                    </p>
                  </div>
                  <div className="sm:ms-auto bg-white/15 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/20 text-center shrink-0">
                    <p className="text-[10px] font-black text-amber-100/90 uppercase tracking-wider mb-1">{t('التحويل المباشر')}</p>
                    <p className="text-xl font-black">{t('1 نقطة لكل {0} ج.م', [loyaltyConfig.pointsPerPound])}</p>
                  </div>
                </div>
              </div>

              {/* How to earn */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
                    <PackageCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t('{0} نقاط مع كل أوردر', [loyaltyConfig.pointsPerOrder])}</p>
                    <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">{t('تضاف تلقائياً بعد تأكيد واستلام الشحنة')}</p>
                  </div>
                </div>
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 flex items-center gap-4 shadow-sm">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{t('استبدال {0} نقطة = {1} ج.م خصم', [loyaltyConfig.redeemThreshold, loyaltyConfig.redeemValue])}</p>
                    <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">{t('اختر تطبيق الخصم بضغطة زر عند الدفع')}</p>
                  </div>
                </div>
              </div>

              {/* History */}
              <div>
                <h3 className="text-base font-black text-slate-955 mb-3.5 flex items-center gap-1.5">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  {t('سجل حركات النقاط والمكافآت')}
                </h3>
                {loyaltyHistory.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                    <Sparkles className="w-12 h-12 mx-auto text-amber-300 mb-4" />
                    <h4 className="font-black text-slate-900 text-base mb-1">{t('سجل المكافآت فارغ')}</h4>
                    <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">{t('أكمل طلبك الأول عبر الموقع وسوف تبدأ بالحصول على نقاط ترحيبية مكافأة لك.')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loyaltyHistory.map((tx) => (
                      <div key={tx.id} className="bg-white rounded-2xl border border-slate-200/80 p-4.5 flex items-center justify-between gap-4 shadow-2xs hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.points > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'
                            }`}
                          >
                            <Sparkles className="w-4.5 h-4.5" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 leading-snug">{tx.reason}</p>
                            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                              {localizedDate(tx.created_at, lang, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className={`text-base font-black tabular-nums ${tx.points > 0 ? 'text-amber-600' : 'text-rose-500'}`}>
                          {tx.points > 0 ? `+${tx.points}` : tx.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Reminders (Medical File) tab ===== */}
          {tab === 'reminders' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Bell className="w-5.5 h-5.5 text-teal-600" />
                  {t('ملفي الطبي وجدول الأدوية')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} دواء مسجل', [reminders.length])}</span>
              </div>

              {permDenied && (
                <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4.5 flex items-start gap-3">
                  <Bell className="w-5.5 h-5.5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs font-bold text-amber-800 leading-relaxed">
                    <p className="font-black">{t('تنبيه: الإشعارات معطلة')}</p>
                    <p className="mt-1 font-medium">{t('يرجى تفعيل صلاحية الإشعارات من إعدادات المتصفح لكي نتمكن من تنبيهك بمواعيد جرعات الدواء وتذكيرك بقرب نفاد العلبة.')}</p>
                  </div>
                </div>
              )}

              {/* Add medication form */}
              <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm p-5 sm:p-6">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-none">{t('إضافة دواء لجدول التذكيرات')}</h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-1">{t('سجل مواعيد الجرعات لتذكيرك بها تلقائياً')}</p>
                  </div>
                </div>
                <form onSubmit={handleAddReminder} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('اسم الدواء والمواصفات *')}</label>
                      <input
                        value={remName}
                        onChange={(e) => setRemName(e.target.value)}
                        placeholder={t('مثال: كونكور 5 ملغ')}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('الجرعة وطريقة أخذها (اختياري)')}</label>
                      <input
                        value={remDose}
                        onChange={(e) => setRemDose(e.target.value)}
                        placeholder={t('مثال: نصف قرص صباحاً')}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('توقيت المنبه الأول *')}</label>
                      <input
                        type="time"
                        value={remTime}
                        onChange={(e) => setRemTime(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('أيام الأسبوع')}</label>
                      <div className="flex flex-wrap gap-1">
                        {WEEKDAYS.map((d) => {
                          const active = remDays.includes(d.n);
                          return (
                            <button
                              type="button"
                              key={d.n}
                              onClick={() => toggleReminderDay(d.n)}
                              className={`w-7 h-7 rounded-xl text-[10px] font-black border transition-all active:scale-90 ${
                                active
                                  ? 'text-white border-transparent'
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                              }`}
                              style={active ? { backgroundColor: themeColors.primaryColor } : {}}
                            >
                              {t(d.short)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('كم يوماً تكفي العبوة الحالية؟')}</label>
                      <input
                        type="number"
                        min="1"
                        value={remDaysSupply}
                        onChange={(e) => setRemDaysSupply(e.target.value)}
                        placeholder={t('مثال: 30')}
                        dir="ltr"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 mb-1.5 block">{t('إرشادات وتنبيهات الاستخدام (اختياري)')}</label>
                    <input
                      value={remNote}
                      onChange={(e) => setRemNote(e.target.value)}
                      placeholder={t('مثال: يؤخذ قبل الوجبات بـ 30 دقيقة')}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-3 rounded-2xl text-white text-xs font-black flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all"
                    style={{ backgroundColor: themeColors.primaryColor }}
                  >
                    <Bell className="w-4 h-4" />
                    {t('حفظ في الملف الدوائي')}
                  </button>
                </form>
              </div>

              {/* Medication list */}
              <div>
                <h3 className="text-base font-black text-slate-900 mb-3.5">{t('الأدوية الدورية والجدول')}</h3>
                {reminders.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm">
                    <Bell className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                    <h4 className="font-black text-slate-900 text-base mb-1.5">{t('جدول التنبيهات خالي')}</h4>
                    <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">{t('قم بإضافة أدويتك اليومية للحفاظ على صحتك وسيقوم صيدليتي بتذكيرك بجرعتك بانتظام وبقرب نفاد علبة الدواء.')}</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[...reminders]
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((r) => {
                        const dayNames = WEEKDAYS.filter((d) => r.days.includes(d.n)).map((d) => d.short);
                        const isToday = r.days.includes(new Date().getDay());
                        const runOut = medicationRunOutInfo(r);
                        return (
                          <div key={r.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group">
                            <div className="flex items-start gap-3.5">
                              <div
                                className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-teal-500/10 text-teal-600"
                              >
                                <Pill className="w-5.5 h-5.5" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-sm font-black text-slate-900 truncate">{r.name}</p>
                                  {isToday && (
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-500/10 text-blue-600">{t('اليوم')}</span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {t('التوقيت:')} <strong className="text-slate-800 leading-none">{r.time}</strong>
                                </p>
                                {r.dosage && (
                                  <p className="text-xs font-bold text-slate-500 mt-1">{t('الجرعة:')} <span className="text-slate-700">{r.dosage}</span></p>
                                )}
                                {r.note && (
                                  <p className="text-[11px] text-slate-400 font-medium mt-1 leading-relaxed italic bg-slate-50 p-1.5 rounded-lg">"{r.note}"</p>
                                )}

                                <div className="flex flex-wrap gap-1 mt-2.5">
                                  {dayNames.map((s, i) => (
                                    <span
                                      key={i}
                                      className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-slate-100 text-slate-500"
                                    >
                                      {t(s)}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100/80 pt-3 mt-4 flex items-center justify-between">
                              <div>
                                {runOut.status === 'out' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-500/10 text-rose-600">
                                    <XCircle className="w-3.5 h-3.5" />
                                    {t('انتهى المخزون')}
                                  </span>
                                )}
                                {runOut.status === 'soon' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-amber-500/10 text-amber-600 animate-pulse">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    {t('ينفد خلال {0} يوم', [runOut.daysLeft!])}
                                  </span>
                                )}
                                {runOut.status === 'ok' && runOut.daysLeft != null && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/10 text-emerald-600">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    {t('متبقي {0} يوم', [runOut.daysLeft])}
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => handleRemoveReminder(r.id)}
                                className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors active:scale-95 shrink-0"
                                title={t('حذف التذكير')}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Family members tab ===== */}
          {tab === 'family' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5.5 h-5.5 text-teal-600" />
                  {t('ملفات أفراد العائلة')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} فرد مسجل', [familyMembers.length])}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-bold -mt-2">
                {t('أضف كبار السن، الأطفال أو زوجتك لتتمكن من إنشاء ملفات طبية لهم ومتابعة طلباتهم وصرف أدويتهم بشكل أسهل ومنفصل.')}
              </p>

              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <form onSubmit={handleFamilySave} className="bg-white rounded-[2rem] border border-slate-200/80 p-5 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                      {editingMember ? <Pencil className="w-4.5 h-4.5" /> : <Users className="w-4.5 h-4.5" />}
                    </div>
                    <h3 className="font-black text-slate-900 text-sm">{editingMember ? t('تعديل الملف العائلي') : t('إضافة فرد جديد')}</h3>
                  </div>
                  <input
                    type="text"
                    value={famForm.name}
                    onChange={(e) => setFamForm({ ...famForm, name: e.target.value })}
                    placeholder={t('اسم العضو بالكامل')}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                    style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={famForm.relation}
                      onChange={(e) => setFamForm({ ...famForm, relation: e.target.value })}
                      className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
                    >
                      <option value="">{t('العلاقة')}</option>
                      <option value="son">{t('ابن')}</option>
                      <option value="daughter">{t('ابنة')}</option>
                      <option value="father">{t('الأب')}</option>
                      <option value="mother">{t('الأم')}</option>
                      <option value="spouse">{t('زوج/زوجة')}</option>
                      <option value="other">{t('أخرى')}</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={famForm.age}
                      onChange={(e) => setFamForm({ ...famForm, age: e.target.value })}
                      placeholder={t('العمر')}
                      className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
                      dir="ltr"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={famForm.weight}
                      onChange={(e) => setFamForm({ ...famForm, weight: e.target.value })}
                      placeholder={t('الوزن (كجم)')}
                      className="w-full px-2 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={familySaving}
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white text-xs font-black disabled:opacity-50 transition-all active:scale-95 shadow-sm"
                      style={{ backgroundColor: themeColors.primaryColor }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {familySaving ? t('جاري الحفظ...') : editingMember ? t('حفظ التعديل') : t('إضافة الفرد')}
                    </button>
                    {editingMember && (
                      <button
                        type="button"
                        onClick={() => { setEditingMember(null); setFamForm({ name: '', relation: '', age: '', weight: '' }); }}
                        className="px-4 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-500 hover:bg-slate-50"
                      >
                        {t('إلغاء')}
                      </button>
                    )}
                  </div>
                </form>

                <div className="space-y-3">
                  {familyLoading && (
                    <div className="flex items-center justify-center py-10 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                  {!familyLoading && familyMembers.length === 0 && (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-200/80 p-6 text-center text-xs font-bold text-slate-400">
                      {t('لم تقم بإضافة أي من أفراد العائلة بعد.')}
                    </div>
                  )}
                  {familyMembers.map((m) => (
                    <div key={m.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4.5 flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600 shrink-0">
                        <Baby className="w-5.5 h-5.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">{m.name}</p>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                          {m.relation ? t(m.relation) : t('أخرى')}
                          {m.age != null && ` • ${t('{0} سنة', [m.age])}`}
                          {m.weight != null && ` • ${m.weight} ${t('كجم')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => startEditMember(m)} className="w-8.5 h-8.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center transition-colors" title={t('تعديل')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleFamilyDelete(m.id)} className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title={t('حذف')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== Addresses tab ===== */}
          {tab === 'addresses' && (
            <div className="space-y-5 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5.5 h-5.5 text-teal-600" />
                  {t('عناوين التوصيل المسجلة')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">{t('{0} عنوان مسجل', [addresses.length])}</span>
              </div>

              <div className="grid lg:grid-cols-2 gap-5 items-start">
                <form onSubmit={handleAddAddress} className="bg-white rounded-[2rem] border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600"
                    >
                      <MapPin className="w-5 h-5" />
                    </div>
                    <h3 className="font-black text-slate-900 text-sm">{t('حفظ عنوان توصيل جديد')}</h3>
                  </div>

                  <input
                    type="text"
                    value={addrTitle}
                    onChange={(e) => setAddrTitle(e.target.value)}
                    placeholder={t('اسم العنوان (مثال: المنزل، العمل)')}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                    style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                  />
                  <textarea
                    value={addrText}
                    onChange={(e) => setAddrText(e.target.value)}
                    rows={2}
                    placeholder={t('العنوان بالتفصيل (المنطقة، الشارع، الطابق، الشقة)')}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100 resize-none"
                    style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                  />
                  <input
                    type="tel"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    placeholder={t('رقم الهاتف للتواصل عند التوصيل (اختياري)')}
                    dir="ltr"
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100"
                    style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                  />

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-xs font-black shadow-md hover:brightness-105 active:scale-95 transition-all"
                    style={{ backgroundColor: themeColors.primaryColor }}
                  >
                    <Plus className="w-4 h-4" />
                    {t('حفظ العنوان')}
                  </button>
                </form>

                {/* Address list */}
                <div className="space-y-3">
                  {addresses.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-500/10 text-teal-600"
                      >
                        <MapPin className="w-8 h-8" />
                      </div>
                      <h3 className="font-black text-slate-900 text-base mb-1.5">{t('لا توجد عناوين محفوظة')}</h3>
                      <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">{t('قم بحفظ العناوين الأكثر استخداماً لسرعة إتمام طلب الأدوية مستقبلاً.')}</p>
                    </div>
                  ) : (
                    addresses.map((addr) => (
                      <div key={addr.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-start gap-3.5 relative hover:shadow-md transition-shadow group">
                        <div
                          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600"
                        >
                          <Navigation className="w-5.5 h-5.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-950 text-sm leading-none">{addr.title}</h4>
                            {addr.phone && (
                              <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{addr.phone}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">{addr.address}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0 active:scale-95"
                          title={t('حذف العنوان')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ===== Favorites tab ===== */}
          {tab === 'favorites' && (
            <div className="space-y-6 animate-fade-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/60">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Heart className="w-5.5 h-5.5 text-pink-500" />
                  {t('المفضلة والمحفوظات')}
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-500">
                  {t('{0} دواء · {1} صيدلية', [productFavoritesCount, pharmacyFavoritesCount])}
                </span>
              </div>

              {/* Favorite products */}
              <section className="space-y-3.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600"
                  >
                    <Pill className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{t('الأدوية المفضلة')}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-black">
                    {productFavoritesCount}
                  </span>
                </div>

                {favLoading ? (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-slate-100 rounded-3xl h-64 skeleton" />
                    ))}
                  </div>
                ) : favProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm">
                    <Heart className="w-12 h-12 mx-auto text-pink-400 mb-3.5" />
                    <h4 className="font-black text-slate-900 text-base mb-1">{t('لا توجد أدوية في المفضلة')}</h4>
                    <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">
                      {t('اضغط على علامة القلب ♥ بجانب أي منتج من منتجات الأدوية والصحة ليظهر هنا.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    {favProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        pharmacyName={lang === 'en' ? (product.pharmacy?.name_en || product.pharmacy?.name || '') : product.pharmacy?.name || ''}
                        onClick={product.for_all_pharmacies ? undefined : () => product.pharmacy_id && navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Favorite pharmacies */}
              <section className="space-y-3.5 pt-6 border-t border-slate-200/60">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-500/10 text-teal-600"
                  >
                    <Store className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-black text-slate-900 text-sm">{t('الصيدليات المفضلة')}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 text-[10px] font-black">
                    {pharmacyFavoritesCount}
                  </span>
                </div>

                {favLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="bg-slate-100 rounded-3xl h-72 skeleton" />
                    ))}
                  </div>
                ) : favPharmacies.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center shadow-sm">
                    <Store className="w-12 h-12 mx-auto text-slate-300 mb-3.5" />
                    <h4 className="font-black text-slate-900 text-base mb-1">{t('لا توجد صيدليات مفضلة')}</h4>
                    <p className="text-xs text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                      {t('اختر صيدليتك المفضلة وسجلها بالضغط على زر القلب لتتمكن من التصفح السريع للأدوية والخصومات.')}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {favPharmacies.map((pharmacy) => (
                      <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>

      {reviewOrder && (
        <OrderReviewModal
          orderId={reviewOrder.id}
          pharmacyId={reviewOrder.pharmacy_id}
          pharmacyName={reviewOrder.pharmacy?.name || ''}
          productName={reviewOrder.product?.name || ''}
          onClose={() => setReviewOrder(null)}
          onSubmitted={() => setReviewOrder(null)}
        />
      )}
      {trackingOrder && (
        <OrderTrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />
      )}
    </div>
  );
}
