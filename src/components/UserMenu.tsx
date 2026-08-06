import { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  Mail,
  Phone,
  ChevronDown,
  UserCircle2,
  Camera,
  X,
  Check,
  Loader2,
  AlertCircle,
  PackageCheck,
  FileText,
  MapPin,
  Heart,
  Sparkles,
  ShieldCheck,
  Link2
} from 'lucide-react';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useFavorites } from '@/context/FavoritesContext';
import { supabase } from '@/lib/supabase';
import { translateError } from '@/lib/errorMessages';

export function UserMenu() {
  const { user, profile, signOut, setAuthModalOpen, loading, refreshProfile } = useCustomer();
  const { settings, themeColors } = useSettings();
  const { navigate } = useRouter();
  const { favoriteCount } = useFavorites();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [phone, setPhone] = useState(profile?.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarLinkMode, setAvatarLinkMode] = useState(false);
  const [avatarLinkValue, setAvatarLinkValue] = useState('');
  const [activeOrders, setActiveOrders] = useState(0);
  const [prescriptionsCount, setPrescriptionsCount] = useState(0);
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditing(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setPhone(profile?.phone || '');
  }, [profile?.phone]);

  useEffect(() => {
    if (!user) {
      setPrescriptionsCount(0);
      return;
    }
    let cancelled = false;
    const fetchRx = async () => {
      const { data } = await supabase
        .from('prescriptions')
        .select('id')
        .eq('customer_id', user.id);
      if (!cancelled) setPrescriptionsCount((data || []).length);
    };
    fetchRx();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pharmacy_addresses');
      if (raw) {
        const list = JSON.parse(raw) as { title: string }[];
        setSavedAddresses(list.map((a) => a.title));
      }
    } catch {
      setSavedAddresses([]);
    }
  }, [open, user]);

  useEffect(() => {
    if (!user) {
      setActiveOrders(0);
      return;
    }
    let cancelled = false;
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('customer_id', user.id)
        .in('status', ['pending', 'confirmed']);
      if (!cancelled) setActiveOrders((data || []).length);
    };
    fetchOrders();
    return () => {
      cancelled = true;
    };
  }, [user, open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب أن يكون أقل من 2MB');
      return;
    }
    setError(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const avatarUrl = reader.result as string;
      const { error: err } = await supabase
        .from('customers')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);
      if (err) {
        setError(translateError(err.message).ar);
      } else {
        setSuccess('تم تحديث الصورة بنجاح');
        setTimeout(() => setSuccess(null), 2000);
        await refreshProfile();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarLink = async () => {
    if (!user || !avatarLinkValue.trim()) return;
    setError(null);
    setSuccess(null);
    const { error: err } = await supabase
      .from('customers')
      .update({ avatar_url: avatarLinkValue.trim() })
      .eq('id', user.id);
    if (err) {
      setError(translateError(err.message).ar);
    } else {
      setSuccess('تم تحديث الصورة بنجاح');
      setTimeout(() => setSuccess(null), 2000);
      setAvatarLinkMode(false);
      setAvatarLinkValue('');
      await refreshProfile();
    }
  };

  const handleSavePhone = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from('customers')
      .update({ phone: phone || null })
      .eq('id', user.id);
    setSaving(false);
    if (err) {
      setError(translateError(err.message).ar);
      return;
    }
    setSuccess('تم حفظ رقم الهاتف');
    setTimeout(() => setSuccess(null), 2000);
    await refreshProfile();
    setEditing(false);
  };

  if (loading) {
    return <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />;
  }

  // Not logged in: show professional login button with glowing border effect
  if (!user) {
    return (
      <button
        onClick={() => setAuthModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all hover:scale-[1.03] active:scale-95 shadow-md border border-teal-200/80 bg-white hover:bg-teal-50/50"
        style={{ color: themeColors.priceColor }}
      >
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: themeColors.priceColor }}
        >
          <UserCircle2 className="w-4 h-4" />
        </div>
        <div className="text-right leading-tight hidden sm:block">
          <span className="block font-bold">دخول / حساب</span>
          <span className="text-[10px] text-gray-500 font-normal">إدارة طلباتك وروشتاتك</span>
        </div>
        <span className="sm:hidden font-bold">دخول</span>
      </button>
    );
  }

  const initial = (profile?.full_name || user.email || 'عميل').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1.5 pr-3 pl-2 rounded-2xl border border-gray-200/80 bg-white/90 hover:bg-white hover:border-teal-300 transition-all shadow-sm group"
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.full_name || 'صورة'}
            className="w-9 h-9 rounded-xl object-cover border border-teal-200"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-inner"
            style={{ backgroundColor: themeColors.priceColor }}
          >
            {initial}
          </div>
        )}
        <div className="hidden sm:block text-right leading-tight">
          <div className="flex items-center gap-1">
            <span className="text-xs font-extrabold text-gray-900 max-w-[90px] truncate">
              {profile?.full_name || 'عميل متميز'}
            </span>
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
          </div>
          <p className="text-[10px] text-teal-600 font-medium">حسابي والخدمات</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          {/* Profile header card */}
          <div
            className="p-4 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${themeColors.priceColor}, ${themeColors.priceColor})` }}
          >
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="relative flex items-center gap-3">
              <div className="relative shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-white/60 shadow"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-xl font-bold border border-white/40 shadow">
                    {initial}
                  </div>
                )}
                <label
                  className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow bg-white"
                  title="تغيير الصورة"
                >
                  <Camera className="w-3.5 h-3.5" style={{ color: themeColors.priceColor }} />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-extrabold text-sm truncate">{profile?.full_name || 'عميل صيدليتي'}</p>
                  <ShieldCheck className="w-4 h-4 text-teal-300 shrink-0" />
                </div>
                <p className="text-[11px] text-white/80 truncate" dir="ltr">{user.email}</p>
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold text-amber-200">
                  <Sparkles className="w-3 h-3" />
                  نقاط المكافآت: 120 نقطة
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {!avatarLinkMode ? (
                    <button
                      onClick={() => setAvatarLinkMode(true)}
                      className="flex items-center gap-1 text-[10px] font-bold text-white/70 hover:text-white transition-colors"
                    >
                      <Link2 className="w-3 h-3" /> أو ألصق رابط صورة
                    </button>
                  ) : (
                    <div className="flex gap-1.5 w-full">
                      <input
                        value={avatarLinkValue}
                        onChange={(e) => setAvatarLinkValue(e.target.value)}
                        placeholder="https://..."
                        dir="ltr"
                        className="flex-1 px-2 py-1 bg-white rounded-lg text-[11px] focus:outline-none"
                      />
                      <button
                        onClick={handleAvatarLink}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-white"
                        style={{ backgroundColor: themeColors.priceColor }}
                      >
                        استخدام
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tabs or Actions */}
          <div className="p-3 space-y-1 text-xs">
            {error && (
              <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-2.5 flex items-start gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-red-700">{error}</p>
              </div>
            )}
            {success && (
              <div className="mb-2 rounded-xl border border-teal-200 bg-teal-50 p-2.5 flex items-start gap-2 animate-fade-in">
                <Check className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-teal-700">{success}</p>
              </div>
            )}

            {/* User quick options list */}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50/80">
                <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-gray-700 truncate" dir="ltr">{user.email}</span>
              </div>

              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50/80">
                <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                {editing ? (
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      dir="ltr"
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1"
                      placeholder="01XXXXXXXXX"
                    />
                    <button onClick={handleSavePhone} disabled={saving} className="text-teal-600 hover:bg-teal-50 p-1 rounded">
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => setEditing(false)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-xs text-gray-700 flex items-center justify-between flex-1" dir="ltr">
                    <span>{profile?.phone || 'إضافة رقم هاتف'}</span>
                    <span className="text-[10px] text-teal-600 font-bold underline ml-2">تعديل</span>
                  </button>
                )}
              </div>
            </div>

            {/* Account Quick Features Menu */}
            <div className="border-t border-gray-100 pt-2 space-y-0.5">
              <button
                onClick={() => {
                  setOpen(false);
                  navigate({ name: 'account', tab: 'orders' });
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-teal-50/60 text-gray-800 transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <PackageCheck className="w-4 h-4 text-teal-600" />
                  <span>طلباتي ومتابعة الشحنات</span>
                </div>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-full">{activeOrders} نشطة</span>
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate({ name: 'account', tab: 'prescriptions' });
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-teal-50/60 text-gray-800 transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>الروشتات المحفوظة</span>
                </div>
                <span className="text-gray-400 text-[10px]">{prescriptionsCount > 0 ? `${prescriptionsCount} محفوظة` : 'إضافة'}</span>
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate({ name: 'account', tab: 'addresses' });
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-teal-50/60 text-gray-800 transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>العناوين المسجلة</span>
                </div>
                <span className="text-gray-400 text-[10px] truncate max-w-[70px]">{savedAddresses[0] || 'إضافة'}</span>
              </button>

              <button
                onClick={() => {
                  setOpen(false);
                  navigate({ name: 'account', tab: 'favorites' });
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-teal-50/60 text-gray-800 transition-colors font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span>المفضلة</span>
                </div>
                <span className="bg-pink-50 text-pink-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{favoriteCount}</span>
              </button>
            </div>

            {/* Logout button */}
            <div className="border-t border-gray-100 mt-2 pt-1.5">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-bold transition-colors"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
