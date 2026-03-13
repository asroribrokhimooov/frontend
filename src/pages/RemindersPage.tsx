import { useTranslation } from 'react-i18next';

export function RemindersPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#F0F4FF] p-6">
      <h1 className="text-2xl font-bold text-[#1F2937]">{t('reminders.title')}</h1>
    </div>
  );
}
