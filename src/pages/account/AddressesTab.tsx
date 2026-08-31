import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import { loadList, saveList } from './helpers';
import { ADDRESSES_KEY, type AddressRecord } from './types';
import {
  MapPin, Plus, Trash2, Navigation, CheckCircle2,
} from 'lucide-react';

export function AddressesTab() {
  const { profile } = useCustomer();
  const { themeColors } = useSettings();
  const { t, lang } = useLanguage();

  const [addresses, setAddresses] = useState<AddressRecord[]>([]);
  const [addrTitle, setAddrTitle] = useState('');
  const [addrText, setAddrText] = useState('');
  const [addrPhone, setAddrPhone] = useState(profile?.phone || '');

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    setAddresses(loadList<AddressRecord>(ADDRESSES_KEY));
    setAddrPhone(profile?.phone || '');
  }, [profile?.phone]);

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

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-2xl animate-bounce-in flex items-center gap-2 border border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          {toast}
        </div>
      )}
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
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-teal-500/10 text-teal-600">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-900 text-sm">{t('حفظ عنوان توصيل جديد')}</h3>
            </div>
            <input type="text" value={addrTitle} onChange={(e) => setAddrTitle(e.target.value)} placeholder={t('اسم العنوان (مثال: المنزل، العمل)')} className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100" style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }} />
            <textarea value={addrText} onChange={(e) => setAddrText(e.target.value)} rows={2} placeholder={t('العنوان بالتفصيل (المنطقة، الشارع، الطابق، الشقة)')} className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100 resize-none" style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }} />
            <input type="tel" value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} placeholder={t('رقم الهاتف للتواصل عند التوصيل (اختياري)')} dir="ltr" className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-teal-100" style={{ ['--tw-ring-color' as string]: themeColors.primaryColor }} />
            <button type="submit" className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-white text-xs font-black shadow-md hover:brightness-105 active:scale-95 transition-all" style={{ backgroundColor: themeColors.primaryColor }}>
              <Plus className="w-4 h-4" />
              {t('حفظ العنوان')}
            </button>
          </form>

          <div className="space-y-3">
            {addresses.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-sm h-full flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-teal-500/10 text-teal-600">
                  <MapPin className="w-8 h-8" />
                </div>
                <h3 className="font-black text-slate-900 text-base mb-1.5">{t('لا توجد عناوين محفوظة')}</h3>
                <p className="text-xs text-slate-500 font-bold max-w-xs mx-auto leading-relaxed">{t('قم بحفظ العناوين الأكثر استخداماً لسرعة إتمام طلب الأدوية مستقبلاً.')}</p>
              </div>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-start gap-3.5 relative hover:shadow-md transition-shadow group">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600">
                    <Navigation className="w-5.5 h-5.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-slate-950 text-sm leading-none">{addr.title}</h4>
                      {addr.phone && <span className="text-[10px] text-slate-400 font-bold" dir="ltr">{addr.phone}</span>}
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-2 leading-relaxed">{addr.address}</p>
                  </div>
                  <button onClick={() => handleDeleteAddress(addr.id)} className="w-8.5 h-8.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors shrink-0 active:scale-95" title={t('حذف العنوان')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
