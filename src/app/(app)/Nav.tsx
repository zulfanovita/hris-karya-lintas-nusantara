'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Ikon from '@/components/Ikon';

export default function Nav({ menu }: { menu: { href: string; t: string; i: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav>
      {menu.map((m) => (
        <Link key={m.href} href={m.href} className={path === m.href || path.startsWith(m.href + '/') ? 'on' : ''}><Ikon n={m.i} /><span>{m.t}</span>{m.badge ? <em className="nbd">{m.badge}</em> : null}</Link>
      ))}
    </nav>
  );
}
