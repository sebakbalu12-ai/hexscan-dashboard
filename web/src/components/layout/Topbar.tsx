import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { Badge } from '../ui/Badge';
import { Menu } from '../ui/Controls';
import { useAuth } from '../../context/AuthContext';

/** Path segment → human label (breadcrumbs). */
const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  pins: 'Pins',
  detections: 'Detections',
  settings: 'Settings',
  support: 'Support',
  admin: 'License keys',
  results: 'Results',
};

function useCrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  // /dashboard/pins/DEMOPIN reads "Dashboard › Results › DEMOPIN" like the reference UI.
  const onPinDetail = segments.length === 3 && segments[1] === 'pins';
  return segments.map((segment, index) => ({
    label: onPinDetail && index === 1 ? 'Results' : LABELS[segment] || segment.toUpperCase(),
    to: `/${segments.slice(0, index + 1).join('/')}`,
    last: index === segments.length - 1,
  }));
}

export function Topbar({
  onOpenMobileNav,
  actions,
}: {
  onOpenMobileNav?: () => void;
  actions?: React.ReactNode;
}) {
  const crumbs = useCrumbs();
  const navigate = useNavigate();
  const { user, license, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-ink-950/80 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="rounded-md border border-line p-1.5 text-mist-300 lg:hidden"
        aria-label="Open navigation"
      >
        <Icon name="grid" size={16} />
      </button>

      <nav className="flex min-w-0 items-center gap-2 text-[13px]" aria-label="Breadcrumb">
        {crumbs.map((crumb) => (
          <span key={crumb.to} className="flex min-w-0 items-center gap-2">
            {crumb.last ? (
              <span className="truncate font-medium text-mist-100">{crumb.label}</span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate(crumb.to)}
                  className="truncate text-mist-400 transition-colors hover:text-mist-200"
                >
                  {crumb.label}
                </button>
                <Icon name="chevronRight" size={13} className="text-mist-600" />
              </>
            )}
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        {actions}

        <div className="relative hidden md:block">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mist-500">
            <Icon name="search" size={14} />
          </span>
          <input
            placeholder="Search…"
            className="h-9 w-44 rounded-lg border border-line bg-ink-900 pl-8 pr-14 text-[12.5px] text-mist-200 placeholder:text-mist-500 focus:border-accent/45 focus:outline-none lg:w-56"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const value = (event.target as HTMLInputElement).value.trim();
                if (value) navigate(`/dashboard/pins?q=${encodeURIComponent(value)}`);
              }
            }}
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 kbd">⌘K</span>
        </div>

        <Badge tone={license?.active ? (license.lifetime ? 'success' : 'accent') : 'neutral'} dot className="hidden sm:inline-flex">
          {license?.active ? (license.lifetime ? 'Lifetime' : `${license.daysRemaining}d left`) : 'Free tier'}
        </Badge>

        <button type="button" className="relative rounded-lg border border-line p-2 text-mist-300 transition-colors hover:text-mist-100" aria-label="Notifications">
          <Icon name="bell" size={15} />
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] text-white">
            1
          </span>
        </button>

        <Menu
          width={196}
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-2 rounded-lg border border-line bg-ink-900 px-2 py-1.5 text-[12.5px] text-mist-200 transition-colors hover:border-line-strong"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-semibold text-white"
                style={{ background: user?.avatarColor || '#2563eb' }}
              >
                {(user?.username || 'G').slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden max-w-[100px] truncate sm:block">{user?.username}</span>
              <Icon name="chevronDown" size={13} className="text-mist-500" />
            </button>
          )}
          items={[
            { label: 'Settings', icon: 'settings', onSelect: () => navigate('/dashboard/settings') },
            { label: 'Billing & license', icon: 'key', onSelect: () => navigate('/dashboard/settings') },
            { label: 'Delete account', icon: 'trash', tone: 'danger', separator: false, onSelect: () => navigate('/dashboard/support') },
            { label: 'Sign out', icon: 'logout', separator: true, onSelect: () => void signOut() },
          ]}
        />
      </div>
    </header>
  );
}

export default Topbar;
