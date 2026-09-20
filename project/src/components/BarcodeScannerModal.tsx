import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Barcode, Check, AlertCircle, Upload, Loader2, ShoppingCart, PackageCheck } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { useOrder } from '@/context/OrderContext';
import { lookupProductByBarcode } from '@/lib/rxCart';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (barcodeOrQuery: string) => void;
}

interface ScannedCartItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

interface BarcodeDetectorResult {
  rawValue: string;
}

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

interface BarcodeDetectorConstructorLike {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
}

export function BarcodeScannerModal({ open, onClose, onScan }: BarcodeScannerModalProps) {
  const { themeColors } = useSettings();
  const { t } = useLanguage();
  const { addToCart, openCart } = useOrder();
  const [cameraActive, setCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);
  const [cartAdded, setCartAdded] = useState<ScannedCartItem[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setScannedSuccess(null);
      setError(null);
      setResolving(false);
      setLastAdded(null);
    }
  }, [open]);

  useEffect(() => {
    if (cameraActive && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

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
        setError(t('الكاميرا غير مدعومة في المتصفح الحالي، يمكنك كتابة الباركود أو اختيار نموذج أدناه.'));
      }
    } catch {
      setError(t('تعذر الوصول إلى الكاميرا. يرجى تفعيل الإذن أو تجربة العينات السريعة.'));
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

  const handleSelectCode = async (code: string) => {
    const plain = code.trim();
    // فقط الأكواد الرقمية المرشحة لباركود حقيقي تُضاف للسلة؛
    // النصوص أو الأكواد غير المعروفة تعمل بحثاً كما كان الحال
    if (/^\d{6,16}$/.test(plain)) {
      setResolving(true);
      const product = await lookupProductByBarcode(plain).catch(() => null);
      setResolving(false);
      if (product) {
        const ok = addToCart(product, product.pharmacy?.name, 1);
        if (ok) {
          setCartAdded((prev) => {
            const ex = prev.find((i) => i.id === product.id);
            return ex
              ? prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i))
              : [...prev, { id: product.id, name: product.name, qty: 1, price: product.price }];
          });
          setLastAdded(product.name);
          return;
        }
      }
    }
    setScannedSuccess(plain);
    setTimeout(() => {
      onScan(plain);
      onClose();
    }, 600);
  };

  useEffect(() => {
    if (!cameraActive || !videoRef.current) return;
    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector;
    if (!detectorConstructor) {
      setError(t('المتصفح لا يدعم قراءة الباركود تلقائياً. اكتب الكود يدوياً أو ارفع صورة واضحة.'));
      return;
    }
    const detector = new detectorConstructor({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'] });
    let active = true;
    const scan = async () => {
      const video = videoRef.current;
      if (!active || !video) return;
      if (video.readyState >= 2) {
        try {
          const results = await detector.detect(video);
          const value = results[0]?.rawValue?.trim();
          if (value) {
            active = false;
            stopCamera();
            await handleSelectCode(value);
            return;
          }
        } catch {
          // Keep scanning; camera frames can be unavailable briefly on mobile.
        }
      }
      scanFrameRef.current = requestAnimationFrame(scan);
    };
    scan();
    return () => {
      active = false;
      if (scanFrameRef.current !== null) cancelAnimationFrame(scanFrameRef.current);
    };
  }, [cameraActive]);

  const finishToCart = () => {
    const total = cartAdded.reduce((sum, i) => sum + i.price * i.qty, 0);
    if (total > 0) {
      openCart('cart');
      onClose();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleSelectCode(manualCode.trim());
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const detectorConstructor = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructorLike }).BarcodeDetector;
    if (!detectorConstructor) {
      setError(t('المتصفح لا يدعم قراءة الباركود من الصور. استخدم الكاميرا أو اكتب الكود يدوياً.'));
      return;
    }
    try {
      const detector = new detectorConstructor({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'qr_code'] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close();
      const value = results[0]?.rawValue?.trim();
      if (value) await handleSelectCode(value);
      else setError(t('لم نتمكن من قراءة باركود واضح من الصورة.'));
    } catch {
      setError(t('تعذر قراءة الصورة. جرّب صورة أوضح أو اكتب الكود يدوياً.'));
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative border border-gray-100 flex flex-col max-h-[90vh]"
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
              <Barcode className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg leading-tight">{t('ماسح باركود وتصوير المنتج')}</h3>
              <p className="text-xs text-white/80">{t('وجه الكاميرا نحو باركود الدواء أو اختر منتجك')}</p>
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
                    <div className="absolute top-0 start-0 w-4 h-4 border-t-4 border-s-4 border-teal-400" />
                    <div className="absolute top-0 end-0 w-4 h-4 border-t-4 border-e-4 border-teal-400" />
                    <div className="absolute bottom-0 start-0 w-4 h-4 border-b-4 border-s-4 border-teal-400" />
                    <div className="absolute bottom-0 end-0 w-4 h-4 border-b-4 border-e-4 border-teal-400" />
                    <div className="w-full h-0.5 bg-teal-400 shadow-[0_0_10px_#14b8a6] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                </div>
                <button
                  onClick={stopCamera}
                  className="absolute bottom-3 end-3 px-3 py-1.5 bg-red-600/90 text-white rounded-xl text-xs font-bold flex items-center gap-1 backdrop-blur shadow"
                >
                  {t('إيقاف الكاميرا')}
                </button>
              </div>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mx-auto shadow-inner border border-slate-700">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-slate-200 font-bold text-sm">{t('مسح بالمسح الضوئي المباشر')}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">{t('افتح الكاميرا لقراءة الباركود من العلبة فوراً')}</p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg transition-transform hover:scale-[1.03] active:scale-95 flex items-center gap-2 mx-auto"
                  style={{ backgroundColor: themeColors.priceColor }}
                >
                  <Camera className="w-4 h-4" />
                  {t('تشغيل الكاميرا الآن')}
                </button>
              </div>
            )}

            {resolving && (
              <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 animate-fade-in">
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: themeColors.priceColor }} />
                <p className="font-extrabold text-sm mt-3">{t('جاري البحث عن المنتج في الكتالوج...')}</p>
              </div>
            )}

            {lastAdded && !resolving && (
              <div className="absolute inset-0 bg-teal-900/95 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center text-white mb-2 shadow-lg">
                  <Check className="w-8 h-8" />
                </div>
                <p className="font-extrabold text-base">{t('أُضيف للسلة ✓')}</p>
                <p className="text-xs text-teal-200 mt-1 text-center max-w-[260px] leading-relaxed break-words">{lastAdded}</p>
                <div className="w-full max-w-[260px] grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => setLastAdded(null)}
                    className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-colors"
                  >
                    {t('متابعة المسح')}
                  </button>
                  <button
                    onClick={finishToCart}
                    className="px-3 py-2 rounded-xl bg-white text-teal-800 text-xs font-black shadow transition-transform hover:scale-[1.03]"
                  >
                    {t('الانتقال للسلة')}
                  </button>
                </div>
              </div>
            )}

            {scannedSuccess && !resolving && !lastAdded && (
              <div className="absolute inset-0 bg-teal-900/90 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center text-white mb-2 shadow-lg animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <p className="font-extrabold text-base">{t('تم قراءة الباركود بنجاح!')}</p>
                <p className="text-xs text-teal-200 mt-1 font-mono">{scannedSuccess}</p>
              </div>
            )}
          </div>

          {cartAdded.length > 0 && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-4 h-4 text-teal-700" />
                <p className="text-xs font-black text-teal-800">{t('سلتك من المسح (تابع المسح أو أنهِ الآن)')}</p>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {cartAdded.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-teal-100">
                    <p className="text-[11px] font-bold text-gray-800 truncate min-w-0">{item.name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-black text-gray-500">× {item.qty}</span>
                      <span className="text-[10px] font-black tabular-nums" style={{ color: themeColors.priceColor }}>
                        {item.price * item.qty} ج.م
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-teal-100">
                <span className="text-xs font-black text-gray-800">
                  {t('الإجمالي')}: <span className="tabular-nums" style={{ color: themeColors.priceColor }}>{cartAdded.reduce((s, i) => s + i.price * i.qty, 0)} ج.م</span>
                </span>
                <button
                  onClick={finishToCart}
                  className="px-4 py-2 text-white text-xs font-black rounded-xl shadow flex items-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: themeColors.priceColor }}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  {t('الذهاب للسلة')}
                </button>
              </div>
            </div>
          )}

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
              {t('رفع صورة دواء / باركود')}
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-xs font-bold text-gray-700">{t('أدخل رقم الباركود يدوياً:')}</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Barcode className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={t('مثال: 6223000123456')}
                  className="w-full ps-10 pe-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                  style={{ ['--tw-ring-color' as string]: themeColors.priceColor }}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 text-white font-bold text-xs rounded-xl shadow transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: themeColors.priceColor }}
              >
                {t('بحث')}
              </button>
            </div>
          </form>

          {/* Barcode guidance */}
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-start gap-1.5 text-xs font-bold text-gray-500 leading-relaxed">
              <Barcode className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
              {t('استخدم باركود المنتج الموجود في مخزون الصيدلية أو أدخل الرقم يدوياً للبحث في الكتالوج.')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
