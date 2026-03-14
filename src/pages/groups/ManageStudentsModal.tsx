import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, Search, UserPlus, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Student } from '../../types';
import { cn } from '../../utils/cn';
import { api } from '../../api/axios';

interface ManageStudentsModalProps {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupStudents: Student[];
  allStudents: Student[];
  onAddStudents: () => void;
  onRemoveStudents: () => void;
}

type TabType = 'add' | 'remove';

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
  groupId,
  groupStudents,
  allStudents,
  onAddStudents,
  onRemoveStudents,
}: ManageStudentsModalProps) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TabType>('add');
  const [search, setSearch] = useState('');
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

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

  const handleAddStudent = async (studentId: string) => {
    setLoadingIds((prev) => new Set(prev).add(studentId));
    try {
      await api.post(`/students/${studentId}/groups`, { group_id: groupId });
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success("O'quvchi qo'shildi ✓");
      onAddStudents();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
      console.error(err);
    } finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(studentId); return n; });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("O'quvchini guruhdan chiqarishni tasdiqlaysizmi?")) return;
    setLoadingIds((prev) => new Set(prev).add(studentId));
    try {
      await api.delete(`/students/${studentId}/groups/${groupId}`);
      queryClient.invalidateQueries({ queryKey: ['group', groupId] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success("O'quvchi chiqarildi ✓");
      onRemoveStudents();
    } catch (err) {
      toast.error('Xatolik yuz berdi');
      console.error(err);
    } finally {
      setLoadingIds((prev) => { const n = new Set(prev); n.delete(studentId); return n; });
    }
  };

  const handleTabChange = (t: TabType) => {
    setTab(t);
    setSearch('');
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
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
                tab === 'add' ? 'bg-white text-[#3B82F6] shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <UserPlus className="w-4 h-4" />
              Qo'shish
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
                tab === 'remove' ? 'bg-white text-rose-500 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <UserMinus className="w-4 h-4" />
              Chiqarish
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

        {/* Student list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                {tab === 'add' ? <UserPlus className="w-6 h-6 text-gray-400" /> : <UserMinus className="w-6 h-6 text-gray-400" />}
              </div>
              <p className="text-sm font-medium text-gray-500">
                {search
                  ? "Qidiruv bo'yicha hech narsa topilmadi"
                  : tab === 'add'
                  ? "Barcha o'quvchilar allaqachon qo'shilgan"
                  : "Bu guruhda o'quvchilar yo'q"}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredList.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`;
                const avatarColor = getAvatarColor(fullName);
                const isLoading = loadingIds.has(student.id);

                return (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-gray-50/60 hover:bg-gray-100/60 transition-colors"
                  >
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0', avatarColor)}>
                      {student.first_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1D1D1F] truncate">{fullName}</p>
                      {student.phone && (
                        <p className="text-xs text-gray-400 truncate">{student.phone}</p>
                      )}
                    </div>
                    {tab === 'add' ? (
                      <button
                        onClick={() => handleAddStudent(student.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#3B82F6] hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-blue-200 shrink-0"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        {isLoading ? '...' : "Qo'shish"}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm shadow-rose-200 shrink-0"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        {isLoading ? '...' : 'Chiqarish'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
