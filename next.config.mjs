/** @type {import('next').NextConfig} */
const nextConfig = {
  // PRD 10: semua halaman noindex (juga lewat header supaya berlaku untuk API/berkas)
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
    ] }];
  },
};
export default nextConfig;
