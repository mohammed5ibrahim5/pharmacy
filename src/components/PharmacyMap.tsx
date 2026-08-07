import { useState, useMemo } from 'react';
import { MapPin, Navigation2, Store, Cross, ChevronLeft } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useRouter } from '@/context/RouterContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getDirectionsUrl } from '@/lib/directions';
import { formatDistance } from '@/lib/distance';
import { useLanguage } from '@/context/LanguageContext';
import type { Pharmacy } from '@/types';

interface Props {
  pharmacies: (Pharmacy & { distance?: number })[];
  loading?: boolean;
}

export function PharmacyMap({ pharmacies, loading }: Props) {
  const { t } = useLanguage();
  const { themeColors } = useSettings();
  const { navigate } = useRouter();
  const { location } = useGeolocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activePharmacies = pharmacies.filter((p) => p.latitude && p.longitude);

  const selected = useMemo(() => {
    if (activePharmacies.length === 0) return null;
    return activePharmacies.find((p) => p.id === selectedId) || activePharmacies[0];
  }, [activePharmacies, selectedId]);

  if (loading) {
    return (
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[420px] bg-slate-100 rounded-3xl animate-pulse" />
        </div>
      </section>
    );
  }

  if (activePharmacies.length === 0) return null;

  const embedSrc = `https://www.google.com/maps?q=${selected?.latitude},${selected?.longitude}&z=14&output=embed&hl=ar`;

  return (
    <section className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1 rounded-full"
              style={{ backgroundColor: `${themeColors.primaryColor}15`, color: themeColors.primaryColor }}
            >
              <MapPin className="w-4 h-4" />
              {t('خريطة الصيدليات')}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {t('الصيدليات على الخريطة')}
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 font-bold">{t('اختر صيدلية من القائمة وشاهد موقعها مباشرة')}</p>
          </div>
          <button
            onClick={() => navigate({ name: 'search', query: '' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-gray-200 text-xs font-extrabold text-gray-800 hover:bg-slate-50 transition-all shadow-2xs group self-start sm:self-auto"
          >
            <span>{t('عرض جميع الصيدليات')}</span>
            <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-teal-600 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pharmacy list */}
          <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 overflow-hidden flex flex-col max-h-[320px] lg:max-h-none">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-slate-50/70">
              <Store className="w-4 h-4" style={{ color: themeColors.primaryColor }} />
              <p className="text-xs font-black text-slate-700">{t('{0} صيدلية متاحة', [activePharmacies.length])}</p>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {activePharmacies.map((p) => {
                const isSelected = selected?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`w-full text-right p-3.5 flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-teal-50/70' : 'hover:bg-gray-50'
                    }`}
                    style={isSelected ? { boxShadow: `inset 3px 0 0 ${themeColors.primaryColor}` } : {}}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0"
                      style={{ backgroundColor: isSelected ? themeColors.primaryColor : `${themeColors.primaryColor}55` }}
                    >
                      {p.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-extrabold text-slate-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-slate-500 font-medium truncate">{p.area || p.city || p.address}</p>
                    </div>
                    {p.distance != null && (
                      <span className="text-[10px] font-black text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg shrink-0" dir="ltr">
                        {formatDistance(p.distance)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2 relative rounded-3xl overflow-hidden border border-gray-200 bg-slate-100 min-h-[320px]">
            {selected && (
              <>
                <iframe
                  title={t('خريطة الصيدليات')}
                  src={embedSrc}
                  className="w-full h-full min-h-[320px] lg:h-[480px]"
                  loading="lazy"
                  style={{ border: 0 }}
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <div className="absolute bottom-3 left-3 right-3 sm:right-auto flex flex-col sm:flex-row gap-2 sm:items-center">
                  <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-gray-100 px-4 py-2.5 flex items-center gap-2.5 flex-1 sm:flex-none">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: themeColors.primaryColor }}>
                      {selected.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-900 truncate">{selected.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{selected.address}</p>
                    </div>
                  </div>
                  <a
                    href={getDirectionsUrl({ latitude: selected.latitude, longitude: selected.longitude })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-white text-xs font-black shadow-lg active:scale-95 transition-all"
                    style={{ backgroundColor: themeColors.primaryColor }}
                  >
                    <Navigation2 className="w-4 h-4" />
                    {t('الاتجاهات إليها')}
                  </a>
                </div>
              </>
            )}
            {location == null && (
              <div className="absolute top-3 right-3 bg-white/95 backdrop-blur rounded-xl shadow border border-gray-100 px-3 py-2 text-[10px] font-bold text-slate-600 flex items-center gap-1.5">
                <Cross className="w-3 h-3 text-slate-400" />
                {t('حدّد موقعك لعرض المسافات')}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
