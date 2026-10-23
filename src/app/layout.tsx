import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HRIS PT Karsa Lintas Nusantara',
  description: 'Aplikasi internal kepegawaian',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('tema');if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}