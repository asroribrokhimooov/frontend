import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Archive, Users, Clock, CalendarDays } from 'lucide-react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { Card } from '../../components/ui/Card';
import { GroupFormModal } from './GroupFormModal';
import { ArchiveConfirmModal } from './ArchiveConfirmModal';
import { useGroups, useCreateGroup, useUpdateGroup, useArchiveGroup } from '../../hooks/useGroups';
import { formatCurrency } from '../../utils/formatCurrency';
import { cn } from '../../utils/cn';
import type { Group, GroupPayload } from '../../types';

type FilterStatus = 'all' | 'active' | 'stopped' | 'debtors';

const DAY_SHORT: Record<string, string> = {
  monday: 'Du',
  tuesday: 'Se',
  wednesday: 'Ch',
  thursday: 'Pa',
  friday: 'Ju',
  saturday: 'Sha',
  sunday: 'Yak',
};

export function GroupsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Group | null>(null);

  const { data: groups = [], isLoading, isError } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup(editingGroup?.id);
  const archiveGroup = useArchiveGroup(archiveTarget?.id);

  const filteredGroups = useMemo(() => {
    if (filter === 'active') return groups.filter((g) => !g.is_archived);
    if (filter === 'stopped') return groups.filter((g) => g.is_archived);
    if (filter === 'debtors') return groups.filter((g) => !g.is_archived && (g.debtors ?? 0) > 0);
    return groups;
  }, [groups, filter]);

  const handleSubmitForm = (payload: GroupPayload) => {
    if (editingGroup?.id) {
      updateGroup.mutate(payload, {
        onSuccess: () => {
          setFormOpen(false);
          setEditingGroup(null);
        },
      });
    } else {
      createGroup.mutate(payload, {
        onSuccess: () => {
          setFormOpen(false);
          setEditingGroup(null);
        },
      });
    }
  };

  const handleArchiveConfirm = () => {
    if (archiveTarget?.id) {
      archiveGroup.mutate(undefined, {
        onSuccess: () => setArchiveTarget(null),
      });
    }
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F0F4FF]">
      <Sidebar />
      <main className="md:pl-[280px] pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 mt-2">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#1D1D1F] tracking-tight">
                Guruhlar
              </h1>
              <p className="text-base text-gray-500 mt-2 font-medium">
                Guruhlaringizni boshqaring va jadvalni nazorat qiling.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingGroup(null);
                setFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              Yangi guruh
            </button>
          </div>

          {/* Filters Section */}
          <div className="flex flex-wrap items-center gap-2 mb-8">
            {(['all', 'active', 'stopped', 'debtors'] as const).map((key) => {
              const labels: Record<string, string> = {
                all: 'Hammasi',
                active: 'Faol',
                stopped: "To'xtatilgan",
                debtors: 'Qarzdorlar bor',
              };
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    'px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
                    filter === key
                      ? 'bg-[#3B82F6] text-white shadow-md shadow-blue-500/20'
                      : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  )}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>

          {isError && (
            <Card className="mb-8 border-red-200 bg-red-50 rounded-2xl shadow-sm">
              <p className="text-red-700 text-sm font-medium">{t('common.error')}</p>
            </Card>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-white rounded-3xl shadow-sm animate-pulse border border-gray-50" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-0 w-full min-h-[400px] flex flex-col items-center justify-center p-8 text-center mt-4">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-extrabold text-[#1F2937] mb-2">
                Guruhlar topilmadi
              </h3>
              <p className="text-base text-gray-500 mb-8 max-w-sm font-medium">
                Hozircha bu yerda hech narsa yo'q. Yangi guruh yarating.
              </p>
              <button
                onClick={() => {
                  setEditingGroup(null);
                  setFormOpen(true);
                }}
                className="flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-blue-600 text-white font-bold py-3.5 px-8 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Yangi guruh
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/groups/${group.id}`)}
                  className="group flex flex-col bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 border-0 overflow-hidden transition-all duration-300 cursor-pointer"
                >
                  <div
                    className="h-2 w-full transition-opacity opacity-80 group-hover:opacity-100"
                    style={{ backgroundColor: group.color ?? '#3B82F6' }}
                  />
                  <div className="p-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <h2 className="text-xl font-extrabold text-[#1D1D1F] truncate group-hover:text-[#3B82F6] transition-colors">
                        {group.name}
                      </h2>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium">
                          {group.students_count ?? 0} {t('groups.studentsCount')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <CalendarDays className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium">
                          {group.lesson_days?.map((d) => DAY_SHORT[d] ?? d.slice(0, 2)).join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-gray-600">
                        <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-gray-500" />
                        </div>
                        <span className="text-sm font-medium">
                          {group.lesson_time}
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100/80 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Oylik to'lov</p>
                        <p className="text-lg font-extrabold text-[#1D1D1F]">
                          {formatCurrency(group.monthly_fee)}
                        </p>
                      </div>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); openEdit(group); }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#1D1D1F] transition-colors"
                          title={t('common.edit')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setArchiveTarget(group); }}
                          className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title={t('nav.archive')}
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <GroupFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingGroup(null);
        }}
        initial={editingGroup}
        onSubmit={handleSubmitForm}
        loading={createGroup.isPending || updateGroup.isPending}
      />

      <ArchiveConfirmModal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        loading={archiveGroup.isPending}
      />
    </div>
  );
}
