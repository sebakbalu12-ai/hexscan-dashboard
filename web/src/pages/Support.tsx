import PageHeader from '../components/common/PageHeader';
import Card, { CardHeader } from '../components/ui/Card';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';

const FAQ = [
  {
    q: 'Why is Create Pin disabled?',
    a: 'The dashboard is free to browse, but pin generation is a licensed feature. Activate a 1, 3, 6 month or lifetime key — every paid plan comes with unlimited pins.',
  },
  {
    q: 'How does a scan work?',
    a: 'Create a pin, send the download URL to the player, and ask them to run it. As soon as the collector connects the pin flips to “Scanning”, and the full forensic report appears when it finishes.',
  },
  {
    q: 'How long is a pin valid?',
    a: 'Each pin lives for 24 hours. If the collector never connects in that window the pin expires and needs to be recreated.',
  },
  {
    q: 'Can I share a report with my team?',
    a: 'Yes — open a finished pin and use “Manage Access” to grant view or full access by email address. Public pins are readable by anyone with the link.',
  },
];

export default function Support() {
  const { user, license } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        icon="info"
        title="Support"
        description="Get help with your account, licenses or a scan that looks wrong."
        actions={
          <a href="mailto:support@hexscan.gg">
            <Button icon="mail">Contact support</Button>
          </a>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Frequently asked" subtitle="The short answers to the usual questions." />
          <div className="mt-5 space-y-4">
            {FAQ.map((entry) => (
              <div key={entry.q} className="rounded-lg border border-line bg-ink-900/50 p-4">
                <p className="flex items-start gap-2 text-[13.5px] font-medium text-mist-100">
                  <Icon name="info" size={15} className="mt-0.5 shrink-0 text-accent-soft" />
                  {entry.q}
                </p>
                <p className="mt-1.5 pl-[23px] text-[12.5px] leading-relaxed text-mist-400">{entry.a}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your account" icon={<Icon name="users" size={15} className="text-mist-500" />} />
            <dl className="mt-4 space-y-2.5 text-[12.5px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mist-400">Username</dt>
                <dd className="truncate font-mono text-mist-200">{user?.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mist-400">Email</dt>
                <dd className="truncate font-mono text-mist-200">{user?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mist-400">Role</dt>
                <dd>
                  <Badge tone={user?.role === 'admin' ? 'accent' : 'neutral'}>{user?.role === 'admin' ? 'Administrator' : 'User'}</Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-mist-400">License</dt>
                <dd>
                  <Badge tone={license?.active ? 'success' : 'warning'} dot>
                    {license?.active ? license.planLabel : 'Free tier'}
                  </Badge>
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <CardHeader title="Resources" subtitle="Everything a server owner needs." icon={<Icon name="file" size={15} className="text-mist-500" />} />
            <div className="mt-4 space-y-2">
              {[
                { label: 'Collector download', note: 'Windows x64 · signed', icon: 'download' as const },
                { label: 'Staff handbook', note: 'How to run a PC check', icon: 'file' as const },
                { label: 'Detection glossary', note: 'What every finding means', icon: 'shield' as const },
                { label: 'Status page', note: 'API & collector uptime', icon: 'globe' as const },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-line bg-ink-900/50 px-3.5 py-3 text-left transition-colors hover:border-line-strong hover:bg-ink-800/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-mist-400">
                    <Icon name={item.icon} size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-mist-100">{item.label}</span>
                    <span className="block text-[11.5px] text-mist-500">{item.note}</span>
                  </span>
                  <Icon name="external" size={14} className="text-mist-600" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
