import { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from './shared';

type ImportRow = Record<string, unknown>;

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function number(value: unknown): number | null {
  const raw = String(value ?? '').replace(/,/g, '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

interface NormalizedRow {
  barcode: string;
  pharmacy_id: string;
  price: number | null;
  stock_quantity: number | null;
  reorder_level: number;
}

export function InventoryImportModal({
  lockedPharmacyId,
  onClose,
  onSaved,
}: {
  lockedPharmacyId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  const normalized = useMemo<NormalizedRow[]>(
    () =>
      rows.map((row) => ({
        barcode: text(row.barcode) || text(row['الباركود']),
        price: number(text(row.price) || row['السعر']),
        stock_quantity: number(
          text(row.stock_quantity) || text(row.stock) || row['المخزون'],
        ),
        reorder_level: number(
          text(row.reorder_level) || row['حد إعادة الطلب'],
        ) ?? 5,
        pharmacy_id:
          lockedPharmacyId ||
          text(row.pharmacy_id) || text(row['معرف الصيدلية']),
      })),
    [rows, lockedPharmacyId],
  );

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json<ImportRow>(sheet, {
        defval: '',
      });
      if (!parsed.length) throw new Error('الملف لا يحتوي على صفوف بيانات.');
      if (parsed.length > 500) {
        throw new Error('الحد الأقصى للاستيراد هو 500 صف في الملف الواحد.');
      }
      setRows(parsed);
      setFileName(file.name);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'تعذر قراءة الملف.');
    }
  };

  const handleImport = async () => {
    if (!normalized.length || saving) return;
    const seen = new Set<string>();
    const invalidIndex = normalized.findIndex((row) => {
      const key = `${row.pharmacy_id}:${row.barcode}`;
      const invalid =
        !row.pharmacy_id ||
        !row.barcode ||
        row.price === null ||
        row.price < 0 ||
        row.stock_quantity === null ||
        row.stock_quantity < 0 ||
        !Number.isInteger(row.stock_quantity) ||
        row.reorder_level < 0 ||
        !Number.isInteger(row.reorder_level) ||
        seen.has(key);
      seen.add(key);
      return invalid;
    });
    if (invalidIndex !== -1) {
      setError(
        `راجع الصف رقم ${invalidIndex + 2}: يلزم باركود فريد وسعر ومخزون صحيحان لكل منتج.`,
      );
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data, error: importError } = await supabase.rpc(
        'import_pharmacy_inventory',
        {
          p_rows: normalized.map((row) => ({
            pharmacy_id: row.pharmacy_id,
            barcode: row.barcode,
            price: row.price,
            stock_quantity: row.stock_quantity,
            reorder_level: row.reorder_level,
          })),
        },
      );
      if (importError) throw importError;
      setResult(Number(data?.updated ?? 0));
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'تعذر تحديث المخزون. لم يتم اعتماد الصفوف غير الصالحة.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} title="تحديث مخزون من Excel أو CSV" wide>
      <div className="space-y-4">
        <div className="rounded-2xl border border-dashed border-teal-300 bg-teal-50/60 p-5 text-center">
          <FileSpreadsheet className="mx-auto h-9 w-9 text-teal-600" />
          <p className="mt-2 text-sm font-black text-slate-800">
            اختر ملف Excel أو CSV
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            الأعمدة المطلوبة: barcode, price, stock_quantity. يحتاج الأدمن
            أيضًا إلى pharmacy_id. يتم تحديث المنتجات الموجودة فقط.
          </p>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700">
            <Upload className="h-4 w-4" /> اختيار الملف
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          {fileName && (
            <p className="mt-3 text-xs font-bold text-teal-700">{fileName}</p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {result !== null && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            تم تحديث بيانات {result} منتج. لم تتم إضافة منتجات جديدة.
          </div>
        )}

        {normalized.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[620px] text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2 text-right">الصيدلية</th>
                  <th className="p-2 text-right">السعر</th>
                  <th className="p-2 text-right">المخزون</th>
                  <th className="p-2 text-right">حد الطلب</th>
                  <th className="p-2 text-right">الباركود</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {normalized.slice(0, 20).map((row, index) => (
                  <tr key={`${row.pharmacy_id}-${row.barcode}-${index}`}>
                    <td className="p-2 font-mono">{row.pharmacy_id || '—'}</td>
                    <td className="p-2">{row.price ?? '—'}</td>
                    <td className="p-2">{row.stock_quantity ?? '—'}</td>
                    <td className="p-2">{row.reorder_level}</td>
                    <td className="p-2 font-mono">{row.barcode || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {normalized.length > 20 && (
              <p className="border-t border-slate-100 p-2 text-center text-[11px] font-bold text-slate-400">
                تتم معاينة أول 20 صفًا من أصل {normalized.length}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleImport}
            disabled={!normalized.length || saving || result !== null}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {saving ? 'جاري التحديث...' : 'اعتماد التحديث'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600"
          >
            <X className="h-4 w-4" />
            {result !== null ? 'إغلاق' : 'إلغاء'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
