import { useTranslation } from 'react-i18next';
import { cn } from '../../utils/cn';

const VITE_API_URL = import.meta.env.VITE_API_URL as string | undefined;

export function LoginPage() {
  const { t, i18n } = useTranslation();

  const handleGoogleLogin = () => {
    const base = VITE_API_URL?.replace(/\/$/, '') ?? '';
    window.location.href = `${base}/auth/google`;
  };

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F4FF] via-[#E8EEFF] to-[#F0F4FF] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-2xl shadow-[#6366F1]/30 group-hover:shadow-[#6366F1]/50 transition-all duration-300">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1F2937] tracking-tight">TeachFlow</h1>
              <p className="text-xs text-gray-500 font-medium">Learning Management</p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-[#6366F1]/10 p-10 border border-white/80">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-[#1F2937] mb-2">{t('auth.loginTitle')}</h2>
            <p className="text-sm text-gray-500">{t('auth.loginSubtitle')}</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className={cn(
              'w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl',
              'bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200',
              'hover:border-[#6366F1] hover:shadow-lg hover:shadow-[#6366F1]/20',
              'text-[#1F2937] font-bold transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2',
              'active:scale-[0.98]',
            )}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('auth.loginWithGoogle')}
          </button>
        </div>

        {/* Language Selection */}
        <div className="flex gap-2 justify-center mt-8">
          {['uz', 'ru', 'en'].map(lng => (
            <button
              key={lng}
              onClick={() => handleLanguageChange(lng)}
              className={cn(
                'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
                i18n.language === lng
                  ? 'bg-[#6366F1] text-white shadow-lg shadow-[#6366F1]/30'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80 border border-white/80',
              )}
            >
              {lng.toUpperCase()}
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-gray-500 mt-8 font-medium">
          TeachFlow — o'quv markazi boshqaruvi
        </p>
      </div>
    </div>
  );
}
