import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-mist-400">
          <Icon name="search" size={22} />
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-mist-100">Page not found</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-mist-400">
          The page you are looking for does not exist or you no longer have access to it.
        </p>
        <Link
          to="/dashboard"
          className="btn btn-primary mt-6"
        >
          <Icon name="grid" size={15} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
