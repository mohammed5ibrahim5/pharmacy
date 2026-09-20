import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle2, XCircle, Truck } from 'lucide-react';
import { ORDER_TRACK_STEPS } from './types';

export function OrderProgressTracker({ status, color }: { status: string; color: string }) {
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
