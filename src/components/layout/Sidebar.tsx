import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, GraduationCap, Users, Wallet,
  Bell, MessageSquare, BarChart3, Settings, LogOut, ChevronDown,
  Mail, Phone, Pencil,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuthStore } from '../../store/authStore';
import { useUpdateProfile } from '../../hooks/useSettings';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

// ── Nav items before sub-menu ─────────────────────────────────────────────────

const NAV_BEFORE = [
  { path: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
] as const;

// ── Sub-menu: O'quvchilar & Guruhlar ─────────────────────────────────────────

const PEOPLE_ITEMS = [
  { path: '/groups',   key: 'groups',   icon: GraduationCap },
  { path: '/students', key: 'students', icon: Users          },
] as const;

// ── Nav items after sub-menu ──────────────────────────────────────────────────

const NAV_AFTER = [
  { path: '/payments',  key: 'payments',  icon: Wallet        },
  { path: '/reminders', key: 'reminders', icon: Bell          },
  { path: '/messages',  key: 'messages',  icon: MessageSquare },
  { path: '/reports',   key: 'reports',   icon: BarChart3     },
  { path: '/settings',  key: 'settings',  icon: Settings      },
] as const;

// ── Reusable nav link ─────────────────────────────────────────────────────────

function NavItem({
  path, icon: Icon, label, onClick, small = false,
}: {
  path: string;
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
  small?: boolean;
}) {
  return (
    <NavLink
      to={path}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-[14px] rounded-2xl font-medium transition-all duration-300 ease-out',
          small
            ? 'px-[18px] py-[11px] text-[14px]'
            : 'px-[18px] py-[13px] text-[15px]',
          isActive
            ? 'bg-[#EEF4FF] text-[#2563EB]'
            : 'text-[#9CA3AF] hover:bg-[#F5F8FF] hover:text-[#374151]'
        )
      }
    >
      <Icon className={cn('shrink-0', small ? 'w-[20px] h-[20px]' : 'w-[22px] h-[22px]')} />
      <span>{label}</span>
    </NavLink>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const location = useLocation();

  const isPeopleActive =
    location.pathname.startsWith('/groups') ||
    location.pathname.startsWith('/students');

  const [peopleOpen, setPeopleOpen] = useState(isPeopleActive);

  return (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 pt-7 pb-6">
        <div
          className="w-9 h-9 rounded-2xl flex items-center justify-center text-white font-bold text-[18px]"
          style={{
            background: '#3B82F6',
            boxShadow: '0 4px 12px rgba(59,130,246,0.28)',
          }}
        >
          T
        </div>
        <span className="text-[19px] font-bold text-[#111827] tracking-tight">
          TeachFlow
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-[2px] overflow-y-auto">

        {/* Items before sub-menu */}
        {NAV_BEFORE.map((item) => (
          <NavItem
            key={item.key}
            path={item.path}
            icon={item.icon}
            label={t(`nav.${item.key}`)}
            onClick={onNavigate}
          />
        ))}

        {/* ── Sub-menu: O'quvchilar & Guruhlar ── */}
        <div>
          <button
            type="button"
            onClick={() => setPeopleOpen((v) => !v)}
            className={cn(
              'w-full flex items-center gap-[14px] px-[18px] py-[13px] rounded-2xl',
              'text-[15px] font-medium transition-all duration-300 ease-out',
              isPeopleActive
                ? 'bg-[#EEF4FF] text-[#2563EB]'
                : 'text-[#9CA3AF] hover:bg-[#F5F8FF] hover:text-[#374151]'
            )}
          >
            <Users className="w-[22px] h-[22px] shrink-0" />
            <span className="flex-1 text-left">Ta'lim</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 shrink-0 transition-transform duration-200',
                peopleOpen && 'rotate-180'
              )}
            />
          </button>

          {peopleOpen && (
            <div className="mt-0.5 ml-3 pl-3 border-l-2 border-[#EEF4FF] space-y-[2px]">
              {PEOPLE_ITEMS.map((item) => (
                <NavItem
                  key={item.key}
                  path={item.path}
                  icon={item.icon}
                  label={t(`nav.${item.key}`)}
                  onClick={onNavigate}
                  small
                />
              ))}
            </div>
          )}
        </div>

        {/* Items after sub-menu */}
        {NAV_AFTER.map((item) => (
          <NavItem
            key={item.key}
            path={item.path}
            icon={item.icon}
            label={t(`nav.${item.key}`)}
            onClick={onNavigate}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="px-4 pb-5 pt-2">
        <SidebarUser />
      </div>

    </div>
  );
}

// ── Profile Edit Modal ────────────────────────────────────────────────────────

function ProfileEditModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setUser } = useAuthStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  useEffect(() => {
    if (open && user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [open, user]);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const updated = await updateProfile({ first_name: firstName, last_name: lastName });
    setUser(updated);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Profilni tahrirlash">
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Ism"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Familiya"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            required
          />
        </div>

        {user?.email && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
            <div className="px-4 py-3 bg-gray-50 rounded-[1.25rem] text-sm text-gray-500 flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400 shrink-0" />
              {user.email}
            </div>
          </div>
        )}
        {user?.phone && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
            <div className="px-4 py-3 bg-gray-50 rounded-[1.25rem] text-sm text-gray-500 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              {user.phone}
            </div>
          </div>
        )}
        {(user?.short_id || user?.id) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Foydalanuvchi ID</label>
            <div className="px-4 py-3 bg-gray-50 rounded-[1.25rem] text-sm text-gray-500 font-mono tracking-wide">
              {user?.short_id || user?.id?.slice(0, 8)}
            </div>
          </div>
        )}

        <div className="pt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} className="rounded-2xl">
            Bekor qilish
          </Button>
          <Button type="submit" loading={isPending} className="rounded-2xl px-6">
            Saqlash
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ── User card ─────────────────────────────────────────────────────────────────

