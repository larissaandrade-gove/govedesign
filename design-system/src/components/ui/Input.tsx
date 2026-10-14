import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; icon?: ReactNode };

/** Campo de texto: foco com borda primary + brilho roxo. */
export const Input = forwardRef<HTMLInputElement, Props>(function Input({ label, hint, icon, id, className = '', ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-space-1">
      <label htmlFor={inputId} className="text-caption text-text-secondary">
        {label}
      </label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-space-2 top-1/2 -translate-y-1/2 text-text-secondary">{icon}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-describedby={hintId}
          className={`h-12 w-full rounded-md border border-secondary bg-background px-space-2 text-body text-text-primary placeholder:text-text-muted transition-[border-color,box-shadow] duration-200 hover:border-primary/60 focus:border-primary focus:shadow-glow-purple focus:outline-none focus-visible:outline-none ${icon ? 'pl-[44px]' : ''} ${className}`}
          {...rest}
        />
      </div>
      {hint && (
        <p id={hintId} className="text-caption text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
});
