import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../components/ui/Icon';
import Button from '../components/ui/Button';
import { Field, Input } from '../components/ui/Controls';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

const HIGHLIGHTS = [
  { icon: 'radar' as const, title: 'Forensic scan reports', text: 'Radar overview, PC information and every detection with its source.' },
  { icon: 'pin' as const, title: 'Pin based workflow', text: 'Generate a pin, hand the download URL to the suspect, get a verdict.' },
  { icon: 'shield' as const, title: 'Detection database', text: 'Boot, warning and in-instance findings collected in one place.' },
];

export default function Login() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from || '/dashboard'} replace />;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (mode === 'register' && !/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) {
      setError('Username must be 3-24 characters (letters, numbers, dot, dash, underscore).');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(email.trim(), username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand side */}
      <div className="relative hidden flex-col justify-between border-r border-line bg-ink-900/40 p-10 lg:flex">
        <div className="grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/12 text-accent-soft">
              <Icon name="shield" size={20} />
            </span>
            <div className="leading-tight">
              <p className="text-[17px] font-semibold tracking-tight text-mist-100">HexScan</p>
              <p className="text-[12px] text-mist-500">anti-cheat forensic scanner</p>
            </div>
          </div>

          <h1 className="mt-14 max-w-lg text-[34px] font-semibold leading-[1.15] tracking-tight text-mist-100">
            Scan, verify and document every suspicious player.
          </h1>
          <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-mist-400">
            HexScan collects forensic evidence from the suspect machine and turns it into a report you can act on — with a
            clear verdict and a shareable detection log.
          </p>

          <ul className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-accent-soft">
                  <Icon name={item.icon} size={16} />
                </span>
                <div>
                  <p className="text-[13.5px] font-medium text-mist-100">{item.title}</p>
                  <p className="mt-0.5 max-w-sm text-[12.5px] leading-relaxed text-mist-400">{item.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11.5px] text-mist-500">© 2026 HexScan · v1.0.0</p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/12 text-accent-soft">
              <Icon name="shield" size={18} />
            </span>
            <p className="text-[16px] font-semibold tracking-tight text-mist-100">HexScan</p>
          </div>

          <div className="inline-flex rounded-lg border border-line bg-ink-900/80 p-1">
            {(['signin', 'register'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={[
                  'rounded-md px-3.5 py-1.5 text-[13px] font-medium transition-colors',
                  mode === value ? 'bg-white/[0.07] text-mist-100' : 'text-mist-400 hover:text-mist-200',
                ].join(' ')}
              >
                {value === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <h2 className="mt-6 text-[22px] font-semibold tracking-tight text-mist-100">
            {mode === 'signin' ? 'Welcome back' : 'Start scanning'}
          </h2>
          <p className="mt-1 text-[13px] text-mist-400">
            {mode === 'signin'
              ? 'Sign in to your HexScan dashboard.'
              : 'Dashboard access is free — a license unlocks pin generation.'}
          </p>

          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Email" required>
              <Input
                type="email"
                icon="mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>

            {mode === 'register' && (
              <Field label="Username" required>
                <Input
                  icon="users"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="how staff will see you"
                  autoComplete="username"
                  required
                />
              </Field>
            )}

            <Field label="Password" required hint={mode === 'register' ? 'At least 8 characters.' : undefined}>
              <Input
                type="password"
                icon="lock"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-negative/25 bg-negative/10 px-3 py-2.5 text-[12.5px] text-negative">
                <Icon name="alert" size={14} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" size="lg" block loading={busy} icon={mode === 'signin' ? 'logout' : 'plus'}>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-line bg-ink-900/60 p-3.5">
            <p className="label-xs">Demo accounts</p>
            <div className="mt-2 space-y-1.5 text-[12.5px]">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                onClick={() => {
                  setMode('signin');
                  setEmail('demo@hexscan.app');
                  setPassword('demo1234');
                }}
              >
                <span className="font-mono text-mist-200">demo@hexscan.app</span>
                <span className="text-mist-500">1 month license</span>
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors hover:bg-white/[0.04]"
                onClick={() => {
                  setMode('signin');
                  setEmail('pro@hexscan.app');
                  setPassword('demo1234');
                }}
              >
                <span className="font-mono text-mist-200">pro@hexscan.app</span>
                <span className="text-mist-500">lifetime + admin</span>
              </button>
            </div>
            <p className="mt-2 px-2 text-[11.5px] text-mist-500">Password for both: demo1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
