/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /** Lets a production build run beside `next dev` without sharing `.next`. */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async redirects() {
    return [{ source: '/studio', destination: '/customize', permanent: false }];
  },
  /**
   * Frames only: the Spotify player for "Our Song", the Lemon Squeezy checkout overlay (on Lemon's
   * domain or the store's custom domain) and Vercel's preview toolbar. Other content is unrestricted.
   */
  async headers() {
    const frameSrc = [
      "'self'",
      'https://open.spotify.com',
      'https://*.lemonsqueezy.com',
      'https://store.xsoverse.app',
      'https://vercel.live',
    ].join(' ');
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: `frame-src ${frameSrc}` }],
      },
    ];
  },
  experimental: {
    /** The story-video recorder: a headless browser and ffmpeg, loaded as-is with their binaries. */
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium', 'ffmpeg-static'],
    outputFileTracingIncludes: {
      '/api/gifts/[id]/story-video': [
        './node_modules/@sparticuz/chromium/bin/**',
        './node_modules/ffmpeg-static/ffmpeg',
      ],
    },
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@react-three/drei',
      '@react-three/fiber',
    ],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: '**.placehold.co' },
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default nextConfig;
