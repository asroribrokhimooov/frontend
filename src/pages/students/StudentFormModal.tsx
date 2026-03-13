import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useGroups } from '../../hooks/useGroups';
import type { Student, StudentCreatePayload } from '../../types';

export interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  initial?: Student | null;
  onSubmit: (payload: StudentCreatePayload, groupId: string | null) => void;
  loading?: boolean;
}

export function StudentFormModal({
  open,
  onClose,
  initial,
  onSubmit,
  loading = false,
}: StudentFormModalProps) {
  const { t } = useTranslation();
  const { data: groups = [] } = useGroups();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initial?.id;
  const existingGroupIds = (initial?.groups ?? []).map((g) => g.id);
  const availableGroups = groups.filter((g) => g.status === 'active');

  useEffect(() => {
    if (open) {
      setFirstName(initial?.first_name ?? '');
      setLastName(initial?.last_name ?? '');
      setPhone(initial?.phone ?? '');
      setParentName(initial?.parent_name ?? '');
      setParentPhone(initial?.parent_phone ?? '');
      setSelectedGroupId(null);
      setError(null);
    }
  }, [open, initial]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) {
      setError(t('validation.required'));
      return;
    }
    if (!lastName.trim()) {
      setError(t('validation.required'));
      return;
    }
    onSubmit(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        parent_name: parentName.trim() || null,
        parent_phone: parentPhone.trim() || null,
      },
      selectedGroupId
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? t('students.editStudent') : t('students.newStudent')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('students.firstName')}
          placeholder={t('students.firstName')}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
          autoFocus
        />
        <Input
          label={t('students.lastName')}
          placeholder={t('students.lastName')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <Input
          label={t('students.phone')}
          placeholder={t('students.phone')}
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          label={t('students.parentName')}
          placeholder={t('students.parentName')}
          value={parentName}
          onChange={(e) => setParentName(e.target.value)}
        />
        <Input
          label={t('students.parentPhone')}
          placeholder={t('students.parentPhone')}
          type="tel"
          value={parentPhone}
          onChange={(e) => setParentPhone(e.target.value)}
        />
        <div>
          <label className="block text-sm font-medium text-[#1F2937] mb-1.5">
            {t('students.groups')} (optional)
          </label>
          <select
            value={selectedGroupId ?? ''}
            onChange={(e) => setSelectedGroupId(e.target.value || null)}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-[#1F2937] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
          >
            <option value="">{t('students.selectGroup')}</option>
            {availableGroups
              .filter((g) => !existingGroupIds.includes(g.id))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
