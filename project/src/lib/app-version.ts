export const APP_VERSION = '1.0.0';
export const BUILD_DATE = '2026-09-19';

export interface VersionInfo {
  version: string;
  buildDate: string;
  releaseNotes?: string;
  downloadUrl?: string;
  mandatory?: boolean;
}

export async function checkForUpdate(): Promise<VersionInfo | null> {
  try {
    const res = await fetch('https://your-api.com/api/app-version', {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return await res.json();
  } catch {}
  return null;
}

export function isNewerVersion(remote: string, current: string = APP_VERSION): boolean {
  const r = remote.split('.').map(Number);
  const c = current.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const rv = r[i] || 0;
    const cv = c[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
}

export function getVersionBanner(): string {
  return `v${APP_VERSION} (${BUILD_DATE})`;
}
