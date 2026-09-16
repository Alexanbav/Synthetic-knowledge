import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-to-img/pdfjs-dist rely on Node.js features and resolve their worker file
  // relative to node_modules, so they must not be bundled by Turbopack/webpack.
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist", "@napi-rs/canvas"],
};

export default nextConfig;
