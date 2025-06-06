import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "ledenicheur.fr",
      },
      {
        protocol: "https",
        hostname: "www.ledenicheur.fr",
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
    typedRoutes: true,
  },
  compress: true,
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  serverExternalPackages: ["crawlee"],
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      const headerGeneratorEntryPoint = require.resolve("header-generator");
      const headerGeneratorRootDir = path.dirname(headerGeneratorEntryPoint);
      const headerGeneratorDataFilesPath = path.join(
        headerGeneratorRootDir,
        "data_files"
      );

      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: headerGeneratorDataFilesPath,
              to: path.join("vendor-chunks", "data_files"),
            },
          ],
        })
      );

      if (!config.externals) {
        config.externals = [];
      }
      config.externals.push("canvas");
    }

    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  async redirects() {
    return [];
  },
};

export default nextConfig;
