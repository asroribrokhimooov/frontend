import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

export interface ArchiveConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function ArchiveConfirmModal({
  open,
  onClose,
  onConfirm,
  loading = false,
}: ArchiveConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal open={open} onClose={onClose} title={t('groups.archiveConfirm')}>
      <div className="flex gap-3 justify-end pt-2">
        <Button variant="ghost" onClick={onClose}>
          {t('common.no')}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {t('common.yes')}
        </Button>
      </div>
    </Modal>
  );
}
