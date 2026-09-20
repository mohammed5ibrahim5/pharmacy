import React, { useState } from 'react';
import { MapPin, Navigation, X, Check, Search, Building2 } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';

interface LocationSelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentLocation: string;
  onSelectLocation: (locationName: string, coords?: { latitude: number; longitude: number }) => void;
}

const EGYPT_GOVERNORATES = [
  { name: 'القاهرة', areas: ['المعادي', 'مدينة نصر', 'التجمع الخامس', 'مصر الجديدة', 'الزمالك', 'الشروق', 'الرحاب'] },
  { name: 'الجيزة', areas: ['الدقي', 'المهندسين', 'الشيخ زايد', '٦ أكتوبر', 'الهرم', 'فيصل'] },
  { name: 'الإسكندرية', areas: ['سموحة', 'سيدي جابر', 'المنتزه', 'ستانلي', 'جليم', 'ميامي'] },
  { name: 'الدقهلية', areas: ['المنصورة', 'طلخا', 'ميت غمر'] },
  { name: 'الغربية', areas: ['طنطا', 'المحلة الكبرى'] },
  { name: 'القليوبية', areas: ['بنها', 'شبرا الخيمة'] },
  { name: 'الشرقية', areas: ['الزقازيق', 'العاشر من رمضان'] },
  { name: 'أسيوط', areas: ['مدينة أسيوط', 'أبنوب'] },
];

export function LocationSelectorModal({
  open,
  onClose,
  currentLocation,
  onSelectLocation,
}: LocationSelectorModalProps) {
  const { themeColors } = useSettings();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [selectedGov, setSelectedGov] = useState('القاهرة');

  if (!open) return null;

  const handleDetectLocation = () => {
    setDetectError('');
    if (!('geolocation' in navigator)) {
      setDetectError(t('متصفحك لا يدعم تحديد الموقع — اختر منطقتك يدوياً من الأسفل'));
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        onSelectLocation(t('موقعي الحالي (GPS)'), {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        onClose();
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setDetectError(t('رفضت صلاحية تحديد الموقع — اختر منطقتك يدوياً من الأسفل'));
        } else {
          setDetectError(t('لم نتمكن من تحديد موقعك — اختر منطقتك يدوياً من الأسفل'));
        }
      },
      { timeout: 5000 }
    );
  };

  const filteredGovs = EGYPT_GOVERNORATES.filter(
    (g) => g.name.includes(search) || g.areas.some((a) => a.includes(search))
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col max-h-[85vh]"
        style={{ backgroundColor: themeColors.modalBodyBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 text-white relative flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${themeColors.modalHeaderBg}, ${themeColors.priceColor})` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">{t('اختر عنوان التسليم والتوصيل')}</h3>
              <p className="text-xs text-white/80">{t('لتحديد أقرب الصيدليات المتاحة حولك فوراً')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Auto GPS Detect Button */}
          <button
            onClick={handleDetectLocation}
            disabled={detecting}
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl border-2 border-dashed border-teal-500 bg-teal-50/60 text-teal-800 font-bold text-xs hover:bg-teal-100/80 transition-all shadow-sm active:scale-98"
          >
            <Navigation className={`w-4 h-4 text-teal-600 ${detecting ? 'animate-spin' : 'animate-bounce'}`} />
            {detecting ? t('جاري تحديد موقعك الجغرافي...') : t('استخدام موقعي الحالي الجغرافي (GPS)')}
          </button>

          {detectError && (
            <p className="text-[11px] font-bold text-amber-600 text-center">{detectError}</p>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute end-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('ابحث عن المحافظة أو المنطقة...')}
              className="w-full ps-10 pe-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
              style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
            />
          </div>

          {/* Governorate Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {filteredGovs.map((g) => (
              <button
                key={g.name}
                onClick={() => setSelectedGov(g.name)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedGov === g.name
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedGov === g.name ? { backgroundColor: themeColors.priceColor } : {}}
              >
                {t(g.name)}
              </button>
            ))}
          </div>

          {/* Areas List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              {t('المناطق والأحياء المتاحة في {0}:', [t(selectedGov)])}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {EGYPT_GOVERNORATES.find((g) => g.name === selectedGov)?.areas.map((area) => {
                const fullLoc = `${selectedGov} - ${area}`;
                const isSelected = currentLocation.includes(area);
                return (
                  <button
                    key={area}
                    onClick={() => {
                      onSelectLocation(fullLoc);
                      onClose();
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-start text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-teal-500 bg-teal-50/70 text-teal-900 shadow-sm'
                        : 'border-gray-100 bg-gray-50/80 hover:bg-white hover:border-gray-300 text-gray-800'
                    }`}
                  >
                    <span>{t(area)}</span>
                    {isSelected && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
