import { Check, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useSettings } from '@/context/SettingsContext';

interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
}

export function OtcFilterToggle({ checked, onChange }: Props) {
  const { t } = useLanguage();
  const { themeColors } = useSettings();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all duration-300 select-none ${
        checked
          ? 'text-white border-transparent shadow-md'
          : 'bg-white border-gray-200 text-slate-600 hover:border-gray-300 hover:text-slate-900'
      }`}
      style={checked ? { backgroundColor: themeColors.primaryColor, boxShadow: `0 8px 18px -6px ${themeColors.primaryColor}77` } : {}}
    >
      <span
        className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
          checked ? 'bg-white/25 border-white/60' : 'border-gray-300'
        }`}
      >
        {checked && <Check className="w-3 h-3" />}
      </span>
      <ShieldCheck className="w-4 h-4" />
      {t('بدون وصفة طبية فقط')}
    </button>
  );
}
