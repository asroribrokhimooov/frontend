import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api/axios';
import { unwrapUser } from '../../hooks/useSettings';
import { cn } from '../../utils/cn';
import type { User } from '../../types';

export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!firstName.trim()) {
      setError(t('validation.required'));
      return;
    }
    setLoading(true);
    try {
      await api.patch('/settings/profile', {
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
      });
      // Re-fetch profile to get full user object
      const res = await api.get('/settings/profile');
      const updated = unwrapUser(res.data) as User;
      setUser(updated);
      navigate('/dashboard', { replace: true });
    } catch {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0F4FF] via-[#E8EEFF] to-[#F0F4FF] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <div className="flex items-center gap-3 group">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#4F46E5] flex items-center justify-center shadow-2xl shadow-[#6366F1]/30 group-hover:shadow-[#6366F1]/50 transition-all duration-300">
              <span className="text-white font-bold text-2xl">T</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1F2937] tracking-tight">
                TeachFlow
              </h1>
              <p className="text-xs text-gray-500 font-medium">Learning Management</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-[#6366F1]/10 p-10 border border-white/80 backdrop-blur-sm">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#1F2937] mb-2">
              {t('onboarding.title')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('onboarding.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-bold text-[#1F2937] mb-2"
              >
                {t('onboarding.firstName')} *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('onboarding.firstName')}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border-2 border-gray-200',
                  'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none',
                  'transition-colors'
                )}
                autoFocus
              />
            </div>
            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-bold text-[#1F2937] mb-2"
              >
                {t('onboarding.lastName')}
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('onboarding.lastName')}
                className={cn(
                  'w-full px-4 py-3 rounded-xl border-2 border-gray-200',
                  'focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/20 focus:outline-none',
                  'transition-colors'
                )}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center bg-red-50 p-3 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                'w-full py-4 rounded-xl font-bold text-white',
                'bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:shadow-lg hover:shadow-[#6366F1]/30',
                'active:scale-[0.98]',
                'focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:ring-offset-2',
                'transition-all duration-200 disabled:opacity-60 disabled:pointer-events-none'
              )}
            >
              {loading ? t('common.loading') : t('onboarding.submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
