'use client';

import { useFormStatus } from 'react-dom';
import type { CSSProperties, ReactNode } from 'react';

export default function TombolProses({
  children,
  pendingText,
  className,
  style,
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { pending } = useFormStatus();
  const buttonClassName = [className, pending ? 'is-pending' : ''].filter(Boolean).join(' ');

  return (
    <button type="submit" disabled={pending} className={buttonClassName} style={style} aria-live="polite">
      {pending ? (
        <>
          <span className="form-spinner" aria-hidden="true" />
          <span>{pendingText}</span>
        </>
      ) : children}
    </button>
  );
}
