import { useState, useEffect } from 'react';
import { Lock, Mail, ArrowRight, Eye, EyeOff, Cross, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { translateError } from '@/lib/errorMessages';

export function AdminLoginPage() {
  const { signIn, user, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = `لوحة التحكم - ${settings.site_name}`;
  }, [settings.site_name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);
    if (signInError) {
      const translated = translateError(signInError);
      setError(translated.hint ? `${translated.ar} — ${translated.hint}` : translated.ar);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" dir="rtl">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: settings.primary_color }} />
        <div className="absolute -bottom-1/4 -left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ backgroundColor: settings.accent_color }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: settings.primary_color }}>
            <Cross className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-white">لوحة تحكم {settings.site_name}</h1>
          <p className="text-gray-400 text-sm mt-2">تسجيل دخول المدير</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full pr-11 pl-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent focus:ring-2 text-sm"
                  style={{ ['--tw-ring-color' as string]: settings.primary_color }}
                  placeholder="admin@saydaliati.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full pr-11 pl-11 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-transparent focus:ring-2 text-sm"
                  style={{ ['--tw-ring-color' as string]: settings.primary_color }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium transition-all hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: settings.primary_color }}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>دخول <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-xs mt-6">هذه الصفحة خاصة بمدير الموقع فقط</p>
      </div>
    </div>
  );
}
