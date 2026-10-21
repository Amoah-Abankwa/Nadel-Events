import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Cloudinary resizes product photos (see src/lib/image-loader.ts).
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
};

export default config;
