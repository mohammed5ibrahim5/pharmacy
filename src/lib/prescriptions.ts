import { supabase } from '@/lib/supabase';

export type PrescriptionStatus = 'new' | 'reviewing' | 'preparing' | 'completed' | 'cancelled';

export interface Prescription {
  id: string;
  customer_id: string | null;
  image_url: string;
  phone: string;
  notes: string | null;
  status: PrescriptionStatus;
  created_at: string;
  customer?: { full_name: string | null } | null;
}

export const PRESCRIPTION_STATUSES: PrescriptionStatus[] = [
  'new',
  'reviewing',
  'preparing',
  'completed',
  'cancelled',
];

export const PRESCRIPTION_STATUS_META: Record<
  PrescriptionStatus,
  { label: string; className: string; dot: string }
> = {
  new: { label: 'جديدة', className: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  reviewing: { label: 'قيد المراجعة', className: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  preparing: { label: 'جاري التجهيز', className: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  completed: { label: 'مكتملة', className: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500' },
  cancelled: { label: 'ملغاة', className: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
};

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(',');
  const mime = (head.match(/data:([^;]+)/) || [])[1] || 'image/png';
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadPrescriptionImage(dataUrl: string): Promise<string> {
  const path = `rx_${Date.now()}_${Math.random().toString(36).slice(2)}.png`;
  const blob = dataUrlToBlob(dataUrl);
  const { error } = await supabase.storage
    .from('prescriptions')
    .upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('prescriptions').getPublicUrl(path);
  return data.publicUrl;
}

export async function insertPrescription(payload: {
  customerId: string | null;
  imageUrl: string;
  phone: string;
  notes: string;
}) {
  const { error } = await supabase.from('prescriptions').insert({
    customer_id: payload.customerId,
    image_url: payload.imageUrl,
    phone: payload.phone,
    notes: payload.notes || null,
    status: 'new',
  });
  if (error) throw error;
}

export async function deletePrescription(id: string, imageUrl: string) {
  try {
    const path = imageUrl.split('/').pop();
    if (path) {
      await supabase.storage.from('prescriptions').remove([path]);
    }
  } catch {
    // ignore storage removal failures
  }
  const { error } = await supabase.from('prescriptions').delete().eq('id', id);
  if (error) throw error;
}
