import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, Users, User, Search, ChevronLeft,
  CheckCircle2, X, Clock, Check, Pencil,
  MessageSquare,
} from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { useGroups } from '../hooks/useGroups';
import { useStudents } from '../hooks/useStudents';
import { useMessages, useMessageTemplates, useSendMessage } from '../hooks/useMessages';
import type { Message, Group, MessageTemplate } from '../types';
import { cn } from '../utils/cn';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_CHARS = 1000;

const FALLBACK_TEMPLATES: MessageTemplate[] = [
  {
    id: 't1', key: 'payment_reminder', title: "To'lov eslatmasi",
    content: "Hurmatli ota-ona, farzandingizning oylik to'lov muddati keldi. Iltimos, imkon qadar tezroq to'lov amalga oshiring.",
    created_at: '',
  },
  {
    id: 't2', key: 'class_cancelled', title: 'Dars bekor qilindi',
    content: "Hurmatli o'quvchi, bugungi dars texnik sabablarga ko'ra bekor qilindi. Keyingi dars jadvalga muvofiq bo'ladi.",
    created_at: '',
  },
  {
    id: 't3', key: 'exam_reminder', title: 'Imtihon eslatmasi',
    content: "Eslatma: Yaqin kunlarda imtihon bo'ladi. Iltimos, o'tilgan mavzularni puxta takrorlab, tayyorgarlik ko'ring.",
    created_at: '',
  },
  {
    id: 't4', key: 'schedule_change', title: "Jadval o'zgarishi",
    content: "Hurmatli o'quvchi, dars jadvalida o'zgarish bo'ldi. Yangi jadval haqida ma'lumot olish uchun o'qituvchi bilan bog'laning.",
    created_at: '',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvatarColor(name: string): string {
  const colors = [
    { bg: 'rgba(0,122,255,0.12)', text: '#007AFF' },
    { bg: 'rgba(52,199,89,0.12)', text: '#34C759' },
    { bg: 'rgba(255,149,0,0.12)', text: '#FF9500' },
    { bg: 'rgba(90,200,250,0.15)', text: '#0A84FF' },
    { bg: 'rgba(175,82,222,0.12)', text: '#AF52DE' },
    { bg: 'rgba(255,59,48,0.10)', text: '#FF3B30' },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return JSON.stringify(colors[Math.abs(hash) % colors.length]);
}

function getColors(name: string) {
  try { return JSON.parse(getAvatarColor(name)); }
  catch { return { bg: 'rgba(0,122,255,0.12)', text: '#007AFF' }; }
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type Step = 'history' | 'recipients' | 'compose' | 'confirm' | 'success';
type RecipientTab = 'students' | 'groups';

export function MessagesPage() {
  const [step, setStep] = useState<Step>('history');
  const [recipientTab, setRecipientTab] = useState<RecipientTab>('students');
  const [search, setSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [messageText, setMessageText] = useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string | null>(null);
  const [detailMessage, setDetailMessage] = useState<Message | null>(null);
  const [sendResult, setSendResult] = useState<{ success: number; failed: number } | null>(null);

  const { data: messages = [], isLoading: messagesLoading } = useMessages();
  const { data: templatesRaw = [] } = useMessageTemplates();
  const { data: groups = [] } = useGroups();
  const { data: students = [] } = useStudents();
  const sendMutation = useSendMessage();

  const templates = templatesRaw.length > 0 ? templatesRaw : FALLBACK_TEMPLATES;

  const totalSelected = selectedStudents.size + selectedGroups.size;

  const resetFlow = () => {
    setStep('history');
    setSearch('');
    setSelectedStudents(new Set());
    setSelectedGroups(new Set());
    setMessageText('');
    setSelectedTemplateKey(null);
    setSendResult(null);
  };

  const handleTemplateClick = (t: MessageTemplate) => {
    if (selectedTemplateKey === t.key) {
      setSelectedTemplateKey(null);
    } else {
      setSelectedTemplateKey(t.key);
      setMessageText(t.content);
    }
  };

  const handleConfirmSend = async () => {
    const payloads = [
      ...[...selectedStudents].map((id) => ({
        student_id: id,
        group_id: null as string | null,
        template_key: selectedTemplateKey ?? 'custom',
        content: messageText,
      })),
      ...[...selectedGroups].map((id) => ({
        group_id: id,
        student_id: null as string | null,
        template_key: selectedTemplateKey ?? 'custom',
        content: messageText,
      })),
    ];

    // Telegram bot integration point:
    // In production, this should call the Telegram Bot API to deliver messages
    // to the registered chat IDs of students/groups.
    // Each payload maps to one sendMessage API call.

    const results = await Promise.allSettled(
      payloads.map((p) => sendMutation.mutateAsync(p))
    );
    const success = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    setSendResult({ success, failed });
    setStep('success');
  };

  // ── Recipient step filtered lists ──
  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.phone?.includes(q)
    );
  }, [students, search]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  return (
    <div className="min-h-screen bg-[#F5F5F7]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-6 max-w-3xl mx-auto">

          {/* ── History view ─────────────────────────────────── */}
          {step === 'history' && (
            <>
              {/* Page header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h1 className="text-[22px] font-bold text-[#1c1c1e] tracking-tight">Xabarlar</h1>
                  <p className="text-[13px] text-[#8e8e93] mt-0.5">Yuborilgan xabarlar tarixi</p>
                </div>
                <button
                  onClick={() => setStep('recipients')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[13px] font-semibold text-white transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                    boxShadow: '0 4px 16px rgba(0,122,255,0.32)',
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Xabar yuborish
                </button>
              </div>

              {/* Message list */}
              {messagesLoading ? (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04)' }}
                >
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(0,122,255,0.10)' }}
                  >
                    <MessageSquare className="w-8 h-8" style={{ color: '#007AFF' }} />
                  </div>
                  <p className="text-[15px] font-semibold text-[#1c1c1e]">Xabarlar yo'q</p>
                  <p className="text-[13px] text-[#8e8e93] mt-1">Birinchi xabaringizni yuboring</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((msg) => (
                    <MessageCard
                      key={msg.id}
                      message={msg}
                      groups={groups}
                      onClick={() => setDetailMessage(msg)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── Recipients step ────────────────────────────────── */}
          {step === 'recipients' && (
            <>
              {/* Top nav */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={resetFlow}
                  className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-[#8e8e93] hover:bg-[#F5F5F7] transition-colors"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-[17px] font-bold text-[#1c1c1e]">Qabul qiluvchilar</h2>
                  <p className="text-[12px] text-[#8e8e93]">Xabar yuborish uchun tanlang</p>
                </div>
                {totalSelected > 0 && (
                  <span
                    className="ml-auto text-[12px] font-bold px-2.5 py-1 rounded-xl"
                    style={{ background: 'rgba(0,122,255,0.12)', color: '#007AFF' }}
                  >
                    {totalSelected} tanlandi
                  </span>
                )}
              </div>

              {/* Tabs */}
              <div
                className="flex bg-white rounded-2xl p-1 mb-4"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
              >
                {(['students', 'groups'] as RecipientTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setRecipientTab(tab); setSearch(''); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all',
                      recipientTab === tab
                        ? 'text-white'
                        : 'text-[#8e8e93]'
                    )}
                    style={recipientTab === tab ? {
                      background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                      boxShadow: '0 2px 8px rgba(0,122,255,0.25)',
                    } : {}}
                  >
                    {tab === 'students' ? <User className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                    {tab === 'students' ? "O'quvchilar" : 'Guruhlar'}
                    {tab === 'students' && selectedStudents.size > 0 && (
                      <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-lg', recipientTab === tab ? 'bg-white/25 text-white' : 'bg-[#007AFF] text-white')}>
                        {selectedStudents.size}
                      </span>
                    )}
                    {tab === 'groups' && selectedGroups.size > 0 && (
                      <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-lg', recipientTab === tab ? 'bg-white/25 text-white' : 'bg-[#007AFF] text-white')}>
                        {selectedGroups.size}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#c7c7cc]" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={recipientTab === 'students' ? "O'quvchi qidirish..." : 'Guruh qidirish...'}
                  className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl text-[13px] text-[#1c1c1e] placeholder:text-[#c7c7cc] outline-none"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                />
              </div>

              {/* List */}
              <div className="space-y-2 mb-6">
                {recipientTab === 'students' && filteredStudents.map((s) => {
                  const name = `${s.first_name} ${s.last_name}`;
                  const colors = getColors(name);
                  const checked = selectedStudents.has(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudents((prev) => {
                        const next = new Set(prev);
                        checked ? next.delete(s.id) : next.add(s.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white transition-all active:scale-[0.99] text-left"
                      style={{
                        boxShadow: checked
                          ? '0 0 0 2px #007AFF, 0 2px 8px rgba(0,122,255,0.12)'
                          : '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {s.first_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{name}</p>
                        <p className="text-[12px] text-[#8e8e93]">{s.phone}</p>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        style={checked
                          ? { background: '#007AFF', borderColor: '#007AFF' }
                          : { borderColor: '#d1d1d6', background: 'transparent' }
                        }
                      >
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}

                {recipientTab === 'groups' && filteredGroups.map((g) => {
                  const colors = getColors(g.name);
                  const checked = selectedGroups.has(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGroups((prev) => {
                        const next = new Set(prev);
                        checked ? next.delete(g.id) : next.add(g.id);
                        return next;
                      })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white transition-all active:scale-[0.99] text-left"
                      style={{
                        boxShadow: checked
                          ? '0 0 0 2px #007AFF, 0 2px 8px rgba(0,122,255,0.12)'
                          : '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                        style={{ background: colors.bg, color: colors.text }}
                      >
                        {g.name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{g.name}</p>
                        <p className="text-[12px] text-[#8e8e93]">{g.students_count ?? g.total_students ?? 0} o'quvchi</p>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                        style={checked
                          ? { background: '#007AFF', borderColor: '#007AFF' }
                          : { borderColor: '#d1d1d6', background: 'transparent' }
                        }
                      >
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}

                {recipientTab === 'students' && filteredStudents.length === 0 && (
                  <p className="text-center text-[13px] text-[#8e8e93] py-8">O'quvchilar topilmadi</p>
                )}
                {recipientTab === 'groups' && filteredGroups.length === 0 && (
                  <p className="text-center text-[13px] text-[#8e8e93] py-8">Guruhlar topilmadi</p>
                )}
              </div>

              {/* Spacer so content isn't hidden behind sticky button */}
              <div className="h-24" />

            {/* Sticky next button */}
            <div
              className="fixed bottom-0 left-0 right-0 md:left-[280px] z-40 px-4 pb-6 pt-3"
              style={{ background: 'linear-gradient(to top, #F5F5F7 60%, transparent)' }}
            >
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setStep('compose')}
                  disabled={totalSelected === 0}
                  className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{
                    background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                    boxShadow: totalSelected > 0 ? '0 4px 20px rgba(0,122,255,0.38)' : 'none',
                  }}
                >
                  Davom etish
                  {totalSelected > 0 && ` (${totalSelected} ta)`}
                </button>
              </div>
            </div>
          </>
          )}

          {/* ── Compose step ────────────────────────────────────── */}
          {step === 'compose' && (
            <div>
              {/* Nav */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setStep('recipients')}
                  className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-[#8e8e93] hover:bg-[#F5F5F7] transition-colors"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                  <h2 className="text-[17px] font-bold text-[#1c1c1e]">Xabar yozish</h2>
                  <p className="text-[12px] text-[#8e8e93]">{totalSelected} ta qabul qiluvchi</p>
                </div>
              </div>

              {/* Templates */}
              <div className="mb-4">
                <p className="text-[12px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2.5">Shablonlar</p>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {templates.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => handleTemplateClick(t)}
                      className="shrink-0 px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all"
                      style={selectedTemplateKey === t.key
                        ? { background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(0,122,255,0.25)' }
                        : { background: '#fff', color: '#1c1c1e', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                      }
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div
                className="bg-white rounded-3xl overflow-hidden mb-4"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04)' }}
              >
                <textarea
                  value={messageText}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_CHARS) setMessageText(e.target.value);
                  }}
                  placeholder="Xabar matnini kiriting yoki shablon tanlang..."
                  rows={7}
                  className="w-full px-5 py-4 text-[14px] text-[#1c1c1e] placeholder:text-[#c7c7cc] outline-none resize-none bg-transparent"
                />
                <div className="flex items-center justify-between px-5 pb-3">
                  <span className="text-[11px] text-[#c7c7cc]">Maksimal {MAX_CHARS} belgi</span>
                  <span
                    className="text-[12px] font-semibold tabular-nums"
                    style={{ color: messageText.length > MAX_CHARS * 0.9 ? '#FF9500' : '#8e8e93' }}
                  >
                    {messageText.length}/{MAX_CHARS}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={messageText.trim().length === 0}
                className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40"
                style={{
                  background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                  boxShadow: messageText.trim().length > 0 ? '0 4px 16px rgba(0,122,255,0.32)' : 'none',
                }}
              >
                Ko'rib chiqish
              </button>
            </div>
          )}

          {/* ── Confirm step ────────────────────────────────────── */}
          {step === 'confirm' && (
            <div>
              {/* Nav */}
              <div className="flex items-center gap-3 mb-5">
                <button
                  onClick={() => setStep('compose')}
                  className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center text-[#8e8e93] hover:bg-[#F5F5F7] transition-colors"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-[17px] font-bold text-[#1c1c1e]">Tasdiqlash</h2>
              </div>

              {/* Recipients preview */}
              <div
                className="bg-white rounded-3xl p-4 mb-4"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04)' }}
              >
                <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-3">Qabul qiluvchilar</p>
                <div className="flex flex-wrap gap-2">
                  {[...selectedStudents].map((id) => {
                    const s = students.find((x) => x.id === id);
                    if (!s) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-semibold"
                        style={{ background: 'rgba(0,122,255,0.10)', color: '#007AFF' }}
                      >
                        <User className="w-3 h-3" />
                        {s.first_name} {s.last_name}
                      </span>
                    );
                  })}
                  {[...selectedGroups].map((id) => {
                    const g = groups.find((x) => x.id === id);
                    if (!g) return null;
                    return (
                      <span
                        key={id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[12px] font-semibold"
                        style={{ background: 'rgba(52,170,220,0.12)', color: '#34AADC' }}
                      >
                        <Users className="w-3 h-3" />
                        {g.name}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Message preview */}
              <div
                className="bg-white rounded-3xl p-4 mb-4"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 6px 16px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide">Xabar matni</p>
                  <button
                    onClick={() => setStep('compose')}
                    className="flex items-center gap-1 text-[12px] font-semibold"
                    style={{ color: '#007AFF' }}
                  >
                    <Pencil className="w-3 h-3" />
                    Tahrirlash
                  </button>
                </div>
                <p className="text-[14px] text-[#1c1c1e] leading-relaxed whitespace-pre-wrap">{messageText}</p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={handleConfirmSend}
                  disabled={sendMutation.isPending}
                  className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                    boxShadow: '0 4px 16px rgba(0,122,255,0.32)',
                  }}
                >
                  {sendMutation.isPending ? 'Yuborilmoqda...' : `Yuborishni tasdiqlash (${totalSelected} ta)`}
                </button>
                <button
                  onClick={resetFlow}
                  className="w-full py-3 rounded-2xl text-[14px] font-semibold text-[#8e8e93] bg-white transition-all active:scale-[0.98]"
                  style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          )}

          {/* ── Success step ─────────────────────────────────────── */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)', boxShadow: '0 8px 24px rgba(0,122,255,0.35)' }}
              >
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-[22px] font-bold text-[#1c1c1e] mb-1">
                Muvaffaqiyatli yuborildi
              </h2>
              {sendResult && (
                <p className="text-[14px] text-[#8e8e93] mb-2">
                  {sendResult.success} ta xabar yuborildi
                  {sendResult.failed > 0 && `, ${sendResult.failed} ta muvaffaqiyatsiz`}
                </p>
              )}
              <p className="text-[13px] text-[#c7c7cc] mb-8">
                Xabarlar qabul qiluvchilarga yetkazildi
              </p>

              <button
                onClick={resetFlow}
                className="px-8 py-3 rounded-2xl text-[14px] font-semibold text-white transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #007AFF 0%, #34AADC 100%)',
                  boxShadow: '0 4px 16px rgba(0,122,255,0.32)',
                }}
              >
                Tarixga qaytish
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Message detail modal */}
      {detailMessage && (
        <MessageDetailModal
          message={detailMessage}
          groups={groups}
          onClose={() => setDetailMessage(null)}
        />
      )}
    </div>
  );
}

// ─── Message Card ──────────────────────────────────────────────────────────────

function MessageCard({
  message,
  groups,
  onClick,
}: {
  message: Message;
  groups: Group[];
  onClick: () => void;
}) {
  const recipientName = message.receiver
    ? `${message.receiver.first_name} ${message.receiver.last_name}`
    : message.group_id
    ? groups.find((g) => g.id === message.group_id)?.name ?? 'Guruh'
    : 'Noma\'lum';

  const isGroup = !message.receiver && !!message.group_id;
  const colors = getColors(recipientName);

  const date = message.created_at
    ? new Date(message.created_at).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })
    : '';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl text-left transition-all active:scale-[0.99] hover:shadow-md"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
        style={{ background: colors.bg, color: colors.text }}
      >
        {recipientName[0]?.toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[14px] font-semibold text-[#1c1c1e] truncate">{recipientName}</p>
          {isGroup && (
            <span
              className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: 'rgba(52,170,220,0.12)', color: '#34AADC' }}
            >
              guruh
            </span>
          )}
        </div>
        <p className="text-[12px] text-[#8e8e93] truncate mt-0.5">{message.text}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-[11px] text-[#c7c7cc]">{date}</p>
        <span
          className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg"
          style={{ background: 'rgba(52,199,89,0.10)', color: '#34C759' }}
        >
          <Check className="w-2.5 h-2.5" />
          Yuborildi
        </span>
      </div>
    </button>
  );
}

// ─── Message Detail Modal ──────────────────────────────────────────────────────

function MessageDetailModal({
  message,
  groups,
  onClose,
}: {
  message: Message;
  groups: Group[];
  onClose: () => void;
}) {
  const recipientName = message.receiver
    ? `${message.receiver.first_name} ${message.receiver.last_name}`
    : message.group_id
    ? groups.find((g) => g.id === message.group_id)?.name ?? 'Guruh'
    : "Noma'lum";

  const isGroup = !message.receiver && !!message.group_id;
  const colors = getColors(recipientName);


  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-md bg-white sm:rounded-[28px] rounded-t-[28px] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 2px 4px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.18)',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-[#e5e5ea]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <h2 className="text-[17px] font-bold text-[#1c1c1e]">Xabar tafsiloti</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F5F5F7] transition-colors"
          >
            <X className="w-4 h-4 text-[#8e8e93]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {/* Recipient card */}
          <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: '#F5F5F7' }}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0"
              style={{ background: colors.bg, color: colors.text }}
            >
              {recipientName[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#1c1c1e]">{recipientName}</p>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-lg"
                style={isGroup
                  ? { background: 'rgba(52,170,220,0.12)', color: '#34AADC' }
                  : { background: 'rgba(0,122,255,0.10)', color: '#007AFF' }
                }
              >
                {isGroup ? 'Guruh' : "O'quvchi"}
              </span>
            </div>
          </div>

          {/* Message text */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #F5F5F7' }}>
            <div className="px-4 py-3.5">
              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wide mb-2">Xabar matni</p>
              <p className="text-[14px] text-[#1c1c1e] leading-relaxed whitespace-pre-wrap">{message.text}</p>
            </div>
          </div>

          {/* Details */}
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #F5F5F7' }}>
            {[
              { icon: <Clock className="w-4 h-4" />, label: 'Yuborilgan vaqt', value: formatDateTime(message.created_at) },
              {
                icon: <CheckCircle2 className="w-4 h-4" />, label: 'Xabar holati',
                valueNode: (
                  <span
                    className="inline-flex items-center gap-1 text-[13px] font-semibold px-2.5 py-1 rounded-xl"
                    style={{ background: 'rgba(52,199,89,0.10)', color: '#34C759' }}
                  >
                    <Check className="w-3 h-3" />
                    Muvaffaqiyatli yuborildi
                  </span>
                ),
              },
            ].map((row, i, arr) => (
              <div
                key={row.label}
                className="flex items-start gap-3 px-4 py-3.5"
                style={{ borderBottom: i < arr.length - 1 ? '1px solid #F5F5F7' : 'none' }}
              >
                <span className="text-[#c7c7cc] shrink-0 mt-0.5">{row.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-[#8e8e93] font-medium uppercase tracking-wide mb-0.5">{row.label}</p>
                  {'valueNode' in row
                    ? row.valueNode
                    : <p className="text-[13px] font-semibold text-[#1c1c1e]">{row.value}</p>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
