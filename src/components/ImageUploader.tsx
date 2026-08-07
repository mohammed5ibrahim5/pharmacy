import { useRef, useState } from 'react';
import { Link2, Upload, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

interface ImageUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  previewClassName?: string;
  hint?: string;
}

export function ImageUploader({ label, value, onChange, bucket = 'images', previewClassName = '', hint }: ImageUploaderProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'link' | 'device'>(value ? 'link' : 'device');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(t('يرجى اختيار ملف صورة صالح.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(t('حجم الصورة كبير جداً، الحد الأقصى 5 ميجابايت.'));
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase();
      const path = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      setError(t('فشل رفع الصورة. تأكد من أن بوكيت التخزين مفعّل في Supabase.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex gap-3 items-start">
        <div className={`w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center ${previewClassName}`}>
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-200 w-max text-[11px] font-bold">
            <button type="button" onClick={() => setMode('device')} className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${mode === 'device' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Upload className="w-3.5 h-3.5" /> {t('من الجهاز')}</button>
            <button type="button" onClick={() => setMode('link')} className={`flex items-center gap-1 px-3 py-1.5 transition-colors ${mode === 'link' ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Link2 className="w-3.5 h-3.5" /> {t('رابط')}</button>
          </div>

          {mode === 'device' ? (
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-60"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? t('جاري الرفع...') : t('اضغط لاختيار صورة من الجهاز')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent focus:ring-2 text-sm text-gray-900"
                dir="ltr"
                placeholder="https://..."
              />
              {value && (
                <button type="button" onClick={() => onChange('')} className="w-9 h-9 shrink-0 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {error && <p className="text-[11px] font-medium text-red-500">{error}</p>}
          {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
