import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sidebar } from '../components/layout/Sidebar';
import { Header } from '../components/layout/Header';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useProfile, useUpdateProfile } from '../hooks/useSettings';
import { useAuthStore } from '../store/authStore';
import { api } from '../api/axios';
import { cn } from '../utils/cn';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  Database, CreditCard, HelpCircle, ChevronRight,
  Globe, Pencil, FileSpreadsheet, FileText, Check,
  User as UserIcon, LogOut, Mail, Phone, Zap, Sparkles, Star,
} from 'lucide-react';

// ─── Checkbox helper ───────────────────────────────────────────────────────
function Checkbox({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  return (
    <div
      className={cn(
        'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
        checked || indeterminate
          ? 'bg-[#3B82F6] border-[#3B82F6]'
          : 'border-gray-300 bg-white',
      )}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
      {!checked && indeterminate && <div className="w-2.5 h-0.5 bg-white rounded" />}
    </div>
  );
}

// ─── Export categories ─────────────────────────────────────────────────────
const EXPORT_CATEGORIES = [
  { id: 'archive',  label: 'Arxiv',                sheetName: 'Arxiv'      },
  { id: 'messages', label: 'Xabarlar',             sheetName: 'Xabarlar'   },
  { id: 'students', label: "O'quvchilar",          sheetName: 'Oquvchilar' },
  { id: 'groups',   label: 'Guruhlar',             sheetName: 'Guruhlar'   },
  { id: 'payments', label: "To'lovlar",            sheetName: 'Tolovlar'   },
  { id: 'reports',  label: 'Moliyaviy hisobotlar', sheetName: 'Moliyaviy'  },
  { id: 'debtors',  label: 'Qarzdorlar',           sheetName: 'Qarzdorlar' },
] as const;

type CategoryId = (typeof EXPORT_CATEGORIES)[number]['id'];

async function fetchExportData(id: CategoryId): Promise<Record<string, unknown>[]> {
  try {
    if (id === 'archive') {
      const res = await api.get('/archive');
      const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return items.map(i => ({
        ID: i.id,
        Tur: i.entity_type,
        'Entity ID': i.entity_id,
        Arxivlangan: i.archived_at,
        'Kim tomonidan': i.archived_by,
      }));
    }
    if (id === 'messages') {
      const res = await api.get('/messages');
      const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return items.map(i => ({
        ID: i.id,
        Matn: i.text,
        Vaqt: i.created_at,
        Holat: i.is_read ? "O'qilgan" : "O'qilmagan",
      }));
    }
    if (id === 'students') {
      const res = await api.get('/students');
      const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return items.map(i => ({
        ID: i.student_code || i.id,
        Ism: i.first_name,
        Familiya: i.last_name,
        Telefon: i.phone || '',
        'Ota-ona': i.parent_name || '',
        'Ota-ona tel': i.parent_phone || '',
        Holat: i.is_archived ? 'Arxivlangan' : 'Faol',
      }));
    }
    if (id === 'groups') {
      const res = await api.get('/groups');
      const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return items.map(i => ({
        ID: i.id,
        Nom: i.name,
        "Oylik to'lov (so'm)": i.monthly_fee,
        Kunlar: Array.isArray(i.lesson_days) ? i.lesson_days.join(', ') : '',
        Vaqt: i.lesson_time,
        "O'quvchilar soni": i.total_students ?? 0,
        Holat: i.is_archived ? 'Arxivlangan' : 'Faol',
      }));
    }
    if (id === 'payments') {
      const res = await api.get('/payments');
      const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return items.map(i => ({
        ID: i.id,
        "Summa (so'm)": i.amount,
        Usul: i.payment_method,
        Holat: i.status,
        Oy: i.month_year,
        Izoh: i.note || '',
        Yaratilgan: i.created_at,
      }));
    }
    if (id === 'reports') {
      const month = new Date().toISOString().slice(0, 7);
      const res = await api.get('/payments/reports', { params: { month_year: month } });
      const d = res.data?.data || res.data;
      if (!d) return [{ Xato: "Ma'lumot topilmadi" }];
      return [{
        Oy: month,
        "Kutilgan tushum": d.expected_revenue ?? 0,
        "Tushgan tushum": d.total_received ?? 0,
        Qoliq: d.remaining_balance ?? 0,
        "Oldindan to'lov": d.prepaid_amount ?? 0,
      }];
    }
    if (id === 'debtors') {
      const res = await api.get('/payments/debtors');
      const items: any[] = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      return items.map(i => ({
        Ism: i.student?.first_name ?? '',
        Familiya: i.student?.last_name ?? '',
        Telefon: i.student?.phone ?? '',
        Guruh: i.group?.name ?? '',
        "Umumiy qarz (so'm)": i.total_debt,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// ─── DataExportModal ───────────────────────────────────────────────────────
function DataExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  const [loading, setLoading] = useState(false);

  const allSelected = selected.size === EXPORT_CATEGORIES.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(EXPORT_CATEGORIES.map(c => c.id)));
  }

  function toggle(id: CategoryId) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  async function handleExcel() {
    if (!selected.size) return;
    setLoading(true);
    try {
      const wb = XLSX.utils.book_new();
      for (const cat of EXPORT_CATEGORIES.filter(c => selected.has(c.id))) {
        const rows = await fetchExportData(cat.id);
        const ws = rows.length
          ? XLSX.utils.json_to_sheet(rows)
          : XLSX.utils.aoa_to_sheet([["Ma'lumot topilmadi"]]);
        XLSX.utils.book_append_sheet(wb, ws, cat.sheetName);
      }
      XLSX.writeFile(wb, `teachflow-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setLoading(false);
    }
  }

  async function handlePDF() {
    if (!selected.size) return;
    setLoading(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      let y = 18;

      doc.setFontSize(15);
      doc.text("TeachFlow - Ma'lumotlar eksport", 148, y, { align: 'center' });
      doc.setFontSize(9);
      doc.text(new Date().toLocaleDateString('uz-UZ'), 148, y + 7, { align: 'center' });
      y += 18;

      for (const cat of EXPORT_CATEGORIES.filter(c => selected.has(c.id))) {
        const rows = await fetchExportData(cat.id);
        if (y > 170) { doc.addPage(); y = 18; }

        doc.setFontSize(11);
        doc.setFont(undefined as any, 'bold');
        doc.text(cat.label, 10, y);
        doc.setFont(undefined as any, 'normal');
        y += 8;
        doc.setFontSize(8);

        if (rows.length === 0) {
          doc.text("Ma'lumot topilmadi", 14, y);
          y += 10;
          continue;
        }

        const keys = Object.keys(rows[0]);
        const colW = Math.min(265 / keys.length, 48);

        // header row
        doc.setFont(undefined as any, 'bold');
        keys.forEach((k, i) => doc.text(String(k).slice(0, 18), 10 + i * colW, y));
        doc.setFont(undefined as any, 'normal');
        y += 7;

        // data rows (max 25 per category)
        for (const row of rows.slice(0, 25)) {
          if (y > 190) { doc.addPage(); y = 18; }
          keys.forEach((k, i) => {
            doc.text(String(row[k] ?? '').slice(0, 22), 10 + i * colW, y);
          });
          y += 6;
        }
        y += 8;
      }

      doc.save(`teachflow-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ma'lumotlar">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center shrink-0">
          <Database className="w-5 h-5 text-blue-600" />
        </div>
        <p className="text-sm text-gray-500">Export va arxiv</p>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Kerakli bo'limlarni tanlang va ma'lumotlarni yuklab oling.
      </p>

      <div className="rounded-2xl border border-gray-100 overflow-hidden mb-5">
        {/* Select all */}
        <button
          type="button"
          onClick={toggleAll}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors border-b border-gray-100"
        >
          <Checkbox checked={allSelected} indeterminate={someSelected} />
          <span className="text-sm font-semibold text-gray-600">Barchasini tanlash</span>
        </button>

        {EXPORT_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => toggle(cat.id)}
            className={cn(
              'w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors',
              idx < EXPORT_CATEGORIES.length - 1 && 'border-b border-gray-50',
            )}
          >
            <Checkbox checked={selected.has(cat.id)} />
            <span className="text-sm font-medium text-[#1F2937]">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1 rounded-2xl"
          onClick={handleExcel}
          loading={loading}
          disabled={!selected.size || loading}
          leftIcon={<FileSpreadsheet className="w-4 h-4" />}
        >
          Excel
        </Button>
        <Button
          variant="secondary"
          className="flex-1 rounded-2xl"
          onClick={handlePDF}
          loading={loading}
          disabled={!selected.size || loading}
          leftIcon={<FileText className="w-4 h-4" />}
        >
          PDF
        </Button>
      </div>
    </Modal>
  );
}

// ─── ProfileEditModal ──────────────────────────────────────────────────────
function ProfileEditModal({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: any;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();
  const setUser = useAuthStore(s => s.setUser);

  useEffect(() => {
    if (open && profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
    }
  }, [open, profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const updated = await updateProfile({ first_name: firstName, last_name: lastName });
    setUser(updated);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Profilni tahrirlash">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ism"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Familiya"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
          />
        </div>

        {/* Read-only fields */}
        {profile?.email && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="px-4 py-3 bg-gray-50 rounded-[1.25rem] text-sm text-gray-500 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              {profile.email}
            </div>
          </div>
        )}
        {profile?.phone && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
            <div className="px-4 py-3 bg-gray-50 rounded-[1.25rem] text-sm text-gray-500 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              {profile.phone}
            </div>
          </div>
        )}
        {(profile?.short_id || profile?.id) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Foydalanuvchi ID</label>
            <div className="px-4 py-3 bg-gray-50 rounded-[1.25rem] text-sm text-gray-500 font-mono tracking-wide">
              {profile?.short_id || profile?.id?.slice(0, 8)}
            </div>
          </div>
        )}

        <div className="pt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-2xl">
            Bekor qilish
          </Button>
          <Button type="submit" loading={isPending} className="rounded-2xl px-6">
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── LanguageModal ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: 'uz_latin', label: "O'zbekcha", sub: 'Lotin yozuvi', flag: '🇺🇿' },
  { value: 'uz_cyril', label: 'Ўзбекча',   sub: 'Кирилл ёзуви', flag: '🇺🇿' },
  { value: 'ru',       label: 'Русский',   sub: 'Россия',        flag: '🇷🇺' },
  { value: 'en',       label: 'English',   sub: 'English',       flag: '🇬🇧' },
];

function LanguageModal({
  open, onClose, currentLanguage, onSelect,
}: {
  open: boolean;
  onClose: () => void;
  currentLanguage: string;
  onSelect: (lang: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Tizim tili">
      <div className="space-y-1">
        {LANGUAGES.map(lang => {
          const active = currentLanguage === lang.value;
          return (
            <button
              key={lang.value}
              type="button"
              onClick={() => { onSelect(lang.value); onClose(); }}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-colors',
                active ? 'bg-blue-50' : 'hover:bg-gray-50',
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl leading-none">{lang.flag}</span>
                <div className="text-left">
                  <p className={cn('text-sm font-semibold', active ? 'text-blue-600' : 'text-[#1F2937]')}>
                    {lang.label}
                  </p>
                  <p className="text-xs text-gray-400">{lang.sub}</p>
                </div>
              </div>
              {active && <Check className="w-5 h-5 text-blue-500 shrink-0" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── SupportModal ──────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "To'lovni qanday qo'shish mumkin?",
    a: "Asosiy menyudan 'To'lovlar' bo'limiga o'ting va '+' tugmasini bosing. O'quvchi, guruh, summa va to'lov usulini tanlang.",
  },
  {
    q: "O'quvchini guruhga qo'shish",
    a: "Guruh sahifasiga kiring → 'Boshqarish' tugmasini bosing → 'O'quvchi qo'shish' opsiyasini tanlang.",
  },
  {
    q: "Ma'lumotlarni eksport qilish",
    a: "Sozlamalar → 'Ma'lumotlarni yuklab olish' bo'limiga kiring. Kerakli kategoriyalarni belgilab Excel yoki PDF formatda yuklab oling.",
  },
  {
    q: "Eslatma o'rnatish",
    a: "Eslatmalar bo'limiga o'ting, '+' tugmasini bosib o'quvchi va sanani belgilang. Tizim siz belgilagan kunda eslatma yuboradi.",
  },
  {
    q: "Guruhni arxivlash",
    a: "Guruh sahifasida yuqori o'ng burchakdagi menyuni oching va 'Arxivlash' tugmasini bosing. Arxivlangan guruhlar Arxiv bo'limida ko'rinadi.",
  },
  {
    q: "Aloqa va texnik yordam",
    a: "Email: support@teachflow.uz | Telegram: @teachflowsupport | Ish vaqti: Dush–Jum, 09:00–18:00",
  },
];

function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Modal open={open} onClose={onClose} title="Yordam va FAQ">
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 transition-colors gap-3"
            >
              <span className="text-sm font-semibold text-[#1F2937] flex-1">{item.q}</span>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200',
                  expanded === i && 'rotate-90',
                )}
              />
            </button>
            {expanded === i && (
              <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                <div className="pt-3">{item.a}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── MonetizationModal ─────────────────────────────────────────────────────
function MonetizationModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Tariflar">
      {/* subtitle */}
      <p className="text-sm text-gray-400 mb-5 -mt-1">O'zingizga mos tarifni tanlang</p>

      <div className="space-y-3">

        {/* ── START ── */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#1F2937] leading-tight">Start</p>
                <p className="text-[11px] text-gray-400">Boshlash uchun ideal</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-[#1F2937] leading-tight">79 000</p>
              <p className="text-[11px] text-gray-400">so'm/oy</p>
            </div>
          </div>
          <ul className="space-y-1.5 mb-4">
            {["Cheksiz o'quvchilar", "Guruhlarni boshqarish", "To'lov hisobi", "Asosiy hisobotlar", "Email qo'llab-quvvatlash"].map(f => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-gray-500">
                <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <button type="button" className="w-full text-sm font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 py-2.5 rounded-xl border border-gray-100 transition-colors">
            Tanlash
          </button>
        </div>

        {/* ── PRO – recommended ── */}
        <div className="rounded-2xl border-2 border-violet-400 bg-white overflow-hidden shadow-[0_4px_24px_-4px_rgba(139,92,246,0.18)]">
          {/* recommended strip */}
          <div className="w-full bg-violet-500 py-1.5 flex items-center justify-center gap-1.5">
            <Star className="w-3 h-3 text-white fill-white" />
            <span className="text-[11px] font-bold text-white uppercase tracking-widest">Recommended</span>
            <Star className="w-3 h-3 text-white fill-white" />
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Star className="w-4 h-4 text-violet-500 fill-violet-100" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1F2937] leading-tight">Pro</p>
                  <p className="text-[11px] text-gray-400">Kengaytirilgan imkoniyatlar</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-violet-600 leading-tight">189 000</p>
                <p className="text-[11px] text-gray-400">so'm/oy</p>
              </div>
            </div>
            <ul className="space-y-1.5 mb-4">
              {["Start tarifidagi barcha imkoniyatlar", "Kengaytirilgan hisobotlar", "SMS va Telegram eslatmalar", "Ma'lumotlarni eksport (Excel/PDF)", "Qarzdorlar ro'yxati", "Prioritet qo'llab-quvvatlash"].map(f => (
                <li key={f} className="flex items-center gap-2 text-[13px] text-gray-600">
                  <Check className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button type="button" className="w-full text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 active:bg-violet-700 py-2.5 rounded-xl transition-colors shadow-sm">
              Tanlash
            </button>
          </div>
        </div>

        {/* ── FLOW – premium highlight ── */}
        <div className="relative rounded-2xl bg-gradient-to-br from-[#18181B] via-[#27272A] to-[#18181B] p-5 overflow-hidden shadow-lg">
          {/* decorative glows */}
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-purple-500/10 blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">Flow</p>
                <p className="text-[11px] text-zinc-400">Eng keng imkoniyatlar</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold text-white leading-tight">349 000</p>
              <p className="text-[11px] text-zinc-400">so'm/oy</p>
            </div>
          </div>

          <ul className="relative space-y-1.5 mb-4">
            {["Pro tarifidagi barcha imkoniyatlar", "Ko'p o'quv markazlari boshqaruvi", "Maxsus brending & dizayn", "API integratsiya", "Shaxsiy menejger", "Kengaytirilgan tahlil va AI hisobotlar"].map(f => (
              <li key={f} className="flex items-center gap-2 text-[13px] text-zinc-300">
                <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button type="button" className="relative w-full text-sm font-semibold text-[#18181B] bg-white hover:bg-zinc-100 active:bg-zinc-200 py-2.5 rounded-xl transition-colors">
            Tanlash
          </button>
        </div>

      </div>

      <p className="text-center text-[11px] text-gray-400 mt-4">
        Oylik obuna · Istalgan vaqt bekor qilish mumkin
      </p>
    </Modal>
  );
}

// ─── SettingsPage ──────────────────────────────────────────────────────────
export function SettingsPage() {
  const { i18n } = useTranslation();
  const { data: profile } = useProfile();
  const { mutateAsync: updateProfile } = useUpdateProfile();
  const setUser = useAuthStore(s => s.setUser);
  const logout = useAuthStore(s => s.logout);

  const [showProfileEdit, setShowProfileEdit]       = useState(false);
  const [showDataExport, setShowDataExport]         = useState(false);
  const [showLanguage, setShowLanguage]             = useState(false);
  const [showSupport, setShowSupport]               = useState(false);
  const [showMonetization, setShowMonetization]     = useState(false);

  const user = profile as any;

  const initials = user
    ? (`${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`).toUpperCase() || 'F'
    : 'F';

  const displayName = user
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Foydalanuvchi'
    : 'Foydalanuvchi';

  const currentLang = LANGUAGES.find(l => l.value === (user?.language ?? i18n.language))
    ?? LANGUAGES[0];

  async function handleLanguageSelect(lang: string) {
    i18n.changeLanguage(lang.split('_')[0]);
    try {
      const updated = await updateProfile({ language: lang } as any);
      setUser(updated);
    } catch { /* ignore */ }
  }

  const mainMenuItems = [
    {
      icon: <Database className="w-5 h-5 text-blue-600" />,
      iconBg: 'bg-blue-100',
      title: "Ma'lumotlarni yuklab olish",
      subtitle: "Barcha hisobot va ro'yxatlarni Excel formatida olish",
      onClick: () => setShowDataExport(true),
    },
    {
      icon: <CreditCard className="w-5 h-5 text-purple-600" />,
      iconBg: 'bg-purple-100',
      title: 'Monetizatsiya',
      subtitle: "Tariflarni boshqarish va to'lovlar",
      onClick: () => setShowMonetization(true),
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-emerald-600" />,
      iconBg: 'bg-emerald-100',
      title: "Yordam va qo'llab-quvvatlash",
      subtitle: "Savollar, qo'llanmalar va aloqa",
      onClick: () => setShowSupport(true),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">

          {/* Page title */}
          <div className="mb-1">
            <h1 className="text-3xl font-extrabold text-[#1F2937] tracking-tight">Sozlamalar</h1>
            <p className="text-sm text-gray-500 mt-1">Ilova va profil sozlamalarini boshqaring</p>
          </div>

          {/* ── Profile Card ─────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setShowProfileEdit(true)}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/40 rounded-3xl"
          >
            <div className="relative rounded-3xl bg-gradient-to-br from-[#3B82F6] to-[#1D4ED8] p-6 shadow-lg">
              {/* Edit hint */}
              <div className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Pencil className="w-4 h-4 text-white" />
              </div>

              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                  <span className="text-2xl font-extrabold text-white">{initials}</span>
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
                  <p className="text-sm text-blue-100 mt-0.5 truncate">
                    {user?.email || '—'}
                    {(user?.short_id || user?.id) && (
                      <span className="ml-2 opacity-80">
                        • ID: {user?.short_id || user?.id?.slice(0, 6)}
                      </span>
                    )}
                  </p>
                  {user?.phone && (
                    <p className="text-sm text-blue-100 mt-0.5">{user.phone}</p>
                  )}
                  <div className="mt-3">
                    <span className="text-xs font-bold text-[#3B82F6] bg-white px-3 py-1 rounded-full uppercase tracking-wider">
                      TeachFlow {user?.plan === 'pro' ? 'PRO' : 'FREE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </button>

          {/* ── Main menu ─────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            {mainMenuItems.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 active:bg-gray-100 transition-colors text-left',
                  idx < mainMenuItems.length - 1 && 'border-b border-gray-50',
                )}
              >
                <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', item.iconBg)}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>

          {/* ── UMUMIY SOZLAMALAR ─────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 mb-2">
              Umumiy sozlamalar
            </p>
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] overflow-hidden">

              {/* Language */}
              <button
                type="button"
                onClick={() => setShowLanguage(true)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors text-left border-b border-gray-50"
              >
                <div className="w-10 h-10 rounded-2xl bg-sky-100 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-sky-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1F2937]">Tizim tili</p>
                  <p className="text-xs text-gray-500 mt-0.5">{currentLang.label}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {/* Account ID */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                  <UserIcon className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[#1F2937]">Hisob ID</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono tracking-widest">
                    {user?.short_id || user?.id?.slice(0, 8) || '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Logout ───────────────────────────────────────── */}
          <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center gap-4 px-5 py-4 text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-sm font-semibold">Chiqish</span>
            </button>
          </div>

        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────── */}
      <ProfileEditModal
        open={showProfileEdit}
        onClose={() => setShowProfileEdit(false)}
        profile={user}
      />
      <DataExportModal
        open={showDataExport}
        onClose={() => setShowDataExport(false)}
      />
      <LanguageModal
        open={showLanguage}
        onClose={() => setShowLanguage(false)}
        currentLanguage={user?.language ?? i18n.language}
        onSelect={handleLanguageSelect}
      />
      <SupportModal
        open={showSupport}
        onClose={() => setShowSupport(false)}
      />
      <MonetizationModal
        open={showMonetization}
        onClose={() => setShowMonetization(false)}
      />
    </div>
  );
}
