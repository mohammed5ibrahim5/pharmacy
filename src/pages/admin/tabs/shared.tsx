import React from 'react';
import { X, ImageIcon } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';

export const inputClass = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent focus:ring-2 text-sm text-gray-900";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>{children}</div>;
}

export function FeatureToggle({
  icon, title, desc, checked, onChange, color,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`text-right p-4 rounded-xl border-2 transition-all ${checked ? 'border-teal-500 bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${checked ? 'text-white' : 'text-gray-400 bg-gray-100'}`}
            style={checked ? { backgroundColor: color } : {}}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900">{title}</p>
            <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{desc}</p>
          </div>
        </div>
        <span className={`relative inline-flex w-10 h-6 shrink-0 items-center rounded-full px-0.5 transition-colors ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}>
          <span className={`inline-block w-4 h-4 rounded-full bg-white shadow transition-all ${checked ? 'mr-4' : 'mr-0'}`} />
        </span>
      </div>
    </button>
  );
}

export function Modal({ children, onClose, title, wide }: { children: React.ReactNode; onClose: () => void; title: string; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-white rounded-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function ImageUrlField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <ImageUploader label={label} value={value} onChange={onChange} />;
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-1.5">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent text-sm text-gray-600 focus:outline-none" dir="ltr" />
      </div>
    </div>
  );
}

export function withAlphaHex(hex: string, alpha: number): string {
  if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export function SettingsSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-50"><span className="text-gray-400">{icon}</span><h3 className="font-bold text-gray-900">{title}</h3></div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all text-right ${checked ? 'bg-teal-50/50 border-teal-200' : 'bg-gray-50/50 border-gray-200'}`}
    >
      <span className="min-w-0">
        <span className="block text-xs font-bold text-gray-800">{label}</span>
        {hint && <span className="block text-[11px] text-gray-400 mt-0.5">{hint}</span>}
      </span>
      <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? 'left-0.5' : 'left-[1.4rem]'}`} />
      </span>
    </button>
  );
}

export function slugifyEn(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'med';
}
