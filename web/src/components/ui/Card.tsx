import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padded?: boolean;
}

export function Card({ children, hover = false, padded = true, className = '', ...rest }: CardProps) {
  return (
    <div className={['card', hover ? 'card-hover' : '', padded ? 'p-5' : '', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={['flex items-start justify-between gap-4', className].filter(Boolean).join(' ')}>
      <div className="flex items-start gap-3">
        {icon}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-mist-100">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-mist-400">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/** Small metric tile used across the dashboard and pins pages. */
export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'default',
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: 'default' | 'positive' | 'negative' | 'warning';
  footer?: ReactNode;
}) {
  const toneClass =
    tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : tone === 'warning' ? 'text-warn' : 'text-mist-100';

  return (
    <div className="card card-hover p-5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="label-xs">{label}</span>
      </div>
      <div className={['mt-3 text-[30px] font-semibold leading-none tracking-tight', toneClass].join(' ')}>{value}</div>
      {hint && <div className="mt-2 text-[12.5px] text-mist-400">{hint}</div>}
      {footer && <div className="mt-3 border-t border-line pt-3">{footer}</div>}
    </div>
  );
}

export default Card;
