import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../api/axios';
import type { User } from '../../types';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setError('Token topilmadi');
      return;
    }

    setToken(token);

    api
      .get<User>('/settings/profile')
      .then((res) => {
        const user = res.data;
        setUser(user);
        if (!user?.first_name?.trim()) {
          navigate('/onboarding', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      })
      .catch(() => {
        setError('Profil yuklanmadi');
      });
  }, [navigate, setToken, setUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <a href="/login" className="text-primary-500 hover:underline">
            Login sahifasiga qaytish
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F4FF] flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[#1F2937] font-medium">Yuklanmoqda...</p>
      </div>
    </div>
  );
}
