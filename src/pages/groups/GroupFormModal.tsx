import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { cn } from '../../utils/cn';
import { GROUP_COLORS } from '../../constants';
import { LESSON_DAYS } from '../../constants';
import type { Group, GroupPayload } from '../../types';

const DAY_SHORT: Record<string, string> = {
  monday: 'Du',
  tuesday: 'Se',
  wednesday: 'Ch',
  thursday: 'Pa',
  friday: 'Ju',
  saturday: 'Sha',
  sunday: 'Yak',
};

export interface GroupFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: Group | null;
  onSubmit: (payload: GroupPayload) => void;
  loading?: boolean;
}

export function GroupFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  loading = false,
}: GroupFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<string>('');
  const [lessonDays, setLessonDays] = useState<string[]>([]);
  const [lessonTime, setLessonTime] = useState('14:00');
  const [color, setColor] = useState<string>(GROUP_COLORS[0]);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial?.id;

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setMonthlyFee(initial?.monthly_fee != null ? String(initial.monthly_fee) : '');
      setLessonDays(initial?.lesson_days ?? []);
      setLessonTime(initial?.lesson_time ?? '14:00');
      setColor(initial?.color ?? GROUP_COLORS[0] as string);
      setError(null);
    }
  }, [open, initial]);

  const toggleDay = (day: string) => {
    setLessonDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fee = Number(monthlyFee);
    if (!name.trim()) {
      setError(t('validation.required'));
      return;
    }
    if (Number.isNaN(fee) || fee < 0) {
      setError('Oylik to\'lov noto\'g\'ri');
      return;
    }
    if (lessonDays.length === 0) {
      setError('Kamida bitta dars kuni tanlang');
      return;
    }
    const timeMatch = /^([01]?\d|2[0-3]):([0-5]\d)$/.test(lessonTime);
    if (!timeMatch) {
      setError('Vaqt HH:mm ko\'rinishida bo\'lishi kerak');
      return;
    }
    onSubmit({
      name: name.trim(),
      monthly_fee: fee,
      lesson_days: lessonDays,
      lesson_time: lessonTime,
      color,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Guruhni tahrirlash' : 'Yangi guruh yaratish'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Guruh nomi"
          placeholder="Masalan: Frontend 01"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="rounded-xl border-gray-200 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 transition-all duration-200"
        />
        <Input
          label="Oylik to'lov so'mmasi"
          type="number"
          min={0}
          step={1000}
          placeholder="Masalan: 500000"
          value={monthlyFee}
          onChange={(e) => setMonthlyFee(e.target.value)}
          className="rounded-xl border-gray-200 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 transition-all duration-200"
        />
        <div>
          <label className="block text-sm font-bold text-[#1F2937] mb-3">
            Dars kunlari
          </label>
          <div className="flex flex-wrap gap-2">
            {LESSON_DAYS.map(({ value }) => (
              <button
                key={value}
                type="button"
                onClick={() => toggleDay(value)}
                className={cn(
                  'w-11 h-11 rounded-xl text-sm font-bold border-2 transition-all duration-200 flex items-center justify-center',
                  lessonDays.includes(value)
                    ? 'bg-[#F0F4FF] border-[#3B82F6] text-[#3B82F6]'
                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200 hover:bg-gray-50'
                )}
              >
                {DAY_SHORT[value] ?? value.slice(0, 2)}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Dars vaqti"
          type="time"
          value={lessonTime}
          onChange={(e) => setLessonTime(e.target.value)}
          className="rounded-xl border-gray-200 focus:border-[#3B82F6] focus:ring-[#3B82F6]/20 transition-all duration-200"
        />
        <div>
          <label className="block text-sm font-bold text-[#1F2937] mb-3">
            Rangini tanlang
          </label>
          <div className="flex flex-wrap gap-3">
            {GROUP_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  'w-10 h-10 rounded-full transition-all duration-200 relative flex items-center justify-center',
                  color === c
                    ? 'ring-4 ring-offset-2 ring-opacity-20 scale-110 shadow-sm'
                    : 'hover:scale-105 border-transparent'
                )}
                style={{
                  backgroundColor: c,
                  '--tw-ring-color': c
                } as React.CSSProperties}
                aria-label={c}
              >
                {color === c && (
                  <div className="w-2.5 h-2.5 rounded-full bg-white opacity-80" />
                )}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm font-medium text-red-500 bg-red-50 px-3 py-2 rounded-xl">{error}</p>}
        <div className="flex gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl font-bold bg-[#3B82F6] hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center disabled:opacity-70"
          >
            {loading ? 'Saqlanmoqda...' : 'Saqlash'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
