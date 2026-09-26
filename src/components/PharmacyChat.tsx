import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Minimize2 } from 'lucide-react';
import { useCustomer } from '@/context/CustomerContext';
import { useSettings } from '@/context/SettingsContext';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  pharmacy_id: string;
  customer_id: string;
  sender: 'customer' | 'pharmacy';
  text: string;
  created_at: string;
}

interface PharmacyChatProps {
  pharmacyId: string;
  pharmacyName: string;
}

function timeAgo(iso: string, t: (s: string) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('الآن');
  if (mins < 60) return t(`منذ ${mins} دقيقة`);
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t(`منذ ${hours} ساعة`);
  const days = Math.floor(hours / 24);
  return t(`منذ ${days} يوم`);
}

export function PharmacyChat({ pharmacyId, pharmacyName }: PharmacyChatProps) {
  const { user, setAuthModalOpen } = useCustomer();
  const { themeColors, darkMode } = useSettings();
  const { t, lang } = useLanguage();
  const isRtl = lang === 'ar';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing messages
  useEffect(() => {
    if (!open || !user) return;

    const loadMessages = async () => {
      const { data, error } = await supabase
        .from('pharmacy_chats')
        .select('*')
        .eq('pharmacy_id', pharmacyId)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data as ChatMessage[]);
      }
    };

    loadMessages();
  }, [open, user, pharmacyId]);

  // Realtime subscription
  useEffect(() => {
    if (!open || !user) return;

    const channel = supabase
      .channel(`pharmacy-chat-${pharmacyId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'pharmacy_chats',
          filter: `pharmacy_id=eq.${pharmacyId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          if (newMsg.customer_id === user.id) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, user, pharmacyId]);

  const handleSend = async () => {
    if (!user || !text.trim() || sending) return;
    const trimmed = text.trim();
    setText('');
    setSending(true);

    const { data, error } = await supabase
      .from('pharmacy_chats')
      .insert({
        pharmacy_id: pharmacyId,
        customer_id: user.id,
        sender: 'customer',
        text: trimmed,
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data as ChatMessage]);
    }

    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const bgColor = darkMode ? '#111827' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#1e2a4a';
  const mutedText = darkMode ? '#94a3b8' : '#6b7a93';
  const borderColor = darkMode ? '#1e293b' : '#e2e8f0';
  const inputBg = darkMode ? '#1e293b' : '#f8fafc';

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => {
          if (!user) {
            setAuthModalOpen(true);
            return;
          }
          setOpen((o) => !o);
        }}
        className="fixed z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          bottom: '5.5rem',
          left: '1.25rem',
          backgroundColor: themeColors.primaryColor,
          boxShadow: `0 10px 25px -6px ${themeColors.primaryColor}88`,
        }}
        aria-label={t('المحادثة')}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && (
          <span
            className="absolute -top-1 -end-1 w-4 h-4 rounded-full animate-pulse"
            style={{ backgroundColor: '#22c55e' }}
          />
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-3xl shadow-2xl border"
          style={{
            bottom: '9rem',
            left: '1.25rem',
            width: 'min(22rem, calc(100vw - 2.5rem))',
            height: 'min(36rem, calc(100vh - 12rem))',
            backgroundColor: bgColor,
            borderColor: borderColor,
          }}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ backgroundColor: themeColors.primaryColor }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{pharmacyName}</h4>
                <span className="text-[10px] text-white/70 font-medium">{t('المحادثة المباشرة')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t('تصغير')}
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                aria-label={t('إغلاق')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${themeColors.primaryColor}15` }}
                >
                  <MessageCircle className="w-8 h-8" style={{ color: themeColors.primaryColor }} />
                </div>
                <p className="text-sm font-bold" style={{ color: textColor }}>
                  {t('ابدأ محادثتك')}
                </p>
                <p className="text-xs mt-1" style={{ color: mutedText }}>
                  {t('أرسل سؤالك للصيدلية وسنرد عليك فوراً')}
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isCustomer = msg.sender === 'customer';
              return (
                <div
                  key={msg.id}
                  className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                      isCustomer ? 'rounded-br-md' : 'rounded-bl-md'
                    }`}
                    style={{
                      backgroundColor: isCustomer ? themeColors.primaryColor : (darkMode ? '#1e293b' : '#f1f5f9'),
                      color: isCustomer ? '#ffffff' : textColor,
                    }}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                    <span
                      className="block text-[10px] mt-1 font-medium"
                      style={{ color: isCustomer ? 'rgba(255,255,255,0.65)' : mutedText }}
                    >
                      {timeAgo(msg.created_at, t)}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="shrink-0 px-3 py-3 border-t"
            style={{ borderColor: borderColor, backgroundColor: bgColor }}
          >
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('اكتب رسالتك...')}
                className="flex-1 text-sm rounded-xl px-3.5 py-2.5 outline-none transition-colors font-medium placeholder:opacity-50"
                style={{
                  backgroundColor: inputBg,
                  color: textColor,
                  borderColor: borderColor,
                }}
                disabled={sending}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                style={{ backgroundColor: themeColors.primaryColor }}
                aria-label={t('إرسال')}
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
