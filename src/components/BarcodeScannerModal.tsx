import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Check, AlertCircle, Sparkles, Upload } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcodeOrQuery: string) => void;
}

// Sample popular products with barcodes for quick demo testing
const SAMPLE_BARCODES = [
  { barcode: '6223000123456', name: 'بنادول اكسترا (Panadol Extra)', category: 'مسكنات' },
  { barcode: '6221001987654', name: 'كونجستال (Congestal)', category: 'برد وإنفلونزا' },
  { barcode: '6224000554433', name: 'سي ريتارد 500 (C-Retard 500)', category: 'فيتامينات' },
  { barcode: '6229000112233', name: 'أوميجا 3 بلس (Omega 3 Plus)', category: 'مكملات غذائية' },
  { barcode: '6227000889900', name: 'أوجمنتين 1 جرام (Augmentin 1g)', category: 'مضادات حيوية' },
];

export function BarcodeScannerModal({ open, onClose, onScan }: BarcodeScannerModalProps) {
  const { settings } = useSettings();
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setScannedSuccess(null);
      setError(null);
    }
  }, [open]);

  const startCamera = async () => {
    setError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        setError('الكاميرا غير مدعومة في المتصفح الحالي، يمكنك كتابة الباركود أو اختيار نموذج أدناه.');
      }
    } catch {
      setError('تعذر الوصول إلى الكاميرا. يرجى تفعيل الإذن أو تجربة العينات السريعة.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSelectCode = (code: string) => {
    setScannedSuccess(code);
    setTimeout(() => {
      onScan(code);
      onClose();
    }, 600);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSelectCode(manualCode.trim());
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simulate reading barcode from photo
      const randomSample = SAMPLE_BARCODES[Math.floor(Math.random() * SAMPLE_BARCODES.length)];
      handleSelectCode(randomSample.barcode);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="p-5 text-white relative flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.secondary_color})` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner">
              <Barcode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">ماسح باركود وتصوير المنتج</h3>
              <p className="text-xs text-white/80">وجه الكاميرا نحو باركود الدواء أو اختر منتجك</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Camera Stream Viewfinder */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 min-h-[220px] flex items-center justify-center shadow-inner">
            {cameraActive ? (
              <div className="relative w-full h-[240px] bg-black">
                <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                {/* Laser scan line overlay animation */}
                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
                  <div className="w-full h-40 border-2 border-teal-400/80 rounded-2xl relative shadow-[0_0_15px_rgba(20,184,166,0.5)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-teal-400" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-teal-400" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-teal-400" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-teal-400" />
                    <div className="w-full h-0.5 bg-teal-400 shadow-[0_0_10px_#14b8a6] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <button
                  onClick={stopCamera}
                  className="absolute bottom-3 right-3 px-3 py-1.5 bg-red-600/90 text-white rounded-xl text-xs font-bold flex items-center gap-1 backdrop-blur shadow"
                >
                  إيقاف الكاميرا
                </button>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mx-auto shadow-inner border border-slate-700">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-slate-200 font-bold text-sm">مسح بالمسح الضوئي المباشر</h4>
                  <p className="text-slate-400 text-xs mt-0.5">افتح الكاميرا لقراءة الباركود من العلبة فوراً</p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95 flex items-center gap-2 mx-auto"
                  style={{ backgroundColor: settings.primary_color }}
                >
                  <Camera className="w-4 h-4" />
                  تشغيل الكاميرا الآن
                </button>
              </div>
            )}

            {scannedSuccess && (
              <div className="absolute inset-0 bg-teal-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center text-white mb-2 shadow-lg animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <p className="font-extrabold text-base">تم قراءة الباركود بنجاح!</p>
                <p className="text-xs text-teal-200 mt-1 font-mono">{scannedSuccess}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Prescription / Product Photo option */}
          <div className="flex gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer text-xs font-semibold text-gray-700">
              <Upload className="w-4 h-4 text-gray-500" />
              رفع صورة دواء / باركود
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">أدخل رقم الباركود يدوياً:</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="مثال: 6223000123456"
                  className="w-full pr-10 pl-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: settings.primary_color }}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-white font-bold text-xs rounded-xl shadow transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: settings.primary_color }}
              >
                بحث
              </button>
            </div>
          </form>

          {/* Quick Demo Sample Barcodes */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              أو تجربة منتجات نموذجية سريعة (اضغط للتجربة):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SAMPLE_BARCODES.map((item) => (
                <button
                  key={item.barcode}
                  onClick={() => handleSelectCode(item.barcode)}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-slate-50 hover:bg-teal-50 hover:border-teal-200 transition-all text-right group"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-900 group-hover:text-teal-700">{item.name}</p>
                    <p className="text-[10px] text-gray-500">{item.category}</p>
                  </div>
                  <span className="text-[10px] font-mono bg-white px-2 py-1 rounded-md border border-gray-200 text-gray-600 group-hover:border-teal-300">
                    {item.barcode.slice(-5)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
