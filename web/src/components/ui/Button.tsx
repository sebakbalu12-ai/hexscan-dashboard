import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Icon from './Icon';
import type { IconName } from './Icon';

type Variant = 'primary' | 'ghost' | 'subtle' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn btn-primary',
  ghost: 'btn btn-ghost',
  subtle: 'btn btn-subtle',
  danger: 'btn btn-danger',
  link: 'text-sm font-medium text-accent-soft transition-colors hover:text-white',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[12.5px]',
  md: '',
  lg: 'h-11 px-5 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  block?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', icon, iconRight, loading = false, block = false, className = '', children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={[VARIANTS[variant], SIZES[size], block ? 'w-full' : '', className].filter(Boolean).join(' ')}
      {...rest}
    >
      {loading ? (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white/90" />
      ) : (
        icon && <Icon name={icon} size={size === 'lg' ? 17 : 15} />
      )}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 17 : 15} />}
    </button>
  );
});

export default Button;
