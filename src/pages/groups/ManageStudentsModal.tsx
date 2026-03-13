import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, UserPlus, UserMinus, Check } from 'lucide-react';
import type { Student } from '../../types';
import { cn } from '../../utils/cn';

type TabType = 'add' | 'remove';

interface ManageStudentsModalProps {
  open: boolean;
  onClose: () => void;
  groupStudents: Student[];
  allStudents: Student[];
  onAddStudents: (ids: string[]) => void;
  onRemoveStudents: (ids: string[]) => void;
  loading?: boolean;
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-600',
    'bg-emerald-100 text-emerald-600',
    'bg-amber-100 text-amber-600',
    'bg-purple-100 text-purple-600',
    'bg-rose-100 text-rose-600',
    'bg-cyan-100 text-cyan-600',
    'bg-indigo-100 text-indigo-600',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function ManageStudentsModal({
  open,
  onClose,
  groupStudents,
  allStudents,
  onAddStudents,
  onRemoveStudents,
  loading = false,
}: ManageStudentsModalProps) {
  const [tab, setTab] = useState<TabType>('add');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const groupStudentIds = useMemo(
    () => new Set(groupStudents.map((s) => s.id)),
    [groupStudents]
  );

  const studentsNotInGroup = useMemo(
    () => allStudents.filter((s) => !groupStudentIds.has(s.id) && !s.is_archived),
    [allStudents, groupStudentIds]
  );

  const filteredList = useMemo(() => {
    const list = tab === 'add' ? studentsNotInGroup : groupStudents;
    const q = search.toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q) ||
        s.phone?.includes(q)
    );
  }, [tab, studentsNotInGroup, groupStudents, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((s) => s.id)));
    }
  };

  const handleTabChange = (t: TabType) => {
    setTab(t);
    setSearch('');
    setSelectedIds(new Set());
  };

  const handleApply = () => {
    if (selectedIds.size === 0) return;
    if (tab === 'add') {
      onAddStudents([...selectedIds]);
    } else {
      onRemoveStudents([...selectedIds]);
    }
    setSelectedIds(new Set());
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-bold text-[#1D1D1F]">O'quvchilarni boshqarish</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pb-4">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => handleTabChange('add')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                tab === 'add'
                  ? 'bg-white text-[#3B82F6] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <UserPlus className="w-4 h-4" />
              O'quvchi qo'shish
              {studentsNotInGroup.length > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-bold',
                  tab === 'add' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'
                )}>
                  {studentsNotInGroup.length}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('remove')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                tab === 'remove'
                  ? 'bg-white text-rose-500 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <UserMinus className="w-4 h-4" />
              O'quvchi chiqarish
              {groupStudents.length > 0 && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-bold',
                  tab === 'remove' ? 'bg-rose-100 text-rose-500' : 'bg-gray-200 text-gray-500'
                )}>
                  {groupStudents.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Ism yoki telefon bo'yicha qidirish..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm text-[#1D1D1F] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
            />
          </div>
        </div>

        {/* Select all row */}
        {filteredList.length > 0 && (
          <div className="px-6 pb-2 flex items-center justify-between">
            <button
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <div className={cn(
                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all',
                selectedIds.size === filteredList.length && filteredList.length > 0
                  ? (tab === 'add' ? 'bg-blue-500 border-blue-500' : 'bg-rose-500 border-rose-500')
                  : 'border-gray-300'
              )}>
                {selectedIds.size === filteredList.length && filteredList.length > 0 && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
              Barchasini tanlash
            </button>
            {selectedIds.size > 0 && (
              <span className="text-xs font-medium text-gray-500">
                {selectedIds.size} ta tanlandi
              </span>
            )}
          </div>
        )}

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                {tab === 'add' ? (
                  <UserPlus className="w-6 h-6 text-gray-400" />
                ) : (
                  <UserMinus className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-medium text-gray-500">
                {search
                  ? 'Qidiruv bo\'yicha hech narsa topilmadi'
                  : tab === 'add'
                  ? "Barcha o'quvchilar allaqachon qo'shilgan"
                  : "Bu guruhda o'quvchilar yo'q"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredList.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`;
                const isSelected = selectedIds.has(student.id);
                const avatarColor = getAvatarColor(fullName);
                return (
                  <button
                    key={student.id}
                    onClick={() => toggleSelect(student.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-150',
                      isSelected
                        ? tab === 'add'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-rose-50 border border-rose-200'
                        : 'bg-gray-50/50 border border-transparent hover:bg-gray-100/60'
                    )}
                  >
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor)}>
                      {student.first_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold text-[#1D1D1F] truncate">{fullName}</p>
                      <p className="text-xs text-gray-400 truncate">{student.phone}</p>
                    </div>
                    <div className={cn(
                      'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                      isSelected
                        ? tab === 'add'
                          ? 'bg-blue-500 border-blue-500'
                          : 'bg-rose-500 border-rose-500'
                        : 'border-gray-300'
                    )}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleApply}
              disabled={selectedIds.size === 0 || loading}
              className={cn(
                'flex-1 py-3 rounded-2xl text-sm font-semibold text-white transition-all duration-200',
                selectedIds.size === 0 || loading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : tab === 'add'
                  ? 'bg-[#3B82F6] hover:bg-blue-600 shadow-sm shadow-blue-200'
                  : 'bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-200'
              )}
            >
              {loading
                ? 'Bajarilmoqda...'
                : tab === 'add'
                ? `${selectedIds.size > 0 ? selectedIds.size + ' ta ' : ''}Qo'shish`
                : `${selectedIds.size > 0 ? selectedIds.size + ' ta ' : ''}Chiqarish`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
