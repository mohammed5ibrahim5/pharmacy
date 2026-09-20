import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';
import { useCustomer } from '@/context/CustomerContext';
import type { CustomerProfile } from '@/context/CustomerContext';
import { Pencil, Camera, Save, X, Loader2 } from 'lucide-react';

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { profile, updateProfile } = useCustomer();
  const { themeColors } = useSettings();
  const { t } = useLanguage();

  const [editName, setEditName] = useState(profile?.full_name || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editAvatar, setEditAvatar] = useState<string | null>(profile?.avatar_url || null);
  const [editSaving, setEditSaving] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleEditAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditAvatar(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      showToast(t('يرجى إدخال الاسم الكامل.'));
      return;
    }
    if (editPhone && !/^[0-9+\-\s]{8,15}$/.test(editPhone.trim())) {
      showToast(t('يرجى إدخال رقم هاتف صحيح.'));
      return;
    }
    setEditSaving(true);
    const updates: Partial<CustomerProfile> = { full_name: editName.trim() };
    if ((profile?.phone || '') !== editPhone.trim()) updates.phone = editPhone.trim();
    if (editAvatar !== profile?.avatar_url) updates.avatar_url = editAvatar && editAvatar.length > 0 ? editAvatar : null;
    const { error } = await updateProfile(updates);
    setEditSaving(false);
    if (error) {
      showToast(error);
      return;
    }
    onClose();
  };

  return (
    <>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] bg-slate-900 text-white text-xs font-black px-6 py-3.5 rounded-full shadow-2xl animate-bounce-in flex items-center gap-2 border border-slate-800">
          <span className="w-4 h-4 text-emerald-400">✓</span>
          {toast}
        </div>
      )}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => !editSaving && onClose()} />
        <div className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-fade-up">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Pencil className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
              {t('تعديل البيانات الشخصية')}
            </h3>
            <button type="button" onClick={onClose} disabled={editSaving} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {editAvatar ? (
                  <img src={editAvatar} alt="" className="w-24 h-24 rounded-[1.75rem] object-cover border-2 border-slate-100 shadow-md" />
                ) : (
                  <div className="w-24 h-24 rounded-[1.75rem] bg-slate-100 flex items-center justify-center text-4xl font-black text-slate-400 border-2 border-slate-100">
                    {(editName.trim()[0] || '؟').toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => document.getElementById('edit-avatar-input')?.click()}
                  className="absolute -bottom-2 -end-2 p-2.5 rounded-xl text-white shadow-lg hover:scale-105 active:scale-95 transition-all"
                  style={{ backgroundColor: themeColors.primaryColor }}
                  title={t('تغيير الصورة')}
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <input id="edit-avatar-input" type="file" accept="image/*" className="hidden" onChange={handleEditAvatar} />
              <p className="text-[11px] text-slate-400 font-bold">{t('اضغط على الكاميرا لتغيير صورتك')}</p>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1.5">{t('الاسم الكامل')}</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t('الاسم الكامل')}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold focus:outline-none focus:ring-2 transition-shadow"
                style={{ ['--tw-ring-color' as string]: `${themeColors.primaryColor}40` }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1.5">{t('رقم الهاتف')}</label>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder={t('مثال: 05xxxxxxxx')}
                dir="ltr"
                inputMode="tel"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-bold text-start focus:outline-none focus:ring-2 transition-shadow"
                style={{ ['--tw-ring-color' as string]: `${themeColors.primaryColor}40` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
            <button type="button" onClick={onClose} disabled={editSaving} className="flex-1 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-colors">
              {t('إلغاء')}
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={editSaving}
              className="flex-1 px-5 py-3 rounded-2xl text-white text-sm font-black shadow-md hover:scale-102 active:scale-95 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: themeColors.primaryColor }}
            >
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editSaving ? t('جاري الحفظ...') : t('حفظ التغييرات')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
