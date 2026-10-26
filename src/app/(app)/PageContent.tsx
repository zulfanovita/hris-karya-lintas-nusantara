'use client';

import { useTransition, type MouseEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export default function PageContent({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(event: MouseEvent<HTMLElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const target = event.target;
    if (!(target instanceof Element)) return;
    const anchor = target.closest('a');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;

    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin) return;

    const current = new URL(window.location.href);
    if (destination.pathname === current.pathname && destination.search === current.search) return;

    event.preventDefault();
    event.stopPropagation();
    startTransition(() => {
      router.push(destination.pathname + destination.search + destination.hash);
    });
  }

  return (
    <main className="main" onClickCapture={navigate}>
      {children}
      {isPending && (
        <div className="page-loading" role="status" aria-live="polite">
          <div className="nav-loading-message">
            <span className="route-spinner" aria-hidden="true" />
            <span>Memuat halaman...</span>
          </div>
        </div>
      )}
    </main>
  );
}
