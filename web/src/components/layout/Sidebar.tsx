import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import type { IconName } from '../ui/Icon';
import Icon from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../lib/format';

interface NavItem {
  label: string;
  to?: string;
  icon: IconName;
  badge?: string;
  locked?: boolean;
  children?: NavItem[];
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    items: [{ label: 'Dashboard', to: '/dashboard', icon: 'grid' }],
  },
  {
    label: 'Services',
    items: [
      {
        label: 'Scanner',
        icon: 'radar',
        children: [
          { label: 'Pins', to: '/dashboard/pins', icon: 'pin' },
          { label: 'Detections', to: '/dashboard/detections', icon: 'shield' },
          { label: 'Custom GUI', icon: 'layers', locked: true },
        ],
      },
      { label: 'Database', icon: 'database', locked: true },
      { label: 'Anti-Cheat', icon: 'cpu', locked: true },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Public configs', icon: 'code', locked: true },
      { label: 'Public strings', icon: 'link', locked: true },
      { label: 'Public GUIs', icon: 'layers', locked: true },
    ],
  },
  {
    label: 'Support',
    items: [{ label: 'Support', to: '/dashboard/support', icon: 'info' }],
  },
  {
    label: 'Others',
    items: [
      { label: 'Resources', to: '/dashboard/support', icon: 'download' },
      ...[],
    ],
  },
];

function NavRow({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation();
  const active = item.to ? location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(item.to)) : false;
  const [open, setOpen] = useState(true);

  if (item.locked) {
    return (
      <button
        type="button"
        title="Locked — included in the Custom GUI add-on"
        className="group flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-[13px] text-mist-500"
      >
        <Icon name={item.icon} size={15} />
        <span className="flex-1 text-left">{item.label}</span>
        <span className="rounded border border-line bg-white/[0.03] px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-mist-500">
          Locked
        </span>
      </button>
    );
  }

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-mist-200 transition-colors hover:bg-white/[0.04]"
        >
          <Icon name={item.icon} size={15} />
          <span className="flex-1 text-left">{item.label}</span>
          <Icon name="chevronDown" size={14} className={['text-mist-500 transition-transform', open ? '' : '-rotate-90'].join(' ')} />
        </button>
        {open && (
          <div className="mt-0.5 space-y-0.5 border-l border-line pl-3 ml-4">
            {item.children.map((child) => (
              <NavRow key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to ?? '/dashboard'}
      className={({ isActive }) =>
        [
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
          isActive || active ? 'bg-white/[0.055] text-mist-100' : 'text-mist-300 hover:bg-white/[0.035] hover:text-mist-100',
        ].join(' ')
      }
    >
      {active && <span className="absolute -left-3 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" />}
      <Icon name={item.icon} size={15} className={active ? 'text-accent-soft' : ''} />
      <span className="flex-1">{item.label}</span>
      {item.badge && <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent-soft">{item.badge}</span>}
    </NavLink>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, license } = useAuth();

  return (
    <aside className="flex h-full w-[254px] shrink-0 flex-col border-r border-line bg-ink-900/70">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5">
        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/12 text-accent-soft">
          <Icon name="shield" size={18} />
        </span>
        <div className="leading-tight">
          <p className="text-[15px] font-semibold tracking-tight text-mist-100">HexScan</p>
          <p className="text-[11px] text-mist-500">forensic scanner</p>
        </div>
      </div>

      <div className="divider mx-4" />

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" onClick={onNavigate}>
        {SECTIONS.map((section, index) => (
          <div key={section.label ?? `section-${index}`} className="space-y-1">
            {section.label && <p className="px-3 pb-1 label-xs">{section.label}</p>}
            {section.items.map((item) => (
              <NavRow key={item.label} item={item} />
            ))}
          </div>
        ))}

        <div className="space-y-1">
          <NavLink
            to="/dashboard/settings"
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
                isActive ? 'bg-white/[0.055] text-mist-100' : 'text-mist-300 hover:bg-white/[0.035] hover:text-mist-100',
              ].join(' ')
            }
            onClick={onNavigate}
          >
            <Icon name="settings" size={15} />
            Settings
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/dashboard/admin"
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors',
                  isActive ? 'bg-white/[0.055] text-mist-100' : 'text-mist-300 hover:bg-white/[0.035] hover:text-mist-100',
                ].join(' ')
              }
              onClick={onNavigate}
            >
              <Icon name="key" size={15} />
              License keys
            </NavLink>
          )}
        </div>
      </nav>

      <div className="border-t border-line p-3">
        <div className="flex items-center gap-3 rounded-lg border border-line bg-ink-850/70 p-2.5">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold text-white"
            style={{ background: user?.avatarColor || '#2563eb' }}
          >
            {initials(user?.username || 'guest')}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[12.5px] font-medium text-mist-100">{user?.username ?? 'Guest'}</p>
            <p className="truncate text-[11px] text-mist-500">{license?.active ? license.planLabel : 'Free tier'}</p>
          </div>
          <span
            className={[
              'h-2 w-2 rounded-full',
              license?.active ? 'bg-positive shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-mist-500',
            ].join(' ')}
            title={license?.active ? 'License active' : 'Free tier'}
          />
        </div>
        <p className="mt-2 px-1 text-[10.5px] text-mist-500">HexScan v1.0 · build 2026.09</p>
      </div>
    </aside>
  );
}

export default Sidebar;
