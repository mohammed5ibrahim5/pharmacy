import React, { useState } from 'react';
import { Stethoscope, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SymptomCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SYMPTOMS_LIST = [
  'صداع وألم بالرأس',
  'ارتفاع حرارة / سخونية',
  'ألم بالمعدة وحموضة',
  'كحة وسعال جاف/رطب',
  'حساسية ورشح بالأنف',
  'إرهاق وخمول عام',
  'ألم بالمفاصل والعضلات',
  'ألم بالحلق واللوزتين',
];

export const SymptomCheckerModal: React.FC<SymptomCheckerModalProps> = ({ isOpen, onClose }) => {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [advice, setAdvice] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  if (!isOpen) return null;

  const toggleSymptom = (symptom: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  };

  const handleAnalyze = () => {
    if (selectedSymptoms.length === 0) return;
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAdvice(
        `بناءً على الأعراض التي حددتها (${selectedSymptoms.join('، ')}):\n\n` +
          `• ننصح بأخذ قسط كافٍ من الراحة وشرب السوائل الدافئة.\n` +
          `• يمكنك تصفح قسم المسكنات وأدوية البرد المتوفرة بالصيدليات المجاورة.\n` +
          `• في حالة استمرار الأعراض لأكثر من 48 ساعة، يرجى مراجعة الطبيب المختص فكلياً.`
      );
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden transition-all transform">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 left-5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3 space-x-reverse mb-2">
            <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">فاحص الأعراض المبدئي</h2>
              <p className="text-xs text-teal-100 font-medium">مساعد ذكي لاقتراح الأدوية وتوجيهات السلامة</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
              حدد الأعراض التي تشعر بها حالياً:
            </label>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS_LIST.map((symptom) => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <button
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                      isSelected
                        ? 'bg-teal-600 border-teal-600 text-white shadow-md shadow-teal-500/20'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-500'
                    }`}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>
          </div>

          {analyzing && (
            <div className="flex flex-col items-center justify-center py-6 text-teal-600 space-y-3">
              <Sparkles className="w-8 h-8 animate-spin" />
              <p className="text-sm font-bold">جاري تحليل الأعراض وصياغة النصائح...</p>
            </div>
          )}

          {advice && !analyzing && (
            <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 rounded-2xl p-4 space-y-3">
              <div className="flex items-center space-x-2 space-x-reverse text-teal-800 dark:text-teal-300 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <span>نتائج التقييم المبدئي:</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-medium">
                {advice}
              </p>
              <div className="flex items-center space-x-2 space-x-reverse text-amber-700 dark:text-amber-400 text-[11px] bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>تنبيه مهم: هذه الإرشادات تثقيفية مبدئية ولا تغني عن استشارة صيدلي أو طبيب.</span>
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleAnalyze}
              disabled={selectedSymptoms.length === 0 || analyzing}
              className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-lg shadow-teal-600/30 flex items-center justify-center space-x-2 space-x-reverse transition-all text-sm"
            >
              <Sparkles className="w-4 h-4" />
              <span>تحليل الأعراض والحصول على الاقتراحات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
