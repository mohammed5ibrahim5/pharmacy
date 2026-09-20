import { supabase } from '@/lib/supabase';

// يستخرج مسار الملف داخل البوكيت من الرابط المخزن
export function extractStoragePathFromUrl(bucket: string, url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  try {
    return decodeURIComponent(url.slice(idx + marker.length));
  } catch {
    return url.slice(idx + marker.length);
  }
}

// يحوّل الرابط العام المخزن إلى رابط موقع (signed) للبوكيتات الخاصة
export async function signedImageUrl(bucket: string, url: string | null | undefined, expiresIn = 3600): Promise<string> {
  const path = extractStoragePathFromUrl(bucket, url);
  if (!path) return url || '';
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return url || '';
  return (data as { signedUrl: string }).signedUrl;
}