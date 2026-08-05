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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCustomer } from '@/context/CustomerContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useOrder } from '@/context/OrderContext';
import type { AccountTab } from '@/context/RouterContext';
import type { Pharmacy, Product } from '@/types';
import { ProductCard } from '@/components/ProductCard';
import { PharmacyCard } from '@/components/PharmacyCard';
import { translateError } from '@/lib/errorMessages';
import {
  PRESCRIPTION_STATUS_META,
  type Prescription,
  uploadPrescriptionImage,
  insertPrescription,
  deletePrescription,
} from '@/lib/prescriptions';

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
  product?: Product;
  pharmacy?: Pharmacy;
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
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  confirmed: {
    label: 'تم تأكيد الدفع',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  shipped: {
    label: 'تم الشحن - في الطريق',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
    icon: <Truck className="w-3.5 h-3.5" />,
  },
  delivered: {
    label: 'تم التسليم',
    className: 'bg-teal-50 text-teal-700 border-teal-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  cancelled: {
    label: 'ملغي',
    className: 'bg-red-50 text-red-600 border-red-200',
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

export function AccountPage({ tab }: { tab: AccountTab }) {
  const { user, profile, setAuthModalOpen, signOut } = useCustomer();
  const { settings, themeColors } = useSettings();
  const { navigate } = useRouter();
  const { openOrder } = useOrder();
  const {
    favoriteProducts,
    favoritePharmacies,
    productFavoritesCount,
    pharmacyFavoritesCount,
  } = useFavorites();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [rxLoading, setRxLoading] = useState(false);
  const [rxUploading, setRxUploading] = useState(false);
  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [favProducts, setFavProducts] = useState<Product[]>([]);
  const [favPharmacies, setFavPharmacies] = useState<Pharmacy[]>([]);
  const [favLoading, setFavLoading] = useState(false);

  // Address form state
  const [addrTitle, setAddrTitle] = useState('');
  const [addrText, setAddrText] = useState('');
  const [addrPhone, setAddrPhone] = useState(profile?.phone || '');

  // Prescription form state
  const [rxImage, setRxImage] = useState<string | null>(null);
  const [rxPhone, setRxPhone] = useState(profile?.phone || '');
  const [rxNotes, setRxNotes] = useState('');

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
    if (error) showToast(translateError(error.message).ar);
    setRxLoading(false);
  }, [user]);

  useEffect(() => {
    setAddresses(loadList<AddressRecord>(ADDRESSES_KEY));
    setAddrPhone(profile?.phone || '');
    setRxPhone(profile?.phone || '');
  }, [profile?.phone]);

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
        setOrders((data || []) as OrderRecord[]);
        if (error) showToast(translateError(error.message).ar);
        setOrdersLoading(false);
      }
    };
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
      showToast('يرجى اختيار صورة الروشتة أو تصويرها بالكامل.');
      return;
    }
    if (!rxPhone.trim()) {
      showToast('يرجى إدخال رقم الهاتف للتواصل وحجز الروشتة.');
      return;
    }
    setRxUploading(true);
    try {
      const imageUrl = await uploadPrescriptionImage(rxImage);
      await insertPrescription({
        customerId: user?.id || null,
        imageUrl,
        phone: rxPhone.trim(),
        notes: rxNotes.trim(),
      });
      await fetchPrescriptions();
      setRxImage(null);
      setRxNotes('');
      showToast('تم حفظ وإرسال الروشتة للصيدلية بنجاح');
      if (settings.contact_whatsapp) {
        const text = encodeURIComponent(
          `مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: ${rxPhone}\nالملاحظات: ${rxNotes || 'لا يوجد'}`
        );
        window.open(`https://wa.me/${settings.contact_whatsapp}?text=${text}`, '_blank');
      }
    } catch {
      showToast('فشل رفع الروشتة، برجاء المحاولة مرة أخرى');
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
      showToast('يرجى إدخال اسم العنوان وتفاصيله.');
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
    showToast('تم حفظ العنوان بنجاح');
  };

  const handleDeleteAddress = (id: string) => {
    saveAddresses(addresses.filter((a) => a.id !== id));
  };

  const handleDeletePrescription = async (rx: Prescription) => {
    try {
      await deletePrescription(rx.id, rx.image_url);
      await fetchPrescriptions();
      showToast('تم حذف الروشتة');
    } catch {
      showToast('فشل حذف الروشتة');
    }
  };

  const handleResendPrescription = (rx: Prescription) => {
    if (!settings.contact_whatsapp) return;
    const text = encodeURIComponent(
      `مرحباً صيدليتي 👋\nأود طلب دواء عن طريق الروشتة المرفقة.\nرقم الهاتف: ${rx.phone}\nالملاحظات: ${rx.notes || 'لا يوجد'}`
    );
    window.open(`https://wa.me/${settings.contact_whatsapp}?text=${text}`, '_blank');
  };

  const handleRxImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setRxImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  // ============ Not logged in ============
  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 text-center relative overflow-hidden">
          <div
            className="absolute top-0 right-0 left-0 h-1.5"
            style={{ background: `linear-gradient(to left, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
          />
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${themeColors.primaryColor}12` }}
          >
            <User className="w-8 h-8" style={{ color: themeColors.primaryColor }} />
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2">سجّل دخولك لمتابعة حسابك</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            تابع طلباتك وروشتاتك المحفوظة وعناوينك وأدويتك وصيدلياتك المفضلة من مكان واحد.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-white font-bold shadow-lg transition-all hover:scale-[1.01] active:scale-95"
            style={{ backgroundColor: themeColors.primaryColor, boxShadow: `0 8px 20px -6px ${themeColors.primaryColor}88` }}
          >
            تسجيل الدخول / إنشاء حساب
          </button>
        </div>
      </div>
    );
  }

  const initial = (profile?.full_name || user.email || 'عميل').charAt(0).toUpperCase();

  const tabs: { id: AccountTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'orders', label: 'طلباتي ومتابعة الشحنات', icon: <PackageCheck className="w-4 h-4" />, count: activeOrdersCount },
    { id: 'prescriptions', label: 'الروشتات المحفوظة', icon: <FileText className="w-4 h-4" />, count: prescriptions.length },
    { id: 'addresses', label: 'العناوين المسجلة', icon: <MapPin className="w-4 h-4" />, count: addresses.length },
    { id: 'favorites', label: 'المفضلة', icon: <Heart className="w-4 h-4" />, count: productFavoritesCount + pharmacyFavoritesCount },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          {toast}
        </div>
      )}

      {/* ===== Header card ===== */}
      <div
        className="rounded-3xl text-white relative overflow-hidden p-6 sm:p-8 mb-6 shadow-xl"
        style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor}, ${themeColors.secondaryColor})` }}
      >
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/10 blur-2xl pointer-events-none" />

        <button
          onClick={() => navigate({ name: 'home' })}
          className="relative flex items-center gap-2 text-white/85 hover:text-white text-xs font-bold mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          العودة للرئيسية
        </button>

        <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-16 h-16 rounded-3xl object-cover border-2 border-white/50 shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-black border border-white/40 shadow-lg">
                {initial}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-black">{profile?.full_name || 'عميل صيدليتي'}</h1>
                <ShieldCheck className="w-5 h-5 text-teal-200" />
              </div>
              <p className="text-xs text-white/80 font-medium mt-0.5" dir="ltr">{user.email}</p>
              <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-bold text-amber-200">
                <Sparkles className="w-3 h-3" />
                نقاط المكافآت: 120 نقطة
              </div>
            </div>
          </div>

          <div className="sm:mr-auto flex items-center gap-2">
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/25 text-white text-xs font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </div>

      {/* ===== Quick stats ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { icon: <PackageCheck className="w-5 h-5" />, value: `${orders.length}`, label: 'إجمالي الطلبات', color: themeColors.primaryColor },
          { icon: <Truck className="w-5 h-5" />, value: `${activeOrdersCount}`, label: 'طلبات نشطة', color: themeColors.secondaryColor },
          { icon: <FileText className="w-5 h-5" />, value: `${prescriptions.length}`, label: 'روشتات محفوظة', color: themeColors.accentColor },
          { icon: <Heart className="w-5 h-5" />, value: `${productFavoritesCount + pharmacyFavoritesCount}`, label: 'عنصر مفضل', color: '#ec4899' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-3xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${stat.color}12`, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div>
              <p className="text-xl font-black text-gray-900 leading-none">{stat.value}</p>
              <p className="text-[11px] text-gray-500 font-bold mt-1">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== Tabs ===== */}
      <div className="p-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm mb-6 overflow-x-auto scrollbar-none flex items-center gap-1.5">
        {tabs.map((t) => {
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => navigate({ name: 'account', tab: t.id })}
              className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-black transition-all duration-300 ${
                isActive ? 'text-white shadow-md scale-[1.02]' : 'text-gray-600 hover:bg-slate-50'
              }`}
              style={isActive ? { backgroundColor: themeColors.primaryColor } : {}}
            >
              {t.icon}
              <span className="truncate">{t.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-gray-600'
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===== Orders tab ===== */}
      {tab === 'orders' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">طلباتي ومتابعة الشحنات</h2>
            <span className="text-xs font-bold text-gray-500">{orders.length} طلب</span>
          </div>

          {ordersLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-3xl h-32 animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${themeColors.primaryColor}12` }}
              >
                <PackageCheck className="w-8 h-8" style={{ color: themeColors.primaryColor }} />
              </div>
              <h3 className="font-black text-gray-900 text-base mb-1">لا توجد طلبات بعد</h3>
              <p className="text-sm text-gray-500 mb-5">ابدأ بطلب أدويتك وسيظهر هنا سجل طلباتك ومتابعة الشحنات.</p>
              <button
                onClick={() => navigate({ name: 'home' })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all"
                style={{ backgroundColor: themeColors.primaryColor }}
              >
                <Search className="w-4 h-4" />
                ابحث عن دوائك الآن
              </button>
            </div>
          ) : (
            orders.map((order) => {
              const meta = STATUS_META[order.status] || STATUS_META.pending;
              const product = order.product;
              return (
                <div key={order.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                      {product?.image_url ? (
                        <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Pill className="w-8 h-8 text-gray-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-gray-900">{product?.name || 'منتج'}</p>
                          <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5" />
                            {order.pharmacy?.name || 'صيدلية'}
                          </p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold border ${meta.className}`}>
                          {meta.icon}
                          {meta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5" />
                          الكمية: <strong className="text-gray-800">{order.quantity}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {order.address || 'عنوان التوصيل غير محدد'}
                        </span>
                        {order.note && (
                          <span className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5" />
                            {order.note}
                          </span>
                        )}
                        {order.payment_method && (
                          <span className="flex items-center gap-1.5">
                            <Wallet className="w-3.5 h-3.5" />
                            الدفع:
                            <strong className="text-gray-800">
                              {order.payment_method === 'instapay' ? 'انستا باي' : order.payment_method === 'vodafone_cash' ? 'فودافون كاش' : order.payment_method}
                            </strong>
                            {order.payment_screenshot_url && (
                              <a
                                href={order.payment_screenshot_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-extrabold px-2 py-0.5 rounded-full text-white hover:brightness-110 transition-all"
                                style={{ backgroundColor: themeColors.primaryColor }}
                              >
                                إثبات التحويل
                              </a>
                            )}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(order.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="sm:mr-auto flex sm:flex-col sm:items-end items-center gap-3 justify-between">
                      <div>
                        <p className="text-xl font-black text-gray-900">{Number(order.total_price).toFixed(2)}</p>
                        <p className="text-[11px] font-bold text-gray-400">ج.م</p>
                      </div>
                      {product && (
                        <button
                          onClick={() => openOrder(product, order.pharmacy?.name)}
                          className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all"
                          style={{ backgroundColor: themeColors.primaryColor }}
                        >
                          اطلب مرة أخرى
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===== Prescriptions tab ===== */}
      {tab === 'prescriptions' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">الروشتات المحفوظة</h2>
            <span className="text-xs font-bold text-gray-500">{prescriptions.length} روشتة</span>
          </div>

          {/* Add new prescription */}
          <form
            onSubmit={handleRxSubmit}
            className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${themeColors.primaryColor}12` }}
              >
                <FileText className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
              </div>
              <h3 className="font-black text-gray-900 text-sm">حفظ روشتة جديدة</h3>
            </div>

            {rxImage ? (
              <div className="relative rounded-2xl overflow-hidden border-2 max-h-64 bg-slate-900 flex items-center justify-center" style={{ borderColor: themeColors.primaryColor }}>
                <img src={rxImage} alt="روشتة" className="max-h-64 w-auto object-contain mx-auto" />
                <button
                  type="button"
                  onClick={() => setRxImage(null)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 hover:border-teal-500 rounded-2xl bg-gray-50 hover:bg-teal-50/40 transition-all cursor-pointer group text-center space-y-2">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-md"
                  style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
                >
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">اضغط هنا لالتقاط صورة أو رفع الروشتة</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">يدعم صور JPG, PNG حتى 5MB</p>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleRxImageUpload} />
              </label>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={rxPhone}
                  onChange={(e) => setRxPhone(e.target.value)}
                  placeholder="رقم الهاتف للتواصل"
                  dir="ltr"
                  className="w-full pr-10 pl-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
                />
              </div>
              <input
                type="text"
                value={rxNotes}
                onChange={(e) => setRxNotes(e.target.value)}
                placeholder="ملاحظات إضافية للصيدلي (اختياري)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
              />
            </div>

            <button
              type="submit"
              disabled={rxUploading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold shadow-md hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-60"
              style={{ backgroundColor: themeColors.primaryColor }}
            >
              {rxUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري رفع الروشتة...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  حفظ وإرسال الروشتة للصيدلية
                </>
              )}
            </button>
          </form>

          {/* Prescription list */}
          {rxLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-100 rounded-3xl h-64 animate-pulse" />
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center shadow-sm">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${themeColors.primaryColor}12` }}
              >
                <FileText className="w-8 h-8" style={{ color: themeColors.primaryColor }} />
              </div>
              <h3 className="font-black text-gray-900 text-base mb-1">لا توجد روشتات محفوظة</h3>
              <p className="text-sm text-gray-500">ارفع روشتتك أعلاه وسيتم حفظها هنا لسهولة الوصول إليها لاحقاً.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {prescriptions.map((rx) => {
                const meta = PRESCRIPTION_STATUS_META[rx.status] || PRESCRIPTION_STATUS_META.new;
                return (
                  <div key={rx.id} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="h-36 bg-slate-900 relative flex items-center justify-center">
                      <img src={rx.image_url} alt="روشتة" className="max-h-36 w-auto object-contain" />
                      <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold border border-white/20">
                        <Clock className="w-3 h-3" />
                        {new Date(rx.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                      </span>
                      <span className={`absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${meta.className}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        <span dir="ltr">{rx.phone}</span>
                      </p>
                      {rx.notes && (
                        <p className="text-xs text-gray-600 line-clamp-2">{rx.notes}</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleResendPrescription(rx)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-xs font-bold transition-colors hover:brightness-110"
                          style={{ backgroundColor: themeColors.primaryColor }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          إرسال واتساب
                        </button>
                        <button
                          onClick={() => handleDeletePrescription(rx)}
                          className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                          title="حذف الروشتة"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Addresses tab ===== */}
      {tab === 'addresses' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">العناوين المسجلة</h2>
            <span className="text-xs font-bold text-gray-500">{addresses.length} عنوان</span>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Add form */}
            <form onSubmit={handleAddAddress} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm space-y-3 self-start">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${themeColors.primaryColor}12` }}
                >
                  <MapPin className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
                </div>
                <h3 className="font-black text-gray-900 text-sm">إضافة عنوان جديد</h3>
              </div>

              <input
                type="text"
                value={addrTitle}
                onChange={(e) => setAddrTitle(e.target.value)}
                placeholder="اسم العنوان (مثال: المنزل، العمل)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
              />
              <textarea
                value={addrText}
                onChange={(e) => setAddrText(e.target.value)}
                rows={2}
                placeholder="العنوان بالتفصيل (المنطقة، الشارع، رقم العمارة)"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 resize-none"
                style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
              />
              <input
                type="tel"
                value={addrPhone}
                onChange={(e) => setAddrPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)"
                dir="ltr"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }}
              />

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-sm font-bold shadow-md hover:scale-[1.01] active:scale-95 transition-all"
                style={{ backgroundColor: themeColors.primaryColor }}
              >
                <Plus className="w-4 h-4" />
                حفظ العنوان
              </button>
            </form>

            {/* Address list */}
            <div className="space-y-3">
              {addresses.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm h-full flex flex-col items-center justify-center">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${themeColors.primaryColor}12` }}
                  >
                    <MapPin className="w-8 h-8" style={{ color: themeColors.primaryColor }} />
                  </div>
                  <h3 className="font-black text-gray-900 text-base mb-1">لا توجد عناوين مسجلة</h3>
                  <p className="text-sm text-gray-500">أضف عناوينك المفضلة للتوصيل لتظهر هنا.</p>
                </div>
              ) : (
                addresses.map((addr) => (
                  <div key={addr.id} className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${themeColors.accentColor}12` }}
                    >
                      <Navigation className="w-5 h-5" style={{ color: themeColors.accentColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-gray-900 text-sm">{addr.title}</h4>
                        {addr.phone && (
                          <span className="text-[10px] text-gray-400 font-bold" dir="ltr">{addr.phone}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{addr.address}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors shrink-0"
                      title="حذف العنوان"
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
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">مفضلتي</h2>
            <span className="text-xs font-bold text-gray-500">
              {productFavoritesCount} دواء · {pharmacyFavoritesCount} صيدلية
            </span>
          </div>

          {/* Favorite products */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${themeColors.primaryColor}12` }}
              >
                <Pill className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
              </div>
              <h3 className="font-black text-gray-900 text-sm">الأدوية المفضلة</h3>
              <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-extrabold">
                {productFavoritesCount}
              </span>
            </div>

            {favLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-3xl h-64 animate-pulse" />
                ))}
              </div>
            ) : favProducts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
                <Heart className="w-10 h-10 mx-auto text-pink-300 mb-3" />
                <h4 className="font-black text-gray-900 text-sm mb-1">لا توجد أدوية مفضلة بعد</h4>
                <p className="text-xs text-gray-500">
                  اضغط على علامة القلب ♥ بجانب أي دواء لإضافته إلى مفضلتك هنا.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {favProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pharmacyName={product.pharmacy?.name}
                    onClick={product.for_all_pharmacies ? undefined : () => product.pharmacy_id && navigate({ name: 'pharmacy', id: product.pharmacy_id })}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Favorite pharmacies */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${themeColors.secondaryColor}12` }}
              >
                <Store className="w-4 h-4" style={{ color: themeColors.secondaryColor }} />
              </div>
              <h3 className="font-black text-gray-900 text-sm">الصيدليات المفضلة</h3>
              <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 text-[10px] font-extrabold">
                {pharmacyFavoritesCount}
              </span>
            </div>

            {favLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-slate-100 rounded-3xl h-72 animate-pulse" />
                ))}
              </div>
            ) : favPharmacies.length === 0 ? (
              <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center shadow-sm">
                <Store className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <h4 className="font-black text-gray-900 text-sm mb-1">لا توجد صيدليات مفضلة بعد</h4>
                <p className="text-xs text-gray-500">
                  اضغط على علامة القلب ♥ بجانب أي صيدلية لإضافتها إلى مفضلتك هنا.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {favPharmacies.map((pharmacy) => (
                  <PharmacyCard key={pharmacy.id} pharmacy={pharmacy} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
