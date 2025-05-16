import type { NextConfig } from "next";
import CopyPlugin from "copy-webpack-plugin";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        port: "",
        pathname: "/images/I/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  /* config options here */
  serverExternalPackages: ["crawlee"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Résoudre le chemin vers le répertoire data_files de header-generator
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
              to: path.join("vendor-chunks", "data_files"), // Relatif à config.output.path (.next/server)
            },
          ],
        })
      );

      // Marquer 'canvas' comme externe pour éviter les erreurs de module non trouvé côté serveur
      if (!config.externals) {
        config.externals = [];
      }
      config.externals.push("canvas");
    }

    return config;
  },
};

export default nextConfig;