function SidebarUser() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Foydalanuvchi';
  const email = user?.email ?? '';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="border-t border-[#F3F4F8] pt-4">
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className={cn(
          'w-full flex items-center gap-3 px-2 mb-2 rounded-2xl py-2',
          'hover:bg-[#F5F8FF] transition-all duration-300 ease-out group'
        )}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[#2563EB] font-bold text-[15px] shrink-0"
          style={{ background: '#EEF4FF' }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[14px] font-semibold text-[#111827] truncate">{name}</p>
          {email && (
            <p className="text-[11px] text-[#B0B7C3] truncate">{email}</p>
          )}
        </div>
        <Pencil className="w-[14px] h-[14px] text-[#9CA3AF] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
      <button
        type="button"
        onClick={handleLogout}
        className={cn(
          'w-full flex items-center gap-[14px] px-[18px] py-[11px] rounded-2xl',
          'text-[14px] font-medium text-[#EF4444]',
          'hover:bg-[#FFF1F1] transition-all duration-300 ease-out'
        )}
      >
        <LogOut className="w-[18px] h-[18px] shrink-0" />
        {t('nav.logout')}
      </button>

      <ProfileEditModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}

// ── Sidebar export ────────────────────────────────────────────────────────────

export function Sidebar() {
  const { t } = useTranslation();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:block md:fixed md:left-0 md:top-0 md:z-30 w-[280px] h-screen bg-white"
        style={{ borderRight: '1px solid #F0F1F8' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white safe-area-pb"
        style={{ borderTop: '1px solid #F0F1F8' }}
      >
        <div className="flex items-center justify-around h-[58px] px-2">
          {[
            { path: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
            { path: '/groups',    icon: GraduationCap,   key: 'groups'    },
            { path: '/students',  icon: Users,            key: 'students'  },
            { path: '/payments',  icon: Wallet,           key: 'payments'  },
            { path: '/settings',  icon: Settings,         key: 'settings'  },
          ].map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-2xl min-w-[56px]',
                  'transition-all duration-300 ease-out',
                  isActive ? 'text-[#2563EB]' : 'text-[#B0B7C3]'
                )
              }
            >
              <item.icon className="w-[22px] h-[22px]" />
              <span className="text-[10px] font-medium">{t(`nav.${item.key}`)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
