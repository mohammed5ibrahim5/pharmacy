import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Upload, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from './shared';

type ImportRow = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown, fallback = 0): number {
  const parsed = Number(String(value ?? '').replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function InventoryImportModal({ lockedPharmacyId, onClose, onSaved }: { lockedPharmacyId?: string; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null);

  const normalized = useMemo(() => rows.map((row) => ({
    name: text(row.name || row['اسم المنتج'] || row.product_name),
    name_en: text(row.name_en || row['الاسم بالإنجليزية']),
    price: number(row.price || row['السعر']),
    stock_quantity: Math.max(0, Math.floor(number(row.stock_quantity || row.stock || row['المخزون']))),
    reorder_level: Math.max(0, Math.floor(number(row.reorder_level || row['حد إعادة الطلب'], 5))),
    barcode: text(row.barcode || row['الباركود']),
    pharmacy_id: lockedPharmacyId || text(row.pharmacy_id || row['معرف الصيدلية']),
  })).filter((row) => row.name), [rows, lockedPharmacyId]);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: '' });
      if (!parsed.length) throw new Error('الملف لا يحتوي على صفوف بيانات.');
      setRows(parsed);
      setFileName(file.name);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'تعذر قراءة الملف.');
    }
  };

  const handleImport = async () => {
    if (!normalized.length || saving) return;
    const invalid = normalized.find((row) => !row.pharmacy_id || row.price < 0);
    if (invalid) {
      setError('كل صف يجب أن يحتوي على صيدلية وسعر صالح.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const barcodes = normalized.map((row) => row.barcode).filter(Boolean);
      const existingResult = barcodes.length
        ? await supabase.from('products').select('id, barcode').in('barcode', barcodes)
        : { data: [], error: null };
      if (existingResult.error) throw existingResult.error;
      const existing = new Map((existingResult.data || []).map((row) => [row.barcode, row.id]));
      let inserted = 0;
      let updated = 0;
      for (const row of normalized) {
        const payload = {
          name: row.name,
          name_en: row.name_en || null,
          price: row.price,
          stock_quantity: row.stock_quantity,
          reorder_level: row.reorder_level,
          barcode: row.barcode || null,
          pharmacy_id: row.pharmacy_id,
          is_available: row.stock_quantity > 0,
          updated_at: new Date().toISOString(),
        };
        const productId = row.barcode ? existing.get(row.barcode) : undefined;
        const response = productId
          ? await supabase.from('products').update(payload).eq('id', productId)
          : await supabase.from('products').insert(payload);
        if (response.error) throw response.error;
        if (productId) updated += 1;
        else inserted += 1;
      }
      setResult({ inserted, updated });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر استيراد المنتجات.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="استيراد مخزون من Excel" wide>
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50/60 p-5 text-center">
          <FileSpreadsheet className="mx-auto h-9 w-9 text-teal-600" />
          <p className="mt-2 text-sm font-black text-slate-800">اختر ملف Excel أو CSV</p>
          <p className="mt-1 text-xs font-bold text-slate-500">الأعمدة المدعومة: name, price, stock_quantity, reorder_level, barcode, pharmacy_id</p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700">
            <Upload className="h-4 w-4" /> اختيار الملف
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>
          {fileName && <p className="mt-3 text-xs font-bold text-teal-700">{fileName}</p>}
        </div>

        {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
        {result && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />تم تحديث {result.updated} وإضافة {result.inserted} منتج.</div>}

        {normalized.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[620px] text-xs">
              <thead className="bg-slate-50 text-slate-500"><tr><th className="p-2 text-right">المنتج</th><th className="p-2 text-right">السعر</th><th className="p-2 text-right">المخزون</th><th className="p-2 text-right">حد الطلب</th><th className="p-2 text-right">الباركود</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{normalized.slice(0, 20).map((row, index) => <tr key={`${row.name}-${index}`}><td className="p-2 font-bold">{row.name}</td><td className="p-2">{row.price}</td><td className="p-2">{row.stock_quantity}</td><td className="p-2">{row.reorder_level}</td><td className="p-2 font-mono">{row.barcode || '-'}</td></tr>)}</tbody>
            </table>
            {normalized.length > 20 && <p className="border-t border-slate-100 p-2 text-center text-[11px] font-bold text-slate-400">تتم معاينة أول 20 صفًا من أصل {normalized.length}</p>}
          </div>
        )}

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button type="button" onClick={handleImport} disabled={!normalized.length || saving} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />{saving ? 'جاري الاستيراد...' : 'اعتماد الاستيراد'}</button>
          <button type="button" onClick={onClose} className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600"><X className="h-4 w-4" />إلغاء</button>
        </div>
      </div>
    </Modal>
  );
}
