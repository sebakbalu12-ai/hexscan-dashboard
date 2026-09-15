import type { ReactNode } from 'react';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/Icon';

/** Title + description + right-aligned actions, used at the top of every page. */
export function PageHeader({
  icon,
  title,
  description,
  actions,
  badge,
}: {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent/10 text-accent-soft">
            <Icon name={icon} size={19} />
          </span>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-mist-100">{title}</h1>
            {badge}
          </div>
          {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-mist-400">{description}</p>}
        </div>
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export default PageHeader;
