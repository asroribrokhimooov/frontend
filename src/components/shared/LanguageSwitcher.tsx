import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

const LANGUAGES = [
  { code: 'uz', label: 'UZ' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.split('-')[0] ?? 'uz';

  return (
    <div className="inline-flex rounded-xl bg-gray-100 p-0.5">
      {LANGUAGES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => i18n.changeLanguage(code)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            current === code
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-[#1F2937]'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
