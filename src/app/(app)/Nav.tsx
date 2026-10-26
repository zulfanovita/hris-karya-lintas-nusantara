'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Ikon from '@/components/Ikon';

export default function Nav({ menu }: { menu: { href: string; t: string; i: string; badge?: number }[] }) {
  const path = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const isNavigating = pendingPath !== null && path !== pendingPath;

  return (
    <>
      <nav>
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={path === m.href || path.startsWith(m.href + '/') ? 'on' : ''}
            onClick={(event) => {
              if (
                event.defaultPrevented ||
                event.button !== 0 ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                path === m.href
              ) return;
              setPendingPath(m.href);
            }}
          >
            <Ikon n={m.i} /><span>{m.t}</span>{m.badge ? <em className="nbd">{m.badge}</em> : null}
          </Link>
        ))}
      </nav>
      {isNavigating && (
        <div className="nav-loading" role="status" aria-live="polite">
          <div className="nav-loading-message">
            <span className="route-spinner" aria-hidden="true" />
            <span>Memuat menu...</span>
          </div>
        </div>
      )}
    </>
  );
}
