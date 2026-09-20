import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, PackagePlus, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal, inputClass } from './shared';

interface Batch {
  id: string;
  batch_number: string;
  expiry_date: string | null;
  available_quantity: number;
  status: string;
}

export function InventoryBatchModal({ productId, productName, onClose, onSaved }: { productId: string; productName: string; onClose: () => void; onSaved: () => void }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [movementType, setMovementType] = useState<'receipt' | 'damage' | 'expiry'>('receipt');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase.from('inventory_batches').select('id, batch_number, expiry_date, available_quantity, status').eq('product_id', productId).order('expiry_date');
    if (fetchError) setError(fetchError.message);
    setBatches((data || []) as Batch[]);
    setLoading(false);
  }, [productId]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const handleSave = async () => {
    const parsedQuantity = Math.floor(Number(quantity));
    if (!batchNumber.trim() || !parsedQuantity || parsedQuantity < 1) {
      setError('أدخل رقم التشغيلة وكمية صحيحة.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: saveError } = await supabase.rpc('record_inventory_adjustment', {
      p_product_id: productId,
      p_batch_number: batchNumber.trim(),
      p_expiry_date: expiryDate || null,
      p_quantity: parsedQuantity,
      p_movement_type: movementType,
      p_note: note.trim() || null,
    });
    if (saveError) setError(saveError.message);
    else {
      setBatchNumber('');
      setExpiryDate('');
      setQuantity('');
      setNote('');
      await fetchBatches();
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Modal onClose={onClose} title={`تشغيلات المخزون: ${productName}`} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-black text-slate-600">رقم التشغيلة<input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} className={inputClass} placeholder="LOT-2026-01" dir="ltr" /></label>
          <label className="text-xs font-black text-slate-600">تاريخ الانتهاء<input value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={inputClass} type="date" dir="ltr" /></label>
          <label className="text-xs font-black text-slate-600">الكمية<input value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputClass} type="number" min="1" dir="ltr" /></label>
          <label className="text-xs font-black text-slate-600">نوع الحركة<select value={movementType} onChange={(e) => setMovementType(e.target.value as typeof movementType)} className={inputClass}><option value="receipt">استلام جديد</option><option value="damage">تالف</option><option value="expiry">منتهي الصلاحية</option></select></label>
          <label className="text-xs font-black text-slate-600">ملاحظة<input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} placeholder="سبب الحركة" /></label>
          <button type="button" onClick={handleSave} disabled={saving} className="flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50 sm:col-span-2 lg:col-span-5"><Save className="h-4 w-4" />{saving ? 'جاري التسجيل...' : 'تسجيل حركة المخزون'}</button>
        </div>

        {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"><AlertTriangle className="h-4 w-4" />{error}</div>}
        <div>
          <h4 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-800"><PackagePlus className="h-4 w-4 text-teal-600" />التشغيلات الحالية</h4>
          {loading ? <div className="h-16 animate-pulse rounded-xl bg-slate-100" /> : batches.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-xs font-bold text-slate-400">لا توجد تشغيلات مسجلة بعد.</p> : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-3 text-right">التشغيلة</th><th className="p-3 text-right">الانتهاء</th><th className="p-3 text-right">المتاح</th><th className="p-3 text-right">الحالة</th></tr></thead><tbody className="divide-y divide-slate-100">{batches.map((batch) => <tr key={batch.id}><td className="p-3 font-mono font-bold">{batch.batch_number}</td><td className="p-3">{batch.expiry_date ? <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-slate-400" />{batch.expiry_date}</span> : '-'}</td><td className="p-3 font-black">{batch.available_quantity}</td><td className="p-3">{batch.status === 'expired' ? <span className="text-rose-600">منتهي</span> : batch.status === 'depleted' ? <span className="text-slate-400">نفد</span> : <span className="text-emerald-600">نشط</span>}</td></tr>)}</tbody></table></div>}
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-4"><button type="button" onClick={onClose} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600"><X className="h-4 w-4" />إغلاق</button></div>
      </div>
    </Modal>
  );
}
